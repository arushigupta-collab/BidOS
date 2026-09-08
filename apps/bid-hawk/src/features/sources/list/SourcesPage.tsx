import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pause, Play, Plus, Settings2, Trash2 } from 'lucide-react'
import type { Source } from '@/types'
import { fetchSources, removeSource, setSourceStatus } from '@/data/api'
import { useWorkspace } from '@/store/useWorkspace'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import { Button, ConfirmDialog, DropdownMenu, EmptyState, SkeletonText } from '@/components/ui'
import { NextStepBand } from '@/components/shared/NextStepBand'
import { SegmentedNav } from '@/components/shared/SegmentedNav'
import { SourcesSummary } from './SourcesSummary'
import { SourcesTable } from '../SourcesTable'

export function SourcesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const highlightIds = (location.state as { highlightIds?: string[] } | null)?.highlightIds

  /**
   * The store is the one source of truth: the table, the summary and both badges
   * read the same array, so they cannot disagree while a request is in flight. The
   * API call exists for its latency, which is what drives the skeleton.
   */
  const sources = useWorkspace((state) => state.sources)
  const setupComplete = useWorkspace(
    (state) => state.sources.length > 0 && state.people.length > 0,
  )
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<Source | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(() => {
    setError(false)
    setLoaded(false)
    fetchSources()
      .then(() => setLoaded(true))
      .catch(() => setError(true))
  }, [])

  useEffect(load, [load])

  const onToggleStatus = async (source: Source) => {
    const paused = source.status !== 'paused'
    const next = await setSourceStatus(source.id, paused ? 'paused' : 'active')
    toast.info(paused ? `${next.name} paused` : `${next.name} resumed`, {
      description: paused
        ? 'Its listings stay searchable and no new ones are collected.'
        : 'New listings from this platform will qualify again.',
    })
  }

  const onConfirmRemoval = async () => {
    if (!pendingRemoval) return
    setRemoving(true)
    try {
      await removeSource(pendingRemoval.id)
      toast.warning(`${pendingRemoval.name} removed`, {
        description: 'Nothing from this platform will qualify until it is added again.',
      })
      setPendingRemoval(null)
    } finally {
      setRemoving(false)
    }
  }

  const renderMenu = useCallback(
    (source: Source) => (
      <DropdownMenu
        label={`Actions for ${source.name}`}
        triggerIcon={<MoreHorizontal size={ICON.md} aria-hidden="true" />}
        items={[
          {
            id: 'edit',
            label: 'Edit source',
            icon: <Settings2 size={ICON.sm} />,
            onSelect: () => undefined,
            // Editing loads a saved source back into the add form, which is the
            // same screen in a second mode. Disabled rather than pointed at a
            // blank form: a control that opens an empty draft while claiming to
            // edit this source is worse than one that says it is not ready.
            disabled: true,
            disabledReason:
              'Editing a saved source is not built yet. Remove and add it again to change its keywords.',
          },
          {
            id: 'pause',
            label: source.status === 'paused' ? 'Resume' : 'Pause',
            icon: source.status === 'paused' ? <Play size={ICON.sm} /> : <Pause size={ICON.sm} />,
            onSelect: () => void onToggleStatus(source),
          },
          {
            id: 'remove',
            label: 'Remove source',
            icon: <Trash2 size={ICON.sm} />,
            onSelect: () => setPendingRemoval(source),
            destructive: true,
            separated: true,
          },
        ]}
      />
    ),
    // Stable by construction: every handler works from the source passed to it
    // and from setState updaters, so none of them reads a captured render value.
    [],
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        <SegmentedNav
          label="Sources"
          items={[
            { to: '/sources/new', label: 'Add source' },
            { to: '/sources', label: 'Sources', count: sources.length, end: true },
          ]}
        />

        <div className="flex flex-wrap items-end justify-between gap-16">
          <div className="flex flex-col gap-4">
            <h1 id="sources-heading" className="text-page-title text-fg">
              Sources
            </h1>
            <p className="max-w-lede text-secondary-body text-fg-muted">
              Every platform connected to this workspace.
            </p>
          </div>
          <Button
            variant="primary"
            iconLeft={<Plus size={ICON.md} aria-hidden="true" />}
            onClick={() => navigate('/sources/new')}
          >
            Add source
          </Button>
        </div>
      </header>

      {!loaded && !error && (
        <div className="flex flex-col gap-16 px-24 py-24 md:px-32">
          <SkeletonText lines={6} />
        </div>
      )}

      {error && (
        <EmptyState
          tone="destructive"
          title="The source list could not be read"
          description="Nothing was changed. The workspace store did not answer in time."
          action={
            <Button variant="primary" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {loaded && sources.length === 0 && (
        <EmptyState
          icon={<Plus size={ICON.lg} aria-hidden="true" />}
          title="No sources connected"
          description="A source is a platform Bid Hawk reads, with the keywords that decide which listings are worth keeping. Without one there is nothing to source RFPs from."
          action={
            <Button variant="primary" onClick={() => navigate('/sources/new')}>
              Add the first source
            </Button>
          }
        />
      )}

      {loaded && sources.length > 0 && (
        <>
          <div className="px-24 pb-16 md:px-32">
            <SourcesSummary sources={sources} />
          </div>

          {/* Named after the page heading, so the table is not anonymous. */}
          <SourcesTable
            sources={sources}
            renderMenu={renderMenu}
            highlightIds={highlightIds}
            openable
            labelledBy="sources-heading"
          />

          <div className="shrink-0">
            {setupComplete ? (
              <NextStepBand
                title="Open the RFP feed"
                detail="Bid Hawk has matched listings against your connected platforms and routed each one to an Account Executive."
                actionLabel="Open the RFP feed"
                to="/feed"
              />
            ) : (
              <NextStepBand
                ordinal="02"
                title="Add your Account Executives"
                detail="A person record holds the domains and regions an Account Executive covers, which is what a qualifying tender is routed against."
                actionLabel="Add people"
                to="/team/new"
              />
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        destructive
        pending={removing}
        title={`Remove ${pendingRemoval?.name ?? 'this source'}?`}
        description={
          pendingRemoval
            ? `Bid Hawk will stop reading ${pendingRemoval.url} and nothing from this platform will qualify until it is added again.`
            : ''
        }
        confirmLabel="Remove source"
        onConfirm={onConfirmRemoval}
      />
    </div>
  )
}
