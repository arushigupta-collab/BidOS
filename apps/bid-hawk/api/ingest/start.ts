/**
 * Accepts the upload and reads its text layer.
 *
 * Runs no model: this is the cheap deterministic half, and separating it means a
 * document that turns out to be unreadable costs nothing to reject.
 */
import { createHash, randomUUID } from 'node:crypto'
import { db, handler, type Req } from '../_shared'
import { loadPdf } from '../../src/lib/ingest/loadPdf'
import { pagesNeedingVision } from '../../src/lib/ingest/pageIndex'

/** Above this, a document is refused rather than silently costing a fortune. */
const MAX_PAGES = 400

export default handler(async (req: Req) => {
  const { fileName, mime, stagingPath } = req.body as {
    fileName: string; mime: string; stagingPath: string
  }
  if (!stagingPath) throw new Error('No file was received')

  const client = db()

  /**
   * The bytes are fetched, not received.
   *
   * They used to arrive as base64 in this request's body, which cannot work on
   * Vercel: a function's body is capped at 4.5 MB and base64 costs a third on top,
   * so the 4 MB hero tender never reached this handler at all. See
   * api/ingest/upload-url.ts.
   */
  const { data: blob, error: downloadError } = await client.storage
    .from('rfp-source')
    .download(stagingPath)
  if (downloadError) throw new Error(`storage: ${downloadError.message}`)

  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (bytes.byteLength === 0) throw new Error('The uploaded file is empty')

  const sha256 = createHash('sha256').update(bytes).digest('hex')

  const { pageCount, pages, scannedPages } = await loadPdf(bytes)
  if (pageCount > MAX_PAGES) {
    await client.storage.from('rfp-source').remove([stagingPath])
    throw new Error(`${pageCount} pages exceeds the ${MAX_PAGES}-page limit for a single reading`)
  }

  /**
   * Keyed on the document's fingerprint, not on a fresh identifier.
   *
   * `sha256` is unique, which is what stops one tender being read into two rows.
   * Minting a new id per upload collided with that instead of replacing the
   * reading: uploading a document the workspace had already read failed on a
   * database constraint, and the screen reported it as the upload being stuck.
   *
   * Re-reading is a legitimate thing to want -- after a prompt change it is the
   * whole point -- so the same bytes reuse the same row and the new reading
   * replaces the old.
   *
   * The same fix was applied to persist.ts, which is the CLI's write path. This
   * is the screen's, and it had been missed.
   */
  const { data: found, error: lookupError } = await client
    .from('rfp_documents').select('id').eq('sha256', sha256).maybeSingle()
  if (lookupError) throw new Error(`rfp_documents: ${lookupError.message}`)

  const documentId = (found?.id as string) ?? randomUUID()

  /**
   * The file itself, kept -- moved from where the browser put it into the place
   * the viewer looks, now that the fingerprint is known.
   *
   * `storage_path` once recorded a location nothing had ever been written to.
   * Every figure this product extracts carries the page it came from, and the
   * whole point of that is a reader being able to look; for an uploaded tender
   * there was nothing to look at, and the viewer fell back to the one document
   * that ships with the build.
   *
   * The destination is removed first because `move` fails onto an existing path,
   * and re-reading the same document is a legitimate thing to want -- after a
   * prompt change it is the whole point.
   */
  const storagePath = `${documentId}.pdf`
  const store = client.storage.from('rfp-source')

  await store.remove([storagePath])
  const { error: moveError } = await store.move(stagingPath, storagePath)
  if (moveError) throw new Error(`storage: ${moveError.message}`)

  const { error: docError } = await client.from('rfp_documents').upsert({
    id: documentId,
    storage_path: storagePath,
    original_name: fileName,
    mime,
    page_count: pageCount,
    sha256,
  }, { onConflict: 'id' })
  if (docError) throw new Error(`rfp_documents: ${docError.message}`)

  // The pages are the previous reading's, and a re-read replaces them rather
  // than interleaving with them.
  if (found) {
    const { error } = await client.from('rfp_pages').delete().eq('document_id', documentId)
    if (error) throw new Error(`rfp_pages: ${error.message}`)
  }

  // Written in batches: a 262-page document is a single statement otherwise, and
  // PostgREST rejects the payload well before the database would.
  const rows = pages.map((p) => ({
    document_id: documentId,
    page_no: p.pageNo,
    text: p.text,
    has_text_layer: p.text.length >= 40,
  }))
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await client.from('rfp_pages').insert(rows.slice(i, i + 50))
    if (error) throw new Error(`rfp_pages: ${error.message}`)
  }

  return {
    documentId,
    fileName,
    pageCount,
    scannedPages,
    visionPages: pagesNeedingVision(pages, scannedPages),
  }
})
