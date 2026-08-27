import type { Person, Tender } from '@/types'

/**
 * The assignation stage: given a tender and the bid managers on the workspace,
 * decide who it goes to and say why.
 *
 * THE RULE, fixed in code because there is no routing rules screen and no
 * configurable threshold:
 *
 *   - A candidate must match on at least one dimension. Someone who covers
 *     neither the domain nor the region is not a candidate at all, however few
 *     people the workspace has.
 *   - A domain match outweighs a region match. Domain expertise is what makes a
 *     bid winnable; regional coverage is what makes it convenient.
 *   - A named region beats blanket Pan-India cover. Someone holding Pan-India
 *     matches every tender, so scoring it equal to a named state would make them
 *     the default owner of the whole feed on tie-break alone.
 *   - Both dimensions matching scores highest.
 *   - Ties break on the number of matched terms, then on the earliest-added
 *     person, so the same tender always routes to the same owner.
 *   - Assignment always succeeds. A tender no rule covers falls to the next bid
 *     manager in rotation rather than being left unowned: there is no unassigned
 *     state in this product.
 *
 * Pure and deterministic: no clock, no randomness, no store access.
 */

/** Weights, not a scale to tune. Domain alone beats region alone by construction. */
const DOMAIN_WEIGHT = 60
const REGION_WEIGHT = 30
/** Blanket cover still counts, but never as much as naming the place. */
const WILDCARD_REGION_WEIGHT = 14
/** Awarded once when both dimensions match, so both-matching leads outright. */
const BOTH_BONUS = 10
/** Each additional matched term past the first, capped so it cannot outrank a dimension. */
const DEPTH_WEIGHT = 4
const MAX_DEPTH_BONUS = 8

export type MatchedDimension = 'domain' | 'region'

export interface RoutingMatch {
  person: Person
  /** 0 to 100. Comparable across tenders, not a probability. */
  confidence: number
  /** Human-readable, e.g. "Domain: Optical Fibre and Region: Maharashtra". */
  reason: string
  matchedDimensions: MatchedDimension[]
  matchedDomains: string[]
  matchedRegions: string[]
}

export interface RoutingResult {
  /** Never null. Assignment always succeeds; see the fallback below. */
  match: RoutingMatch
  /** Every rules candidate, best first. Empty when the fallback was taken. */
  candidates: RoutingMatch[]
}

const normalise = (value: string) => value.trim().toLowerCase()

/**
 * A tender's routable text. Its category carries the domain words and its region
 * carries the geography; both are matched loosely so "AI - Computer Vision" on a
 * person meets "Computer vision" in a category.
 */
function tenderTerms(tender: Tender): { domain: string; region: string } {
  return { domain: normalise(`${tender.category} ${tender.title}`), region: normalise(tender.region) }
}

/** True when either side contains the other, so partial vocabularies still meet. */
function touches(haystack: string, needle: string): boolean {
  const term = normalise(needle)
  if (term === '') return false
  // A person's "AI - Computer Vision" is matched on its most specific segment.
  const segments = term.split(/\s*[-·,/]\s*/).filter((part) => part.length > 2)
  return segments.some((segment) => haystack.includes(segment))
}

function describe(matchedDomains: string[], matchedRegions: string[]): string {
  const parts: string[] = []
  if (matchedDomains.length > 0) parts.push(`Domain: ${matchedDomains.join(', ')}`)
  if (matchedRegions.length > 0) parts.push(`Region: ${matchedRegions.join(', ')}`)
  return parts.join(' and ')
}

const PAN_INDIA = 'pan-india'

/** Pan-India covers every region, which is the whole point of holding it. */
function regionMatches(person: Person, region: string): string[] {
  return person.regions.filter(
    (held) => normalise(held) === PAN_INDIA || touches(region, held) || touches(normalise(held), region),
  )
}

/** True when the only thing matching the region is blanket cover. */
function wildcardOnly(matchedRegions: string[]): boolean {
  return (
    matchedRegions.length > 0 && matchedRegions.every((held) => normalise(held) === PAN_INDIA)
  )
}

/**
 * Every RFP has an owner, so a tender nobody covers still lands somewhere.
 *
 * Round-robin on the tender's own position in the feed, not on the first person in
 * the list: falling back to the first name would pile every uncovered tender onto
 * one bid manager, which reads as a broken rule rather than as a workload. Position
 * is stable for a given feed, so the same tender always lands on the same owner.
 */
function fallback(people: Person[], fallbackIndex: number): RoutingMatch {
  const person = people[fallbackIndex % people.length]
  return {
    person,
    confidence: 0,
    reason: 'Next in rotation',
    matchedDimensions: [],
    matchedDomains: [],
    matchedRegions: [],
  }
}

/**
 * `fallbackIndex` is the tender's position in the feed, used only when no bid
 * manager covers it. Throws on an empty roster: assignment cannot succeed with
 * nobody to assign to, and the feed is unreachable until at least one bid manager
 * exists, so this is a contract rather than a state the product can reach.
 */
export function routeTender(
  tender: Tender,
  people: Person[],
  fallbackIndex = 0,
): RoutingResult {
  if (people.length === 0) {
    throw new Error('routeTender needs at least one bid manager to assign to')
  }

  const { domain, region } = tenderTerms(tender)

  const candidates = people
    .map<RoutingMatch | null>((person) => {
      const matchedDomains = person.domains.filter((held) => touches(domain, held))
      const matchedRegions = regionMatches(person, region)

      const hasDomain = matchedDomains.length > 0
      const hasRegion = matchedRegions.length > 0
      if (!hasDomain && !hasRegion) return null

      const depth = Math.min(
        MAX_DEPTH_BONUS,
        (matchedDomains.length + matchedRegions.length - 1) * DEPTH_WEIGHT,
      )
      const regionScore = hasRegion
        ? wildcardOnly(matchedRegions)
          ? WILDCARD_REGION_WEIGHT
          : REGION_WEIGHT
        : 0

      const confidence = Math.min(
        100,
        (hasDomain ? DOMAIN_WEIGHT : 0) +
          regionScore +
          (hasDomain && hasRegion ? BOTH_BONUS : 0) +
          depth,
      )

      const matchedDimensions: MatchedDimension[] = [
        ...(hasDomain ? (['domain'] as const) : []),
        ...(hasRegion ? (['region'] as const) : []),
      ]

      return {
        person,
        confidence,
        reason: describe(matchedDomains, matchedRegions),
        matchedDimensions,
        matchedDomains,
        matchedRegions,
      }
    })
    .filter((candidate): candidate is RoutingMatch => candidate !== null)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence
      const aTerms = a.matchedDomains.length + a.matchedRegions.length
      const bTerms = b.matchedDomains.length + b.matchedRegions.length
      if (bTerms !== aTerms) return bTerms - aTerms
      // Earliest-added wins, so the same tender always lands on the same owner.
      return a.person.addedAt.localeCompare(b.person.addedAt)
    })

  return {
    match: candidates[0] ?? fallback(people, fallbackIndex),
    candidates,
  }
}
