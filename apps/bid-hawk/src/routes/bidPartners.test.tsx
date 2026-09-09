import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PARTNERS } from '@/data/seed/partners'
import { INVITED_RFP_IDS, PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { TENDERS } from '@/data/seed/tenders'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return { ...result, router, warn, error }
}

describe('Bid Partners, State A', () => {
  it('opens on its own introduction, mirroring Bid Hawk', () => {
    const { warn, error } = renderAt('/bid-partners')

    expect(screen.getByRole('heading', { level: 1, name: 'Bid Partners' })).toBeInTheDocument()
    // "MODULE", never a suite. BidOS has four modules and none of them is a suite; this
    // label read "Partner management suite" until it was corrected alongside Bid Hawk's.
    expect(screen.getByText('Module')).toBeInTheDocument()
    expect(screen.queryByText(/suite/i)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bid Partners' })).toBeInTheDocument()
    expect(
      screen.getByText(
        /Registers your delivery partners, invites them to respond to an RFP, tracks every document they submit, and evaluates them on capability, commercials and past performance\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /begin setup/i })).toBeInTheDocument()

    // Nothing takes focus on arrival, so the heading is read first.
    expect(document.body).toHaveFocus()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('states its three stages with icons and no ordinals', () => {
    renderAt('/bid-partners')

    const band = screen.getByLabelText('What Bid Partners does')
    expect(band.querySelectorAll('li')).toHaveLength(3)

    for (const title of ['Partner Registry', 'Response Tracker', 'Partner Evaluation']) {
      expect(within(band).getByText(title)).toBeInTheDocument()
    }
    for (const ordinal of ['01', '02', '03']) {
      expect(within(band).queryByText(ordinal)).not.toBeInTheDocument()
    }
    // One recessed surface with hairlines, not three bordered cards.
    expect(band.className).toContain('bg-surface-sunken')
  })

  it('promises AI in evaluation and nowhere else', () => {
    renderAt('/bid-partners')

    const band = screen.getByLabelText('What Bid Partners does')
    const stages = [...band.querySelectorAll('li')].map((li) => li.textContent ?? '')

    expect(stages[2]).toMatch(/AI recommendation/)
    // The registry and the tracker make no such claim. Word-bounded, because
    // "against" contains the letters of AI and a loose match reports a false gap.
    for (const text of [stages[0], stages[1]]) {
      expect(text).not.toMatch(/\bAI\b/)
      expect(text).not.toMatch(/\b(confidence|scores?|suggest\w*|recommend\w*)\b/i)
    }
  })
})

describe('Bid Partners, A to B and back', () => {
  it('transitions in place to three steps, and Back leaves for the landing', async () => {
    const { router } = renderAt('/bid-partners')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin setup/i }))
    })

    const first = await screen.findByRole('button', { name: /manage partners/i })
    expect(router.state.location.pathname).toBe('/bid-partners')
    expect(screen.getByRole('heading', { level: 1, name: 'Bid Partners' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /begin setup/i })).not.toBeInTheDocument()
    })
    expect(first).toHaveFocus()

    // Three steps, all live, none gated on another.
    for (const heading of [
      'Register and invite partners',
      'Track their responses',
      'Evaluate and choose',
    ]) {
      expect(screen.getByText(heading)).toBeInTheDocument()
    }
    for (const action of [/manage partners/i, /open the tracker/i, /open evaluation/i]) {
      expect(screen.getByRole('button', { name: action })).toBeEnabled()
    }

    // The band belongs to State A and does not repeat itself here.
    expect(screen.queryByLabelText('What Bid Partners does')).not.toBeInTheDocument()

    /*
     * Back leaves for the platform landing now, on the client's instruction, so
     * this no longer returns to State A and there is no focus to restore. It
     * asserted both, which was the rule until the rule changed.
     */
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'BidOS' })).toBeInTheDocument()
    expect(screen.queryByLabelText('What Bid Partners does')).not.toBeInTheDocument()
  })

  it('sends each step to its own screen', async () => {
    for (const [action, path] of [
      [/manage partners/i, '/bid-partners/registry'],
      [/open the tracker/i, '/bid-partners/responses'],
      [/open evaluation/i, '/bid-partners/evaluation'],
    ] as const) {
      const { router, unmount } = renderAt('/bid-partners')
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /begin setup/i }))
      })
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: action }))
      })
      expect(router.state.location.pathname).toBe(path)
      unmount()
    }
  })
})

describe('Every Bid Partners address resolves to a built screen', () => {
  const ROUTES_TO_CHECK = [
    '/bid-partners',
    '/bid-partners/registry',
    '/bid-partners/responses',
    '/bid-partners/evaluation',
    '/bid-partners/evaluation/t-mahait-rts2',
  ]

  it('resolves each inside the shell, with no placeholder left anywhere', async () => {
    for (const path of ROUTES_TO_CHECK) {
      const view = renderAt(path)

      expect(screen.getByRole('navigation', { name: 'Workspace' }), path).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /does not match a BidOS surface/i }),
        path,
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /is not built yet/i }),
        path,
      ).not.toBeInTheDocument()

      view.unmount()
    }
  })
})

describe('The Bid Partners navigation', () => {
  it('shows its own three screens and none of Bid Hawk’s', () => {
    renderAt('/bid-partners/registry')

    const nav = screen.getByRole('navigation', { name: 'Workspace' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => (link.textContent ?? '').replace(/\d+$/, '').trim())

    // "Partners", not "Registry": the label names the job rather than the data structure,
    // matching its two siblings which both name activities. The ROUTE is unchanged.
    expect(labels).toEqual(['BidOS', 'Partners', 'Responses', 'Evaluation'])

    // No count badges. A badge reading 7 promises seven things to look at, and none of
    // these three screens has a number an operator is waiting on.
    for (const item of within(nav).getAllByRole('link')) {
      expect(item.textContent, item.textContent ?? '').not.toMatch(/\d/)
    }

    // Never both modules at once: that would read as one module with many screens.
    for (const hawk of ['Sources', 'People', 'RFP feed']) {
      expect(within(nav).queryByRole('link', { name: new RegExp(hawk) })).not.toBeInTheDocument()
    }
  })

  it('leaves Bid Hawk’s navigation exactly as it was', () => {
    useWorkspace.setState({ sources: [], people: [] })
    renderAt('/sources')

    const nav = screen.getByRole('navigation', { name: 'Workspace' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => (link.textContent ?? '').replace(/\d+$/, '').trim())

    // Bid Hawk's navigation before setup: the platform, and the one thing the
    // module is for. The feed waits until there is something in it. Sources and
    // People are configuration, reached from the module's own "Set up sourcing"
    // rather than offered beside the work.
    expect(labels).toEqual(['BidOS', 'Read a tender'])
    for (const partner of ['Registry', 'Responses', 'Evaluation']) {
      expect(within(nav).queryByRole('link', { name: partner })).not.toBeInTheDocument()
    }
  })

  it('carries one hairline for Bid Partners and two for Bid Hawk', () => {
    const partners = renderAt('/bid-partners/registry')
    const partnerNav = screen.getByRole('navigation', { name: 'Workspace' })
    // BidOS, then three peers in one sequence: one divider.
    expect(partnerNav.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(1)
    partners.unmount()

    useWorkspace.setState({
      sources: [{ id: 's-1' } as never],
      people: [{ id: 'p-1' } as never],
    })
    renderAt('/feed')
    const hawkNav = screen.getByRole('navigation', { name: 'Workspace' })
    // BidOS, then the feed, then configuration: two dividers.
    expect(hawkNav.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(2)
  })
})

describe('Partner seed', () => {
  it('loads by default, unlike sources and people', () => {
    // No creation, no reveal: present on the first read of the store.
    const state = useWorkspace.getState()
    // Tied to the seed, not to a literal. It read 7 while the roster grew to 13,
    // which is the same failure the module-count sentence had: a number written
    // down once stops describing the thing it was counting.
    expect(state.partners).toHaveLength(PARTNERS.length)
    expect(state.invitations.length).toBeGreaterThan(0)
    // And the two that DO follow the reveal are still empty.
    expect(state.sources).toHaveLength(0)
    expect(state.people).toHaveLength(0)
  })

  it('survives a reset, because an empty registry was never a real state', () => {
    useWorkspace.getState().resetToEmpty()

    expect(useWorkspace.getState().partners).toHaveLength(PARTNERS.length)
    expect(useWorkspace.getState().invitations).toHaveLength(PARTNER_INVITATIONS.length)
  })

  it('differentiates them enough to be worth comparing', () => {
    const types = new Set(PARTNERS.map((p) => p.type))
    expect(types.size).toBeGreaterThanOrEqual(4)

    /*
     * Ranges rather than exact endpoints. The original assertions pinned the
     * largest team at 900 and broke the moment a bigger partner was registered --
     * they were testing the roster's membership, not the property that matters,
     * which is that the field is spread enough for a ranking to mean something.
     */
    const spread = (values: number[]) => Math.max(...values) / Math.min(...values)
    expect(spread(PARTNERS.map((p) => p.annualTurnoverCr))).toBeGreaterThan(10)
    expect(spread(PARTNERS.map((p) => p.teamSize))).toBeGreaterThan(10)

    const ratings = PARTNERS.map((p) => p.rating)
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeGreaterThan(1)

    // Some carry a certification gap, so evaluation has a real flag to raise
    // rather than a manufactured one -- but not so many that it is the norm.
    const noSecurity = PARTNERS.filter((p) => !p.certifications.includes('ISO 27001'))
    expect(noSecurity.length).toBeGreaterThanOrEqual(2)
    expect(noSecurity.length).toBeLessThan(PARTNERS.length / 2)

    // The MSE is not the biggest but is the best rated: turnover is not the ranking.
    const best = [...PARTNERS].sort((a, b) => b.rating - a.rating)[0]
    expect(best.empanelment).toContain('MSE')
    expect(best.annualTurnoverCr).toBeLessThan(10)
  })

  it('invites against the shared tender seed, never a second one', () => {
    // ONE tender. This build holds exactly one real RFP document, the Aaple Sarkar PDF, and
    // both the tracker and evaluation offer "View RFP" — serving that document from a
    // RailTel or NHAI row would be a visible inconsistency. The tender seed itself is
    // untouched: all fourteen remain and Bid Hawk still lists them all.
    expect(INVITED_RFP_IDS).toHaveLength(1)
    expect(TENDERS.find((t) => t.id === INVITED_RFP_IDS[0])?.tenderRef).toBe(
      'MAHAIT/RTS2.0/001/2025/080',
    )

    const tenderIds = new Set(TENDERS.map((t) => t.id))
    for (const rfpId of PARTNER_INVITATIONS.map((row) => row.rfpId)) {
      expect(tenderIds.has(rfpId), `${rfpId} is not one of the fourteen tenders`).toBe(true)
    }

    const partnerIds = new Set(PARTNERS.map((p) => p.id))
    for (const row of PARTNER_INVITATIONS) {
      expect(partnerIds.has(row.partnerId), `${row.partnerId} is not a seeded partner`).toBe(true)
    }
  })

  it('spreads the roster across industries, so an RFP has a field of its own', () => {
    const byIndustry = new Map<string, number>()
    for (const partner of PARTNERS) {
      byIndustry.set(partner.industry, (byIndustry.get(partner.industry) ?? 0) + 1)
    }

    // More than one industry, or routing an RFP by industry does nothing at all.
    expect(byIndustry.size).toBeGreaterThanOrEqual(5)

    /*
     * The two industries the workspace has actually read tenders in each need a
     * field, not a single partner. An evaluation of one is a ranking of nothing,
     * which is exactly what the digitisation tender got before this.
     */
    for (const industry of [
      'e-Governance and Citizen Services',
      'Document Management and Digitisation',
    ]) {
      expect(byIndustry.get(industry) ?? 0, industry).toBeGreaterThanOrEqual(3)
    }
  })

  it('invites a full field, all with something received and genuinely varied progress', () => {
    for (const rfpId of INVITED_RFP_IDS) {
      const rows = PARTNER_INVITATIONS.filter((row) => row.rfpId === rfpId)

      /*
       * A field deep enough to rank. It asserted every partner, which was true
       * when the roster was seven e-Governance firms and became false the moment
       * it spanned industries -- and inviting a telecom specialist to a
       * citizen-services tender is precisely what industry routing now prevents.
       *
       * These invitations predate that routing: they are a record of what was
       * sent, not a demonstration of what would be sent today.
       */
      expect(rows.length, rfpId).toBeGreaterThanOrEqual(5)

      // Every invitation declares all six document types, some outstanding.
      for (const row of rows) {
        expect(row.documents).toHaveLength(6)
      }
      const anyOutstanding = rows.some((row) =>
        row.documents.some((doc) => doc.status === 'not-submitted'),
      )
      expect(anyOutstanding, rfpId).toBe(true)

      // EVERY PARTNER HAS AT LEAST ONE DOCUMENT IN. There is no zero-received state: a
      // partner who has sent nothing is being chased, not tracked.
      for (const row of rows) {
        const received = row.documents.filter(
          (doc) => doc.status === 'submitted' || doc.status === 'under-review',
        ).length
        expect(received, `${row.partnerId} has nothing received`).toBeGreaterThan(0)
      }

      // Varied progress, not seven rows at the same completeness.
      const ratios = new Set(
        rows.map(
          (row) =>
            row.documents.filter(
              (doc) => doc.status === 'submitted' || doc.status === 'under-review',
            ).length,
        ),
      )
      expect(ratios.size, 'every partner is at the same completeness').toBeGreaterThan(2)
    }

    // A quote only exists where a commercial quote was actually submitted.
    for (const row of PARTNER_INVITATIONS) {
      const quoteIn = row.documents.some(
        (doc) => doc.type === 'Commercial quote' && doc.status === 'submitted',
      )
      expect(row.quotedValueCr === null, `${row.id}`).toBe(!quoteIn)
    }
  })
})
