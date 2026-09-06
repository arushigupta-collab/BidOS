/**
 * @vitest-environment node
 *
 * Dates written in sentences agree with the dates counted down to.
 *
 * The product carries a tender's dates forward so its deadlines run against
 * today: the source RFP closed in August 2025 and the feed shows August 2027. The
 * structured fields did that from the start. The PROSE did not -- a model quoting
 * a document quotes what it says -- so the summary read "bid submission closes
 * 28/08/2025" beside a countdown showing 367 days, on the same screen.
 *
 * Both prose stages are now given the carried-forward dates and told to use only
 * those.
 *
 * NOT EVERY DATE SHIFTS, which is the distinction this file exists to hold.
 * A deadline moves; a criterion boundary does not. The turnover requirement is
 * measured over three financial years "to 31 March 2025", and that is what the
 * tender asks for -- carrying it forward would quietly change the requirement.
 */
import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/hero-extraction.json'
import { carryForward } from './dates.js'

const summary = fixture.summarise as { bullets: string[]; condensed: string[] }
const packages = (fixture.workpackages as {
  packages: { role_id: string; action_items: { text: string; ref: string | null }[] }[]
}).packages

/** A year mentioned near deadline language, rather than any year at all. */
const DEADLINE_NEAR_YEAR =
  /(?:clos(?:e|es|ing)|due|deadline|submission|submit|by|before|conference|meeting|queries)[^.]{0,60}\b(20\d{2})\b/gi

/** Financial-year boundaries, which are part of the requirement and stay put. */
const FINANCIAL_YEAR = /(?:financial year|FY|as (?:of|on)|ending|year(?:s)? ending)[^.]{0,40}\b20\d{2}\b/i

function staleDeadlines(text: string): string[] {
  if (FINANCIAL_YEAR.test(text)) return []
  return [...text.matchAll(DEADLINE_NEAR_YEAR)]
    .map((m) => m[1])
    .filter((year) => Number(year) < 2027)
}

describe('the summary', () => {
  it('names the deadlines the product is counting down to', () => {
    const joined = summary.bullets.join(' ')
    expect(joined).toMatch(/2027/)
  })

  it('quotes no deadline from the tender\'s own calendar', () => {
    const stale = summary.bullets.flatMap((b) =>
      staleDeadlines(b).map((y) => `${y} in: ${b.slice(0, 70)}`),
    )
    expect(stale).toEqual([])
  })
})

describe('the action items each role receives', () => {
  it('date their deadlines the way the rest of the product does', () => {
    const stale = packages.flatMap((p) =>
      p.action_items.flatMap((a) =>
        staleDeadlines(a.text).map((y) => `${p.role_id}: ${y} in "${a.text.slice(0, 64)}"`),
      ),
    )
    expect(stale).toEqual([])
  })

  it('leaves the turnover criterion measured to the year the tender sets', () => {
    // "average annual turnover ... as of 31 March 2025" is the requirement, not
    // a deadline. Carrying it forward would change what is being asked for.
    const finance = packages.find((p) => p.role_id === 'finance')
    const boundary = finance?.action_items.find((a) => /turnover|net worth/i.test(a.text))
    expect(boundary, 'the finance package names no financial threshold').toBeDefined()
    expect(boundary!.text).toMatch(/20\d{2}/)
  })
})

describe('carrying dates forward', () => {
  it('moves a deadline by whole years, so day and month survive', () => {
    const { shift, readable } = carryForward(
      { bid_due: '28/08/2025 and 17.00 Hrs' },
      'bid_due',
      new Date('2026-08-25T19:00:00+05:30'),
    )
    expect(shift).toBe(2)
    expect(readable.bid_due).toMatch(/28 August 2027/)
  })

  it('returns nothing readable for a field with no date, rather than inventing one', () => {
    const { readable } = carryForward({ bid_due: 'To be informed later' }, 'bid_due')
    expect(readable.bid_due).toBeUndefined()
  })
})
