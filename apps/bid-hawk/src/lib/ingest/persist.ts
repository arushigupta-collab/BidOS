/**
 * Writing an ingested run into the shared database.
 *
 * This is the seam between the three modules. Bid Hawk writes here once, and Bid
 * Orchestrator and Bid Author only ever read: nothing downstream re-extracts, so
 * every screen in the platform is looking at the same facts with the same page
 * citations behind them.
 *
 * Server-only. It holds the service-role key, which bypasses every policy.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { routeTender } from '../routingEngine.js'
import type { Person, Tender } from '../../types/index.js'
import { parseTenderDate, shiftTenderDates, toIso } from './dates.js'
import type { CommercialTerms, EligibilityRow, RiskFlag, WorkPackage } from './stages.js'

export interface IngestedRun {
  documentId: string
  storagePath: string
  originalName: string
  mime: string
  pageCount: number
  /**
   * The document's fingerprint, or null when the caller did not compute one.
   *
   * Null means "a row for this document already exists and already carries its
   * hash" -- the screen's flow, where `api/ingest/start` stored the file and its
   * fingerprint before any model ran. Writing a placeholder here overwrote a real
   * hash with a UUID, after which the same file no longer matched itself and
   * every re-upload created another row.
   */
  sha256: string | null
  terms: CommercialTerms
  eligibility: EligibilityRow[]
  risks: RiskFlag[]
  summary: { bullets: string[]; condensed: string[] }
  packages: WorkPackage[]
}

export function serviceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Throws with the table name attached, because PostgREST errors alone rarely say where. */
async function must<T>(table: string, op: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await op
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

const val = (c: { value: string | null }) => c.value

/** Applies an already-decided year shift to a date written in tender prose. */
function shiftParsed(text: string | null, shift: number): string | null {
  const parsed = parseTenderDate(text)
  return parsed ? toIso(parsed, parsed.year + shift) : null
}

/**
 * Routes the RFP to a bid manager, then writes everything.
 *
 * Routing reuses `src/lib/routingEngine.ts` unchanged rather than asking a model
 * to choose. It is pure, deterministic and already tested, and "who owns this
 * tender" is a rule the organisation sets rather than a judgement: the same
 * tender must reach the same person every time, and be able to say why.
 */
export async function persistRun(run: IngestedRun, now = new Date()): Promise<{ rfpId: string; managerId: string; shift: number }> {
  const db = serviceClient()

  const managers = await must<Person[]>('users', db
    .from('users').select('id, full_name, email, domains, regions, added_at')
    .eq('role_id', 'bid-manager').order('added_at') as never)

  if (managers.length === 0) throw new Error('no bid managers seeded: run supabase/seed.sql')

  const { shift, dates } = shiftTenderDates(
    {
      bid_due: val(run.terms.bid_due),
      prebid_queries_due: val(run.terms.prebid_queries_due),
      prebid_conference: val(run.terms.prebid_conference),
    },
    'bid_due',
    now,
  )

  const routable = {
    title: val(run.terms.title) ?? run.originalName,
    category: run.terms.industry,
    region: run.terms.region,
  } as unknown as Tender

  const { match } = routeTender(routable, managers.map((m) => ({ ...m, addedAt: (m as never as { added_at: string }).added_at })))

  /**
   * Keyed on the document's fingerprint, not on a fresh identifier.
   *
   * `sha256` is unique, which is what stops the same tender being read twice into
   * two rows. Minting a new id per run collided with it instead of replacing the
   * reading: re-ingesting a document -- after a prompt change, which is exactly
   * when you want to -- failed on a constraint rather than updating.
   *
   * A second reading of the same bytes replaces the first. The extraction may
   * differ; the document has not.
   */
  const byId = await must<{ id: string }[]>('rfp_documents', db
    .from('rfp_documents').select('id').eq('id', run.documentId).limit(1) as never)

  const byHash = run.sha256
    ? await must<{ id: string }[]>('rfp_documents', db
        .from('rfp_documents').select('id').eq('sha256', run.sha256).limit(1) as never)
    : []

  const documentId = byId[0]?.id ?? byHash[0]?.id ?? run.documentId

  // Only written when this call is the one that has the file. Where the document
  // was already stored -- which is every upload through the screen -- its row is
  // left exactly as it is.
  if (byId.length === 0 && run.sha256) {
    await must('rfp_documents', db.from('rfp_documents').upsert({
      id: documentId,
      storage_path: run.storagePath,
      original_name: run.originalName,
      mime: run.mime,
      page_count: run.pageCount,
      sha256: run.sha256,
    }, { onConflict: 'id' }).select('id') as never)
  }

  const [rfp] = await must<{ id: string }[]>('rfps', db.from('rfps').upsert({
    document_id: documentId,
    title: val(run.terms.title) ?? run.originalName,
    tender_ref: val(run.terms.tender_ref),
    issuing_authority: val(run.terms.issuing_authority),
    selection_method: val(run.terms.selection_method),
    tender_fee: val(run.terms.tender_fee),
    emd: val(run.terms.emd),
    bid_due_at: dates.bid_due,
    bid_validity: val(run.terms.bid_validity),
    contract_term: val(run.terms.contract_term),
    pbg: val(run.terms.pbg),
    est_value: val(run.terms.est_value),
    est_value_is_inferred: run.terms.est_value_is_inferred,
    envelopes: val(run.terms.envelopes) ? { text: val(run.terms.envelopes) } : null,
    prebid_due_at: dates.prebid_queries_due,
    prebid_conference: val(run.terms.prebid_conference),
    consortium_allowed: run.terms.consortium_allowed,
    industry: run.terms.industry,
    region: run.terms.region,
    category: run.terms.industry,
    status: 'assigned',
    assigned_manager_id: match.person.id,
    routing_rationale: {
      reason: match.reason,
      confidence: match.confidence,
      matchedDomains: match.matchedDomains,
      matchedRegions: match.matchedRegions,
    },
  }, { onConflict: 'document_id' }).select('id') as never)

  const rfpId = rfp.id

  // Replaced wholesale rather than merged: a re-ingest is a new reading of the
  // document, and half of one reading beside half of another is not a reading.
  for (const table of ['rfp_fields', 'eligibility_rows', 'risk_flags', 'rfp_summary', 'work_packages']) {
    await must(table, db.from(table).delete().eq('rfp_id', rfpId).select('rfp_id') as never)
  }

  const fields = Object.entries(run.terms)
    .filter(([, v]) => typeof v === 'object' && v !== null && 'value' in (v as object))
    .map(([key, v]) => {
      const c = v as { value: string | null; confidence: number; page_no: number | null; quote: string | null }
      return { rfp_id: rfpId, key, value: c.value, confidence: c.confidence, page_no: c.page_no, quote: c.quote }
    })
  await must('rfp_fields', db.from('rfp_fields').insert(fields).select('id') as never)

  await must('rfp_summary', db.from('rfp_summary').insert({
    rfp_id: rfpId, bullets: run.summary.bullets, condensed: run.summary.condensed, model: 'openai/gpt-5',
  }).select('rfp_id') as never)

  await must('eligibility_rows', db.from('eligibility_rows').insert(
    run.eligibility.map((r, i) => ({
      rfp_id: rfpId, ord: i, status: r.status, criterion: r.criterion, note: r.note, page_no: r.page_no,
    })),
  ).select('id') as never)

  if (run.risks.length) {
    await must('risk_flags', db.from('risk_flags').insert(
      run.risks.map((f, i) => ({
        rfp_id: rfpId, ord: i, severity: f.severity, title: f.title, detail: f.detail,
        recommendation: f.recommendation,
        evidence: f.evidence ?? [],
        // Shifted by the DOCUMENT'S shift, not by one computed for this date.
        // A flag saying "raise this before the pre-bid deadline" has to land on
        // the same day as the pre-bid deadline itself; letting each date find its
        // own nearest future year would silently pull them apart.
        deadline_at: shiftParsed(f.deadline, shift),
        page_no: f.page_no,
      })),
    ).select('id') as never)
  }

  for (const pkg of run.packages) {
    const [wp] = await must<{ id: string }[]>('work_packages', db.from('work_packages').insert({
      rfp_id: rfpId, role_id: pkg.role_id, brief: pkg.brief, source_sections: pkg.source_sections,
      // The routed manager owns their own package from the outset; the other five
      // are theirs to assign.
      status: pkg.role_id === 'bid-manager' ? 'assigned' : 'unassigned',
      assignee_id: pkg.role_id === 'bid-manager' ? match.person.id : null,
      assigned_at: pkg.role_id === 'bid-manager' ? now.toISOString() : null,
    }).select('id') as never)

    if (pkg.action_items.length) {
      await must('action_items', db.from('action_items').insert(
        pkg.action_items.map((a, i) => ({
          work_package_id: wp.id, ord: i, text: a.text, ref: a.ref, page_no: a.page_no,
        })),
      ).select('id') as never)
    }
    if (pkg.forms.length) {
      await must('forms', db.from('forms').insert(
        pkg.forms.map((f, i) => ({
          work_package_id: wp.id, ord: i, annexure: f.annexure, title: f.title, kind: f.kind,
          schema: { page_no: f.page_no },
        })),
      ).select('id') as never)
    }
  }

  return { rfpId, managerId: match.person.id, shift }
}
