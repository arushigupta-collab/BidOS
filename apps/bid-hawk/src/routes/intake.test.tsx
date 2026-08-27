import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTER_FUTURE, ROUTES } from './router'

/**
 * The intake screen's states.
 *
 * The reading itself is exercised against the real document in
 * src/lib/ingest/heroExtraction.test.ts. What matters here is that the screen
 * never presents a control that cannot work, and never becomes a dead end.
 */
function renderAt(path: string) {
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
}

/**
 * src/test/setup.ts clears the Supabase variables so no test reaches the network.
 * This screen branches on whether they are set, so the configured case has to be
 * put back deliberately -- which is the right way round: the offline state is the
 * default here, and the upload control is the thing that must be earned.
 */
describe('Read a tender', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('offers a keyboard-reachable way in, not only a drop target', async () => {
    renderAt('/intake')
    expect(await screen.findByRole('heading', { name: 'Read a tender' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument()
  })

  it('says what it will do before it is asked to do it', async () => {
    renderAt('/intake')
    expect(await screen.findByText(/reads it against your eligibility/i)).toBeInTheDocument()
    // The limit is stated up front rather than discovered by hitting it.
    expect(screen.getByText(/up to 400 pages/i)).toBeInTheDocument()
  })
})

describe('when the workspace has no database behind it', () => {
  it('explains itself and points at the feed instead of offering an upload', async () => {
    // The offline build's condition, which is the default under test. Covered
    // without needing a second build target.
    renderAt('/intake')

    expect(await screen.findByRole('heading', { name: 'Read a tender' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose a file' })).not.toBeInTheDocument()
    // Not a dead end: it names where the work still is.
    expect(screen.getByRole('link', { name: /Go to the feed/i })).toHaveAttribute('href', '/feed')
  })
})
