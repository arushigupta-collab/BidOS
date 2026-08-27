import type { ReactNode } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import type { Partner } from '@/types'
import { Check } from 'lucide-react'
import { Badge, Checkbox, Chip, Tooltip } from '@/components/ui'
import { formatAbsolute, formatInr, formatRelative } from '@/lib/format'
import { ICON } from '@/lib/tokens'

const column = createColumnHelper<Partner>()

const VISIBLE_CHIPS = 3

/** Same contract as the sources, people and feed tables, so all four read alike. */
export interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

/**
 * Chips with a counted overflow, matching the keyword treatment on /sources: three
 * shown, the remainder behind a "+N" whose tooltip lists them. A cell that wraps to
 * six chips makes every row a different height.
 */
function ChipList({ values, label }: { values: string[]; label: string }) {
  if (values.length === 0) return <span className="text-fg-subtle">—</span>

  const shown = values.slice(0, VISIBLE_CHIPS)
  const hidden = values.length - shown.length

  return (
    <div className="flex flex-wrap items-center gap-4">
      {shown.map((value) => (
        <Chip key={value}>{value}</Chip>
      ))}
      {hidden > 0 && (
        <Tooltip content={values.slice(VISIBLE_CHIPS).join(', ')}>
          <button
            type="button"
            aria-label={`${hidden} more ${label}: ${values.slice(VISIBLE_CHIPS).join(', ')}`}
            className="rounded-field px-4 py-2 text-metadata-strong text-fg-muted underline decoration-border underline-offset-2 hover:text-fg"
          >
            {`+${hidden}`}
          </button>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * The registry's columns.
 *
 * DELIBERATELY ABSENT: rating, projects delivered, on-time delivery, and any
 * composite or empanelment SCORE. Those are Partner Evaluation's fields, and putting
 * a number here would start the ranking two screens early — where there is no RFP to
 * rank against and no reasoning shown for it. The empanelment STATUS is here as a
 * badge, because "MSE" is a fact about the partner rather than a judgement of them.
 */
export function buildPartnerColumns(
  renderMenu?: (partner: Partner) => ReactNode,
  selectAllLabel = 'Select all partners',
  /** partnerId -> invitedAt, for the RFP currently selected. Empty when none is. */
  invited: Map<string, string> = new Map(),
) {
  return [
    column.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          id="select-all-partners"
          label={selectAllLabel}
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
          onCheckedChange={(next) => table.toggleAllRowsSelected(next)}
          labelHidden
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          id={`select-${row.original.id}`}
          label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(next) => row.toggleSelected(next)}
          labelHidden
        />
      ),
      meta: { className: 'w-0' } satisfies ColumnMeta,
    }),

    column.accessor('name', {
      id: 'partner',
      header: 'Partner',
      cell: (info) => {
        const partner = info.row.original
        return (
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex flex-wrap items-center gap-8">
              <span className="text-body-strong text-fg">{partner.name}</span>
              <Badge tone="neutral">{partner.type}</Badge>
              {/* A status, not a score. "MSE" is a fact about the partner. */}
              {partner.empanelment.includes('MSE') && <Badge tone="success">MSE</Badge>}
              {partner.status === 'paused' && <Badge tone="warning">Paused</Badge>}
              {/* A state marker for the selected RFP, not a column of data, and
                  deliberately not the amber accent: the accent means agent activity and
                  an invitation is something the operator did. */}
              {invited.has(partner.id) && (
                <span
                  title={`Invited ${formatAbsolute(invited.get(partner.id) as string)}`}
                  className="inline-flex items-center gap-4 text-metadata text-fg-muted"
                >
                  <Check size={ICON.xs} aria-hidden="true" />
                  Invited
                </span>
              )}
            </span>
            <span className="text-caption text-fg-muted">{partner.contactName}</span>
          </div>
        )
      },
    }),

    /*
     * Industry, not capabilities, is what decides whether a partner is shown
     * against a tender at all -- so it is on the row rather than a page behind
     * it. It sits above the capability chips because it is the coarser fact and
     * reading it second means reading four chips to find out you were in the
     * wrong industry.
     */
    column.accessor('industry', {
      id: 'industry',
      header: 'Industry',
      meta: { className: 'hidden md:table-cell' } satisfies ColumnMeta,
      cell: (info) => <span className="text-body text-fg-muted">{info.getValue()}</span>,
    }),

    column.accessor('capabilities', {
      id: 'capabilities',
      header: 'Capabilities',
      enableSorting: false,
      meta: { className: 'hidden lg:table-cell' } satisfies ColumnMeta,
      cell: (info) => <ChipList values={info.getValue()} label="capabilities" />,
    }),

    column.accessor('regions', {
      id: 'regions',
      header: 'Regions',
      enableSorting: false,
      meta: { className: 'hidden xl:table-cell' } satisfies ColumnMeta,
      cell: (info) => <ChipList values={info.getValue()} label="regions" />,
    }),

    column.accessor('teamSize', {
      id: 'teamSize',
      header: 'Team size',
      meta: { align: 'right', className: 'hidden md:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
          {info.getValue()}
        </span>
      ),
    }),

    column.accessor('annualTurnoverCr', {
      id: 'turnover',
      header: 'Turnover',
      meta: { align: 'right', className: 'hidden md:table-cell' } satisfies ColumnMeta,
      // Crore in the seed, rupees to the formatter: one currency formatter for the
      // whole product, so Indian digit grouping is never implemented twice.
      cell: (info) => (
        <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
          {formatInr(info.getValue() * 1_00_00_000)}
        </span>
      ),
    }),

    column.accessor('certifications', {
      id: 'certifications',
      header: 'Certifications',
      enableSorting: false,
      meta: { className: 'hidden xl:table-cell' } satisfies ColumnMeta,
      cell: (info) => <ChipList values={info.getValue()} label="certifications" />,
    }),

    column.accessor('onboardedAt', {
      id: 'added',
      header: 'Added',
      meta: { className: 'hidden sm:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span
          title={formatAbsolute(info.getValue())}
          className="whitespace-nowrap text-body text-fg-secondary"
        >
          {formatRelative(info.getValue())}
        </span>
      ),
    }),

    ...(renderMenu
      ? [
          column.display({
            id: 'actions',
            header: '',
            cell: (info) => renderMenu(info.row.original),
          }),
        ]
      : []),
  ]
}
