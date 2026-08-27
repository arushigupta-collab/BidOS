/**
 * A small delimited-text reader for the source import.
 *
 * Written rather than pulled in: this is a data format, not a UI primitive, and
 * the format the import accepts is narrow — a header row, then one source per
 * row. It handles quoted fields, escaped quotes inside them, embedded newlines,
 * CRLF endings and a leading byte-order mark, which is the set of things a real
 * export from Excel or Sheets actually produces.
 */

/** Excel and Sheets both write a BOM when saving CSV as UTF-8. */
const BOM = '﻿'

export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'))
  const tabs = firstLine.split('\t').length
  const commas = firstLine.split(',').length
  const semicolons = firstLine.split(';').length
  if (tabs > commas && tabs > semicolons) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

/** Splits delimited text into rows of raw cell strings. */
export function parseDelimited(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.startsWith(BOM) ? input.slice(BOM.length) : input
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n') {
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.trim())
    rows.push(row)
  }

  // A trailing newline leaves one empty row behind.
  return rows.filter((cells) => cells.some((value) => value !== ''))
}

/**
 * True when the bytes are a ZIP container, which is what .xlsx really is. A
 * workbook cannot be read as text, so the import says so by name rather than
 * showing an operator a preview of binary.
 */
export function looksLikeWorkbook(text: string): boolean {
  return text.startsWith('PK') || text.startsWith('\xD0\xCFà')
}
