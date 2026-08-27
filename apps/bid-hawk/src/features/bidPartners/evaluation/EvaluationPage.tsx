import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Users } from 'lucide-react'
import { Button, EmptyState, SkeletonText } from '@/components/ui'
import { fetchPartners } from '@/data/api'
import { usePartnerData } from '@/features/bidPartners/usePartnerData'
import { SyncNotice } from '@/features/bidPartners/SyncNotice'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { buildEvaluationList, type EvaluationRow } from './evaluationModel'
import { evaluationColumns, type ColumnMeta } from './evaluationColumns'

/**
 * The evaluation list: every RFP with invitations out, and how far each is from a
 * decision.
 *
 * The suggested partner shown here is computed at the DEFAULT weights, and the column
 * says so. Any other reading would be dishonest, because the weights are adjustable on
 * the comparison page and a suggestion with no stated weighting is a suggestion with no
 * stated basis.
 */
export function EvaluationPage() {
  const navigate = useNavigate()
  const { tenders, syncError } = usePartnerData()
  const invitations = useWorkspace((state) => state.invitations)
  const partners = useWorkspace((state) => state.partners)
  const decisions = useWorkspace((state) => state.decisions)
  const [loaded, setLoaded] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    fetchPartners().then(() => setLoaded(true)).catch(() => setLoaded(true))
  }, [])

  const rows = useMemo(
    () => buildEvaluationList(tenders, invitations, partners),
    [invitations, partners],
  )

  const open = useCallback(
    (row: EvaluationRow) => navigate(`/bid-partners/evaluation/${row.tender.id}`),
    [navigate],
  )

  const columns = useMemo(() => evaluationColumns(partners, decisions), [partners, decisions])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        <div className="flex flex-col gap-4">
          <h1 id="evaluation-heading" className="text-page-title text-fg">
            Partner evaluation
          </h1>
          {/* NO SUMMARY BAND. Four stats counting what is ready, awaiting, quoted and
              decided sat above the rows that state all of it. Removed rather than replaced.
              The lede no longer promises weights you set, either: they are hidden. */}
          <p className="max-w-lede text-secondary-body text-fg-muted">
            Compare what came back against each RFP, and record who you are going with.
          </p>
        </div>

        <SyncNotice message={syncError} />

      </header>

      {!loaded && (
        <div className="flex flex-col gap-16 px-24 py-24 md:px-32">
          <SkeletonText lines={4} />
        </div>
      )}

      {loaded && rows.length === 0 && (
        <EmptyState
          icon={<Users size={ICON.lg} aria-hidden="true" />}
          title="Nothing to evaluate yet"
          description="Evaluation compares what partners send back, so it fills once an invitation has gone out. Open the partner registry, pick an RFP, choose the partners you want on it and send the invitation."
          action={
            <Button variant="primary" onClick={() => navigate('/bid-partners/registry')}>
              Go to the partner registry
            </Button>
          }
        />
      )}

      {loaded && rows.length > 0 && (
        <div className="scrollable min-h-0 flex-1">
          <table
            aria-labelledby="evaluation-heading"
            className="w-full border-separate border-spacing-0 text-left"
          >
            <thead className="sticky top-0 z-sticky">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  <td
                    aria-hidden="true"
                    className="w-hair border-b border-border bg-surface-sunken p-0"
                  />
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta as ColumnMeta | undefined
                    const canSort = header.column.getCanSort()
                    const direction = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          direction === 'asc'
                            ? 'ascending'
                            : direction === 'desc'
                              ? 'descending'
                              : undefined
                        }
                        className={cn(
                          'whitespace-nowrap border-b border-border bg-surface-sunken px-12 py-8 text-micro-label uppercase text-fg-muted',
                          meta?.align === 'right' && 'text-right',
                          meta?.className,
                        )}
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-4 rounded-field text-micro-label uppercase transition-colors duration-micro ease-out hover:text-fg"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="sr-only-focusable">, sort by this column</span>
                            {direction === 'asc' ? (
                              <ArrowUp size={ICON.xs} aria-hidden="true" />
                            ) : direction === 'desc' ? (
                              <ArrowDown size={ICON.xs} aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown
                                size={ICON.xs}
                                aria-hidden="true"
                                className="text-fg-subtle"
                              />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-label={
                    row.original.rankable
                      ? `${row.original.tender.title}. Opens the ranked comparison.`
                      : `${row.original.tender.title}. Not yet rankable. Opens the response tracker.`
                  }
                  onClick={() =>
                    row.original.rankable
                      ? open(row.original)
                      : navigate(`/bid-partners/responses/${row.original.tender.id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    if (row.original.rankable) open(row.original)
                    else navigate(`/bid-partners/responses/${row.original.tender.id}`)
                  }}
                  className="group cursor-pointer bg-surface transition-colors duration-micro ease-out hover:bg-surface-hover focus-visible:bg-surface-selected"
                >
                  {/* A plain spacer, matching the header's leading cell so the two rows
                      run on the same column count. Nothing on this screen carries an
                      urgency marker, so it carries no left rule. */}
                  <td aria-hidden="true" className="w-hair border-b border-border p-0" />
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'border-b border-border px-12 py-12 align-middle text-table-cell text-fg',
                          meta?.align === 'right' && 'text-right',
                          meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
