import type { Tender } from '@/types'
import { formatInr } from '@/lib/format'
import { CRITERIA, criteriaSentence, type ScoredPartner } from './evaluationModel'

export interface RiskFlag {
  id: string
  severity: 'high' | 'medium'
  partnerName: string
  detail: string
}

export interface Assessment {
  partnerName: string
  strengths: string[]
  concerns: string[]
}

export interface Suggestion {
  leader: ScoredPartner
  runnerUp: ScoredPartner | null
  margin: number
  reasoning: string[]
  assessments: Assessment[]
  risks: RiskFlag[]
}

/** Certifications a government IT tender of this kind expects. */
const EXPECTED = ['ISO 27001', 'ISO 9001']

/**
 * The agent's output, DERIVED from the ranked rows and the tender record. Every figure
 * here is read from seed data: a turnover, a rating, an on-time rate, a quote delta, a
 * named certification, a document count. There is no generic sentence in it, because a
 * sentence that would fit any partner explains nothing about this one.
 */
export function suggest(tender: Tender, ranked: ScoredPartner[]): Suggestion | null {
  if (ranked.length === 0) return null

  const leader = ranked[0]
  const runnerUp = ranked[1] ?? null
  const margin = runnerUp ? Math.round((leader.composite - runnerUp.composite) * 10) / 10

    : leader.composite

  const quotes = ranked
    .filter((row) => !row.unquoted)
    .map((row) => row.invitation.quotedValueCr as number)
  const lowest = quotes.length > 0 ? Math.min(...quotes) : null
  const leaderQuote = leader.invitation.quotedValueCr

  const strongest = CRITERIA.map((c) => ({ c, score: leader.scores[c.id].score })).sort(
    (a, b) => b.score - a.score,
  )[0]

  /* ------------------------------------------------------------- reasoning */

  const reasoning: string[] = []

  reasoning.push(
    // Names the criteria, not the weights: they are hidden at the client's request, and a
    // sentence quoting figures the interface refuses to show would be worse than one that
    // does not.
    `${leader.partner.name} leads at ${leader.composite} of 100, ranked on ${criteriaSentence()}${
      runnerUp ? `, ${margin} ahead of ${runnerUp.partner.name} at ${runnerUp.composite}` : ''
    }.`,
  )

  reasoning.push(
    `Its strongest criterion is ${strongest.c.label.toLowerCase()} at ${Math.round(strongest.score)}, from ${leader.scores[strongest.c.id].raw}.`,
  )

  reasoning.push(
    `On delivery history it carries a ${leader.partner.rating} of 5 rating across ${leader.partner.projectsDelivered} projects with ${leader.partner.onTimeDeliveryPct} per cent on time, against a turnover of ${formatInr(leader.partner.annualTurnoverCr * 1_00_00_000)}.`,
  )

  if (leaderQuote !== null && leaderQuote !== undefined && lowest !== null) {
    const delta = Math.round((leaderQuote - lowest) * 10) / 10
    reasoning.push(
      delta === 0
        ? `It is also the lowest quote received at ${formatInr(leaderQuote * 1_00_00_000)}.`
        : `Its quote of ${formatInr(leaderQuote * 1_00_00_000)} is ${formatInr(delta * 1_00_00_000)} above the lowest received, which is ${formatInr(lowest * 1_00_00_000)}.`,
    )
  } else {
    reasoning.push(
      `It has not submitted a commercial quote, so it scores zero on commercials and leads on the other three criteria alone.`,
    )
  }

  const missing = EXPECTED.filter((cert) => !leader.partner.certifications.includes(cert))
  reasoning.push(
    missing.length === 0
      ? `It holds ${leader.partner.certifications.join(', ')}, which covers what this tender expects.`
      : `It does not hold ${missing.join(' or ')}, which this tender expects, and that is the first thing to resolve before relying on it.`,
  )

  /* -------------------------------------------------- strengths and concerns */

  const assessments: Assessment[] = ranked.slice(0, 3).map((row) => {
    const strengths: string[] = []
    const concerns: string[] = []

    if (row.capability.regionCovered) {
      strengths.push(`Covers ${tender.region}, through ${row.partner.regions.join(', ')}.`)
    } else {
      concerns.push(
        `Regional coverage is ${row.partner.regions.join(', ')} and does not include ${tender.region}.`,
      )
    }

    if (row.partner.onTimeDeliveryPct >= 90) {
      strengths.push(`${row.partner.onTimeDeliveryPct} per cent on-time delivery across ${row.partner.projectsDelivered} projects.`)
    } else {
      concerns.push(
        `On-time delivery is ${row.partner.onTimeDeliveryPct} per cent, the weakest figure among the shortlisted.`,
      )
    }

    // Skipped entirely where the tender publishes no value: "small against an
    // estimated -" is not an assessment, and inventing a figure to compare
    // against would be worse.
    if (tender.estimatedValueInr === null) {
      // No turnover judgement is possible.
    } else if (row.partner.annualTurnoverCr >= tender.estimatedValueInr / 1_00_00_000 / 2) {
      strengths.push(
        `Turnover of ${formatInr(row.partner.annualTurnoverCr * 1_00_00_000)} against an estimated ${formatInr(tender.estimatedValueInr)} tender.`,
      )
    } else {
      concerns.push(
        `Turnover of ${formatInr(row.partner.annualTurnoverCr * 1_00_00_000)} is small against an estimated ${formatInr(tender.estimatedValueInr)} tender.`,
      )
    }

    const gaps = EXPECTED.filter((cert) => !row.partner.certifications.includes(cert))
    if (gaps.length > 0) concerns.push(`Does not hold ${gaps.join(' or ')}.`)
    else strengths.push(`Holds ${row.partner.certifications.join(', ')}.`)

    if (row.documentation.received < row.documentation.requested) {
      concerns.push(
        `${row.documentation.requested - row.documentation.received} of ${row.documentation.requested} requested documents are still outstanding.`,
      )
    }

    return { partnerName: row.partner.name, strengths: strengths.slice(0, 3), concerns: concerns.slice(0, 3) }
  })

  /* ------------------------------------------------------------ risk flags */

  const risks: RiskFlag[] = []

  for (const row of ranked) {
    const gaps = EXPECTED.filter((cert) => !row.partner.certifications.includes(cert))
    if (gaps.length > 0) {
      risks.push({
        id: `cert-${row.partner.id}`,
        severity: 'high',
        partnerName: row.partner.name,
        detail: `Does not hold ${gaps.join(' or ')}. This tender expects it, and a bid relying on this partner for the certified scope would be disqualified.`,
      })
    }

    if (!row.capability.regionCovered) {
      risks.push({
        id: `region-${row.partner.id}`,
        severity: 'medium',
        partnerName: row.partner.name,
        detail: `Regional coverage is ${row.partner.regions.join(', ')} and excludes ${tender.region}, so on-site obligations would need a local arrangement.`,
      })
    }

    // A quote materially under the others usually means scope was read differently.
    if (lowest !== null && row.invitation.quotedValueCr !== null && row.invitation.quotedValueCr !== undefined) {
      const others = quotes.filter((q) => q !== row.invitation.quotedValueCr)
      const median = others.sort((a, b) => a - b)[Math.floor(others.length / 2)]
      if (median !== undefined && row.invitation.quotedValueCr < median * 0.7) {
        risks.push({
          id: `low-${row.partner.id}`,
          severity: 'high',
          partnerName: row.partner.name,
          detail: `Quoted ${formatInr(row.invitation.quotedValueCr * 1_00_00_000)} against a median of ${formatInr(median * 1_00_00_000)}${row.invitation.commercialNote ? `, noting "${row.invitation.commercialNote}"` : ''}. A gap this size usually means the scope was read differently, not that the work is cheaper.`,
        })
      }
    }

    const outstanding = row.documentation.requested - row.documentation.received
    if (outstanding > 0 && row.invitation.responseDeadline) {
      risks.push({
        id: `docs-${row.partner.id}`,
        severity: 'medium',
        partnerName: row.partner.name,
        detail: `${outstanding} requested documents are outstanding with the response deadline set for ${row.invitation.responseDeadline}.`,
      })
    }
  }

  return { leader, runnerUp, margin, reasoning, assessments, risks }
}
