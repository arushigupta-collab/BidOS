import { createColumnHelper } from '@tanstack/react-table'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Avatar, Badge, Chip, Countdown, Tooltip } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatInr } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import type { FeedRow } from './feedModel'

const column = createColumnHelper<FeedRow>()

const VISIBLE_KEYWORDS = 2

/** Same contract as the sources and people tables, so all three read alike. */
export interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

export const ESTIMATED_NOTE = 'Estimated. Not published in the RFP.'

/**
 * Risk count on the title, not in a column of its own: nine of the fourteen RFPs
 * carry none, and a column that is empty two rows in three reads as broken data.
 * It sits under the title because that is where the eye already is.
 */
function RiskCount({ count, severity }: { count: number; severity: 'high' | 'medium' | 'low' }) {
  const label = count === 1 ? '1 risk flag' : `${count} risk flags`

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-4 text-metadata-strong',
        severity === 'high' ? 'text-destructive' : 'text-urgency-warning',
      )}
    >
      <AlertTriangle size={ICON.xs} aria-hidden="true" className="shrink-0" />
      {label}
    </span>
  )
}

export function buildFeedColumns(sourcePlatform: (sourceId: string) => string) {
  return [
    column.accessor((row) => row.tender.title, {
      id: 'tender',
      header: 'Tender',
      cell: (info) => {
        const { tender } = info.row.original
        const risks = tender.riskFlags
        return (
          <div className="flex min-w-0 max-w-col-title flex-col gap-4">
            {/* Two lines, then truncated, with the whole title on hover. */}
            <span title={tender.title} className="line-clamp-2 text-body-strong text-fg">
              {tender.title}
            </span>
            <span className="font-mono text-metadata text-fg-muted">{tender.tenderRef}</span>
            {risks.length > 0 && (
              <RiskCount
                count={risks.length}
                severity={risks.some((flag) => flag.severity === 'high') ? 'high' : 'medium'}
              />
            )}
          </div>
        )
      },
    }),

    column.accessor((row) => row.tender.sourceId, {
      id: 'source',
      header: 'Source',
      meta: { className: 'hidden lg:table-cell' } satisfies ColumnMeta,
      cell: (info) => <Badge tone="neutral">{sourcePlatform(info.getValue() as string)}</Badge>,
    }),

    column.accessor((row) => row.tender.issuingAuthority, {
      id: 'authority',
      header: 'Authority',
      meta: { className: 'hidden xl:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span
          title={info.getValue() as string}
          className="block max-w-col-reason truncate text-body text-fg-secondary"
        >
          {info.getValue() as string}
        </span>
      ),
    }),

    column.accessor((row) => row.tender.estimatedValueInr, {
      id: 'value',
      header: 'Bid value',
      meta: { align: 'right', className: 'hidden sm:table-cell' } satisfies ColumnMeta,
      cell: (info) => {
        const { tender } = info.row.original
        return (
          <span className="inline-flex items-center gap-4">
            <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
              {formatInr(tender.estimatedValueInr)}
            </span>
            {tender.valueIsEstimated && (
              <Tooltip content={ESTIMATED_NOTE}>
                <button
                  type="button"
                  aria-label={ESTIMATED_NOTE}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-field text-accent"
                >
                  <Sparkles size={ICON.xs} aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </span>
        )
      },
    }),

    column.accessor((row) => new Date(row.tender.bidDueAt).getTime(), {
      id: 'deadline',
      header: 'Deadline',
      cell: (info) => {
        const { tender } = info.row.original
        return <Countdown target={tender.bidDueAt} showAbsolute />
      },
    }),

    column.accessor((row) => row.tender.matchedKeywords, {
      id: 'keywords',
      header: 'Matched keywords',
      enableSorting: false,
      meta: { className: 'hidden xl:table-cell' } satisfies ColumnMeta,
      cell: (info) => {
        const keywords = info.getValue() as string[]
        const shown = keywords.slice(0, VISIBLE_KEYWORDS)
        const hidden = keywords.length - shown.length

        return (
          <div className="flex flex-wrap items-center gap-4">
            {shown.map((keyword) => (
              <Chip key={keyword}>{keyword}</Chip>
            ))}
            {hidden > 0 && (
              <Tooltip content={keywords.join(', ')}>
                <button
                  type="button"
                  className="rounded-field px-4 py-2 text-metadata-strong text-fg-muted underline decoration-border underline-offset-2 hover:text-fg"
                >
                  {`+${hidden}`}
                </button>
              </Tooltip>
            )}
          </div>
        )
      },
    }),

    // The owner, and nothing about how the owner was chosen. Routing still runs on
    // domain and region; the product does not narrate its own logic back.
    column.accessor((row) => row.match.person.name, {
      id: 'assignee',
      header: 'Assigned to',
      meta: { className: 'hidden md:table-cell' } satisfies ColumnMeta,
      cell: (info) => {
        const { person } = info.row.original.match
        return (
          <div className="flex min-w-0 items-center gap-8">
            <Avatar name={person.name} size="xs" />
            <span className="truncate text-body text-fg">{person.name}</span>
          </div>
        )
      },
    }),
  ]
}
