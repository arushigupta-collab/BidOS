import { describe, expect, it } from 'vitest'
import { routeTender } from './routingEngine'
import type { Person, Tender } from '@/types'

/**
 * The seeded bid managers, mirroring supabase/seed.sql. If the seed changes,
 * this is where the routing consequence shows up.
 */
const MANAGERS: Person[] = [
  { id: 'p-anand', name: 'Anand Raghunathan', email: 'a@x.in',
    domains: ['Telecom', 'Optical Fibre', 'Networking'], regions: ['North', 'Pan-India'], addedAt: '2025-01-01' },
  { id: 'p-meera', name: 'Meera Krishnan', email: 'm@x.in',
    domains: ['e-Governance', 'Citizen Services', 'IT Services', 'AI - Document Intelligence'],
    regions: ['Maharashtra', 'Gujarat', 'West'], addedAt: '2025-01-02' },
  { id: 'p-vikram', name: 'Vikram Iyer', email: 'v@x.in',
    domains: ['Cloud and Infrastructure', 'Cybersecurity', 'AI - Agentic AI'], regions: [], addedAt: '2025-01-03' },
  { id: 'p-sudeshna', name: 'Sudeshna Roy', email: 's@x.in',
    domains: [], regions: ['East', 'West Bengal', 'Odisha', 'Bihar'], addedAt: '2025-01-04' },
  { id: 'p-nafisa', name: 'Nafisa Qureshi', email: 'n@x.in',
    domains: ['AI - Computer Vision', 'AI - NLP', 'Data and Analytics'],
    regions: ['South', 'Karnataka', 'Telangana'], addedAt: '2025-01-05' },
]

/** The hero RFP as the extract stage will write it. */
const HERO = {
  title: 'Selection of System Integrator for Implementation of Maharashtra RTS Aaple Sarkar 2.0',
  category: 'e-Governance and Citizen Services',
  region: 'Maharashtra',
} as unknown as Tender

describe('the hero RFP reaches the e-Governance bid manager', () => {
  it('routes to Meera Krishnan on both dimensions', () => {
    const { match } = routeTender(HERO, MANAGERS)
    expect(match.person.id).toBe('p-meera')
    expect(match.matchedDimensions).toEqual(expect.arrayContaining(['domain', 'region']))
  })

  it('states why, so the Orchestrator can show a rationale', () => {
    const { match } = routeTender(HERO, MANAGERS)
    expect(match.reason).toMatch(/Maharashtra/)
    expect(match.confidence).toBeGreaterThan(0)
  })

  it('puts a domain-only match above a region-only one', () => {
    const cloudTender = {
      title: 'Supply and commissioning of private cloud',
      category: 'Cloud and Infrastructure',
      region: 'Odisha',
    } as unknown as Tender
    const { match } = routeTender(cloudTender, MANAGERS)
    expect(match.person.id).toBe('p-vikram')
  })
})
