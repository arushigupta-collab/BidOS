import { describe, expect, it } from 'vitest'
import { parseInr } from './uploaded'

/**
 * Values arrive as the tender wrote them, because the extraction contract forbids
 * normalising them: rewriting "INR 1,00,00,000 /- (Indian Rupees One Crore only)"
 * into 10000000 would destroy the quote that makes the figure checkable against
 * the page it came from. The feed still needs a number to sort and total on, so
 * the parsing happens here.
 *
 * The strings below are the ones extraction actually returned from the source RFP.
 */
describe('reading a rupee figure out of the phrase a tender used', () => {
  it('reads Indian digit grouping, which locale parsing gets wrong', () => {
    // Number('1,00,00,000'.replace(...)) is the whole point: parsed as a locale
    // number this reads as 1, and a one-crore EMD would show as INR 1.
    expect(parseInr('INR 1,00,00,000 /- (Indian Rupees One Crore only) in form of Bank Guarantee'))
      .toBe(1_00_00_000)
  })

  it('reads the tender fee', () => {
    expect(parseInr('INR 25,000/- (Indian Rupees Twenty-Five Thousand only)')).toBe(25_000)
  })

  it('reads crore and lakh where a tender writes them as words', () => {
    expect(parseInr('Estimated cost INR 72 Cr')).toBe(72_00_00_000)
    expect(parseInr('INR 45 Lakh')).toBe(45_00_000)
    expect(parseInr('Rs. 8.9 crore')).toBe(8.9 * 1_00_00_000)
  })

  it('prefers the unit over the bare digits when both appear', () => {
    // "INR 72" here means 72 crore, not 72 rupees.
    expect(parseInr('INR 72 Cr (Rupees Seventy Two Crore)')).toBe(72_00_00_000)
  })

  it('reads a bare figure, which is how a table cell states one', () => {
    // The GeM tender stored its value as exactly this: no currency marker, no
    // separators. Requiring a marker made a tender worth eleven and a half crore
    // read as having no published value at all.
    expect(parseInr('116800000')).toBe(116_800_000);
    expect(parseInr('1,16,80,000')).toBe(1_16_80_000);
  });

  it('does not read a bare number out of prose, where it could be anything', () => {
    // Only a string that is nothing but digits. A number inside a sentence has
    // already had its chance at the currency patterns above, and guessing past
    // them is how a clause reference becomes a rupee amount.
    expect(parseInr('as per Section 5.4 of 2025')).toBeNull();
    expect(parseInr('Refer to clause 116800000')).toBeNull();
  });

  it('returns null rather than a guess', () => {
    expect(parseInr(null)).toBeNull()
    expect(parseInr('')).toBeNull()
    expect(parseInr('To be informed later')).toBeNull()
    expect(parseInr('Not published in the tender')).toBeNull()
  })

  it('does not read a year or a clause number as an amount', () => {
    expect(parseInr('as per Section 5.4 of 2025')).toBeNull()
  })
})
