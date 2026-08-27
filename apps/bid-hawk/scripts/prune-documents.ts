/** Removes ingested documents that never produced an RFP, e.g. an interrupted run. */
import { serviceClient } from '../src/lib/ingest/persist'
const db = serviceClient()
const { data: docs } = await db.from('rfp_documents').select('id, original_name')
const { data: rfps } = await db.from('rfps').select('document_id')
const kept = new Set((rfps ?? []).map((r) => r.document_id))
for (const d of docs ?? []) {
  if (kept.has(d.id)) continue
  await db.from('rfp_documents').delete().eq('id', d.id)
  console.log('pruned orphan document', d.id, d.original_name)
}
console.log(`${kept.size} document(s) with a complete reading remain`)
