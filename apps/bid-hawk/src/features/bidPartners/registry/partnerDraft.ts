import type { Partner, PartnerType } from '@/types'

export const PARTNER_TYPES: PartnerType[] = [
  'System Integrator',
  'OEM',
  'Specialist',
  'Consultant',
  'Manpower',
]

/**
 * The industries a partner can be registered under, and therefore the industries a
 * tender can be routed by. Held here rather than free text: two spellings of the
 * same industry silently split a field of partners in half and nothing on screen
 * would say so.
 */
export const INDUSTRIES = [
  'e-Governance and Citizen Services',
  'Document Management and Digitisation',
  'Healthcare and Public Health',
  'Education and Skilling',
  'Transport and Mobility',
  'Smart City and Urban Infrastructure',
  'Telecom and Connectivity',
  'Energy and Utilities',
] as const

export const CERTIFICATIONS = ['ISO 27001', 'ISO 9001', 'CMMI L3', 'CMMI L5', 'ISO 20000'] as const
export const EMPANELMENTS = ['GeM registered', 'MSE', 'Startup India', 'NSIC'] as const

export interface PartnerDraft {
  name: string
  type: PartnerType
  industry: string
  contactName: string
  contactEmail: string
  capabilities: string[]
  regions: string[]
  teamSize: string
  annualTurnoverCr: string
  certifications: string[]
  empanelment: string[]
}

export const EMPTY_DRAFT: PartnerDraft = {
  name: '',
  type: 'System Integrator',
  industry: INDUSTRIES[0],
  contactName: '',
  contactEmail: '',
  capabilities: [],
  regions: [],
  teamSize: '',
  annualTurnoverCr: '',
  certifications: [],
  empanelment: [],
}

/**
 * A module-level counter restarts at 1 on reload, so a partner created after a reset
 * could take an id a removed one already had. Seeding from the clock makes an id unique
 * for the life of the workspace without pretending to be a real key.
 */
let sequence = 0
export function nextPartnerId(): string {
  sequence += 1
  return `pt-${Date.now().toString(36)}-${sequence}`
}

export function draftFromPartner(partner: Partner): PartnerDraft {
  return {
    name: partner.name,
    type: partner.type,
    industry: partner.industry,
    contactName: partner.contactName,
    contactEmail: partner.contactEmail,
    capabilities: [...partner.capabilities],
    regions: [...partner.regions],
    teamSize: String(partner.teamSize),
    annualTurnoverCr: String(partner.annualTurnoverCr),
    certifications: [...partner.certifications],
    empanelment: [...partner.empanelment],
  }
}

/** A positive integer, stated as the rule rather than as "invalid". */
export function teamSizeProblem(value: string): string | null {
  if (value.trim() === '') return 'Team size is required.'
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return 'Team size is a whole number of people.'
  if (parsed <= 0) return 'Team size is at least one person.'
  return null
}

export function turnoverProblem(value: string): string | null {
  if (value.trim() === '') return 'Annual turnover is required.'
  const parsed = Number(value.replace(/[, ]/g, ''))
  if (!Number.isFinite(parsed)) return 'Annual turnover is a number, in crore.'
  if (parsed < 0) return 'Annual turnover cannot be negative.'
  return null
}

/**
 * The rule is about the PAIR, so the message sits on the pair rather than accusing
 * one field of being empty. Same behaviour as the expertise pair on /team/new.
 */
export function coverageProblem(draft: PartnerDraft): string | null {
  if (draft.capabilities.length === 0 && draft.regions.length === 0) {
    return 'Add at least one capability or one region, so this partner can be matched to work.'
  }
  return null
}

export function partnerFromDraft(draft: PartnerDraft, existing?: Partner): Partner {
  return {
    id: existing?.id ?? nextPartnerId(),
    name: draft.name.trim(),
    type: draft.type,
    industry: draft.industry,
    capabilities: draft.capabilities,
    regions: draft.regions,
    teamSize: Number(draft.teamSize),
    annualTurnoverCr: Number(draft.annualTurnoverCr.replace(/[, ]/g, '')),
    certifications: draft.certifications,
    empanelment: draft.empanelment,
    contactName: draft.contactName.trim(),
    contactEmail: draft.contactEmail.trim(),
    // Registry fields only. Rating, projects delivered and on-time delivery belong to
    // Partner Evaluation and are preserved on an edit rather than invented here.
    rating: existing?.rating ?? 0,
    projectsDelivered: existing?.projectsDelivered ?? 0,
    onTimeDeliveryPct: existing?.onTimeDeliveryPct ?? 0,
    // Prior engagements are not entered by hand on this form. A newly registered
    // partner has none, and an edit must not silently drop the ones it has.
    historyEntries: existing?.historyEntries ?? [],
    // Evaluation's inputs, preserved on an edit and never invented on a create. The form
    // holds registry fields only; a technical profile is an assessment, not a text field.
    technicalStack: existing?.technicalStack ?? [],
    comparableTechnicalScope: existing?.comparableTechnicalScope ?? false,
    comparableScopeNote:
      existing?.comparableScopeNote ?? 'Not assessed. No technical profile on record.',
    onboardedAt: existing?.onboardedAt ?? new Date().toISOString(),
    status: existing?.status ?? 'active',
  }
}
