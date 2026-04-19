/**
 * CSV mínimo: parser + writer.
 * Suporta `,` e `;` como separador (auto-detect pelo header).
 * Suporta valores entre aspas duplas com escape `""`.
 * Aceita CRLF, LF e CR como quebra de linha.
 */

export type CsvRow = Record<string, string>

function detectSeparator(headerLine: string): string {
  const semis = (headerLine.match(/;/g) || []).length
  const commas = (headerLine.match(/,/g) || []).length
  return semis > commas ? ';' : ','
}

/**
 * Parse uma linha CSV respeitando aspas e o separador dado.
 */
function parseLine(line: string, sep: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      current += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === sep) {
      out.push(current)
      current = ''
      i++
      continue
    }
    current += ch
    i++
  }
  out.push(current)
  return out.map((c) => c.trim())
}

/**
 * Parse CSV completo. Retorna { headers, rows } onde rows é array de objects.
 * Lança Error com mensagem descritiva se header faltar.
 */
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, '')
  // Normaliza quebras de linha
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '')

  if (lines.length === 0) {
    throw new Error('Arquivo CSV vazio.')
  }

  const sep = detectSeparator(lines[0])
  const headers = parseLine(lines[0], sep).map((h) => h.toLowerCase())

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], sep)
    const row: CsvRow = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    rows.push(row)
  }
  return { headers, rows }
}

/**
 * Gera CSV (separador `;` por padrão, UTF-8 BOM pra abrir bem no Excel-BR).
 * Strings com `;`, `"` ou quebra de linha são citadas.
 */
export function toCsv(
  headers: string[],
  rows: Array<Record<string, string | number | null | undefined>>,
  separator: string = ';'
): string {
  const escape = (val: any): string => {
    const s = val === null || val === undefined ? '' : String(val)
    if (s.includes(separator) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines: string[] = []
  lines.push(headers.map(escape).join(separator))
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(separator))
  }
  return '\uFEFF' + lines.join('\r\n')
}
