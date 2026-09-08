import { Link } from 'react-router-dom'
import type { Source, Tender } from '@/types'
import { Badge, Countdown } from '@/components/ui'
import { platformShortLabel } from '@/data/seed/platforms'
import { ViewRfpButton } from '@/components/shared/ViewRfpButton'
import { DeckButton } from '@/components/shared/DeckButton'
import { documentFor } from '@/data/uploaded'

export interface SummaryHeaderProps {
  tender: Tender
  source: Source | undefined
  /**
   * Whether this tender was READ rather than sourced.
   *
   * A reading has its own file in storage and the viewer signs for it. The seeded
   * tenders all reference the one document that ships with the build, and asking
   * storage for a file they never had would report their document as missing.
   */
  isUploaded?: boolean
}

/**
 * Breadcrumb, identity and the page's one primary action.
 *
 * That action is opening the source RFP, because on a summary of a 262-page
 * document nothing else comes close. It was previously a "Reassign" button that
 * scrolled to a section already visible on the page: a filled primary spent on a
 * jump link, with the genuinely valuable action demoted beside it.
 *
 * It is always enabled and always opens the same document. There is no per-tender
 * conditional and no disabled state.
 */
export function SummaryHeader({ tender, source, isUploaded }: SummaryHeaderProps) {
  return (
    <div className="flex flex-col gap-24">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-8 text-metadata text-fg-muted">
          <li>
            <Link
              to="/feed"
              className="rounded-field underline decoration-border underline-offset-4 hover:text-fg"
            >
              RFP feed
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="min-w-0 truncate text-fg-secondary">
            {tender.title}
          </li>
        </ol>
      </nav>

      <header className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-12">
          <h1 className="max-w-prose text-page-title text-fg">{tender.title}</h1>

          <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
            <span className="numeric font-mono text-metadata text-fg-muted">
              {tender.tenderRef}
            </span>
            {source && <Badge tone="neutral">{platformShortLabel(source.platformId)}</Badge>}
            <span className="min-w-0 truncate text-secondary-body text-fg-secondary">
              {tender.issuingAuthority}
            </span>
            <Countdown target={tender.bidDueAt} size="md" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-8">
          {/* The shared control, so the tracker and the ranked comparison cannot drift
              from this one. Rendered output is unchanged. */}
          {/* Only a reading has a draft; a seeded tender was never put through
              the pipeline, so the button resolves to nothing and renders nothing. */}
          <DeckButton rfpId={isUploaded ? tender.id : null} />
          {/*
            * One rule, not a second copy of it. `isUploaded` says whether the
            * workspace read this tender; `documentFor` turns that into which of
            * the three documents to show -- and it is the same function the
            * partner screens call, so the two cannot disagree.
            */}
          <ViewRfpButton
            variant="primary"
            title={tender.title}
            document={documentFor(tender)}
          />
        </div>
      </header>
    </div>
  )
}
