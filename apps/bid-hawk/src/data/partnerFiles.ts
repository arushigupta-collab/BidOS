/**
 * The browser's side of partner file storage.
 *
 * Everything goes through `api/partner-files` rather than the Supabase client
 * directly: the bucket is private and both writing to it and signing a read need
 * the service-role key.
 */
import type { PartnerFile } from './partnersDb'
import { supabase } from '@/lib/supabase'

async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/partner-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error((json.error as string) ?? 'The upload failed')
  return json
}

/**
 * Uploads straight to the bucket, then tells the server it landed.
 *
 * The file used to be sent as base64 through `api/partner-files`, which on Vercel
 * caps it at roughly 3.3 MB whatever the stated limit: a serverless function's
 * request body stops at 4.5 MB and base64 adds a third. A partner's actual
 * technical proposal would have hit the platform's plain-text error page rather
 * than any message this code could write.
 *
 * The size check moved server-side with it, since the browser no longer has the
 * last word on what arrived.
 */
export async function uploadPartnerFile(documentId: string, file: File): Promise<PartnerFile> {
  const { path, token } = (await call({
    op: 'upload-url',
    documentId,
    fileName: file.name,
  })) as unknown as { path: string; token: string }

  const client = await supabase()
  if (!client) throw new Error('This build has no workspace connection configured')

  const { error } = await client.storage
    .from('partner-docs')
    .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/octet-stream' })
  if (error) throw new Error(`${file.name} could not be uploaded: ${error.message}`)

  const json = await call({
    op: 'record',
    documentId,
    storagePath: path,
    fileName: file.name,
    mime: file.type,
  })
  const row = json.file as Record<string, unknown>
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    storagePath: row.storage_path as string,
    originalName: row.original_name as string,
    mime: (row.mime as string) ?? null,
    sizeBytes: Number(row.size_bytes ?? 0),
    uploadedAt: row.uploaded_at as string,
  }
}

export async function signPartnerFile(storagePath: string): Promise<string | null> {
  const json = await call({ op: 'sign', storagePath })
  return (json.url as string) ?? null
}

export async function removePartnerFile(fileId: string): Promise<void> {
  await call({ op: 'remove', fileId })
}

/** Human file size, for a list of attachments. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
