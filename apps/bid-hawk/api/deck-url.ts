/**
 * A fresh link to a tender's draft deck.
 *
 * The link the intake screen shows expires in an hour, which makes the deck an
 * artefact of one sitting. This makes it a property of the tender: the summary
 * page asks for a new link whenever somebody wants the file again.
 *
 * Server-side because the bucket is private and signing needs the service-role
 * key -- the same reason api/document.ts exists for the tender PDF.
 */
import { createClient } from '@supabase/supabase-js'

interface Req { method?: string; body?: unknown }
interface Res { status: (code: number) => Res; json: (body: unknown) => void }

const BUCKET = 'proposals'
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

    const { data: rfp } = await db.from('rfps').select('deck_path').eq('id', rfpId).maybeSingle()
    // Null rather than an error: a tender read before this stage existed simply
    // has no deck, which is a state the screen should describe, not fail on.
    if (!rfp?.deck_path) {
      res.status(200).json({ url: null })
      return
    }

    const { data } = await db.storage.from(BUCKET).createSignedUrl(rfp.deck_path as string, TTL_SECONDS)
    res.status(200).json({ url: data?.signedUrl ?? null })
  } catch (caught) {
    res.status(500).json({ error: (caught as Error).message })
  }
}
