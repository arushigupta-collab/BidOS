import { forwardRef } from 'react'
import { ArrowLeft, Plus, Upload } from 'lucide-react'
import {
  Button,
  Input,
  TagField,
  PasswordInput,
  Select,
  Tooltip,
} from '@/components/ui'
import { PLATFORM_OPTIONS, PLATFORMS_BY_ID } from '@/data/seed/platforms'
import { PRACTICE_AREAS } from '@/data/seed/vocabulary'
import { ICON } from '@/lib/tokens'
import {
  idLabelFor,
  missingFrom,
  sentenceList,
  type SourceDraft,
} from '../sourceDraft'

export interface SourceFormProps {
  draft: SourceDraft
  patch: (patch: Partial<SourceDraft>) => void
  onPlatformChange: (platformId: string) => void
  onOpenImport: () => void
  onBack: () => void
  onSubmit: () => void
  saving: boolean
}

export const SourceForm = forwardRef<HTMLButtonElement, SourceFormProps>(function SourceForm(
  { draft, patch, onPlatformChange, onOpenImport, onBack, onSubmit, saving },
  ref,
) {
  const platform = PLATFORMS_BY_ID.get(draft.platformId)
  const missing = missingFrom(draft)
  const ready = missing.length === 0

  // The field filters against what is already chosen, so it takes the full list.
  const suggestions = PRACTICE_AREAS.flatMap((area) => area.keywords)

  return (
    <div className="flex flex-col gap-32">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div className="flex flex-col gap-8">
          <h2 className="text-section-title text-fg">New source</h2>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            Five fields, all required. The platform decides the listing page, and the keywords
            decide what is kept.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Upload size={ICON.sm} aria-hidden="true" />}
          onClick={onOpenImport}
        >
          Import CSV or Excel
        </Button>
      </div>

      {/* One inset surface holds the five fields. The grouping is the tone and the
          spacing; an outline around each field would make five boxes of a form. */}
      <div className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 md:p-24">
        <Select
          id="platform"
          label="Platform"
          placeholder="Choose a platform"
          options={PLATFORM_OPTIONS}
          value={draft.platformId}
          onValueChange={onPlatformChange}
          helper="The platform this source reads from."
        />

        <Input
          id="listing-url"
          label="Listing URL"
          mono
          value={draft.url}
          onChange={(event) => patch({ url: event.target.value })}
          placeholder="https://"
          helper="The search or listing page to read."
          error={
            draft.platformId !== '' && draft.url.trim() === ''
              ? 'A listing URL is required.'
              : undefined
          }
        />

        {/* The identifier and its password are one credential, so they sit
            together with nothing between them. */}
        <Input
          id="registered-id"
          label={idLabelFor(draft.platformId)}
          value={draft.registeredId}
          onChange={(event) => patch({ registeredId: event.target.value })}
          placeholder={platform?.id === 'gem' ? 'GEM-SLR-' : ''}
          helper="Used to recognise listings this workspace is eligible for."
          error={
            draft.platformId !== '' && draft.registeredId.trim() === ''
              ? 'An identifier is required.'
              : undefined
          }
        />

        <PasswordInput
          id="password"
          label="Password"
          value={draft.password}
          onChange={(password) => patch({ password })}
          helper="Pairs with the registered ID above. Written to the workspace vault on save and never displayed again."
          error={
            draft.registeredId.trim() !== '' && draft.password === ''
              ? 'A password is required.'
              : undefined
          }
        />

        <TagField
          id="keywords"
          label="Keywords"
          values={draft.keywords}
          onChange={(keywords: string[]) => patch({ keywords })}
          groups={[{ label: 'Suggested', items: suggestions }]}
          placeholder="Add a keyword, or pick one below"
          duplicateMessage="That keyword is already tracked"
          helper="Press Enter to add a keyword, or choose from your practice areas. A listing is kept when it matches at least one keyword."
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-8">
        <Button
          variant="ghost"
          iconLeft={<ArrowLeft size={ICON.md} aria-hidden="true" />}
          onClick={onBack}
        >
          Back
        </Button>

        {ready ? (
          <Button
            ref={ref}
            variant="primary"
            loading={saving}
            iconLeft={<Plus size={ICON.md} aria-hidden="true" />}
            onClick={onSubmit}
          >
            Add source
          </Button>
        ) : (
          <Tooltip
            content={`Still to do: ${sentenceList(missing.map((item) => item.label))}.`}
            wrapDisabled
          >
            <Button variant="primary" disabled iconLeft={<Plus size={ICON.md} aria-hidden="true" />}>
              Add source
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  )
})
