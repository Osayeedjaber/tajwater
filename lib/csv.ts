export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]).join(',')
  const body = rows.map(r =>
    Object.values(r)
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const blob = new Blob([[headers, ...body].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
