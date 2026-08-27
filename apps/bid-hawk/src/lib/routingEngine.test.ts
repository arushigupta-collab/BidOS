import { describe, expect, it } from 'vitest'
import type { Person, Tender } from '@/types'
import { routeTender } from './routingEngine'

function person(id: string, domains: string[], regions: string[], addedAt = '2026-01-01'): Person {
  return { id, name: id, email: `${id}@meridianinfratech.in`, domains, regions, addedAt }
}

function tender(category: string, region: string, title = 'A tender'): Tender {
  return {
    id: 't-x',
    title,
    tenderRef: 'REF/1',
    sourceId: 's-gem',
    issuingAuthority: 'An authority',
    category,
    region,
    estimatedValueInr: 1,
    emdInr: null,
    tenderFeeInr: null,
    tenderType: 'Open',
    publishedAt: '2026-01-01',
    discoveredAt: '2026-01-01',
    bidDueAt: '2026-12-01',
    aiSummary: '',
    status: 'new',
    eligibility: [],
    riskFlags: [],
    matchedKeywords: [],
  }
}

const OPTICAL = tender('Telecom · Optical transport', 'Bihar')

describe('Candidacy', () => {
  it('is not a rules candidate when neither dimension matches', () => {
    const result = routeTender(OPTICAL, [person('p-1', ['Solar'], ['Kerala'])])

    expect(result.candidates).toHaveLength(0)
    // Assignment still succeeds: the fallback owns it.
    expect(result.match.person.id).toBe('p-1')
    expect(result.match.reason).toBe('Next in rotation')
    expect(result.match.matchedDimensions).toEqual([])
  })

  it('takes a domain match alone', () => {
    const result = routeTender(OPTICAL, [person('p-1', ['Telecom'], ['Kerala'])])

    expect(result.match?.person.id).toBe('p-1')
    expect(result.match?.matchedDimensions).toEqual(['domain'])
    expect(result.match?.reason).toBe('Domain: Telecom')
  })

  it('takes a region match alone', () => {
    const result = routeTender(OPTICAL, [person('p-1', ['Solar'], ['Bihar'])])

    expect(result.match?.matchedDimensions).toEqual(['region'])
    expect(result.match?.reason).toBe('Region: Bihar')
  })

  it('treats Pan-India as covering every region', () => {
    const result = routeTender(OPTICAL, [person('p-1', ['Solar'], ['Pan-India'])])

    expect(result.match?.matchedRegions).toEqual(['Pan-India'])
  })
})

describe('Ranking', () => {
  it('puts a domain match above a region match', () => {
    const result = routeTender(OPTICAL, [
      person('p-region', ['Solar'], ['Bihar']),
      person('p-domain', ['Telecom'], ['Kerala']),
    ])

    expect(result.match?.person.id).toBe('p-domain')
    expect(result.candidates.map((c) => c.person.id)).toEqual(['p-domain', 'p-region'])
    expect(result.candidates[0].confidence).toBeGreaterThan(result.candidates[1].confidence)
  })

  it('puts both dimensions above either alone', () => {
    const result = routeTender(OPTICAL, [
      person('p-domain', ['Telecom'], ['Kerala']),
      person('p-both', ['Telecom'], ['Bihar']),
    ])

    expect(result.match?.person.id).toBe('p-both')
    expect(result.match?.matchedDimensions).toEqual(['domain', 'region'])
    expect(result.match?.reason).toBe('Domain: Telecom and Region: Bihar')
  })

  it('cannot let matched depth outrank a dimension', () => {
    // Four region matches must still lose to a single domain match.
    const result = routeTender(OPTICAL, [
      person('p-deep-region', ['Solar'], ['Bihar', 'Pan-India', 'East', 'North']),
      person('p-domain', ['Telecom'], []),
    ])

    expect(result.match?.person.id).toBe('p-domain')
  })

  it('breaks a tie on matched terms, then on who was added first', () => {
    // "Optical Fibre" does not match "Optical transport" — the vocabularies have
    // to actually meet — so p-two carries a second term the tender does name.
    const deep = routeTender(OPTICAL, [
      person('p-one', ['Telecom'], ['Bihar'], '2026-02-01'),
      person('p-two', ['Telecom', 'Optical transport'], ['Bihar'], '2026-03-01'),
    ])
    expect(deep.match?.person.id).toBe('p-two')
    expect(deep.match?.matchedDomains).toEqual(['Telecom', 'Optical transport'])

    const even = routeTender(OPTICAL, [
      person('p-later', ['Telecom'], ['Bihar'], '2026-03-01'),
      person('p-earlier', ['Telecom'], ['Bihar'], '2026-02-01'),
    ])
    expect(even.match?.person.id).toBe('p-earlier')
  })

  it('is deterministic across repeated calls and input order', () => {
    const pool = [
      person('p-a', ['Telecom'], ['Bihar'], '2026-02-01'),
      person('p-b', ['Solar'], ['Bihar'], '2026-01-01'),
    ]
    const forward = routeTender(OPTICAL, pool)
    const reversed = routeTender(OPTICAL, [...pool].reverse())

    expect(forward.match?.person.id).toBe(reversed.match?.person.id)
    expect(forward.match?.confidence).toBe(reversed.match?.confidence)
  })
})

describe('Matching a person vocabulary against a tender', () => {
  it('meets a specific AI domain with the category that names it', () => {
    const result = routeTender(
      tender('Citizen services · Document intelligence', 'Maharashtra'),
      [person('p-1', ['AI - Document Intelligence'], ['Maharashtra'])],
    )

    expect(result.match?.matchedDomains).toEqual(['AI - Document Intelligence'])
    expect(result.match?.confidence).toBe(100)
  })

  it('bounds confidence to 100', () => {
    const result = routeTender(OPTICAL, [
      person('p-1', ['Telecom', 'Optical Fibre', 'Networking'], ['Bihar', 'East', 'Pan-India']),
    ])

    expect(result.match?.confidence).toBeLessThanOrEqual(100)
  })
})

describe('The fallback, when no rule covers the tender', () => {
  const NOBODY_COVERS = [
    person('p-1', ['Solar'], ['Kerala']),
    person('p-2', ['Civil'], ['Punjab']),
    person('p-3', ['Cybersecurity'], ['Assam']),
  ]

  it('always returns a person', () => {
    for (let index = 0; index < 10; index += 1) {
      expect(routeTender(OPTICAL, NOBODY_COVERS, index).match.person).toBeDefined()
    }
  })

  it('rotates rather than piling every uncovered tender on one name', () => {
    const owners = [0, 1, 2, 3, 4, 5].map(
      (index) => routeTender(OPTICAL, NOBODY_COVERS, index).match.person.id,
    )

    expect(owners).toEqual(['p-1', 'p-2', 'p-3', 'p-1', 'p-2', 'p-3'])
    expect(new Set(owners).size).toBe(NOBODY_COVERS.length)
  })

  it('is stable: the same position always lands on the same owner', () => {
    expect(routeTender(OPTICAL, NOBODY_COVERS, 4).match.person.id).toBe(
      routeTender(OPTICAL, NOBODY_COVERS, 4).match.person.id,
    )
  })

  it('never displaces a real match', () => {
    const withOne = [...NOBODY_COVERS, person('p-real', ['Telecom'], ['Bihar'])]

    for (let index = 0; index < 6; index += 1) {
      expect(routeTender(OPTICAL, withOne, index).match.person.id).toBe('p-real')
    }
  })

  it('refuses an empty roster rather than inventing an owner', () => {
    expect(() => routeTender(OPTICAL, [])).toThrow(/at least one bid manager/)
  })
})
