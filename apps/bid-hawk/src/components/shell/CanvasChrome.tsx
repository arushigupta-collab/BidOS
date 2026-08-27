import { Link, useLocation } from 'react-router-dom'
import { WORKSPACE } from '@/data/seed/workspace'
import { EmbLogo } from './EmbLogo'

/**
 * Brand and environment identity, rendered ON the canvas and never inside the
 * workspace card. Keeping it outside is what makes the workspace read as a
 * surface the product sits on rather than as the whole page.
 */

/**
 * The logo is the way home, from every screen inside a module.
 *
 * Top left is where a home affordance is looked for, so the conventional thing is
 * the right thing here. It is not the only one: a logo link is conventional but not
 * discoverable, so `CanvasNav` carries an explicit "BidOS" item beside it. Two
 * affordances for one destination is not redundancy when one of them is invisible
 * until hovered.
 *
 * On the platform landing itself it is a plain image. A link to the page you are
 * already on is a control that does nothing, which is worse than no control.
 *
 * The accessible name is "BidOS home", not the logo's alt text: what the control
 * does matters more than what the picture is, and "EMB Global" would have announced
 * the brand while saying nothing about the destination.
 */
export function CanvasIdentity() {
  const onPlatformLanding = useLocation().pathname === '/'

  if (onPlatformLanding) return <EmbLogo />

  return (
    <Link
      to="/"
      aria-label="BidOS home"
      className="inline-flex rounded-control transition-opacity duration-micro ease-out hover:opacity-70"
    >
      {/* The image's own alt would compete with the link's name, so it is dropped
          to presentational and the link carries the name. */}
      <EmbLogo alt="" />
    </Link>
  )
}

export interface CanvasEnvironmentProps {
  /**
   * False on the platform landing, where the wordmark is already set at Display
   * size inside the card. Two BidOS wordmarks on one screen read as a duplication
   * defect rather than as brand reinforcement.
   */
  showWordmark?: boolean
}

/**
 * The environment string, and on every route but one the wordmark above it.
 *
 * When the wordmark is suppressed the block keeps the wordmark's own line box, so
 * the environment string stays on the same right edge and the same baseline it
 * always sits on. Without that the canvas would visibly reflow between `/` and any
 * other route, which is a worse tell than the duplication being removed.
 */
export function CanvasEnvironment({ showWordmark = true }: CanvasEnvironmentProps) {
  return (
    <div className="flex flex-col items-end gap-2 text-right">
      {/* The wordmark's own line box is held open whether or not the wordmark is in
          it, so the environment string keeps the same right edge and baseline on
          every route and the canvas does not reflow between them. A sized container
          rather than transparent text with a non-breaking space: the space was a
          spacer pretending to be content. */}
      <div className="flex h-wordmark items-center">
        {showWordmark && (
          <p className="text-panel-title text-fg">
            Bid<span className="text-fg-muted">OS</span>
          </p>
        )}
      </div>
      <p className="numeric font-mono text-metadata text-fg-muted">{WORKSPACE.environment}</p>
    </div>
  )
}
