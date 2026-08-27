import { Fragment, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'

interface Destination {
  to: string
  label: string
  /** Reads from the workspace, so it moves the moment a record is created. */
  count?: number
  /** Leads the label. Present only on the item that leaves the module. */
  icon?: ReactNode
}

/** A hairline between nav groups. Hidden from assistive technology: the grouping
    is visual, and a list item with no content would otherwise be announced. */
function NavDivider() {
  return <li aria-hidden="true" className="mx-8 h-16 w-hair shrink-0 bg-border-strong" />
}

/**
 * Product navigation, on the canvas and outside the workspace card, which is where
 * CLAUDE.md's shell model puts it.
 *
 * The feed leads because it is the working product; sources and people are
 * configuration and sit behind a separator. The active destination is marked by an
 * accent bar, a surface shift and type weight together, never by colour alone.
 *
 * The feed appears only once a source and a bid manager both exist. It is the
 * outcome of setup, and a destination that cannot yet show anything is a broken
 * promise on the first screen an operator sees. Sources and People are always
 * present, so the nav never has fewer than two places to go.
 *
 * Nothing renders on the BidOS landing. Every module destination here belongs to a
 * module — sources, people and the feed are Bid Hawk's own screens, registry,
 * responses and evaluation are Bid Partners' — and offering them from the platform
 * page would let an operator into a module's internals without entering the module,
 * on the one screen whose job is to establish that the platform and its modules are
 * different levels.
 *
 * Which module's destinations appear is decided by the address, and only one module's
 * ever appear at once. Two modules' screens side by side would say they are one
 * module with a lot of screens.
 *
 * The exception is the leading "BidOS" item, which goes the other way: out of the
 * module and back to the platform. It exists because the logo link that does the
 * same job is conventional but invisible until hovered, and returning to the
 * platform previously meant pressing browser back once per screen visited.
 *
 * Its chevron points left because it is the only item that moves up a level rather
 * than sideways, and the divider after it says the same thing structurally. Three
 * groups, in order: leave the module, the working screen, then configuration.
 */
export function CanvasNav() {
  const { pathname } = useLocation()
  const sources = useWorkspace((state) => state.sources.length)
  const people = useWorkspace((state) => state.people.length)
  const tenders = useWorkspace((state) => state.tenders.length)
  const uploaded = useWorkspace((state) => state.uploadedTenders.length)

  /**
   * Whether there is anything to look at.
   *
   * The feed is gated on setup because a feed of SOURCED listings is empty before
   * a platform is connected. A reading does not depend on that, and the feed page
   * itself was already exempted -- but its link was not, so a reader could be
   * looking at the feed with no way in the navigation to return to it.
   */
  const hasFeed = (sources > 0 && people > 0) || uploaded > 0

  if (pathname === '/') return null

  const inBidPartners = pathname.startsWith('/bid-partners')

  /**
   * Bid Hawk's working screen appears only once a source and a bid manager both
   * exist, because the feed is the outcome of its setup. Bid Partners has no such
   * gate: its partners load by default, so all three of its screens have something
   * to show from the first visit.
   */
  /**
   * Bid Partners' three carry NO counts yet. A badge reading 7 is a promise that
   * there are seven things to look at, and all three screens are placeholders this
   * session — the counts go on when the screens that honour them do.
   */
  const destinations: Destination[] = inBidPartners
    ? [
        // "Partners", not "Registry": the label named the data structure rather than the
        // job. Its two siblings name activities, and this screen is both the partner
        // network and where invitations are sent from. Not "Invite" either, which would
        // undersell it — the screen is the record as well as the action.
        //
        // The ROUTE stays /bid-partners/registry. Renaming it would break the tracker's
        // "Invite more partners" deep link, any bookmark a client already holds, and the
        // page's own title, for a label change nobody navigates by.
        { to: '/bid-partners/registry', label: 'Partners' },
        { to: '/bid-partners/responses', label: 'Responses' },
        { to: '/bid-partners/evaluation', label: 'Evaluation' },
      ]
    : [
        ...(hasFeed ? [{ to: '/feed', label: 'RFP feed', count: tenders + uploaded }] : []),
        /**
         * Offered from the start, unlike the feed.
         *
         * Reading a tender is what the module is for and it needs no setup: a
         * reading routes against the bid managers the workspace holds in the
         * database, not the ones revealed in this browser. Hiding it until
         * configuration was done put the module's own purpose behind its
         * preparation.
         */
        { to: '/intake', label: 'Read a tender' },
        /**
         * Sources and People are NOT here.
         *
         * They are configuration, and the navigation now carries only the two
         * things somebody opens Bid Hawk to do: read a tender, and look at what
         * has been read. Both screens are still reached from the module's own
         * "Set up sourcing", and the feed's gate still sends anyone who needs a
         * source straight to one -- so nothing is stranded, it is just no longer
         * offered beside the work.
         */
      ]

  /**
   * Bid Hawk keeps its second hairline, between the working screen and the two
   * configuration screens. Bid Partners has no such split: its three screens are one
   * sequence, so a divider inside them would invent a distinction.
   */
  const splitAfterFirst = !inBidPartners

  return (
    <nav aria-label="Workspace" className="min-w-0">
      <ul className="flex flex-wrap items-center gap-4">
        <NavItem
          to="/"
          label="BidOS"
          icon={<ChevronLeft size={ICON.sm} aria-hidden="true" />}
        />
        <NavDivider />

        {destinations.map((item, index) => (
          <Fragment key={item.to}>
            <NavItem {...item} />
            {splitAfterFirst && index === 0 && index < destinations.length - 1 && (
              <NavDivider />
            )}
          </Fragment>
        ))}
      </ul>
    </nav>
  )
}

function NavItem({ to, label, count, icon }: Destination) {
  return (
    <li>
      <NavLink
        to={to}
        // Only the module items can be the current route, so only they take the
        // active treatment; "BidOS" never renders on the page it points at.
        end
        className={({ isActive }) =>
          cn(
            'relative flex h-control-md items-center gap-8 rounded-control px-12',
            'transition-colors duration-micro ease-out',
            isActive
              ? 'bg-surface text-body-strong text-fg shadow-card'
              : 'text-body text-fg-secondary hover:bg-canvas-sunken hover:text-fg',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-8 left-0 top-8 w-2 rounded-full bg-accent"
              />
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
            {typeof count === 'number' && count > 0 && (
              <span
                className={cn(
                  'numeric rounded-full px-8 py-2 font-mono text-metadata',
                  isActive ? 'bg-primary-subtle text-primary' : 'bg-canvas-sunken text-fg-muted',
                )}
              >
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}
