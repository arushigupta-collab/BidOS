/**
 * The files a partner sends back.
 *
 * Private bucket, same reasoning as the tender document: a partner's commercial
 * quote is their confidential document, and a public bucket makes it readable by
 * anyone who can guess a path. Nothing is linked to directly; every read is a
 * signed URL that expires.
 *
 * Server-side because both writing to a private bucket and signing a URL need the
 * service-role key, which never reaches a browser.
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

interface Req { method?: string; body?: unknown }
interface Res { status: (code: number) => Res; json: (body: unknown) => void }

const BUCKET = 'partner-docs'
const TTL_SECONDS = 60 * 60

/** Above this a single file is refused rather than timing out mid-upload. */
const MAX_BYTES = 25 * 1024 * 1024

function client() {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  try {
    const body = req.body as {
      op: 'upload' | 'sign' | 'remove'
      documentId?: string
      fileName?: string
      mime?: string
      dataBase64?: string
      fileId?: string
      storagePath?: string
    }
    const db = client()

    if (body.op === 'upload') {
      const bytes = new Uint8Array(Buffer.from(body.dataBase64 ?? '', 'base64'))
      if (bytes.byteLength === 0) throw new Error('No file was received')
      if (bytes.byteLength > MAX_BYTES) {
        throw new Error(`${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB exceeds the 25 MB limit for one file`)
      }

      /*
       * Stored under a generated id rather than the sender's file name. Two
       * partners both sending "Technical Proposal.pdf" would otherwise overwrite
       * each other, and the second upload would silently replace the first
       * partner's submission. The real name is kept in the row beside it.
       */
      const id = randomUUID()
      const extension = (body.fileName ?? '').includes('.')
        ? `.${(body.fileName ?? '').split('.').pop()}`
        : ''
      const storagePath = `${body.documentId}/${id}${extension}`

      const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(storagePath, bytes, { contentType: body.mime || 'application/octet-stream' })
      if (uploadError) throw new Error(uploadError.message)

      const { data, error } = await db
        .from('partner_files')
        .insert({
          document_id: body.documentId,
          storage_path: storagePath,
          original_name: body.fileName ?? 'file',
          mime: body.mime ?? null,
          size_bytes: bytes.byteLength,
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)

      res.status(200).json({ file: data })
      return
    }

    if (body.op === 'sign') {
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(body.storagePath!, TTL_SECONDS)
      if (error) throw new Error(error.message)
      res.status(200).json({ url: data?.signedUrl ?? null })
      return
    }

    if (body.op === 'remove') {
      const { data: row } = await db
        .from('partner_files').select('storage_path').eq('id', body.fileId!).maybeSingle()
      if (row?.storage_path) await db.storage.from(BUCKET).remove([row.storage_path as string])
      await db.from('partner_files').delete().eq('id', body.fileId!)
      res.status(200).json({ removed: true })
      return
    }

    res.status(400).json({ error: 'Unknown operation' })
  } catch (caught) {
    res.status(500).json({ error: (caught as Error).message })
  }
}
