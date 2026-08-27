import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui'
import { EMPTY_VALUE, formatInr } from '@/lib/format'
import type { Partner, PartnerDecision } from '@/types'
import type { EvaluationRow } from './evaluationModel'

export interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

const CRORE = 1_00_00_000

/**
 * The evaluation list's columns.
 *
 * The suggested partner is computed at the DEFAULT weights and the column header says
 * so. Any other reading would be dishonest: the weights are adjustable on the comparison
 * page, and a suggestion with no stated weighting has no stated basis.
 */
export function evaluationColumns(
  partners: Partner[],
  decisions: PartnerDecision[],
): ColumnDef<EvaluationRow>[] {
  return [
        {
          id: 'tender',
          header: 'Tender',
          accessorFn: (row: EvaluationRow) => row.tender.title,
          cell: ({ row }: { row: { original: EvaluationRow } }) => (
            <div className="flex min-w-0 max-w-col-title flex-col gap-2">
              <span
                title={row.original.tender.title}
                className="line-clamp-2 text-body-strong text-fg"
              >
                {row.original.tender.title}
              </span>
              <span className="font-mono text-metadata text-fg-muted">
                {row.original.tender.tenderRef}
              </span>
            </div>
          ),
        },
        {
          id: 'responded',
          header: 'Responded',
          accessorFn: (row: EvaluationRow) => row.responded,
          meta: { align: 'right', className: 'hidden md:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: EvaluationRow } }) => (
            <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
              {`${row.original.responded} of ${row.original.invited}`}
            </span>
          ),
        },
        {
          id: 'quotes',
          header: 'Quotes received',
          accessorFn: (row: EvaluationRow) => row.quotesReceived,
          meta: { align: 'right', className: 'hidden lg:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: EvaluationRow } }) => (
            <span className="numeric font-mono text-table-cell text-fg">
              {row.original.quotesReceived}
            </span>
          ),
        },
        {
          id: 'lowest',
          header: 'Lowest quote',
          accessorFn: (row: EvaluationRow) => row.lowest ?? Number.POSITIVE_INFINITY,
          meta: { align: 'right', className: 'hidden lg:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: EvaluationRow } }) =>
            row.original.lowest === null ? (
              <span className="text-fg-subtle">{EMPTY_VALUE}</span>
            ) : (
              <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
                {formatInr(row.original.lowest * CRORE)}
              </span>
            ),
        },
        {
          id: 'highest',
          header: 'Highest quote',
          accessorFn: (row: EvaluationRow) => row.highest ?? 0,
          meta: { align: 'right', className: 'hidden xl:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: EvaluationRow } }) =>
            row.original.highest === null ? (
              <span className="text-fg-subtle">{EMPTY_VALUE}</span>
            ) : (
              <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
                {formatInr(row.original.highest * CRORE)}
              </span>
            ),
        },
        {
          id: 'suggested',
          // The qualifier belongs to the column, stated once. Repeating "at default
          // weights" on every row spends three lines saying one thing.
          header: 'Suggested partner, at default weights',
          enableSorting: false,
          meta: { className: 'hidden sm:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: EvaluationRow } }) => {
            if (!row.original.rankable) {
              return <span className="text-fg-subtle">Not yet rankable</span>
            }
            const leader = row.original.ranked[0]
            return (
              <span className="flex min-w-0 flex-col gap-2">
                <span className="truncate text-body text-fg">{leader.partner.name}</span>
                <span className="numeric font-mono text-caption text-fg-muted">
                  {`Composite ${leader.composite.toFixed(1)} of 100`}
                </span>
              </span>
            )
          },
        },
        {
          id: 'decision',
          header: 'Decision',
          enableSorting: false,
          cell: ({ row }: { row: { original: EvaluationRow } }) => {
            const decision = decisions.find((d) => d.rfpId === row.original.tender.id)
            if (decision) {
              const names = decision.chosenPartnerIds
                .map((id) => partners.find((p) => p.id === id)?.name ?? id)
                .join(', ')
              return (
                <span className="flex min-w-0 flex-col gap-2">
                  <Badge tone="success">Recorded</Badge>
                  <span className="truncate text-caption text-fg-muted" title={names}>
                    {names}
                  </span>
                </span>
              )
            }
            return row.original.rankable ? (
              <Badge tone="neutral">Not recorded</Badge>
            ) : (
              <Badge tone="neutral">Awaiting responses</Badge>
            )
          },
        },
  ]
}
