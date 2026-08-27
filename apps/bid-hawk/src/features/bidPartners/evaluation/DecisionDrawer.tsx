import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { PartnerDecision, Tender } from '@/types'
import { Button, Checkbox, Drawer, Input } from '@/components/ui'
import { recordDecision } from '@/data/api'
import { pluralise } from '@/lib/format'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import type { ScoredPartner } from './evaluationModel'

export interface DecisionDrawerProps {
  open: boolean
  onClose: () => void
  tender: Tender
  ranked: ScoredPartner[]
  /** Pre-ticked ONLY when the operator arrived by selecting a row. Never the suggestion. */
  initialChosen: string[]
  suggestedPartnerId: string | null
  existing: PartnerDecision | undefined
}

/**
 * Recording the decision.
 *
 * WHEN THE CHOICE DIFFERS FROM THE SUGGESTION there is no warning, no confirmation step,
 * no second dialog and no altered styling. The reason field's helper text is identical
 * whichever partner is chosen: prompting harder for a justification when the user
 * disagrees with the agent would make the agent's view the default and the user's the
 * exception, which is the opposite of advisory.
 *
 * The record states which partner was chosen and, as a plain factual line, which one the
 * agent had suggested. It records the divergence without editorialising about it.
 */
export function DecisionDrawer({
  open,
  onClose,
  tender,
  ranked,
  initialChosen,
  suggestedPartnerId,
  existing,
}: DecisionDrawerProps) {
  const [chosen, setChosen] = useState<string[]>(initialChosen)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setChosen(initialChosen)
    setReason(existing?.reason ?? '')
    setNote(existing?.notSelectedNote ?? '')
  }, [open, initialChosen.join(','), existing?.recordedAt])

  const blocked =
    chosen.length === 0
      ? 'Choose at least one partner to proceed with.'
      : reason.trim() === ''
        ? 'A reason is required.'
        : null

  const save = async () => {
    setSaving(true)
    try {
      await recordDecision({
        rfpId: tender.id,
        chosenPartnerIds: chosen,
        reason: reason.trim(),
        notSelectedNote: note.trim() === '' ? undefined : note.trim(),
        suggestedPartnerId,
        recordedAt: new Date().toISOString(),
      })
      toast.success(
        existing ? 'Decision updated' : `Decision recorded for ${pluralise(chosen.length, 'partner')}`,
        {
          description: existing
            ? 'The previous reason is kept in the decision history.'
            : 'It is on the comparison header and in the evaluation list.',
        },
      )
      onClose()
    } catch {
      toast.error('The decision could not be recorded', { description: 'Nothing was changed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={existing ? 'Change the decision' : 'Record the decision'}
      subheader={
        <span className="numeric font-mono text-metadata text-fg-muted">{tender.tenderRef}</span>
      }
      description="Which partners you are proceeding with, and why."
      footer={
        <Button
          variant="primary"
          loading={saving}
          disabled={blocked !== null}
          iconLeft={<Check size={ICON.md} aria-hidden="true" />}
          onClick={save}
        >
          {existing ? 'Update decision' : 'Record decision'}
        </Button>
      }
    >
      <div className="flex flex-col gap-24">
        <fieldset className="flex flex-col gap-8">
          <legend className="text-micro-label uppercase text-fg-muted">
            Partners to proceed with
          </legend>
          {ranked.map((row, index) => (
            <Checkbox
              key={row.partner.id}
              id={`decide-${row.partner.id}`}
              label={row.partner.name}
              detail={`Rank ${index + 1}, composite ${row.composite}`}
              checked={chosen.includes(row.partner.id)}
              onCheckedChange={(next) =>
                setChosen((current) =>
                  next ? [...current, row.partner.id] : current.filter((id) => id !== row.partner.id),
                )
              }
            />
          ))}
        </fieldset>

        {/* Identical helper text whichever partner is chosen. */}
        <Input
          id="decision-reason"
          label="Reason"
          placeholder="Why these partners, for this tender"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          helper="Recorded with the decision. One or two lines is enough."
          error={undefined}
        />

        <Input
          id="decision-note"
          label="Note on partners not selected"
          placeholder="Optional"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          helper="Optional. Useful when a partner should be approached again on a later tender."
        />

        {existing && existing.history.length > 0 && (
          <div className="flex flex-col gap-8">
            <p className="text-micro-label uppercase text-fg-muted">Decision history</p>
            <ul className="flex flex-col gap-8">
              {existing.history.map((entry) => (
                <li key={entry.recordedAt} className="flex flex-col gap-2 rounded-control bg-surface-sunken p-12">
                  <span className="text-caption text-fg-muted">{entry.recordedAt}</span>
                  <span className="text-secondary-body text-fg-secondary">{entry.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  )
}
