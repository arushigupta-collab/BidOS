import { useEffect, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { countdown, formatAbsolute, formatDateTime } from '@/lib/format'

const value = cva('numeric font-mono', {
  variants: {
    size: {
      sm: 'text-metadata-strong',
      md: 'text-body-strong',
    },
    /**
     * Urgency tokens are reserved for submission deadlines. Any other ticking
     * value — a sync schedule, a refresh interval — passes tone="neutral".
     */
    tone: {
      urgency: null,
      neutral: 'text-fg-secondary',
    },
    urgency: {
      critical: null,
      warning: null,
      normal: null,
      elapsed: null,
    },
  },
  compoundVariants: [
    { tone: 'urgency', urgency: 'critical', class: 'text-urgency-critical' },
    { tone: 'urgency', urgency: 'warning', class: 'text-urgency-warning' },
    { tone: 'urgency', urgency: 'normal', class: 'text-urgency-normal' },
    { tone: 'urgency', urgency: 'elapsed', class: 'text-fg-muted' },
  ],
  defaultVariants: { size: 'sm', tone: 'urgency', urgency: 'normal' },
})

export interface CountdownProps extends Omit<VariantProps<typeof value>, 'urgency'> {
  target: Date | string | number | null | undefined
  /** Adds the absolute date and time as caption text beneath the ticking value. */
  showAbsolute?: boolean
  className?: string
}

const TICK_MS = 1000

export function Countdown({
  target,
  showAbsolute = false,
  size,
  tone,
  className,
}: CountdownProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const parts = countdown(target, now)

  if (!parts) {
    return <span className="text-body text-fg-muted">—</span>
  }

  return (
    <span className={cn('inline-flex flex-col', className)} title={formatAbsolute(target)}>
      <span aria-live="off" className={value({ size, tone, urgency: parts.urgency })}>
        {parts.label}
      </span>
      {showAbsolute && (
        <span className="numeric whitespace-nowrap font-mono text-caption text-fg-muted">
          {formatDateTime(target)}
        </span>
      )}
    </span>
  )
}
