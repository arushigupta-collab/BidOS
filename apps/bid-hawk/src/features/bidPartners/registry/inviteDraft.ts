import type { Partner, PartnerDocument, PartnerInvitation, SubmissionChannel, Tender } from '@/types'
import { SEEDED_DOCUMENT_TYPES } from '@/types'
import { WORKSPACE } from '@/data/seed/workspace'
import { formatDateTime, formatInr } from '@/lib/format'

const DAY = 24 * 60 * 60 * 1000

/**
 * What a government IT tender normally asks a delivery partner for. A static, sensible
 * list, pre-checked, and deliberately NOT presented as a recommendation: nothing here
 * is derived from the tender, the partner or any model. AI in this module lives in
 * Partner Evaluation only.
 */
export const DEFAULT_DOCUMENTS = [
  'Company profile',
  'GST registration certificate',
  'Certificate of incorporation',
  'Audited financials, last three financial years',
  'ISO certificates',
  'CMMI certificate, where held',
  'Similar work orders or completion certificates',
  'Technical approach note',
  'Indicative commercial quote',
  'Non-blacklisting undertaking',
  'Authorised signatory letter',
  'Government empanelment proof, where held',
] as const

export const CHANNELS: Array<{ value: SubmissionChannel; label: string }> = [
  { value: 'email-reply', label: 'Reply to this email' },
  { value: 'shared-folder', label: 'Upload to a shared folder' },
]

export interface InviteDraft {
  recipientIds: string[]
  coveringNote: string
  documents: string[]
  deadline: string
  channel: SubmissionChannel
  folderUrl: string
}

const iso = (date: Date) => date.toISOString().slice(0, 10)

/**
 * The default response deadline: seven days out, but always before the tender's own bid
 * due date. If seven days would land after it, the midpoint between today and the bid
 * due date is used instead, because a deadline after the bid closes cannot be met and a
 * deadline of "today" leaves no time to respond.
 */
export function defaultDeadline(tender: Tender, now = new Date()): { date: string; shortened: boolean } {
  const bidDue = new Date(tender.bidDueAt)
  const sevenDays = new Date(now.getTime() + 7 * DAY)

  if (sevenDays < bidDue) return { date: iso(sevenDays), shortened: false }

  const midpoint = new Date(now.getTime() + (bidDue.getTime() - now.getTime()) / 2)
  return { date: iso(midpoint), shortened: true }
}

export function deadlineProblem(value: string, tender: Tender, now = new Date()): string | null {
  if (value.trim() === '') return 'A response deadline is required.'
  const chosen = new Date(`${value}T23:59:59`)
  if (Number.isNaN(chosen.getTime())) return 'That is not a date.'
  if (chosen.getTime() < now.getTime()) return 'The deadline is in the past.'
  if (chosen.getTime() >= new Date(tender.bidDueAt).getTime()) {
    return `The deadline must fall before the bid closes on ${formatDateTime(tender.bidDueAt)}.`
  }
  return null
}

/**
 * The covering note, composed from the tender record at open time and editable after.
 * Every fact in it is read from data: the title, the reference, the authority, the bid
 * due date, the tender's own scope line, and the workspace identity from its single
 * seed location. No sentence here is a claim the record does not support.
 */
export function composeNote(tender: Tender, partnerCount: number, deadline: string): string {
  const scope = tender.aiSummary.trim()
  const value = formatInr(tender.estimatedValueInr)

  return [
    `Dear partner,`,
    ``,
    `${WORKSPACE.organisation} is preparing a bid for ${tender.title} (${tender.tenderRef}), issued by ${tender.issuingAuthority}. We would like to work with you on it.`,
    ``,
    scope !== '' ? `Scope, in short: ${scope}` : `Scope is set out in the tender document.`,
    ``,
    `Estimated value is ${value}. Bids close on ${formatDateTime(tender.bidDueAt)}, so we need your response by ${formatDateTime(`${deadline}T18:00:00`)}.`,
    ``,
    `The documents we need from you are listed below. Please send everything that applies to your organisation, and tell us where something does not.`,
    ``,
    `We are approaching ${partnerCount === 1 ? 'you' : `${partnerCount} partners`} on this tender and will confirm the final consortium once responses are in.`,
    ``,
    `Regards,`,
    `Bid management`,
    WORKSPACE.organisation,
  ].join('\n')
}

/** A mailto: escape hatch. Recipients in BCC, the reference in the subject. */
export function mailtoHref(
  tender: Tender,
  recipients: Partner[],
  note: string,
  documents: string[],
  terms?: { deadline: string; channel: SubmissionChannel; folderUrl?: string },
): string {
  // The same invitation the record holds. Without the deadline and the channel an
  // operator using this hatch would send materially different terms from the ones the
  // workspace says were sent.
  const how =
    terms?.channel === 'shared-folder'
      ? `Please upload your response to ${terms.folderUrl ?? 'the folder we will share'}.`
      : 'Please reply to this email with your response.'
  const body = [
    note,
    '',
    'Documents requested:',
    ...documents.map((doc) => `- ${doc}`),
    ...(terms ? ['', `Response deadline: ${formatDateTime(`${terms.deadline}T18:00:00`)}`, how] : []),
  ].join('\n')
  const params = new URLSearchParams({
    bcc: recipients.map((partner) => partner.contactEmail).join(','),
    subject: `Partner invitation: ${tender.title} (${tender.tenderRef})`,
    body,
  })
  // URLSearchParams encodes a space as '+', which a mail client shows literally.
  return `mailto:?${params.toString().replace(/\+/g, '%20')}`
}

/**
 * One tracked document per thing the invitation asked for, all outstanding.
 *
 * It used to be six fixed categories regardless of what was requested, so the
 * tracker answered "is everything in" against a list the partner had never been
 * sent: twelve items were asked for and six buckets were checked. Deriving the
 * set from the request is what makes the completeness check mean anything.
 */
function emptyDocuments(requested: readonly string[]): PartnerDocument[] {
  const types = requested.length > 0 ? requested : SEEDED_DOCUMENT_TYPES
  return types.map((type) => ({ type, status: 'not-submitted', submittedAt: null }))
}

export function invitationsFrom(
  draft: InviteDraft,
  tender: Tender,
  existing: PartnerInvitation[],
  now = new Date(),
): PartnerInvitation[] {
  return draft.recipientIds.map((partnerId) => {
    const prior = existing.find((row) => row.rfpId === tender.id && row.partnerId === partnerId)
    return {
      // The prior id is kept, so an update lands on the same record rather than
      // creating a second one for the same partner and tender.
      id: prior?.id ?? `pi-${tender.id}-${partnerId}`,
      rfpId: tender.id,
      partnerId,
      status: prior?.status ?? 'invited',
      invitedAt: now.toISOString(),
      respondedAt: prior?.respondedAt ?? null,
      documents: prior?.documents ?? emptyDocuments(draft.documents),
      quotedValueCr: prior?.quotedValueCr ?? null,
      coveringNote: draft.coveringNote,
      requestedDocuments: draft.documents,
      responseDeadline: draft.deadline,
      channel: draft.channel,
      ...(draft.channel === 'shared-folder' ? { folderUrl: draft.folderUrl.trim() } : {}),
    }
  })
}
