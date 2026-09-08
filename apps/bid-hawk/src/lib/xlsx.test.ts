import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { buildXlsx } from './xlsx'

const parts = (bytes: Uint8Array) => unzipSync(bytes)
const sheetOf = (bytes: Uint8Array) => strFromU8(parts(bytes)['xl/worksheets/sheet1.xml'])
const cells = (xml: string) => [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1])

const SIMPLE = {
  name: 'Pre-bid queries',
  rows: [
    ['Tender', 'Question'],
    ['REF/1', 'Which clause governs?'],
  ],
}

describe('the workbook', () => {
  /*
   * A .xlsx is a zip of XML parts and Excel refuses the file if any of the six
   * are missing -- it does not degrade, it reports corruption.
   */
  it('carries every part a single-sheet workbook needs', () => {
    expect(Object.keys(parts(buildXlsx(SIMPLE))).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ])
  })

  it('writes every cell it was given', () => {
    expect(cells(sheetOf(buildXlsx(SIMPLE)))).toEqual([
      'Tender', 'Question', 'REF/1', 'Which clause governs?',
    ])
  })

  it('bolds the header row and only the header row', () => {
    const xml = sheetOf(buildXlsx(SIMPLE))
    const rows = [...xml.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)]
    expect(rows[0][2]).toContain('s="1"')
    expect(rows[1][2]).not.toContain('s="1"')
  })

  /* Five characters cannot appear raw in an XML text node. */
  it('escapes the characters that would break the file', () => {
    const xml = sheetOf(buildXlsx({
      name: 'x',
      rows: [['h'], ['180 days & "one hundred" <or> 120?']],
    }))
    expect(xml).toContain('180 days &amp; &quot;one hundred&quot; &lt;or&gt; 120?')
    expect(cells(xml)).toContain('180 days &amp; &quot;one hundred&quot; &lt;or&gt; 120?')
  })

  /*
   * Not defensive. A PDF's text layer is full of stray form feeds, extracted
   * quotes carry them into a cell, and a control character is illegal in XML 1.0
   * -- Excel rejects the whole workbook rather than the cell, which reads as
   * corruption to whoever opens it.
   */
  it('strips control characters a PDF quote drags in', () => {
    const xml = sheetOf(buildXlsx({
      name: 'x',
      rows: [['h'], ['bid\u000Cvalidity\u0000of\u001F180 days']],
    }))
    expect(xml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
    expect(cells(xml)).toContain('bid validity of 180 days')
  })

  /*
   * Excel caps a sheet name at 31 characters and forbids : \ / ? * [ ]. It
   * repairs a file that breaks either rule without asking, and a repaired file
   * reads as a corrupt one.
   */
  it('keeps the sheet name inside what Excel accepts', () => {
    const workbook = strFromU8(
      parts(buildXlsx({ name: 'Queries: MAHAIT/RTS2.0/001/2025/080 [draft]', rows: [['h']] }))[
        'xl/workbook.xml'
      ],
    )
    const name = /name="([^"]*)"/.exec(workbook)?.[1] ?? ''
    expect(name.length).toBeLessThanOrEqual(31)
    expect(name).not.toMatch(/[:\\/?*[\]]/)
  })

  /** Columns are base-26 with no zero, so the 27th is AA and not BA or A0. */
  it('addresses the 27th column as AA', () => {
    const wide = Array.from({ length: 27 }, (_, i) => `c${i + 1}`)
    const xml = sheetOf(buildXlsx({ name: 'x', rows: [wide] }))
    expect(xml).toContain('r="Z1"')
    expect(xml).toContain('r="AA1"')
  })

  it('caps a column at a readable width however long the quote is', () => {
    const xml = sheetOf(buildXlsx({ name: 'x', rows: [['h'], ['q'.repeat(600)]] }))
    const width = Number(/width="([\d.]+)"/.exec(xml)?.[1])
    expect(width).toBeLessThanOrEqual(70)
  })
})
