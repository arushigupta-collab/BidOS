import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'

export interface Stage {
  id: string
  icon: LucideIcon
  title: string
  detail: string
}

/**
 * The three stages a module runs, as one connected sequence.
 *
 * Shared, because two modules have three stages each and the band is the same
 * composition in both. The stages themselves belong to the module and arrive as a
 * prop; nothing about Bid Hawk or Bid Partners is known here.
 *
 * Deliberately not three bordered cards. The band is one recessed surface and a
 * single hairline runs between stages, so the three read as parts of one process
 * rather than as three separate things — which is exactly what three cards would
 * say. The connector is the only border, and it separates rather than encloses.
 *
 * NO ORDINALS. This is the band's intended design, not a one-off edit — they have
 * been removed twice now, and returned the second time only because the
 * introduction state was rebuilt from an older version of this file. Do not add
 * them back.
 *
 * The consequence is accepted: unnumbered, the three read as parallel capabilities
 * rather than as a pipeline. Nothing in the band now says that assignation happens
 * after summarisation, which happens after sourcing. The hairlines group the three;
 * they do not order them.
 *
 * Explains HOW the module works. The module's card on the BidOS landing says WHAT
 * it does, which is why both exist and neither repeats the other.
 */
export interface FlowBandProps {
  /** Exactly three, in the order the module runs them. */
  stages: Stage[]
  /** Names the band for assistive technology, e.g. "What Bid Hawk does". */
  label: string
  className?: string
}

export function FlowBand({ stages, label, className }: FlowBandProps) {
  return (
    <section
      aria-label={label}
      className={cn('rounded-card bg-surface-sunken', className)}
    >
      <ol className="flex flex-col lg:flex-row">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className={cn(
              'flex flex-1 flex-col gap-8 p-20',
              // One hairline between stages: below the previous one when stacked,
              // beside it once the band runs horizontally.
              index > 0 && 'border-t border-border lg:border-l lg:border-t-0',
            )}
          >
            {/* Icon and title as one lockup. Tighter than the gap the row used when
                an ordinal sat to the icon's left: with the ordinal gone the icon
                labels the title directly, and at gap-8 the two read as separate
                elements sitting near each other. */}
            <div className="flex items-center gap-4">
              <stage.icon size={ICON.md} aria-hidden="true" className="shrink-0 text-accent" />
              <p className="text-label text-fg">{stage.title}</p>
            </div>

            <p className="text-secondary-body text-fg-muted">{stage.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
