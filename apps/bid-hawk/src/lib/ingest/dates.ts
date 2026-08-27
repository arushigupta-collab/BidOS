/**
 * Turning the dates a tender states into dates a demo can run on.
 *
 * A real tender's dates are in the past by the time anyone demonstrates it -- the
 * source document here closed on 28 August 2025. Left alone, an uploaded RFP
 * shows an expired deadline and a negative countdown next to seeded tenders that
 * are live, and the product reads as broken rather than as historical.
 *
 * The seed already solved this by hand: day and month are kept exactly as the
 * document has them and only the year moves, so every date stays checkable
 * against the source. This does the same thing automatically.
 *
 * ONE shift is computed for the whole document and applied to every date in it.
 * Shifting each date to the nearest future year independently would silently
 * reorder them -- a pre-bid conference landing after the bid deadline it precedes.
 */

/** Indian tenders write dates as DD/MM/YYYY far more often than anything else. */
const NUMERIC = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/
const MONTH_NAME =
  /\b(\d{1,2})[\s-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,-]*(\d{4})\b/i
const TIME = /\b(\d{1,2})[.:](\d{2})\b/

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** IST. Every date in these documents is local to India. */
const IST_OFFSET = '+05:30'

export interface ParsedDate {
  /** The calendar parts, kept separate so a year shift never touches day or month. */
  day: number
  month: number
  year: number
  hour: number
  minute: number
  /** The substring the date was read from, for showing what was interpreted. */
  matched: string
}

/**
 * The first date in a string, which for these fields is the operative one: the
 * document writes "13/08/2025 and 12:00 tender@mahait.org ..." with the date
 * leading and commentary trailing.
 */
export function parseTenderDate(text: string | null): ParsedDate | null {
  if (!text) return null

  let day: number, month: number, year: number, matched: string

  const numeric = NUMERIC.exec(text)
  const named = MONTH_NAME.exec(text)

  if (numeric && (!named || numeric.index <= named.index)) {
    day = Number(numeric[1])
    month = Number(numeric[2])
    year = Number(numeric[3])
    matched = numeric[0]
  } else if (named) {
    day = Number(named[1])
    month = MONTHS.indexOf(named[2].toLowerCase().slice(0, 3)) + 1
    year = Number(named[3])
    matched = named[0]
  } else {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Time is read from whatever follows the date, so a stray figure earlier in
  // the sentence cannot be mistaken for one.
  const after = text.slice(text.indexOf(matched) + matched.length)
  const time = TIME.exec(after)
  const hour = time ? Number(time[1]) : 0
  const minute = time ? Number(time[2]) : 0

  return {
    day,
    month,
    year,
    hour: hour >= 0 && hour <= 23 ? hour : 0,
    minute: minute >= 0 && minute <= 59 ? minute : 0,
    matched,
  }
}

export function toIso(d: ParsedDate, year = d.year): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${year}-${p(d.month)}-${p(d.day)}T${p(d.hour)}:${p(d.minute)}:00${IST_OFFSET}`
}

/** How many days from `now` until a date, if its year were shifted by `shift`. */
function daysAhead(d: ParsedDate, shift: number, now: Date): number {
  const at = new Date(toIso(d, d.year + shift)).getTime()
  return (at - now.getTime()) / 86_400_000
}

/**
 * The whole number of years to add so the bid deadline sits comfortably ahead.
 *
 * `minDaysAhead` is why this is not simply "the next year in which it is future".
 * The source document closes 28 August. Demonstrated in late August, a one-year
 * shift puts the deadline three days out: the tender is technically live but sits
 * in the critical urgency band, which is not where a tender being introduced for
 * the first time belongs. A month of clearance keeps it reading as open.
 */
export function yearShiftFor(bidDue: ParsedDate, now: Date, minDaysAhead = 30): number {
  for (let shift = 0; shift <= 20; shift += 1) {
    if (daysAhead(bidDue, shift, now) >= minDaysAhead) return shift
  }
  return 0
}

export interface ShiftedDates {
  shift: number
  /** Field key to ISO timestamp, for every field a date could be read from. */
  dates: Record<string, string | null>
  /** What was read from each field, so the interpretation is inspectable. */
  read: Record<string, string | null>
}

/**
 * Applies one shift across every date field.
 *
 * The shift is anchored on the bid deadline because that is the date the product
 * counts down to and the one a viewer checks first. Fields that carry no readable
 * date come back null, which the UI already renders as a muted dash.
 */
export function shiftTenderDates(
  fields: Record<string, string | null>,
  anchorKey: string,
  now: Date = new Date(),
  minDaysAhead = 30,
): ShiftedDates {
  const parsed: Record<string, ParsedDate | null> = {}
  for (const [key, value] of Object.entries(fields)) parsed[key] = parseTenderDate(value)

  const anchor = parsed[anchorKey]
  const shift = anchor ? yearShiftFor(anchor, now, minDaysAhead) : 0

  const dates: Record<string, string | null> = {}
  const read: Record<string, string | null> = {}
  for (const [key, p] of Object.entries(parsed)) {
    dates[key] = p ? toIso(p, p.year + shift) : null
    read[key] = p ? p.matched : null
  }

  return { shift, dates, read }
}

/** The three date fields a tender's prose refers to. */
export const DATE_FIELDS = ['bid_due', 'prebid_queries_due', 'prebid_conference'] as const

export interface CarriedDates {
  shift: number
  /** Human-readable and already carried forward, for a prompt to quote directly. */
  readable: Record<string, string>
}

/**
 * The dates a model should write, as opposed to the ones the document states.
 *
 * Every stage that produces PROSE needs this. The extracted values are what the
 * tender literally says, and the source tender closed in 2025; the product
 * carries those forward so deadlines run against today. A summary or an action
 * item quoting the document therefore contradicts the countdown beside it, on the
 * same screen -- which is exactly what happened before this existed.
 *
 * The extracted values stay untouched. They are what makes each figure checkable
 * against its page, and rewriting them would destroy that. This is a second,
 * derived view for the places that write sentences.
 */
export function carryForward(
  raw: Record<string, string | null>,
  anchorKey = 'bid_due',
  now: Date = new Date(),
): CarriedDates {
  const { shift, dates } = shiftTenderDates(raw, anchorKey, now)
  const readable: Record<string, string> = {}

  for (const [key, iso] of Object.entries(dates)) {
    if (!iso) continue
    const at = new Date(iso)
    const hasTime = at.getHours() !== 0 || at.getMinutes() !== 0
    readable[key] = at.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(hasTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    })
  }
  return { shift, readable }
}
