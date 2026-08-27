/**
 * The only I/O boundary in BidOS. Every read and write in the application goes
 * through here, and every call spends 300-900ms before resolving so that
 * loading, pending and error states are genuinely exercised rather than
 * theoretical.
 *
 * There is no network. Data lives in src/data/seed and is mutated in memory.
 */

export interface ApiOptions {
  /** Overrides the latency band for this call. */
  latencyMs?: number
  /** Simulates a failure so error states can be demonstrated on demand. */
  fail?: boolean | string
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(message: string, code = 'BIDOS_UPSTREAM', retryable = true) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.retryable = retryable
  }
}

export class AbortedError extends Error {
  constructor() {
    super('Request cancelled')
    this.name = 'AbortedError'
  }
}

const LATENCY_MIN = 300
const LATENCY_MAX = 900

function latency(override?: number): number {
  if (typeof override === 'number') return override
  return LATENCY_MIN + Math.round(Math.random() * (LATENCY_MAX - LATENCY_MIN))
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortedError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new AbortedError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Wraps a synchronous resolver so callers see it as a latent async endpoint.
 * The resolver runs *after* the delay so that mutations land in the same order
 * the user issued them.
 */
export async function request<T>(
  resolver: () => T,
  options: ApiOptions = {},
): Promise<T> {
  await sleep(latency(options.latencyMs), options.signal)

  if (options.fail) {
    throw new ApiError(
      typeof options.fail === 'string'
        ? options.fail
        : 'The upstream portal did not respond in time.',
    )
  }

  return resolver()
}

/** Deep clone so callers can never mutate the store by reference. */
export function snapshot<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)
}

/** Monotonic identifier for records created during a session. */
let sequence = 0
export function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence.toString().padStart(4, '0')}`
}
