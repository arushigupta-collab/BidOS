/**
 * The `locate` stage. Given a paginated document, decide which pages are worth
 * sending to a model for each field we need.
 *
 * This is what keeps a 262-page tender affordable. A government RFP states each
 * commercial term once, in a clause that names it, and buries it among hundreds
 * of pages of scope and boilerplate. Sending the whole document per field costs
 * roughly two orders of magnitude more than sending the handful of pages that
 * mention "Earnest Money", and it measurably worsens extraction: the model
 * starts choosing between the real EMD and the other rupee figures nearby.
 *
 * Deterministic and dependency-free, so it is cheap to test against a real
 * document and its behaviour never drifts between runs.
 */

export interface Page {
  pageNo: number
  text: string
}

/**
 * The shape of value a field's defining clause is expected to carry.
 *
 * This is the load-bearing signal, and it was added because term-matching alone
 * failed on a real document in both directions. The clause setting the PBG on
 * page 48 says "equivalent to ten (10) % of Total Contract Value"; four pages
 * that merely cross-refer to the PBG outscored it and pushed it out of the
 * candidate set. Same for the contract term on page 167. A page that names a
 * concept AND states a number is the page that defines it; a page that only
 * names it is usually pointing somewhere else.
 */
export type ValueShape = 'currency' | 'percent' | 'duration' | 'date' | 'none'

const VALUE_PATTERNS: Record<Exclude<ValueShape, 'none'>, RegExp> = {
  // Indian digit grouping (1,00,00,000) as well as plain, plus lakh/crore words.
  currency: /(?:inr|rs\.?|₹)\s*[\d,]+|\b\d[\d,]*\s*(?:lakh|lakhs|crore|crores|cr)\b/i,
  // Bare "10%" and the "ten (10) %" form Indian tenders favour.
  percent: /\d+(?:\.\d+)?\s*%|\(\s*\d+(?:\.\d+)?\s*\)\s*%/,
  // "180 days", "(45) months", "thirty-six (36) months".
  duration: /(?:\d+|\(\s*\d+\s*\))\s*\)?\s*(?:day|week|month|year)s?\b/i,
  date: /\b\d{1,2}[-/\s](?:\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-/\s]\d{2,4}\b/i,
}

export interface FieldSpec {
  key: string
  /**
   * A pattern matching the STRUCTURE the field's content sits in, as opposed to
   * the words used to talk about it.
   *
   * Term matching alone cannot tell "5.4 Pre-Qualification Criteria" in a table
   * of contents from the criteria table itself; both contain the phrase, and the
   * contents entry often scores higher because a contents page mentions many
   * headings at once. The criteria table is recognisable instead by the column
   * header it repeats on every page it spans.
   */
  structure?: RegExp
  /** Any hit qualifies the page. Matched case-insensitively, on word boundaries. */
  terms: string[]
  /** Terms that make a page substantially more likely to be the defining one. */
  strong?: string[]
  /** The value shape the defining clause should carry. */
  value: ValueShape
  /** How many pages to hand the model, before neighbour expansion. */
  topK: number
  /**
   * Pages either side of each hit to pull in as well.
   *
   * Non-zero for anything that lives in a table. The Pre-Qualification criteria
   * open under a heading on one page and continue onto the next under nothing but
   * a repeated column header, so the continuation scores nothing and is dropped
   * exactly when it matters: the CMMI row, which is the criterion this bid fails,
   * sits on the continuation page rather than the one with the heading.
   */
  expand: number
}

/**
 * One entry per fact the Orchestrator's RFP detail page is specified to carry,
 * plus the three sets that drive eligibility, work packages and risk.
 *
 * Terms are drawn from Indian public-procurement vocabulary rather than from this
 * one document, so the set generalises: a tender saying "Bid Security" instead of
 * "EMD", or "Least Cost Selection" instead of "QCBS", still resolves.
 */
export const FIELD_SPECS: FieldSpec[] = [
  { key: 'tender_ref', value: 'none', topK: 3, expand: 0,
    terms: ['tender reference', 'tender no', 'nit no', 'rfp reference', 'tender id'], strong: ['tender reference number'] },
  { key: 'issuing_authority', value: 'none', topK: 4, expand: 0,
    terms: ['issued by', 'tendering authority', 'procuring entity', 'on behalf of', 'name and address'], strong: ['tendering authority'] },
  { key: 'selection_method', value: 'percent', topK: 5, expand: 1,
    terms: ['qcbs', 'least cost', 'evaluation methodology', 'quality and cost', 'combined score'], strong: ['quality and cost based', 'qcbs'] },
  { key: 'tender_fee', value: 'currency', topK: 5, expand: 0,
    terms: ['tender fee', 'tender document fee', 'processing fee', 'non-refundable'], strong: ['tender fee'] },
  { key: 'emd', value: 'currency', topK: 6, expand: 0,
    terms: ['emd', 'earnest money', 'bid security'], strong: ['earnest money deposit'] },
  { key: 'bid_due', value: 'date', topK: 5, expand: 1,
    terms: ['last date', 'due date', 'bid submission', 'closing date', 'key dates', 'important dates'], strong: ['last date and time'] },
  { key: 'bid_validity', value: 'duration', topK: 4, expand: 0,
    terms: ['bid validity', 'validity of bid', 'validity period', 'remain valid'], strong: ['bid validity'] },
  { key: 'contract_term', value: 'duration', topK: 6, expand: 1,
    terms: ['contract period', 'contract term', 'o&m', 'operation and maintenance', 'project duration', 'implementation period', 'completion timeline'],
    strong: ['term of the contract', 'contract period'] },
  { key: 'pbg', value: 'percent', topK: 6, expand: 1,
    terms: ['pbg', 'performance bank guarantee', 'performance security', 'performance guarantee'], strong: ['performance bank guarantee'] },
  { key: 'prebid', value: 'date', topK: 5, expand: 0,
    terms: ['pre-bid', 'prebid', 'pre bid', 'clarification'], strong: ['pre-bid meeting', 'pre-bid conference'] },
  { key: 'envelopes', value: 'none', topK: 4, expand: 1,
    terms: ['envelope', 'two bid', 'three bid', 'four envelope', 'sealed cover'], strong: ['envelope system'] },
  { key: 'est_value', value: 'currency', topK: 5, expand: 0,
    terms: ['estimated cost', 'estimated value', 'project cost', 'budget', 'contract value'], strong: ['estimated cost'] },
  { key: 'consortium', value: 'none', topK: 3, expand: 0,
    terms: ['consortium', 'joint venture', 'sole bidder'], strong: ['consortium'] },
  { key: 'eligibility', value: 'none', topK: 6, expand: 2,
    terms: ['pre-qualification', 'eligibility criteria', 'minimum eligibility', 'qualification criteria', 'turnover', 'net worth', 'cmmi'],
    strong: ['pre-qualification criteria', 'eligibility criteria'],
    structure: /S\.N\.\s*CRITERIA|SUPPORTING DOCUMENTS/i },
  { key: 'annexures', value: 'none', topK: 10, expand: 1,
    terms: ['annexure', 'appendix', 'format for', 'proforma', 'undertaking'], strong: ['list of annexures'] },
  { key: 'sla', value: 'percent', topK: 8, expand: 1,
    terms: ['sla', 'service level', 'penalty', 'liquidated damages', 'response time'], strong: ['service level agreement'] },
]

const WORD_BOUNDARY = /[^a-z0-9&]/

/** Whole-word-ish containment, so "jv" does not match inside "jvm". */
function hasTerm(haystack: string, term: string): boolean {
  let from = 0
  for (;;) {
    const at = haystack.indexOf(term, from)
    if (at === -1) return false
    const before = at === 0 ? ' ' : haystack[at - 1]
    const after = at + term.length >= haystack.length ? ' ' : haystack[at + term.length]
    if (WORD_BOUNDARY.test(before) && WORD_BOUNDARY.test(after)) return true
    from = at + term.length
  }
}

export interface ScoredPage {
  pageNo: number
  score: number
  hits: string[]
  /** True when this page was pulled in by expansion rather than on its own score. */
  viaNeighbour?: boolean
}

const STRONG_WEIGHT = 5
const VALUE_WEIGHT = 6
const STRUCTURE_WEIGHT = 10

/**
 * A contents page, which mentions everything and defines nothing.
 *
 * Recognised by dotted leaders -- the run of periods between a heading and its
 * page number. Nothing else in a tender document produces them, and every
 * contents page in this one is full of them.
 *
 * Worth excluding rather than merely down-weighting: on the source document the
 * eligibility field was sending fourteen pages of front matter and cross
 * references for every one page of actual criteria, because a contents entry
 * naming three sections outscored the table itself.
 */
export function isTableOfContents(text: string): boolean {
  return (text.match(/\.{4,}/g) ?? []).length >= 5
}

/**
 * Pages that mention a field's vocabulary, best first.
 *
 * Scored on how many DISTINCT terms a page carries rather than on raw frequency:
 * a table of contents repeats "Annexure" forty times and defines nothing, while
 * the clause that sets the EMD names the amount, the instrument and the validity
 * together.
 */
export function scorePages(pages: Page[], spec: FieldSpec): ScoredPage[] {
  const valuePattern = spec.value === 'none' ? null : VALUE_PATTERNS[spec.value]

  return pages
    .map((page) => {
      const hay = page.text.toLowerCase()
      const hits: string[] = []
      let score = 0

      if (isTableOfContents(page.text)) {
        return { pageNo: page.pageNo, score: 0, hits: [] }
      }

      for (const term of spec.terms) {
        if (hasTerm(hay, term)) {
          hits.push(term)
          score += 1
        }
      }
      for (const term of spec.strong ?? []) {
        if (hasTerm(hay, term)) {
          if (!hits.includes(term)) hits.push(term)
          score += STRONG_WEIGHT
        }
      }
      // Only rewards pages that already matched: a page full of rupee figures
      // and nothing else is not a candidate for the EMD.
      if (score > 0 && valuePattern?.test(page.text)) {
        hits.push(`<${spec.value}>`)
        score += VALUE_WEIGHT
      }
      // Applies whether or not a term matched: a continuation page of the
      // criteria table carries the column header and none of the vocabulary.
      if (spec.structure?.test(page.text)) {
        hits.push('<structure>')
        score += STRUCTURE_WEIGHT
      }

      return { pageNo: page.pageNo, score, hits }
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.pageNo - b.pageNo)
}

/** Top-K by score, then each hit's neighbours, in page order. */
export function selectPages(pages: Page[], spec: FieldSpec): ScoredPage[] {
  const top = scorePages(pages, spec).slice(0, spec.topK)
  if (spec.expand === 0) return top.sort((a, b) => a.pageNo - b.pageNo)

  const byPage = new Map(top.map((p) => [p.pageNo, p]))
  for (const hit of top) {
    for (let d = 1; d <= spec.expand; d += 1) {
      for (const n of [hit.pageNo - d, hit.pageNo + d]) {
        if (n >= 1 && n <= pages.length && !byPage.has(n)) {
          byPage.set(n, { pageNo: n, score: 0, hits: [], viaNeighbour: true })
        }
      }
    }
  }
  return [...byPage.values()].sort((a, b) => a.pageNo - b.pageNo)
}

/**
 * The union of every field's candidate pages. This is the only part of the
 * document that reaches a model.
 */
export function candidateSet(pages: Page[], specs: FieldSpec[] = FIELD_SPECS): Map<string, ScoredPage[]> {
  return new Map(specs.map((spec) => [spec.key, selectPages(pages, spec)]))
}

/**
 * Pages the vision model must actually read.
 *
 * Two conditions, and the second is easy to miss. A page needs the VLM when it
 * has no usable text layer AND some field selected it ON ITS OWN SCORE. A page
 * pulled in only as a neighbour is there to supply the continuation of a table;
 * if it has no text there is no continuation to supply, and rendering it to an
 * image for a model to read costs a call and returns nothing.
 *
 * On the source document this is empty: its two textless pages are full-page
 * diagrams, and the only field that reaches either does so by expansion.
 */
export function pagesNeedingVision(
  pages: Page[],
  scannedPages: number[],
  specs: FieldSpec[] = FIELD_SPECS,
): number[] {
  const scanned = new Set(scannedPages)
  const wanted = new Set<number>()

  for (const spec of specs) {
    for (const page of selectPages(pages, spec)) {
      if (page.score > 0 && scanned.has(page.pageNo)) wanted.add(page.pageNo)
    }
  }
  return [...wanted].sort((a, b) => a - b)
}
