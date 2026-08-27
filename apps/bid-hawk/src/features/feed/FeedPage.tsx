import { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { Button, EmptyState, SkeletonText } from '@/components/ui'
import { fetchFeed } from '@/data/api'
import { platformShortLabel } from '@/data/seed/platforms'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { FeedFilters } from './FeedFilters'
import { FeedGate } from './FeedGate'
import { FeedStatStrip } from './FeedStatStrip'
import { FeedTable } from './FeedTable'
import { NO_FILTERS, applyFilters, buildFeed, feedStats, type FeedFilters as Filters } from './feedModel'

export function FeedPage() {
  const seeded = useWorkspace((state) => state.tenders)
  const uploaded = useWorkspace((state) => state.uploadedTenders)
  const assignments = useWorkspace((state) => state.uploadedAssignments)
  const loadUploaded = useWorkspace((state) => state.loadUploaded)

  /**
   * One list, no distinction drawn. A reading and a sourced listing are both
   * tenders this workspace holds, and a feed that separated them would say the
   * uploaded one is less real -- which is the opposite of the argument the
   * intake screen just made.
   */
  const tenders = useMemo(() => [...uploaded, ...seeded], [uploaded, seeded])
  const people = useWorkspace((state) => state.people)
  const sources = useWorkspace((state) => state.sources)

  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)

  const load = useCallback(() => {
    setError(false)
    setLoaded(false)
    fetchFeed()
      .then(() => setLoaded(true))
      .catch(() => setError(true))
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    void loadUploaded()
  }, [loadUploaded])

  // Assignment is computed, not stored: it changes when the team changes.
  const rows = useMemo(() => buildFeed(tenders, people, assignments), [tenders, people])
  const visible = useMemo(() => applyFilters(rows, filters), [rows, filters])
  const stats = useMemo(() => feedStats(visible), [visible])

  const sourcePlatform = useCallback(
    (sourceId: string) =>
      platformShortLabel(sources.find((source) => source.id === sourceId)?.platformId ?? ''),
    [sources],
  )

  // The feed is the outcome of setup, so setup comes first. There are no
  // no-sources or no-people states inside the feed any more: the gate is the state.
  /**
   * The gate stands only while there is nothing to show. A tender that was read
   * rather than sourced does not depend on a connected platform, so once one
   * exists the feed lists it and the gate has nothing left to protect.
   */
  if (uploaded.length === 0 && (sources.length === 0 || people.length === 0)) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
        <FeedGate hasSource={sources.length > 0} hasPerson={people.length > 0} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        <div className="flex flex-col gap-4">
          <h1 id="feed-heading" className="text-page-title text-fg">
            RFP feed
          </h1>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            Every listing Bid Hawk kept, and who it routed to.
          </p>
        </div>
      </header>

      {!loaded && !error && (
        <div className="flex flex-col gap-16 px-24 py-24 md:px-32">
          <SkeletonText lines={8} />
        </div>
      )}

      {error && (
        <EmptyState
          tone="destructive"
          title="The feed could not be read"
          description="Nothing was changed. The workspace store did not answer in time."
          action={
            <Button variant="primary" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {loaded && (
        <>
          <div className="flex flex-col gap-16 px-24 pb-16 md:px-32">
            <FeedStatStrip stats={stats} />

            <FeedFilters
              filters={filters}
              onChange={setFilters}
              sources={sources}
              resultCount={visible.length}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Inbox size={ICON.lg} aria-hidden="true" />}
              title="No RFPs match these filters"
              description="Every listing Bid Hawk kept is still here. The current combination of source and deadline excludes all of them."
              action={
                <Button variant="primary" onClick={() => setFilters(NO_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <FeedTable rows={visible} sourcePlatform={sourcePlatform} labelledBy="feed-heading" />
          )}
        </>
      )}
    </div>
  )
}
