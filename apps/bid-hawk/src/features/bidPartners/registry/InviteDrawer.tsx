import { useEffect, useMemo, useState } from 'react'
import { Mail, Send, Trash2 } from 'lucide-react'
import type { Partner, PartnerInvitation, SubmissionChannel, Tender } from '@/types'
import { Button, ButtonLink, Checkbox, Drawer, IconButton, Input, Select, Tooltip } from '@/components/ui'
import { sendInvitations } from '@/data/api'
import { formatDateTime, pluralise } from '@/lib/format'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import {
  CHANNELS,
  DEFAULT_DOCUMENTS,
  composeNote,
  deadlineProblem,
  defaultDeadline,
  invitationsFrom,
  mailtoHref,
  type InviteDraft,
} from './inviteDraft'

export interface InviteDrawerProps {
  open: boolean
  onClose: () => void
  /** Null is unreachable while open: the action that opens this is gated on it. */
  rfp: Tender | null
  recipients: Partner[]
  invitations: PartnerInvitation[]
  /** Called after a successful send, so the registry can clear its selection. */
  onSent: () => void
}

/**
 * The invitation composer.
 *
 * A long form in a drawer, which the forbidden-patterns list would normally reject.
 * That rule targets MODALS, and for good reason: a modal interrupts, has no address and
 * cannot be worked alongside anything. A vaul drawer is the surface CLAUDE.md already
 * assigns to a record you inspect while keeping list context, and this composer is
 * bound to a selection made in the table behind it - close it and the selection is
 * still there, which is the whole reason it is not a page. Logged in
 * docs/decisions.md so it is not "corrected" later.
 *
 * NO AI. No suggested recipients, no recommended documents, no confidence figures and
 * no accent-toned attribution. The document list is static and pre-checked because
 * that is what a government IT tender asks for, not because anything inferred it.
 */
export function InviteDrawer({
  open,
  onClose,
  rfp,
  recipients,
  invitations,
  onSent,
}: InviteDrawerProps) {
  const [draft, setDraft] = useState<InviteDraft | null>(null)
  const [sending, setSending] = useState(false)
  const [extra, setExtra] = useState('')
  /** True when seven days would have overshot the bid date and the default was pulled in. */
  const [shortened, setShortened] = useState(false)

  // Composed at open time from the tender record, then editable. Re-composed only when
  // the drawer opens or the tender changes, so an edit is never overwritten.
  useEffect(() => {
    if (!open || !rfp) return
    const { date, shortened } = defaultDeadline(rfp)
    setDraft({
      recipientIds: recipients.map((partner) => partner.id),
      coveringNote: composeNote(rfp, recipients.length, date),
      documents: [...DEFAULT_DOCUMENTS],
      deadline: date,
      channel: 'email-reply',
      folderUrl: '',
    })
    setShortened(shortened)
    setExtra('')
  }, [open, rfp?.id])

  const chosen = useMemo(
    () => recipients.filter((partner) => draft?.recipientIds.includes(partner.id)),
    [recipients, draft?.recipientIds],
  )

  const alreadyInvited = useMemo(
    () =>
      rfp
        ? chosen.filter((partner) =>
            invitations.some((row) => row.rfpId === rfp.id && row.partnerId === partner.id),
          )
        : [],
    [chosen, invitations, rfp],
  )

  if (!draft || !rfp) {
    return (
      <Drawer open={open} onClose={onClose} title="Invite partners" description="Choose an RFP and at least one partner.">
        <p className="text-secondary-body text-fg-muted">Nothing to compose yet.</p>
      </Drawer>
    )
  }

  const set = <K extends keyof InviteDraft>(key: K, value: InviteDraft[K]) =>
    setDraft({ ...draft, [key]: value })

  const deadlineFault = deadlineProblem(draft.deadline, rfp)
  const folderFault =
    draft.channel === 'shared-folder' && draft.folderUrl.trim() === ''
      ? 'A folder address is required when partners upload rather than reply.'
      : null

  const blocked =
    chosen.length === 0
      ? 'Add at least one recipient.'
      : draft.documents.length === 0
        ? 'Ask for at least one document.'
        : deadlineFault
          ? deadlineFault
          : folderFault
            ? folderFault
            : null

  const send = async () => {
    setSending(true)
    try {
      const rows = invitationsFrom(draft, rfp, invitations)
      const { created, updated } = await sendInvitations(rows)

      // Honest about what happened. Nothing left this machine.
      const what =
        updated === 0
          ? `Invitation recorded for ${pluralise(created, 'partner')}.`
          : created === 0
            ? `Invitation updated for ${pluralise(updated, 'partner')}.`
            : `Invitation recorded for ${pluralise(created, 'partner')} and updated for ${updated}.`
      toast.success(what, {
        description:
          'On a connected workspace this dispatches from your configured mail account.',
      })
      onSent()
      onClose()
    } catch {
      toast.error('The invitation could not be recorded', { description: 'Nothing was changed.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={rfp.title}
      subheader={
        <span className="numeric font-mono text-metadata text-fg-muted">{rfp.tenderRef}</span>
      }
      description="What you are asking these partners for, and by when."
      footer={
        <div className="flex flex-wrap items-center gap-8">
          {blocked ? (
            <Tooltip content={blocked} wrapDisabled>
              <Button variant="primary" disabled iconLeft={<Send size={ICON.md} aria-hidden="true" />}>
                Send invitation
              </Button>
            </Tooltip>
          ) : (
            <Button
              variant="primary"
              loading={sending}
              iconLeft={<Send size={ICON.md} aria-hidden="true" />}
              onClick={send}
            >
              {alreadyInvited.length === chosen.length && chosen.length > 0
                ? 'Update invitation'
                : 'Send invitation'}
            </Button>
          )}

          {/* A genuine escape hatch, not decoration: it opens the operator's own mail
              client with the same recipients, subject and note. */}
          <ButtonLink
            variant="secondary"
            href={mailtoHref(rfp, chosen, draft.coveringNote, draft.documents, {
              deadline: draft.deadline,
              channel: draft.channel,
              folderUrl: draft.folderUrl.trim() || undefined,
            })}
            iconLeft={<Mail size={ICON.md} aria-hidden="true" />}
          >
            Open in mail client
          </ButtonLink>
        </div>
      }
    >
      <div className="flex flex-col gap-24">
        <section aria-labelledby="invite-recipients" className="flex flex-col gap-12">
          <div className="flex flex-wrap items-baseline justify-between gap-8">
            <h3 id="invite-recipients" className="text-micro-label uppercase text-fg-muted">
              {`${pluralise(chosen.length, 'recipient')} resolved`}
            </h3>
            {/* The note was composed for the list as it opened. Removing a recipient
                does not rewrite it, because an edit must never be overwritten - so the
                mismatch is stated instead of hidden. */}
            {chosen.length !== recipients.length && (
              <p className="text-metadata text-fg-muted">
                {`${recipients.length - chosen.length} removed here. The table selection is unchanged, and the note still reads for ${pluralise(recipients.length, 'partner')}.`}
              </p>
            )}
            {alreadyInvited.length > 0 && (
              <p className="text-metadata text-fg-muted">
                {`${pluralise(alreadyInvited.length, 'partner')} already invited to this RFP. Their invitation will be updated, not duplicated.`}
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-8">
            {chosen.map((partner) => (
              <li
                key={partner.id}
                className="flex items-start justify-between gap-12 rounded-card bg-surface-sunken p-16"
              >
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="text-body-strong text-fg">{partner.name}</span>
                  <span className="truncate font-mono text-metadata text-fg-muted">
                    {partner.contactEmail}
                  </span>
                </span>
                {/* Removing a recipient here does not uncheck the row behind the drawer:
                    the drawer is the invitation, the table is the registry. */}
                <IconButton
                  label={`Remove ${partner.name} from this invitation`}
                  size="sm"
                  icon={<Trash2 size={ICON.sm} aria-hidden="true" />}
                  onClick={() =>
                    set(
                      'recipientIds',
                      draft.recipientIds.filter((id) => id !== partner.id),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <label className="flex flex-col gap-8">
          <span className="text-micro-label uppercase text-fg-muted">Covering note</span>
          <textarea
            value={draft.coveringNote}
            onChange={(event) => set('coveringNote', event.target.value)}
            rows={14}
            className="w-full resize-y rounded-control border border-border bg-surface px-12 py-8 text-secondary-body text-fg outline-none focus-visible:border-border-strong"
          />
          <span className="text-helper text-fg-muted">
            Composed from the tender record. Edit it as you would any note before sending.
          </span>
        </label>

        <fieldset className="flex flex-col gap-12">
          <legend className="text-micro-label uppercase text-fg-muted">
            {`Documents requested (${draft.documents.length})`}
          </legend>
          <p role="status" className="sr-only">
            {draft.documents.length === 0
              ? 'No documents requested. At least one is needed to send.'
              : `${pluralise(draft.documents.length, 'document')} requested.`}
          </p>
          <div className="flex flex-col gap-8">
            {[...DEFAULT_DOCUMENTS, ...draft.documents.filter((d) => !DEFAULT_DOCUMENTS.includes(d as never))].map(
              (document) => (
                <Checkbox
                  key={document}
                  id={`doc-${document}`}
                  label={document}
                  checked={draft.documents.includes(document)}
                  onCheckedChange={(next) =>
                    set(
                      'documents',
                      next
                        ? [...draft.documents, document]
                        : draft.documents.filter((d) => d !== document),
                    )
                  }
                />
              ),
            )}
          </div>

          <div className="flex items-end gap-8">
            <Input
              id="invite-extra-document"
              label="Add another document"
              placeholder="Power of attorney"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
              className="flex-1"
            />
            <Button
              variant="secondary"
              disabled={extra.trim() === '' || draft.documents.includes(extra.trim())}
              onClick={() => {
                set('documents', [...draft.documents, extra.trim()])
                setExtra('')
              }}
            >
              Add
            </Button>
          </div>
        </fieldset>

        <Input
          id="invite-deadline"
          type="date"
          label="Response deadline"
          value={draft.deadline}
          onChange={(event) => set('deadline', event.target.value)}
          error={deadlineFault ?? undefined}
          helper={
            shortened
              ? `Seven days would fall after this tender closes, so the default is the midpoint between today and the bid date. Bids close ${formatDateTime(rfp.bidDueAt)}.`
              : `Must fall before the bid closes on ${formatDateTime(rfp.bidDueAt)}.`
          }
        />

        <Select
          id="invite-channel"
          label="How partners respond"
          options={CHANNELS}
          value={draft.channel}
          onValueChange={(value) => set('channel', value as SubmissionChannel)}
        />

        {draft.channel === 'shared-folder' && (
          <Input
            id="invite-folder"
            label="Folder address"
            placeholder="https://"
            value={draft.folderUrl}
            onChange={(event) => set('folderUrl', event.target.value)}
            error={folderFault ?? undefined}
            helper="Where partners upload. Included in the note."
          />
        )}
      </div>
    </Drawer>
  )
}
