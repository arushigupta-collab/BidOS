import { cn } from '@/lib/cn'

/**
 * The Bid Author module mark: three stacked lines of a text block, the top one
 * carrying a caret past the right edge of the other two.
 *
 * Authored sections rather than a document icon. The three lines are deliberately
 * ragged right — 23.4, 19, 15.4 — because three lines flush at both ends read as a
 * barcode, and it is the ragged edge that makes them read as text.
 *
 * The caret is what distinguishes writing from storing: it is the insertion point,
 * and it sits on the top line's own baseline so it belongs to that line rather than
 * floating above the block. Same navy tile, same even-odd knockout, same footprint
 * as the other two module marks.
 *
 * Line thickness is 2.5, set so the knocked-out area lands within a hair of Bid
 * Hawk's. Optical weight across the family was measured, not eyeballed.
 */
export function BidAuthorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Bid Author"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile, identical to the other two marks.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // Top line, the shortest of the three, so the caret carries the row.
          'M 8.6 9.6 H 16.6 V 12.1 H 8.6 Z',
          // The caret, on the top line baseline and past every other line.
          'M 17.8 12.1 L 20.6 8.6 L 23.4 12.1 L 21.7 12.1 L 20.6 10.6 L 19.5 12.1 Z',
          // Middle line, the longest of the three.
          'M 8.6 15.4 H 19 V 17.9 H 8.6 Z',
          // Last line, short, the way a closing line of a paragraph runs out.
          'M 8.6 21 H 15.4 V 23.5 H 8.6 Z',
        ].join(' ')}
      />
    </svg>
  )
}
