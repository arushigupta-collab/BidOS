import { useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, MessageSquarePlus } from 'lucide-react'
import type { RiskFlag, RiskSeverity, Tender } from '@/types'
import { Badge, Button } from '@/components/ui'
import { raisePrebidQuery } from '@/data/api'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'

const SEVERITY: Record<RiskSeverity, { label: string; tone: 'destructive' | 'warning' | 'neutral' }> = {
  high: { label: 'High severity', tone: 'destructive' },
  medium: { label: 'Medium severity', tone: 'warning' },
  low: { label: 'Low severity', tone: 'neutral' },
}

function Flag({ flag, tenderRef }: { flag: RiskFlag; tenderRef: string }) {
  const [raising, setRaising] = useState(false)
  const [raised, setRaised] = useState(false)

  const raise = async () => {
    setRaising(true)
    try {
      await raisePrebidQuery(tenderRef, flag.title)
      setRaised(true)
      toast.success('Pre-bid query recorded', {
        description: `${flag.title} is queued for the pre-bid submission against ${tenderRef}.`,
      })
    } catch {
      toast.error('The query could not be recorded', {
        description: 'Nothing was submitted. Try again.',
      })
    } finally {
      setRaising(false)
    }
  }

  return (
    <li className="flex flex-col gap-12 rounded-card bg-surface-sunken p-20">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <Badge tone={SEVERITY[flag.severity].tone} icon={<AlertTriangle size={ICON.xs} />}>
          {SEVERITY[flag.severity].label}
        </Badge>
        {flag.deadlineNote && (
          <p className="flex items-center gap-4 text-metadata text-accent">
            <CalendarClock size={ICON.xs} aria-hidden="true" />
            {flag.deadlineNote}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <p className="text-panel-title text-fg">{flag.title}</p>
        <p className="max-w-prose text-secondary-body text-fg-secondary">{flag.detail}</p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-micro-label uppercase text-fg-muted">Bid Hawk recommends</p>
        <p className="max-w-prose text-secondary-body text-fg">{flag.recommendation}</p>
      </div>

      {/* Once raised this is a state, not an action, so it stops being a button
          rather than becoming a disabled one with nothing to explain. */}
      {raised ? (
        <p
          role="status"
          className="flex w-fit items-center gap-8 rounded-control bg-success-subtle px-12 py-8 text-secondary-body text-success"
        >
          <CheckCircle2 size={ICON.sm} aria-hidden="true" />
          Recorded for the pre-bid submission
        </p>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          loading={raising}
          iconLeft={<MessageSquarePlus size={ICON.sm} aria-hidden="true" />}
          onClick={raise}
        >
          Raise as pre-bid query
        </Button>
      )}
    </li>
  )
}

export function RiskFlags({ tender }: { tender: Tender }) {
  if (tender.riskFlags.length === 0) return null

  return (
    <section aria-labelledby={`risk-${tender.id}`} className="flex flex-col gap-16">
      <h2 id={`risk-${tender.id}`} className="text-section-title text-fg">
        Risk flags
      </h2>

      <ul className="flex flex-col gap-12">
        {tender.riskFlags.map((flag) => (
          <Flag key={flag.id} flag={flag} tenderRef={tender.tenderRef} />
        ))}
      </ul>
    </section>
  )
}
