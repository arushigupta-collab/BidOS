import type { Person, Tender } from '@/types'
import { routeTender, type RoutingMatch } from '@/lib/routingEngine'
import { urgencyFor } from '@/lib/format'

/** A tender with its computed assignment. Assignment is never stored on the record. */
export interface FeedRow {
  tender: Tender
  /** Never null: every RFP has an owner. */
  match: RoutingMatch
}

/**
 * Rows, each with an owner.
 *
 * Two kinds of tender, and they get their owner differently.
 *
 * A SOURCED tender has no stored owner on purpose: assignment is derived from
 * whoever the workspace holds, so it follows the team rather than going stale.
 * With nobody to assign to there is nothing to derive, and it yields no row.
 *
 * A READING was routed once, when it was read, by this same engine against the
 * workspace's bid managers. That decision is a fact about the reading and is
 * passed in rather than recomputed. It also cannot be recomputed here: the
 * workspace's people list starts empty, and an uploaded tender would then have no
 * row at all -- which is exactly what happened. Its own summary page, reached
 * from the upload that had just produced it, reported it as not in this feed.
 *
 * The index is the routing fallback position, so a tender no rule covers lands on
 * the next bid manager in rotation rather than all of them landing on one name.
 */
export function buildFeed(
  tenders: Tender[],
  people: Person[],
  stored?: Map<string, RoutingMatch>,
): FeedRow[] {
  return tenders.flatMap((tender, index) => {
    const assigned = stored?.get(tender.id)
    if (assigned) return [{ tender, match: assigned }]
    if (people.length === 0) return []
    return [{ tender, match: routeTender(tender, people, index).match }]
  })
}

/* ------------------------------------------------------------------ filters */

export type DeadlineWindow = 'any' | '72h' | '7d' | '30d'

export interface FeedFilters {
  sourceId: string | null
  deadline: DeadlineWindow
}

export const NO_FILTERS: FeedFilters = { sourceId: null, deadline: 'any' }

export const DEADLINE_LABELS: Record<DeadlineWindow, string> = {
  any: 'Any deadline',
  '72h': 'Closing in 72h',
  '7d': 'Closing in 7 days',
  '30d': 'Closing in 30 days',
}

const HOUR = 60 * 60 * 1000
const WINDOW_MS: Record<Exclude<DeadlineWindow, 'any'>, number> = {
  '72h': 72 * HOUR,
  '7d': 7 * 24 * HOUR,
  '30d': 30 * 24 * HOUR,
}

export function withinWindow(tender: Tender, window: DeadlineWindow, now = new Date()): boolean {
  if (window === 'any') return true
  const remaining = new Date(tender.bidDueAt).getTime() - now.getTime()
  return remaining >= 0 && remaining <= WINDOW_MS[window]
}

export function applyFilters(rows: FeedRow[], filters: FeedFilters, now = new Date()): FeedRow[] {
  return rows.filter((row) => {
    if (filters.sourceId && row.tender.sourceId !== filters.sourceId) return false
    if (!withinWindow(row.tender, filters.deadline, now)) return false
    return true
  })
}

export function activeFilterCount(filters: FeedFilters): number {
  return (filters.sourceId ? 1 : 0) + (filters.deadline === 'any' ? 0 : 1)
}

/* -------------------------------------------------------------------- stats */

export interface FeedStats {
  total: number
  closingIn7Days: number
  assignedToday: number
  totalValueInr: number
}

export function feedStats(rows: FeedRow[], now = new Date()): FeedStats {
  return {
    total: rows.length,
    closingIn7Days: rows.filter((row) => withinWindow(row.tender, '7d', now)).length,
    // Discovered today: everything found on this shift, all of it routed.
    assignedToday: rows.filter(
      (row) => new Date(row.tender.discoveredAt).toDateString() === now.toDateString(),
    ).length,
    // Tenders publishing no value contribute nothing rather than zero, so the
    // total reads as the value of what is priced rather than as a figure
    // depressed by listings that never carried one.
    totalValueInr: rows.reduce((total, row) => total + (row.tender.estimatedValueInr ?? 0), 0),
  }
}

/** Deadline urgency, reused by the row accent and the countdown tone. */
export function rowUrgency(tender: Tender, now = new Date()) {
  return urgencyFor(tender.bidDueAt, now)
}
