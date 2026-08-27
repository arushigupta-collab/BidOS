import { useEffect, useMemo } from 'react'
import { useWorkspace } from '@/store/useWorkspace'
import { partnerTenders, isLive } from './partnerTenders'
import type { Tender } from '@/types'

/**
 * What every Bid Partners screen needs before it can draw anything.
 *
 * One hook rather than five copies of the same two effects, because the loads are
 * idempotent but the mistake of omitting one is not: a screen that forgot to load
 * the readings quietly fell back to the seeded fourteen and looked like it was
 * working.
 */
export function usePartnerData(): { tenders: Tender[]; live: boolean; syncError: string | null } {
  const loadUploaded = useWorkspace((state) => state.loadUploaded)
  const loadPartners = useWorkspace((state) => state.loadPartners)
  const uploaded = useWorkspace((state) => state.uploadedTenders)
  const syncError = useWorkspace((state) => state.partnerSyncError)

  useEffect(() => {
    void loadUploaded()
    void loadPartners()
  }, [loadUploaded, loadPartners])

  const tenders = useMemo(() => partnerTenders(uploaded), [uploaded])
  return { tenders, live: isLive(uploaded), syncError }
}
