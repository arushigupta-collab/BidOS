import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const ring = cva('absolute inset-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success-subtle',
      warning: 'bg-warning-subtle',
      destructive: 'bg-destructive-subtle',
      info: 'bg-info-subtle',
      neutral: 'bg-neutral-subtle',
      accent: 'bg-accent-subtle',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

const core = cva('relative h-8 w-8 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
      info: 'bg-info',
      neutral: 'bg-neutral',
      accent: 'bg-accent',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type StatusTone = NonNullable<VariantProps<typeof core>['tone']>

export interface StatusDotProps extends VariantProps<typeof core> {
  /** Text sits beside the dot so status is never carried by colour alone. */
  label?: string
  className?: string
}

export function StatusDot({ tone, label, className }: StatusDotProps) {
  const dot = (
    <span className="relative inline-flex h-12 w-12 items-center justify-center">
      <span aria-hidden="true" className={ring({ tone })} />
      <span aria-hidden="true" className={core({ tone })} />
    </span>
  )

  if (!label) return <span className={className}>{dot}</span>

  return (
    <span className={cn('inline-flex items-center gap-8 text-body text-fg-secondary', className)}>
      {dot}
      <span className="truncate">{label}</span>
    </span>
  )
}
