/**
 * The shared database, read-only from this module's point of view except where a
 * bid manager assigns work.
 *
 * Bid Hawk writes every RFP, its citations, its eligibility and its work
 * packages. Nothing here re-extracts anything: the Orchestrator's job starts at
 * the point a reading already exists and has been routed to somebody.
 *
 * Only the anon key appears here, and it is meant to be public.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set')
  }
  client ??= createClient(url, anon, { auth: { persistSession: false } })
  return client
}

export function hasDatabase(): boolean {
  return Boolean(url && anon)
}
