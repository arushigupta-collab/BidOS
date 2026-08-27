import { Sparkles } from 'lucide-react'
import type { Suggestion } from './reasoning'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatAbsolute, formatRelative } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import { criteriaSentence } from './evaluationModel'

export interface SuggestionPanelProps {
  suggestion: Suggestion
  generatedAt: string
}

/**
 * The only agent output in Bid Partners, and the only place the amber accent appears in
 * this module. Everything else on this screen is deterministic arithmetic over seed data
 * and carries no attribution, because attributing arithmetic to an agent is how a
 * product ends up unable to say which of its numbers are opinions.
 *
 * The language is SUGGESTED throughout. Never selected, chosen, best or winner: the
 * panel sits beside the data and the selection is the bid manager's. The advisory line
 * sits with the suggestion rather than in the disclaimer, so a client reading a
 * screenshot sees the relationship without being told.
 *
 * No streaming, no typing effect, no looping motion. The spinner is the only looping
 * animation in this product.
 */
export function SuggestionPanel({
  suggestion,
  generatedAt,
}: SuggestionPanelProps) {
  const { leader, runnerUp, margin, reasoning, assessments, risks } = suggestion

  return (
    <section
      aria-labelledby="suggestion-heading"
      className="ai-wash flex flex-col gap-20 rounded-card border p-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-8">
        <h2 id="suggestion-heading" className="flex items-center gap-8">
          <Sparkles size={ICON.sm} aria-hidden="true" className="shrink-0 text-accent" />
          <span className="text-micro-label uppercase text-accent">Bid Hawk suggestion</span>
        </h2>
        <p title={formatAbsolute(generatedAt)} className="text-metadata text-fg-muted">
          {`Generated ${formatRelative(generatedAt)}`}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <p className="text-section-title text-fg">
          {`Suggested: ${leader.partner.name}`}
        </p>
        <p className="text-secondary-body text-fg-secondary">
          {runnerUp
            ? `Composite ${leader.composite} of 100, ${margin} ahead of ${runnerUp.partner.name}.`
            : `Composite ${leader.composite} of 100. No other partner has responded yet.`}
        </p>

        {/* The advisory line sits with the suggestion, not in the disclaimer, and it names
            the criteria it was computed on. It used to quote the weights; those are hidden
            now, so it names the five criteria instead — a suggestion whose basis lives
            elsewhere on the page can be screenshotted away from it and read as
            unconditional. */}
        <p className="text-secondary-body text-fg">
          {`This is a suggestion, ranked on ${criteriaSentence()}. The selection is the bid manager's, and any partner in the table can be chosen.`}
        </p>

      </div>

      <div className="flex flex-col gap-4">
        <p className="text-micro-label uppercase text-fg-muted">Reasoning</p>
        <ul className="flex flex-col gap-8">
          {reasoning.map((sentence) => (
            <li key={sentence} className="max-w-prose text-secondary-body text-fg-secondary">
              {sentence}
            </li>
          ))}
        </ul>
      </div>

      {/* Stacked rows on a shared surface, NOT three bordered cards in a row. Three
          identical evenly spaced cards is the first entry on CLAUDE.md's forbidden list,
          and it is also the wrong shape here: a reader comparing the shortlist wants the
          three names on one left edge, not three boxes to scan across. */}
      <div className="flex flex-col gap-8">
        <p className="text-micro-label uppercase text-fg-muted">Shortlist, strengths and concerns</p>
        <div className="overflow-hidden rounded-control bg-surface">
          {assessments.map((assessment, index) => (
            <div
              key={assessment.partnerName}
              className={cn(
                'grid grid-cols-1 gap-x-24 gap-y-8 px-16 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
                index > 0 && 'border-t border-border',
              )}
            >
              <p className="text-body-strong text-fg">{assessment.partnerName}</p>
              <div className="flex min-w-0 flex-col gap-8">
                <ul className="flex flex-col gap-4">
                  {assessment.strengths.map((item) => (
                    <li key={item} className="text-secondary-body text-success">
                      {item}
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-col gap-4">
                  {assessment.concerns.map((item) => (
                    <li key={item} className="text-secondary-body text-fg-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {risks.length > 0 && (
        <div className="flex flex-col gap-8">
          <p className="text-micro-label uppercase text-fg-muted">Flagged risks</p>
          <ul className="flex flex-col gap-8">
            {risks.map((risk) => (
              <li
                key={risk.id}
                className="flex flex-col gap-4 rounded-control bg-surface p-12 sm:flex-row sm:items-start sm:gap-12"
              >
                {/* Destructive for high severity, neutral otherwise. The deadline urgency
                    tokens belong to your own bid deadlines and appear nowhere here.
                    Fixed-width cell: an inline badge is as wide as its word, so "Medium"
                    pushed its sentence 19px right of the "High" rows above it. */}
                <span className="shrink-0 sm:w-col-severity">
                  <Badge tone={risk.severity === 'high' ? 'destructive' : 'neutral'}>
                    {risk.severity === 'high' ? 'High' : 'Medium'}
                  </Badge>
                </span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="text-body-strong text-fg">{risk.partnerName}</span>
                  <span className="max-w-prose text-secondary-body text-fg-secondary">
                    {risk.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-caption text-fg-muted">
        Generated by Bid Hawk from the partner records and the responses received. Verify against
        the source documents before committing to a consortium.
      </p>
    </section>
  )
}
