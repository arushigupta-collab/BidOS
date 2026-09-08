/**
 * Pre-bid queries: the questions a reading raises back to the buyer.
 *
 * "Raise as pre-bid query" used to resolve after a delay, turn a button green and
 * persist nothing. This is the one output of reading a tender that leaves the
 * building under a deadline, so a record that vanishes on reload is worse than no
 * control at all.
 *
 * Only a reading can raise one. A seeded tender has no row to hang a query on,
 * and there is no buyer to send it to.
 */
import { supabase } from '@/lib/supabase'

export interface PrebidQuery {
  id: string
  rfpId: string
  tenderRef: string | null
  flagTitle: string
  question: string
  severity: 'high' | 'medium' | 'low' | null
  pageNo: number | null
  raisedAt: string
}

interface Row {
  id: string
  rfp_id: string
  tender_ref: string | null
  flag_title: string
  question: string
  severity: PrebidQuery['severity']
  page_no: number | null
  raised_at: string
}

const toQuery = (row: Row): PrebidQuery => ({
  id: row.id,
  rfpId: row.rfp_id,
  tenderRef: row.tender_ref,
  flagTitle: row.flag_title,
  question: row.question,
  severity: row.severity,
  pageNo: row.page_no,
  raisedAt: row.raised_at,
})

/**
 * Records one query, or updates the one already raised for that defect.
 *
 * Keyed on the flag rather than minting a row per press: raising the same defect
 * twice is the same question asked again, not a second question, and a buyer
 * receiving it twice would reasonably ask which one to answer.
 */
export async function raiseQuery(input: {
  rfpId: string
  tenderRef: string | null
  flagTitle: string
  question: string
  severity: PrebidQuery['severity']
  pageNo: number | null
}): Promise<void> {
  const db = await supabase()
  if (!db) throw new Error('This build has no workspace connection configured')

  const { error } = await db.from('prebid_queries').upsert(
    {
      rfp_id: input.rfpId,
      tender_ref: input.tenderRef,
      flag_title: input.flagTitle,
      question: input.question,
      severity: input.severity,
      page_no: input.pageNo,
      raised_at: new Date().toISOString(),
    },
    { onConflict: 'rfp_id,flag_title' },
  )
  if (error) throw new Error(`prebid_queries: ${error.message}`)
}

/** Every query raised on one tender, oldest first: the order they were asked. */
export async function fetchQueries(rfpId: string): Promise<PrebidQuery[]> {
  const db = await supabase()
  if (!db) return []

  const { data, error } = await db
    .from('prebid_queries')
    .select('*')
    .eq('rfp_id', rfpId)
    .order('raised_at')

  if (error) throw new Error(`prebid_queries: ${error.message}`)
  return ((data ?? []) as Row[]).map(toQuery)
}
