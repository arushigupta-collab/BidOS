import { describe, expect, it } from 'vitest'
import { composeQuestion, firstPage } from './RiskFlags'
import type { RiskFlag } from '@/types'

const flag = (over: Partial<RiskFlag> = {}): RiskFlag => ({
  id: 'r1',
  title: 'Pre-bid meeting date conflict',
  severity: 'high',
  detail: 'Two different dates are given for the pre-bid meeting.',
  recommendation: 'Ask which date governs.',
  ...over,
})

describe('the question sent to the buyer', () => {
  /*
   * The buyer reads this without the product around it, so `recommendation` is
   * not sent: it is written for the bidder and is the reason the query exists,
   * not the query.
   */
  it('carries the finding and the ask, never the recommendation', () => {
    const q = composeQuestion(flag())
    expect(q).toContain('Two different dates are given for the pre-bid meeting')
    expect(q).toContain('Please clarify or confirm which requirement governs.')
    expect(q).not.toContain('Ask which date governs')
  })

  /*
   * Concatenated naively this read "...pre-bid meeting. (page 10)." -- a full
   * stop, a parenthetical, then another full stop.
   */
  it('does not strand a full stop before the page reference', () => {
    const q = composeQuestion(flag({ pageNo: 10 }))
    expect(q).toContain('pre-bid meeting (page 10).')
    expect(q).not.toMatch(/\.\s*\(page/)
  })

  /* And the quote closed as `RFP Document.".` for the same reason. */
  it('does not double the full stop when closing a quote', () => {
    const q = composeQuestion(
      flag({ pageNo: 10, evidence: [{ pageNo: 10, quote: 'The meeting is on 13/08/2025.' }] }),
    )
    expect(q).toContain('“The meeting is on 13/08/2025.”')
    expect(q).not.toMatch(/\.["”]\./)
    expect(q).not.toMatch(/\.\.$/)
  })

  it('omits the page when the reading recorded none', () => {
    expect(composeQuestion(flag())).not.toMatch(/page/)
  })

  it('omits the quote when there is no evidence', () => {
    expect(composeQuestion(flag({ pageNo: 4 }))).not.toContain('The document states')
  })
})

describe('the page a reader turns to', () => {
  it('prefers the flag’s own page', () => {
    expect(firstPage(flag({ pageNo: 16, evidence: [{ pageNo: 44, quote: 'x' }] }))).toBe(16)
  })

  it('falls back to the first piece of evidence that has one', () => {
    expect(firstPage(flag({ evidence: [{ pageNo: null, quote: 'x' }, { pageNo: 37, quote: 'y' }] })))
      .toBe(37)
  })

  it('is null rather than zero when nothing recorded a page', () => {
    // Zero is a page number and would send somebody to the front of the document.
    expect(firstPage(flag())).toBeNull()
    expect(firstPage(flag({ evidence: [{ pageNo: null, quote: 'x' }] }))).toBeNull()
  })
})
