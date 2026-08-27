import { describe, expect, it } from 'vitest'
import { countdown, formatInr, groupIndian, initials, orDash, urgencyFor } from './format'

describe('formatInr', () => {
  it('renders crore and lakh magnitudes with Indian words', () => {
    expect(formatInr(426_000_000)).toBe('INR 42.6 Cr')
    expect(formatInr(2_100_000_000)).toBe('INR 210 Cr')
    expect(formatInr(8_500_000)).toBe('INR 85 Lakh')
    expect(formatInr(4_500_000)).toBe('INR 45 Lakh')
  })

  it('applies Indian grouping inside the magnitude words', () => {
    expect(formatInr(10_060_000_000)).toBe('INR 1,006 Cr')
    expect(formatInr(1_234_560_000_000)).toBe('INR 1,23,456 Cr')
    expect(formatInr(9_900_000)).toBe('INR 99 Lakh')
  })

  it('groups sub-lakh amounts and never emits raw digits without separators', () => {
    expect(formatInr(25_000)).toBe('INR 25,000')
    expect(groupIndian(25_000_000)).toBe('2,50,00,000')
  })

  it('returns the muted dash for an absent amount', () => {
    expect(formatInr(null)).toBe('—')
    expect(orDash(undefined)).toBe('—')
  })
})

describe('deadline urgency', () => {
  const now = new Date('2026-07-29T10:00:00+05:30')

  it('bands at 72 hours and 7 days', () => {
    expect(urgencyFor(new Date('2026-07-31T10:00:00+05:30'), now)).toBe('critical')
    expect(urgencyFor(new Date('2026-08-03T10:00:00+05:30'), now)).toBe('warning')
    expect(urgencyFor(new Date('2026-08-28T17:00:00+05:30'), now)).toBe('normal')
    expect(urgencyFor(new Date('2026-07-28T10:00:00+05:30'), now)).toBe('elapsed')
  })

  it('renders a stable-width countdown label', () => {
    expect(countdown(new Date('2026-08-28T17:00:00+05:30'), now)?.label).toBe('30d 07h 00m')
    expect(countdown(new Date('2026-07-28T10:00:00+05:30'), now)?.label).toBe('Closed')
  })
})

describe('initials', () => {
  it('takes first and last name and ignores parentheticals', () => {
    expect(initials('Anand Raghunathan')).toBe('AR')
    expect(initials('Maharashtra Information Technology Corporation Limited (MahaIT)')).toBe('ML')
    expect(initials('')).toBe('?')
  })
})
