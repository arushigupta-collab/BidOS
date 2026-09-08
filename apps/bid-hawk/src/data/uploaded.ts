/**
 * Tenders that were read from an uploaded document rather than seeded.
 *
 * Mapped into the SAME `Tender` shape the seeded feed uses, which is the whole
 * design: the table, the filters, the statistics, the summary page, the pager and
 * the routing engine then work on an uploaded tender without knowing it is one.
 * A parallel type would have meant a second version of every one of those.
 *
 * It also enforces the product rule. CLAUDE.md is explicit that the platform must
 * read as one system rather than two products sharing a shell, and a feed where
 * uploaded rows looked or behaved differently would break exactly that.
 */
import type { EligibilityRow, Person, RiskFlag, Tender } from '@/types'
import type { RoutingMatch } from '@/lib/routingEngine'
import { supabase } from '@/lib/supabase'

/** Marks a tender as one this workspace read, for the few places that must know. */
export const UPLOADED_SOURCE_ID = 'uploaded'

/**
 * Which document a tender's "View RFP" should show.
 *
 * A reading shows its own stored file; a seeded tender means the one document
 * that ships with the build, and says so by returning null rather than by the
 * caller omitting an argument.
 *
 * One rule in one place because it was being restated at each call site, and two
 * of the three restated it by forgetting: the partner module's tracker and ranked
 * comparison passed nothing at all, so every tender there opened the bundled
 * Aaple Sarkar PDF -- a plausible document, for the wrong tender, beside page
 * citations pointing into it.
 */
export function documentIdFor(tender: Pick<Tender, 'id' | 'sourceId'>): string | null {
  return tender.sourceId === UPLOADED_SOURCE_ID ? tender.id : null
}

interface RfpRow {
  id: string
  title: string
  tender_ref: string | null
  issuing_authority: string | null
  selection_method: string | null
  tender_fee: string | null
  emd: string | null
  bid_due_at: string | null
  bid_validity: string | null
  contract_term: string | null
  pbg: string | null
  est_value: string | null
  est_value_is_inferred: boolean
  envelopes: { text?: string } | null
  prebid_due_at: string | null
  prebid_conference: string | null
  consortium_allowed: boolean | null
  industry: string | null
  region: string | null
  category: string | null
  assigned_manager_id: string | null
  /** Why Bid Hawk chose that manager, recorded when the reading was routed. */
  routing_rationale: { reason?: string; confidence?: number } | null
  created_at: string
}

/**
 * A rupee figure out of the phrase the document used.
 *
 * Values arrive as the tender wrote them -- "INR 1,00,00,000 /- (Indian Rupees One
 * Crore only)" -- because the extraction contract forbids normalising them. The
 * feed needs a number to sort and total on, so it is parsed here rather than at
 * extraction time, where rewriting the value would have destroyed the quote that
 * makes it checkable.
 *
 * Returns null rather than a guess. Indian digit grouping is handled by stripping
 * separators instead of by locale parsing, which reads 1,00,00,000 as 1.
 */
export function parseInr(text: string | null): number | null {
  if (!text) return null

  const crore = /([\d,.]+)\s*(?:cr\b|crore)/i.exec(text)
  if (crore) {
    const n = Number(crore[1].replace(/,/g, ''))
    if (Number.isFinite(n)) return n * 1_00_00_000
  }

  const lakh = /([\d,.]+)\s*(?:lakh|lac)/i.exec(text)
  if (lakh) {
    const n = Number(lakh[1].replace(/,/g, ''))
    if (Number.isFinite(n)) return n * 1_00_000
  }

  const plain = /(?:inr|rs\.?|₹)\s*([\d,]+)/i.exec(text)
  if (plain) {
    const n = Number(plain[1].replace(/,/g, ''))
    if (Number.isFinite(n)) return n
  }

  /**
   * A bare number, with no currency marker at all.
   *
   * Extraction returns what the document says, and a tender that states its value
   * in a table cell says "116800000" and nothing else. Requiring a marker meant
   * that value read as absent: the feed showed a dash for a tender worth eleven
   * and a half crore, while the other module showed the raw digits, so the two
   * disagreed about the same figure and neither was right.
   *
   * Only a whole string that is nothing but digits and separators. Anything with
   * words in it has already had its chance above, and guessing at a number buried
   * in prose is how a clause reference becomes a rupee amount.
   */
  const bare = /^[\d,]+$/.exec(text.trim())
  if (bare) {
    const n = Number(bare[0].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) return n
  }

  return null
}

interface Loaded {
  rfp: RfpRow
  eligibility: EligibilityRow[]
  riskFlags: RiskFlag[]
  summary: string
}

function toTender(loaded: Loaded): Tender {
  const { rfp } = loaded
  return {
    id: rfp.id,
    title: rfp.title,
    tenderRef: rfp.tender_ref ?? '',
    sourceId: UPLOADED_SOURCE_ID,
    issuingAuthority: rfp.issuing_authority ?? '',
    category: rfp.category ?? rfp.industry ?? '',
    industry: rfp.industry ?? undefined,
    region: rfp.region ?? '',
    estimatedValueInr: parseInr(rfp.est_value),
    emdInr: parseInr(rfp.emd),
    tenderFeeInr: parseInr(rfp.tender_fee),
    tenderType: rfp.envelopes?.text ?? '',
    selectionMethod: rfp.selection_method ?? undefined,
    consortium: rfp.consortium_allowed === null
      ? undefined
      : rfp.consortium_allowed ? 'Allowed' : 'Not allowed',
    contractTerm: rfp.contract_term ?? undefined,
    bidValidity: rfp.bid_validity ?? undefined,
    pbg: rfp.pbg ?? undefined,
    envelopes: rfp.envelopes?.text ?? undefined,
    publishedAt: rfp.created_at,
    discoveredAt: rfp.created_at,
    bidDueAt: rfp.bid_due_at ?? rfp.created_at,
    prebidQueriesDueAt: rfp.prebid_due_at ?? undefined,
    prebidConferenceAt: rfp.prebid_conference ?? undefined,
    aiSummary: loaded.summary,
    // Empty rather than invented. Keywords are the visible proof that SOURCING
    // works, and nothing was sourced here -- the document was handed over.
    matchedKeywords: [],
    valueIsEstimated: rfp.est_value_is_inferred,
    status: 'new',
    eligibility: loaded.eligibility,
    riskFlags: loaded.riskFlags,
  }
}

/**
 * Every completed reading, as tenders.
 *
 * Returns an empty array when there is no database rather than throwing: the
 * offline build and an unconfigured environment are both normal, and in each case
 * the seeded workspace is simply all there is.
 */
export interface UploadedFeed {
  tenders: Tender[]
  /**
   * Every bid manager the workspace holds, from the same records the routing used.
   *
   * Needed because the owner and the alternatives were coming from different
   * places. The owner arrives with the reading; the alternatives were being taken
   * from the local workspace, which starts empty. So a reading showed who owned it
   * and offered nobody to hand it to -- on the screen where handing it over is the
   * one decision available.
   */
  managers: Person[]
  /**
   * The owner each reading was routed to, by RFP id.
   *
   * Carried rather than recomputed, and the distinction is the point. A seeded
   * tender has no stored owner on purpose: assignment is derived from whoever the
   * workspace holds, so it follows the team rather than going stale. A reading
   * was routed once, when it was read, by the same engine against the workspace's
   * bid managers -- and that decision is a fact about the reading, not a view of
   * it.
   *
   * Recomputing it here also could not work. The workspace's people list starts
   * empty, and deriving an owner from an empty list yields nothing: the tender
   * then had no row at all, and its own summary page reported it as not in the
   * feed.
   */
  assignments: Map<string, RoutingMatch>
}

export async function fetchUploadedTenders(): Promise<UploadedFeed> {
  const db = await supabase()
  if (!db) return { tenders: [], assignments: new Map(), managers: [] }

  const { data: rfps, error } = await db
    .from('rfps')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !rfps?.length) return { tenders: [], assignments: new Map(), managers: [] }

  const ids = rfps.map((r) => r.id as string)

  const [eligibility, flags, summaries, managers] = await Promise.all([
    db.from('eligibility_rows').select('*').in('rfp_id', ids).order('ord'),
    db.from('risk_flags').select('*').in('rfp_id', ids).order('ord'),
    db.from('rfp_summary').select('*').in('rfp_id', ids),
    // The whole roster, not only the managers an RFP already points at: the
    // others are exactly who a reader would reassign to.
    db.from('users')
      .select('id, full_name, email, domains, regions, added_at')
      .eq('role_id', 'bid-manager')
      .order('added_at'),
  ])

  const managerById = new Map(
    (managers.data ?? []).map((m) => [
      m.id as string,
      {
        id: m.id as string,
        name: m.full_name as string,
        email: m.email as string,
        domains: (m.domains as string[]) ?? [],
        regions: (m.regions as string[]) ?? [],
        addedAt: (m.added_at as string) ?? new Date().toISOString(),
      } satisfies Person,
    ]),
  )

  const assignments = new Map<string, RoutingMatch>()
  for (const rfp of rfps as RfpRow[]) {
    const person = rfp.assigned_manager_id ? managerById.get(rfp.assigned_manager_id) : undefined
    if (!person) continue
    const rationale = rfp.routing_rationale ?? {}
    assignments.set(rfp.id, {
      person,
      confidence: rationale.confidence ?? 0,
      reason: rationale.reason ?? 'Assigned when the tender was read.',
      matchedDimensions: [],
      matchedDomains: [],
      matchedRegions: [],
    })
  }

  const tenders = (rfps as RfpRow[]).map((rfp) => {
    const rows = (eligibility.data ?? []).filter((e) => e.rfp_id === rfp.id)
    const risks = (flags.data ?? []).filter((f) => f.rfp_id === rfp.id)
    const bullets = (summaries.data ?? []).find((s) => s.rfp_id === rfp.id)?.bullets as string[] | undefined

    return toTender({
      rfp,
      summary: (bullets ?? []).join(' '),
      eligibility: rows.map((e, i) => ({
        id: `${rfp.id}-e${i}`,
        requirement: e.criterion as string,
        status: e.status as EligibilityRow['status'],
        note: (e.note as string) ?? '',
      })),
      riskFlags: risks.map((f, i) => ({
        id: `${rfp.id}-r${i}`,
        severity: f.severity as RiskFlag['severity'],
        title: f.title as string,
        detail: f.detail as string,
        recommendation: (f.recommendation as string) ?? '',
        deadlineNote: f.deadline_at ? new Date(f.deadline_at as string).toLocaleString('en-GB', {
          dateStyle: 'medium', timeStyle: 'short',
        }) : '',
        pageNo: (f.page_no as number) ?? null,
        evidence: ((f.evidence as { page_no?: number; quote?: string }[]) ?? [])
          .filter((e) => e?.quote)
          .map((e) => ({ pageNo: e.page_no ?? null, quote: e.quote as string })),
      })),
    })
  })

  return { tenders, assignments, managers: [...managerById.values()] }
}

/**
 * Records a change of owner on a reading.
 *
 * Reassignment was a `useState` and nothing else: it survived until the next
 * navigation, and Bid Orchestrator -- whose dashboard filters on
 * `assigned_manager_id` -- never learned about it. So the tender stayed in the
 * original manager's queue while Bid Hawk showed it as somebody else's, which is
 * worse than not offering the control.
 *
 * Only a reading can be reassigned. A seeded tender has no row to write to, and
 * its owner is derived from the routing engine on every render by design.
 */
export async function setAssignedManager(rfpId: string, managerId: string): Promise<void> {
  const db = await supabase()
  if (!db) return

  const { error } = await db
    .from('rfps')
    .update({ assigned_manager_id: managerId })
    .eq('id', rfpId)

  if (error) throw new Error(`rfps: ${error.message}`)
}
