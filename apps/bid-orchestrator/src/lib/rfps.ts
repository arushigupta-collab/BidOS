/**
 * Everything this module reads about an RFP.
 *
 * Shapes mirror the tables Bid Hawk writes. They are restated here rather than
 * imported because the two apps deploy separately; the schema is the contract
 * between them, and `npx supabase gen types` regenerates both sides from it.
 */
import { supabase } from './supabase'
import { changeRequestError } from './review'

export type EligibilityStatus = 'pass' | 'warn' | 'fail'
export type RiskSeverity = 'high' | 'medium' | 'low'
export type WorkStatus = 'unassigned' | 'assigned' | 'in-progress' | 'submitted'

export type RoleId =
  | 'bid-manager' | 'solution-architect' | 'legal-1' | 'legal-2' | 'finance' | 'delivery'

/** Fixed order, and the order Build Team steps through. */
export const ROLE_ORDER: RoleId[] = [
  'bid-manager', 'solution-architect', 'legal-1', 'legal-2', 'finance', 'delivery',
]

export const ROLE_NAMES: Record<RoleId, string> = {
  'bid-manager': 'Bid Manager',
  'solution-architect': 'Solution Architect',
  'legal-1': 'Legal Counsel 1: General',
  'legal-2': 'Legal Counsel 2: Functional',
  finance: 'Finance Owner',
  delivery: 'Delivery Lead',
}

export interface RfpRow {
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
  prebid_due_at: string | null
  prebid_conference: string | null
  consortium_allowed: boolean | null
  industry: string | null
  region: string | null
  status: string
  /**
   * The unit head's decision, which gates distributing the work.
   *
   * Reading a tender commits nobody. Handing it to six people does, so the
   * decision sits between the two rather than being implied by the first
   * assignment.
   */
  approval: 'pending' | 'accepted' | 'rejected'
  approval_note: string | null
  approval_at: string | null
  assigned_manager_id: string | null
  routing_rationale: { reason?: string; confidence?: number } | null
  document_id: string | null
  created_at: string
}

export interface EligibilityRowRecord {
  ord: number
  status: EligibilityStatus
  criterion: string
  note: string | null
  page_no: number | null
}

export interface RiskFlagRecord {
  ord: number
  severity: RiskSeverity
  title: string
  detail: string
  recommendation: string | null
  deadline_at: string | null
  page_no: number | null
}

export interface FieldRecord {
  key: string
  value: string | null
  page_no: number | null
  quote: string | null
  confidence: number | null
}

export interface ActionItem {
  id: string
  ord: number
  text: string
  ref: string | null
  page_no: number | null
  done: boolean
}

export interface FormRecord {
  id: string
  ord: number
  annexure: string
  title: string
  kind: 'fields' | 'checklist'
  status: string
}

export type ReviewState = 'pending' | 'approved' | 'changes-requested'

export interface WorkPackage {
  id: string
  role_id: RoleId
  brief: string | null
  source_sections: string[]
  status: WorkStatus
  assignee_id: string | null
  submitted_at: string | null
  /**
   * What the bid manager made of it, held apart from `status`.
   *
   * A package that has been handed back and not yet read is a state the work
   * genuinely has, and folding the two together would erase it.
   */
  review: ReviewState
  review_note: string | null
  review_at: string | null
  actionItems: ActionItem[]
  forms: FormRecord[]
}

export interface Candidate {
  id: string
  full_name: string
  initials: string
  title: string | null
  active_bids: number
  capabilities: RoleId[]
}

/** The RFPs routed to one bid manager, soonest deadline first. */
export async function fetchAssigned(managerId: string): Promise<RfpRow[]> {
  const { data, error } = await supabase()
    .from('rfps')
    .select('*')
    .eq('assigned_manager_id', managerId)
    .order('bid_due_at', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as RfpRow[]
}

export interface RfpDetail {
  rfp: RfpRow
  eligibility: EligibilityRowRecord[]
  risks: RiskFlagRecord[]
  fields: FieldRecord[]
  summary: string[]
}

export async function fetchDetail(rfpId: string): Promise<RfpDetail> {
  const db = supabase()
  const [rfp, eligibility, risks, fields, summary] = await Promise.all([
    db.from('rfps').select('*').eq('id', rfpId).single(),
    db.from('eligibility_rows').select('*').eq('rfp_id', rfpId).order('ord'),
    db.from('risk_flags').select('*').eq('rfp_id', rfpId).order('ord'),
    db.from('rfp_fields').select('*').eq('rfp_id', rfpId),
    db.from('rfp_summary').select('bullets').eq('rfp_id', rfpId).maybeSingle(),
  ])

  if (rfp.error) throw new Error(rfp.error.message)

  return {
    rfp: rfp.data as RfpRow,
    eligibility: (eligibility.data ?? []) as EligibilityRowRecord[],
    risks: (risks.data ?? []) as RiskFlagRecord[],
    fields: (fields.data ?? []) as FieldRecord[],
    summary: ((summary.data?.bullets as string[]) ?? []),
  }
}

/** The six packages for one RFP, each with its action items and forms. */
export async function fetchWorkPackages(rfpId: string): Promise<WorkPackage[]> {
  const db = supabase()
  const { data: packages, error } = await db
    .from('work_packages').select('*').eq('rfp_id', rfpId)
  if (error) throw new Error(error.message)

  const ids = (packages ?? []).map((p) => p.id as string)
  if (ids.length === 0) return []

  const [items, forms] = await Promise.all([
    db.from('action_items').select('*').in('work_package_id', ids).order('ord'),
    db.from('forms').select('*').in('work_package_id', ids).order('ord'),
  ])

  return (packages ?? [])
    .map((p) => ({
      ...(p as unknown as WorkPackage),
      actionItems: (items.data ?? []).filter((i) => i.work_package_id === p.id) as ActionItem[],
      forms: (forms.data ?? []).filter((f) => f.work_package_id === p.id) as FormRecord[],
    }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role_id) - ROLE_ORDER.indexOf(b.role_id))
}

/** Everyone who could take a given role, least loaded first. */
export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase()
    .from('users')
    .select('id, full_name, initials, title, active_bids, capabilities')
    .neq('role_id', 'bid-manager')
    .order('active_bids')

  if (error) throw new Error(error.message)
  return (data ?? []) as Candidate[]
}

export async function assign(workPackageId: string, assigneeId: string): Promise<void> {
  const { error } = await supabase()
    .from('work_packages')
    .update({ status: 'assigned', assignee_id: assigneeId, assigned_at: new Date().toISOString() })
    .eq('id', workPackageId)

  if (error) throw new Error(error.message)
}

/**
 * Watches the six packages for one RFP and calls back on every change.
 *
 * This is what makes the hand-off visible. A specialist submitting in Bid Author
 * writes one row; without this the bid manager learns about it by reloading, and
 * a board that only tells the truth when you refresh it is not a board.
 *
 * Returns its own unsubscribe. Realtime is enabled on `work_packages` and
 * `responses` in the schema and nowhere else -- nothing else needs pushing.
 */
export function watchWorkPackages(rfpId: string, onChange: () => void): () => void {
  const channel = supabase()
    .channel(`work:${rfpId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_packages', filter: `rfp_id=eq.${rfpId}` },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void supabase().removeChannel(channel)
  }
}

export interface ResponseRecord {
  id: string
  work_package_id: string
  section_id: string
  title: string
  body: { text: string; ai: boolean }[]
  status: string
}

/** Every specialist's written response for one RFP, for the compiler. */
export async function fetchAllResponses(rfpId: string): Promise<ResponseRecord[]> {
  const db = supabase()
  const { data: packages } = await db.from('work_packages').select('id').eq('rfp_id', rfpId)
  const ids = (packages ?? []).map((p) => p.id as string)
  if (ids.length === 0) return []
  const { data } = await db.from('responses').select('*').in('work_package_id', ids)
  return (data ?? []) as ResponseRecord[]
}

export interface BidSection {
  section_id: string
  title: string
  body: { text: string; ai: boolean }[]
  ord: number
}

export async function fetchBidSections(rfpId: string): Promise<BidSection[]> {
  const { data } = await supabase()
    .from('bid_documents').select('section_id, title, body, ord').eq('rfp_id', rfpId).order('ord')
  return (data ?? []) as BidSection[]
}

export async function saveBidSection(
  rfpId: string, sectionId: string, title: string,
  body: { text: string; ai: boolean }[], ord: number,
): Promise<void> {
  const { error } = await supabase().from('bid_documents').upsert(
    // `kind` is NOT NULL in the schema. Omitting it failed the insert while the
    // section rendered on screen, so the work looked saved and was not.
    { rfp_id: rfpId, section_id: sectionId, title, body, ord, kind: 'authored',
      status: 'In Progress', updated_at: new Date().toISOString() },
    { onConflict: 'rfp_id,section_id' },
  )
  if (error) throw new Error(error.message)
}

export type Approval = 'pending' | 'accepted' | 'rejected'

/** Records the unit head's decision. A rejection carries its reason. */
export async function setApproval(
  rfpId: string,
  approval: Approval,
  note?: string,
  actorName = 'Unit head',
): Promise<void> {
  const { error } = await supabase()
    .from('rfps')
    .update({
      approval,
      approval_note: note ?? null,
      approval_at: approval === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', rfpId)

  if (error) throw new Error(error.message)

  await logEvent({
    rfpId,
    kind: approval === 'accepted' ? 'unit-head-accepted' : 'unit-head-rejected',
    actorName,
    note: note?.trim() || null,
  })
}

/* -------------------------------------------------------------------------- */
/*  Review                                                                    */
/* -------------------------------------------------------------------------- */

export interface FilledValue {
  field_key: string
  value: string | null
  filled_by: 'rfp' | 'profile' | 'ai' | 'human'
  source_page: number | null
  source_quote: string | null
}

export interface SubmittedWork {
  responses: ResponseRecord[]
  values: Record<string, FilledValue[]>
}

/**
 * Everything one specialist actually handed back, for the manager to read.
 *
 * Both halves matter. The prose is the argument and the annexure figures are the
 * commitments it makes; approving one without seeing the other is how a bid ends
 * up promising a turnover it cannot evidence.
 */
export async function fetchSubmitted(pkg: WorkPackage): Promise<SubmittedWork> {
  const db = supabase()
  const formIds = pkg.forms.map((f) => f.id)

  const [responses, values] = await Promise.all([
    db.from('responses').select('*').eq('work_package_id', pkg.id),
    formIds.length
      ? db.from('form_values').select('*').in('form_id', formIds).order('field_key')
      : Promise.resolve({ data: [] as { form_id: string }[] }),
  ])

  const grouped: Record<string, FilledValue[]> = {}
  for (const row of (values.data ?? []) as (FilledValue & { form_id: string })[]) {
    ;(grouped[row.form_id] ??= []).push(row)
  }

  return { responses: (responses.data ?? []) as ResponseRecord[], values: grouped }
}

/** Accepts a specialist's work. Recorded, because the manager signs the bid. */
export async function approveWork(
  pkg: WorkPackage, rfpId: string, reviewer: { id: string; fullName: string }, note?: string,
): Promise<void> {
  const { error } = await supabase()
    .from('work_packages')
    .update({
      review: 'approved',
      review_note: note?.trim() || null,
      review_at: new Date().toISOString(),
      review_by: reviewer.id,
    })
    .eq('id', pkg.id)
  if (error) throw new Error(error.message)

  await logEvent({
    rfpId, roleId: pkg.role_id, kind: 'approved',
    actorName: reviewer.fullName, subject: ROLE_NAMES[pkg.role_id], note: note?.trim() || null,
  })
}

/**
 * Sends a specialist's work back with a reason.
 *
 * `status` returns to in-progress as well as the review flipping, because the
 * package becoming editable again is the actual consequence -- a note the author
 * can read but not act on is a complaint, not a request.
 */
export async function requestChanges(
  pkg: WorkPackage, rfpId: string, reviewer: { id: string; fullName: string }, note: string,
): Promise<void> {
  const refusal = changeRequestError(note)
  if (refusal) throw new Error(refusal)
  const trimmed = note.trim()

  const { error } = await supabase()
    .from('work_packages')
    .update({
      review: 'changes-requested',
      review_note: trimmed,
      review_at: new Date().toISOString(),
      review_by: reviewer.id,
      status: 'in-progress',
      submitted_at: null,
    })
    .eq('id', pkg.id)
  if (error) throw new Error(error.message)

  await logEvent({
    rfpId, roleId: pkg.role_id, kind: 'changes-requested',
    actorName: reviewer.fullName, subject: ROLE_NAMES[pkg.role_id], note: trimmed,
  })
}

/* -------------------------------------------------------------------------- */
/*  The change log                                                            */
/* -------------------------------------------------------------------------- */

export interface BidEvent {
  id: string
  rfp_id: string
  role_id: RoleId | null
  kind: string
  actor_name: string
  subject: string | null
  note: string | null
  at: string
}

/**
 * Appends one line to the log.
 *
 * Never throws outward. A bid must not fail to progress because its diary could
 * not be written -- but the failure is reported, because a log that silently
 * stops recording is worse than no log at all.
 */
export async function logEvent(event: {
  rfpId: string
  kind: string
  actorName: string
  roleId?: RoleId | null
  subject?: string | null
  note?: string | null
}): Promise<void> {
  const { error } = await supabase().from('bid_events').insert({
    rfp_id: event.rfpId,
    role_id: event.roleId ?? null,
    kind: event.kind,
    actor_name: event.actorName,
    subject: event.subject ?? null,
    note: event.note ?? null,
  })
  if (error) console.error('change log write failed:', error.message)
}

/** The whole history of one bid, most recent first. */
export async function fetchEvents(rfpId: string): Promise<BidEvent[]> {
  const { data, error } = await supabase()
    .from('bid_events')
    .select('*')
    .eq('rfp_id', rfpId)
    .order('at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as BidEvent[]
}
