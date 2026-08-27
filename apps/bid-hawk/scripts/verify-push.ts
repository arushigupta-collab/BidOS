import { serviceClient } from '../src/lib/ingest/persist'
const db = serviceClient()

const { data: rfps } = await db.from('rfps').select('*')
const r = rfps![0]
console.log('RFP           :', r.title.slice(0, 70))
console.log('tender_ref    :', r.tender_ref)
console.log('bid_due_at    :', r.bid_due_at)
console.log('prebid_due_at :', r.prebid_due_at)
console.log('est_value     :', r.est_value ?? '(null — correctly not invented)')
console.log('routed to     :', r.assigned_manager_id, '·', (r.routing_rationale as { reason: string }).reason)

for (const t of ['rfp_fields', 'eligibility_rows', 'risk_flags', 'work_packages']) {
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq('rfp_id', r.id)
  console.log(`${t.padEnd(16)}: ${count} rows`)
}
const { data: wps } = await db.from('work_packages').select('id, role_id, status, assignee_id').eq('rfp_id', r.id).order('role_id')
for (const w of wps!) {
  const { count: ai } = await db.from('action_items').select('*', { count: 'exact', head: true }).eq('work_package_id', w.id)
  const { count: fm } = await db.from('forms').select('*', { count: 'exact', head: true }).eq('work_package_id', w.id)
  console.log(`  ${w.role_id.padEnd(19)} ${w.status.padEnd(11)} ${(w.assignee_id ?? '—').padEnd(9)} ${ai} items, ${fm} forms`)
}
const { data: flags } = await db.from('risk_flags').select('severity, title, deadline_at').eq('rfp_id', r.id).order('ord')
console.log('\nrisk deadlines shifted with the document:')
for (const f of flags!) console.log(`  [${f.severity}] ${f.title.slice(0,40).padEnd(42)} ${f.deadline_at ?? '—'}`)
