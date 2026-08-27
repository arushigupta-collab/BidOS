import { nextId, request, snapshot, type ApiOptions } from '@/lib/mockApi'
import { useWorkspace } from '@/store/useWorkspace'
import type { Partner, PartnerDocumentType, PartnerDecision, PartnerInvitation, Person, Source, SourceStatus, Tender } from '@/types'

/**
 * The latency boundary. Every read and write spends 300 to 900ms here so loading
 * and pending states are genuinely exercised; the data itself lives in the
 * workspace store, which starts empty.
 */

const workspace = () => useWorkspace.getState()

export interface FeedResult {
  tenders: Tender[]
  syncedAt: string
}

export function fetchFeed(): Promise<FeedResult> {
  return request(() => ({
    tenders: snapshot(workspace().tenders),
    syncedAt: new Date().toISOString(),
  }))
}

/** Records that a pre-bid query was raised. Nothing is sent; the workspace logs it. */
export function raisePrebidQuery(tenderRef: string, flagTitle: string): Promise<{ flagTitle: string }> {
  return request(() => ({ tenderRef, flagTitle }), { latencyMs: 620 })
}

/* ------------------------------------------------------------------ sources */

export function fetchSources(): Promise<Source[]> {
  return request(() => snapshot(workspace().sources))
}

export interface SaveSourceInput {
  name: string
  platformId: string
  url: string
  registeredId: string
  keywords: string[]
  /** Present when a password was entered. The secret itself is never stored. */
  hasPassword?: boolean
}

function buildSource(input: SaveSourceInput): Source {
  return {
    id: nextId('s'),
    name: input.name,
    platformId: input.platformId,
    url: input.url,
    registeredId: input.registeredId,
    credentialLabel: input.hasPassword
      ? 'Vault-encrypted portal login'
      : 'Vault-encrypted credential',
    keywords: input.keywords,
    status: 'active',
    addedAt: new Date().toISOString(),
  }
}

export function saveSource(input: SaveSourceInput): Promise<Source> {
  return request(() => {
    const created = buildSource(input)
    workspace().addSources([created])
    return snapshot(created)
  })
}

/** Bulk path for the import dialog. Returns the created rows in file order. */
export function saveSources(inputs: SaveSourceInput[]): Promise<Source[]> {
  return request(() => {
    const created = inputs.map(buildSource)
    workspace().addSources(created)
    return snapshot(created)
  })
}

export function setSourceStatus(sourceId: string, status: SourceStatus): Promise<Source> {
  return request(() => {
    workspace().setSourceStatus(sourceId, status)
    const updated = workspace().sources.find((source) => source.id === sourceId)
    if (!updated) throw new Error(`No source with id ${sourceId}`)
    return snapshot(updated)
  })
}

export function removeSource(sourceId: string): Promise<{ id: string }> {
  return request(() => {
    workspace().removeSource(sourceId)
    return { id: sourceId }
  })
}

/* ------------------------------------------------------------------- people */

export function fetchPeople(): Promise<Person[]> {
  return request(() => snapshot(workspace().people))
}

export interface SavePersonInput {
  name: string
  email: string
  domains: string[]
  regions: string[]
}

function buildPerson(input: SavePersonInput): Person {
  return {
    id: nextId('p'),
    name: input.name.trim(),
    email: input.email.trim(),
    domains: input.domains,
    regions: input.regions,
    addedAt: new Date().toISOString(),
  }
}

export function savePerson(input: SavePersonInput): Promise<Person> {
  return request(() => {
    const created = buildPerson(input)
    workspace().addPeople([created])
    return snapshot(created)
  })
}

export function savePeople(inputs: SavePersonInput[]): Promise<Person[]> {
  return request(() => {
    const created = inputs.map(buildPerson)
    workspace().addPeople(created)
    return snapshot(created)
  })
}

export function updatePerson(id: string, input: SavePersonInput): Promise<Person> {
  return request(() => {
    const existing = workspace().people.find((person) => person.id === id)
    if (!existing) throw new Error(`No person with id ${id}`)
    const updated: Person = {
      ...existing,
      name: input.name.trim(),
      email: input.email.trim(),
      domains: input.domains,
      regions: input.regions,
    }
    workspace().updatePerson(updated)
    return snapshot(updated)
  })
}

export function removePerson(id: string): Promise<{ id: string }> {
  return request(() => {
    workspace().removePerson(id)
    return { id }
  })
}

/* --------------------------------------------------------------- Bid Partners */

/**
 * Partners are already in the store — they load by default — so this exists for the
 * latency, which is what drives the table's loading state. Nothing is fetched.
 */
export function fetchPartners(options?: ApiOptions): Promise<Partner[]> {
  return request(() => useWorkspace.getState().partners, options)
}

export function savePartner(partner: Partner, options?: ApiOptions): Promise<Partner> {
  return request(() => {
    useWorkspace.getState().addPartners([partner])
    return partner
  }, options)
}

export function savePartners(partners: Partner[], options?: ApiOptions): Promise<Partner[]> {
  return request(() => {
    useWorkspace.getState().addPartners(partners)
    return partners
  }, options)
}

export function updatePartner(partner: Partner, options?: ApiOptions): Promise<Partner> {
  return request(() => {
    useWorkspace.getState().updatePartner(partner)
    return partner
  }, options)
}

export function removePartner(id: string, options?: ApiOptions): Promise<void> {
  return request(() => {
    useWorkspace.getState().removePartner(id)
  }, options)
}

/**
 * Records one invitation per recipient against one tender, creating or updating by the
 * (tender, partner) pair. Returns how many were new and how many already existed, so
 * the confirmation can say which happened rather than guessing.
 */
export function sendInvitations(
  rows: PartnerInvitation[],
  options?: ApiOptions,
): Promise<{ created: number; updated: number }> {
  return request(() => {
    const before = useWorkspace.getState().invitations
    const updated = rows.filter((row) =>
      before.some((e) => e.rfpId === row.rfpId && e.partnerId === row.partnerId),
    ).length
    useWorkspace.getState().upsertInvitations(rows)
    return { created: rows.length - updated, updated }
  }, options)
}

export function markDocumentReceived(
  invitationId: string,
  type: PartnerDocumentType,
  received: boolean,
  options?: ApiOptions,
): Promise<void> {
  return request(() => {
    useWorkspace.getState().setDocumentReceived(invitationId, type, received)
  }, options)
}

/** Records several receipts in one call, so a bulk action is one latency, not N. */
export function markDocumentsReceived(
  invitationId: string,
  types: PartnerDocumentType[],
  options?: ApiOptions,
): Promise<void> {
  return request(() => {
    for (const type of types) {
      useWorkspace.getState().setDocumentReceived(invitationId, type, true)
    }
  }, options)
}

export function saveDocumentNote(
  invitationId: string,
  type: PartnerDocumentType,
  note: string,
  options?: ApiOptions,
): Promise<void> {
  return request(() => {
    useWorkspace.getState().setDocumentNote(invitationId, type, note)
  }, options)
}

/**
 * Records a reminder against each invitation. Returns how many of them had already
 * been reminded inside the last day, so the confirmation can say so rather than
 * letting somebody send four in an afternoon without knowing.
 */
export function sendReminders(
  invitationIds: string[],
  options?: ApiOptions,
): Promise<{ recorded: number; recentlyReminded: number }> {
  return request(() => {
    const DAY = 24 * 60 * 60 * 1000
    const now = Date.now()
    const before = useWorkspace.getState().invitations
    const recentlyReminded = invitationIds.filter((id) => {
      const at = before.find((row) => row.id === id)?.remindedAt
      return at !== undefined && now - new Date(at).getTime() < DAY
    }).length
    useWorkspace.getState().recordReminders(invitationIds)
    return { recorded: invitationIds.length, recentlyReminded }
  }, options)
}

/** Records the bid manager's decision on one tender, keeping the previous reason. */
export function recordDecision(
  decision: Omit<PartnerDecision, 'history'>,
  options?: ApiOptions,
): Promise<void> {
  return request(() => {
    useWorkspace.getState().recordDecision(decision)
  }, options)
}
