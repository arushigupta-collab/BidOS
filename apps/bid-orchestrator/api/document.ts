/**
 * A short-lived URL for a stored tender document.
 *
 * The bucket is private -- an uploaded tender is somebody's document, and a
 * public bucket makes it readable by anyone who can guess a path -- so the file
 * cannot be linked to directly. This signs a URL that expires.
 *
 * Server-side because signing needs the service-role key.
 */
import { createClient } from '@supabase/supabase-js'

interface Req { method?: string; body?: unknown }
interface Res { status: (code: number) => Res; json: (body: unknown) => void }

/** Long enough to read a 262-page tender, short enough that a leaked link dies. */
const TTL_SECONDS = 60 * 60

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const { rfpId } = req.body as { rfpId: string }
    const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    const { data: rfp } = await db.from('rfps').select('document_id').eq('id', rfpId).maybeSingle()
    if (!rfp?.document_id) {
      res.status(200).json({ url: null })
      return
    }

    const { data: doc } = await db.from('rfp_documents')
      .select('storage_path, original_name').eq('id', rfp.document_id).maybeSingle()
    if (!doc?.storage_path) {
      res.status(200).json({ url: null })
      return
    }

    const { data, error } = await db.storage
      .from('rfp-source')
      .createSignedUrl(doc.storage_path as string, TTL_SECONDS)

    // Null rather than an error: a reading made before the file was kept has no
    // document to sign, and the viewer says so instead of failing.
    if (error) {
      res.status(200).json({ url: null, name: doc.original_name })
      return
    }
    res.status(200).json({ url: data?.signedUrl ?? null, name: doc.original_name })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
