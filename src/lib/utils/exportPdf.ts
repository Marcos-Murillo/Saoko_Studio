import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadSimplePdf(
  filename: string,
  title: string,
  lines: string[],
  table?: { head: string[]; body: (string | number)[][] },
) {
  downloadMultiTablePdf(filename, title, lines, table ? [table] : [])
}

export function downloadMultiTablePdf(
  filename: string,
  title: string,
  lines: string[],
  tables: { title?: string; head: string[]; body: (string | number)[][] }[],
) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  let y = 28
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 180)
    doc.text(wrapped, 14, y)
    y += wrapped.length * 6
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }
  for (const table of tables) {
    if (!table.body.length) continue
    if (table.title) {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.text(table.title, 14, y + 6)
      y += 10
      doc.setFontSize(10)
    }
    autoTable(doc, {
      startY: y + 2,
      head: [table.head],
      body: table.body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [201, 168, 76], textColor: 0 },
    })
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8
  }
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
