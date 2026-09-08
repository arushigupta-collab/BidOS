import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BellRing, Check, ChevronDown, ChevronRight, Inbox, Undo2 } from 'lucide-react'
import type { Partner, PartnerDocumentType, PartnerInvitation } from '@/types'
import { DocumentFiles } from './DocumentFiles'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  Separator,
  Tooltip,
} from '@/components/ui'
import { markDocumentReceived, markDocumentsReceived, saveDocumentNote, sendReminders } from '@/data/api'
import { usePartnerData } from '@/features/bidPartners/usePartnerData'
import { EMPTY_VALUE, formatAbsolute, formatCount, formatDateTime, formatRelative, pluralise } from '@/lib/format'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { ResponseStatusBadge } from './ResponseStatusBadge'
import { ViewRfpButton } from '@/components/shared/ViewRfpButton'
import { documentFor } from '@/data/uploaded'
import { counts, isOutstanding, lastActivity, statusOf } from './responsesModel'

/**
 * One tender's responses.
 *
 * NO DOCUMENT MATRIX. Partners as rows against documents as columns is 42 to 84 cells,
 * needs horizontal scroll, and nested or horizontal scrolling is forbidden by the design
 * system. One row per partner carrying a completeness figure, expanding in place to that
 * partner's checklist, holds the same information at every width. Logged in
 * docs/decisions.md so it is not rebuilt.
 *
 * NOTHING ARRIVES ON ITS OWN. There is no partner-facing side to this build, so a bid
 * manager marks each document received, which is also how a real bid desk works when
 * partners reply by email. There is no upload control, no file picker and no drop zone
 * anywhere on this screen, because there is nothing to upload to and a control that
 * looked like one would be a lie.
 */
export function ResponseDetailPage() {
  const { rfpId } = useParams()
  const navigate = useNavigate()
  const { tenders } = usePartnerData()
  const partners = useWorkspace((state) => state.partners)
  const invitations = useWorkspace((state) => state.invitations)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [reminding, setReminding] = useState(false)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkFor, setBulkFor] = useState<{ partner: Partner; invitation: PartnerInvitation } | null>(
    null,
  )
  /**
   * Notes are held locally while typing and written once the typing stops. Saving on
   * every keystroke fired a dozen overlapping calls through a 300-900ms boundary, any of
   * which could land out of order, so the last write won by luck rather than by being
   * last.
   */
  const [notes, setNotes] = useState<Record<string, string>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const onNote = useCallback((key: string, invitationId: string, type: PartnerDocumentType, value: string) => {
    setNotes((current) => ({ ...current, [key]: value }))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      void saveDocumentNote(invitationId, type, value)
    }, 500)
  }, [])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const tender = tenders.find((t) => t.id === rfpId) ?? null
  const rows = useMemo(
    () =>
      invitations
        .filter((row) => row.rfpId === rfpId)
        .flatMap((invitation) => {
          const partner = partners.find((p) => p.id === invitation.partnerId)
          return partner ? [{ partner, invitation }] : []
        })
        .sort((a, b) => a.partner.name.localeCompare(b.partner.name)),
    [invitations, partners, rfpId],
  )

  const outstanding = rows.filter(({ invitation }) => isOutstanding(invitation))
  const responseDeadline = rows.map(({ invitation }) => invitation.responseDeadline).find(Boolean)

  const mark = useCallback(
    async (invitation: PartnerInvitation, type: PartnerDocumentType, received: boolean) => {
      setBusy(`${invitation.id}:${type}`)
      try {
        await markDocumentReceived(invitation.id, type, received)
      } catch {
        toast.error('That could not be recorded', { description: 'Nothing was changed.' })
      } finally {
        setBusy(null)
      }
    },
    [],
  )

  const remind = async (targets: typeof rows) => {
    if (targets.length === 0) return
    setReminding(true)
    try {
      const { recorded, recentlyReminded } = await sendReminders(
        targets.map(({ invitation }) => invitation.id),
      )
      // Says what it targeted, because the target changed: reminders used to chase
      // partners who had sent nothing, and there is no such state now. They chase
      // outstanding DOCUMENTS from partners who are part way through.
      toast.success(
        `Reminder recorded for ${pluralise(recorded, 'partner')} with documents outstanding.`,
        {
          description:
            recentlyReminded > 0
              ? `${recentlyReminded} of them were reminded in the last day. On a connected workspace this dispatches from your configured mail account.`
              : 'On a connected workspace this dispatches from your configured mail account.',
        },
      )
    } catch {
      toast.error('The reminder could not be recorded', { description: 'Nothing was changed.' })
    } finally {
      setReminding(false)
    }
  }

  if (!tender || rows.length === 0) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Inbox size={ICON.lg} aria-hidden="true" />}
          title="No partners have been invited to this RFP"
          description="There is nothing to track until an invitation has gone out. Choose this RFP in the registry, select the partners you want on it, and send the invitation."
          action={
            <Button variant="primary" onClick={() => navigate('/bid-partners/registry')}>
              Go to the registry
            </Button>
          }
        />
      </div>
    )
  }

  // The two figures the strip needs, and only those. The document AGGREGATES that fed the
  // removed stat and the removed bar are gone; per-partner counts still come from
  // `counts(invitation)` in the rows below and are untouched.
  const initiated = rows.filter(({ invitation }) => counts(invitation).received > 0).length
  const completed = rows.filter(({ invitation }) => statusOf(invitation) === 'complete').length

  return (
    <div className="scrollable flex flex-1 flex-col gap-24 px-24 py-24 md:px-32">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-8 text-metadata text-fg-muted">
          <li>
            <Link
              to="/bid-partners/responses"
              className="rounded-field underline decoration-border underline-offset-4 hover:text-fg"
            >
              Response tracker
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="min-w-0 truncate text-fg-secondary">
            {tender.title}
          </li>
        </ol>
      </nav>

      <header className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-12">
          <h1 className="max-w-prose text-page-title text-fg">{tender.title}</h1>
          <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
            <span className="numeric font-mono text-metadata text-fg-muted">{tender.tenderRef}</span>
            <span className="min-w-0 truncate text-secondary-body text-fg-secondary">
              {tender.issuingAuthority}
            </span>
          </div>

          {/* Two different clocks, labelled so they cannot be confused: what partners
              owe you, and when your own bid closes. */}
          <dl className="flex flex-wrap items-baseline gap-x-32 gap-y-8">
            <div className="flex flex-col gap-2">
              <dt className="text-micro-label uppercase text-fg-muted">
                Partner response deadline
              </dt>
              <dd className="numeric font-mono text-body-strong text-fg">
                {responseDeadline
                  ? formatDateTime(`${responseDeadline}T18:00:00`)
                  : 'Not set'}
              </dd>
            </div>
            <div className="flex flex-col gap-2">
              <dt className="text-micro-label uppercase text-fg-muted">Your bid due date</dt>
              <dd className="numeric font-mono text-body-strong text-fg">
                {formatDateTime(tender.bidDueAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-8">
          {outstanding.length === 0 ? (
            <Tooltip content="Every invited partner has sent everything that was asked for." wrapDisabled>
              <Button variant="primary" disabled iconLeft={<BellRing size={ICON.md} aria-hidden="true" />}>
                Send reminder to all outstanding
              </Button>
            </Tooltip>
          ) : (
            <Button
              variant="primary"
              loading={reminding}
              iconLeft={<BellRing size={ICON.md} aria-hidden="true" />}
              onClick={() => remind(outstanding)}
            >
              {`Send reminder to ${pluralise(outstanding.length, 'partner')}`}
            </Button>
          )}

          {/* The shared control, not a second PDF opener. It replaces "Open in mail
              client", which was the only thing on this screen that left the product — and
              it left it to compose a message the primary beside it already records. What a
              reader actually wants here is the document the partners are responding to. */}
          <ViewRfpButton title={tender.title} document={documentFor(tender)} />
        </div>
      </header>

      <section
        aria-label="Response summary"
        // Four equal columns rather than a wrap row with a 40px gap. The old row sized
        // itself around a `flex-1` bar; with the bar gone, four short figures on
        // `gap-x-40` left the whole right half of the strip empty, which reads as a row
        // with something missing from it. A grid distributes them across the strip and
        // keeps their labels on one baseline. Measured at 1190, 1280 and 1440.
        className="grid grid-cols-2 gap-x-24 gap-y-16 rounded-card bg-surface-sunken p-20 sm:grid-cols-4"
      >
        {/* FOUR figures and nothing else. No documents aggregate, no percentage, and NO
            PROGRESS BAR of any kind — not a bar, a ring, a sparkline or any other
            proportional treatment. The strip held five stats plus a completeness bar, all
            of them views of the same document set, and the bar took `flex-1` so it pushed
            the figures into the left third of the row.

            PROCESS INITIATED WILL ALWAYS EQUAL PARTNERS INVITED, and that is deliberate.
            Since "Not started" was removed as a state, every partner in this tracker has at
            least one document in, so the two figures coincide. The duplication was chosen
            knowingly: do not collapse them, do not derive one from the other, and do not add
            a note explaining it. See docs/decisions.md. */}
        {[
          { label: 'Partners invited', value: formatCount(rows.length) },
          { label: 'Process initiated', value: formatCount(initiated) },
          { label: 'Process completed', value: formatCount(completed) },
          { label: 'Process pending', value: formatCount(initiated - completed) },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <p className="text-micro-label uppercase text-fg-muted">{stat.label}</p>
            <p className="numeric font-mono text-panel-title text-fg">{stat.value}</p>
          </div>
        ))}
      </section>

      <ul aria-label="Invited partners" className="flex flex-col gap-8">
        {rows.map(({ partner, invitation }) => {
          const { received, requested } = counts(invitation)
          const status = statusOf(invitation)
          const activity = lastActivity(invitation)
          const isOpen = expanded[invitation.id] === true

          return (
            <li key={invitation.id} className="rounded-card bg-surface-sunken">
              <div className="flex flex-wrap items-center gap-x-16 gap-y-12 p-16">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`docs-${invitation.id}`}
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [invitation.id]: !isOpen }))
                  }
                  className="flex min-w-0 flex-1 items-start gap-12 rounded-field text-left"
                >
                  <span aria-hidden="true" className="mt-2 shrink-0 text-fg-muted">
                    {isOpen ? <ChevronDown size={ICON.md} /> : <ChevronRight size={ICON.md} />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="text-body-strong text-fg">{partner.name}</span>
                    <span className="text-caption text-fg-muted">{partner.contactName}</span>
                    <span className="truncate font-mono text-caption text-fg-muted">
                      {partner.contactEmail}
                    </span>
                  </span>
                </button>

                <span className="numeric shrink-0 font-mono text-table-cell text-fg">
                  {`${received} of ${requested}`}
                </span>

                <span className="shrink-0">
                  <ResponseStatusBadge status={status} />
                </span>

                <span className="shrink-0 text-body text-fg-secondary" title={activity ? formatAbsolute(activity) : undefined}>
                  {activity ? formatRelative(activity) : <span className="text-fg-subtle">{EMPTY_VALUE}</span>}
                </span>

                <span className="flex shrink-0 items-center gap-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={reminding}
                    onClick={() => remind([{ partner, invitation }])}
                  >
                    Send reminder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkFor({ partner, invitation })}
                  >
                    Mark all received
                  </Button>
                </span>
              </div>

              {/* Expansion is per row and several may be open at once. It lives in this
                  page's state rather than the row's, so marking a document received does
                  not collapse anything. */}
              {isOpen && (
                <div id={`docs-${invitation.id}`} className="flex flex-col gap-8 px-16 pb-16">
                  <Separator />
                  {invitation.documents.map((document) => {
                    const isIn = document.status === 'submitted' || document.status === 'under-review'
                    const key = `${invitation.id}:${document.type}`
                    return (
                      <div
                        key={document.type}
                        className="flex flex-wrap items-center gap-x-16 gap-y-8 rounded-control bg-surface p-12"
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-2">
                          <span className="text-body text-fg">{document.type}</span>
                          {document.submittedAt && (
                            <span className="text-caption text-fg-muted">
                              {`Recorded ${formatDateTime(document.submittedAt)}`}
                            </span>
                          )}
                        </span>

                        {document.status === 'rejected' && <Badge tone="destructive">Rejected</Badge>}

                        {/* The label names its own document. Seven rows of "What
                            arrived" is seven identical field names in one partner and
                            forty on the page, which leaves a screen reader no way to
                            tell them apart. Visible text stays short; the accessible
                            name carries the document. */}
                        <Input
                          id={`note-${key}`}
                          label="What arrived"
                          aria-label={`What arrived for ${document.type}, from ${partner.name}`}
                          placeholder="File name, or the date of the covering email"
                          value={notes[key] ?? document.note ?? ''}
                          onChange={(event) => onNote(key, invitation.id, document.type, event.target.value)}
                          className="w-full sm:w-panel"
                        />

                        {isIn ? (
                          <IconButton
                            label={`Undo receipt of ${document.type}`}
                            size="sm"
                            disabled={busy === key}
                            icon={<Undo2 size={ICON.sm} aria-hidden="true" />}
                            onClick={() => void mark(invitation, document.type, false)}
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busy === key}
                            iconLeft={<Check size={ICON.sm} aria-hidden="true" />}
                            onClick={() => void mark(invitation, document.type, true)}
                          >
                            Mark received
                          </Button>
                        )}

                        {/* Below the row rather than inside it: the files are the
                            substance and the controls above are the bookkeeping, and
                            a proposal squeezed between a note field and a button is
                            the wrong way round. */}
                        <DocumentFiles
                          invitationId={invitation.id}
                          documentType={document.type}
                          partnerName={partner.name}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={bulkFor !== null}
        onOpenChange={(open) => !open && setBulkFor(null)}
        title={`Mark everything received from ${bulkFor?.partner.name ?? 'this partner'}?`}
        description="Every outstanding document is recorded as received, all carrying this moment as their timestamp rather than the date each one actually arrived. Your notes about what arrived are kept. You can undo any single document afterwards."
        confirmLabel="Mark all received"
        pending={bulkPending}
        onConfirm={async () => {
          if (!bulkFor) return
          setBulkPending(true)
          try {
            const outstandingTypes = bulkFor.invitation.documents
              .filter((doc) => doc.status === 'not-submitted' || doc.status === 'rejected')
              .map((doc) => doc.type)
            // One call, not one per document: seven in series is up to six seconds of
            // silence with the dialog already closed.
            await markDocumentsReceived(bulkFor.invitation.id, outstandingTypes)
            toast.success(
              `${pluralise(outstandingTypes.length, 'document')} recorded from ${bulkFor.partner.name}.`,
            )
            setBulkFor(null)
          } catch {
            toast.error('That could not be recorded', { description: 'Nothing was changed.' })
          } finally {
            setBulkPending(false)
          }
        }}
      />
    </div>
  )
}
