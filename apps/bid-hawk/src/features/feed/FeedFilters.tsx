import { X } from 'lucide-react'
import type { Source } from '@/types'
import { Button, Chip, Separator } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatCount, pluralise } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import {
  DEADLINE_LABELS,
  NO_FILTERS,
  activeFilterCount,
  type DeadlineWindow,
  type FeedFilters as Filters,
} from './feedModel'

export interface FeedFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  sources: Source[]
  resultCount: number
}

const DEADLINE_ORDER: DeadlineWindow[] = ['any', '72h', '7d', '30d']

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-control-sm rounded-field px-12 text-label transition-colors duration-micro ease-out',
        active
          ? 'bg-primary-subtle text-primary'
          : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Grouped filters, separated by rule: where it came from and when it closes. Active
 * ones repeat as removable chips, so what is being excluded is visible without
 * reading the controls back.
 *
 * There is no assignment filter. Every RFP has an owner, so "assigned" would select
 * all fourteen and "unassigned" none.
 */
export function FeedFilters({ filters, onChange, sources, resultCount }: FeedFiltersProps) {
  const active = activeFilterCount(filters)
  const source = sources.find((row) => row.id === filters.sourceId)

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-12">
        <span className="text-micro-label uppercase text-fg-muted">Source</span>
        <Toggle active={filters.sourceId === null} onClick={() => onChange({ ...filters, sourceId: null })}>
          Any
        </Toggle>
        {sources.map((row) => (
          <Toggle
            key={row.id}
            active={filters.sourceId === row.id}
            onClick={() => onChange({ ...filters, sourceId: row.id })}
          >
            {row.name}
          </Toggle>
        ))}

        <Separator orientation="vertical" className="mx-8 hidden h-16 sm:block" />

        <span className="text-micro-label uppercase text-fg-muted">Deadline</span>
        {DEADLINE_ORDER.map((window) => (
          <Toggle
            key={window}
            active={filters.deadline === window}
            onClick={() => onChange({ ...filters, deadline: window })}
          >
            {window === 'any' ? 'Any' : DEADLINE_LABELS[window]}
          </Toggle>
        ))}

        <p className="ml-auto text-metadata text-fg-muted">
          {`${formatCount(resultCount)} ${pluralise(resultCount, 'result').replace(/^\d+\s/, '')}`}
        </p>
      </div>

      {active > 0 && (
        <div className="flex flex-wrap items-center gap-8">
          {source && (
            <Chip tone="selected" onRemove={() => onChange({ ...filters, sourceId: null })}>
              {source.name}
            </Chip>
          )}
          {filters.deadline !== 'any' && (
            <Chip tone="selected" onRemove={() => onChange({ ...filters, deadline: 'any' })}>
              {DEADLINE_LABELS[filters.deadline]}
            </Chip>
          )}
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<X size={ICON.sm} aria-hidden="true" />}
            onClick={() => onChange(NO_FILTERS)}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
