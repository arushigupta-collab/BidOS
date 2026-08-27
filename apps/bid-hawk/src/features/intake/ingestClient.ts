/**
 * Driving the pipeline from the browser.
 *
 * The stage list is held here rather than on the server because the screen has to
 * name every step before any of them has run. A reader watching an upload should
 * see what is going to happen, not discover it one row at a time -- an interface
 * that reveals its own length as it goes reads as a process nobody has measured.
 */
import type { CommercialTerms, EligibilityRow, RiskFlag, WorkPackage } from '@/lib/ingest/stages'

export type StageId =
  | 'upload' | 'paginate' | 'vision' | 'locate'
  | 'extract' | 'eligibility' | 'risks' | 'workpackages' | 'summarise' | 'route'

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
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as T & { error?: string }
  if (!res.ok || json.error) throw new Error(json.error ?? `${path} failed`)
  return json
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`${file.name} could not be read`))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
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
    const dataBase64 = await toBase64(file)
    return post<{
      documentId: string; fileName: string; pageCount: number
      scannedPages: number[]; visionPages: number[]
    }>('/api/ingest/start', { fileName: file.name, mime: file.type || 'application/pdf', dataBase64 })
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

  return { ...outcome, results }
}
