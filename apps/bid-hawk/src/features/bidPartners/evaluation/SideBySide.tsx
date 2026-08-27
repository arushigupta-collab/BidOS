import type { Tender } from '@/types'
import { Check } from 'lucide-react'
import { EMPTY_VALUE, formatInr } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import { cn } from '@/lib/cn'
import type { ScoredPartner } from './evaluationModel'

interface Attribute {
  label: string
  value: (row: ScoredPartner) => string
  /** Higher is better, lower is better, or not comparable. */
  best?: 'high' | 'low'
  compare?: (row: ScoredPartner) => number
}

/**
 * The top three compared attribute by attribute.
 *
 * An ALIGNED ATTRIBUTE BLOCK with partners as columns, not three cards. Three identical
 * bordered cards side by side is on CLAUDE.md's forbidden list, and it is also the wrong
 * shape for this job: comparing turnover across three cards means reading three separate
 * places, whereas one row per attribute puts the three figures beside each other where
 * the difference is the point.
 *
 * The strongest value on each comparable attribute carries a quiet tick. Not a colour
 * fill, not the accent: it marks a fact, and several of these attributes have no
 * "better" at all.
 */
export function SideBySide({ rows, tender }: { rows: ScoredPartner[]; tender: Tender }) {
  const top = rows.slice(0, 3)
  if (top.length === 0) return null

  const attributes: Attribute[] = [
    { label: 'Capabilities', value: (r) => r.partner.capabilities.join(', ') },
    { label: 'Regions', value: (r) => r.partner.regions.join(', ') },
    { label: 'Team size', value: (r) => String(r.partner.teamSize), best: 'high', compare: (r) => r.partner.teamSize },
    {
      label: 'Annual turnover',
      value: (r) => formatInr(r.partner.annualTurnoverCr * 1_00_00_000),
      best: 'high',
      compare: (r) => r.partner.annualTurnoverCr,
    },
    { label: 'Certifications', value: (r) => r.partner.certifications.join(', ') },
    {
      label: 'Technical stack',
      value: (r) => (r.partner.technicalStack.length === 0 ? EMPTY_VALUE : r.partner.technicalStack.join(', ')),
    },
    {
      label: 'Comparable scope',
      // No tick. "Has delivered at this scale" is a yes or no, and ticking the yes would
      // read as a score on an attribute that is really a gate.
      value: (r) => r.partner.comparableScopeNote,
    },
    { label: 'Empanelments', value: (r) => r.partner.empanelment.join(', ') },
    {
      label: 'Quoted value',
      // Unquoted shows a dash, never a zero that would read as the cheapest.
      value: (r) =>
        r.unquoted ? `${EMPTY_VALUE}  Not quoted` : formatInr((r.invitation.quotedValueCr as number) * 1_00_00_000),
      // NO TICK. The cheapest quote is not the strongest quote, and this page proves it:
      // the lowest figure in the set is the one the risk panel flags as high severity
      // for excluding data migration and the O&M term. Ticking it as best here while
      // flagging it as a defect there would make the page contradict itself on the same
      // number. Commercials are weighted in the composite; that is where price counts.
    },
    {
      label: 'Past performance',
      value: (r) => `${r.partner.rating} of 5`,
      best: 'high',
      compare: (r) => r.partner.rating,
    },
    {
      label: 'On-time delivery',
      value: (r) => `${r.partner.onTimeDeliveryPct} per cent`,
      best: 'high',
      compare: (r) => r.partner.onTimeDeliveryPct,
    },
    {
      label: 'Projects delivered',
      value: (r) => String(r.partner.projectsDelivered),
      best: 'high',
      compare: (r) => r.partner.projectsDelivered,
    },
    {
      // "Documentation", matching the ranked table's column for this exact figure. It read
      // "Documents received" and was the only place in the product still using that phrase
      // after aggregate document counts were removed; naming it after its criterion clears
      // that and fixes the inconsistency with the table above it. The DATA is unchanged and
      // stays: it is per-partner, one figure per column, not an aggregate.
      label: 'Documentation',
      value: (r) => `${r.documentation.received} of ${r.documentation.requested}`,
      best: 'high',
      compare: (r) => r.documentation.received / Math.max(1, r.documentation.requested),
    },
  ]

  const bestIndex = (attribute: Attribute) => {
    if (!attribute.compare || !attribute.best) return -1
    const values = top.map(attribute.compare)
    const target = attribute.best === 'high' ? Math.max(...values) : Math.min(...values)
    if (!Number.isFinite(target)) return -1
    return values.indexOf(target)
  }

  return (
    <section aria-labelledby="side-by-side" className="flex flex-col gap-12">
      <div className="flex flex-wrap items-baseline justify-between gap-8">
        <h2 id="side-by-side" className="text-section-title text-fg">
          {top.length === 3 ? 'Top three, side by side' : `The ${top.length} that responded, side by side`}
        </h2>
        {top.length < 3 && (
          <p className="text-metadata text-fg-muted">
            {`Fewer than three partners have responded to ${tender.tenderRef}, so this compares what exists.`}
          </p>
        )}
      </div>

      <div className="scrollable-none overflow-hidden rounded-card bg-surface-sunken">
        <dl className="flex flex-col">
          <div
            className="grid gap-x-16 border-b border-border px-16 py-12"
            style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${top.length}, minmax(0,1.6fr))` }}
          >
            <span className="text-micro-label uppercase text-fg-muted">Attribute</span>
            {top.map((row, index) => (
              <span key={row.partner.id} className="flex min-w-0 flex-col gap-2">
                <span className="numeric font-mono text-metadata text-fg-muted">{`Rank ${index + 1}`}</span>
                <span className="text-body-strong text-fg">{row.partner.name}</span>
              </span>
            ))}
          </div>

          {attributes.map((attribute, attributeIndex) => {
            const winner = bestIndex(attribute)
            return (
              <div
                key={attribute.label}
                className={cn(
                  'grid gap-x-16 px-16 py-12',
                  attributeIndex % 2 === 1 && 'bg-surface',
                )}
                style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${top.length}, minmax(0,1.6fr))` }}
              >
                <dt className="text-micro-label uppercase text-fg-muted">{attribute.label}</dt>
                {top.map((row, index) => (
                  <dd
                    key={row.partner.id}
                    className={cn(
                      'flex min-w-0 items-start gap-4 text-secondary-body',
                      index === winner ? 'text-fg' : 'text-fg-secondary',
                    )}
                  >
                    {index === winner && (
                      <Check size={ICON.xs} aria-label="strongest on this attribute" className="mt-4 shrink-0 text-success" />
                    )}
                    <span className="min-w-0">{attribute.value(row)}</span>
                  </dd>
                ))}
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
