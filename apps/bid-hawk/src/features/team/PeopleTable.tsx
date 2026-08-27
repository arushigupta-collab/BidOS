import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Person } from '@/types'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { buildPersonColumns, type ColumnMeta } from './personColumns'

export interface PeopleTableProps {
  people: Person[]
  /** Omitted where the table records the shape rather than being a work surface. */
  renderMenu?: (person: Person) => React.ReactNode
  /**
   * The people just created, held highlighted until the operator moves on. An
   * array because an import creates several at once and all of them are new.
   */
  highlightIds?: string[]
  /** Turns off sorting where there is nothing yet to sort. */
  sortable?: boolean
  /** Id of the element naming this table, for the schema view's caption. */
  labelledBy?: string
}

/**
 * The same table as Sources, against people. Kept as a sibling rather than one
 * generic component: the two share every visual rule and no behaviour beyond what
 * TanStack already provides, and a single generic table over two column sets would
 * have been harder to read than two files that look alike.
 */
export function PeopleTable({
  people,
  renderMenu,
  highlightIds,
  sortable = true,
  labelledBy,
}: PeopleTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [scrolled, setScrolled] = useState(false)
  const columns = useMemo(() => buildPersonColumns(renderMenu), [renderMenu])

  const table = useReactTable({
    data: people,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div
      onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
      className="scrollable min-h-0 flex-1"
    >
      <table aria-labelledby={labelledBy} className="w-full border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-sticky">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {/* The accent column exists in every body row, so the header row has
                  to declare it too. Without this the header and the body run on
                  different column counts and every value sits one column to the
                  right of its heading. */}
              <td
                aria-hidden="true"
                className="w-hair border-b border-border bg-surface-sunken p-0"
              />
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta as ColumnMeta | undefined
                const canSort = sortable && header.column.getCanSort()
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
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              aria-label={row.original.name}
              className={cn(
                'group transition-colors duration-micro ease-out',
                'focus-visible:bg-surface-selected',
                highlightIds?.includes(row.original.id)
                  ? 'bg-primary-subtle'
                  : 'bg-surface hover:bg-surface-hover',
              )}
            >
              <td
                aria-hidden="true"
                className="w-hair border-b border-l-accent border-border border-l-transparent p-0"
              />
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
  )
}
