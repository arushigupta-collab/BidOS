import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MoreHorizontal, Plus, Settings2, Trash2, UserPlus } from 'lucide-react'
import type { Person } from '@/types'
import { fetchPeople, removePerson } from '@/data/api'
import { toast } from '@/lib/toast'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { Button, ConfirmDialog, DropdownMenu, EmptyState, SkeletonText } from '@/components/ui'
import { NextStepBand } from '@/components/shared/NextStepBand'
import { SegmentedNav } from '@/components/shared/SegmentedNav'
import { PeopleTable } from '../PeopleTable'
import { PeopleSummary } from './PeopleSummary'

export function PeoplePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const highlightIds = (location.state as { highlightIds?: string[] } | null)?.highlightIds

  /**
   * The store is the one source of truth: the table, the summary and both badges
   * read the same array, so they cannot disagree while a request is in flight. The
   * API call exists for its latency, which is what drives the skeleton.
   */
  const people = useWorkspace((state) => state.people)
  const setupComplete = useWorkspace(
    (state) => state.sources.length > 0 && state.people.length > 0,
  )
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<Person | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(() => {
    setError(false)
    setLoaded(false)
    fetchPeople()
      .then(() => setLoaded(true))
      .catch(() => setError(true))
  }, [])

  useEffect(load, [load])

  const onConfirmRemoval = async () => {
    if (!pendingRemoval) return
    setRemoving(true)
    try {
      await removePerson(pendingRemoval.id)
      toast.warning(`${pendingRemoval.name} removed`, {
        description: 'Nothing will be routed to them until they are added again.',
      })
      setPendingRemoval(null)
    } finally {
      setRemoving(false)
    }
  }

  const renderMenu = useCallback(
    (person: Person) => (
      <DropdownMenu
        label={`Actions for ${person.name}`}
        triggerIcon={<MoreHorizontal size={ICON.md} aria-hidden="true" />}
        items={[
          {
            id: 'edit',
            label: 'Edit person',
            icon: <Settings2 size={ICON.sm} />,
            onSelect: () => navigate(`/team/${person.id}/edit`),
          },
          {
            id: 'remove',
            label: 'Remove person',
            icon: <Trash2 size={ICON.sm} />,
            onSelect: () => setPendingRemoval(person),
            destructive: true,
            separated: true,
          },
        ]}
      />
    ),
    [navigate],
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        <SegmentedNav
          label="People"
          items={[
            { to: '/team/new', label: 'Add people' },
            { to: '/team', label: 'People', count: people.length, end: true },
          ]}
        />

        <div className="flex flex-wrap items-end justify-between gap-16">
          <div className="flex flex-col gap-4">
            <h1 id="people-heading" className="text-page-title text-fg">
              People
            </h1>
            <p className="max-w-lede text-secondary-body text-fg-muted">
              Every Account Executive a qualifying tender can be routed to.
            </p>
          </div>
          <Button
            variant="primary"
            iconLeft={<Plus size={ICON.md} aria-hidden="true" />}
            onClick={() => navigate('/team/new')}
          >
            Add people
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
          title="The people list could not be read"
          description="Nothing was changed. The workspace store did not answer in time."
          action={
            <Button variant="primary" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {loaded && people.length === 0 && (
        <EmptyState
          icon={<UserPlus size={ICON.lg} aria-hidden="true" />}
          title="No people yet"
          description="A person record holds the domains and regions an Account Executive covers, which is what a qualifying tender is routed against. Without one, a match has nobody to go to."
          action={
            <Button variant="primary" onClick={() => navigate('/team/new')}>
              Add the first person
            </Button>
          }
        />
      )}

      {loaded && people.length > 0 && (
        <>
          <div className="px-24 pb-16 md:px-32">
            <PeopleSummary people={people} />
          </div>

          {/* Named after the page heading, so the table is not anonymous. */}
          <PeopleTable
            people={people}
            renderMenu={renderMenu}
            highlightIds={highlightIds}
            labelledBy="people-heading"
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
                ordinal="01"
                title="Connect your platforms"
                detail="A source is a platform Bid Hawk reads, with the keywords that decide which of its listings are worth keeping."
                actionLabel="Add sources"
                to="/sources/new"
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
        title={`Remove ${pendingRemoval?.name ?? 'this person'}?`}
        description={
          pendingRemoval
            ? `${pendingRemoval.name} will no longer be routed any tender. Their record and its expertise are deleted.`
            : ''
        }
        confirmLabel="Remove person"
        onConfirm={onConfirmRemoval}
      />
    </div>
  )
}
