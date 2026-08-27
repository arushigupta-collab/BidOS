import { Sparkles } from 'lucide-react'
import type { Tender } from '@/types'
import { SUMMARY_DISCLAIMER, TENDER_SUMMARIES } from '@/data/seed/tenderDetail'
import { formatAbsolute, formatRelative } from '@/lib/format'
import { ICON } from '@/lib/tokens'

const LINES = [
  ['Scope', 'scope'],
  ['Financials', 'financials'],
  ['Eligibility', 'eligibility'],
  ['Risk', 'risk'],
  ['Precedent', 'precedent'],
  ['Recommendation', 'recommendation'],
  ['Evaluation', 'evaluation'],
] as const

/**
 * Agent output, on the AI wash and attributed.
 *
 * The disclaimer is not decoration. This is a précis of a 262-page document
 * produced by a model, and an operator who submits against it without reading the
 * source has been misled by the interface. Decision support, not authority.
 */
export function BidHawkSummary({ tender }: { tender: Tender }) {
  const summary = TENDER_SUMMARIES[tender.id]

  return (
    <section
      aria-labelledby={`summary-${tender.id}`}
      className="ai-wash flex flex-col gap-16 rounded-card border p-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-8">
        {/* A heading, not a styled paragraph: paging by heading has to meet the
            agent's output before it meets the eligibility list below it. */}
        <h2 id={`summary-${tender.id}`} className="flex items-center gap-8">
          <Sparkles size={ICON.sm} aria-hidden="true" className="shrink-0 text-accent" />
          <span className="text-micro-label uppercase text-accent">Bid Hawk summary</span>
        </h2>
        <p title={formatAbsolute(tender.discoveredAt)} className="text-metadata text-fg-muted">
          {`Generated ${formatRelative(tender.discoveredAt)}`}
        </p>
      </div>

      {summary ? (
        <ul className="flex flex-col gap-12">
          {LINES.map(([label, key]) => (
            <li key={key} className="text-secondary-body text-fg-secondary">
              <span className="text-secondary-body-strong text-fg">{label}. </span>
              {summary[key]}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-secondary-body text-fg-secondary">{tender.aiSummary}</p>
      )}

      <p className="text-caption text-fg-muted">{SUMMARY_DISCLAIMER}</p>
    </section>
  )
}
