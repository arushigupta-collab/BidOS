/**
 * Driving the pipeline from the browser.
 *
 * The stage list is held here rather than on the server because the screen has to
 * name every step before any of them has run. A reader watching an upload should
 * see what is going to happen, not discover it one row at a time -- an interface
 * that reveals its own length as it goes reads as a process nobody has measured.
 */
import type { CommercialTerms, EligibilityRow, RiskFlag, WorkPackage } from '@/lib/ingest/stages'
import { supabase } from '@/lib/supabase'

export type StageId =
  | 'upload' | 'paginate' | 'vision' | 'locate'
  | 'extract' | 'eligibility' | 'risks' | 'workpackages' | 'summarise' | 'route' | 'deck'

export type StageState = 'waiting' | 'running' | 'done' | 'skipped' | 'failed'

export interface StageSpec {
  id: StageId
  label: string
  /** What it does, in the terms a bid manager would use. */
  detail: string
  /** Named so a reader can see which work was done by a model and which was not. */
  by: 'reading' | 'model' | 'rules'
}

/**
 * The steps the trail shows, which is not every step that runs.
 *
 * `eligibility` is absent deliberately. It still executes -- the summary is
 * written from its rows, and Bid Orchestrator's tender page presents them -- but
 * judging this company against a tender's criteria is no longer something Bid
 * Hawk claims to do, so it is not something Bid Hawk narrates. The verdict
 * belongs to the module where the bid manager who owns the work is looking at it.
 *
 * Nothing else runs unshown. If a step is ever added here that costs money and
 * says nothing, it should go in this list rather than out of sight.
 */
export const STAGES: StageSpec[] = [
  { id: 'upload', label: 'Receive document', detail: 'Accept the file and record its fingerprint', by: 'reading' },
  { id: 'paginate', label: 'Read text layer', detail: 'Extract text page by page', by: 'reading' },
  { id: 'vision', label: 'Read scanned pages', detail: 'Read any page without a text layer as an image', by: 'model' },
  { id: 'locate', label: 'Locate clauses', detail: 'Find the pages that define each term', by: 'rules' },
  { id: 'extract', label: 'Extract terms', detail: 'Fee, EMD, validity, term, PBG, dates', by: 'model' },
  { id: 'risks', label: 'Flag defects', detail: 'Contradictions and unachievable requirements', by: 'model' },
  { id: 'workpackages', label: 'Split the work', detail: 'Action items and forms for each role', by: 'model' },
  { id: 'summarise', label: 'Write summary', detail: 'The brief a bid manager reads first', by: 'model' },
  { id: 'route', label: 'Assign owner', detail: 'Match domain and region to a bid manager', by: 'rules' },
  { id: 'deck', label: 'Draft the proposal', detail: 'Six slides in TCIL branding, from what was read', by: 'model' },
]

export interface StageProgress {
  state: StageState
  ms?: number
  note?: string
}

export interface IngestResults {
  extract?: CommercialTerms
  eligibility?: { rows: EligibilityRow[] }
  risks?: { flags: RiskFlag[] }
  workpackages?: { packages: WorkPackage[] }
  summarise?: { bullets: string[]; condensed: string[] }
}

export interface IngestOutcome {
  rfpId: string
  managerId: string
  shift: number
  results: IngestResults
  /** A one-hour link to the draft deck, or null if drafting it failed. */
  deckUrl: string | null
}

/**
 * Posts to a pipeline endpoint, and refuses to let a non-JSON reply become a
 * parse error.
 *
 * `res.json()` was called unconditionally, so anything that answered with
 * something other than JSON surfaced as a JavaScript error about the first
 * character of the body. That has now happened twice with two different causes
 * and neither message named either: Vercel's plain-text page over a rejected
 * request read as `Unexpected token 'A'`, and an empty 404 from an endpoint the
 * dev server had not registered read as `Unexpected end of JSON input`.
 *
 * Both are ordinary infrastructure answers. The stage row is the only place a
 * reader finds out why a reading stopped, so it gets the status and what the
 * server actually said.
 */
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  let json: (T & { error?: string }) | null = null
  try {
    json = text ? (JSON.parse(text) as T & { error?: string }) : null
  } catch {
    json = null
  }

  if (!json) {
    const detail = text.trim().split('\n')[0]?.slice(0, 120)
    throw new Error(
      res.status === 404
        ? `${path} is not deployed on this server (404). Restart it if the endpoint is new.`
        : `${path} answered ${res.status} with ${detail ? `"${detail}"` : 'an empty body'}`,
    )
  }

  if (!res.ok || json.error) throw new Error(json.error ?? `${path} failed (${res.status})`)
  return json
}

/**
 * Puts the file in storage, and answers with where it went.
 *
 * Straight from the browser to Supabase, never through a function. The document
 * used to be sent as base64 in the body of `/api/ingest/start`, and on Vercel
 * that is impossible: a serverless function's request body is capped at 4.5 MB
 * and base64 costs a third on top, so a 4 MB tender became a 5.34 MB body. The
 * platform rejected it before the handler ran and replied with its own plain-text
 * error page, which this client then tried to parse as JSON -- surfacing as
 * `Unexpected token 'A'` at the very first stage. No plan raises that cap.
 *
 * The upload token is minted server-side and is good for this one path.
 */
async function putInStorage(file: File): Promise<string> {
  const { path, token } = await post<{ path: string; token: string }>(
    '/api/ingest/upload-url',
    { fileName: file.name },
  )

  const client = await supabase()
  if (!client) throw new Error('This build has no workspace connection configured')

  const { error } = await client.storage
    .from('rfp-source')
    .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/pdf' })

  if (error) throw new Error(`${file.name} could not be uploaded: ${error.message}`)
  return path
}

export interface RunOptions {
  onStage: (id: StageId, progress: StageProgress) => void
  signal?: AbortSignal
}

/**
 * Runs the whole pipeline, reporting each stage as it resolves.
 *
 * The three middle stages are issued together because each reads the document
 * rather than the others' output; run in sequence they took over eight minutes,
 * which is longer than anyone will watch. `summarise` genuinely waits, since it
 * writes from the extracted facts rather than from the pages.
 */
export async function runIngest(file: File, options: RunOptions): Promise<IngestOutcome> {
  const { onStage, signal } = options
  const results: IngestResults = {}

  const timed = async <T>(id: StageId, work: () => Promise<T>): Promise<T> => {
    const startedAt = performance.now()
    onStage(id, { state: 'running' })
    try {
      const value = await work()
      onStage(id, { state: 'done', ms: performance.now() - startedAt })
      return value
    } catch (error) {
      onStage(id, { state: 'failed', note: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * Wrapped like every other stage, which it had not been.
   *
   * The stages after this one report their own failure through `timed`; this one
   * set itself running and then awaited a request that could throw. When it did,
   * the row stayed spinning and the screen read as stuck rather than as failed --
   * which is exactly how the first real failure here was reported.
   */
  const started = await timed('upload', async () => {
    const stagingPath = await putInStorage(file)
    return post<{
      documentId: string; fileName: string; pageCount: number
      scannedPages: number[]; visionPages: number[]
    }>('/api/ingest/start', { fileName: file.name, mime: file.type || 'application/pdf', stagingPath })
  })
  onStage('paginate', {
    state: 'done',
    note: `${started.pageCount} pages, ${started.scannedPages.length} without a text layer`,
  })

  // Skipped rather than hidden. A reader should see that the step exists and that
  // this document did not need it, which is also the honest answer to "did it
  // actually read all of this".
  onStage('vision', started.visionPages.length === 0
    ? { state: 'skipped', note: 'every page carries text' }
    : { state: 'done', note: `${started.visionPages.length} page(s) read as images` })

  onStage('locate', { state: 'done', note: 'candidate pages selected per term' })

  const stage = <T>(name: string, prior?: unknown) =>
    post<T>('/api/ingest/stage', { documentId: started.documentId, stage: name, prior })

  results.extract = (await timed('extract', () =>
    stage<{ data: CommercialTerms }>('extract'))).data

  const [eligibility, risks, workpackages] = await Promise.all([
    // Not in STAGES, so `timed` reports it to a row that is not rendered. It
    // still runs: the summary is written from these rows and Bid Orchestrator
    // presents them.
    timed('eligibility', () => stage<{ data: { rows: EligibilityRow[] } }>('eligibility')),
    timed('risks', () => stage<{ data: { flags: RiskFlag[] } }>('risks')),
    timed('workpackages', () => stage<{ data: { packages: WorkPackage[] } }>('workpackages', { extract: results.extract })),
  ])
  results.eligibility = eligibility.data
  results.risks = risks.data
  results.workpackages = workpackages.data

  results.summarise = (await timed('summarise', () =>
    stage<{ data: { bullets: string[]; condensed: string[] } }>('summarise', {
      extract: results.extract, eligibility: results.eligibility, risks: results.risks,
    }))).data

  if (signal?.aborted) throw new Error('Reading was stopped')

  const outcome = await timed('route', () =>
    post<{ rfpId: string; managerId: string; shift: number }>('/api/ingest/finish', {
      documentId: started.documentId,
      fileName: started.fileName,
      pageCount: started.pageCount,
      results,
    }))

  /**
   * Last, and deliberately not fatal.
   *
   * Every stage before this one is a precondition of the tender existing at all,
   * so a failure there has to abandon the reading. This one makes an artefact
   * FROM a tender that already exists and is already routed -- so if the model or
   * the renderer fails, the row it failed on says so and the tender stands.
   */
  let deckUrl: string | null = null
  try {
    const deck = await timed('deck', () =>
      post<{ url: string | null; bytes: number }>('/api/ingest/deck', {
        rfpId: outcome.rfpId,
        terms: results.extract,
        summary: results.summarise,
        packages: results.workpackages?.packages ?? [],
        title: results.extract?.title?.value ?? started.fileName,
        tenderRef: results.extract?.tender_ref?.value ?? null,
        issuingAuthority: results.extract?.issuing_authority?.value ?? null,
      }))
    deckUrl = deck.url
  } catch {
    // `timed` has already marked the row failed with the reason on it.
  }

  return { ...outcome, results, deckUrl }
}
