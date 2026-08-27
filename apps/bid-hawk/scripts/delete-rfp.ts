/**
 * Removes a reading and everything that hangs off it.
 *
 * Every child table cascades from `rfp_documents`, so one delete is enough --
 * but the count is printed first, because a cascade is exactly the kind of
 * delete whose reach is easy to underestimate.
 *
 *   npx tsx --env-file=.env.local scripts/delete-rfp.ts "<title fragment>"
 *   npx tsx --env-file=.env.local scripts/delete-rfp.ts "<title fragment>" --confirm
 */
import { serviceClient } from '../src/lib/ingest/persist'

const match = process.argv[2]
const confirmed = process.argv.includes('--confirm')
if (!match) throw new Error('Pass a title fragment to match')

const db = serviceClient()
const { data: rfps } = await db.from('rfps').select('id, title, document_id').ilike('title', `%${match}%`)

if (!rfps?.length) {
  console.log(`Nothing matches "${match}"`)
  process.exit(0)
}

console.log(`${rfps.length} reading(s) match "${match}":\n`)

for (const rfp of rfps) {
  const { data: wps } = await db.from('work_packages').select('id').eq('rfp_id', rfp.id)
  const wpIds = (wps ?? []).map((w) => w.id as string)

  const counts: Record<string, number | null> = {}
  for (const [table, column, ids] of [
    ['rfp_fields', 'rfp_id', [rfp.id]],
    ['eligibility_rows', 'rfp_id', [rfp.id]],
    ['risk_flags', 'rfp_id', [rfp.id]],
    ['rfp_summary', 'rfp_id', [rfp.id]],
    ['bid_documents', 'rfp_id', [rfp.id]],
    ['work_packages', 'rfp_id', [rfp.id]],
    ['action_items', 'work_package_id', wpIds],
    ['forms', 'work_package_id', wpIds],
    ['responses', 'work_package_id', wpIds],
  ] as [string, string, string[]][]) {
    if (ids.length === 0) { counts[table] = 0; continue }
    const { count } = await db.from(table).select('*', { count: 'exact', head: true }).in(column, ids)
    counts[table] = count
  }
  const { count: pages } = await db.from('rfp_pages').select('*', { count: 'exact', head: true })
    .eq('document_id', rfp.document_id)

  console.log(`  ${String(rfp.title).slice(0, 60)}`)
  console.log(`    rfp ${rfp.id}`)
  console.log(`    ${Object.entries(counts).map(([t, c]) => `${t} ${c}`).join(', ')}, rfp_pages ${pages}`)
}

if (!confirmed) {
  console.log('\nNothing deleted. Re-run with --confirm to remove all of the above.')
  process.exit(0)
}

for (const rfp of rfps) {
  // One delete: every child cascades from the document.
  const { error } = await db.from('rfp_documents').delete().eq('id', rfp.document_id)
  if (error) throw new Error(`rfp_documents: ${error.message}`)
  console.log(`\ndeleted ${String(rfp.title).slice(0, 50)}`)
}

const { count: left } = await db.from('rfps').select('*', { count: 'exact', head: true })
console.log(`\n${left} reading(s) remain.`)
