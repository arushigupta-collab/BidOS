/**
 * A real .xlsx, written in the browser.
 *
 * Not a CSV renamed: a pre-bid query sheet goes to a buyer, and a file that
 * announces itself as Excel and is not costs somebody an argument about
 * encodings. An .xlsx is a zip of XML parts, and this writes the six a
 * single-sheet workbook needs.
 *
 * In the browser rather than in a function, deliberately. A serverless bundle and
 * a spreadsheet library have already disagreed once in this codebase -- pptxgenjs
 * needed a CJS require to survive Vercel's bundler -- and nothing about building
 * this file needs a server: the rows are already on the page.
 *
 * Strings only. Every column here is text, a date already formatted for reading,
 * or a page number that is meaningless as an arithmetic value, so nothing gains
 * from a numeric cell type and inline strings keep the writer honest.
 */
import { zipSync, strToU8 } from 'fflate'

/**
 * XML text nodes: the five characters that cannot appear raw, and the control
 * characters that are illegal in XML 1.0 at all.
 *
 * The second half is not defensive. A PDF's text layer is full of stray form
 * feeds and vertical tabs, extracted quotes carry them through, and Excel rejects
 * the whole workbook rather than the offending cell -- which reads as a corrupt
 * file to whoever opens it.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
}

/** A1, B1 ... Z1, AA1. Columns are base-26 with no zero, so A is 1 and not 0. */
function ref(column: number, row: number): string {
  let name = ''
  let n = column
  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - 1) / 26)
  }
  return `${name}${row}`
}

export interface Sheet {
  name: string
  /** The first row is the header and is rendered bold. */
  rows: string[][]
}

export function buildXlsx(sheet: Sheet): Uint8Array {
  const rows = sheet.rows
    .map((cells, r) => {
      const row = r + 1
      const tds = cells
        .map((cell, c) => {
          const style = r === 0 ? ' s="1"' : ''
          return (
            `<c r="${ref(c + 1, row)}" t="inlineStr"${style}>` +
            `<is><t xml:space="preserve">${esc(cell)}</t></is></c>`
          )
        })
        .join('')
      return `<row r="${row}">${tds}</row>`
    })
    .join('')

  const widths = (sheet.rows[0] ?? [])
    .map((_, c) => {
      // Sized to the longest cell in the column, capped: a 400-character quote
      // must not make one column wider than the screen.
      const longest = Math.max(...sheet.rows.map((r) => (r[c] ?? '').length), 10)
      return `<col min="${c + 1}" max="${c + 1}" width="${Math.min(longest + 2, 70)}" customWidth="1"/>`
    })
    .join('')

  /*
   * Excel caps a sheet name at 31 characters and forbids : \ / ? * [ ]. It
   * repairs a file that breaks either rule without asking, and a repaired file
   * reads as a corrupt one to whoever opens it.
   */
  const name = esc(sheet.name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31))

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    ),
    // Two fonts, two formats: the header is style 1, everything else style 0.
    'xl/styles.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
        `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
        `<borders count="1"><border/></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" xfId="0"/>` +
        `<xf numFmtId="0" fontId="1" xfId="0" applyFont="1"/></cellXfs>` +
        `</styleSheet>`,
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<cols>${widths}</cols>` +
        `<sheetData>${rows}</sheetData></worksheet>`,
    ),
  }

  return zipSync(files)
}

/** Hands the file to the browser. */
export function downloadXlsx(fileName: string, sheet: Sheet): void {
  const blob = new Blob([buildXlsx(sheet) as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
