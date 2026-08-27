import { describe, expect, it } from 'vitest'
import type { PartnerDocument, PartnerInvitation } from '@/types'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { TENDERS } from '@/data/seed/tenders'
import {
  buildTracker,
  counts,
  isOutstanding,
  lastActivity,
  outstandingDocuments,
  statusOf,
} from './responsesModel'

const NOW = new Date('2026-08-20T12:00:00.000Z')

function docs(received: number, total = 4): PartnerDocument[] {
  const types = ['Company profile', 'Certifications', 'Technical proposal', 'Commercial quote'] as const
  return types.slice(0, total).map((type, index) => ({
    type,
    status: index < received ? 'submitted' : 'not-submitted',
    submittedAt: index < received ? `2026-08-1${index}T09:00:00.000Z` : null,
  }))
}

function invitation(over: Partial<PartnerInvitation> = {}): PartnerInvitation {
  return {
    id: 'pi-x',
    rfpId: TENDERS[0].id,
    partnerId: 'pt-x',
    status: 'invited',
    invitedAt: '2026-08-01T09:00:00.000Z',
    respondedAt: null,
    documents: docs(0),
    quotedValueCr: null,
    ...over,
  }
}

describe('Status derivation', () => {
  it('reads In progress, not a third state, when nothing has been received yet', () => {
    // There is no zero-received state any more. A partner with nothing in still owes every
    // document, which is what In progress means; the seed has none of these, but the
    // derivation must not fall through to a state that no longer exists.
    expect(statusOf(invitation({ documents: docs(0) }), NOW)).toBe('in-progress')
  })

  it('reads In progress when some are in and some are not', () => {
    expect(statusOf(invitation({ documents: docs(2) }), NOW)).toBe('in-progress')
  })

  it('reads Complete when every requested document is in', () => {
    expect(statusOf(invitation({ documents: docs(4) }), NOW)).toBe('complete')
  })

  it('reads Overdue past the response deadline with anything outstanding', () => {
    const late = invitation({ documents: docs(1), responseDeadline: '2026-08-10' })
    expect(statusOf(late, NOW)).toBe('overdue')
  })

  it('gives Overdue precedence over In progress whatever has arrived', () => {
    const partly = invitation({ documents: docs(3), responseDeadline: '2026-08-10' })
    const nothing = invitation({ documents: docs(0), responseDeadline: '2026-08-10' })
    expect(statusOf(partly, NOW)).toBe('overdue')
    expect(statusOf(nothing, NOW)).toBe('overdue')
  })

  it('does not let Overdue displace Complete', () => {
    // A partner who sent everything is not outstanding, however late the clock says.
    const done = invitation({ documents: docs(4), responseDeadline: '2026-08-10' })
    expect(statusOf(done, NOW)).toBe('complete')
    expect(isOutstanding(done, NOW)).toBe(false)
  })

  it('is not overdue before the deadline passes', () => {
    const soon = invitation({ documents: docs(1), responseDeadline: '2026-08-25' })
    expect(statusOf(soon, NOW)).toBe('in-progress')
  })

  it('is never overdue when no response deadline was set', () => {
    expect(statusOf(invitation({ documents: docs(1) }), NOW)).toBe('in-progress')
  })

  it('counts a document under review as received, and a rejected one as outstanding', () => {
    const mixed = invitation({
      documents: [
        { type: 'Company profile', status: 'under-review', submittedAt: '2026-08-11T09:00:00.000Z' },
        { type: 'Certifications', status: 'rejected', submittedAt: '2026-08-12T09:00:00.000Z' },
      ],
    })
    expect(counts(mixed)).toEqual({ received: 1, requested: 2 })
    expect(outstandingDocuments(mixed)).toEqual(['Certifications'])
  })
})

describe('Counts against the underlying records', () => {
  it('matches every seeded invitation document by document', () => {
    for (const row of PARTNER_INVITATIONS) {
      const { received, requested } = counts(row)
      const actual = row.documents.filter(
        (doc) => doc.status === 'submitted' || doc.status === 'under-review',
      ).length
      expect(received, row.id).toBe(actual)
      expect(requested, row.id).toBe(row.documents.length)
      expect(received).toBeLessThanOrEqual(requested)
    }
  })

  it('reports the latest receipt as last activity, and null when there is none', () => {
    expect(lastActivity(invitation({ documents: docs(0) }))).toBeNull()
    expect(lastActivity(invitation({ documents: docs(3) }))).toBe('2026-08-12T09:00:00.000Z')
  })

  it('rolls partner counts up from the invitations they contain, and no document totals', () => {
    const rows = buildTracker(TENDERS, PARTNER_INVITATIONS, NOW)

    for (const row of rows) {
      expect(row.invited).toBe(row.invitations.length)
      expect(row.responded).toBe(
        row.invitations.filter((i) => counts(i).received > 0).length,
      )
      expect(row.responded).toBeLessThanOrEqual(row.invited)

      // NO AGGREGATE DOCUMENT TOTALS on the row. They fed the list's deleted "Documents in"
      // column and its deleted completeness bar, and nothing replaces them.
      expect(row).not.toHaveProperty('documentsIn')
      expect(row).not.toHaveProperty('documentsRequested')
    }

    // `counts` itself is untouched and still per-partner, because it also drives statusOf.
    for (const invitation of PARTNER_INVITATIONS) {
      const { received, requested } = counts(invitation)
      expect(requested).toBe(invitation.documents.length)
      expect(received).toBeGreaterThan(0)
    }

    // Every row's totals reconcile to its own invitations. The four-stat summary that
    // used to be asserted here is gone from the screen, so its helper went with it.
    expect(rows.reduce((t, r) => t + r.invited, 0)).toBe(PARTNER_INVITATIONS.length)
  })

  it('lists only tenders with at least one invitation', () => {
    const rows = buildTracker(TENDERS, PARTNER_INVITATIONS, NOW)

    // ONE from seed, out of fourteen tenders: partners work against the fixed Aaple
    // Sarkar tender, because that is the one RFP document this build holds and both this
    // screen and evaluation offer to open it.
    expect(rows).toHaveLength(1)
    expect(rows[0].tender.tenderRef).toBe('MAHAIT/RTS2.0/001/2025/080')
    expect(TENDERS).toHaveLength(14)
    for (const row of rows) {
      expect(row.invitations.length).toBeGreaterThan(0)
    }
    // And nothing that has no invitations sneaks in.
    const invited = new Set(PARTNER_INVITATIONS.map((i) => i.rfpId))
    expect(rows.every((row) => invited.has(row.tender.id))).toBe(true)
  })
})
