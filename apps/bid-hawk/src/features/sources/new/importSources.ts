import { PLATFORMS, PLATFORMS_BY_ID } from '@/data/seed/platforms'
import type { SaveSourceInput } from '@/data/api'
import { looksLikeWorkbook, parseDelimited } from '@/lib/delimited'
import { splitList, type ImportReport } from '@/lib/importReport'

export const IMPORT_COLUMNS = ['platform', 'name', 'listing url', 'id', 'keywords'] as const

export const TEMPLATE_CSV = [
  'platform,name,listing url,id,keywords',
  'gem,Government e-Marketplace,https://gem.gov.in/bidlists,GEM-SLR-0000000,"system integrator;managed services"',
  'cppp,Central Public Procurement Portal,https://eprocure.gov.in/eprocure/app,CPPP-BR-0000000,"turnkey;optical fibre"',
  'custom,Partner feed,https://partners.example/opportunities,PARTNER-01,"consortium;subcontract"',
].join('\n')

export const PREVIEW_HEADERS = ['Platform', 'Name', 'Keywords']

const PLATFORM_ALIASES = new Map<string, string>([
  ...PLATFORMS.map((p) => [p.id, p.id] as const),
  ...PLATFORMS.map((p) => [p.shortLabel.toLowerCase(), p.id] as const),
  ...PLATFORMS.map((p) => [p.label.toLowerCase(), p.id] as const),
])

function resolvePlatform(value: string): string | null {
  return PLATFORM_ALIASES.get(value.trim().toLowerCase()) ?? null
}

/**
 * Reads an import file into rows that can be added and rows that cannot, with a
 * reason for every rejection. A row is never partially accepted: if a required
 * cell is missing the row is reported by its line number and left out.
 */
export function readImport(text: string): ImportReport<SaveSourceInput> {
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
  const report: ImportReport<SaveSourceInput> = { accepted: [], rejected: [] }
  const { accepted, rejected } = report

  rows.slice(1).forEach((cells, offset) => {
    // Line numbers are the operator's, counting the header as line 1.
    const line = offset + 2
    const raw = cells.join(', ')
    const cell = (column: string) => (cells[index(column)] ?? '').trim()

    const platformId = resolvePlatform(cell('platform'))
    if (!platformId) {
      rejected.push({
        line,
        raw,
        reason: cell('platform') === '' ? 'No platform given' : `Unknown platform "${cell('platform')}"`,
      })
      return
    }

    const url = cell('listing url')
    if (url === '') {
      rejected.push({ line, raw, reason: 'No listing URL' })
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      rejected.push({ line, raw, reason: 'Listing URL is not an http address' })
      return
    }

    const keywords = splitList(cell('keywords'))
    if (keywords.length === 0) {
      rejected.push({ line, raw, reason: 'No keywords, so nothing would qualify' })
      return
    }

    const platform = PLATFORMS_BY_ID.get(platformId)
    const name = cell('name') === '' ? (platform?.shortLabel ?? platformId) : cell('name')
    accepted.push({
      line,
      input: { platformId, name, url, registeredId: cell('id'), keywords },
      preview: [platform?.shortLabel ?? platformId, name, keywords.join(', ')],
    })
  })

  return report
}
