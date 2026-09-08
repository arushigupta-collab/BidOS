export type EligibilityStatus = 'pass' | 'warn' | 'fail'

export interface EligibilityRow {
  id: string
  requirement: string
  status: EligibilityStatus
  note: string
}

export type RiskSeverity = 'high' | 'medium' | 'low'

/** One verbatim line from the document, with the page it sits on. */
export interface RiskEvidence {
  pageNo: number | null
  quote: string
}

export interface RiskFlag {
  id: string
  title: string
  severity: RiskSeverity
  detail: string
  recommendation: string
  /** Named consequence with a date, e.g. the pre-bid query cut-off. */
  deadlineNote?: string
  /**
   * Where the defect was found.
   *
   * The reading has always recorded these -- `risk_flags.page_no` and the
   * `evidence` column added in migration 0006 -- and the interface dropped both
   * on the way in. So the one screen whose whole claim is "this document
   * contradicts itself" asserted it without saying where, which is the one place
   * a reader has to be able to check.
   *
   * Absent on a seeded tender, which was never read from a document.
   */
  pageNo?: number | null
  evidence?: RiskEvidence[]
}

export type TenderStatus = 'new' | 'reviewing' | 'assigned' | 'accepted' | 'declined'

export interface Tender {
  id: string
  title: string
  tenderRef: string
  sourceId: string
  issuingAuthority: string
  category: string
  /**
   * The industry this tender belongs to, from the reading that produced it.
   *
   * Optional because seeded tenders predate it and carry their scope in
   * `category` instead. Bid Partners routes on it; see partnerTenders.ts.
   */
  industry?: string
  region: string
  /**
   * Null when the tender publishes no value.
   *
   * Common in Indian government procurement, and it must stay distinguishable
   * from zero: the product's rule is that an empty value renders as a muted dash,
   * and a confident "INR 0" against a tender worth crores is worse than a blank.
   */
  estimatedValueInr: number | null
  emdInr: number | null
  tenderFeeInr: number | null
  tenderType: string
  selectionMethod?: string
  consortium?: string
  contractTerm?: string
  bidValidity?: string
  pbg?: string
  envelopes?: string
  publishedAt: string
  discoveredAt: string
  bidDueAt: string
  bidOpeningAt?: string
  prebidQueriesDueAt?: string
  prebidConferenceAt?: string
  /** Bid Hawk's generated précis. Always rendered on the AI wash with attribution. */
  aiSummary: string
  /**
   * The keywords that actually caused this listing to be kept, not the source's
   * whole keyword set. This is the visible proof that sourcing works.
   */
  matchedKeywords: string[]
  /** True where the value is Bid Hawk's inference and the RFP publishes none. */
  valueIsEstimated?: boolean
  status: TenderStatus
  eligibility: EligibilityRow[]
  riskFlags: RiskFlag[]
}

/**
 * Assignment is not stored on a tender. It is computed by the routing engine from
 * whichever people the workspace holds, so it changes when the team changes rather
 * than going stale in seed data.
 */

/**
 * A bid manager. Every person added is one, so the role is a constant rather than
 * a field with a choice behind it.
 *
 * `domains` and `regions` are what a tender is routed against. At least one of the
 * two must be non-empty; either alone is enough.
 */
export interface Person {
  id: string
  name: string
  email: string
  domains: string[]
  regions: string[]
  addedAt: string
}

export const PERSON_ROLE = 'Bid Manager'

/** A suggestion group as seed data declares it, before it reaches TagField. */
export interface TagGroupSeed {
  label: string
  items: readonly string[]
}

export type SourceStatus = 'active' | 'paused'

/**
 * A connected platform. Deliberately small: a platform, the page to read, the
 * identifier the platform knows this workspace by, and the keywords that qualify
 * a listing. No credential, no certificate, no schedule, no health.
 */
export interface Source {
  id: string
  name: string
  /** A platform id from src/data/seed/platforms.ts. */
  platformId: string
  url: string
  registeredId: string
  /**
   * What is held in the vault for this source, never the secret itself. Every
   * source has one: an identifier and a password are both required to add one, so
   * there is no anonymous source.
   */
  credentialLabel: string
  keywords: string[]
  status: SourceStatus
  addedAt: string
}

/* -------------------------------------------------------------- Bid Partners */

export type PartnerType =
  | 'OEM'
  | 'System Integrator'
  | 'Consultant'
  | 'Manpower'
  | 'Specialist'

export type PartnerStatus = 'active' | 'paused'

/**
 * A delivery partner: an organisation this workspace bids alongside.
 *
 * A partner is a peer, not a supplier being procured from. The procurement word for
 * the latter is a banned string in this codebase and is therefore not repeated here,
 * since the rule is verified by grep and a comment naming it would defeat its own
 * check. See the banned-strings list in CLAUDE.md.
 *
 * `capabilities` and `regions` reuse the vocabularies the people screens already
 * use — DOMAIN_EXPERTISE, and REGION_ZONES plus REGION_STATES — so a partner and a
 * bid manager are described in the same terms and can be compared without a
 * translation layer.
 */
/** One prior engagement, for the evaluation history panel. */
export interface PartnerHistoryEntry {
  buyer: string
  year: number
  valueCr: number
  outcome: string
}

export interface Partner {
  id: string
  name: string
  type: PartnerType
  /**
   * The routing axis: which tenders this partner should even be shown.
   *
   * Coarser than `capabilities` and answering a different question. Capabilities
   * are scored against the tender's scope once a partner is in the running;
   * industry decides who is in the running at all. A digitisation bureau and a
   * citizen-services integrator both sell "IT Services", and sending each the
   * other's tender wastes two firms' time and buys the bid desk nothing.
   */
  industry: string
  capabilities: string[]
  regions: string[]
  teamSize: number
  annualTurnoverCr: number
  /** ISO 27001, ISO 9001, CMMI L3, CMMI L5, ISO 20000. */
  certifications: string[]
  /** GeM registered, MSE, Startup India, NSIC. */
  empanelment: string[]
  contactName: string
  contactEmail: string
  /** 0 to 5, one decimal. */
  rating: number
  projectsDelivered: number
  onTimeDeliveryPct: number
  /**
   * Prior engagements, added in session 5 for Partner Evaluation. `rating`,
   * `projectsDelivered` and `onTimeDeliveryPct` already existed and are reused rather
   * than duplicated under the evaluation's own names.
   */
  historyEntries: PartnerHistoryEntry[]
  /**
   * The engineering stack the partner actually works in, added for Partner Evaluation's
   * Technical capability criterion. REAL TYPED SEED DATA, never computed at render time
   * and never randomised: it is scored against what the tender's scope demands, and a
   * figure that changes between renders cannot be audited.
   *
   * Deliberately NOT the same axis as `capabilities`. Capabilities are what a partner
   * sells ("e-Governance", "Smart City"); this is what it builds with ("Java / Spring
   * Boot", "PostgreSQL"). A partner can sell the right thing and build it on the wrong
   * stack, which is exactly the case the two criteria have to be able to disagree about.
   */
  technicalStack: string[]
  /**
   * Whether the partner has delivered work of comparable TECHNICAL shape and scale, as
   * distinct from comparable commercial value. A small firm with an excellent record on
   * two-crore engagements has not delivered a seventy-two-crore integration, and the
   * delivery-history criterion cannot see that difference because its inputs are ratings
   * and percentages.
   */
  comparableTechnicalScope: boolean
  /** What that judgement rests on, shown as the criterion's raw figure. */
  comparableScopeNote: string
  onboardedAt: string
  status: PartnerStatus
}

/**
 * What one requested document is called.
 *
 * A plain string, not a closed union, because the tracked set is now whatever the
 * invitation actually asked for. It was six fixed categories while the covering
 * note asked for twelve specific items -- so "have all the documents arrived" was
 * being answered against a different list from the one that was sent, and a
 * partner could satisfy all six buckets having sent eight of the twelve.
 *
 * The original six survive as SEEDED_DOCUMENT_TYPES, which is what the seeded
 * invitations carry.
 */
export type PartnerDocumentType = string

export const SEEDED_DOCUMENT_TYPES = [
  'Technical proposal',
  'Commercial quote',
  'Company profile',
  'Certifications',
  'Past performance',
  'Compliance undertaking',
] as const

export type PartnerDocumentStatus = 'not-submitted' | 'submitted' | 'under-review' | 'rejected'

export interface PartnerDocument {
  type: PartnerDocumentType
  status: PartnerDocumentStatus
  submittedAt: string | null
  /**
   * What actually arrived, recorded by hand: a file name, the date of a covering
   * email, a caveat. Added in session 4, because a bid desk marking receipts needs
   * somewhere to say WHICH thing it received.
   */
  note?: string
}

export type PartnerInvitationStatus =
  | 'invited'
  | 'acknowledged'
  | 'submitted'
  | 'declined'
  | 'no-response'

/**
 * One partner asked to respond to one RFP.
 *
 * `rfpId` is a tender id from src/data/seed/tenders.ts — the same fourteen Bid Hawk
 * reads. There is one tender seed and there must never be a second, or the platform
 * stops reading as one system.
 */
export type SubmissionChannel = 'email-reply' | 'shared-folder'

export interface PartnerInvitation {
  id: string
  rfpId: string
  partnerId: string
  status: PartnerInvitationStatus
  invitedAt: string
  respondedAt: string | null
  documents: PartnerDocument[]
  /** Null until a commercial quote is actually submitted. */
  quotedValueCr: number | null

  /*
   * Composed at invitation time. Optional because the seeded invitations predate the
   * composer and were never composed through it: a seeded record is one that was sent
   * before this workspace was opened, and inventing a covering note for it would be
   * fabricating a document nobody wrote.
   */

  /** The note actually sent. Editable at compose time, so it is stored, not derived. */
  coveringNote?: string
  /** What the partner was asked to send back. */
  requestedDocuments?: string[]
  /** When the response is due. Always before the tender's own bid due date. */
  responseDeadline?: string
  channel?: SubmissionChannel
  /** Set only when the channel is a shared folder. */
  folderUrl?: string
  /**
   * When a reminder was last recorded against this invitation. Added in session 4.
   * Undefined means none has been sent, which is different from one sent long ago.
   */
  remindedAt?: string

  /**
   * Commercial detail, added in session 5. `quotedValueCr` already existed and carries
   * the figure; these two say when it arrived and what it was caveated with. Null
   * quotedValueCr is a real state - a partner who has not quoted - and is never
   * defaulted to zero, because zero reads as free.
   */
  quotedAt?: string | null
  commercialNote?: string | null
}

/**
 * A recorded decision on one tender. Held with its history, so changing a decision
 * keeps the previous reason and the audit trail is real rather than implied.
 */
export interface PartnerDecision {
  rfpId: string
  /** One or more partners to proceed with. */
  chosenPartnerIds: string[]
  reason: string
  /** Optional note about the partners not chosen. */
  notSelectedNote?: string
  /**
   * Which partner the agent had suggested when the decision was recorded. A plain
   * factual line, not a judgement of the choice.
   */
  suggestedPartnerId: string | null
  recordedAt: string
  /** Previous decisions on this tender, newest first. */
  history: DecisionRecord[]
}

/** One recorded decision without its trail: what a caller supplies and what a trail holds. */
export type DecisionRecord = Omit<PartnerDecision, 'history'>
