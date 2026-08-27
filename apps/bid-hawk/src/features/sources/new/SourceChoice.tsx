import { forwardRef } from 'react'
import { List, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Source } from '@/types'
import { Badge, Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { SourcesTable } from '../SourcesTable'

export interface SourceChoiceProps {
  onAddNew: () => void
  /** Every source in the workspace, for the count on the secondary action. */
  total: number
  /** Only what this visit added. The full list lives on #/sources. */
  addedThisSession: Source[]
}

/**
 * A fork, with a record of what this visit has added beneath it.
 *
 * The table arrives with headers and no rows on purpose: before anything is
 * added, the columns themselves are the useful content — they state what a source
 * records. It fills as sources are added rather than restating the workspace's
 * existing eight, which would make this screen a second copy of the list.
 */
export const SourceChoice = forwardRef<HTMLButtonElement, SourceChoiceProps>(
  function SourceChoice({ onAddNew, total, addedThisSession }, ref) {
    const navigate = useNavigate()

    return (
      <div className="flex flex-col gap-32">
        <div className="flex flex-col gap-8">
          <h2 className="text-section-title text-fg">Choose how to add</h2>
          <p className="max-w-lede text-secondary-body text-fg-muted">
            A source is a platform Bid Hawk reads, with the keywords that decide which of its
            listings are worth keeping.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-12">
          <Button
            variant="secondary"
            iconLeft={<List size={ICON.md} aria-hidden="true" />}
            onClick={() => navigate('/sources')}
          >
            View current sources
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
            Add new source
          </Button>
        </div>

        {/* The caption leads the table. On arrival the columns are empty, and a
            reader meeting blank headings needs the sentence first. */}
        <div className="flex flex-col gap-8">
          <p id="sources-caption" className="text-metadata text-fg-muted">
            {addedThisSession.length === 0
              ? 'What a source records.'
              : addedThisSession.length === 1
                ? 'Added in this session.'
                : `${addedThisSession.length} added in this session.`}
          </p>
          <div className="overflow-hidden rounded-card bg-surface">
            <SourcesTable sources={addedThisSession} sortable={false} labelledBy="sources-caption" />
          </div>
        </div>
      </div>
    )
  },
)
