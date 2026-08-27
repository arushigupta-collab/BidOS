import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const glyph = cva('grid h-48 w-48 place-items-center rounded-card', {
  variants: {
    tone: {
      neutral: 'bg-surface-inset text-fg-muted',
      destructive: 'bg-destructive-subtle text-destructive',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface EmptyStateProps extends VariantProps<typeof glyph> {
  icon?: ReactNode
  title: string
  /** Must name the next action, never a bare "no data". */
  description: string
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  tone,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-12 px-24 py-64 text-center',
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className={glyph({ tone })}>
          {icon}
        </span>
      )}
      <div className="flex max-w-prose flex-col gap-4">
        {/* A heading, not a styled paragraph: an empty state is the whole content
            of its region, so it belongs in the document outline and in
            screen-reader heading navigation. Always h2, under the page's h1. */}
        <h2 className="text-panel-title text-fg">{title}</h2>
        <p className="text-secondary-body text-fg-muted">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-8">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
