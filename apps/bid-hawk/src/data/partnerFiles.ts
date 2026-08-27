/**
 * The browser's side of partner file storage.
 *
 * Everything goes through `api/partner-files` rather than the Supabase client
 * directly: the bucket is private and both writing to it and signing a read need
 * the service-role key.
 */
import type { PartnerFile } from './partnersDb'

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

function base64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`${file.name} could not be read`))
    // The result is a data URL; only the payload after the comma is base64.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}

export async function uploadPartnerFile(documentId: string, file: File): Promise<PartnerFile> {
  const json = await call({
    op: 'upload',
    documentId,
    fileName: file.name,
    mime: file.type,
    dataBase64: await base64(file),
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
