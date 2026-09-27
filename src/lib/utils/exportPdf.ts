import { GState, jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getLetterhead } from '@/lib/services/branding.service'

type Letterhead = { dataUrl: string; width: number; height: number }

async function loadLetterhead(): Promise<Letterhead | null> {
  try {
    const dataUrl = await getLetterhead()
    if (!dataUrl) return null
    return await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve({
        dataUrl,
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch {
    return null
  }
}

function headerBand(doc: jsPDF, image: Letterhead | null) {
  const pageW = doc.internal.pageSize.getWidth()
  if (!image) return { top: 18, height: 0 }
  const ratio = image.height / image.width
  const maxW = pageW - 28
  const maxH = 28
  let width = maxW
  let height = width * ratio
  if (height > maxH) {
    height = maxH
    width = height / ratio
  }
  return { top: 10 + height + 8, height, width, x: (pageW - width) / 2 }
}

function paintLetterhead(doc: jsPDF, image: Letterhead | null) {
  if (!image) return
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ratio = image.height / image.width
  const band = headerBand(doc, image)

  doc.saveGraphicsState()
  doc.setGState(new GState({ opacity: 0.12 }))
  const markW = pageW * 0.58
  const markH = markW * ratio
  doc.addImage(
    image.dataUrl,
    'JPEG',
    (pageW - markW) / 2,
    (pageH - markH) / 2,
    markW,
    markH,
    'letterhead',
    'FAST',
  )
  doc.restoreGraphicsState()

  doc.addImage(
    image.dataUrl,
    'JPEG',
    band.x ?? 14,
    10,
    band.width ?? pageW - 28,
    band.height,
    'letterhead',
    'FAST',
  )
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

  const contentTop = () => headerBand(doc, letterhead).top

  paint()
  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text(title, 14, contentTop())
  doc.setFontSize(10)
  let y = contentTop() + 8
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 180)
    const needed = wrapped.length * 6
    if (y + needed > 270) {
      doc.addPage()
      paint()
      y = contentTop()
    }
    doc.text(wrapped, 14, y)
    y += needed
  }

  for (const table of tables) {
    if (!table.body.length) continue
    if (table.title) {
      if (y > 250) {
        doc.addPage()
        paint()
        y = contentTop()
      }
      doc.setFontSize(11)
      doc.text(table.title, 14, y + 6)
      y += 10
      doc.setFontSize(10)
    }
    autoTable(doc, {
      startY: y + 2,
      margin: { top: contentTop(), left: 14, right: 14, bottom: 16 },
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
