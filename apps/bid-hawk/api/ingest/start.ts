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
  const { fileName, mime, dataBase64 } = req.body as {
    fileName: string; mime: string; dataBase64: string
  }
  if (!dataBase64) throw new Error('No file was received')

  const bytes = new Uint8Array(Buffer.from(dataBase64, 'base64'))
  const sha256 = createHash('sha256').update(bytes).digest('hex')

  /**
   * The copy the file is stored from, taken BEFORE the parse.
   *
   * pdf.js takes ownership of the typed array it is handed and detaches the
   * underlying buffer, so `bytes` is zero-length the moment `loadPdf` returns.
   * The upload below used `bytes`, which meant every tender uploaded through the
   * screen was stored as a 0-byte file -- while the row beside it looked correct,
   * because both the fingerprint and the page count are taken before the detach.
   *
   * Nothing failed anywhere. The signed URL served an empty PDF with a 200, and
   * the only documents that did work had been put in storage by a script that
   * never calls loadPdf.
   */
  const forStorage = bytes.slice()

  const { pageCount, pages, scannedPages } = await loadPdf(bytes)
  if (pageCount > MAX_PAGES) {
    throw new Error(`${pageCount} pages exceeds the ${MAX_PAGES}-page limit for a single reading`)
  }

  const client = db()

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
   * The file itself, kept.
   *
   * It was not, and `storage_path` recorded a location nothing had ever been
   * written to. Every figure this product extracts carries the page it came from,
   * and the whole point of that is a reader being able to look; for an uploaded
   * tender there was nothing to look at, and the viewer fell back to the one
   * document that ships with the build.
   *
   * Upserted so a re-read of the same bytes replaces rather than fails.
   */
  const storagePath = `${documentId}.pdf`
  const { error: uploadError } = await client.storage
    .from('rfp-source')
    .upload(storagePath, forStorage, { contentType: mime || 'application/pdf', upsert: true })
  if (uploadError) throw new Error(`storage: ${uploadError.message}`)

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
