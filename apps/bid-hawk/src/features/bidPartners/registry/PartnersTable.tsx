import { useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Partner } from '@/types'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { buildPartnerColumns, type ColumnMeta } from './partnerColumns'

export interface PartnersTableProps {
  partners: Partner[]
  renderMenu?: (partner: Partner) => ReactNode
  /** Row selection lives with the caller, which needs it for the invite gate. */
  selection: RowSelectionState
  onSelectionChange: (next: RowSelectionState) => void
  /** Row click opens the partner for editing. */
  onOpen: (partner: Partner) => void
  /**
   * The header checkbox selects all VISIBLE rows, which is narrower than "all" once a
   * filter is on. The caller knows the filter state, so it supplies the wording.
   */
  selectAllLabel?: string
  /** partnerId -> invitedAt, for the RFP currently selected. */
  invited?: Map<string, string>
  labelledBy?: string
}

/**
 * The registry table.
 *
 * Selection is TanStack's own row-selection model, keyed on the partner id, not a
 * hand-rolled Set beside it. The header checkbox's indeterminate state, the
 * select-all and the per-row toggles all come from that model, so they cannot
 * disagree with each other.
 */
export function PartnersTable({
  partners,
  renderMenu,
  selection,
  onSelectionChange,
  onOpen,
  selectAllLabel = 'Select all partners',
  invited,
  labelledBy,
}: PartnersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [scrolled, setScrolled] = useState(false)
  const columns = useMemo(
    () => buildPartnerColumns(renderMenu, selectAllLabel, invited),
    [renderMenu, selectAllLabel, invited],
  )

  const table = useReactTable({
    data: partners,
    columns,
    state: { sorting, rowSelection: selection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) =>
      onSelectionChange(typeof updater === 'function' ? updater(selection) : updater),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
              {/* Every body row carries a leading accent cell, so the header row has to
                  declare it too. Without this the two run on different column counts
                  and every value sits one column right of its heading. */}
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
          {table.getRowModel().rows.map((row) => {
            const partner = row.original

            return (
              <tr
                key={row.id}
                tabIndex={0}
                aria-label={`${partner.name}, ${partner.type}. Opens the partner for editing.`}
                onClick={() => onOpen(partner)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  onOpen(partner)
                }}
                className={cn(
                  'group cursor-pointer transition-colors duration-micro ease-out',
                  'focus-visible:bg-surface-selected',
                  row.getIsSelected() ? 'bg-primary-subtle' : 'bg-surface hover:bg-surface-hover',
                )}
              >
                <td
                  aria-hidden="true"
                  className={cn(
                    'w-hair border-b border-l-accent border-border p-0',
                    // Paused is the only row state that earns a bar, and it is quiet:
                    // the badge on the Partner cell already carries the word.
                    partner.status === 'paused'
                      ? 'border-l-border-strong'
                      : 'border-l-transparent',
                  )}
                />
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                  // The checkbox and the overflow menu are their own controls. Without
                  // this their click and their Enter bubble to the row and open the
                  // edit screen instead of, or as well as, doing their own job.
                  const ownControl = cell.column.id === 'actions' || cell.column.id === 'select'

                  return (
                    <td
                      key={cell.id}
                      onClick={ownControl ? (event) => event.stopPropagation() : undefined}
                      onKeyDown={ownControl ? (event) => event.stopPropagation() : undefined}
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
