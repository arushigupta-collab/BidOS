import { useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, MessageSquarePlus } from 'lucide-react'
import type { RiskFlag, RiskSeverity, Tender } from '@/types'
import { Badge, Button } from '@/components/ui'
import { raisePrebidQuery } from '@/data/api'
import { raiseQuery } from '@/data/prebid'
import { PrebidQueries } from './PrebidQueries'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'

const SEVERITY: Record<RiskSeverity, { label: string; tone: 'destructive' | 'warning' | 'neutral' }> = {
  high: { label: 'High severity', tone: 'destructive' },
  medium: { label: 'Medium severity', tone: 'warning' },
  low: { label: 'Low severity', tone: 'neutral' },
}

function Flag({
  flag,
  tenderRef,
  rfpId,
  onRaised,
}: {
  flag: RiskFlag
  tenderRef: string
  /** The reading a query is recorded against. Null on a seeded tender. */
  rfpId: string | null
  onRaised: () => void
}) {
  const [raising, setRaising] = useState(false)
  const [raised, setRaised] = useState(false)

  const quotes = flag.evidence ?? []

  /**
   * Every page this flag cites, deduplicated and in order.
   *
   * The flag carries its own `page_no` and each piece of evidence carries one;
   * they are usually the same page and occasionally are not, which is the case
   * worth showing -- a contradiction spans two pages by definition.
   */
  const pages = [...new Set([flag.pageNo, ...quotes.map((q) => q.pageNo)].filter(
    (page): page is number => typeof page === 'number',
  ))].sort((a, b) => a - b)

  const raise = async () => {
    setRaising(true)
    try {
      /*
       * Written to the reading, not just held on screen. This resolved after a
       * delay and persisted nothing: the green pill survived until the next
       * reload and the query it claimed to have recorded did not exist.
       *
       * A seeded tender has no row to record against and no buyer to send to, so
       * it keeps the old behaviour of acknowledging and nothing more -- and says
       * as much in the confirmation rather than implying a submission.
       */
      if (rfpId) {
        await raiseQuery({
          rfpId,
          tenderRef: tenderRef || null,
          flagTitle: flag.title,
          question: composeQuestion(flag),
          severity: flag.severity,
          pageNo: firstPage(flag),
        })
      } else {
        await raisePrebidQuery(tenderRef, flag.title)
      }

      setRaised(true)
      onRaised()
      toast.success('Pre-bid query recorded', {
        description: rfpId
          ? `${flag.title} is on the pre-bid list for ${tenderRef}. Open Pre-bid queries to export it.`
          : `${flag.title} is queued for the pre-bid submission against ${tenderRef}.`,
      })
    } catch (caught) {
      toast.error('The query could not be recorded', {
        description: (caught as Error).message,
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
        <div className="flex flex-wrap items-center gap-12">
          {/*
            * The page the defect was found on.
            *
            * This screen's whole claim is that the document contradicts itself,
            * and it made that claim without saying where. The reading has always
            * recorded the page; the interface simply never showed it, so a reader
            * who wanted to check had nowhere to start.
            *
            * Absent on a seeded tender, which was never read from a document, so
            * nothing renders rather than a page number that would be invented.
            */}
          {pages.length > 0 && (
            <p className="font-mono text-metadata text-fg-muted">
              {pages.length === 1 ? 'p.' : 'pp.'} {pages.join(', ')}
            </p>
          )}
          {flag.deadlineNote && (
            <p className="flex items-center gap-4 text-metadata text-accent">
              <CalendarClock size={ICON.xs} aria-hidden="true" />
              {flag.deadlineNote}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <p className="text-panel-title text-fg">{flag.title}</p>
        <p className="max-w-prose text-secondary-body text-fg-secondary">{flag.detail}</p>
      </div>

      {/*
        * The verbatim lines the judgement rests on, each with its page. `detail`
        * is prose and carries no quotes by construction -- the two were split
        * apart in the extraction schema precisely so a reader could tell the
        * product's summary from the document's own words.
        */}
      {quotes.length > 0 && (
        <ul className="flex flex-col gap-8">
          {quotes.map((item, i) => (
            <li key={i} className="border-l-2 border-border-strong pl-12">
              <p className="max-w-prose text-secondary-body italic text-fg-secondary">
                &ldquo;{item.quote}&rdquo;
              </p>
              {item.pageNo ? (
                <p className="mt-2 font-mono text-metadata text-fg-muted">page {item.pageNo}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

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

/**
 * The question actually sent, composed from what the flag found.
 *
 * The buyer receives this without the product around it, so it has to stand on
 * its own: what was found, where, and what is being asked. `recommendation` is
 * written for the bidder rather than the buyer, so it is not sent -- it is the
 * reason the query exists, not the query.
 */
export function composeQuestion(flag: RiskFlag): string {
  const page = firstPage(flag)

  /*
   * Trailing punctuation is stripped before anything is appended. Concatenated
   * naively this read "...risk of missing it. (page 10)." and closed a quote as
   * `RFP Document.".` -- a full stop, a parenthetical, then another full stop.
   * The buyer reads this sentence without the product around it.
   */
  const stem = flag.detail.trim().replace(/[.;:,\s]+$/, '')
  const where = page ? ` (page ${page})` : ''

  const quote = flag.evidence?.[0]?.quote?.trim().replace(/[.;:,\s]+$/, '')
  const cited = quote ? ` The document states: \u201C${quote}.\u201D` : ''

  return `${stem}${where}.${cited} Please clarify or confirm which requirement governs.`
    .replace(/\s+/g, ' ')
    .trim()
}

/** The page a reader should turn to first, or null if the reading recorded none. */
export function firstPage(flag: RiskFlag): number | null {
  if (typeof flag.pageNo === 'number') return flag.pageNo
  return flag.evidence?.find((e) => typeof e.pageNo === 'number')?.pageNo ?? null
}

export function RiskFlags({ tender, rfpId }: { tender: Tender; rfpId: string | null }) {
  /*
   * Counts the queries raised on this visit, so the Pre-bid queries button
   * re-reads its list. The button's count is the reason to press it.
   */
  const [raisedCount, setRaisedCount] = useState(0)

  if (tender.riskFlags.length === 0) return null

  return (
    <section aria-labelledby={`risk-${tender.id}`} className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <h2 id={`risk-${tender.id}`} className="text-section-title text-fg">
          Risk flags
        </h2>
        {/* Beside the flags, because this is where every query in it came from. */}
        <PrebidQueries rfpId={rfpId} tenderRef={tender.tenderRef} raisedCount={raisedCount} />
      </div>

      <ul className="flex flex-col gap-12">
        {tender.riskFlags.map((flag) => (
          <Flag
            key={flag.id}
            flag={flag}
            tenderRef={tender.tenderRef}
            rfpId={rfpId}
            onRaised={() => setRaisedCount((n) => n + 1)}
          />
        ))}
      </ul>
    </section>
  )
}
