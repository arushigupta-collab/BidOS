/**
 * The model-calling stages.
 *
 * Each takes the loaded document and returns validated data. None of them writes
 * anywhere: persistence is the caller's job, which keeps every stage a pure
 * function of its inputs and therefore testable against a recorded response.
 */
import type { Content, ModelCall } from './openrouter'
import { TEXT_MODEL, complete } from './openrouter'
import { carryForward } from './dates'
import { FIELD_SPECS, selectPages, type Page } from './pageIndex'
import {
  COMMERCIAL_TERMS_SCHEMA, ELIGIBILITY_SCHEMA, RISK_SCHEMA,
  SUMMARY_SCHEMA, WORK_PACKAGE_SCHEMA,
} from './schemas'
import {
  COMMERCIAL_SYSTEM, ELIGIBILITY_SYSTEM, RISK_SYSTEM,
  SUMMARY_SYSTEM, WORK_PACKAGE_SYSTEM,
} from './prompts'

export interface StageResult<T> {
  data: T
  calls: ModelCall[]
}

/**
 * The pages for a set of fields, marked up so the model can cite them.
 *
 * The "[page N]" marker is why the prompt tells the model to cite by marker
 * rather than by the number printed on the page: this document's printed folio
 * and its PDF index agree for most of its length and then diverge, and a
 * citation the viewer cannot open is worse than none.
 */
function pagesFor(pages: Page[], keys: string[]): { text: string; pageNos: number[] } {
  const chosen = new Set<number>()
  for (const key of keys) {
    const spec = FIELD_SPECS.find((s) => s.key === key)
    if (!spec) throw new Error(`no field spec named ${key}`)
    for (const page of selectPages(pages, spec)) chosen.add(page.pageNo)
  }
  const pageNos = [...chosen].sort((a, b) => a - b)
  const text = pageNos
    .map((n) => `[page ${n}]\n${pages[n - 1].text}`)
    .join('\n\n')
  return { text, pageNos }
}

const asText = (text: string): Content[] => [{ type: 'text', text }]

/**
 * The dates a prose stage is allowed to write.
 *
 * Handed to `summarise` and `workpackages` because both produce sentences, and a
 * sentence quoting the document's own calendar contradicts the countdown running
 * beside it. The extracted values are left alone: they are what makes each figure
 * checkable against its page.
 */
function dateBlock(terms: CommercialTerms, now = new Date()): string {
  const { readable } = carryForward(
    {
      bid_due: terms.bid_due.value,
      prebid_queries_due: terms.prebid_queries_due.value,
      prebid_conference: terms.prebid_conference.value,
    },
    'bid_due',
    now,
  )

  const lines = [
    readable.bid_due ? `Bid submission closes: ${readable.bid_due}` : null,
    readable.prebid_queries_due ? `Pre-bid queries close: ${readable.prebid_queries_due}` : null,
    readable.prebid_conference ? `Pre-bid conference: ${readable.prebid_conference}` : null,
  ].filter(Boolean)

  if (lines.length === 0) return ''
  return [
    '--- THE DATES TO USE ---',
    'These are the operative dates. Use ONLY these when you refer to a deadline.',
    'Do not take a date from a clause quoted below; those are the dates as first',
    'published and they are not the ones this bid runs to.',
    ...lines,
    '',
  ].join('\n')
}

const COMMERCIAL_KEYS = [
  'tender_ref', 'issuing_authority', 'selection_method', 'tender_fee', 'emd', 'bid_due',
  'bid_validity', 'contract_term', 'pbg', 'prebid', 'envelopes', 'est_value', 'consortium',
]

export interface CitedValue {
  value: string | null
  page_no: number | null
  quote: string | null
  confidence: number
}

export interface CommercialTerms {
  title: CitedValue
  tender_ref: CitedValue
  issuing_authority: CitedValue
  selection_method: CitedValue
  tender_fee: CitedValue
  emd: CitedValue
  bid_due: CitedValue
  bid_validity: CitedValue
  contract_term: CitedValue
  pbg: CitedValue
  est_value: CitedValue
  est_value_is_inferred: boolean
  envelopes: CitedValue
  prebid_queries_due: CitedValue
  prebid_conference: CitedValue
  consortium_allowed: boolean | null
  industry: string
  region: string
}

export async function extractCommercialTerms(pages: Page[]): Promise<StageResult<CommercialTerms>> {
  const { text } = pagesFor(pages, COMMERCIAL_KEYS)
  const result = await complete<CommercialTerms>({
    stage: 'extract',
    system: COMMERCIAL_SYSTEM,
    content: asText(text),
    schema: COMMERCIAL_TERMS_SCHEMA as never,
  })
  return { data: result.data, calls: [result.call] }
}

export interface EligibilityRow {
  criterion: string
  status: 'pass' | 'warn' | 'fail'
  note: string
  page_no: number | null
}

export async function extractEligibility(
  pages: Page[],
  companyProfile: string,
): Promise<StageResult<{ rows: EligibilityRow[] }>> {
  const { text } = pagesFor(pages, ['eligibility'])
  const result = await complete<{ rows: EligibilityRow[] }>({
    stage: 'eligibility',
    system: `${ELIGIBILITY_SYSTEM}\n\n--- THE BIDDING COMPANY ---\n${companyProfile}`,
    content: asText(text),
    schema: ELIGIBILITY_SCHEMA as never,
    // Observed ~7.5k, of which 6.3k was reasoning.
    maxTokens: 20_000,
  })
  return { data: result.data, calls: [result.call] }
}

export interface RiskEvidence {
  quote: string
  page_no: number
}

export interface RiskFlag {
  title: string
  severity: 'high' | 'medium' | 'low'
  detail: string
  /** Verbatim passages, checkable against the page each names. */
  evidence: RiskEvidence[]
  recommendation: string
  deadline: string | null
  page_no: number | null
}

/**
 * Takes the extracted terms as well as the pages, and the reason is a defect this
 * stage produced without them.
 *
 * It reads a window of the document, so it can see a clause referring to the bid
 * validity period without seeing where that period is set. Asked to find things
 * the tender leaves unspecified, it duly reported that the bid validity period is
 * never stated -- about a tender that states it plainly on a page outside the
 * window. Confidently wrong, and wrong about something a reader checks in a
 * minute.
 *
 * The extracted terms are what it now checks a negative against.
 */
export async function extractRisks(
  pages: Page[],
  terms?: CommercialTerms,
): Promise<StageResult<{ flags: RiskFlag[] }>> {
  // SLA and the commercial terms together: a contradiction is usually between a
  // schedule and a clause, and neither page set contains both halves alone.
  const { text } = pagesFor(pages, ['sla', 'pbg', 'emd', 'contract_term', 'prebid', 'bid_validity'])

  const content = terms
    ? [
        '--- ALREADY EXTRACTED TERMS ---',
        'A value present here IS stated in the document. Do not report it as missing.',
        JSON.stringify(terms, null, 2),
        '',
        '--- PAGES ---',
        text,
      ].join('\n')
    : text

  const result = await complete<{ flags: RiskFlag[] }>({
    stage: 'risks',
    system: RISK_SYSTEM,
    content: asText(content),
    schema: RISK_SCHEMA as never,
    // Observed ~8.6k, of which 7.1k was reasoning.
    maxTokens: 20_000,
  })
  return { data: result.data, calls: [result.call] }
}

export async function writeSummary(
  terms: CommercialTerms,
  eligibility: EligibilityRow[],
  flags: RiskFlag[],
): Promise<StageResult<{ bullets: string[]; condensed: string[] }>> {
  // Summarises the extracted facts, not the document: re-reading the pages here
  // would let the summary state something the extracted fields contradict.
  const facts = JSON.stringify({ terms, eligibility, flags }, null, 2)
  const result = await complete<{ bullets: string[]; condensed: string[] }>({
    stage: 'summarise',
    system: SUMMARY_SYSTEM,
    content: asText(`${dateBlock(terms)}--- THE FACTS ---\n${facts}`),
    schema: SUMMARY_SCHEMA as never,
    /**
     * Observed ~2.1k, of which 1.7k was reasoning -- and this is the stage that
     * failed on a live upload. It had 860 tokens of headroom, the least of the
     * five, because it produces the least text; but the thinking that precedes a
     * short answer is not correspondingly short, and it is the thinking that
     * overran.
     */
    maxTokens: 12_000,
  })
  return { data: result.data, calls: [result.call] }
}

export interface WorkPackage {
  role_id: string
  brief: string
  source_sections: string[]
  action_items: { text: string; ref: string; page_no: number | null }[]
  forms: { annexure: string; title: string; kind: 'fields' | 'checklist'; page_no: number | null }[]
}

/**
 * Takes the extracted terms but NOT the eligibility judgements, deliberately.
 *
 * It needs the tender's criteria, and it already receives them as document pages;
 * what it does not need is our verdict on whether we meet them. Depending on that
 * verdict would also serialise two stages that have no reason to wait for each
 * other, and this is the slowest stage in the pipeline.
 */
export async function deriveWorkPackages(
  pages: Page[],
  terms: CommercialTerms,
): Promise<StageResult<{ packages: WorkPackage[] }>> {
  const { text } = pagesFor(pages, ['annexures', 'eligibility'])
  const context = [
    dateBlock(terms),
    '--- WHAT THIS TENDER REQUIRES ---',
    JSON.stringify({ terms }, null, 2),
    '',
    '--- THE DOCUMENT\'S ANNEXURES AND CRITERIA ---',
    text,
  ].join('\n')

  const result = await complete<{ packages: WorkPackage[] }>({
    stage: 'workpackages',
    system: WORK_PACKAGE_SYSTEM,
    content: asText(context),
    schema: WORK_PACKAGE_SCHEMA as never,
    model: TEXT_MODEL,
    // Observed ~11.8k, of which 8.2k was reasoning. The largest output of the five.
    maxTokens: 24_000,
  })
  return { data: result.data, calls: [result.call] }
}
