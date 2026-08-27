import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface SegmentedNavItem {
  to: string
  label: string
  /** Rendered as a count beside the label. */
  count?: number
  end?: boolean
}

export interface SegmentedNavProps {
  items: SegmentedNavItem[]
  label: string
  /**
   * Intercepts a segment before it navigates. Called with the click event so a
   * screen holding unsaved work can prevent the move and ask first.
   */
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>, to: string) => void
  className?: string
}

/**
 * A segmented control whose segments are routes, so they are links and not tabs:
 * each one has an address, and Radix Tabs would claim to own panels it does not.
 * The active segment is marked by surface, elevation and type weight together,
 * never by colour alone.
 */
export function SegmentedNav({ items, label, onNavigate, className }: SegmentedNavProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="inline-flex items-center gap-2 rounded-control bg-surface-inset p-4">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={(event) => onNavigate?.(event, item.to)}
              className={({ isActive }) =>
                cn(
                  'flex h-control-md items-center gap-8 rounded-control px-16',
                  'transition-colors duration-micro ease-out',
                  isActive
                    ? 'bg-surface text-body-strong text-fg shadow-card'
                    : 'text-body text-fg-muted hover:bg-surface-hover hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="truncate">{item.label}</span>
                  {typeof item.count === 'number' && (
                    <span
                      className={cn(
                        'numeric rounded-full px-8 py-2 font-mono text-metadata',
                        isActive ? 'bg-primary-subtle text-primary' : 'bg-surface text-fg-muted',
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
