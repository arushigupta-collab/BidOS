import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Inbox } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState } from '@/components/ui'
import { savePartner, updatePartner } from '@/data/api'
import { emailProblem } from '../../../team/personDraft'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import {
  EMPTY_DRAFT,
  coverageProblem,
  draftFromPartner,
  partnerFromDraft,
  teamSizeProblem,
  turnoverProblem,
  type PartnerDraft,
} from '../partnerDraft'
import { PartnerForm } from './PartnerForm'

/**
 * Add and edit are one screen. `/bid-partners/registry/:id/edit` arrives on the same
 * form with the partner's values in it; a second component for the same nine fields
 * would be the worse answer, and is the call already made for /team/:id/edit.
 */
export function AddPartnerPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const partners = useWorkspace((state) => state.partners)
  const existing = useMemo(() => partners.find((row) => row.id === id), [partners, id])
  const editing = id !== undefined

  const [draft, setDraft] = useState<PartnerDraft>(() =>
    existing ? draftFromPartner(existing) : EMPTY_DRAFT,
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingExit, setPendingExit] = useState(false)
  const firstField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstField.current?.focus()
  }, [])

  const dirty = editing
    ? existing !== undefined && JSON.stringify(draft) !== JSON.stringify(draftFromPartner(existing))
    : JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT)

  const valid =
    draft.name.trim() !== '' &&
    draft.contactName.trim() !== '' &&
    emailProblem(draft.contactEmail) === null &&
    coverageProblem(draft) === null &&
    teamSizeProblem(draft.teamSize) === null &&
    turnoverProblem(draft.annualTurnoverCr) === null

  const leave = () => navigate('/bid-partners/registry')

  const save = async () => {
    setSubmitted(true)
    if (!valid) return

    setSaving(true)
    try {
      const partner = partnerFromDraft(draft, existing)
      if (editing) {
        await updatePartner(partner)
        toast.success('Partner updated', { description: `${partner.name} is saved.` })
      } else {
        await savePartner(partner)
        toast.success('Partner registered', {
          description: `${partner.name} is in the registry.`,
        })
      }
      leave()
    } catch {
      toast.error('The partner could not be saved', { description: 'Nothing was changed.' })
    } finally {
      setSaving(false)
    }
  }

  // An edit route pointing at a partner that is gone: say so rather than opening an
  // empty form that would silently create a second record on save.
  if (editing && !existing) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Inbox size={ICON.lg} aria-hidden="true" />}
          title="That partner is not in the registry"
          description="The address did not match a registered partner. They may have been removed, or the link may be out of date."
          action={
            <Button variant="primary" onClick={leave}>
              Back to the registry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="scrollable flex flex-1 flex-col px-24 py-24 md:px-32">
      <div className="mx-auto flex w-full max-w-form flex-col gap-24">
        <div className="flex flex-col gap-4">
          <h1 className="text-page-title text-fg">
            {editing ? `Edit ${existing?.name}` : 'Add partner'}
          </h1>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            What this organisation can do, where it works and who to write to. Capabilities
            and regions are what an RFP is matched against.
          </p>
        </div>

        <PartnerForm
          ref={firstField}
          draft={draft}
          onChange={setDraft}
          submitted={submitted}
          disabled={saving}
        />

        <div className="flex flex-wrap items-center gap-8">
          <Button
            variant="primary"
            loading={saving}
            iconLeft={<Check size={ICON.md} aria-hidden="true" />}
            onClick={save}
          >
            {editing ? 'Save changes' : 'Register partner'}
          </Button>

          {/* Cancel, not Back: it abandons work rather than navigating. */}
          <Button
            variant="ghost"
            iconLeft={<ArrowLeft size={ICON.md} aria-hidden="true" />}
            onClick={() => (dirty ? setPendingExit(true) : leave())}
          >
            Cancel
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingExit}
        onOpenChange={setPendingExit}
        destructive
        title="Leave without saving?"
        description="This partner has not been saved. Leaving now discards what you have entered."
        confirmLabel="Discard and leave"
        onConfirm={leave}
      />
    </div>
  )
}
