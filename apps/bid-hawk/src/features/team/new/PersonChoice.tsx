import { forwardRef } from 'react'
import { List, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Person } from '@/types'
import { Badge, Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { PeopleTable } from '../PeopleTable'

export interface PersonChoiceProps {
  onAddNew: () => void
  /** Every person in the workspace, for the count on the secondary action. */
  total: number
  /** Only what this visit added. The full list lives on #/team. */
  addedThisSession: Person[]
}

/**
 * A fork, with a record of what this visit has added beneath it. The same shape as
 * the Add source screen: an operator who has used one should recognise this one
 * without reading it.
 */
export const PersonChoice = forwardRef<HTMLButtonElement, PersonChoiceProps>(
  function PersonChoice({ onAddNew, total, addedThisSession }, ref) {
    const navigate = useNavigate()

    return (
      <div className="flex flex-col gap-32">
        <div className="flex flex-col gap-8">
          <h2 className="text-section-title text-fg">Choose how to add</h2>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            A person record holds the domains and regions a bid manager covers, so a qualifying
            tender can be routed to them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-12">
          <Button
            variant="secondary"
            iconLeft={<List size={ICON.md} aria-hidden="true" />}
            onClick={() => navigate('/team')}
          >
            View current people
            <Badge tone="neutral" mono>
              {total}
            </Badge>
          </Button>
          <Button
            ref={ref}
            variant="primary"
            iconLeft={<Plus size={ICON.md} aria-hidden="true" />}
            onClick={onAddNew}
          >
            Add new person
          </Button>
        </div>

        {/* The caption leads the table. On arrival the columns are empty, and a
            reader meeting blank headings needs the sentence first. */}
        <div className="flex flex-col gap-8">
          <p id="people-caption" className="text-metadata text-fg-muted">
            {addedThisSession.length === 0
              ? 'What a person record holds.'
              : addedThisSession.length === 1
                ? 'Added in this session.'
                : `${addedThisSession.length} added in this session.`}
          </p>
          <div className="overflow-hidden rounded-card bg-surface">
            <PeopleTable people={addedThisSession} sortable={false} labelledBy="people-caption" />
          </div>
        </div>
      </div>
    )
  },
)
