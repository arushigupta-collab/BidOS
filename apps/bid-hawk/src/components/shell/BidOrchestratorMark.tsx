import { cn } from '@/lib/cn'

/**
 * The Bid Orchestrator module mark: three bars converging on one point, knocked
 * out of the same navy tile the other two module marks use.
 *
 * Distribution and consolidation in one figure. The outer two bars are angled at
 * the point rather than parallel to it, which is what makes the group read as
 * converging rather than as a list; the middle bar carries the point itself.
 *
 * The three bars stop short of meeting. Partly because it holds the tension, and
 * partly because the fill is even-odd: subpaths that overlapped would cancel back
 * to navy and the convergence would fill in as a solid wedge.
 */
export function BidOrchestratorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Bid Orchestrator"
      className={cn('h-mark w-mark', className)}
    >
      <path
        fillRule="evenodd"
        className="fill-primary"
        d={[
          // The tile, identical to the other two marks.
          'M 8 0 H 24 A 8 8 0 0 1 32 8 V 24 A 8 8 0 0 1 24 32 H 8 A 8 8 0 0 1 0 24 V 8 A 8 8 0 0 1 8 0 Z',
          // Upper bar, angled down towards the point.
          'M 8.6 8.6 L 17.2 11.4 L 17.2 13.7 L 8.6 10.9 Z',
          // Middle bar, running level and ending in the point the others aim at.
          'M 8.6 14.9 H 20.6 L 23.4 16 L 20.6 17.2 H 8.6 Z',
          // Lower bar, the mirror of the upper.
          'M 8.6 23.4 L 17.2 20.6 L 17.2 18.3 L 8.6 21.1 Z',
        ].join(' ')}
      />
    </svg>
  )
}
