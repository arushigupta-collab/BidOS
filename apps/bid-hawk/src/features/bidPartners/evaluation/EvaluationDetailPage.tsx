import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileQuestion, Inbox } from 'lucide-react'
import { Button, EmptyState, Separator } from '@/components/ui'
import { usePartnerData } from '@/features/bidPartners/usePartnerData'
import { formatDateTime } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { DecisionDrawer } from './DecisionDrawer'
import { RankedTable } from './RankedTable'
import { ViewRfpButton } from '@/components/shared/ViewRfpButton'
import { documentFor } from '@/data/uploaded'
import { CriteriaNote } from './CriteriaNote'
import { SideBySide } from './SideBySide'
import { SuggestionPanel } from './SuggestionPanel'
import { DEFAULT_WEIGHTS, rankPartners } from './evaluationModel'
import { suggest } from './reasoning'

/**
 * The ranked comparison. A full page, never a drawer, matching the RFP summary precedent:
 * this carries a scoring panel, a ranked table, an eleven-row side-by-side and an agent
 * panel, and a drawer would cramp every one of them.
 */
export function EvaluationDetailPage() {
  const { rfpId } = useParams()
  const navigate = useNavigate()
  const { tenders } = usePartnerData()
  const partners = useWorkspace((state) => state.partners)
  const invitations = useWorkspace((state) => state.invitations)
  const decisions = useWorkspace((state) => state.decisions)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [drawerFor, setDrawerFor] = useState<string[] | null>(null)
  // One timestamp per mount, so the panel does not claim to regenerate on every render.
  const [generatedAt] = useState(() => new Date().toISOString())

  const tender = tenders.find((t) => t.id === rfpId) ?? null
  const rows = useMemo(
    () =>
      invitations
        .filter((row) => row.rfpId === rfpId)
        .flatMap((invitation) => {
          const partner = partners.find((p) => p.id === invitation.partnerId)
          return partner ? [{ partner, invitation }] : []
        }),
    [invitations, partners, rfpId],
  )

  // ONE weighting, and it is not adjustable: the sliders were removed at the client's
  // request, so there is no second ranking to compare against and nothing that can change
  // between renders. `DEFAULT_WEIGHTS` is the only weighting in the product.
  const ranked = useMemo(
    () => (tender ? rankPartners(tender, rows, DEFAULT_WEIGHTS) : []),
    [tender, rows],
  )
  const suggestion = useMemo(() => (tender ? suggest(tender, ranked) : null), [tender, ranked])

  const decision = decisions.find((row) => row.rfpId === rfpId)

  // An address that names no tender is a different failure from a tender nobody has
  // been invited to, and saying the second about the first is a false statement.
  if (!tender) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<FileQuestion size={ICON.lg} aria-hidden="true" />}
          title="That RFP is not in this workspace"
          description={`The address refers to ${rfpId ?? 'an RFP'}, which does not match any tender held here. It may have been renamed, or the link may be from another workspace.`}
          action={
            <Button variant="primary" onClick={() => navigate('/bid-partners/evaluation')}>
              Back to partner evaluation
            </Button>
          }
        />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Inbox size={ICON.lg} aria-hidden="true" />}
          title="No partners have been invited to this RFP"
          description={`Nothing has gone out against ${tender.tenderRef} yet. Choose it in the registry, select the partners you want on it and send the invitation.`}
          action={
            <Button variant="primary" onClick={() => navigate('/bid-partners/registry')}>
              Go to the registry
            </Button>
          }
        />
      </div>
    )
  }

  if (ranked.length === 0) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Inbox size={ICON.lg} aria-hidden="true" />}
          title="Nothing to rank yet"
          description={`${rows.length} partners have been invited to ${tender.tenderRef} but none has submitted a document. Ranking partners on an empty document set would be a fake ordering, so there is nothing here until something arrives.`}
          action={
            <Button
              variant="primary"
              onClick={() => navigate(`/bid-partners/responses/${tender.id}`)}
            >
              Open the response tracker
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="scrollable flex flex-1 flex-col gap-24 px-24 py-24 md:px-32">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-8 text-metadata text-fg-muted">
          <li>
            <Link to="/bid-partners/evaluation" className="rounded-field underline decoration-border underline-offset-4 hover:text-fg">
              Partner evaluation
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
            <span className="numeric font-mono text-metadata text-fg-muted">{tender.tenderRef}</span>
            <span className="min-w-0 truncate text-secondary-body text-fg-secondary">
              {tender.issuingAuthority}
            </span>
            <span className="text-secondary-body text-fg-secondary">
              {`Bid due ${formatDateTime(tender.bidDueAt)}`}
            </span>
            <span className="numeric font-mono text-metadata text-fg-muted">
              {`${ranked.length} of ${rows.length} partners compared`}
            </span>
          </div>

          {decision && (
            <p className="w-fit rounded-control bg-success-subtle px-12 py-8 text-secondary-body text-success">
              {`Decision recorded: ${decision.chosenPartnerIds
                .map((id) => partners.find((p) => p.id === id)?.name ?? id)
                .join(', ')}`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-8">
          {/* The shared control, so this and the tracker cannot drift from Bid Hawk's. */}
          <ViewRfpButton title={tender.title} document={documentFor(tender)} />
          <Button variant="primary" onClick={() => setDrawerFor([])}>
            {decision ? 'Change decision' : 'Record decision'}
          </Button>
        </div>
      </header>

      <CriteriaNote />

      {/* --- 3b ranked table ------------------------------------------------- */}
      <section aria-labelledby="ranked-heading" className="flex flex-col gap-12">
        <h2 id="ranked-heading" className="text-section-title text-fg">
          Ranked comparison
        </h2>

        <RankedTable
          ranked={ranked}
          expanded={expanded}
          onToggle={(id) => setExpanded((c) => ({ ...c, [id]: c[id] !== true }))}
          onSelect={(id) => setDrawerFor([id])}
          chosenPartnerIds={decision?.chosenPartnerIds ?? []}
        />
      </section>

      <SideBySide rows={ranked} tender={tender} />

      <Separator />

      {suggestion && (
        <SuggestionPanel suggestion={suggestion} generatedAt={generatedAt} />
      )}

      <DecisionDrawer
        open={drawerFor !== null}
        onClose={() => setDrawerFor(null)}
        tender={tender}
        ranked={ranked}
        initialChosen={drawerFor ?? []}
        suggestedPartnerId={suggestion?.leader.partner.id ?? null}
        existing={decision}
      />
    </div>
  )
}
