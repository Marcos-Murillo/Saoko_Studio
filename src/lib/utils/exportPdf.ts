import { GState, jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getLetterheadParts, type LetterheadParts } from '@/lib/services/branding.service'

type LetterheadImage = { dataUrl: string; width: number; height: number }
type Letterhead = { header: LetterheadImage | null; center: LetterheadImage | null; footer: LetterheadImage | null }

function loadImage(dataUrl: string | null): Promise<LetterheadImage | null> {
  if (!dataUrl) return Promise.resolve(null)
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({
      dataUrl,
      width: img.naturalWidth || 1,
      height: img.naturalHeight || 1,
    })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

async function loadLetterhead(): Promise<Letterhead> {
  const empty = { header: null, center: null, footer: null }
  try {
    const parts: LetterheadParts = await getLetterheadParts()
    const [header, center, footer] = await Promise.all([
      loadImage(parts.header),
      loadImage(parts.center),
      loadImage(parts.footer),
    ])
    return { header, center, footer }
  } catch {
    return empty
  }
}

function fitBand(pageW: number, image: LetterheadImage, maxH: number) {
  const ratio = image.height / image.width
  const maxW = pageW - 28
  let width = maxW
  let height = width * ratio
  if (height > maxH) {
    height = maxH
    width = height / ratio
  }
  return { height, width, x: (pageW - width) / 2 }
}

function contentTop(doc: jsPDF, parts: Letterhead) {
  if (!parts.header) return 18
  return 10 + fitBand(doc.internal.pageSize.getWidth(), parts.header, 28).height + 8
}

function contentBottom(doc: jsPDF, parts: Letterhead) {
  const pageH = doc.internal.pageSize.getHeight()
  if (!parts.footer) return pageH - 16
  return pageH - (8 + fitBand(doc.internal.pageSize.getWidth(), parts.footer, 22).height + 8)
}

function paintLetterhead(doc: jsPDF, parts: Letterhead) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  if (parts.center) {
    const ratio = parts.center.height / parts.center.width
    const markW = pageW * 0.58
    const markH = markW * ratio
    doc.saveGraphicsState()
    doc.setGState(new GState({ opacity: 0.12 }))
    doc.addImage(
      parts.center.dataUrl,
      'JPEG',
      (pageW - markW) / 2,
      (pageH - markH) / 2,
      markW,
      markH,
      'letterhead-center',
      'FAST',
    )
    doc.restoreGraphicsState()
  }

  if (parts.header) {
    const band = fitBand(pageW, parts.header, 28)
    doc.addImage(parts.header.dataUrl, 'JPEG', band.x, 10, band.width, band.height, 'letterhead-header', 'FAST')
  }

  if (parts.footer) {
    const band = fitBand(pageW, parts.footer, 22)
    doc.addImage(
      parts.footer.dataUrl,
      'JPEG',
      band.x,
      pageH - 8 - band.height,
      band.width,
      band.height,
      'letterhead-footer',
      'FAST',
    )
  }
}

export async function downloadSimplePdf(
  filename: string,
  title: string,
  lines: string[],
  table?: { head: string[]; body: (string | number)[][] },
) {
  await downloadMultiTablePdf(filename, title, lines, table ? [table] : [])
}

export async function downloadMultiTablePdf(
  filename: string,
  title: string,
  lines: string[],
  tables: { title?: string; head: string[]; body: (string | number)[][] }[],
) {
  const letterhead = await loadLetterhead()
  const doc = new jsPDF()
  const painted = new Set<number>()

  const paint = () => {
    const page = doc.getCurrentPageInfo().pageNumber
    if (painted.has(page)) return
    painted.add(page)
    paintLetterhead(doc, letterhead)
  }

  const top = () => contentTop(doc, letterhead)
  const bottom = () => contentBottom(doc, letterhead)

  paint()
  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text(title, 14, top())
  doc.setFontSize(10)
  let y = top() + 8
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 180)
    const needed = wrapped.length * 6
    if (y + needed > bottom()) {
      doc.addPage()
      paint()
      y = top()
    }
    doc.text(wrapped, 14, y)
    y += needed
  }

  for (const table of tables) {
    if (!table.body.length) continue
    if (table.title) {
      if (y > bottom() - 20) {
        doc.addPage()
        paint()
        y = top()
      }
      doc.setFontSize(11)
      doc.text(table.title, 14, y + 6)
      y += 10
      doc.setFontSize(10)
    }
    autoTable(doc, {
      startY: y + 2,
      margin: { top: top(), left: 14, right: 14, bottom: doc.internal.pageSize.getHeight() - bottom() },
      head: [table.head],
      body: table.body,
      styles: { fontSize: 8, textColor: 30 },
      headStyles: { fillColor: [201, 168, 76], textColor: 0 },
      willDrawPage: () => {
        paint()
      },
    })
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
