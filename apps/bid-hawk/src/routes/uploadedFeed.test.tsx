import { render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tender } from '@/types'
import type { RoutingMatch } from '@/lib/routingEngine'
import { ROUTER_FUTURE, ROUTES } from './router'
import { useWorkspace } from '@/store/useWorkspace'
import { SOURCES } from '@/data/seed/sources'
import { PEOPLE } from '@/data/seed/people'
import { TENDERS } from '@/data/seed/tenders'

/**
 * A tender read from an uploaded document has to reach the feed as a tender, not
 * as a second class of thing.
 *
 * CLAUDE.md is explicit that the platform must read as one system rather than two
 * products sharing a shell. The mechanism is that an ingested RFP is mapped into
 * the same `Tender` shape the seeded feed uses, so the table, the filters, the
 * statistics and the summary page work on it without knowing where it came from.
 * These assertions are what keeps that true.
 */

const UPLOADED: Tender = {
  id: 'b0450dfa-0000-0000-0000-000000000000',
  title: 'Selection of System Integrator for a state citizen services platform',
  tenderRef: 'MAHAIT/RTS2.0/001/2025/080',
  sourceId: 'uploaded',
  issuingAuthority: 'Maharashtra Information Technology Corporation Limited',
  category: 'e-Governance and Citizen Services',
  region: 'Maharashtra',
  // The document publishes no value. It must stay null all the way to the cell.
  estimatedValueInr: null,
  emdInr: 1_00_00_000,
  tenderFeeInr: 25_000,
  tenderType: 'Four envelope',
  publishedAt: new Date().toISOString(),
  discoveredAt: new Date().toISOString(),
  bidDueAt: new Date(Date.now() + 40 * 86_400_000).toISOString(),
  aiSummary: 'Rebuild of a state right-to-services platform, nine months and thirty-six months O&M.',
  matchedKeywords: [],
  valueIsEstimated: false,
  status: 'new',
  eligibility: [
    { id: 'e0', requirement: 'CMMI Level 5, verifiable before commercial opening', status: 'fail',
      note: 'The appraisal has lapsed and is not listed on the PARS directory.' },
  ],
  riskFlags: [],
}

/**
 * The owner comes back WITH the reading rather than being derived from the
 * workspace, which is the whole reason this shape exists: the workspace's people
 * list is empty here, exactly as it is on a fresh visit, and a tender whose owner
 * had to be derived from it would have had no row at all.
 */
const OWNER: RoutingMatch = {
  person: {
    id: 'p-meera',
    name: 'Meera Krishnan',
    email: 'meera.krishnan@meridianinfratech.in',
    domains: ['e-Governance', 'Citizen Services'],
    regions: ['Maharashtra'],
    addedAt: '2025-01-02',
  },
  confidence: 92,
  reason: 'Domain: e-Governance, Citizen Services and Region: Maharashtra',
  matchedDimensions: ['domain', 'region'],
  matchedDomains: ['e-Governance'],
  matchedRegions: ['Maharashtra'],
}

/** A second bid manager, so the summary has an alternative to offer. */
const ALTERNATE = {
  id: 'p-anand',
  name: 'Anand Raghunathan',
  email: 'anand.raghunathan@meridianinfratech.in',
  domains: ['Telecom', 'Networking'],
  regions: ['North'],
  addedAt: '2025-01-01',
}

vi.mock('@/data/uploaded', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/uploaded')>()),
  fetchUploadedTenders: vi.fn(async () => ({
    tenders: [UPLOADED],
    assignments: new Map([[UPLOADED.id, OWNER]]),
    // The roster comes back with the reading, so a workspace that holds no people
    // of its own still has somebody to reassign to.
    managers: [OWNER.person, ALTERNATE],
  })),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
}

beforeEach(() => {
  // The feed is gated on setup being done, so the workspace is put in the state
  // it would be in after it: this is about uploaded tenders, not about the gate.
  useWorkspace.setState({
    sources: [...SOURCES], people: [...PEOPLE], tenders: [...TENDERS],
    sourcesRevealed: true, peopleRevealed: true,
    uploadedTenders: [], uploadedAssignments: new Map(), uploadedManagers: [],
  })
})

afterEach(() => {
  useWorkspace.setState({
    uploadedTenders: [], uploadedAssignments: new Map(), uploadedManagers: [],
  })
})

describe('an uploaded tender in the feed', () => {
  it('appears alongside the sourced ones, in one list', async () => {
    renderAt('/feed')
    expect(await screen.findByText(UPLOADED.title)).toBeInTheDocument()
    // And the seeded feed is still there: merged, not replaced.
    expect(screen.getByText(TENDERS[0].title)).toBeInTheDocument()
  })

  it('shows a muted dash where the document publishes no value, never a zero', async () => {
    renderAt('/feed')
    const title = await screen.findByText(UPLOADED.title)
    const row = title.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).queryByText(/INR 0\b/)).not.toBeInTheDocument()
  })

  it('counts toward the feed total without dragging it down', async () => {
    renderAt('/feed')
    await screen.findByText(UPLOADED.title)
    // A null value contributes nothing rather than zero, so the total still reads
    // as the value of what is actually priced.
    expect(screen.queryByText('INR 0')).not.toBeInTheDocument()
  })
})

describe('its summary page', () => {
  it('opens by id and shows what the reading found', async () => {
    renderAt(`/feed/${UPLOADED.id}`)

    // The eligibility verdict is no longer presented here -- it moved to Bid
    // Orchestrator, where the bid manager who owns the tender is looking at it.
    // What this page carries is the tender's own terms and the agent's reading.
    // Twice by design: once in the breadcrumb, once as the page's heading.
    await waitFor(() => {
      expect(screen.getAllByText(UPLOADED.title).length).toBeGreaterThan(0)
    })
    expect(screen.queryByRole('heading', { name: /eligibility/i })).not.toBeInTheDocument()
  })

  it('carries the owner it was routed to when it was read', async () => {
    renderAt(`/feed/${UPLOADED.id}`)
    // Matched on the element rather than on an exact string: the name sits
    // beside an avatar and an address in one block, so an exact-text query finds
    // nothing even though the name is plainly rendered.
    await waitFor(() => {
      expect(screen.getAllByText((_, node) =>
        (node?.textContent ?? '').includes('Meera Krishnan')).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText((_, node) =>
      (node?.textContent ?? '').includes('meera.krishnan@meridianinfratech.in')).length)
      .toBeGreaterThan(0)
  })

  it('has an owner even with an empty workspace, which is the fresh state', async () => {
    /**
     * The regression this pair was written for.
     *
     * A reading's owner used to be derived here from the workspace's people, and
     * a fresh visit has none. The tender therefore produced no row at all, and
     * the summary page -- reached straight from the upload that had just created
     * it -- reported it as not in this feed.
     */
    useWorkspace.setState({ people: [], sources: [] })

    renderAt(`/feed/${UPLOADED.id}`)

    await waitFor(() => {
      expect(screen.getAllByText((_, node) =>
        (node?.textContent ?? '').includes('Meera Krishnan')).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/not in this feed/i)).not.toBeInTheDocument()

    // And somebody to hand it to. The owner arrives with the reading; so does the
    // roster, because a workspace holding no people cannot supply one.
    expect(screen.getByText('Anand Raghunathan')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Assign to / }).length).toBeGreaterThan(0)
  })
})

/**
 * Reassignment, on a reading whose workspace holds no people of its own.
 *
 * This is the state the demo actually runs in: nothing has been set up, so the
 * roster on screen comes back with the reading. The owner lookup used the
 * WORKSPACE'S people instead of that roster, so clicking Assign set an id,
 * matched nobody, fell back to the routed owner and changed nothing -- with a
 * toast reading "The owner now owns this bid", which was the only visible clue.
 *
 * 428 tests passed while that shipped. These are the ones that would not have.
 */
describe('Reassigning a reading', () => {
  beforeEach(() => {
    useWorkspace.setState({
      // Exactly as a fresh visit: no local people, roster from the reading.
      sources: [...SOURCES], people: [], tenders: [...TENDERS],
      sourcesRevealed: true, peopleRevealed: true,
      uploadedTenders: [UPLOADED],
      uploadedAssignments: new Map([[UPLOADED.id, OWNER]]),
      uploadedManagers: [OWNER.person, ALTERNATE],
    })
  })

  it('shows the new owner after assigning an alternate', async () => {
    const { act, fireEvent } = await import('@testing-library/react')
    renderAt(`/feed/${UPLOADED.id}`)

    const block = await waitFor(() => screen.getByLabelText(/assignment/i))
    await waitFor(() => expect(block).toHaveTextContent(OWNER.person.name))

    // The alternate's own button, by name rather than by position.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `Assign to ${ALTERNATE.name}` }))
    })

    await waitFor(() => {
      expect(
        within(screen.getByLabelText(/assignment/i)).getByText(ALTERNATE.name),
      ).toBeInTheDocument()
    })
  })

  /*
   * The fallback string is the tell. It only renders when the id set by the click
   * matches nobody in the roster the click came from, which is the bug itself.
   */
  it('names the person in the confirmation, never "The owner"', async () => {
    const { act, fireEvent } = await import('@testing-library/react')
    renderAt(`/feed/${UPLOADED.id}`)

    await waitFor(() => screen.getByLabelText(/assignment/i))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `Assign to ${ALTERNATE.name}` }))
    })

    await waitFor(() => {
      expect(document.body.textContent).toContain(`${ALTERNATE.name} now owns this bid`)
    })
    expect(document.body.textContent).not.toContain('The owner now owns this bid')
  })
})
