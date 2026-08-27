import type { Tender } from '@/types'
import { formatDateTime, formatInr } from '@/lib/format'
import { ESTIMATED_NOTE } from '../feedColumns'

interface Entry {
  label: string
  value: string
  mono?: boolean
  caption?: string
}

/**
 * The record as published, in two weights.
 *
 * The money and the deadline decide whether to bid, so they lead at KPI size. The
 * rest is reference and reads as reference. Rendering all fourteen fields at one
 * weight made the envelope structure shout as loudly as the submission deadline.
 *
 * A field the tender does not carry is omitted rather than rendered as a dash: a
 * list of dashes reads as missing data when it is simply not part of this tender.
 */
export function RfpSnapshot({ tender }: { tender: Tender }) {
  const lead: Entry[] = [
    {
      label: 'Estimated value',
      value: formatInr(tender.estimatedValueInr),
      caption: tender.valueIsEstimated ? ESTIMATED_NOTE : undefined,
    },
    { label: 'Submission deadline', value: formatDateTime(tender.bidDueAt) },
    ...(tender.emdInr !== null ? [{ label: 'EMD', value: formatInr(tender.emdInr) }] : []),
  ]

  const entries: Entry[] = [
    { label: 'Tender ID', value: tender.tenderRef, mono: true },
    { label: 'Authority', value: tender.issuingAuthority },
    ...(tender.tenderFeeInr !== null
      ? [{ label: 'Tender fee', value: formatInr(tender.tenderFeeInr), mono: true }]
      : []),
    ...(tender.pbg ? [{ label: 'PBG', value: tender.pbg }] : []),
    ...(tender.prebidQueriesDueAt
      ? [
          {
            label: 'Pre-bid queries due',
            value: formatDateTime(tender.prebidQueriesDueAt),
            mono: true,
          },
        ]
      : []),
    ...(tender.prebidConferenceAt
      ? [
          {
            label: 'Pre-bid conference',
            value: formatDateTime(tender.prebidConferenceAt),
            mono: true,
          },
        ]
      : []),
    ...(tender.bidValidity ? [{ label: 'Bid validity', value: tender.bidValidity }] : []),
    ...(tender.contractTerm ? [{ label: 'Contract term', value: tender.contractTerm }] : []),
    ...(tender.selectionMethod
      ? [{ label: 'Selection method', value: tender.selectionMethod }]
      : []),
    ...(tender.consortium ? [{ label: 'Consortium permitted', value: tender.consortium }] : []),
    ...(tender.envelopes ? [{ label: 'Envelope structure', value: tender.envelopes }] : []),
  ]

  return (
    <section
      aria-label="RFP snapshot"
      className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20"
    >
      <h2 className="text-micro-label uppercase text-fg-muted">RFP snapshot</h2>

      <dl className="flex flex-col gap-20">
        {lead.map((entry) => (
          <div key={entry.label} className="flex flex-col gap-4">
            <dt className="text-micro-label uppercase text-fg-muted">{entry.label}</dt>
            <dd className="numeric font-mono text-kpi-value text-fg">{entry.value}</dd>
            {entry.caption && <p className="text-caption text-fg-muted">{entry.caption}</p>}
          </div>
        ))}
      </dl>

      {/* The one border that earns its place here: it separates two weights, not
          two groups of the same weight. */}
      <dl className="flex flex-col gap-16 border-t border-border pt-20">
        {entries.map((entry) => (
          <div key={entry.label} className="flex flex-col gap-2">
            <dt className="text-micro-label uppercase text-fg-muted">{entry.label}</dt>
            <dd
              className={
                entry.mono
                  ? 'numeric font-mono text-secondary-body-strong text-fg-secondary'
                  : 'text-secondary-body-strong text-fg-secondary'
              }
            >
              {entry.value}
            </dd>
            {entry.caption && <p className="text-caption text-fg-muted">{entry.caption}</p>}
          </div>
        ))}
      </dl>
    </section>
  )
}
