import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/**
 * jsdom implements neither matchMedia nor the ResizeObserver that Radix and vaul
 * read on mount. Both are stubbed here rather than in each test so a missing
 * browser API can never be mistaken for a component defect.
 *
 * Skipped entirely under the node environment, which the ingestion tests use
 * because they read a PDF from disk. There is no window there to patch, and
 * without this guard the setup file throws before any of them collect.
 */
if (typeof window === 'undefined') {
  // Nothing to stub outside a browser-like environment.
} else if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

/**
 * React Router builds a Request for every navigation. Under jsdom that reaches
 * node's undici implementation, which rejects jsdom's AbortSignal as foreign and
 * throws before the navigation resolves. The product fetches nothing — all data
 * is local by design — so no route has a loader or an action and nothing ever
 * reads this object. A minimal stand-in keeps the realms from colliding.
 */
class LocalRequest {
  readonly url: string
  readonly method: string
  readonly signal?: AbortSignal

  constructor(input: string | URL, init: { method?: string; signal?: AbortSignal } = {}) {
    this.url = String(input)
    this.method = init.method ?? 'GET'
    this.signal = init.signal
  }
}

globalThis.Request = LocalRequest as unknown as typeof Request

/**
 * Radix positions and captures pointers through APIs jsdom does not implement.
 * Without these its Select and DropdownMenu cannot be opened in a test, which
 * would leave the behaviour of two screens unexercised.
 */
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

/**
 * No test reaches the network.
 *
 * Vitest reads the same .env.local the dev server does, so VITE_SUPABASE_URL is
 * populated under test and any screen that loads ingested tenders genuinely
 * called the database. That made the feed's row count depend on what somebody
 * had last uploaded -- eight assertions across two files started failing the
 * moment a real reading landed in the project, and they were right to.
 *
 * Cleared here so the seeded workspace is the whole world by default. A test that
 * wants an ingested tender mocks `@/data/uploaded` explicitly and says so, which
 * is also the only way to assert on one deterministically.
 */
import.meta.env.VITE_SUPABASE_URL = ''
import.meta.env.VITE_SUPABASE_ANON_KEY = ''

/**
 * Cross-module addresses fall back to the hosted deployments under test.
 *
 * They are configurable so the modules can be run together on localhost, and
 * .env.local sets them to do exactly that -- which vitest also reads. The
 * landing asserts the addresses it publishes, and those assertions must describe
 * what a built product ships, not what one machine happens to be running.
 */
import.meta.env.VITE_BID_ORCHESTRATOR_URL = ''
import.meta.env.VITE_BID_AUTHOR_URL = ''
import.meta.env.VITE_BIDOS_URL = ''
