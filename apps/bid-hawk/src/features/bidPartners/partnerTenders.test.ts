import { describe, expect, it } from 'vitest'
import { partnerTenders, isLive, industryOf, partnersFor, routedByIndustry } from './partnerTenders'
import { TENDERS } from '@/data/seed/tenders'
import { PARTNERS } from '@/data/seed/partners'
import type { Partner, Tender } from '@/types'

const tender = (industry: string | undefined, category = 'Something · Else'): Tender =>
  ({ ...TENDERS[0], industry, category }) as Tender

const partner = (id: string, industry: string, status: Partner['status'] = 'active'): Partner =>
  ({ ...PARTNERS[0], id, industry, status }) as Partner

describe('which tenders Bid Partners works on', () => {
  /*
   * The module read the fourteen seeded tenders directly, so every invitation it
   * could compose was for a document nobody had uploaded.
   */
  it('prefers the workspace’s own readings over the seed', () => {
    const uploaded = [tender('e-Governance and Citizen Services')]
    expect(partnerTenders(uploaded)).toBe(uploaded)
    expect(isLive(uploaded)).toBe(true)
  })

  it('falls back to the seed when nothing has been read', () => {
    expect(partnerTenders([])).toBe(TENDERS)
    expect(isLive([])).toBe(false)
  })

  /*
   * Never merged. A merged list puts a real tender beside a demo one with nothing
   * distinguishing them, and which of these is real is the first question anybody
   * asks of this module.
   */
  it('does not mix the two', () => {
    const uploaded = [tender('Energy and Utilities')]
    expect(partnerTenders(uploaded)).toHaveLength(1)
  })
})

describe('a tender’s industry', () => {
  it('comes from the reading where there is one', () => {
    expect(industryOf(tender('Transport and Mobility'))).toBe('Transport and Mobility')
  })

  it('falls back to the category, so a seeded tender still routes somewhere', () => {
    expect(industryOf(tender(undefined, 'Power · Smart metering'))).toBe('Power · Smart metering')
  })
})

describe('routing an RFP to partners', () => {
  const roster = [
    partner('a', 'e-Governance and Citizen Services'),
    partner('b', 'e-Governance and Citizen Services'),
    partner('c', 'Document Management and Digitisation'),
    partner('d', 'Energy and Utilities'),
  ]

  it('shows only the partners registered under the tender’s industry', () => {
    const routed = partnersFor(tender('e-Governance and Citizen Services'), roster)
    expect(routed.map((p) => p.id)).toEqual(['a', 'b'])
    expect(routedByIndustry(tender('e-Governance and Citizen Services'), roster)).toBe(true)
  })

  /*
   * Spelling is not a routing decision. Strict equality sent "e-governance &
   * citizen services" to nobody, which shows as an empty table and reads as a
   * broken module rather than a difference in punctuation.
   */
  it('does not treat punctuation or case as a different industry', () => {
    const routed = partnersFor(tender('e-governance & citizen services'), roster)
    expect(routed.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('is the whole registry when no RFP is chosen', () => {
    expect(partnersFor(null, roster)).toHaveLength(4)
    expect(routedByIndustry(null, roster)).toBe(false)
  })

  /*
   * An empty list is indistinguishable from a broken screen, so an industry
   * nobody is registered under falls back to everyone -- and says so, which is
   * what `routedByIndustry` is for.
   */
  it('falls back to the whole registry rather than to nothing', () => {
    const routed = partnersFor(tender('Defence and Aerospace'), roster)
    expect(routed).toHaveLength(4)
    expect(routedByIndustry(tender('Defence and Aerospace'), roster)).toBe(false)
  })

  /*
   * An earlier version dropped paused partners here, which quietly removed one
   * from the registry table -- and the registry is where a paused partner is
   * looked at and un-paused, so hiding it there made the pause permanent.
   */
  it('keeps paused partners visible', () => {
    const withPaused = [...roster, partner('e', 'Energy and Utilities', 'paused')]
    expect(partnersFor(null, withPaused)).toHaveLength(5)
    expect(partnersFor(tender('Energy and Utilities'), withPaused).map((p) => p.id))
      .toEqual(['d', 'e'])
  })
})

describe('the seeded roster against the seeded tenders', () => {
  /*
   * Every seeded tender has to route to somebody by industry rather than falling
   * back, or the fallback path silently becomes the only path and the routing is
   * never exercised outside a live workspace.
   */
  it('routes all fourteen by industry, none by fallback', () => {
    for (const seeded of TENDERS) {
      expect(routedByIndustry(seeded, PARTNERS), seeded.tenderRef).toBe(true)
      expect(partnersFor(seeded, PARTNERS).length, seeded.tenderRef).toBeGreaterThan(0)
      expect(partnersFor(seeded, PARTNERS).length, seeded.tenderRef).toBeLessThan(PARTNERS.length)
    }
  })
})
