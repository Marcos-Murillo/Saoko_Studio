import * as XLSX from 'xlsx'

export function downloadXlsx(filename: string, rows: Record<string, unknown>[], sheetName = 'Datos') {
  downloadXlsxBook(filename, [{ name: sheetName, rows }])
}

export function downloadXlsxBook(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[],
) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ Mensaje: 'Sin datos' }]
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

