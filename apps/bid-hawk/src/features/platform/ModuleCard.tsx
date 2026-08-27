import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { buttonClasses } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import type { Module } from './modules'

export interface ModuleCardProps {
  module: Module
}

/**
 * One module of the platform, as a card in the landing's 2x2.
 *
 * A grid of identical cards is on CLAUDE.md's forbidden list and is an instructed
 * exception scoped to this page; see the exceptions table there. The reason the ban
 * does not bite is that it exists to stop a card grid flattening content of unequal
 * weight, and these four really are peers on a page with nothing else to say.
 *
 * FLAT, not a gradient. The card takes `surface-sunken`, one luminance step below the
 * white workspace, and the hairline border is permitted precisely because the card
 * sits on a tone close to its parent. The gradient this replaces was the second of
 * four logged exceptions, and retiring it means the no-gradients rule now holds
 * everywhere with none.
 *
 * Every card is the same height BY CONSTRUCTION: the description block is fixed to
 * five lines of its own style, so every button sits at an identical offset from its
 * own card top and the four align across BOTH rows, not merely within one.
 *
 * Grid row stretching, `items-stretch` and `justify-between` are all deliberately
 * absent. Each equalises the CARD while leaving the CONTENT ragged — a two-line
 * description ends level with its own text and the button drops to the card's foot,
 * which puts a dead band between them. Worse, stretch only equalises within a row, so
 * the two rows would still disagree with each other.
 */
const CARD_CLASSES = cn(
  'flex w-full flex-col rounded-card border border-border bg-surface-sunken px-24 py-20',
  'transition-colors duration-standard ease-out hover:border-border-strong',
)

/**
 * Natural content width, left aligned. Height 40, horizontal padding 20, radius 8.
 * All four identical in size, fill, label and trailing arrow.
 *
 * Built from the Button variant map plus this page's own height and padding, rather
 * than hand-assembling the primary look a second time. It is applied to a plain
 * anchor on both branches — `ButtonLink` merges its own variant map with an incoming
 * className, which made the two branches differ and the four buttons non-identical.
 */
const ACTION_CLASSES = cn(
  buttonClasses({ variant: 'primary' }),
  // Height 36 and horizontal padding 16, tightened from 40/20 now that six cards share
  // the fold. `h-control-md` IS 36; the height is a token, not a literal.
  'h-control-md w-fit px-16',
)

/** The action's contents, written once so the four link elements cannot drift. */
function TryNow(): ReactNode {
  return (
    <>
      Try now
      <span aria-hidden="true">
        <ArrowRight size={ICON.md} />
      </span>
    </>
  )
}

/**
 * No `forwardRef`. It existed only so the landing could focus card 01's action on mount,
 * which is gone: the page takes no focus on load. The ref was also the one thing making
 * card 01 structurally unlike the other three, on a page whose whole argument is that
 * the four modules are peers.
 */
export function ModuleCard({ module }: ModuleCardProps) {
  const { name, description, mark: Mark, href, separatelyDeployed } = module

  return (
    <div className={CARD_CLASSES}>
      {/* One row at the mark's own height, so the name is vertically centred against
          the tile rather than sitting on its own line. No ordinal: it was a mono
          numeral in the amber accent, which CLAUDE.md reserves for agent activity and
          time-sensitive metadata, and a card index is neither. */}
      <div className="flex h-mark items-center gap-12">
        <Mark />
        {/* SectionTitle at weight 500, per the approved layout. The named style
            carries 600 and is used on four other screens, so the weight is overridden
            here rather than in the style — a component using a weight outside its
            named style, which CLAUDE.md forbids. Deliberate, scoped to this page, and
            recorded in docs/decisions.md rather than left to look like an oversight. */}
        <h2 className="text-section-title font-medium text-fg">{name}</h2>
      </div>

      {/* Fixed to a measured line count, so all six cards are the same height BY
          CONSTRUCTION rather than by grid stretch.
          The earlier five-line block existed because the paragraph took the card's full
          width, so its line count moved with the viewport and no single number was right
          everywhere. `max-w-landing` caps the measure at 504px. At three columns the card
          is narrower than that, so the cap does not bind and the card sets the measure;
          below lg, where the grid falls to two columns then one, it does bind and stops a
          full-width card running the text to a single 1000px line. The block is sized to
          the longest of the six at the NARROWEST card, which is the three-column case.
          A narrower text column inside a wider card is not dead space; it is the measure,
          and it is why the same copy reads the same on a 1190 laptop and a 1440 display.
          `min-h` rather than `h` so a longer description grows rather than clips: the
          four are verbatim and must never be truncated. A test asserts none of them
          wraps past the block, so a copy change cannot silently open a gap or overflow. */}
      {/* 8 above and 8 below, not the 10 and 6 the brief specified: 10 and 6 are not on
          CLAUDE.md's frozen spacing scale, so `mt-10` and `mt-6` fail to compile — which is
          exactly what that scale is for. 8 and 8 sum to the same 16 of total vertical
          space, both on-scale, and give the block an even rhythm. Recorded in
          docs/decisions.md. */}
      <p className="mt-8 min-h-description max-w-landing text-card-description text-fg-muted">
        {description}
      </p>

      {/* NO WRAP. Allowed to wrap, the credentials dropped below the button at narrow card
          widths and made that one card 42.8px taller than the other five — measured — which
          is exactly what this block must not do. Held on one row they truncate instead, and
          the card keeps the height the fixed description block gives it. */}
      <div className="mt-8 flex flex-nowrap items-center gap-x-12">
        {/* Same tab either way. A module on another deployment cannot go through this
            router, so it is a plain anchor; one hosted here is a Link, which keeps the
            navigation client-side and lets the router decide whether the address needs
            a '#'. No target, and therefore no rel. */}
        {/* A plain anchor, not ButtonLink: that component merges its own variant map
            with an incoming className, so the two branches produced different class
            lists and the four buttons were not identical. Here both branches carry
            exactly ACTION_CLASSES. */}
        {separatelyDeployed ? (
          <a href={href} className={ACTION_CLASSES}>
            <TryNow />
          </a>
        ) : (
          <Link to={href} className={ACTION_CLASSES}>
            <TryNow />
          </Link>
        )}

        {/* Demo access, on the one module whose deployment has no sign-in. It sits BESIDE
            the button on the same row rather than under it, so it cannot add height and
            leave this card taller than the other five — the fixed description block is
            what equalises them, and anything below the button would defeat it.
            Mono at Caption, muted: quiet enough to read as access details rather than a
            feature of the product. */}
      </div>
    </div>
  )
}
