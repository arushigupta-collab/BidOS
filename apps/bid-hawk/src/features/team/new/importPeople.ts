import type { SavePersonInput } from '@/data/api'
import { looksLikeWorkbook, parseDelimited } from '@/lib/delimited'
import { splitList, type ImportReport } from '@/lib/importReport'
import { emailProblem } from '../personDraft'

export const IMPORT_COLUMNS = [
  'name',
  'email',
  'domain expertise',
  'regional expertise',
] as const

export const TEMPLATE_CSV = [
  'name,email,domain expertise,regional expertise',
  'Anand Raghunathan,anand.raghunathan@meridianinfratech.in,"Telecom;Optical Fibre","North;Pan-India"',
  'Meera Krishnan,meera.krishnan@meridianinfratech.in,"IT Services;Data and Analytics","Maharashtra;West"',
  'Vikram Iyer,vikram.iyer@meridianinfratech.in,"Cybersecurity;Cloud and Infrastructure",',
].join('\n')

export const PREVIEW_HEADERS = ['Name', 'Email', 'Expertise']

/**
 * Reads an import file into people that can be added and rows that cannot, with a
 * reason for every rejection. The same rules the form enforces: a name, a usable
 * email, and at least one area of expertise across the two columns.
 */
export function readImport(text: string): ImportReport<SavePersonInput> {
  if (looksLikeWorkbook(text)) {
    return {
      accepted: [],
      rejected: [],
      fatal:
        'This is an Excel workbook, which is a compressed archive rather than text. Save it as CSV from Excel or Sheets, or start from the template, then import again.',
    }
  }

  const rows = parseDelimited(text)
  if (rows.length === 0) {
    return { accepted: [], rejected: [], fatal: 'The file is empty.' }
  }

  const header = rows[0].map((cell) => cell.toLowerCase())
  const missingColumns = IMPORT_COLUMNS.filter((column) => !header.includes(column))
  if (missingColumns.length > 0) {
    return {
      accepted: [],
      rejected: [],
      fatal: `The header row is missing ${missingColumns.join(', ')}. Expected: ${IMPORT_COLUMNS.join(', ')}.`,
    }
  }

  const index = (column: string) => header.indexOf(column)
  const report: ImportReport<SavePersonInput> = { accepted: [], rejected: [] }
  const { accepted, rejected } = report

  rows.slice(1).forEach((cells, offset) => {
    // Line numbers are the operator's, counting the header as line 1.
    const line = offset + 2
    const raw = cells.join(', ')
    const cell = (column: string) => (cells[index(column)] ?? '').trim()

    const name = cell('name')
    if (name === '') {
      rejected.push({ line, raw, reason: 'No name' })
      return
    }

    const email = cell('email')
    const problem = emailProblem(email)
    if (problem === 'empty') {
      rejected.push({ line, raw, reason: 'No email address' })
      return
    }
    if (problem !== null) {
      rejected.push({ line, raw, reason: `"${email}" is not a usable email address` })
      return
    }

    const domains = splitList(cell('domain expertise'))
    const regions = splitList(cell('regional expertise'))
    if (domains.length === 0 && regions.length === 0) {
      rejected.push({
        line,
        raw,
        reason: 'No expertise in either column, so nothing could be routed to them',
      })
      return
    }

    accepted.push({
      line,
      input: { name, email, domains, regions },
      preview: [name, email, [...domains, ...regions].join(', ')],
    })
  })

  return report
}
