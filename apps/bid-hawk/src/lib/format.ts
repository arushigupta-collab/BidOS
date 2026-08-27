/**
 * Formatting is centralised so that currency, dates and empty values read the
 * same in every surface. Indian conventions throughout: Lakh / Cr, IST, and
 * DD MMM YYYY.
 */

/** The single permitted representation of an absent value. */
export const EMPTY_VALUE = '—'

const IST = 'Asia/Kolkata'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Renders a value or the muted dash. Never returns an empty string. */
export function orDash(value: string | number | null | undefined): string {
  return isBlank(value) ? EMPTY_VALUE : String(value)
}

/* ---------------------------------------------------------------- currency */

const CRORE = 10_000_000
const LAKH = 100_000

/**
 * INR in Indian magnitude words: "INR 42.6 Cr", "INR 85 Lakh", "INR 25,000".
 * Precision drops as magnitude rises because at crore scale the trailing
 * digits are noise in a scanning context.
 */
export function formatInr(
  amount: number | null | undefined,
  options: { withPrefix?: boolean } = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return EMPTY_VALUE

  const { withPrefix = true } = options
  const prefix = withPrefix ? 'INR ' : ''
  const sign = amount < 0 ? '-' : ''
  const value = Math.abs(amount)

  if (value >= CRORE) {
    const cr = value / CRORE
    const digits = cr >= 100 ? 0 : 1
    return `${sign}${prefix}${groupFixed(trimZero(cr.toFixed(digits)))} Cr`
  }

  if (value >= LAKH) {
    const lakh = value / LAKH
    const digits = lakh >= 10 ? 0 : 1
    return `${sign}${prefix}${groupFixed(trimZero(lakh.toFixed(digits)))} Lakh`
  }

  return `${sign}${prefix}${groupIndian(Math.round(value))}`
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value
}

/**
 * Indian grouping survives the magnitude words: a four-digit crore figure is
 * "1,006 Cr", not "1006 Cr". Any fractional part is left ungrouped.
 */
function groupFixed(value: string): string {
  const [whole, fraction] = value.split('.')
  const grouped = groupIndian(Number(whole))
  return fraction ? `${grouped}.${fraction}` : grouped
}

/** 2,50,00,000 grouping. */
export function groupIndian(value: number): string {
  const digits = Math.abs(Math.trunc(value)).toString()
  const sign = value < 0 ? '-' : ''
  if (digits.length <= 3) return sign + digits

  const last3 = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${sign}${grouped},${last3}`
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_VALUE
  return `${value.toFixed(digits)}%`
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_VALUE
  return groupIndian(value)
}

/* -------------------------------------------------------------------- dates */

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input)
}

/** "28 Aug 2026" */
export function formatDate(input: Date | string | number | null | undefined): string {
  if (isBlank(input)) return EMPTY_VALUE
  const d = toDate(input as Date | string | number)
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "28 Aug 2026, 17:00" */
export function formatDateTime(input: Date | string | number | null | undefined): string {
  if (isBlank(input)) return EMPTY_VALUE
  const d = toDate(input as Date | string | number)
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE
  return `${formatDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Full absolute value used in every relative timestamp's title attribute. */
export function formatAbsolute(input: Date | string | number | null | undefined): string {
  if (isBlank(input)) return EMPTY_VALUE
  const d = toDate(input as Date | string | number)
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(d)
  return `${formatDate(d)} at ${time} IST`
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/* ----------------------------------------------------------- relative time */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now", "4 min ago", "3 h ago", "in 6 days". */
export function formatRelative(
  input: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  if (isBlank(input)) return EMPTY_VALUE
  const d = toDate(input as Date | string | number)
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE

  const delta = d.getTime() - now.getTime()
  const past = delta < 0
  const abs = Math.abs(delta)

  const phrase = (() => {
    if (abs < 45 * 1000) return null
    if (abs < HOUR) return `${Math.round(abs / MINUTE)} min`
    if (abs < DAY) {
      const h = Math.floor(abs / HOUR)
      return `${h} ${h === 1 ? 'hour' : 'hours'}`
    }
    if (abs < 30 * DAY) {
      const days = Math.floor(abs / DAY)
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    const months = Math.floor(abs / (30 * DAY))
    if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`
    const years = Math.floor(months / 12)
    return `${years} ${years === 1 ? 'year' : 'years'}`
  })()

  if (phrase === null) return past ? 'just now' : 'in a moment'
  return past ? `${phrase} ago` : `in ${phrase}`
}

/* -------------------------------------------------------------- countdowns */

export type UrgencyLevel = 'critical' | 'warning' | 'normal' | 'elapsed'

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  elapsed: boolean
  urgency: UrgencyLevel
  /** "29d 04h 12m" — stable width, safe for a live-ticking region. */
  label: string
}

const CRITICAL_MS = 72 * HOUR
const WARNING_MS = 7 * DAY

export function urgencyFor(target: Date | string | number, now: Date = new Date()): UrgencyLevel {
  const remaining = toDate(target).getTime() - now.getTime()
  if (remaining <= 0) return 'elapsed'
  if (remaining < CRITICAL_MS) return 'critical'
  if (remaining < WARNING_MS) return 'warning'
  return 'normal'
}

export function countdown(
  target: Date | string | number | null | undefined,
  now: Date = new Date(),
): CountdownParts | null {
  if (isBlank(target)) return null
  const d = toDate(target as Date | string | number)
  if (Number.isNaN(d.getTime())) return null

  const totalMs = d.getTime() - now.getTime()
  const elapsed = totalMs <= 0
  const abs = Math.abs(totalMs)

  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / HOUR)
  const minutes = Math.floor((abs % HOUR) / MINUTE)
  const seconds = Math.floor((abs % MINUTE) / 1000)

  const label = elapsed
    ? 'Closed'
    : days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
      : hours > 0
        ? `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
        : `${pad(minutes)}m ${pad(seconds)}s`

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs,
    elapsed,
    urgency: urgencyFor(d, now),
    label,
  }
}

/* ----------------------------------------------------------------- strings */

export function initials(name: string | null | undefined, max = 2): string {
  if (isBlank(name)) return '?'
  const parts = String(name)
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((p) => /[a-z0-9]/i.test(p))
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Deterministic non-negative hash. Used for stable avatar tone assignment. */
export function stableHash(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Masks a stored credential for display. Never reveals length. */
export function maskSecret(hint = ''): string {
  return hint ? `••••••••••${hint.slice(-4)}` : '••••••••••••'
}
