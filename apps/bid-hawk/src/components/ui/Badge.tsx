import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badge = cva('inline-flex max-w-full items-center gap-4 border', {
  variants: {
    tone: {
      neutral: 'border-neutral-border bg-neutral-subtle text-fg-secondary',
      primary: 'border-primary-border bg-primary-subtle text-primary',
      accent: 'border-accent-border bg-accent-subtle text-accent',
      success: 'border-success-border bg-success-subtle text-success',
      warning: 'border-warning-border bg-warning-subtle text-warning',
      destructive: 'border-destructive-border bg-destructive-subtle text-destructive',
      info: 'border-info-border bg-info-subtle text-info',
    },
    /** Badges take the field radius; pills take the full radius. */
    shape: {
      badge: 'rounded-field px-8 py-2',
      pill: 'rounded-full px-12 py-2',
    },
    mono: {
      true: 'font-mono text-metadata',
      false: 'text-label',
    },
    /** Signals an unavailable capability without changing its tone. */
    recessed: {
      true: 'opacity-recessed',
      false: null,
    },
  },
  defaultVariants: { tone: 'neutral', shape: 'badge', mono: false, recessed: false },
})

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>

export interface BadgeProps extends VariantProps<typeof badge> {
  children: ReactNode
  icon?: ReactNode
  className?: string
  title?: string
}

export function Badge({
  tone,
  shape,
  mono,
  recessed,
  children,
  icon,
  className,
  title,
}: BadgeProps) {
  return (
    <span title={title} className={cn(badge({ tone, shape, mono, recessed }), className)}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  )
}
