/**
 * The platform catalogue. Each entry carries what the add-source form needs to
 * fill itself in: the listing page to read, and the label the platform uses for
 * a registered bidder.
 *
 * The platforms are real. The workspace bidding against them is not.
 */

export interface PlatformDefinition {
  id: string
  /** Full name as the platform itself writes it. */
  label: string
  /** Short form used in badges and table cells. */
  shortLabel: string
  listingUrl: string
  idLabel: string
}

export const PLATFORMS: PlatformDefinition[] = [
  {
    id: 'gem',
    label: 'Government e-Marketplace (GeM)',
    shortLabel: 'GeM',
    listingUrl: 'https://gem.gov.in/bidlists',
    idLabel: 'GeM Seller ID',
  },
  {
    id: 'cppp',
    label: 'Central Public Procurement Portal (CPPP)',
    shortLabel: 'CPPP',
    listingUrl: 'https://eprocure.gov.in/eprocure/app',
    idLabel: 'Bidder registration ID',
  },
  {
    id: 'ireps',
    label: 'Indian Railways e-Procurement (IREPS)',
    shortLabel: 'IREPS',
    listingUrl: 'https://www.ireps.gov.in/epsn/anonymSearch.do',
    idLabel: 'Registered ID',
  },
  {
    id: 'defproc',
    label: 'Defence Procurement portal',
    shortLabel: 'DefProc',
    listingUrl: 'https://defproc.gov.in/nicgep/app',
    idLabel: 'Registered ID',
  },
  {
    id: 'mahatenders',
    label: 'MahaTenders',
    shortLabel: 'MahaTenders',
    listingUrl: 'https://www.mahatenders.gov.in/nicgep/app',
    idLabel: 'Registered ID',
  },
  {
    id: 'state-eproc',
    label: 'State e-Procurement portal',
    shortLabel: 'State portal',
    listingUrl: 'https://etenders.gov.in/eprocure/app',
    idLabel: 'Registered ID',
  },
  {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    listingUrl: '',
    idLabel: 'Registered ID',
  },
]

export const PLATFORMS_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]))

/**
 * The platform's name without its parenthetical code, for naming a source after
 * the platform it reads. "Government e-Marketplace (GeM)" becomes "Government
 * e-Marketplace", so the row shows the name and the badge shows the code rather
 * than the same word twice.
 */
export function platformPlainName(platformId: string): string {
  const platform = PLATFORMS_BY_ID.get(platformId)
  if (!platform) return platformId
  return platform.label.replace(/\s*\([^)]*\)\s*$/, '')
}

export const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ value: p.id, label: p.label }))

/** Short label for a stored source's platform id. */
export function platformShortLabel(platformId: string): string {
  return PLATFORMS_BY_ID.get(platformId)?.shortLabel ?? platformId
}
