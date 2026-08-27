/**
 * Shared plumbing for the ingestion endpoints.
 *
 * These run on the server and are the only place the OpenRouter key and the
 * Supabase service-role key are read. Nothing under src/features imports this
 * directory, and src/routes/bundleHygiene.test.ts fails the build if any of it
 * reaches a browser bundle.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '../src/lib/ingest/pageIndex'

export interface Req { method?: string; body?: unknown; query?: Record<string, string | string[]> }
export interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
}

export function db(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured on the server')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Wraps a handler so every endpoint fails the same way.
 *
 * The message is passed through deliberately. These are operator-facing errors
 * on an internal tool -- "the model exhausted its budget on reasoning" is the
 * whole diagnosis, and replacing it with "Internal Server Error" would throw away
 * the only useful thing the failure produced.
 */
export function handler(fn: (req: Req) => Promise<unknown>) {
  return async (req: Req, res: Res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' })
      return
    }
    try {
      res.status(200).json(await fn(req))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      res.status(500).json({ error: message })
    }
  }
}

/** The document's pages, as stored by the paginate step. */
export async function pagesFor(documentId: string): Promise<Page[]> {
  const { data, error } = await db()
    .from('rfp_pages')
    .select('page_no, text')
    .eq('document_id', documentId)
    .order('page_no')

  if (error) throw new Error(`rfp_pages: ${error.message}`)
  if (!data?.length) throw new Error(`no pages stored for document ${documentId}`)
  return data.map((r) => ({ pageNo: r.page_no as number, text: (r.text as string) ?? '' }))
}
