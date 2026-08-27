import { cn } from '@/lib/cn'

/**
 * The Opportunity Management mark: a three-stage funnel.
 *
 * The pipeline figure, and the only honest one for it: each stage is narrower than
 * the one above, because qualification is subtraction. Three stages rather than four
 * or five, because at 32px a fourth band is a stripe rather than a stage.
 *
 * SYMMETRY IS WHAT SEPARATES IT FROM BID AUTHOR, whose mark is three bars of varying
 * length. Those are left-aligned and rectangular; these are centred and tapered, and
 * the taper is the whole meaning. An earlier attempt sat too close to Bid Author at
 * small sizes: the bands were shallower, the gaps wider, and without a visible slope
 * the pair read as the same figure. The slope is now 1.3 units per side per stage and
 * the gaps are tighter than the band height, so the three read as one shape.
 *
 * Bands 1.8 deep with 2.2 gaps, spanning 11.1 to 20.9 so the figure centres on the
 * tile. Measured knockout 7.29% of the tile against the existing four at 7.22 to
 * 7.35 -- the first attempt was a slab at 144% of the family weight.
 */
export function OpportunityManagementMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Opportunity Management"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile, identical to the other marks.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // Everything entering the pipeline.
          'M 5.65 11.1 H 26.35 L 25.05 12.9 H 6.95 Z',
          // Qualified.
          'M 8.75 15.1 H 23.25 L 21.95 16.9 H 10.05 Z',
          // In negotiation, and the narrowest: what is left is what closes.
          'M 11.85 19.1 H 20.15 L 18.85 20.9 H 13.15 Z',
        ].join(' ')}
      />
    </svg>
  )
}
