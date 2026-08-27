/**
 * The shape both imports report back. The dialog renders this and nothing else, so
 * a new import means a reader function and a set of preview headers rather than a
 * second dialog.
 */

export interface AcceptedRow<T> {
  /** Line in the operator's file, counting the header as line 1. */
  line: number
  input: T
  /** One cell per preview header, already formatted for display. */
  preview: string[]
}

export interface RejectedRow {
  line: number
  /** The row as written, so the operator can find it in their file. */
  raw: string
  reason: string
}

export interface ImportReport<T> {
  accepted: Array<AcceptedRow<T>>
  rejected: RejectedRow[]
  /** Set when the file itself could not be read at all. */
  fatal?: string
}

export function splitList(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}
