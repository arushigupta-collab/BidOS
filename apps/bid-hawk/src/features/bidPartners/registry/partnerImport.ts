import type { Partner } from '@/types'
import { looksLikeWorkbook, parseDelimited } from '@/lib/delimited'
import { splitList, type ImportReport } from '@/lib/importReport'
import { emailError } from '../../team/personDraft'
import { nextPartnerId } from './partnerDraft'

export const IMPORT_COLUMNS = [
  'partner name',
  'contact person',
  'contact email',
  'capabilities',
  'regions',
] as const

export const TEMPLATE_CSV = [
  'partner name,contact person,contact email,capabilities,regions,team size,annual turnover cr,certifications,empanelments',
  'Arkavati Systems Limited,Rohit Deshmukh,rohit.deshmukh@arkavatisystems.in,"IT Services;Cloud and Infrastructure","Pan-India;Maharashtra",900,340,"CMMI L5;ISO 27001","GeM registered"',
  'Nirvaha Analytics Private Limited,Sneha Raghavan,sneha.raghavan@nirvaha.in,"AI - NLP;Data and Analytics","South;Karnataka",46,19,"ISO 27001","GeM registered;Startup India"',
].join('\n')

export const PREVIEW_HEADERS = ['Partner', 'Contact', 'Capabilities and regions']

const number = (value: string) => {
  const parsed = Number(value.replace(/[, ]/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Reads an import file into partners that can be added and rows that cannot, with a
 * reason for every rejection. The same rules the form enforces: a name, a contact, a
 * usable email, and at least one value across capabilities and regions.
 *
 * Workbooks are rejected with guidance rather than parsed, which is what the shared
 * shell already does for sources and people. There is no SheetJS in this repository;
 * see docs/decisions.md.
 */
export function readImport(text: string): ImportReport<Partner> {
  if (looksLikeWorkbook(text)) {
    return {
      accepted: [],
      rejected: [],
      fatal:
        'This is an Excel workbook, which is a compressed archive rather than text. Save it as CSV from Excel or Sheets, or start from the template, then import again.',
    }
  }

  const rows = parseDelimited(text)
  if (rows.length === 0) return { accepted: [], rejected: [], fatal: 'The file is empty.' }

  const header = rows[0].map((cell) => cell.toLowerCase())
  const missing = IMPORT_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    return {
      accepted: [],
      rejected: [],
      fatal: `The header row is missing ${missing.join(', ')}. Expected: ${IMPORT_COLUMNS.join(', ')}.`,
    }
  }

  const index = (column: string) => header.indexOf(column)
  const report: ImportReport<Partner> = { accepted: [], rejected: [] }

  rows.slice(1).forEach((cells, offset) => {
    // Line numbers are the operator's, counting the header as line 1.
    const line = offset + 2
    const raw = cells.join(', ')
    const cell = (column: string) => (cells[index(column)] ?? '').trim()

    const name = cell('partner name')
    const contactName = cell('contact person')
    const contactEmail = cell('contact email')
    const capabilities = splitList(cell('capabilities'))
    const regions = splitList(cell('regions'))

    if (name === '') {
      report.rejected.push({ line, raw, reason: 'No partner name.' })
      return
    }
    if (contactName === '') {
      report.rejected.push({ line, raw, reason: 'No contact person.' })
      return
    }
    const emailFault = emailError(contactEmail)
    if (emailFault) {
      report.rejected.push({ line, raw, reason: emailFault })
      return
    }
    if (capabilities.length === 0 && regions.length === 0) {
      report.rejected.push({
        line,
        raw,
        reason: 'No capabilities and no regions. A partner needs at least one of the two.',
      })
      return
    }

    report.accepted.push({
      line,
      input: {
        id: nextPartnerId(),
        name,
        type: 'System Integrator',
        // An imported row that does not name an industry gets the commonest one
        // rather than an empty string, which would route it to no tender at all.
        industry: cell('industry')?.trim() || 'e-Governance and Citizen Services',
        capabilities,
        regions,
        teamSize: number(cell('team size')) ?? 0,
        annualTurnoverCr: number(cell('annual turnover cr')) ?? 0,
        certifications: splitList(cell('certifications')),
        empanelment: splitList(cell('empanelments')),
        contactName,
        contactEmail,
        // Registry fields only. Rating, projects delivered and on-time delivery are
        // Partner Evaluation's, and an imported partner has no history here yet.
        rating: 0,
        projectsDelivered: 0,
        onTimeDeliveryPct: 0,
        historyEntries: [],
        // An imported partner declares no technical stack and no comparable scope. Both
        // are evaluation inputs, and inventing them from a CSV of nine registry columns
        // would be fabricating the evidence the criterion exists to weigh.
        technicalStack: [],
        comparableTechnicalScope: false,
        comparableScopeNote: 'Not assessed. No technical profile on record.',
        onboardedAt: new Date().toISOString(),
        status: 'active',
      },
      preview: [name, contactName, [...capabilities, ...regions].join(', ')],
    })
  })

  return report
}

/** Spread into ImportDialog, so the registry does not restate the shell's contract. */
export const PARTNER_IMPORT = {
  title: 'Import partners',
  description:
    'Add many delivery partners at once from a spreadsheet export. Every row is checked before anything is added.',
  read: readImport,
  template: TEMPLATE_CSV,
  templateFileName: 'bidos-partners-template.csv',
  previewHeaders: PREVIEW_HEADERS,
  noun: 'partner',
  pluralNoun: 'partners',
} as const
