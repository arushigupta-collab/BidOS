import { cn } from '@/lib/cn'

/**
 * The Project Management mark: three milestone diamonds on a rail.
 *
 * A diamond is the milestone glyph every project plan already uses, so the figure
 * says what it is without being taught. Three of them, evenly spaced, connected by
 * two short rail segments: a plan is a sequence of fixed points, and the segments
 * are what make it a sequence rather than three separate marks.
 *
 * THE RAIL DOES NOT PASS THROUGH THE DIAMONDS. It joins them edge to edge. Running
 * it through would put an even-odd slot across each diamond, hollowing the one part
 * of the figure that carries the meaning -- and at 32px a slotted diamond reads as
 * damage rather than as construction.
 *
 * Deliberately not rings. Bid Partners owns the circle, and three rings on a line
 * beside two overlapping ones is a family resemblance nobody asked for. Deliberately
 * not an outline diamond either: Bid Partners' rejected second attempt was two of
 * those, whose crossing bands read as the `<>` glyph.
 *
 * Half-diagonal 3.32, rail band 1.4, centres at 8, 16 and 24. Measured knockout 7.24%
 * of the tile against the existing four at 7.22 to 7.35, by point-sampling the
 * even-odd rule rather than counting pixels in a raster, which biases against thin
 * strokes through antialiasing.
 */
export function ProjectManagementMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Project Management"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile, identical to the other marks.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // First milestone.
          'M 8 12.68 L 11.32 16 L 8 19.32 L 4.68 16 Z',
          // Rail, first to second. Sits between the two, never inside either.
          'M 11.32 15.3 H 12.68 V 16.7 H 11.32 Z',
          // Second milestone, on the tile centre.
          'M 16 12.68 L 19.32 16 L 16 19.32 L 12.68 16 Z',
          // Rail, second to third.
          'M 19.32 15.3 H 20.68 V 16.7 H 19.32 Z',
          // Third milestone.
          'M 24 12.68 L 27.32 16 L 24 19.32 L 20.68 16 Z',
        ].join(' ')}
      />
    </svg>
  )
}
