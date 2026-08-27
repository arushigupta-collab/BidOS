/**
 * The browser's connection to the shared database.
 *
 * Guarded on `__OFFLINE__` throughout, and that guard is load-bearing rather
 * than defensive. The offline target exists because demos get run on machines
 * with no network, from a folder opened by double-click; a build that reaches for
 * a remote host there does not degrade, it hangs. Vite replaces the constant with
 * a literal, so in that build every branch below folds away and the client is
 * dropped from the bundle entirely.
 *
 * Only the anon key appears here. It is meant to be public. The service-role key
 * is server-side and `src/routes/bundleHygiene.test.ts` fails the build if it
 * ever appears in a bundle.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

let pending: Promise<SupabaseClient | null> | null = null

/**
 * The client, or null when there cannot be one.
 *
 * Null is a normal state with two causes and callers must handle both: the
 * offline build, and a hosted build whose environment was never configured.
 * Neither is an error worth showing someone looking at a tender feed -- both
 * simply mean the seeded workspace is all there is.
 *
 * Async because the library is imported dynamically, which is what keeps it out
 * of the initial bundle. An earlier synchronous version of this returned null on
 * the first call and the client only on later ones, so the first read of the feed
 * silently saw no uploaded RFPs.
 */
export function supabase(): Promise<SupabaseClient | null> {
  if (__OFFLINE__) return Promise.resolve(null)
  if (pending) return pending

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    pending = Promise.resolve(null)
    return pending
  }

  pending = import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(url, key, { auth: { persistSession: false } }))
    .catch(() => null)

  return pending
}

/** True when uploaded RFPs can be read at all. */
export function hasDatabase(): boolean {
  return !__OFFLINE__ && Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}
