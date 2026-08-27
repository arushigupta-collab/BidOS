import type { Partner, PartnerInvitation, Tender } from '@/types'

/**
 * Filters for the registry: capability and region, multi-select within a group and
 * AND across groups. A partner matching two selected capabilities still counts once.
 */
export interface RegistryFilters {
  capabilities: string[]
  regions: string[]
}

export const NO_FILTERS: RegistryFilters = { capabilities: [], regions: [] }

export function activeFilterCount(filters: RegistryFilters): number {
  return filters.capabilities.length + filters.regions.length
}

/** AND across the two groups, OR within each. */
export function applyFilters(partners: Partner[], filters: RegistryFilters): Partner[] {
  return partners.filter((partner) => {
    const capability =
      filters.capabilities.length === 0 ||
      filters.capabilities.some((value) => partner.capabilities.includes(value))
    const region =
      filters.regions.length === 0 ||
      filters.regions.some((value) => partner.regions.includes(value))
    return capability && region
  })
}

export interface FilterOption {
  value: string
  count: number
}

/**
 * The values actually present on the partners, with their counts. Built from the data
 * rather than from the vocabulary, so a chip never offers a filter that would return
 * nothing.
 */
export function filterOptions(partners: Partner[], key: 'capabilities' | 'regions'): FilterOption[] {
  const counts = new Map<string, number>()
  for (const partner of partners) {
    for (const value of partner[key]) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}


/* ------------------------------------------------------------------ the top band */

export interface RegistrySummary {
  registered: number
  /**
   * Invited to the currently selected RFP. Null when no RFP is chosen, which renders as
   * a muted dash rather than a zero: "none invited yet" and "no RFP chosen" are
   * different facts and a 0 would state the first when the second is true.
   *
   * This replaces a paused count. Paused is a sources concept, and a stat that is the
   * same number on every screen visit says nothing about the work in front of you.
   */
  invitedToSelected: number | null
}

export function summarise(
  partners: Partner[],
  invitations: PartnerInvitation[],
  rfpId?: string,
): RegistrySummary {
  return {
    registered: partners.length,
    invitedToSelected: rfpId
      ? invitations.filter((row) => row.rfpId === rfpId).length
      : null,
  }
}

/** The partner ids already invited to one tender, for the row indicator. */
export function invitedTo(invitations: PartnerInvitation[], rfpId?: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!rfpId) return map
  for (const row of invitations) {
    if (row.rfpId === rfpId) map.set(row.partnerId, row.invitedAt)
  }
  return map
}

/**
 * The RFP selector's options: all fourteen tenders from the shared seed, newest
 * discovery first so the list opens on what arrived most recently.
 *
 * This selector is the TARGET of an invitation and nothing else. It does not filter,
 * sort, rank or match the partner list, and no partner is suggested from it. AI in
 * this module lives in Partner Evaluation only.
 */
export function rfpOptions(tenders: Tender[]) {
  return [...tenders]
    .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
    .map((tender) => ({
      value: tender.id,
      label: tender.title,
      detail: tender.tenderRef,
    }))
}
