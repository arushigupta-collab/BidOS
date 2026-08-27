import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'

export interface NextStepBandProps {
  /**
   * Mono ordinal, matching the setup path's numbering. Omitted once the band points
   * at the feed, which is the outcome of setup rather than a step within it.
   */
  ordinal?: string
  title: string
  detail: string
  actionLabel: string
  to: string
}

/**
 * The next place to go, offered from the end of a list.
 *
 * While setup is unfinished each of the two list screens points at the other, so an
 * operator can move between sources and people in either direction rather than only
 * forwards. Once both sides exist, both bands point at the feed instead: continuing
 * to offer the other list would send an operator back into configuration they have
 * already finished.
 *
 * Quiet on purpose: the operator came to look at a list, and this is an offer
 * rather than a prompt. Secondary treatment, because the page already has its one
 * primary.
 */
export function NextStepBand({ ordinal, title, detail, actionLabel, to }: NextStepBandProps) {
  const navigate = useNavigate()

  return (
    <section
      aria-label="Where to go next"
      className="flex flex-col gap-16 bg-surface-sunken px-24 py-16 md:flex-row md:items-center md:justify-between md:px-32"
    >
      <div className="flex min-w-0 items-baseline gap-12">
        {ordinal && (
          <span
            className="numeric shrink-0 font-mono text-metadata-strong text-fg-subtle"
            aria-hidden="true"
          >
            {ordinal}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body-strong text-fg">{title}</p>
          <p className="max-w-lede text-secondary-body text-fg-muted">{detail}</p>
        </div>
      </div>

      <Button
        variant="secondary"
        onClick={() => navigate(to)}
        iconRight={<ArrowRight size={ICON.md} aria-hidden="true" />}
      >
        {actionLabel}
      </Button>
    </section>
  )
}
