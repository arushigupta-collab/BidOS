import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PEOPLE } from '@/data/seed/people'
import { SOURCES } from '@/data/seed/sources'
import { TENDERS } from '@/data/seed/tenders'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

const HERO = 't-mahait-rts2'

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

/** Sources and their RFPs revealed, with nobody to route them to yet. */
function withSourcesOnly() {
  useWorkspace.setState({
    sources: SOURCES.map((s) => ({ ...s })),
    tenders: TENDERS.map((t) => ({ ...t })),
    sourcesRevealed: true,
  })
}

/** The whole workspace: sources, RFPs and the people to route them to. */
function withEverything() {
  withSourcesOnly()
  useWorkspace.setState({ people: PEOPLE.map((p) => ({ ...p })), peopleRevealed: true })
}

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return { ...result, router, warn, error }
}

describe('RFP feed', () => {
  it('names the outstanding step when reached before setup is done', async () => {
    renderAt('/feed')

    expect(
      await screen.findByRole(
        'heading',
        { name: /connect a platform before opening the feed/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect a source/i })).toBeInTheDocument()
    // Not a silent redirect and not an empty table.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('names the other outstanding step when only the platforms exist', async () => {
    withSourcesOnly()
    renderAt('/feed')

    expect(
      await screen.findByRole(
        'heading',
        { name: /add a bid manager before opening the feed/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add a bid manager/i })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('gates a specific RFP by address too', async () => {
    withSourcesOnly()
    renderAt(`/feed/${HERO}`)

    expect(
      await screen.findByRole(
        'heading',
        { name: /add a bid manager before opening the feed/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
  })

  it('names an owner on every row, and never narrates why', async () => {
    withEverything()
    const { warn, error } = renderAt('/feed')

    const table = await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(TENDERS.length)

    const names = new Set(PEOPLE.map((row) => row.name))
    for (const row of rows) {
      const owner = row.querySelector('td:nth-child(8)')
      expect([...names].some((name) => (owner?.textContent ?? '').includes(name))).toBe(true)
    }

    // The hero still routes on e-governance and Maharashtra, silently.
    const hero = within(table).getByText(/Aaple Sarkar 2\.0/).closest('tr') as HTMLElement
    expect(hero).toHaveTextContent('Meera Krishnan')
    expect(hero).not.toHaveTextContent(/Domain:|Region:|percent/)

    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('leads with the total and marks only the time-critical stat', async () => {
    withEverything()
    renderAt('/feed')

    const strip = await screen.findByLabelText('Feed summary', undefined, { timeout: 4000 })

    expect(within(strip).getByText('Total RFPs')).toBeInTheDocument()
    expect(within(strip).getByText('14')).toBeInTheDocument()
    expect(within(strip).getByText('Closing in 7 days')).toBeInTheDocument()
    expect(within(strip).getByText('Assigned today')).toBeInTheDocument()
    expect(within(strip).getByText('Total bid value')).toBeInTheDocument()
    // Permanently zero once everything is assigned, so it says nothing.
    expect(within(strip).queryByText('Unassigned')).not.toBeInTheDocument()
  })

  it('shows the keywords that actually matched, not the source keyword set', async () => {
    withEverything()
    renderAt('/feed')

    const table = await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    const hero = within(table).getByText(/Aaple Sarkar 2\.0/).closest('tr') as HTMLElement

    expect(hero).toHaveTextContent('Aaple Sarkar')
    expect(hero).toHaveTextContent('RTS')
    // Two chips and a counted overflow, not the whole set.
    expect(within(hero).getByText('+2')).toBeInTheDocument()
  })

  it('shows which listings carry risk flags without opening them', async () => {
    withEverything()
    renderAt('/feed')

    const table = await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    const hero = within(table).getByText(/Aaple Sarkar 2\.0/).closest('tr') as HTMLElement

    expect(hero).toHaveTextContent('2 risk flags')
    // Only the listings that actually carry defects say so.
    expect(within(table).getAllByText(/risk flags?$/).length).toBeLessThan(
      within(table).getAllByRole('row').length - 1,
    )
  })

  it('offers no assignment filter, because nothing is unassigned', async () => {
    withEverything()
    renderAt('/feed')

    await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })

    for (const gone of ['Assigned', 'Unassigned']) {
      expect(screen.queryByRole('button', { name: gone })).not.toBeInTheDocument()
    }
    expect(screen.queryByText('Assignment')).not.toBeInTheDocument()
  })

  it('filters, reports the count, and offers a way back when nothing matches', async () => {
    withEverything()
    renderAt('/feed')

    await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    expect(screen.getByText('14 results')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Closing in 72h' }))
    })
    expect(screen.getByText('2 results')).toBeInTheDocument()

    // Then a combination nothing can satisfy: a 72h window on a single source.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: SOURCES[0].name }))
    })
    expect(
      await screen.findByRole('heading', { name: /no RFPs match these filters/i }),
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))
    })
    expect(screen.getByText('14 results')).toBeInTheDocument()
  })

  it('opens a row on Enter as well as by click', async () => {
    withEverything()
    const { router } = renderAt('/feed')

    const table = await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    const hero = within(table).getByText(/Aaple Sarkar 2\.0/).closest('tr') as HTMLElement

    await act(async () => {
      fireEvent.keyDown(hero, { key: 'Enter' })
    })

    expect(router.state.location.pathname).toBe(`/feed/${HERO}`)
  })
})

describe('RFP summary', () => {
  it('does not judge eligibility here, which is the bid manager\'s call', async () => {
    withEverything()
    renderAt(`/feed/${HERO}`)

    await screen.findByText('Bid Hawk summary', undefined, { timeout: 4000 })

    /**
     * The snapshot moved to Bid Orchestrator's tender page, where the person who
     * owns the bid is looking at it. Bid Hawk reads a tender, says what it is,
     * flags what is wrong with it and routes it; whether THIS company qualifies is
     * a decision, and showing the verdict before anyone has accepted the work put
     * a judgement on a screen nobody had asked one of.
     *
     * The rows are still extracted and still stored. Only the presentation moved.
     */
    expect(screen.queryByRole('heading', { name: /eligibility/i })).not.toBeInTheDocument()

    // Not "no mention of CMMI": the agent's own summary names it, because a
    // lapsed appraisal is one of the things worth knowing about this tender. What
    // is gone is the VERDICT -- the row-by-row pass, check and not-met judgement.
    expect(screen.queryByText('Not met')).not.toBeInTheDocument()
    expect(screen.queryByText('Met')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ of \d+ criteria/)).not.toBeInTheDocument()
  })

  it('carries both risk flags with severities, deadlines and a working action', async () => {
    withEverything()
    renderAt(`/feed/${HERO}`)

    const section = await screen.findByLabelText('Risk flags', undefined, { timeout: 4000 })

    expect(within(section).getByText(/SLA contradiction/i)).toBeInTheDocument()
    expect(within(section).getByText('High severity')).toBeInTheDocument()
    expect(within(section).getByText(/Advance Bank Guarantee not specified/i)).toBeInTheDocument()
    expect(within(section).getByText('Medium severity')).toBeInTheDocument()
    expect(within(section).getByText(/13 Aug 2027/)).toBeInTheDocument()

    const raise = within(section).getAllByRole('button', { name: /raise as pre-bid query/i })[0]
    await act(async () => {
      fireEvent.click(raise)
    })

    expect(
      await screen.findByText(/recorded for the pre-bid submission/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument()
  })

  it('states the summary with its disclaimer, and never marks itself as sample content', async () => {
    withEverything()
    const { warn, error } = renderAt(`/feed/${HERO}`)

    expect(await screen.findByText('Bid Hawk summary', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText(/Verify against the source RFP before submission/)).toBeInTheDocument()
    expect(screen.getByText(/^Scope\.$/)).toBeInTheDocument()
    expect(screen.getByText(/^Recommendation\.$/)).toBeInTheDocument()

    for (const banned of [/demo/i, /sample/i, /placeholder/i]) {
      expect(screen.queryByText(banned)).not.toBeInTheDocument()
    }

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('puts the agent summary first in the heading outline', async () => {
    withEverything()
    renderAt(`/feed/${HERO}`)

    await screen.findByText('Bid Hawk summary', undefined, { timeout: 4000 })

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => (heading.textContent ?? '').trim())

    // A screen reader paging by heading meets the agent's output first, then what
    // is wrong with the document, then who owns it. The eligibility snapshot used
    // to sit between the first two and has moved to Bid Orchestrator.
    // Relative order, not absolute position: the snapshot of the tender's own
    // terms is a heading too, and it sits in the column beside this one.
    expect(headings.indexOf('Bid Hawk summary')).toBeGreaterThanOrEqual(0)
    expect(headings).not.toContain('Eligibility snapshot')
    expect(headings.indexOf('Bid Hawk summary')).toBeLessThan(headings.indexOf('Assignment'))
  })

  it('opens the one held document from every tender, in place', async () => {
    withEverything()

    // Not only the tender the document belongs to: every one of them.
    for (const id of [HERO, 't-bsnl-otn-bihar', 't-hal-plm']) {
      const { unmount } = renderAt(`/feed/${id}`)

      const view = await screen.findByRole('button', { name: /view RFP/i }, { timeout: 4000 })
      expect(view).not.toHaveAttribute('aria-disabled')

      /**
       * Opens in place rather than handing the file to the browser.
       *
       * It was an anchor with a target, which put the PDF into the browser's own
       * handling -- and on most configurations that downloads rather than
       * displays. A reader checking the page a figure came from got a file in
       * their downloads folder and lost the summary they were reading.
       *
       * Asserted on what appears, not on how it is wired: the document is
       * embedded at the path that resolves for this build, with no hash route in
       * it.
       */
      fireEvent.click(view)

      const frame = await screen.findByTitle(/tender document/i, undefined, { timeout: 4000 })
      expect(frame.getAttribute('src')).toMatch(/\/rfp\/aaple-sarkar-2\.0-rfp\.pdf/)
      expect(frame.getAttribute('src')).not.toMatch(/#\//)

      unmount()
    }
  })

  it('carries no documents section, so no control refuses to work', async () => {
    withEverything()
    renderAt(`/feed/${HERO}`)

    await screen.findByRole('button', { name: /view RFP/i }, { timeout: 4000 })

    // One document, offered once. No list of files this build does not hold, and
    // so no control that would refuse to work when pressed.
    expect(screen.queryByLabelText('Documents')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
  })

  it('states the owner as identity alone, with no reason and no percentage', async () => {
    withEverything()
    renderAt(`/feed/${HERO}`)

    const section = await screen.findByLabelText('Assignment', undefined, { timeout: 4000 })

    const email = within(section).getByText('meera.krishnan@meridianinfratech.in')
    expect(email.parentElement).toHaveTextContent('Meera Krishnan')

    // The owner appears once. The alternates are everyone else, so the current
    // owner is not offered as a way to reassign the bid to themselves.
    expect(within(section).getAllByText('Meera Krishnan')).toHaveLength(1)

    /**
     * Still no scoring, anywhere in this section.
     *
     * The alternates each carry a line, and it is that person's own coverage --
     * the domains and regions on their record -- not the engine's reason for
     * matching them and not its confidence. A fact a reader can check, rather
     * than the product explaining its own arithmetic.
     */
    expect(within(section).queryByText(/percent/)).not.toBeInTheDocument()
    expect(within(section).queryByText(/Domain:|Region:/)).not.toBeInTheDocument()
    expect(within(section).queryByText(/Why this owner/i)).not.toBeInTheDocument()
    expect(within(section).queryByText('Unassigned')).not.toBeInTheDocument()

    // Reassignment stays: a computed owner nobody can change is a claim. It is
    // now a ranked list of the alternatives rather than a select of every name.
    // Named per person, so a screen reader's control list distinguishes them.
    const alternates = within(section).getAllByRole('button', { name: /^Assign to / })
    expect(alternates.length).toBeGreaterThan(0)
    expect(
      within(section).getByRole('button', { name: 'Assign to Anand Raghunathan' }),
    ).toBeInTheDocument()
    expect(within(section).getByText('Anand Raghunathan')).toBeInTheDocument()
  })

  it('moves through the feed and reports the position', async () => {
    withEverything()
    const { router } = renderAt(`/feed/${HERO}`)

    expect(await screen.findByText(/of 14$/, undefined, { timeout: 4000 })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^previous$/i }))
    })
    expect(router.state.location.pathname).not.toBe(`/feed/${HERO}`)
  })

  it('resolves an unknown id to a state with a route back', async () => {
    withEverything()
    renderAt('/feed/t-does-not-exist')

    expect(
      await screen.findByRole('heading', { name: /that RFP is not in this feed/i }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to the RFP feed/i })).toBeInTheDocument()
  })
})

describe('The gate around the feed', () => {
  it('keeps the feed out of the navigation until both halves of setup exist', async () => {
    renderAt('/sources')
    const nav = await screen.findByRole('navigation', { name: 'Workspace' }, { timeout: 4000 })

    expect(within(nav).queryByRole('link', { name: /RFP feed/ })).not.toBeInTheDocument()

    // And nothing else either. The configuration screens left the navigation:
    // they are reached from the module's own setup path, and this screen IS one
    // of them, so offering it to itself said nothing.
    expect(within(nav).queryByRole('link', { name: /Sources/ })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /People/ })).not.toBeInTheDocument()
  })

  it('still keeps it out when only the platforms exist', async () => {
    withSourcesOnly()
    renderAt('/sources')
    const nav = await screen.findByRole('navigation', { name: 'Workspace' }, { timeout: 4000 })

    expect(within(nav).queryByRole('link', { name: /RFP feed/ })).not.toBeInTheDocument()
  })

  it('shows it once both exist', async () => {
    withEverything()
    renderAt('/sources')
    const nav = await screen.findByRole('navigation', { name: 'Workspace' }, { timeout: 4000 })

    expect(within(nav).getByRole('link', { name: /RFP feed/ })).toBeInTheDocument()
  })

  it('opens the feed from the setup path once both steps are done', async () => {
    withEverything()
    const { router } = renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /set up sourcing/i }, { timeout: 4000 }))
    })

    expect(
      await screen.findByText(/matched listings against your connected platforms/i),
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open the RFP feed/i }))
    })
    expect(router.state.location.pathname).toBe('/feed')
  })

  it('offers nothing about the feed on the setup path while a step is outstanding', async () => {
    withSourcesOnly()
    renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /set up sourcing/i }, { timeout: 4000 }))
    })
    await screen.findByRole('button', { name: /manage sources/i })

    expect(screen.queryByRole('button', { name: /open the RFP feed/i })).not.toBeInTheDocument()
  })

  it('turns both next-step bands towards the feed once setup is done', async () => {
    withEverything()

    for (const path of ['/sources', '/team']) {
      const { unmount, router } = renderAt(path)
      const band = await screen.findByLabelText('Where to go next', undefined, { timeout: 4000 })

      await act(async () => {
        fireEvent.click(within(band).getByRole('button', { name: /open the RFP feed/i }))
      })
      expect(router.state.location.pathname).toBe('/feed')
      unmount()
    }
  })

  it('keeps each band pointing at the other list while setup is unfinished', async () => {
    withSourcesOnly()
    renderAt('/sources')
    const band = await screen.findByLabelText('Where to go next', undefined, { timeout: 4000 })

    expect(within(band).getByRole('button', { name: /add people/i })).toBeInTheDocument()
    expect(within(band).queryByRole('button', { name: /open the RFP feed/i })).not.toBeInTheDocument()
  })
})
