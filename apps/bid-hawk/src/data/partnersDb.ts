/**
 * Bid Partners' half of the shared database.
 *
 * The module's screens were written against a browser-memory store and stay that
 * way: this hydrates that store from Supabase on load and writes through on every
 * mutation. Rewriting five screens to await their own reads would have changed
 * every one of them to change none of what they show.
 *
 * Guarded on a null client throughout, like every other read in this app. The
 * offline build and an unconfigured environment are both normal, and in each the
 * seeded partner network is simply all there is.
 */
import type {
  Partner, PartnerDecision, PartnerDocument, PartnerDocumentStatus, PartnerDocumentType,
  PartnerInvitation, PartnerInvitationStatus, SubmissionChannel,
} from '@/types'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ reading */

interface PartnerRow {
  id: string; name: string; type: string; industry: string
  capabilities: string[]; regions: string[]
  team_size: number; annual_turnover_cr: number
  certifications: string[]; empanelment: string[]
  contact_name: string; contact_email: string
  rating: number; projects_delivered: number; on_time_delivery_pct: number
  history_entries: Partner['historyEntries']
  technical_stack: string[]
  comparable_technical_scope: boolean; comparable_scope_note: string
  onboarded_at: string; status: string
}

function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Partner['type'],
    industry: row.industry,
    capabilities: row.capabilities ?? [],
    regions: row.regions ?? [],
    teamSize: row.team_size,
    // Postgres numeric arrives as a string through PostgREST. Left as-is it
    // compared and sorted lexically, so 9 Cr outranked 340 Cr in the registry.
    annualTurnoverCr: Number(row.annual_turnover_cr),
    certifications: row.certifications ?? [],
    empanelment: row.empanelment ?? [],
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    rating: Number(row.rating),
    projectsDelivered: row.projects_delivered,
    onTimeDeliveryPct: row.on_time_delivery_pct,
    historyEntries: row.history_entries ?? [],
    technicalStack: row.technical_stack ?? [],
    comparableTechnicalScope: row.comparable_technical_scope,
    comparableScopeNote: row.comparable_scope_note,
    onboardedAt: row.onboarded_at,
    status: row.status as Partner['status'],
  }
}

function fromPartner(partner: Partner): PartnerRow {
  return {
    id: partner.id,
    name: partner.name,
    type: partner.type,
    industry: partner.industry,
    capabilities: partner.capabilities,
    regions: partner.regions,
    team_size: partner.teamSize,
    annual_turnover_cr: partner.annualTurnoverCr,
    certifications: partner.certifications,
    empanelment: partner.empanelment,
    contact_name: partner.contactName,
    contact_email: partner.contactEmail,
    rating: partner.rating,
    projects_delivered: partner.projectsDelivered,
    on_time_delivery_pct: partner.onTimeDeliveryPct,
    history_entries: partner.historyEntries,
    technical_stack: partner.technicalStack,
    comparable_technical_scope: partner.comparableTechnicalScope,
    comparable_scope_note: partner.comparableScopeNote,
    onboarded_at: partner.onboardedAt,
    status: partner.status,
  }
}

/** One stored file behind a requested document. */
export interface PartnerFile {
  id: string
  documentId: string
  storagePath: string
  originalName: string
  mime: string | null
  sizeBytes: number
  uploadedAt: string
}

export interface PartnerWorkspace {
  partners: Partner[]
  invitations: PartnerInvitation[]
  decisions: PartnerDecision[]
  /** Every stored file, by invitation id then document type. */
  files: Map<string, Map<string, PartnerFile[]>>
  /** Document row ids, so an upload knows what to attach to. */
  documentIds: Map<string, Map<string, string>>
}

const EMPTY: PartnerWorkspace = {
  partners: [], invitations: [], decisions: [], files: new Map(), documentIds: new Map(),
}

export async function fetchPartnerWorkspace(): Promise<PartnerWorkspace | null> {
  const db = await supabase()
  if (!db) return null

  const [partners, invitations, decisions] = await Promise.all([
    db.from('partners').select('*').order('name'),
    db.from('partner_invitations').select('*').order('invited_at', { ascending: false }),
    db.from('partner_decisions').select('*'),
  ])

  if (partners.error) return null
  if (!partners.data?.length) return EMPTY

  const invitationRows = invitations.data ?? []
  const invitationIds = invitationRows.map((row) => row.id as string)

  const documents = invitationIds.length
    ? await db.from('partner_documents').select('*').in('invitation_id', invitationIds)
    : { data: [] as Record<string, unknown>[] }

  const documentRows = (documents.data ?? []) as {
    id: string; invitation_id: string; type: string
    status: string; submitted_at: string | null; note: string | null
  }[]

  const documentIdList = documentRows.map((row) => row.id)
  const fileRows = documentIdList.length
    ? ((await db.from('partner_files').select('*').in('document_id', documentIdList).order('uploaded_at'))
        .data ?? [])
    : []

  const filesByDocument = new Map<string, PartnerFile[]>()
  for (const row of fileRows as Record<string, unknown>[]) {
    const file: PartnerFile = {
      id: row.id as string,
      documentId: row.document_id as string,
      storagePath: row.storage_path as string,
      originalName: row.original_name as string,
      mime: (row.mime as string) ?? null,
      sizeBytes: Number(row.size_bytes ?? 0),
      uploadedAt: row.uploaded_at as string,
    }
    const list = filesByDocument.get(file.documentId) ?? []
    list.push(file)
    filesByDocument.set(file.documentId, list)
  }

  const files = new Map<string, Map<string, PartnerFile[]>>()
  const documentIds = new Map<string, Map<string, string>>()
  const documentsByInvitation = new Map<string, PartnerDocument[]>()

  for (const row of documentRows) {
    const doc: PartnerDocument = {
      type: row.type as PartnerDocumentType,
      status: row.status as PartnerDocumentStatus,
      submittedAt: row.submitted_at,
      note: row.note ?? undefined,
    }
    const list = documentsByInvitation.get(row.invitation_id) ?? []
    list.push(doc)
    documentsByInvitation.set(row.invitation_id, list)

    const ids = documentIds.get(row.invitation_id) ?? new Map<string, string>()
    ids.set(row.type, row.id)
    documentIds.set(row.invitation_id, ids)

    const held = filesByDocument.get(row.id)
    if (held?.length) {
      const byType = files.get(row.invitation_id) ?? new Map<string, PartnerFile[]>()
      byType.set(row.type, held)
      files.set(row.invitation_id, byType)
    }
  }

  return {
    partners: (partners.data as PartnerRow[]).map(toPartner),
    invitations: invitationRows.map((row) => ({
      id: row.id as string,
      rfpId: row.rfp_id as string,
      partnerId: row.partner_id as string,
      status: row.status as PartnerInvitationStatus,
      invitedAt: row.invited_at as string,
      respondedAt: (row.responded_at as string) ?? null,
      documents: documentsByInvitation.get(row.id as string) ?? [],
      quotedValueCr: row.quoted_value_cr === null ? null : Number(row.quoted_value_cr),
      coveringNote: (row.covering_note as string) ?? undefined,
      requestedDocuments: (row.requested_documents as string[]) ?? undefined,
      responseDeadline: (row.response_deadline as string) ?? undefined,
      channel: (row.channel as SubmissionChannel) ?? undefined,
      folderUrl: (row.folder_url as string) ?? undefined,
      remindedAt: (row.reminded_at as string) ?? undefined,
      quotedAt: (row.quoted_at as string) ?? null,
      commercialNote: (row.commercial_note as string) ?? null,
    })),
    decisions: (decisions.data ?? []).map((row) => ({
      rfpId: row.rfp_id as string,
      chosenPartnerIds: (row.chosen_partner_ids as string[]) ?? [],
      reason: row.reason as string,
      notSelectedNote: (row.not_selected_note as string) ?? undefined,
      suggestedPartnerId: (row.suggested_partner_id as string) ?? null,
      recordedAt: row.recorded_at as string,
      history: (row.history as PartnerDecision['history']) ?? [],
    })),
    files,
    documentIds,
  }
}

/* ------------------------------------------------------------------ writing */

/**
 * Every write below returns quietly when there is no database.
 *
 * The store has already been updated by the time these run, so the screen is
 * correct either way; what changes is whether it survives a reload. Throwing here
 * would turn "this build has no workspace" into an error on a button press.
 */

export async function savePartner(partner: Partner): Promise<void> {
  const db = await supabase()
  if (!db) return
  const { error } = await db.from('partners').upsert(fromPartner(partner))
  if (error) throw new Error(error.message)
}

export async function deletePartner(id: string): Promise<void> {
  const db = await supabase()
  if (!db) return
  await db.from('partners').delete().eq('id', id)
}

/**
 * Records the invitations and the documents each one asks for.
 *
 * The document rows are created here rather than when the first file arrives,
 * because "not submitted" is the state the tracker is mostly reporting and a row
 * that only exists once it is satisfied cannot report it.
 */
export async function saveInvitations(invitations: PartnerInvitation[]): Promise<void> {
  const db = await supabase()
  if (!db || invitations.length === 0) return

  const { data, error } = await db
    .from('partner_invitations')
    .upsert(
      invitations.map((row) => ({
        rfp_id: row.rfpId,
        partner_id: row.partnerId,
        status: row.status,
        invited_at: row.invitedAt,
        responded_at: row.respondedAt,
        quoted_value_cr: row.quotedValueCr,
        covering_note: row.coveringNote ?? null,
        requested_documents: row.requestedDocuments ?? [],
        response_deadline: row.responseDeadline ?? null,
        channel: row.channel ?? null,
        folder_url: row.folderUrl ?? null,
      })),
      { onConflict: 'rfp_id,partner_id' },
    )
    .select('id, partner_id')

  if (error) throw new Error(error.message)

  const idByPartner = new Map((data ?? []).map((row) => [row.partner_id as string, row.id as string]))
  const documents = invitations.flatMap((row) => {
    const id = idByPartner.get(row.partnerId)
    if (!id) return []
    return row.documents.map((doc) => ({
      invitation_id: id,
      type: doc.type,
      status: doc.status,
      submitted_at: doc.submittedAt,
      note: doc.note ?? null,
    }))
  })

  if (documents.length) {
    await db.from('partner_documents').upsert(documents, { onConflict: 'invitation_id,type' })
  }
}

export async function saveDocument(
  invitationId: string,
  type: PartnerDocumentType,
  patch: { status?: PartnerDocumentStatus; submittedAt?: string | null; note?: string | null },
): Promise<void> {
  const db = await supabase()
  if (!db) return
  const { error } = await db.from('partner_documents').upsert(
    {
      invitation_id: invitationId,
      type,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.submittedAt !== undefined ? { submitted_at: patch.submittedAt } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
    },
    { onConflict: 'invitation_id,type' },
  )
  if (error) throw new Error(error.message)
}

export async function saveInvitationStatus(
  invitationId: string,
  patch: {
    status?: PartnerInvitationStatus
    respondedAt?: string | null
    quotedValueCr?: number | null
    quotedAt?: string | null
    commercialNote?: string | null
    remindedAt?: string | null
  },
): Promise<void> {
  const db = await supabase()
  if (!db) return
  const update: Record<string, unknown> = {}
  if (patch.status !== undefined) update.status = patch.status
  if (patch.respondedAt !== undefined) update.responded_at = patch.respondedAt
  if (patch.quotedValueCr !== undefined) update.quoted_value_cr = patch.quotedValueCr
  if (patch.quotedAt !== undefined) update.quoted_at = patch.quotedAt
  if (patch.commercialNote !== undefined) update.commercial_note = patch.commercialNote
  if (patch.remindedAt !== undefined) update.reminded_at = patch.remindedAt
  if (Object.keys(update).length === 0) return
  await db.from('partner_invitations').update(update).eq('id', invitationId)
}

export async function saveDecision(decision: PartnerDecision): Promise<void> {
  const db = await supabase()
  if (!db) return
  const { error } = await db.from('partner_decisions').upsert(
    {
      rfp_id: decision.rfpId,
      chosen_partner_ids: decision.chosenPartnerIds,
      reason: decision.reason,
      not_selected_note: decision.notSelectedNote ?? null,
      suggested_partner_id: decision.suggestedPartnerId,
      recorded_at: decision.recordedAt,
      history: decision.history,
    },
    { onConflict: 'rfp_id' },
  )
  if (error) throw new Error(error.message)
}
