/**
 * How a specialist's own row reads.
 *
 * Mirrors the rule in Bid Orchestrator: the bid manager's verdict outranks where
 * the package sits in the work. Restated rather than shared because the two apps
 * deploy separately -- the schema is the contract between them.
 */
export type ReviewState = 'pending' | 'approved' | 'changes-requested'

export function stateOf(work: { status: string; review: ReviewState }): string {
  return work.review === 'pending' ? work.status : work.review
}

/** Approved is the only end state. Submitted work can still come back. */
export function stillMine(all: { review: ReviewState }[]): number {
  return all.filter((w) => w.review !== 'approved').length
}
