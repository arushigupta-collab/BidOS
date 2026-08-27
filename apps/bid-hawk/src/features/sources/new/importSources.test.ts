import { describe, expect, it } from 'vitest'
import { parseDelimited } from '@/lib/delimited'
import { TEMPLATE_CSV, readImport } from './importSources'

const HEADER = 'platform,name,listing url,id,keywords'

describe('Delimited reading', () => {
  it('handles quoted cells, escaped quotes and embedded newlines', () => {
    const rows = parseDelimited('a,b\n"one, two","say ""hi"""\n"multi\nline",x')

    expect(rows).toEqual([
      ['a', 'b'],
      ['one, two', 'say "hi"'],
      ['multi\nline', 'x'],
    ])
  })

  it('strips a byte-order mark and tolerates CRLF', () => {
    expect(parseDelimited('﻿a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('detects a tab-separated export', () => {
    expect(parseDelimited('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('Import reading', () => {
  it('accepts every row of its own template', () => {
    const report = readImport(TEMPLATE_CSV)

    expect(report.fatal).toBeUndefined()
    expect(report.rejected).toHaveLength(0)
    expect(report.accepted).toHaveLength(3)
    expect(report.accepted[0].input.keywords).toEqual(['system integrator', 'managed services'])
  })

  it('names the offending line and the reason for each rejection', () => {
    const report = readImport(
      [
        HEADER,
        'gem,Good row,https://gem.gov.in/bidlists,ID-1,keyword',
        'nonsense,Bad platform,https://example.gov.in,ID-2,keyword',
        'cppp,No URL,,ID-3,keyword',
        'cppp,Not a URL,gem.gov.in,ID-4,keyword',
        'cppp,No keywords,https://example.gov.in,ID-5,',
      ].join('\n'),
    )

    expect(report.accepted).toHaveLength(1)
    expect(report.rejected.map((row) => [row.line, row.reason])).toEqual([
      [3, 'Unknown platform "nonsense"'],
      [4, 'No listing URL'],
      [5, 'Listing URL is not an http address'],
      [6, 'No keywords, so nothing would qualify'],
    ])
  })

  it('accepts a platform written as its short or full name', () => {
    const report = readImport(
      [
        HEADER,
        'GeM,By short name,https://gem.gov.in/bidlists,ID-1,keyword',
        'Central Public Procurement Portal (CPPP),By full name,https://eprocure.gov.in,ID-2,keyword',
      ].join('\n'),
    )

    expect(report.rejected).toHaveLength(0)
    expect(report.accepted.map((row) => row.input.platformId)).toEqual(['gem', 'cppp'])
  })

  it('falls back to the platform name when the name cell is empty', () => {
    const report = readImport([HEADER, 'ireps,,https://www.ireps.gov.in,ID-1,signalling'].join('\n'))

    expect(report.accepted[0].input.name).toBe('IREPS')
  })

  it('refuses a workbook by name rather than previewing binary', () => {
    const report = readImport('PKbinary rubbish')

    expect(report.fatal).toMatch(/Excel workbook/i)
    expect(report.accepted).toHaveLength(0)
  })

  it('refuses a file whose header is missing columns', () => {
    const report = readImport('platform,name\ngem,GeM')

    expect(report.fatal).toMatch(/missing listing url, id, keywords/i)
  })
})
