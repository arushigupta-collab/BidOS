import { cn } from '@/lib/cn'

/**
 * The Bid Partners module mark: two overlapping rings, knocked out of the same navy
 * tile the other three module marks use.
 *
 * Two parties sharing something. The lens where the two rings cross is the subject of
 * the figure, not a by-product of it: each ring is an outline, so the bands meet twice
 * and the even-odd fill returns those crossings to navy, which is what makes one read
 * as passing behind the other. Neither ring contains the other and both are the same
 * size, so neither party is subordinate.
 *
 * THIRD ATTEMPT, and the constraints are what the first two failed. No arrowhead, no
 * chevron, no angle bracket. Nothing reading as direction, flow or movement — the
 * first attempt was two chevrons, which read as an arrow and collided with Bid
 * Orchestrator. Nothing reading as code, brackets or syntax — the second was two
 * diamond outlines whose crossing bands read as `<>`, the developer-tooling glyph.
 * A circle has no vertex to point with and no straight edge to bracket with, which is
 * why it is the form that satisfies all of it.
 *
 * It is the only mark in the family without a straight edge, and the only one whose
 * subpaths overlap on purpose. Both are deliberate: the tile, the radius, the
 * even-odd construction and the measured weight are what hold the four together, and
 * a fourth straight-edged figure is what kept producing an arrow or a bracket.
 *
 * Radius 5.2, band 1.4, centres 3.2 either side of the tile centre. That puts the
 * knocked-out area within a per cent of Bid Hawk's, measured by point-sampling the
 * even-odd rule with an exact distance test rather than counting pixels in a raster.
 */
export function BidPartnersMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Bid Partners"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile, identical to the other three marks.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // Left ring: outer circle, then the inner one that makes it an outline.
          'M 12.8 10.8 A 5.2 5.2 0 1 1 12.8 21.2 A 5.2 5.2 0 1 1 12.8 10.8 Z',
          'M 12.8 12.2 A 3.8 3.8 0 1 0 12.8 19.8 A 3.8 3.8 0 1 0 12.8 12.2 Z',
          // Right ring, the same figure translated. Their bands cross twice, above and
          // below the tile centre, and the even-odd fill returns both to navy.
          'M 19.2 10.8 A 5.2 5.2 0 1 1 19.2 21.2 A 5.2 5.2 0 1 1 19.2 10.8 Z',
          'M 19.2 12.2 A 3.8 3.8 0 1 0 19.2 19.8 A 3.8 3.8 0 1 0 19.2 12.2 Z',
        ].join(' ')}
      />
    </svg>
  )
}
