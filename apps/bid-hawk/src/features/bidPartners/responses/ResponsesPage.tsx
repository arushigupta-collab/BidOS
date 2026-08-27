import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, BellRing, ChevronsUpDown, ClipboardList, UserPlus } from 'lucide-react'
import { Button, DropdownMenu, EmptyState, SkeletonText } from '@/components/ui'
import { fetchPartners } from '@/data/api'
import { usePartnerData } from '@/features/bidPartners/usePartnerData'
import { SyncNotice } from '@/features/bidPartners/SyncNotice'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRelative } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { ResponseStatusBadge } from './ResponseStatusBadge'
import { buildTracker, statusOf, type TrackerRow } from './responsesModel'

interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

/**
 * The response tracker list. FIVE columns: Tender, Partners invited, Responses in,
 * Response deadline, Status.
 *
 * NO AGGREGATE DOCUMENT COUNT AND NO COMPLETENESS BAR. Both are gone from the whole
 * product, not from one route: an earlier pass removed them from the detail screen and
 * left them on the list that screen is reached from, so the same figure was banned in one
 * place and shown in the other. Nothing replaces them — no badge, no colour, no compact
 * variant. The freed width went to the tender identifier, which was truncating while two
 * columns downstream spent 311px on figures now deleted.
 *
 * A KNOWN COST, reported rather than papered over: the list now says how many partners
 * responded but not how much has come back. See docs/decisions.md.
 *
 * Rows are ONLY tenders with at least one invitation. Listing all fourteen would make
 * the screen mostly rows that can never fill, and a tender nobody has been invited to
 * has nothing to track.
 */
export function ResponsesPage() {
  const navigate = useNavigate()
  const { tenders, syncError } = usePartnerData()
  const invitations = useWorkspace((state) => state.invitations)
  const [loaded, setLoaded] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    fetchPartners().then(() => setLoaded(true)).catch(() => setLoaded(true))
  }, [])

  const rows = useMemo(() => buildTracker(tenders, invitations), [tenders, invitations])

  const open = useCallback(
    (row: TrackerRow) => navigate(`/bid-partners/responses/${row.tender.id}`),
    [navigate],
  )

  const table = useReactTable({
    data: rows,
    columns: useMemo(
      () => [
        {
          id: 'tender',
          header: 'Tender',
          accessorFn: (row: TrackerRow) => row.tender.title,
          cell: ({ row }: { row: { original: TrackerRow } }) => (
            <div className="flex min-w-0 max-w-col-tender flex-col gap-2">
              <span title={row.original.tender.title} className="line-clamp-2 text-body-strong text-fg">
                {row.original.tender.title}
              </span>
              <span className="font-mono text-metadata text-fg-muted">
                {row.original.tender.tenderRef}
              </span>
            </div>
          ),
        },
        {
          id: 'invited',
          header: 'Partners invited',
          accessorFn: (row: TrackerRow) => row.invited,
          meta: { align: 'right', className: 'hidden md:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: TrackerRow } }) => (
            <span className="numeric font-mono text-table-cell text-fg">{row.original.invited}</span>
          ),
        },
        {
          id: 'responded',
          header: 'Responses in',
          accessorFn: (row: TrackerRow) => row.responded,
          meta: { align: 'right', className: 'hidden lg:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: TrackerRow } }) => (
            <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
              {`${row.original.responded} of ${row.original.invited}`}
            </span>
          ),
        },
        {
          id: 'deadline',
          header: 'Response deadline',
          accessorFn: (row: TrackerRow) => row.responseDeadline ?? '',
          meta: { className: 'hidden sm:table-cell' } satisfies ColumnMeta,
          cell: ({ row }: { row: { original: TrackerRow } }) =>
            row.original.responseDeadline ? (
              <span
                title={formatRelative(`${row.original.responseDeadline}T18:00:00`)}
                className={cn(
                  'whitespace-nowrap text-body',
                  // The destructive token, never a deadline urgency token: that scale
                  // belongs to your own bid deadlines in the feed.
                  row.original.overdue > 0 ? 'text-destructive' : 'text-fg-secondary',
                )}
              >
                {formatDateTime(`${row.original.responseDeadline}T18:00:00`)}
              </span>
            ) : (
              <span className="text-fg-subtle">Not set</span>
            ),
        },
        {
          id: 'status',
          header: 'Status',
          enableSorting: false,
          cell: ({ row }: { row: { original: TrackerRow } }) => {
            // The tender's status is its worst partner's: Overdue if any is late,
            // Complete only when every one of them is, In progress otherwise.
            const statuses = row.original.invitations.map((i) => statusOf(i))
            const worst = statuses.includes('overdue')
              ? 'overdue'
              : statuses.every((s) => s === 'complete')
                ? 'complete'
                : 'in-progress'
            return <ResponseStatusBadge status={worst} />
          },
        },
        {
          id: 'actions',
          header: '',
          enableSorting: false,
          cell: ({ row }: { row: { original: TrackerRow } }) => (
            <DropdownMenu
              label={`Actions for ${row.original.tender.title}`}
              triggerIcon={<ClipboardList size={ICON.md} aria-hidden="true" />}
              items={[
                {
                  id: 'open',
                  label: 'Open responses',
                  icon: <ClipboardList size={ICON.sm} />,
                  onSelect: () => open(row.original),
                },
                {
                  id: 'invite',
                  label: 'Invite more partners',
                  icon: <UserPlus size={ICON.sm} />,
                  // The registry reads the tender from the address, so the selector
                  // arrives already pointing at it.
                  onSelect: () =>
                    navigate(`/bid-partners/registry?rfp=${row.original.tender.id}`),
                },
                {
                  // Opens the screen that sends, rather than sending from a menu: a
                  // reminder names specific outstanding documents per partner, and
                  // firing that from a list row would send it unseen. The label says
                  // what it does.
                  id: 'remind',
                  label: 'Review outstanding and remind',
                  icon: <BellRing size={ICON.sm} />,
                  onSelect: () => open(row.original),
                },
              ]}
            />
          ),
        },
      ],
      [navigate, open],
    ),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        {/* NO SUMMARY BAND. Four stats counting invitations, outstanding documents and
            silent partners sat above three rows that state all of it per tender, so the
            first screenful was a summary of what was immediately below it. Removed rather
            than replaced: the rows carry the information. */}
        <div className="flex flex-col gap-4">
          <h1 id="responses-heading" className="text-page-title text-fg">
            Response tracker
          </h1>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            What each partner has sent back against each RFP, and what is still outstanding.
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
          icon={<ClipboardList size={ICON.lg} aria-hidden="true" />}
          title="No RFP has been sent to partners yet"
          description="The tracker follows what partners send back, so it fills once you have invited somebody. Choose an RFP in the registry, select the partners you want on it, and send the invitation."
          action={
            <Button variant="primary" onClick={() => navigate('/bid-partners/registry')}>
              Go to the registry
            </Button>
          }
        />
      )}

      {loaded && rows.length > 0 && (
        <div className="scrollable min-h-0 flex-1">
          <table
            aria-labelledby="responses-heading"
            className="w-full border-separate border-spacing-0 text-left"
          >
            <thead className="sticky top-0 z-sticky">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {/* Every body row carries a leading accent cell, so the header row has
                      to declare it too or the two run on different column counts. */}
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
                              <ChevronsUpDown size={ICON.xs} aria-hidden="true" className="text-fg-subtle" />
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
                  aria-label={`${row.original.tender.title}. Opens the responses for this RFP.`}
                  onClick={() => open(row.original)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    open(row.original)
                  }}
                  className="group cursor-pointer bg-surface transition-colors duration-micro ease-out hover:bg-surface-hover focus-visible:bg-surface-selected"
                >
                  <td
                    aria-hidden="true"
                    className={cn(
                      'w-hair border-b border-l-accent border-border p-0',
                      row.original.overdue > 0
                        ? 'border-l-destructive'
                        : 'border-l-transparent',
                    )}
                  />
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                    const ownControl = cell.column.id === 'actions'
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
