import { Inbox } from 'lucide-react'
import { EMPTY_VALUE, formatCount, formatInr } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import type { FeedStats } from './feedModel'

/**
 * A lead metric with secondary stats beside it, on one inset surface. Not five
 * cards: only one of these numbers is the headline and four equal tiles would say
 * otherwise. Only the closing-soon figure takes a colour, because only it is time
 * critical.
 */
export function FeedStatStrip({ stats }: { stats: FeedStats }) {
  const secondary = [
    { label: 'Closing in 7 days', value: formatCount(stats.closingIn7Days), urgent: true },
    { label: 'Assigned today', value: formatCount(stats.assignedToday), urgent: false },
        {
      label: 'Total bid value',
      /**
       * A dash when nothing contributed, not a zero.
       *
       * The total sums the tenders that publish a value and skips the ones that
       * do not. Where none of them do, the sum is genuinely zero and reads as
       * "these tenders are worth nothing" -- which is the same mistake the row
       * cells were fixed for, one level up.
       */
      value: stats.totalValueInr > 0 ? formatInr(stats.totalValueInr) : EMPTY_VALUE,
      urgent: false,
    },
  ]

  return (
    <section
      aria-label="Feed summary"
      className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 lg:flex-row lg:items-center lg:gap-40"
    >
      <div className="flex shrink-0 items-start gap-16">
        <span
          aria-hidden="true"
          className="mt-4 grid h-32 w-32 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
        >
          <Inbox size={ICON.md} />
        </span>

        <div className="flex flex-col gap-4">
          <p className="text-micro-label uppercase text-fg-muted">Total RFPs</p>
          <p className="numeric font-mono text-kpi-value text-fg">{formatCount(stats.total)}</p>
        </div>
      </div>

      <dl className="flex flex-wrap items-baseline gap-x-40 gap-y-16 lg:ml-auto">
        {secondary.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2">
            <dt className="text-micro-label uppercase text-fg-muted">{stat.label}</dt>
            <dd
              className={
                stat.urgent
                  ? 'numeric font-mono text-panel-title text-urgency-warning'
                  : 'numeric font-mono text-panel-title text-fg'
              }
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
