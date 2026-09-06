import { describe, expect, it } from 'vitest'
import { parseTenderDate, shiftTenderDates, toIso, yearShiftFor } from './dates.js'

/** The three date fields exactly as extraction returned them from the real RFP. */
const REAL = {
  bid_due: 'Online submission of Proposal: 28/08/2025 and 17.00 Hrs https://www.mahatenders.gov.in',
  prebid_queries_due:
    '13/08/2025 and 12:00 tender@mahait.org Queries for Clarifications sent through any other medium shall not be considered.',
  prebid_conference:
    '18/08/2025 and 12:00 Venue: Board Room, Maharashtra Information Technology Corporation Limited, 3rd Floor, Apeejay House, Churchgate, Mumbai, Maharashtra - 400 020',
}

describe('reading a date out of tender prose', () => {
  it('takes the date and time from a field that trails a URL', () => {
    const d = parseTenderDate(REAL.bid_due)
    expect(d).toMatchObject({ day: 28, month: 8, year: 2025, hour: 17, minute: 0 })
  })

  it('is not fooled by an email address or an address following the date', () => {
    expect(parseTenderDate(REAL.prebid_queries_due)).toMatchObject({ day: 13, month: 8, hour: 12 })
    // "400 020" trails this one and must not be read as a time.
    expect(parseTenderDate(REAL.prebid_conference)).toMatchObject({ day: 18, month: 8, hour: 12 })
  })

  it('reads the other forms Indian tenders use', () => {
    expect(parseTenderDate('Last date: 28-08-2025')).toMatchObject({ day: 28, month: 8, year: 2025 })
    expect(parseTenderDate('Due 28.08.2025 by 15:30')).toMatchObject({ day: 28, hour: 15, minute: 30 })
    expect(parseTenderDate('on 28 August 2025 at 17:00')).toMatchObject({ day: 28, month: 8, hour: 17 })
    expect(parseTenderDate('5 Sep 2026')).toMatchObject({ day: 5, month: 9, year: 2026 })
  })

  it('returns null rather than a guess when there is no date', () => {
    expect(parseTenderDate('To be informed later')).toBeNull()
    expect(parseTenderDate(null)).toBeNull()
    expect(parseTenderDate('')).toBeNull()
  })
})

describe('choosing one shift for the whole document', () => {
  const now = new Date('2026-08-25T19:00:00+05:30')

  it('clears the deadline by a month rather than landing on it', () => {
    const bidDue = parseTenderDate(REAL.bid_due)!
    // +1 would put 28 Aug 2025 at 28 Aug 2026, three days out: live, but already
    // inside the critical band. +2 is the first shift with real clearance.
    expect(yearShiftFor(bidDue, now)).toBe(2)
  })

  it('keeps day and month exactly as the document has them', () => {
    const { dates } = shiftTenderDates(REAL, 'bid_due', now)
    expect(dates.bid_due).toBe('2027-08-28T17:00:00+05:30')
    expect(dates.prebid_queries_due).toBe('2027-08-13T12:00:00+05:30')
    expect(dates.prebid_conference).toBe('2027-08-18T12:00:00+05:30')
  })

  it('lands on the same dates the hand-built seed uses', () => {
    // src/data/seed/tenders.ts was rolled to 2027 by hand. Automatic and manual
    // must agree, or an uploaded copy of this RFP contradicts the seeded one.
    const { dates } = shiftTenderDates(REAL, 'bid_due', now)
    expect(dates.bid_due).toBe('2027-08-28T17:00:00+05:30')
  })

  it('preserves the order of dates within the document', () => {
    const { dates } = shiftTenderDates(REAL, 'bid_due', now)
    const at = (k: string) => new Date(dates[k]!).getTime()
    expect(at('prebid_queries_due')).toBeLessThan(at('prebid_conference'))
    expect(at('prebid_conference')).toBeLessThan(at('bid_due'))
  })

  it('applies the same shift to every field, including ones already in the future', () => {
    const mixed = { bid_due: '28/08/2025', later: '15/01/2030' }
    const { shift, dates } = shiftTenderDates(mixed, 'bid_due', now)
    expect(shift).toBe(2)
    // Shifted too, not left alone: the gap between the two is what the document
    // says it is, and independent shifting would close it.
    expect(dates.later).toBe('2032-01-15T00:00:00+05:30')
  })

  it('leaves a document that is already live untouched', () => {
    const future = { bid_due: '15/06/2027 and 17:00' }
    expect(shiftTenderDates(future, 'bid_due', now).shift).toBe(0)
  })

  it('does not shift when the anchor has no readable date', () => {
    const { shift, dates } = shiftTenderDates(
      { bid_due: 'To be informed later', other: '13/08/2025' }, 'bid_due', now)
    expect(shift).toBe(0)
    expect(dates.bid_due).toBeNull()
    expect(dates.other).toBe('2025-08-13T00:00:00+05:30')
  })
})

describe('toIso', () => {
  it('pads and stamps IST', () => {
    expect(toIso({ day: 5, month: 1, year: 2027, hour: 9, minute: 5, matched: '' }))
      .toBe('2027-01-05T09:05:00+05:30')
  })
})
