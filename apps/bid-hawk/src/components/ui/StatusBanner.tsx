import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'

const banner = cva('flex flex-col gap-12 rounded-card p-16 sm:flex-row sm:items-center', {
  variants: {
    tone: {
      info: 'bg-info-subtle',
      warning: 'bg-warning-subtle',
      destructive: 'bg-destructive-subtle',
    },
  },
  defaultVariants: { tone: 'info' },
})

const glyph = cva('mt-2 shrink-0 sm:mt-0', {
  variants: {
    tone: { info: 'text-info', warning: 'text-warning', destructive: 'text-destructive' },
  },
  defaultVariants: { tone: 'info' },
})

const ICONS = { info: Info, warning: AlertTriangle, destructive: XCircle } as const

export interface StatusBannerProps extends VariantProps<typeof banner> {
  title: string
  /** Says what happened and what it means, never just what is missing. */
  description: string
  action?: ReactNode
  className?: string
}

/**
 * A state that explains itself in place, for a screen that is working but is
 * missing something the rest of the product supplies.
 */
export function StatusBanner({ tone, title, description, action, className }: StatusBannerProps) {
  const Glyph = ICONS[tone ?? 'info']

  return (
    <div role="status" className={cn(banner({ tone }), className)}>
      <Glyph size={ICON.md} aria-hidden="true" className={glyph({ tone })} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-body-strong text-fg">{title}</p>
        <p className="max-w-prose text-secondary-body text-fg-secondary">{description}</p>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
