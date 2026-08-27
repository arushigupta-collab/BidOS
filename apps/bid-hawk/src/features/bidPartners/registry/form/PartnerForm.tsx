import { forwardRef } from 'react'
import { Input, Select, TagField } from '@/components/ui'
import { DOMAIN_EXPERTISE, REGION_STATES, REGION_ZONES } from '@/data/seed/vocabulary'
import { emailError } from '../../../team/personDraft'
import {
  CERTIFICATIONS,
  EMPANELMENTS,
  PARTNER_TYPES,
  coverageProblem,
  teamSizeProblem,
  turnoverProblem,
  INDUSTRIES,
  type PartnerDraft,
} from '../partnerDraft'

export interface PartnerFormProps {
  draft: PartnerDraft
  onChange: (draft: PartnerDraft) => void
  /** True once a save has been attempted, so nothing is accused before then. */
  submitted: boolean
  disabled?: boolean
}

const CAPABILITY_GROUPS = [{ label: 'Capabilities', items: DOMAIN_EXPERTISE }]
const REGION_GROUPS = [
  { label: 'Zones', items: REGION_ZONES },
  { label: 'States', items: REGION_STATES },
]

/**
 * One column at the editorial measure, mirroring /team/new. Not a modal: this is nine
 * fields, and CLAUDE.md puts a long form on a page rather than in a dialog.
 *
 * Capabilities and regions reuse the vocabularies the people screens use, so a partner
 * and a bid manager are described in the same terms.
 */
export const PartnerForm = forwardRef<HTMLInputElement, PartnerFormProps>(function PartnerForm(
  { draft, onChange, submitted, disabled = false },
  ref,
) {
  const set = <K extends keyof PartnerDraft>(key: K, value: PartnerDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const coverage = coverageProblem(draft)
  const showCoverage = submitted && coverage !== null

  return (
    <div className="flex flex-col gap-20">
      <Input
        ref={ref}
        id="partner-name"
        label="Partner name"
        placeholder="Arkavati Systems Limited"
        value={draft.name}
        disabled={disabled}
        onChange={(event) => set('name', event.target.value)}
        error={submitted && draft.name.trim() === '' ? 'A partner needs a name.' : undefined}
      />

      <Select
        id="partner-type"
        label="Partner type"
        options={PARTNER_TYPES.map((value) => ({ value, label: value }))}
        value={draft.type}
        disabled={disabled}
        onValueChange={(value) => set('type', value as PartnerDraft['type'])}
        helper="What kind of organisation this is, which is how the registry groups them."
      />

      <Select
        id="partner-industry"
        label="Industry"
        options={INDUSTRIES.map((value) => ({ value, label: value }))}
        value={draft.industry}
        disabled={disabled}
        onValueChange={(value) => set('industry', value)}
        helper="Which tenders this partner is shown against. An RFP is routed to the partners registered under its own industry."
      />

      <Input
        id="partner-contact"
        label="Contact person"
        placeholder="Rohit Deshmukh"
        value={draft.contactName}
        disabled={disabled}
        onChange={(event) => set('contactName', event.target.value)}
        error={
          submitted && draft.contactName.trim() === ''
            ? 'An invitation needs somebody to address.'
            : undefined
        }
      />

      <Input
        id="partner-email"
        label="Contact email"
        placeholder="rohit.deshmukh@arkavatisystems.in"
        value={draft.contactEmail}
        disabled={disabled}
        onChange={(event) => set('contactEmail', event.target.value)}
        helper="Where an RFP invitation is sent."
        error={submitted ? emailError(draft.contactEmail) : undefined}
      />

      {/* The rule is about the pair, so the message sits between them rather than
          accusing either one of being empty. Same behaviour as /team/new. */}
      <div className="flex flex-col gap-12">
        <TagField
          id="partner-capabilities"
          label="Capabilities"
          values={draft.capabilities}
          onChange={(values) => set('capabilities', values)}
          groups={CAPABILITY_GROUPS}
          placeholder="Add a capability, or pick one below"
          disabled={disabled}
        />

        <TagField
          id="partner-regions"
          label="Regions"
          values={draft.regions}
          onChange={(values) => set('regions', values)}
          groups={REGION_GROUPS}
          placeholder="Add a zone or state, or pick one below"
          disabled={disabled}
        />

        <p
          role={showCoverage ? 'alert' : undefined}
          className={
            showCoverage
              ? 'rounded-control bg-destructive-subtle px-12 py-8 text-secondary-body text-destructive'
              : 'text-helper text-fg-muted'
          }
        >
          {coverage ??
            'At least one capability or one region. Either alone is enough; both is better.'}
        </p>
      </div>

      <Input
        id="partner-team-size"
        label="Team size"
        inputMode="numeric"
        placeholder="120"
        mono
        value={draft.teamSize}
        disabled={disabled}
        onChange={(event) => set('teamSize', event.target.value)}
        error={submitted ? (teamSizeProblem(draft.teamSize) ?? undefined) : undefined}
      />

      <Input
        id="partner-turnover"
        label="Annual turnover"
        inputMode="numeric"
        placeholder="84"
        mono
        iconLeft={<span className="text-metadata text-fg-muted">INR</span>}
        addonRight={<span className="text-metadata text-fg-muted">Cr</span>}
        value={draft.annualTurnoverCr}
        disabled={disabled}
        onChange={(event) => set('annualTurnoverCr', event.target.value)}
        onBlur={() => {
          // Grouped on blur, so the operator types digits and reads a number.
          const parsed = Number(draft.annualTurnoverCr.replace(/[, ]/g, ''))
          if (Number.isFinite(parsed) && draft.annualTurnoverCr.trim() !== '') {
            set('annualTurnoverCr', parsed.toLocaleString('en-IN'))
          }
        }}
        helper="In crore. The registry shows it with Indian digit grouping."
        error={submitted ? (turnoverProblem(draft.annualTurnoverCr) ?? undefined) : undefined}
      />

      <TagField
        id="partner-certifications"
        label="Certifications"
        values={draft.certifications}
        onChange={(values) => set('certifications', values)}
        groups={[{ label: 'Common certifications', items: CERTIFICATIONS }]}
        placeholder="Add a certification, or pick one below"
        helper="Optional. Several central tenders require ISO 27001 or a CMMI level."
        disabled={disabled}
      />

      <TagField
        id="partner-empanelments"
        label="Empanelments"
        values={draft.empanelment}
        onChange={(values) => set('empanelment', values)}
        groups={[{ label: 'Government buyer empanelment', items: EMPANELMENTS }]}
        placeholder="Add an empanelment, or pick one below"
        helper="Optional. What this partner is already registered for with a government buyer."
        disabled={disabled}
      />
    </div>
  )
})
