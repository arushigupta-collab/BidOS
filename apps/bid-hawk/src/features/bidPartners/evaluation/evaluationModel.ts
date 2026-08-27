import type { Partner, PartnerInvitation, Tender } from '@/types'
import { formatInr } from '@/lib/format'

export type CriterionId =
  | 'capability'
  | 'technical'
  | 'commercials'
  | 'delivery'
  | 'documentation'

export interface Criterion {
  id: CriterionId
  label: string
  /** What the score is computed from, stated so a screenshot explains itself. */
  basis: string
}

export const CRITERIA: Criterion[] = [
  {
    id: 'capability',
    label: 'Capability fit',
    basis: "overlap with the tender's matched keywords and scope, plus coverage of its region",
  },
  {
    id: 'technical',
    label: 'Technical capability',
    basis:
      'certifications held against those the tender demands, relevant technical stack, and comparable technical scope delivered',
  },
  { id: 'commercials', label: 'Commercials', basis: 'the quote against the lowest quote received' },
  {
    id: 'delivery',
    label: 'Delivery history',
    basis: 'past performance rating, on-time delivery rate and projects delivered',
  },
  { id: 'documentation', label: 'Documentation', basis: 'requested documents received' },
]

export type Weights = Record<CriterionId, number>

/**
 * THE WEIGHTS ARE DELIBERATELY HIDDEN FROM THE INTERFACE, at the client's request.
 *
 * They were four Radix sliders with live figures and a reset control, so a reviewer could
 * see exactly who set the ranking and change it. That was removed on instruction. The
 * weights still drive every composite; they are simply not exposed, and this constant is
 * the one place they live.
 *
 * What replaces them for auditability is the criteria sentence on the comparison page,
 * which names all five in prose. It is now the ONLY thing on the screen answering "on what
 * basis is this the leader", so it must not be removed as well. The split is recorded in
 * docs/decisions.md rather than in the interface.
 *
 * Five criteria summing to exactly 100. Capability fit gives ground to the new Technical
 * capability rather than the commercial and delivery weights absorbing it, because the two
 * are the same question asked twice — what the partner sells, and what it can actually
 * build — and splitting one weight across both is what stops the pair double-counting.
 */
export const DEFAULT_WEIGHTS: Weights = {
  capability: 22,
  technical: 20,
  commercials: 28,
  delivery: 20,
  documentation: 10,
}


/* -------------------------------------------------------------------- scoring */

const clamp = (value: number) => Math.max(0, Math.min(100, value))

/** The terms a tender is about, from its own record. */
function tenderTerms(tender: Tender): string[] {
  return [...tender.matchedKeywords, ...tender.category.split(/[·,]/)]
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 2)
}

function capabilityScore(partner: Partner, tender: Tender) {
  const terms = tenderTerms(tender)
  const haystack = partner.capabilities.join(' ').toLowerCase()
  const matched = terms.filter((term) =>
    term.split(/\s+/).some((word) => word.length > 3 && haystack.includes(word)),
  )
  const overlap = terms.length === 0 ? 0 : matched.length / terms.length

  const region = tender.region.toLowerCase()
  const covered = partner.regions.some(
    (held) =>
      held.toLowerCase() === 'pan-india' ||
      region.includes(held.toLowerCase()) ||
      held.toLowerCase().includes(region),
  )

  return {
    score: clamp(overlap * 70 + (covered ? 30 : 0)),
    raw: `${matched.length} of ${terms.length} terms, ${covered ? 'region covered' : 'region not covered'}`,
    matched,
    regionCovered: covered,
  }
}

/**
 * What the Aaple Sarkar RFP demands technically, taken from its own eligibility snapshot
 * and its scope rather than invented here: CMMI Level 5 for development plus ISO 9001,
 * 20000 and 27001, and a citizen-portal stack.
 *
 * Constants rather than tender fields, because the tender seed is not this pass's to
 * change and all fourteen would need them. Named and in one place, so the day a tender
 * carries its own demanded set this reads from that instead.
 */
const DEMANDED_CERTIFICATIONS = ['CMMI L5', 'ISO 9001', 'ISO 20000', 'ISO 27001']
const DEMANDED_STACK = [
  'Java / Spring Boot',
  'PostgreSQL',
  'Oracle',
  'Kubernetes',
  'API gateway',
  'Android / iOS native',
]

/**
 * DEMONSTRATED ENGINEERING DEPTH, which is a different question from Capability fit.
 *
 * Capability fit asks what the partner sells and where. This asks whether it can build the
 * thing: certifications held against those demanded, how much of the required stack it
 * actually works in, and whether it has delivered comparable technical scope. A partner can
 * sell exactly the right service on exactly the wrong stack at a tenth of the scale, and
 * capability fit cannot see any of that.
 *
 * All three inputs are typed seed data on the partner. Nothing is computed from prose and
 * nothing is randomised, so the figure under the column is auditable.
 */
function technicalScore(partner: Partner) {
  const certs = DEMANDED_CERTIFICATIONS.filter((needed) => partner.certifications.includes(needed))
  const stack = DEMANDED_STACK.filter((needed) => partner.technicalStack.includes(needed))

  const score =
    (certs.length / DEMANDED_CERTIFICATIONS.length) * 45 +
    (stack.length / DEMANDED_STACK.length) * 35 +
    (partner.comparableTechnicalScope ? 20 : 0)

  return {
    score: clamp(score),
    raw: `${certs.length} of ${DEMANDED_CERTIFICATIONS.length} certifications, ${stack.length} of ${DEMANDED_STACK.length} stack, ${partner.comparableTechnicalScope ? 'comparable scope delivered' : 'no comparable scope'}`,
    certifications: certs,
    stack,
  }
}

/**
 * The quote against the lowest quote received.
 *
 * An UNQUOTED partner scores zero here and STAYS IN THE RANKING. It is not ranked as
 * though it quoted worst, and it never appears as the lowest quote: a missing figure is
 * not a cheap one, and defaulting it to zero would read as free. The table renders the
 * absence as a muted dash with no badge and no delta line — a marker saying "unquoted"
 * beside an empty cell was labelling the emptiness twice.
 */
function commercialScore(invitation: PartnerInvitation, lowest: number | null) {
  if (invitation.quotedValueCr === null || invitation.quotedValueCr === undefined) {
    return { score: 0, raw: 'No quote received', unquoted: true }
  }
  if (lowest === null || lowest === 0) {
    return { score: 100, raw: formatInr(invitation.quotedValueCr * 1_00_00_000), unquoted: false }
  }
  return {
    score: clamp((lowest / invitation.quotedValueCr) * 100),
    raw: formatInr(invitation.quotedValueCr * 1_00_00_000),
    unquoted: false,
  }
}

function deliveryScore(partner: Partner) {
  const score =
    (partner.rating / 5) * 40 +
    (partner.onTimeDeliveryPct / 100) * 40 +
    Math.min(partner.projectsDelivered / 60, 1) * 20
  return {
    score: clamp(score),
    raw: `${partner.rating} of 5, ${partner.onTimeDeliveryPct}% on time, ${partner.projectsDelivered} delivered`,
  }
}

function documentationScore(invitation: PartnerInvitation) {
  const received = invitation.documents.filter(
    (doc) => doc.status === 'submitted' || doc.status === 'under-review',
  ).length
  const requested = invitation.documents.length
  return {
    score: requested === 0 ? 0 : clamp((received / requested) * 100),
    raw: `${received} of ${requested} received`,
    received,
    requested,
  }
}

export interface ScoredPartner {
  partner: Partner
  invitation: PartnerInvitation
  scores: Record<CriterionId, { score: number; raw: string }>
  composite: number
  unquoted: boolean
  capability: ReturnType<typeof capabilityScore>
  technical: ReturnType<typeof technicalScore>
  documentation: ReturnType<typeof documentationScore>
}

/** The lowest quote actually received. Unquoted partners are excluded, not treated as 0. */
export function lowestQuote(invitations: PartnerInvitation[]): number | null {
  const quotes = invitations
    .map((row) => row.quotedValueCr)
    .filter((value): value is number => value !== null && value !== undefined)
  return quotes.length === 0 ? null : Math.min(...quotes)
}

/** Only partners who have submitted something can be ranked. See `rankable`. */
export function hasResponded(invitation: PartnerInvitation): boolean {
  return invitation.documents.some(
    (doc) => doc.status === 'submitted' || doc.status === 'under-review',
  )
}

export function rankPartners(
  tender: Tender,
  rows: Array<{ partner: Partner; invitation: PartnerInvitation }>,
  weights: Weights,
): ScoredPartner[] {
  const responded = rows.filter(({ invitation }) => hasResponded(invitation))
  const lowest = lowestQuote(responded.map(({ invitation }) => invitation))

  return responded
    .map(({ partner, invitation }) => {
      const capability = capabilityScore(partner, tender)
      const technical = technicalScore(partner)
      const commercials = commercialScore(invitation, lowest)
      const delivery = deliveryScore(partner)
      const documentation = documentationScore(invitation)

      const scores = {
        capability: { score: capability.score, raw: capability.raw },
        technical: { score: technical.score, raw: technical.raw },
        commercials: { score: commercials.score, raw: commercials.raw },
        delivery: { score: delivery.score, raw: delivery.raw },
        documentation: { score: documentation.score, raw: documentation.raw },
      }

      const composite = CRITERIA.reduce(
        (total, c) => total + (scores[c.id].score * weights[c.id]) / 100,
        0,
      )

      return {
        partner,
        invitation,
        scores,
        composite: Math.round(composite * 10) / 10,
        unquoted: commercials.unquoted,
        capability,
        technical,
        documentation,
      }
    })
    .sort((a, b) => b.composite - a.composite || a.partner.name.localeCompare(b.partner.name))
}

/**
 * The criteria named in prose, with NO FIGURES.
 *
 * This is what remains of the scoring panel after the weights were hidden at the client's
 * request, and it is now the only thing on the comparison page answering "on what basis".
 * It takes no weights argument on purpose: there is no code path from a weight to a
 * rendered number any more, so one cannot be reintroduced by accident.
 */
export function criteriaSentence(): string {
  const labels = CRITERIA.map((c) => c.label.toLowerCase())
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

export interface EvaluationRow {
  tender: Tender
  invited: number
  responded: number
  quotesReceived: number
  lowest: number | null
  highest: number | null
  /**
   * Empty when nothing has been submitted. A tender with invitations out but no
   * documents in is listed and marked, never ranked: an ordering computed from an
   * empty document set is a fabricated ordering.
   */
  ranked: ScoredPartner[]
  rankable: boolean
}

/**
 * One row per tender that has at least one invitation out, which in this build is exactly
 * one: partners work against the fixed Aaple Sarkar tender, because that is the one RFP
 * document the build holds and this screen offers to open it. Serving that PDF from a
 * RailTel or NHAI row would be a visible inconsistency in the place a client is most
 * likely to click.
 *
 * Still written over a set. The narrowing belongs to the seed, not to this function.
 *
 * Rankable and not-yet-rankable rows sit in the same list, because "we have asked but
 * nothing is back" is a state the operator needs to see, not one to hide until it resolves.
 */
export function buildEvaluationList(
  tenders: Tender[],
  invitations: PartnerInvitation[],
  partners: Partner[],
): EvaluationRow[] {
  return tenders
    .map((tender) => {
      const forTender = invitations.filter((row) => row.rfpId === tender.id)
      const rows = forTender.flatMap((invitation) => {
        const partner = partners.find((p) => p.id === invitation.partnerId)
        return partner ? [{ partner, invitation }] : []
      })
      const quotes = forTender
        .map((row) => row.quotedValueCr)
        .filter((value): value is number => value !== null && value !== undefined)
      const ranked = rankPartners(tender, rows, DEFAULT_WEIGHTS)

      return {
        tender,
        invited: forTender.length,
        responded: forTender.filter((row) => hasResponded(row)).length,
        quotesReceived: quotes.length,
        lowest: quotes.length === 0 ? null : Math.min(...quotes),
        highest: quotes.length === 0 ? null : Math.max(...quotes),
        ranked,
        rankable: ranked.length > 0,
      }
    })
    .filter((row) => row.invited > 0)
}
