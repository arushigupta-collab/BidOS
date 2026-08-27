import type { PartnerDocument, PartnerDocumentType, PartnerInvitation } from '@/types'
import { agoFromNow } from './workspace'

/**
 * Partner invitations against ONE tender: Maharashtra RTS Aaple Sarkar 2.0,
 * MAHAIT/RTS2.0/001/2025/080.
 *
 * ONE TENDER, DELIBERATELY. This build holds exactly one real RFP document, the 262-page
 * Aaple Sarkar PDF, and both the response tracker and Partner Evaluation offer "View RFP".
 * Serving that document from a RailTel or NHAI page would be a visible inconsistency in
 * the one place a client is most likely to click. So partners work against the same fixed
 * tender Bid Hawk anchors on, and no other tender appears in either screen. The tender
 * seed itself is untouched: all fourteen remain, and Bid Hawk still lists them all.
 *
 * `rfpId` is a tender id from tenders.ts. There is one tender seed and there must never be
 * a second: both modules read the same fourteen, which is what makes the platform read as
 * one system rather than two products sharing a shell.
 *
 * Loaded by default alongside the partners, for the same reason — an organisation that
 * has partners has already been asking them for things.
 *
 * EVERY INVITED PARTNER HAS AT LEAST ONE DOCUMENT IN. "Not started" is not a state any
 * more: a partner who has sent nothing is not being tracked, they are being chased, and
 * the tracker is for what came back. The seven cover the full range the two remaining
 * statuses can express — one Complete, four mid-progress, two Overdue — with two
 * unquoted, so the ranked table's dash case is exercised on arrival rather than only in a
 * test.
 */

const ALL_DOCUMENTS: PartnerDocumentType[] = [
  'Technical proposal',
  'Commercial quote',
  'Company profile',
  'Certifications',
  'Past performance',
  'Compliance undertaking',
]

const RFP_ID = 't-mahait-rts2'

/** Past, so the two partners carrying it derive Overdue. */
const DEADLINE_PASSED = agoFromNow(4).slice(0, 10)
/** Ahead, so everyone else derives In progress or Complete on their documents alone. */
const DEADLINE_AHEAD = agoFromNow(-9).slice(0, 10)

/**
 * Builds the six-document set, with the named types submitted and the rest still
 * outstanding. Written this way so a partial set is declared by what came IN, which
 * is how an operator reads the tracker.
 */
function documents(
  submitted: PartnerDocumentType[],
  daysAgo: number,
  overrides: Partial<Record<PartnerDocumentType, PartnerDocument['status']>> = {},
): PartnerDocument[] {
  return ALL_DOCUMENTS.map((type) => {
    const status = overrides[type] ?? (submitted.includes(type) ? 'submitted' : 'not-submitted')
    return {
      type,
      status,
      submittedAt: status === 'not-submitted' ? null : agoFromNow(daysAgo),
    }
  })
}

export const PARTNER_INVITATIONS: PartnerInvitation[] = [
  {
    // COMPLETE. Every requested document in, one still under review, which counts as
    // received: the buyer has it, and reading it is the buyer's job not the partner's.
    id: 'pi-rts2-arkavati',
    rfpId: RFP_ID,
    partnerId: 'pt-arkavati',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(9),
    documents: documents(ALL_DOCUMENTS, 9, { Certifications: 'under-review' }),
    responseDeadline: DEADLINE_AHEAD,
    quotedValueCr: 68.4,
    quotedAt: agoFromNow(9),
    commercialNote: 'Inclusive of GST. Excludes third-party licence uplift beyond year three.',
  },
  {
    // In progress: four of six, the strongest ratings in the set and the weakest balance
    // sheet, which is the case the evaluation has to hold both halves of.
    id: 'pi-rts2-suhrid',
    rfpId: RFP_ID,
    partnerId: 'pt-suhrid',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(12),
    documents: documents(
      ['Technical proposal', 'Commercial quote', 'Company profile', 'Certifications'],
      12,
    ),
    responseDeadline: DEADLINE_AHEAD,
    quotedValueCr: 71.2,
    quotedAt: agoFromNow(12),
    commercialNote: 'Fixed price. Assumes the buyer provides the staging environment.',
  },
  {
    // In progress, and UNQUOTED. Technical documents in, no commercial quote, so there is
    // nothing to price against. A real state: it scores zero on commercials, stays in the
    // ranking, and must never read as the cheapest bid.
    id: 'pi-rts2-nirvaha',
    rfpId: RFP_ID,
    partnerId: 'pt-nirvaha',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(6),
    documents: documents(
      ['Technical proposal', 'Company profile', 'Certifications', 'Past performance'],
      6,
    ),
    responseDeadline: DEADLINE_AHEAD,
    quotedValueCr: null,
    quotedAt: null,
    commercialNote: null,
  },
  {
    // In progress: three of six, deepest delivered technical stack after Arkavati but the
    // weakest capability overlap, which is what makes the two criteria disagree.
    id: 'pi-rts2-vedhika',
    rfpId: RFP_ID,
    partnerId: 'pt-vedhika',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(17),
    documents: documents(['Technical proposal', 'Commercial quote', 'Company profile'], 17),
    responseDeadline: DEADLINE_AHEAD,
    quotedValueCr: 64.9,
    quotedAt: agoFromNow(17),
    commercialNote: 'Hardware at list less 12 per cent. Three years of on-site support included.',
  },
  {
    // OVERDUE. Cheap and weak on delivery history, with a quote far under the others: the
    // combination evaluation has to surface rather than reward.
    id: 'pi-rts2-tarangam',
    rfpId: RFP_ID,
    partnerId: 'pt-tarangam',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(5),
    documents: documents(['Technical proposal', 'Commercial quote', 'Company profile'], 5),
    responseDeadline: DEADLINE_PASSED,
    quotedValueCr: 39.5,
    quotedAt: agoFromNow(5),
    commercialNote: 'Excludes data migration and the O&M term.',
  },
  {
    // OVERDUE, and expensive with it. Three of six in, past the deadline. The commercial
    // quote is among them, because a quoted figure with no quote document behind it would
    // break the seed's own rule that a price exists only where one was submitted.
    id: 'pi-rts2-praneetha',
    rfpId: RFP_ID,
    partnerId: 'pt-praneetha',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(19),
    documents: documents(['Company profile', 'Past performance', 'Commercial quote'], 19),
    responseDeadline: DEADLINE_PASSED,
    quotedValueCr: 76.4,
    quotedAt: agoFromNow(19),
    commercialNote: 'Rate-card based. Scope priced as time and materials rather than fixed.',
  },
  {
    // In progress and UNQUOTED, the second dash case. A two-state regional firm against a
    // Maharashtra tender: a poor fit that responded anyway, which is ordinary.
    id: 'pi-rts2-kaveri',
    rfpId: RFP_ID,
    partnerId: 'pt-kaveri',
    status: 'submitted',
    invitedAt: agoFromNow(21),
    respondedAt: agoFromNow(3),
    documents: documents(['Company profile', 'Compliance undertaking'], 3),
    responseDeadline: DEADLINE_AHEAD,
    quotedValueCr: null,
    quotedAt: null,
    commercialNote: null,
  },
]

/**
 * The tender partners are working against. A single-entry list rather than a scalar, so
 * the tracker and evaluation keep filtering by membership and adding a second tender later
 * stays a one-line change to this file.
 */
export const INVITED_RFP_IDS = [...new Set(PARTNER_INVITATIONS.map((row) => row.rfpId))]
