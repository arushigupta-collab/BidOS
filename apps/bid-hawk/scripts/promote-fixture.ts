/**
 * Promotes the latest local ingestion run to the committed fixture that
 * heroExtraction.test.ts asserts against.
 *
 *   npm run ingest -- --fresh        re-extract, costs about $0.51
 *   npx tsx scripts/promote-fixture.ts   promote it, then run the tests
 *
 * Deliberately a separate step. The test must never make a model call -- it would
 * be slow, cost money on every CI run, and turn a deterministic assertion into a
 * flaky one -- so the snapshot is committed and the promotion is a decision
 * somebody makes, at which point the tests say whether extraction got worse.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const RUNS = '.ingest'
const OUT = 'src/lib/ingest/__fixtures__/hero-extraction.json'
const STAGES = ['extract', 'eligibility', 'risks', 'summarise', 'workpackages']

const ids = await readdir(RUNS).catch(() => [])
if (ids.length === 0) throw new Error(`no runs under ${RUNS}/. Run: npm run ingest`)
if (ids.length > 1) console.warn(`note: ${ids.length} runs present, using ${ids[0]}`)

const id = ids[0]
const fixture: Record<string, unknown> = { documentId: id, promotedAt: new Date().toISOString() }

for (const stage of STAGES) {
  const raw = await readFile(join(RUNS, id, `${stage}.json`), 'utf8').catch(() => null)
  if (!raw) throw new Error(`stage "${stage}" has not run for ${id}`)
  fixture[stage] = JSON.parse(raw).data
}

await writeFile(OUT, JSON.stringify(fixture, null, 2) + '\n', 'utf8')
console.log(`promoted ${id} → ${OUT}`)
