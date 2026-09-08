import { useCallback, useEffect, useState } from 'react'
import { Download, MessageSquare } from 'lucide-react'
import { Button, Dialog } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { downloadXlsx } from '@/lib/xlsx'
import { fetchQueries, type PrebidQuery } from '@/data/prebid'

/**
 * Every pre-bid query raised on one tender, and the sheet that goes to the buyer.
 *
 * A pre-bid query has a deadline attached and leaves the building, so the point
 * of collecting them is the export. Reading them on screen is how somebody checks
 * the list before sending it.
 *
 * Only a reading has queries. A seeded tender has no row to hang one on and no
 * buyer to send them to, so the control does not appear at all rather than
 * appearing empty.
 */

const when = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

export interface PrebidQueriesProps {
  rfpId: string | null
  tenderRef: string
  /** Bumped by the flag list when a query is raised, so the count stays honest. */
  raisedCount: number
}

export function PrebidQueries({ rfpId, tenderRef, raisedCount }: PrebidQueriesProps) {
  const [queries, setQueries] = useState<PrebidQuery[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!rfpId) return
    fetchQueries(rfpId)
      .then(setQueries)
      .catch((caught: Error) => setError(caught.message))
  }, [rfpId])

  // `raisedCount` is in the dependencies so raising one re-reads the list: the
  // count on the button is the reason to press it and has to be current.
  useEffect(load, [load, raisedCount])

  if (!rfpId) return null

  const sheet = {
    name: 'Pre-bid queries',
    rows: [
      ['Tender', 'Defect', 'Question', 'Severity', 'Page', 'Raised'],
      ...queries.map((q) => [
        q.tenderRef ?? tenderRef,
        q.flagTitle,
        q.question,
        q.severity ?? '',
        // A page the reading did not record is blank, never a zero: zero is a
        // page number and would send somebody to the front of the document.
        q.pageNo ? String(q.pageNo) : '',
        when(q.raisedAt),
      ]),
    ],
  }

  /** Safe as a file name, and identifiable once it is sitting in a downloads folder. */
  const fileName = `Pre-bid queries ${(tenderRef || 'tender').replace(/[/\\:*?"<>|]/g, '-')}`

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        iconLeft={<MessageSquare size={ICON.sm} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Pre-bid queries
        {queries.length > 0 ? (
          <span className="ml-4 font-mono text-metadata text-fg-muted">{queries.length}</span>
        ) : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Pre-bid queries"
        description={`Raised against ${tenderRef || 'this tender'}. These go to the buyer before the query deadline.`}
        className="w-[min(96vw,60rem)] max-w-none"
      >
        {error ? (
          <p role="alert" className="text-secondary-body text-destructive-fg">
            {error}
          </p>
        ) : queries.length === 0 ? (
          <p className="text-secondary-body text-fg-muted">
            Nothing raised yet. Each risk flag on this tender offers a query, and
            they collect here.
          </p>
        ) : (
          <div className="flex flex-col gap-16">
            <ol className="flex flex-col gap-12">
              {queries.map((q, i) => (
                <li key={q.id} className="flex flex-col gap-4 rounded-card bg-surface-sunken p-16">
                  <div className="flex flex-wrap items-baseline justify-between gap-8">
                    <p className="text-body-strong text-fg">
                      {i + 1}. {q.flagTitle}
                    </p>
                    <p className="font-mono text-metadata text-fg-muted">
                      {q.pageNo ? `p. ${q.pageNo} · ` : ''}
                      {when(q.raisedAt)}
                    </p>
                  </div>
                  <p className="max-w-prose text-secondary-body text-fg-secondary">{q.question}</p>
                </li>
              ))}
            </ol>

            <Button
              variant="primary"
              className="self-start"
              iconLeft={<Download size={ICON.md} aria-hidden="true" />}
              onClick={() => downloadXlsx(fileName, sheet)}
            >
              Download as Excel
            </Button>
          </div>
        )}
      </Dialog>
    </>
  )
}
