/**
 * The rules about review, held apart from the screen that draws them.
 *
 * The compile gate in particular is a rule about when a bid may be assembled,
 * not a detail of how a board renders -- and it moved once already, from
 * "everyone submitted" to "everyone approved". A rule that can move needs a test
 * holding it in place, and a rule buried in JSX cannot have one.
 */
import type { ReviewState, WorkStatus, RoleId } from './rfps'

export interface Reviewable {
  role_id: RoleId
  status: WorkStatus
  review: ReviewState
}

/** The five roles the bid manager is waiting on. Their own package is not one. */
export function specialists<T extends Reviewable>(packages: T[]): T[] {
  return packages.filter((p) => p.role_id !== 'bid-manager')
}

/**
 * Whether the manager may move on to their own forms and the compiler.
 *
 * Approval, not submission. Opening the gate on submission made the manager's
 * reading of five specialists' work optional, and an approval that nothing waits
 * on is a decoration.
 */
export function readyToCompile(packages: Reviewable[]): boolean {
  const five = specialists(packages)
  return five.length > 0 && five.every((p) => p.review === 'approved')
}

/** Handed back and not yet read. The manager's own queue. */
export function awaitingReview(packages: Reviewable[]): number {
  return specialists(packages).filter(
    (p) => p.status === 'submitted' && p.review === 'pending',
  ).length
}

export function approvedCount(packages: Reviewable[]): number {
  return specialists(packages).filter((p) => p.review === 'approved').length
}

/**
 * Which of the two states to show on a row.
 *
 * The verdict outranks the position in the work. A package sent back is
 * technically in progress again, and saying that instead of "changes requested"
 * buries the only thing anybody needs to know about it.
 */
export function rowState(pkg: Reviewable): ReviewState | WorkStatus {
  return pkg.review === 'pending' ? pkg.status : pkg.review
}

/**
 * Why a change request cannot be sent, if it cannot.
 *
 * A package sent back without a reason costs the specialist a round trip to ask
 * what was wrong, so the note is required rather than encouraged.
 */
export function changeRequestError(note: string): string | null {
  return note.trim() ? null : 'Say what needs changing.'
}
