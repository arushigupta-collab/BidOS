import type { ReactNode } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { PERSON_ROLE, type Person } from '@/types'
import { Chip, Tooltip } from '@/components/ui'
import { formatAbsolute, formatRelative } from '@/lib/format'

const column = createColumnHelper<Person>()

const VISIBLE_TAGS = 2

/** Same contract as the sources table, so the two read and behave alike. */
export interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

/** Two chips and a counted overflow, with the full set in a tooltip. */
function TagCell({ values, label }: { values: string[]; label: string }) {
  if (values.length === 0) {
    return (
      <span title={`No ${label.toLowerCase()} recorded`} className="text-body text-fg-muted">
        —
      </span>
    )
  }

  const shown = values.slice(0, VISIBLE_TAGS)
  const hidden = values.length - shown.length

  return (
    <div className="flex flex-wrap items-center gap-4">
      {shown.map((value) => (
        <Chip key={value}>{value}</Chip>
      ))}
      {hidden > 0 && (
        <Tooltip content={values.join(', ')}>
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
}

export function buildPersonColumns(renderMenu?: (person: Person) => ReactNode) {
  return [
    column.accessor('name', {
      id: 'name',
      header: 'Name',
      cell: (info) => (
        <div className="flex min-w-0 flex-col gap-2">
          <span className="truncate text-body-strong text-fg">{info.getValue()}</span>
          <span className="text-metadata text-fg-muted">{PERSON_ROLE}</span>
        </div>
      ),
    }),

    column.accessor('email', {
      id: 'email',
      header: 'Email',
      meta: { className: 'hidden md:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span
          title={info.getValue()}
          className="block max-w-col-title truncate font-mono text-metadata text-fg-secondary"
        >
          {info.getValue()}
        </span>
      ),
    }),

    column.accessor('domains', {
      id: 'domains',
      header: 'Domain expertise',
      enableSorting: false,
      meta: { className: 'hidden lg:table-cell' } satisfies ColumnMeta,
      cell: (info) => <TagCell values={info.getValue()} label="Domain expertise" />,
    }),

    column.accessor('regions', {
      id: 'regions',
      header: 'Regional expertise',
      enableSorting: false,
      meta: { className: 'hidden lg:table-cell' } satisfies ColumnMeta,
      cell: (info) => <TagCell values={info.getValue()} label="Regional expertise" />,
    }),

    column.accessor('addedAt', {
      id: 'addedAt',
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
