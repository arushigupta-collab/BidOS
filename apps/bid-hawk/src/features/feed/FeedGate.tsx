import { useNavigate } from 'react-router-dom'
import { Plug, UserPlus } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { ICON } from '@/lib/tokens'

export interface FeedGateProps {
  hasSource: boolean
  hasPerson: boolean
}

/**
 * The feed is the outcome of setup, so it is not reachable before setup is done.
 *
 * Reached by address while a prerequisite is missing, it says which step is
 * outstanding and offers that screen. Deliberately not a redirect: an address that
 * silently becomes a different address leaves the operator wondering whether they
 * mistyped it. Deliberately not an empty feed either, because an empty table implies
 * the platforms were read and returned nothing.
 *
 * Returns null once both prerequisites hold, so the caller can render the feed.
 */
export function FeedGate({ hasSource, hasPerson }: FeedGateProps) {
  const navigate = useNavigate()

  if (hasSource && hasPerson) return null

  if (!hasSource) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Plug size={ICON.lg} aria-hidden="true" />}
          title="Connect a platform before opening the feed"
          description="The feed is what Bid Hawk found on the platforms you connect. Add the first one, with the keywords that qualify a listing, and the matching RFPs arrive here."
          action={
            <Button variant="primary" onClick={() => navigate('/sources/new')}>
              Connect a source
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <EmptyState
        icon={<UserPlus size={ICON.lg} aria-hidden="true" />}
        title="Add a bid manager before opening the feed"
        description="Your platforms are connected. Bid Hawk assigns every listing it keeps to a bid manager, so it needs at least one person and the domains and regions they cover."
        action={
          <Button variant="primary" onClick={() => navigate('/team/new')}>
            Add a bid manager
          </Button>
        }
      />
    </div>
  )
}
