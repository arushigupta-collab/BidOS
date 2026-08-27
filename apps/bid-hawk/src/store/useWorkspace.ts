import { create } from 'zustand'
import type {
  DecisionRecord,
  Partner,
  PartnerDecision,
  PartnerInvitation,
  Person,
  Source,
  SourceStatus,
  Tender,
  PartnerDocumentType,
} from '@/types'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import {
  deletePartner, fetchPartnerWorkspace, saveDecision, saveDocument, saveInvitations,
  saveInvitationStatus, savePartner, type PartnerFile,
} from '@/data/partnersDb'
import { PARTNERS } from '@/data/seed/partners'
import { PEOPLE } from '@/data/seed/people'
import { SOURCES } from '@/data/seed/sources'
import { TENDERS } from '@/data/seed/tenders'
import { fetchUploadedTenders } from '@/data/uploaded'
import type { RoutingMatch } from '@/lib/routingEngine'

/**
 * The workspace, empty on load, revealed on first use.
 *
 * A first-run product has nothing in it, and a demo that opens with records
 * already connected never shows the state every real operator starts in. So both
 * lists begin at zero — and the moment the operator creates their first record of
 * a kind, the records this workspace already had appear alongside it. Creating one
 * source reads as six; creating one person reads as six; the two are independent.
 *
 * The created record is always first, so it is obvious which one the operator just
 * made. `sessionSources` and `sessionPeople` hold only what this visit created, for
 * the schema tables on the add screens.
 *
 * RFPs follow the same reveal, tied to sources: they are what Bid Hawk found on the
 * platforms you connected, so they arrive with the first source and are never
 * created by hand.
 *
 * PARTNERS AND THEIR INVITATIONS ARE THE EXCEPTION. They are present from the first
 * render and are NOT revealed by a creation. A partner network is something the
 * organisation already has when it opens the product, not something built during
 * setup, and an empty registry would misrepresent that. `resetToEmpty` restores them
 * rather than clearing them, for the same reason. Do not align this with the two
 * above — see docs/decisions.md.
 */
export interface WorkspaceState {
  sources: Source[]
  people: Person[]
  tenders: Tender[]
  /**
   * Tenders read from an uploaded document, kept apart from `tenders` so the
   * empty-by-default reveal still works. Sources and people start at zero and the
   * seeded tenders arrive with the first source created; an uploaded reading has
   * nothing to do with that sequence and must not be cleared by it.
   */
  uploadedTenders: Tender[]
  /**
   * The owner each reading was routed to, carried rather than recomputed. See
   * src/data/uploaded.ts: a reading's assignment is a fact about it, and the
   * workspace's people list is empty until setup runs.
   */
  uploadedAssignments: Map<string, RoutingMatch>
  /** Bid managers as the database holds them, for workspaces that hold none yet. */
  uploadedManagers: Person[]
  loadUploaded: () => Promise<void>
  /** Present from the first render. See the note above. */
  partners: Partner[]
  invitations: PartnerInvitation[]
  /** Recorded evaluation decisions, one per tender, each carrying its own history. */
  decisions: PartnerDecision[]
  /** Files a partner sent back, by invitation id then requested document. */
  partnerFiles: Map<string, Map<string, PartnerFile[]>>
  /** The stored document row behind each requested document, so an upload knows its target. */
  documentIds: Map<string, Map<string, string>>
  /**
   * Replaces the seeded partner network with the stored one.
   *
   * All or nothing, deliberately. Merging a stored registry into the seeded one
   * would leave the module showing seven partners nobody registered alongside the
   * ones somebody did, with no way to tell them apart -- and the seeded
   * invitations point at seeded tender ids, which no uploaded tender has.
   */
  loadPartners: () => Promise<void>
  /**
   * The last write that did not reach the database, if one did not.
   *
   * The store updates first so the screen never stalls on the network, which
   * means a failed write leaves the interface showing something the database does
   * not hold. Silence there is the worst of both: work that looks saved and is
   * not. The partner screens render this.
   */
  partnerSyncError: string | null
  attachFile: (invitationId: string, type: PartnerDocumentType, file: PartnerFile) => void
  detachFile: (invitationId: string, type: PartnerDocumentType, fileId: string) => void
  sessionSources: Source[]
  sessionPeople: Person[]
  /** True once the existing sources have been revealed by a first creation. */
  sourcesRevealed: boolean
  peopleRevealed: boolean

  resetToEmpty: () => void

  addSources: (created: Source[]) => void
  setSourceStatus: (id: string, status: SourceStatus) => void
  removeSource: (id: string) => void

  /**
   * Partners are present from the first render, so there is no reveal to trigger:
   * a created partner simply joins the list, newest first.
   */
  addPartners: (created: Partner[]) => void
  updatePartner: (partner: Partner) => void
  removePartner: (id: string) => void

  /**
   * Creates or updates by the (rfpId, partnerId) pair. There must never be two
   * invitation records for the same partner and tender, so this is an upsert rather
   * than an append and the uniqueness lives here rather than in a caller.
   */
  upsertInvitations: (rows: PartnerInvitation[]) => void

  /** Marks one requested document received, or undoes that. Stores the timestamp. */
  setDocumentReceived: (invitationId: string, type: PartnerDocumentType, received: boolean) => void
  setDocumentNote: (invitationId: string, type: PartnerDocumentType, note: string) => void
  /** Records a reminder against each invitation, so nobody sends four in an afternoon. */
  recordReminders: (invitationIds: string[]) => void
  /** Records or replaces the decision on a tender, pushing the previous one to history. */
  recordDecision: (decision: DecisionRecord) => void

  addPeople: (created: Person[]) => void
  updatePerson: (person: Person) => void
  removePerson: (id: string) => void
}

const clone = <T,>(rows: T[]): T[] => rows.map((row) => ({ ...row }))

const stripHistory = ({ history: _history, ...rest }: PartnerDecision): DecisionRecord => rest

/**
 * Invitations carry a nested document set, so a shallow copy would hand every reset
 * the same array back and a later edit would reach across a reset.
 */
const cloneInvitations = (rows: PartnerInvitation[]): PartnerInvitation[] =>
  rows.map((row) => ({ ...row, documents: row.documents.map((doc) => ({ ...doc })) }))

/**
 * Runs a database write behind a store update that has already happened.
 *
 * Optimistic on purpose: a registry that waited for a round trip before showing a
 * partner would feel broken on a slow connection. The failure is surfaced rather
 * than swallowed -- see `partnerSyncError`.
 */
function writeThrough(
  set: (partial: Partial<WorkspaceState>) => void,
  what: string,
  run: () => Promise<void>,
): void {
  void run()
    .then(() => set({ partnerSyncError: null }))
    .catch((caught: Error) => set({ partnerSyncError: `${what} was not saved: ${caught.message}` }))
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  sources: [],
  people: [],
  tenders: [],
  uploadedTenders: [],
  uploadedAssignments: new Map(),
  uploadedManagers: [],
  partners: clone(PARTNERS),
  invitations: cloneInvitations(PARTNER_INVITATIONS),
  decisions: [],
  partnerFiles: new Map(),
  documentIds: new Map(),
  partnerSyncError: null,
  sessionSources: [],
  sessionPeople: [],
  sourcesRevealed: false,
  peopleRevealed: false,

  /**
   * Reads what has been ingested. Safe to call repeatedly and safe to call where
   * there is no database, which is why it resolves to an empty list rather than
   * throwing: the offline build and an unconfigured environment are both states
   * the product is expected to run in.
   */
  loadUploaded: async () => {
    const { tenders, assignments, managers } = await fetchUploadedTenders()
    if (tenders.length) {
      set({ uploadedTenders: tenders, uploadedAssignments: assignments, uploadedManagers: managers })
    }
  },

  loadPartners: async () => {
    const stored = await fetchPartnerWorkspace()
    if (!stored || stored.partners.length === 0) return
    set({
      partners: stored.partners,
      invitations: stored.invitations,
      decisions: stored.decisions,
      partnerFiles: stored.files,
      documentIds: stored.documentIds,
    })
  },

  attachFile: (invitationId, type, file) =>
    set((state) => {
      const next = new Map(state.partnerFiles)
      const byType = new Map(next.get(invitationId) ?? [])
      byType.set(type, [...(byType.get(type) ?? []), file])
      next.set(invitationId, byType)
      return { partnerFiles: next }
    }),

  detachFile: (invitationId, type, fileId) =>
    set((state) => {
      const next = new Map(state.partnerFiles)
      const byType = new Map(next.get(invitationId) ?? [])
      byType.set(type, (byType.get(type) ?? []).filter((row) => row.id !== fileId))
      next.set(invitationId, byType)
      return { partnerFiles: next }
    }),

  /**
   * Re-arms the whole journey, so a demo can run it again without a reload.
   *
   * Partners and invitations are restored, not cleared: "empty" describes the state
   * before setup, and a workspace with no partners was never a state this product
   * has.
   */
  resetToEmpty: () =>
    set({
      sources: [],
      people: [],
      tenders: [],
      // uploadedTenders deliberately survives. "Empty" describes the state before
      // setup; a document that was read is not part of setup and re-reading one
      // costs a model call.
      partners: clone(PARTNERS),
      invitations: cloneInvitations(PARTNER_INVITATIONS),
      decisions: [],
      sessionSources: [],
      sessionPeople: [],
      sourcesRevealed: false,
      peopleRevealed: false,
    }),

  addSources: (created) =>
    set((state) => ({
      // The existing five arrive behind the first creation, once. The RFPs arrive
      // with them: they are what those platforms were already carrying.
      sources: state.sourcesRevealed
        ? [...created, ...state.sources]
        : [...created, ...clone(SOURCES)],
      tenders: state.sourcesRevealed ? state.tenders : clone(TENDERS),
      sessionSources: [...created, ...state.sessionSources],
      sourcesRevealed: true,
    })),

  setSourceStatus: (id, status) =>
    set((state) => ({
      sources: state.sources.map((source) => (source.id === id ? { ...source, status } : source)),
      sessionSources: state.sessionSources.map((source) =>
        source.id === id ? { ...source, status } : source,
      ),
    })),

  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((source) => source.id !== id),
      sessionSources: state.sessionSources.filter((source) => source.id !== id),
    })),

  addPartners: (created) => {
    set((state) => ({ partners: [...created, ...state.partners] }))
    writeThrough(set, 'The partner', async () => {
      for (const partner of created) await savePartner(partner)
    })
  },

  updatePartner: (partner) => {
    set((state) => ({
      partners: state.partners.map((row) => (row.id === partner.id ? partner : row)),
    }))
    writeThrough(set, 'The change', () => savePartner(partner))
  },

  removePartner: (id) => {
    set((state) => ({
      partners: state.partners.filter((row) => row.id !== id),
      // An invitation to a partner who no longer exists is a dangling reference, so
      // it goes with them rather than being left for the tracker to trip over.
      invitations: state.invitations.filter((row) => row.partnerId !== id),
    }))
    writeThrough(set, 'The removal', () => deletePartner(id))
  },

  upsertInvitations: (rows) =>
    set((state) => {
      const next = [...state.invitations]
      for (const row of rows) {
        const at = next.findIndex(
          (existing) => existing.rfpId === row.rfpId && existing.partnerId === row.partnerId,
        )
        if (at >= 0) next[at] = { ...next[at], ...row, id: next[at].id }
        else next.push(row)
      }
      writeThrough(set, 'The invitation', async () => {
        await saveInvitations(rows)
        // Re-read, because the rows above were written without ids: the database
        // mints them, and the tracker needs the real one to attach a file to.
        const stored = await fetchPartnerWorkspace()
        if (stored?.partners.length) {
          set({
            invitations: stored.invitations,
            partnerFiles: stored.files,
            documentIds: stored.documentIds,
          })
        }
      })
      return { invitations: next }
    }),

  setDocumentReceived: (invitationId, type, received) => {
    set((state) => ({
      invitations: state.invitations.map((row) =>
        row.id === invitationId
          ? {
              ...row,
              documents: row.documents.map((doc) =>
                doc.type === type
                  ? {
                      ...doc,
                      status: received ? 'submitted' : 'not-submitted',
                      // Undoing clears the timestamp: a receipt that was withdrawn did
                      // not happen, and leaving the date would say it did.
                      submittedAt: received ? new Date().toISOString() : null,
                    }
                  : doc,
              ),
            }
          : row,
      ),
    }))
    writeThrough(set, 'The receipt', () =>
      saveDocument(invitationId, type, {
        status: received ? 'submitted' : 'not-submitted',
        submittedAt: received ? new Date().toISOString() : null,
      }),
    )
  },

  setDocumentNote: (invitationId, type, note) => {
    set((state) => ({
      invitations: state.invitations.map((row) =>
        row.id === invitationId
          ? {
              ...row,
              documents: row.documents.map((doc) =>
                doc.type === type ? { ...doc, note } : doc,
              ),
            }
          : row,
      ),
    }))
    writeThrough(set, 'The note', () => saveDocument(invitationId, type, { note }))
  },

  recordReminders: (invitationIds) =>
    set((state) => {
      const at = new Date().toISOString()
      writeThrough(set, 'The reminder', async () => {
        for (const id of invitationIds) await saveInvitationStatus(id, { remindedAt: at })
      })
      return {
        invitations: state.invitations.map((row) =>
          invitationIds.includes(row.id) ? { ...row, remindedAt: at } : row,
        ),
      }
    }),

  recordDecision: (decision) =>
    set((state) => {
      const prior = state.decisions.find((row) => row.rfpId === decision.rfpId)
      // The previous decision is kept, not overwritten: an audit trail that loses the
      // reason it replaced is not an audit trail. The prior row's own history is
      // flattened in behind it, so the list stays one level deep however many times
      // the decision changes.
      const history: DecisionRecord[] = prior
        ? [stripHistory(prior), ...prior.history]
        : []
      const next: PartnerDecision = { ...decision, history }
      writeThrough(set, 'The decision', () => saveDecision(next))
      return {
        decisions: [...state.decisions.filter((row) => row.rfpId !== decision.rfpId), next],
      }
    }),

  addPeople: (created) =>
    set((state) => ({
      people: state.peopleRevealed ? [...created, ...state.people] : [...created, ...clone(PEOPLE)],
      sessionPeople: [...created, ...state.sessionPeople],
      peopleRevealed: true,
    })),

  updatePerson: (person) =>
    set((state) => ({
      people: state.people.map((row) => (row.id === person.id ? person : row)),
      sessionPeople: state.sessionPeople.map((row) => (row.id === person.id ? person : row)),
    })),

  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((row) => row.id !== id),
      sessionPeople: state.sessionPeople.filter((row) => row.id !== id),
    })),
}))
