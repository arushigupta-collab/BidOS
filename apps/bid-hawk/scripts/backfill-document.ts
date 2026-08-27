/**
 * Stores a document for a reading made before files were kept.
 *
 * `api/ingest/start` records the file now, but readings from before that have a
 * `storage_path` pointing at a location nothing was written to. Where the file is
 * still on disk, this puts it where the viewer expects and corrects the path.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-document.ts <pdf> "<title fragment>"
 */
import { readFile } from 'node:fs/promises'
import { serviceClient } from '../src/lib/ingest/persist'

const [file, match] = process.argv.slice(2)
if (!file || !match) throw new Error('Pass a PDF path and a title fragment')

const db = serviceClient()
const { data: rfp } = await db.from('rfps').select('id, title, document_id').ilike('title', `%${match}%`).limit(1).single()
if (!rfp) throw new Error(`No reading matches "${match}"`)

const bytes = new Uint8Array(await readFile(file))
// The layout `start.ts` writes: the document's id, at the bucket root.
const storagePath = `${rfp.document_id}.pdf`

const { error: uploadError } = await db.storage
  .from('rfp-source')
  .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true })
if (uploadError) throw new Error(`storage: ${uploadError.message}`)

const { error } = await db.from('rfp_documents').update({ storage_path: storagePath }).eq('id', rfp.document_id)
if (error) throw new Error(`rfp_documents: ${error.message}`)

console.log(`stored ${(bytes.byteLength / 1e6).toFixed(1)} MB at ${storagePath}`)
console.log(`for: ${String(rfp.title).slice(0, 56)}`)

const { data: signed } = await db.storage.from('rfp-source').createSignedUrl(storagePath, 60)
console.log(`signs: ${signed?.signedUrl ? 'yes' : 'no'}`)
