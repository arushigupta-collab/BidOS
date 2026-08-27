import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { buildFeedColumns, type ColumnMeta } from './feedColumns'
import { rowUrgency, type FeedRow } from './feedModel'

export interface FeedTableProps {
  rows: FeedRow[]
  sourcePlatform: (sourceId: string) => string
  labelledBy?: string
}

/** Deadline ascending: the soonest is always the one that matters. */
const DEFAULT_SORT: SortingState = [{ id: 'deadline', desc: false }]

export function FeedTable({ rows, sourcePlatform, labelledBy }: FeedTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT)
  const [scrolled, setScrolled] = useState(false)
  const columns = useMemo(() => buildFeedColumns(sourcePlatform), [sourcePlatform])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const open = (row: FeedRow) => navigate(`/feed/${row.tender.id}`)

  return (
    <div
      onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
      className="scrollable min-h-0 flex-1"
    >
      <table
        aria-labelledby={labelledBy}
        className="w-full border-separate border-spacing-0 text-left"
      >
        <thead className="sticky top-0 z-sticky">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {/* The accent column exists in every body row, so the header row has
                  to declare it too, or the two run on different column counts. */}
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
                      'whitespace-nowrap bg-surface-sunken px-12 py-8 text-micro-label uppercase text-fg-muted',
                      'border-b border-border',
                      scrolled && 'shadow-card',
                      meta?.align === 'right' && 'text-right',
                      meta?.className,
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-4 rounded-field text-micro-label uppercase',
                          'transition-colors duration-micro ease-out hover:text-fg',
                          meta?.align === 'right' && 'flex-row-reverse',
                        )}
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
          {table.getRowModel().rows.map((row) => {
            const feedRow = row.original
            const urgency = rowUrgency(feedRow.tender)

            return (
              <tr
                key={row.id}
                tabIndex={0}
                aria-label={`${feedRow.tender.title}, ${feedRow.tender.tenderRef}`}
                onClick={() => open(feedRow)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    open(feedRow)
                  }
                }}
                className={cn(
                  'group cursor-pointer transition-colors duration-micro ease-out',
                  'focus-visible:bg-surface-selected',
                  'bg-surface hover:bg-surface-hover',
                )}
              >
                <td
                  aria-hidden="true"
                  className={cn(
                    'w-hair border-b border-l-accent border-border p-0',
                    // Inside 72 hours takes a left bar, never a filled row.
                    urgency === 'critical' ? 'border-l-urgency-critical' : 'border-l-transparent',
                  )}
                />
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'border-b border-border px-12 py-12 align-top text-table-cell text-fg',
                        meta?.align === 'right' && 'text-right',
                        meta?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
