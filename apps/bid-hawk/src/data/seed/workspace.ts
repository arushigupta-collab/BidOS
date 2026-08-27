/** The single swap point for the bidding organisation's identity. */
export const ORGANISATION = 'Meridian Infratech Limited'

export const WORKSPACE = {
  organisation: ORGANISATION,
  name: `${ORGANISATION} · Bid Management`,
  environment: 'Sovereign · IN-North',
  version: 'v2.4.1',
} as const

export const SIGNED_IN_USER = {
  id: 'p-anand',
  name: 'Anand Raghunathan',
  shortName: 'A. Raghunathan',
  title: 'General Manager, Bid Management',
} as const

/** Offsets are computed from load time so countdowns stay live on any given day. */
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function fromNow(days: number, hours = 0): string {
  return new Date(Date.now() + days * DAY + hours * HOUR).toISOString()
}

export function agoFromNow(days: number, hours = 0): string {
  return new Date(Date.now() - days * DAY - hours * HOUR).toISOString()
}
