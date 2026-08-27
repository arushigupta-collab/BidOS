import { Layers } from 'lucide-react'
import type { Source } from '@/types'
import { formatCount, pluralise } from '@/lib/format'
import { ICON } from '@/lib/tokens'

/**
 * A lead metric with one secondary stat beside it, on a single inset surface.
 * Not a row of cards: there are two numbers here and four equal tiles would
 * invent importance that does not exist.
 */
export function SourcesSummary({ sources }: { sources: Source[] }) {
  const platforms = new Set(sources.map((source) => source.platformId))
  const paused = sources.filter((source) => source.status === 'paused').length

  return (
    <section
      aria-label="Source summary"
      className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 sm:flex-row sm:items-center sm:gap-40"
    >
      <div className="flex shrink-0 items-start gap-16">
        <span
          aria-hidden="true"
          className="mt-4 grid h-32 w-32 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
        >
          <Layers size={ICON.md} />
        </span>

        <div className="flex flex-col gap-4">
          <p className="text-micro-label uppercase text-fg-muted">Connected sources</p>
          <p className="flex items-baseline gap-8">
            <span className="numeric font-mono text-kpi-value text-fg">
              {formatCount(sources.length)}
            </span>
            <span className="text-secondary-body text-fg-muted">
              {paused === 0
                ? 'all reading'
                : `${formatCount(paused)} paused`}
            </span>
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap items-baseline gap-x-40 gap-y-16 sm:ml-auto">
        <div className="flex flex-col gap-2">
          <dt className="text-micro-label uppercase text-fg-muted">Platforms</dt>
          <dd className="numeric font-mono text-panel-title text-fg">
            {pluralise(platforms.size, 'platform')}
          </dd>
        </div>
      </dl>
    </section>
  )
}
