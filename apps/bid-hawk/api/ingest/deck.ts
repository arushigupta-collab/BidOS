/**
 * Drafts the proposal deck, and keeps it.
 *
 * The last stage, and the only one that produces something a person takes out of
 * the product. It runs after the tender has been routed, because until an owner
 * exists there is nobody the draft is for.
 *
 * Failure here does NOT undo the reading. Every other stage is a precondition of
 * the tender existing; this one is an artefact made from a tender that already
 * does. A deck that fails to render should cost the reading nothing, so the
 * client reports the stage as failed and keeps the RFP.
 */
import { db, handler, type Req } from '../_shared.js'
import { buildDeck } from '../../src/lib/ingest/deck.js'
import { writeDeck } from '../../src/lib/ingest/stages.js'
import type { CommercialTerms, WorkPackage } from '../../src/lib/ingest/stages.js'

export const DECK_BUCKET = 'proposals'

export default handler(async (req: Req) => {
  const { rfpId, terms, summary, packages, title, tenderRef, issuingAuthority } = req.body as {
    rfpId: string
    terms: CommercialTerms
    summary: { bullets: string[] }
    packages: WorkPackage[]
    title: string
    tenderRef: string | null
    issuingAuthority: string | null
  }
  if (!rfpId) throw new Error('the deck needs a routed tender')

  const written = await writeDeck(terms, summary, packages)

  /*
   * Checked before rendering, because the renderer's failure on a missing field
   * is a TypeError naming a property, and "Cannot read properties of undefined
   * (reading 'slice')" tells a bid manager nothing about what went wrong.
   *
   * The schema is strict and this should not happen. It did once, on a run whose
   * reasoning overran the budget: the answer parsed and was missing a section.
   */
  const copy = written.data
  const missing = (['requirement', 'approach', 'capability'] as const).filter(
    (key) => !Array.isArray(copy?.[key]) || copy[key].length === 0,
  )
  if (missing.length > 0) {
    throw new Error(`the draft came back without ${missing.join(', ')}. Read it again.`)
  }

  let bytes: Uint8Array
  try {
    bytes = await buildDeck({ copy, terms, title, tenderRef, issuingAuthority })
  } catch (caught) {
    throw new Error(`rendering the deck failed: ${(caught as Error).message}`)
  }

  const client = db()

  /*
   * Created on first use rather than by a migration, because a bucket is not
   * schema and a deployment that has never drafted a deck should not need one.
   */
  const { data: buckets } = await client.storage.listBuckets()
  if (!buckets?.some((b) => b.name === DECK_BUCKET)) {
    await client.storage.createBucket(DECK_BUCKET, { public: false })
  }

  // Keyed on the tender, so re-reading replaces the draft rather than
  // accumulating one deck per attempt.
  const path = `${rfpId}.pptx`
  const { error: uploadError } = await client.storage.from(DECK_BUCKET).upload(path, bytes, {
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    upsert: true,
  })
  if (uploadError) throw new Error(`storage: ${uploadError.message}`)

  const { error: rfpError } = await client.from('rfps').update({ deck_path: path }).eq('id', rfpId)
  if (rfpError) throw new Error(`rfps: ${rfpError.message}`)

  const { data: signed } = await client.storage.from(DECK_BUCKET).createSignedUrl(path, 60 * 60)

  return {
    path,
    url: signed?.signedUrl ?? null,
    bytes: bytes.byteLength,
    calls: written.calls,
  }
})
