import { cn } from '@/lib/cn'

/**
 * The Bid Hawk agent mark: a hawk head reduced to two shapes knocked out of a
 * navy tile — a downward chevron for the beak, and one angled slot for the eye.
 *
 * Same 32px footprint, same 8px radius and the same optical weight as the tile
 * the EMB monogram used, so the product mark and the company logo read as one
 * family rather than two unrelated marks. Geometric, not illustrative: there is
 * no bird here, only the two strokes that make a head read as a hawk.
 *
 * Both shapes are cut with an even-odd fill rather than painted in the surface
 * colour, so the mark keeps its silhouette on any ground it is placed on.
 */
export function BidHawkMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Bid Hawk"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // The eye: one angled slot, cut high and left of centre.
          'M 9.4 10.6 L 17.4 10.6 L 20 13.4 L 12 13.4 Z',
          // The beak: a downward chevron, its inner edge parallel to the outer.
          'M 9 16.6 L 16 25.6 L 23 16.6 L 19.4 16.6 L 16 21 L 12.6 16.6 Z',
        ].join(' ')}
      />
    </svg>
  )
}
