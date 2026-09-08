import { Users } from 'lucide-react'
import type { Person } from '@/types'
import { formatCount, pluralise } from '@/lib/format'
import { ICON } from '@/lib/tokens'

/**
 * A lead metric with one secondary stat beside it, on a single inset surface. The
 * same construction as the Sources summary, for the same reason: two numbers do
 * not need four equal tiles.
 */
export function PeopleSummary({ people }: { people: Person[] }) {
  const domains = new Set(people.flatMap((person) => person.domains))
  const regionOnly = people.filter((person) => person.domains.length === 0).length

  return (
    <section
      aria-label="People summary"
      className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 sm:flex-row sm:items-center sm:gap-40"
    >
      <div className="flex shrink-0 items-start gap-16">
        <span
          aria-hidden="true"
          className="mt-4 grid h-32 w-32 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
        >
          <Users size={ICON.md} />
        </span>

        <div className="flex flex-col gap-4">
          <p className="text-micro-label uppercase text-fg-muted">Account Executives</p>
          <p className="flex items-baseline gap-8">
            <span className="numeric font-mono text-kpi-value text-fg">
              {formatCount(people.length)}
            </span>
            <span className="text-secondary-body text-fg-muted">
              {regionOnly === 0
                ? 'all with a domain'
                : `${formatCount(regionOnly)} by region only`}
            </span>
          </p>
        </div>
      </div>

      <dl className="flex flex-wrap items-baseline gap-x-40 gap-y-16 sm:ml-auto">
        <div className="flex flex-col gap-2">
          <dt className="text-micro-label uppercase text-fg-muted">Domains covered</dt>
          <dd className="numeric font-mono text-panel-title text-fg">
            {pluralise(domains.size, 'domain')}
          </dd>
        </div>
      </dl>
    </section>
  )
}
