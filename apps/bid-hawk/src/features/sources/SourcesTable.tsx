import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Source } from '@/types'
import { cn } from '@/lib/cn'
import { RFP_DOCUMENT_LABEL } from '@/lib/rfpDocument'
import { ICON } from '@/lib/tokens'
import { buildSourceColumns, type ColumnMeta } from './sourceColumns'

export interface SourcesTableProps {
  sources: Source[]
  /** Omitted where the table is a record of the shape rather than a work surface. */
  renderMenu?: (source: Source) => React.ReactNode
  /**
   * The sources just created, held highlighted until the operator moves on. An
   * array because an import creates several at once and all of them are new.
   */
  highlightIds?: string[]
  /**
   * Makes each row open the stored tender document, and adds the trailing
   * "View RFP" cell that says so. Off on the schema table, which is a record of
   * what a source holds rather than a work surface.
   */
  openable?: boolean
  /** Turns off sorting where there is nothing yet to sort. */
  sortable?: boolean
  /** Id of the element naming this table, for the schema view's caption. */
  labelledBy?: string
}

export function SourcesTable({
  sources,
  renderMenu,
  highlightIds,
  openable = false,
  sortable = true,
  labelledBy,
}: SourcesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [scrolled, setScrolled] = useState(false)
  const columns = useMemo(
    () => buildSourceColumns(renderMenu, openable),
    [renderMenu, openable],
  )

  /**
   * The row hands its click to its own "View RFP" anchor rather than navigating
   * itself. A `<tr>` cannot be a link, so the alternative is `window.open` — which
   * Chrome refuses for a local file from a file:// page, and which would have made
   * the offline build's rows silently do nothing.
   *
   * Calling `.click()` from inside a real user event keeps the user activation, so
   * the new tab is not treated as a popup.
   */
  const openDocument = (row: HTMLElement) => {
    row.querySelector<HTMLAnchorElement>('a[data-row-document]')?.click()
  }

  const table = useReactTable({
    data: sources,
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
                      // The rule under the header is the one border a table keeps.
                      'border-b border-border',
                      // Elevation appears only once there is something scrolled under it.
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
            const source = row.original

            return (
              <tr
                key={row.id}
                tabIndex={0}
                // Says what pressing it does. A row that opens a document without
                // announcing it leaves a screen reader user clicking blind.
                aria-label={
                  openable
                    ? `${source.name}, ${source.status}. Opens the ${RFP_DOCUMENT_LABEL}.`
                    : `${source.name}, ${source.status}`
                }
                onClick={openable ? (event) => openDocument(event.currentTarget) : undefined}
                onKeyDown={
                  openable
                    ? (event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        openDocument(event.currentTarget)
                      }
                    : undefined
                }
                className={cn(
                  'group transition-colors duration-micro ease-out',
                  'focus-visible:bg-surface-selected',
                  openable && 'cursor-pointer',
                  highlightIds?.includes(source.id)
                    ? 'bg-primary-subtle'
                    : 'bg-surface hover:bg-surface-hover',
                )}
              >
                <td
                  aria-hidden="true"
                  className={cn(
                    'w-hair border-b border-l-accent border-border p-0',
                    // Paused is the only row state that earns a bar, and it is
                    // quiet: the Status badge already carries the word.
                    source.status === 'paused' ? 'border-l-border-strong' : 'border-l-transparent',
                  )}
                />
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                  // The overflow menu is its own control. Without this its click
                  // and its Enter would both bubble to the row and open the
                  // document instead of, or as well as, opening the menu.
                  const isMenu = cell.column.id === 'actions'

                  return (
                    <td
                      key={cell.id}
                      onClick={isMenu ? (event) => event.stopPropagation() : undefined}
                      onKeyDown={isMenu ? (event) => event.stopPropagation() : undefined}
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
