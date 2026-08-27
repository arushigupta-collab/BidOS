import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { FeedGate } from '../FeedGate'
import { buildFeed } from '../feedModel'
import { AssignmentBlock } from './AssignmentBlock'
import { BidHawkSummary } from './BidHawkSummary'
import { RfpSnapshot } from './RfpSnapshot'
import { RiskFlags } from './RiskFlags'
import { SummaryHeader } from './SummaryHeader'
import { SummaryPager } from './SummaryPager'

export function RfpSummaryPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const seeded = useWorkspace((state) => state.tenders)
  const uploaded = useWorkspace((state) => state.uploadedTenders)
  const assignments = useWorkspace((state) => state.uploadedAssignments)
  const uploadedManagers = useWorkspace((state) => state.uploadedManagers)
  const loadUploaded = useWorkspace((state) => state.loadUploaded)

  // Loaded here as well as on the feed, because this address is reachable
  // directly: the intake screen links straight to it once a reading completes.
  useEffect(() => {
    void loadUploaded()
  }, [loadUploaded])

  const tenders = useMemo(() => [...uploaded, ...seeded], [uploaded, seeded])
  const people = useWorkspace((state) => state.people)
  const sources = useWorkspace((state) => state.sources)

  /** Feed order, so prev and next move the way the list reads: deadline first. */
  const rows = useMemo(
    () =>
      buildFeed(tenders, people, assignments).sort(
        (a, b) => new Date(a.tender.bidDueAt).getTime() - new Date(b.tender.bidDueAt).getTime(),
      ),
    [tenders, people],
  )

  const index = rows.findIndex((row) => row.tender.id === id)
  const row = index >= 0 ? rows[index] : null

  const [overrideId, setOverrideId] = useState<string | null>(null)

  /**
   * A tender that was READ rather than sourced is never gated.
   *
   * The gate exists because a feed of sourced listings is meaningless before any
   * platform is connected. That reasoning does not reach a document somebody
   * handed over: you have it because you uploaded it, and no amount of
   * configuration is what put it there.
   *
   * Without this the module's own front door was a dead end. Bid Hawk opens onto
   * the upload; a reader could upload a tender, wait four minutes for it to be
   * read, and then be told to connect a platform before they could see the
   * result.
   */
  const isUploaded = uploaded.some((tender) => tender.id === id)

  if (!isUploaded && (sources.length === 0 || people.length === 0)) {
    return (
      <div className="scrollable flex flex-1 flex-col">
        <FeedGate hasSource={sources.length > 0} hasPerson={people.length > 0} />
      </div>
    )
  }

  if (!row) {
    return (
      <div className="scrollable flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Inbox size={ICON.lg} aria-hidden="true" />}
          title="That RFP is not in this feed"
          description="The address did not match a listing Bid Hawk kept. It may have been removed with its source, or the link may be out of date."
          action={
            <Button variant="primary" onClick={() => navigate('/feed')}>
              Back to the RFP feed
            </Button>
          }
        />
      </div>
    )
  }

  const { tender, match } = row
  const source = sources.find((item) => item.id === tender.sourceId)

  /** The routed owner unless the operator has chosen someone else on this visit. */
  const owner =
    (overrideId ? people.find((person) => person.id === overrideId) : undefined) ?? match.person

  const onAssign = (personId: string) => {
    setOverrideId(personId)
    const person = people.find((item) => item.id === personId)
    toast.success(`${tender.tenderRef} assigned`, {
      description: `${person?.name ?? 'The owner'} now owns this bid.`,
    })
  }

  return (
    <div className="scrollable flex flex-1 flex-col gap-24 px-24 py-24 md:px-32">
      <SummaryHeader tender={tender} source={source} isUploaded={isUploaded} />

      <div className="grid grid-cols-1 gap-24 lg:grid-cols-summary">
        <div className="flex flex-col gap-24">
          <RfpSnapshot tender={tender} />
        </div>

        <div className="flex min-w-0 flex-col gap-32">
          {/*
            * The eligibility snapshot is deliberately NOT here.
            *
            * Bid Hawk's job is to read a tender, say what it is, flag what is
            * wrong with it and route it. Judging this company against the
            * tender's criteria is the bid manager's decision, and it is made on
            * Bid Orchestrator's tender page where the person who owns the bid is
            * looking at it. Showing the verdict in both places made a judgement
            * appear before anyone had accepted the work.
            *
            * The rows are still extracted and still stored. Nothing about the
            * pipeline changed; only which screen presents them.
            */}
          <BidHawkSummary tender={tender} />
          <RiskFlags tender={tender} />
          <AssignmentBlock
            owner={owner}
            /*
             * The workspace's own people where it has them, and the database's
             * roster where it does not. A reading arrives before any setup has
             * run, and its owner has to be handed to somebody.
             */
            people={people.length > 0 ? people : uploadedManagers}
            tender={tender}
            onAssign={onAssign}
          />
        </div>
      </div>

      <SummaryPager
        index={index}
        total={rows.length}
        previousId={index > 0 ? rows[index - 1].tender.id : null}
        nextId={index < rows.length - 1 ? rows[index + 1].tender.id : null}
      />
    </div>
  )
}
