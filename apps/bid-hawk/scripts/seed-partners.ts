/**
 * Puts the partner roster into the workspace, and makes the bucket their files go in.
 *
 * The roster lives in src/data/seed/partners.ts and is the same list the offline
 * build renders, so there is one roster rather than two that drift. This copies it
 * in; it does not invent anything.
 *
 * Safe to re-run: partners are keyed on their own ids and upserted, so a changed
 * capability or a new partner lands without touching the invitations pointing at
 * the rest.
 *
 *   npx tsx --env-file=.env.local scripts/seed-partners.ts
 */
import { PARTNERS } from '../src/data/seed/partners'
import { serviceClient } from '../src/lib/ingest/persist'

const BUCKET = 'partner-docs'

const db = serviceClient()

const { data: buckets } = await db.storage.listBuckets()
if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
  // Private. A partner's commercial quote is their confidential document, and a
  // public bucket makes it readable by anyone who can guess a path.
  const { error } = await db.storage.createBucket(BUCKET, { public: false })
  if (error) throw new Error(`Could not create the ${BUCKET} bucket: ${error.message}`)
  console.log(`created the ${BUCKET} bucket, private`)
} else {
  console.log(`${BUCKET} bucket already exists`)
}

const { error } = await db.from('partners').upsert(
  PARTNERS.map((partner) => ({
    id: partner.id,
    name: partner.name,
    type: partner.type,
    industry: partner.industry,
    capabilities: partner.capabilities,
    regions: partner.regions,
    team_size: partner.teamSize,
    annual_turnover_cr: partner.annualTurnoverCr,
    certifications: partner.certifications,
    empanelment: partner.empanelment,
    contact_name: partner.contactName,
    contact_email: partner.contactEmail,
    rating: partner.rating,
    projects_delivered: partner.projectsDelivered,
    on_time_delivery_pct: partner.onTimeDeliveryPct,
    history_entries: partner.historyEntries,
    technical_stack: partner.technicalStack,
    comparable_technical_scope: partner.comparableTechnicalScope,
    comparable_scope_note: partner.comparableScopeNote,
    onboarded_at: partner.onboardedAt,
    status: partner.status,
  })),
)
if (error) throw new Error(error.message)

const byIndustry = new Map<string, number>()
for (const partner of PARTNERS) {
  byIndustry.set(partner.industry, (byIndustry.get(partner.industry) ?? 0) + 1)
}

console.log(`stored ${PARTNERS.length} partners`)
for (const [industry, count] of [...byIndustry].sort()) {
  console.log(`  ${String(count).padStart(2)}  ${industry}`)
}
