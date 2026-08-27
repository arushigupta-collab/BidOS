import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Tooltip } from '@/components/ui'
import { ICON } from '@/lib/tokens'

export interface SummaryPagerProps {
  index: number
  total: number
  previousId: string | null
  nextId: string | null
}

/**
 * Move through the feed without going back to it.
 *
 * The position names what it counts against. Arriving here from a filtered feed
 * showing two results and reading "3 of 14" contradicted the list just left, so
 * the label says which list the number belongs to. Paging deliberately walks the
 * whole feed rather than the filtered subset: the filters are view state on the
 * other screen, and silently inheriting them would make Next skip listings with
 * no visible reason.
 */
export function SummaryPager({ index, total, previousId, nextId }: SummaryPagerProps) {
  const navigate = useNavigate()

  return (
    <footer className="flex flex-wrap items-center justify-between gap-16 border-t border-border pt-16">
      <p className="text-metadata text-fg-muted">
        <span className="numeric font-mono">{`${index + 1} of ${total}`}</span>
        {' in the RFP feed'}
      </p>

      <div className="flex items-center gap-8">
        {previousId ? (
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ChevronLeft size={ICON.sm} aria-hidden="true" />}
            onClick={() => navigate(`/feed/${previousId}`)}
          >
            Previous
          </Button>
        ) : (
          <Tooltip content="This is the first RFP in the feed, which is ordered by deadline." wrapDisabled>
            <Button
              variant="ghost"
              size="sm"
              disabled
              iconLeft={<ChevronLeft size={ICON.sm} aria-hidden="true" />}
            >
              Previous
            </Button>
          </Tooltip>
        )}

        {nextId ? (
          <Button
            variant="ghost"
            size="sm"
            iconRight={<ChevronRight size={ICON.sm} aria-hidden="true" />}
            onClick={() => navigate(`/feed/${nextId}`)}
          >
            Next
          </Button>
        ) : (
          <Tooltip content="This is the last RFP in the feed, which is ordered by deadline." wrapDisabled>
            <Button
              variant="ghost"
              size="sm"
              disabled
              iconRight={<ChevronRight size={ICON.sm} aria-hidden="true" />}
            >
              Next
            </Button>
          </Tooltip>
        )}
      </div>
    </footer>
  )
}
