import { forwardRef } from 'react'
import { ArrowLeft, BadgeCheck, Check, Plus, Upload } from 'lucide-react'
import { Button, Input, TagField, Tooltip } from '@/components/ui'
import { PERSON_ROLE } from '@/types'
import { ICON } from '@/lib/tokens'
import {
  DOMAIN_GROUPS,
  REGION_GROUPS,
  emailError,
  expertiseMissing,
  missingFrom,
  sentenceList,
  type PersonDraft,
} from '../personDraft'

export interface PersonFormProps {
  draft: PersonDraft
  patch: (patch: Partial<PersonDraft>) => void
  onOpenImport: () => void
  onBack: () => void
  onSubmit: () => void
  saving: boolean
  /** Set when editing, which changes the heading and the primary label only. */
  editingName?: string
}

const EXPERTISE_HINT =
  'At least one area of expertise is needed for routing. Either field alone is enough.'

export const PersonForm = forwardRef<HTMLButtonElement, PersonFormProps>(function PersonForm(
  { draft, patch, onOpenImport, onBack, onSubmit, saving, editingName },
  ref,
) {
  const missing = missingFrom(draft)
  const ready = missing.length === 0
  const editing = Boolean(editingName)
  // Escalates only when expertise is the last thing outstanding.
  const blocking = expertiseMissing(draft) && missing.length === 1

  return (
    <div className="flex flex-col gap-32">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div className="flex flex-col gap-8">
          <h2 className="text-section-title text-fg">
            {editing ? `Edit ${editingName}` : 'New person'}
          </h2>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            Name and email are required, plus at least one area of expertise across the two
            fields.
          </p>
        </div>

        {!editing && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Upload size={ICON.sm} aria-hidden="true" />}
            onClick={onOpenImport}
          >
            Import CSV
          </Button>
        )}
      </div>

      {/* One inset surface holds the fields. The grouping is the tone and the
          spacing; an outline around each field would make boxes of a form. */}
      <div className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 md:p-24">
        {/* Not a select: there is one role, and a control offering one option asks
            a question that has no second answer. */}
        <div className="flex flex-col gap-4">
          <p className="text-label text-fg-secondary">Role</p>
          <div className="flex h-control-md items-center gap-8 rounded-field bg-surface-inset px-12">
            <BadgeCheck size={ICON.sm} aria-hidden="true" className="shrink-0 text-fg-muted" />
            <p className="text-body text-fg-secondary">{PERSON_ROLE}</p>
          </div>
          <p className="text-helper text-fg-muted">
            Everyone added here is an Account Executive. There is no second role.
          </p>
        </div>

        <Input
          id="person-name"
          label="Name"
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="Ananya Deshpande"
          helper="As it should appear on an assignment."
          error={
            draft.email.trim() !== '' && draft.name.trim() === '' ? 'A name is required.' : undefined
          }
        />

        <Input
          id="person-email"
          label="Email"
          type="email"
          mono
          value={draft.email}
          onChange={(event) => patch({ email: event.target.value })}
          placeholder="ananya.deshpande@meridianinfratech.in"
          helper="Used for assignment notifications."
          error={emailError(draft.email)}
        />

        {/* The rule is on the pair, so the message sits with the pair rather than
            accusing one of the two fields of being empty. */}
        <div className="flex flex-col gap-16">
          <TagField
            id="domains"
            label="Domain expertise"
            values={draft.domains}
            onChange={(domains) => patch({ domains })}
            groups={DOMAIN_GROUPS}
            placeholder="Add a domain, or pick one below"
            duplicateMessage="That domain is already listed"
            helper="What this person can bid on."
          />

          <TagField
            id="regions"
            label="Regional expertise"
            values={draft.regions}
            onChange={(regions) => patch({ regions })}
            groups={REGION_GROUPS}
            placeholder="Add a zone or state, or pick one below"
            duplicateMessage="That region is already listed"
            helper="Zones, states, or a mix of both."
          />

          {/* Stated quietly as a rule. It only escalates once the operator has
              filled the rest and this is the one thing left. */}
          <p
            className={
              blocking
                ? 'rounded-control bg-warning-subtle px-12 py-8 text-secondary-body text-warning'
                : 'text-helper text-fg-muted'
            }
          >
            {EXPERTISE_HINT}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-8">
        <Button
          variant="ghost"
          iconLeft={<ArrowLeft size={ICON.md} aria-hidden="true" />}
          onClick={onBack}
        >
          {/* Two destinations need two labels: on the add route this returns to
              the fork, on the edit route it leaves the record. */}
          {editing ? 'Cancel' : 'Back'}
        </Button>

        {ready ? (
          <Button
            ref={ref}
            variant="primary"
            loading={saving}
            iconLeft={
              editing ? (
                <Check size={ICON.md} aria-hidden="true" />
              ) : (
                <Plus size={ICON.md} aria-hidden="true" />
              )
            }
            onClick={onSubmit}
          >
            {editing ? 'Save changes' : 'Add person'}
          </Button>
        ) : (
          <Tooltip
            content={`Still to do: ${sentenceList(missing.map((item) => item.label))}.`}
            wrapDisabled
          >
            <Button
              variant="primary"
              disabled
              iconLeft={
                editing ? (
                  <Check size={ICON.md} aria-hidden="true" />
                ) : (
                  <Plus size={ICON.md} aria-hidden="true" />
                )
              }
            >
              {editing ? 'Save changes' : 'Add person'}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  )
})
