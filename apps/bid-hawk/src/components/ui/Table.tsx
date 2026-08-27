import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

export interface TableProps {
  children: ReactNode
  /** Applied to the scroll container, not the table element. */
  className?: string
  ariaLabel: string
}

export function Table({ children, className, ariaLabel }: TableProps) {
  return (
    <div className={cn('scrollable relative w-full', className)}>
      <table aria-label={ariaLabel} className="w-full border-separate border-spacing-0 text-left">
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-sticky">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right'
  width?: string
}

export function Th({ children, align = 'left', className, width, ...rest }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        'whitespace-nowrap border-b border-border bg-surface-sunken px-12 py-8',
        'text-kpi-label uppercase text-fg-muted',
        align === 'right' && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

/**
 * Left accent bar; never a filled row. `critical` and `warning` are the
 * submission-deadline urgency bars and must not be reused for anything else;
 * `error` and `attention` carry non-deadline severity such as source health.
 */
const accentBar = cva('w-hair border-b border-l-accent border-border p-0', {
  variants: {
    accent: {
      critical: 'border-l-urgency-critical',
      warning: 'border-l-urgency-warning',
      error: 'border-l-destructive',
      attention: 'border-l-warning',
      none: 'border-l-transparent',
    },
  },
  defaultVariants: { accent: 'none' },
})

const row = cva('group transition-colors duration-micro ease-out', {
  variants: {
    selected: {
      true: 'bg-surface-selected',
      false: 'bg-surface hover:bg-surface-hover',
    },
    interactive: { true: 'cursor-pointer', false: null },
  },
  defaultVariants: { selected: false, interactive: false },
})

export interface TableRowProps extends VariantProps<typeof accentBar> {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  className?: string
  ariaLabel?: string
}

export function Tr({
  children,
  onClick,
  selected = false,
  accent = 'none',
  className,
  ariaLabel,
}: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      aria-selected={onClick ? selected : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(row({ selected, interactive: Boolean(onClick) }), className)}
      data-accent={accent}
    >
      <td aria-hidden="true" className={accentBar({ accent })} />
      {children}
    </tr>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right'
  numeric?: boolean
}

export function Td({ children, align = 'left', numeric, className, ...rest }: TableCellProps) {
  return (
    <td
      className={cn(
        'border-b border-border px-12 py-8 align-middle text-table-cell text-fg',
        align === 'right' && 'text-right',
        numeric && 'numeric whitespace-nowrap font-mono',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  )
}

/** Row shown while the first page is loading. */
export function TableSkeletonRow({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <tr aria-hidden="true" className="bg-surface">
      <td className={accentBar({ accent: 'none' })} />
      <td colSpan={columns} className="border-b border-border px-12 py-8">
        {children}
      </td>
    </tr>
  )
}
