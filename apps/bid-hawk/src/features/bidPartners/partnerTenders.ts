/**
 * Which tenders Bid Partners works on, and who each one should be sent to.
 *
 * The module used to read the fourteen seeded tenders directly, so every screen in
 * it was about documents nobody had uploaded. It reads the workspace's real
 * readings now, and falls back to the seed only when there are none -- an empty
 * registry on a fresh workspace would be honest but useless, and the seeded feed
 * is what Bid Hawk shows in exactly that state.
 */
import type { Partner, Tender } from '@/types'
import { TENDERS } from '@/data/seed/tenders'

/**
 * Uploaded readings if the workspace has any, the seed otherwise.
 *
 * Never merged. A merged list puts a real tender and a demo one side by side with
 * nothing distinguishing them, and the first question anybody asks of this module
 * is which of these is real.
 */
export function partnerTenders(uploaded: Tender[]): Tender[] {
  return uploaded.length > 0 ? uploaded : TENDERS
}

/** True when the list above came from real readings rather than the seed. */
export function isLive(uploaded: Tender[]): boolean {
  return uploaded.length > 0
}

/**
 * A tender's industry.
 *
 * `Tender` carries `category`, which uploaded readings populate from the RFP's
 * industry and seeded tenders populate with a scope line. Both are matched against
 * a partner's registered industry the same way, so a seeded tender still routes to
 * somebody rather than to nobody.
 */
export function industryOf(tender: Tender): string {
  return tender.industry ?? tender.category ?? ''
}

/**
 * Normalises an industry for comparison.
 *
 * "e-Governance and Citizen Services" and "e-governance & citizen services" are
 * the same industry, and a strict equality check routed the second to nobody at
 * all -- which shows as an empty partner list and reads as a broken module rather
 * than a spelling difference.
 */
function key(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]+/g, ' ').trim()
}

/**
 * The partners an RFP should be routed to: those registered under its industry.
 *
 * Industry only. An earlier version also dropped paused partners, which quietly
 * removed one from the registry table -- and the registry is where a paused
 * partner is looked at and un-paused, so hiding it there makes the pause
 * permanent. The table already marks them; whether to invite one is the
 * operator's call, made with the badge in front of them.
 */
export function partnersFor(tender: Tender | null, partners: Partner[]): Partner[] {
  if (!tender) return partners

  const wanted = key(industryOf(tender))
  if (!wanted) return partners

  const matched = partners.filter((partner) => key(partner.industry) === wanted)

  /*
   * A tender in an industry nobody is registered under falls back to everyone
   * rather than to nobody. An empty list is indistinguishable from a broken
   * screen, and the operator can still see each partner's industry beside them
   * and judge for themselves.
   */
  return matched.length > 0 ? matched : partners
}

/** True when the list above is the industry match rather than the fallback. */
export function routedByIndustry(tender: Tender | null, partners: Partner[]): boolean {
  if (!tender) return false
  const wanted = key(industryOf(tender))
  if (!wanted) return false
  return partners.some((partner) => key(partner.industry) === wanted)
}
