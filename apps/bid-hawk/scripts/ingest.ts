/**
 * The ingestion pipeline, run from the command line.
 *
 *   npm run ingest -- public/rfp/aaple-sarkar-2.0-rfp.pdf
 *   npm run ingest -- <file> --fresh     ignore cached stages and re-run all
 *
 * Every stage's output is written under .ingest/<id>/ before the next begins, so
 * a failure costs only the stage that failed. Re-running resumes from the last
 * completed stage; `--fresh` is the only way to pay twice.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { loadPdf } from '../src/lib/ingest/loadPdf'
import { pagesNeedingVision } from '../src/lib/ingest/pageIndex'
import { COMPANY_PROFILE } from '../src/lib/ingest/companyProfile'
import { shiftTenderDates } from '../src/lib/ingest/dates'
import { LocalStore } from '../src/lib/ingest/store'
import type { ModelCall } from '../src/lib/ingest/openrouter'
import {
  deriveWorkPackages, extractCommercialTerms, extractEligibility, extractRisks, writeSummary,
  type CommercialTerms, type EligibilityRow, type RiskFlag, type WorkPackage,
} from '../src/lib/ingest/stages'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--')) ?? 'public/rfp/aaple-sarkar-2.0-rfp.pdf'
const fresh = args.includes('--fresh')
const push = args.includes('--push')

const t0 = Date.now()
const allCalls: ModelCall[] = []

function log(stage: string, detail: string) {
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6)
  console.log(`${s}s  ${stage.padEnd(13)} ${detail}`)
}

/** Runs a stage, or returns its cached output. The only place stages are cached. */
async function stage<T>(store: LocalStore, name: string, run: () => Promise<{ data: T; calls: ModelCall[] }>): Promise<T> {
  if (!fresh) {
    const cached = await store.read<T>(name)
    if (cached) {
      log(name, `cached (${cached.calls.length} call${cached.calls.length === 1 ? '' : 's'} not repeated)`)
      allCalls.push(...cached.calls)
      return cached.data
    }
  }
  const { data, calls } = await run()
  await store.write(name, data, calls)
  allCalls.push(...calls)
  const tok = calls.reduce((a, c) => a + c.promptTokens + c.completionTokens, 0)
  log(name, `done  ${tok.toLocaleString()} tokens`)
  return data
}

// ---- load ------------------------------------------------------------------

const bytes = new Uint8Array(await readFile(file))
const documentId = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
const store = await LocalStore.open('.ingest', documentId)

log('load', `${basename(file)}  ${(bytes.byteLength / 1e6).toFixed(1)} MB  id=${documentId}`)

const { pageCount, pages, scannedPages } = await loadPdf(bytes)
log('paginate', `${pageCount} pages, ${scannedPages.length} without a text layer`)

const needVision = pagesNeedingVision(pages, scannedPages)
log('vision', needVision.length === 0
  ? 'no pages need it — the document has a usable text layer'
  : `${needVision.length} page(s) to read as images: ${needVision.join(', ')}`)


// ---- the model stages ------------------------------------------------------

/**
 * Everything downstream of `extract` reads the document, not each other, so the
 * three run together. Sequentially this was 8.4 minutes, which is too long to
 * stand in front of a client watching an upload.
 *
 * `summarise` is genuinely last: it writes from the extracted facts rather than
 * from the pages, so it cannot start until they exist.
 */
const terms = await stage<CommercialTerms>(store, 'extract', () => extractCommercialTerms(pages))

const [elig, risks, work] = await Promise.all([
  stage<{ rows: EligibilityRow[] }>(store, 'eligibility', () => extractEligibility(pages, COMPANY_PROFILE)),
  stage<{ flags: RiskFlag[] }>(store, 'risks', () => extractRisks(pages, terms)),
  stage<{ packages: WorkPackage[] }>(store, 'workpackages', () => deriveWorkPackages(pages, terms)),
])

const summary = await stage<{ bullets: string[]; condensed: string[] }>(store, 'summarise',
  () => writeSummary(terms, elig.rows, risks.flags))

// ---- what came out ---------------------------------------------------------

const cited = (label: string, v: { value: string | null; page_no: number | null }) =>
  `  ${label.padEnd(20)} ${v.value ?? '—'}${v.page_no ? `   [p${v.page_no}]` : ''}`

console.log(`\n${'='.repeat(78)}\n${terms.title.value ?? '(untitled)'}\n${'='.repeat(78)}`)
console.log(cited('Tender ref', terms.tender_ref))
console.log(cited('Issuing authority', terms.issuing_authority))
console.log(cited('Selection method', terms.selection_method))
console.log(cited('Tender fee', terms.tender_fee))
console.log(cited('EMD', terms.emd))
console.log(cited('Bid due', terms.bid_due))
{
  const { shift, dates, read } = shiftTenderDates(
    {
      bid_due: terms.bid_due.value,
      prebid_queries_due: terms.prebid_queries_due.value,
      prebid_conference: terms.prebid_conference.value,
    },
    'bid_due',
  )
  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  console.log(`  ${'  → runs live as'.padEnd(20)} ${when(dates.bid_due)}` +
              (shift ? `   (read "${read.bid_due}", year +${shift})` : '   (already live)'))
  console.log(`  ${'  → pre-bid queries'.padEnd(20)} ${when(dates.prebid_queries_due)}`)
  console.log(`  ${'  → pre-bid meeting'.padEnd(20)} ${when(dates.prebid_conference)}`)
}
console.log(cited('Bid validity', terms.bid_validity))
console.log(cited('Contract term', terms.contract_term))
console.log(cited('PBG', terms.pbg))
console.log(cited('Estimated value', terms.est_value), terms.est_value_is_inferred ? '(INFERRED)' : '')
console.log(`  ${'Consortium'.padEnd(20)} ${terms.consortium_allowed === null ? '—' : terms.consortium_allowed ? 'allowed' : 'not allowed'}`)
console.log(`  ${'Routes as'.padEnd(20)} ${terms.industry} / ${terms.region}`)

const tally = { pass: 0, warn: 0, fail: 0 }
for (const r of elig.rows) tally[r.status] += 1
console.log(`\nELIGIBILITY  ${elig.rows.length} criteria — ${tally.pass} pass, ${tally.warn} warn, ${tally.fail} fail`)
for (const r of elig.rows.filter((r) => r.status !== 'pass')) {
  console.log(`  [${r.status.toUpperCase()}] ${r.criterion.slice(0, 88)}`)
  console.log(`         ${r.note.slice(0, 88)}`)
}

console.log(`\nRISK FLAGS  ${risks.flags.length}`)
for (const f of risks.flags) {
  console.log(`  [${f.severity.toUpperCase()}] ${f.title}${f.deadline ? `  (by ${f.deadline})` : ''}${f.page_no ? `  [p${f.page_no}]` : ''}`)
  console.log(`         ${f.detail.slice(0, 100)}`)
}

console.log('\nSUMMARY')
for (const b of summary.bullets) console.log(`  • ${b}`)

console.log(`\nWORK PACKAGES  ${work.packages.length} roles`)
for (const p of work.packages) {
  console.log(`  ${p.role_id.padEnd(19)} ${p.action_items.length} action items, ${p.forms.length} forms`)
}

const tokens = allCalls.reduce((a, c) => a + c.promptTokens + c.completionTokens, 0)
const reasoning = allCalls.reduce((a, c) => a + (c.reasoningTokens ?? 0), 0)
const cost = allCalls.reduce((a, c) => a + c.costUsd, 0)
console.log(`\n${'-'.repeat(78)}`)
console.log(`${allCalls.length} model calls · ${tokens.toLocaleString()} tokens (${reasoning.toLocaleString()} reasoning) · ` +
            `$${cost.toFixed(4)} · ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log(`written to ${store.location}/`)

if (push) {
  const { createHash: h } = await import('node:crypto')
  const { persistRun } = await import('../src/lib/ingest/persist')
  const { rfpId, managerId, shift } = await persistRun({
    documentId: crypto.randomUUID(),
    storagePath: `rfp-source/${basename(file)}`,
    originalName: basename(file),
    mime: 'application/pdf',
    pageCount,
    sha256: h('sha256').update(bytes).digest('hex'),
    terms, eligibility: elig.rows, risks: risks.flags, summary, packages: work.packages,
  })
  console.log(`pushed to Supabase: rfp ${rfpId}, routed to ${managerId}, dates shifted +${shift}y`)
}
