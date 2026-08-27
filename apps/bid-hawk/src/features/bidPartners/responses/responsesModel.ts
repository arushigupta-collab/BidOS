import type { PartnerInvitation, Tender } from '@/types'

/**
 * Partner-level status, DERIVED and never stored. A stored status is one that can
 * disagree with the documents it claims to summarise; a derived one cannot.
 *
 * TWO STATES, plus Overdue as a modifier on the first:
 *   In progress   some documents received, some still outstanding
 *   Complete      every requested document received
 *   Overdue       In progress, past the response deadline
 *
 * There is no "nothing received" state. A partner who has sent nothing is not being
 * tracked, they are being chased, and this screen is for what came back. Every invited
 * partner in the seed therefore has at least one document in, and a hypothetical
 * zero-received invitation derives In progress rather than a third state — the documents
 * are outstanding, which is what In progress means.
 */
export type ResponseStatus = 'in-progress' | 'complete' | 'overdue'

export const STATUS_COPY: Record<ResponseStatus, string> = {
  'in-progress': 'In progress',
  complete: 'Complete',
  overdue: 'Overdue',
}

const received = (invitation: PartnerInvitation) =>
  invitation.documents.filter((doc) => doc.status === 'submitted' || doc.status === 'under-review')
    .length

/**
 * The tracked checklist is the invitation's own document set, not a global list, because
 * two tenders can request different things.
 *
 * KNOWN SEAM: session 3's composer also stores `requestedDocuments`, a longer list of
 * what the covering note asked for. The tracked set is `documents`, which is what the
 * record carries a receipt state for and what the seeded invitations have. Widening the
 * receipt set to arbitrary document names means widening `PartnerDocumentType`, which is
 * outside this session's remit. Recorded in docs/decisions.md for session 5.
 */
export function counts(invitation: PartnerInvitation) {
  return { received: received(invitation), requested: invitation.documents.length }
}

/**
 * Overdue takes precedence over In progress: a partner who is late is late whether they
 * have sent one document or five. It cannot displace Complete, because a partner who has
 * sent everything is not outstanding however late the clock says.
 */
export function statusOf(invitation: PartnerInvitation, now = new Date()): ResponseStatus {
  const { received: got, requested } = counts(invitation)
  if (requested > 0 && got === requested) return 'complete'

  const deadline = invitation.responseDeadline
  if (deadline !== undefined) {
    const due = new Date(`${deadline}T23:59:59`).getTime()
    if (now.getTime() > due) return 'overdue'
  }

  return 'in-progress'
}

/**
 * A reminder target: In progress or Overdue, with documents still to come.
 *
 * This used to mean "not Complete", which was the same set only because a silent partner
 * was also not Complete. With no zero-received state the two readings have converged, but
 * the intent is stated explicitly so a later change to the statuses cannot quietly widen
 * it: what makes a partner worth reminding is an outstanding DOCUMENT, not a status.
 */
export const isOutstanding = (invitation: PartnerInvitation, now = new Date()) =>
  statusOf(invitation, now) !== 'complete' && outstandingDocuments(invitation).length > 0

/** The documents a partner still owes, by name, for a reminder that names them. */
export function outstandingDocuments(invitation: PartnerInvitation): string[] {
  return invitation.documents
    .filter((doc) => doc.status === 'not-submitted' || doc.status === 'rejected')
    .map((doc) => doc.type)
}

/** The most recent receipt on an invitation, or null when nothing has arrived. */
export function lastActivity(invitation: PartnerInvitation): string | null {
  const stamps = invitation.documents
    .map((doc) => doc.submittedAt)
    .filter((at): at is string => at !== null)
  if (stamps.length === 0) return null
  return stamps.sort().at(-1) as string
}

/* ----------------------------------------------------------------- the list rows */

/**
 * NO AGGREGATE DOCUMENT TOTALS. `documentsIn` and `documentsRequested` summed a tender's
 * document receipts across every partner, and fed only the list's deleted "Documents in"
 * column and its deleted completeness bar.
 *
 * `counts(invitation)` is untouched and still exported: it drives the per-partner "4 of 6"
 * figures on the detail rows AND `statusOf`, so removing the aggregate does not weaken
 * either.
 */
export interface TrackerRow {
  tender: Tender
  invitations: PartnerInvitation[]
  invited: number
  /** Partners with at least one document in. */
  responded: number
  /** The deadline set for partners, which is not the tender's own bid due date. */
  responseDeadline: string | null
  overdue: number
  complete: number
}

/**
 * ONLY tenders with at least one invitation, which in this build is exactly one: partners
 * work against the fixed Aaple Sarkar tender, because that is the one RFP document the
 * build holds and both this screen and evaluation offer to open it.
 *
 * Still written over a set rather than a scalar. The narrowing belongs to the seed, not to
 * this function: adding a second invited tender should make a second row appear, not
 * require this to be rewritten.
 */
export function buildTracker(
  tenders: Tender[],
  invitations: PartnerInvitation[],
  now = new Date(),
): TrackerRow[] {
  const byTender = new Map<string, PartnerInvitation[]>()
  for (const row of invitations) {
    byTender.set(row.rfpId, [...(byTender.get(row.rfpId) ?? []), row])
  }

  return [...byTender.entries()]
    .flatMap(([rfpId, rows]) => {
      const tender = tenders.find((t) => t.id === rfpId)
      if (!tender) return []
      const deadlines = rows
        .map((row) => row.responseDeadline)
        .filter((d): d is string => d !== undefined)
        .sort()
      return [
        {
          tender,
          invitations: rows,
          invited: rows.length,
          responded: rows.filter((row) => counts(row).received > 0).length,
          responseDeadline: deadlines[0] ?? null,
          overdue: rows.filter((row) => statusOf(row, now) === 'overdue').length,
          complete: rows.filter((row) => statusOf(row, now) === 'complete').length,
        },
      ]
    })
    .sort((a, b) => {
      // Soonest response deadline first; tenders without one sink to the bottom.
      if (a.responseDeadline === null) return 1
      if (b.responseDeadline === null) return -1
      return a.responseDeadline.localeCompare(b.responseDeadline)
    })
}


