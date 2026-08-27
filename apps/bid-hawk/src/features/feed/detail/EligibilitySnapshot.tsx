import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cva } from 'class-variance-authority'
import type { EligibilityRow, EligibilityStatus, Tender } from '@/types'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatCount } from '@/lib/format'
import { ICON } from '@/lib/tokens'

const COPY: Record<EligibilityStatus, { label: string; tone: 'success' | 'warning' | 'destructive' }> = {
  pass: { label: 'Met', tone: 'success' },
  warn: { label: 'Action needed', tone: 'warning' },
  fail: { label: 'Not met', tone: 'destructive' },
}

const ICONS = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const

const row = cva('flex flex-col gap-8 rounded-card p-16 sm:flex-row sm:items-start sm:gap-16', {
  variants: {
    status: {
      pass: 'bg-surface-sunken',
      warn: 'bg-surface-sunken',
      // A criterion that is not met carries the weight of what it costs.
      fail: 'bg-destructive-subtle',
    },
  },
  defaultVariants: { status: 'pass' },
})

const glyph = cva('mt-2 shrink-0', {
  variants: {
    status: { pass: 'text-success', warn: 'text-warning', fail: 'text-destructive' },
  },
  defaultVariants: { status: 'pass' },
})

function Criterion({ criterion }: { criterion: EligibilityRow }) {
  const copy = COPY[criterion.status]
  const Glyph = ICONS[criterion.status]

  return (
    <li className={row({ status: criterion.status })}>
      <Glyph size={ICON.md} aria-hidden="true" className={glyph({ status: criterion.status })} />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-body-strong text-fg">{criterion.requirement}</p>
        <p className="max-w-prose text-secondary-body text-fg-secondary">{criterion.note}</p>

        {criterion.status === 'fail' && (
          <p className="mt-4 flex items-start gap-8 rounded-control bg-surface px-12 py-8 text-secondary-body text-destructive">
            <XCircle size={ICON.sm} aria-hidden="true" className="mt-2 shrink-0" />
            <span>
              This is a disqualifying criterion. The bid cannot be submitted until it is resolved.
            </span>
          </p>
        )}
      </div>

      {/* A badge with its own word: status is never carried by colour alone. */}
      <Badge tone={copy.tone}>{copy.label}</Badge>
    </li>
  )
}

export function EligibilitySnapshot({ tender }: { tender: Tender }) {
  const rows = tender.eligibility
  if (rows.length === 0) return null

  const counts = {
    pass: rows.filter((r) => r.status === 'pass').length,
    warn: rows.filter((r) => r.status === 'warn').length,
    fail: rows.filter((r) => r.status === 'fail').length,
  }

  const strip = [
    { label: 'Met', value: counts.pass, className: 'text-success' },
    { label: 'Action needed', value: counts.warn, className: 'text-warning' },
    { label: 'Not met', value: counts.fail, className: 'text-destructive' },
  ]

  return (
    <section aria-labelledby={`eligibility-${tender.id}`} className="flex flex-col gap-16">
      <div className="flex flex-wrap items-baseline justify-between gap-16">
        <h2 id={`eligibility-${tender.id}`} className="text-section-title text-fg">
          Eligibility snapshot
        </h2>

        <dl className="flex flex-wrap items-baseline gap-x-24 gap-y-8">
          {strip.map((item) => (
            <div key={item.label} className="flex items-baseline gap-8">
              <dd className={cn('numeric font-mono text-panel-title', item.className)}>
                {formatCount(item.value)}
              </dd>
              <dt className="text-micro-label uppercase text-fg-muted">{item.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <ul className="flex flex-col gap-8">
        {rows.map((criterion) => (
          <Criterion key={criterion.id} criterion={criterion} />
        ))}
      </ul>
    </section>
  )
}
