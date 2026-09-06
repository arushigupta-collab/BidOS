/**
 * A one-shot URL the browser can upload the tender straight to.
 *
 * The document used to travel to `start` as base64 inside the JSON body, and on
 * Vercel that cannot work: a serverless function's request body is capped at
 * 4.5 MB, and base64 inflates a file by a third. The 4 MB hero tender became a
 * 5.34 MB body, so the platform rejected the request before the handler ran and
 * answered with its own plain-text error page -- which the client then tried to
 * parse as JSON, reporting `Unexpected token 'A'`. No plan raises that cap.
 *
 * So the bytes no longer pass through the function at all. The browser uploads to
 * Supabase Storage directly, which has no such limit, and `start` is told only
 * where to find what was uploaded.
 *
 * Signing is server-side because minting an upload token needs the service-role
 * key. The token is good for one upload to one path.
 */
import { randomUUID } from 'node:crypto'
import { db, handler, type Req } from '../_shared.js'

/**
 * Uploads land here first, under a name nobody can guess.
 *
 * Not the final path, because that is keyed on the document's fingerprint and the
 * fingerprint cannot be known until the bytes have arrived. `start` moves the file
 * into place once it has read them.
 */
export const STAGING_PREFIX = 'staging'

export default handler(async (req: Req) => {
  const { fileName } = req.body as { fileName?: string }

  const extension = fileName?.includes('.') ? `.${fileName.split('.').pop()}` : '.pdf'
  const path = `${STAGING_PREFIX}/${randomUUID()}${extension}`

  const { data, error } = await db().storage.from('rfp-source').createSignedUploadUrl(path)
  if (error) throw new Error(`storage: ${error.message}`)

  return { path: data.path, token: data.token }
})
