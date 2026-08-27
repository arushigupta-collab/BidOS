import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { SOURCES } from '@/data/seed/sources'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

/**
 * The workspace is a live store shared by every test in the file, so each one
 * starts empty rather than from whatever the last one left.
 */
beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

/**
 * The state after a first creation has revealed the five the workspace already
 * had, without going through the form. Tests about the list itself want the rows,
 * not the journey that produces them.
 */
function withExistingSources() {
  useWorkspace.setState({
    sources: SOURCES.map((source) => ({ ...source })),
    sourcesRevealed: true,
  })
}

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return { ...result, router, warn, error }
}

/**
 * Radix overlays are opened from the keyboard. jsdom has no PointerEvent
 * constructor, so a synthesised pointerdown never satisfies the checks Radix
 * makes on it, and this exercises the keyboard operability required anyway.
 */
async function openWithKeyboard(element: HTMLElement, key = 'ArrowDown') {
  await act(async () => {
    fireEvent.keyDown(element, { key })
  })
}

async function chooseFromSelect(triggerName: RegExp | string, optionName: RegExp | string) {
  await openWithKeyboard(screen.getByRole('combobox', { name: triggerName }))
  const option = await screen.findByRole('option', { name: optionName })
  await act(async () => {
    fireEvent.click(option)
  })
}

/** Every field is required now, so a saveable draft fills all five. */
async function fillForm() {
  await chooseFromSelect('Platform', 'Government e-Marketplace (GeM)')
  fireEvent.change(screen.getByLabelText('GeM Seller ID'), {
    target: { value: 'GEM-SLR-9900112' },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'vault-secret' } })
  const keywords = screen.getByLabelText('Keywords')
  fireEvent.change(keywords, { target: { value: 'system integrator' } })
  fireEvent.keyDown(keywords, { key: 'Enter' })
}

describe('The setup journey', () => {
  it('runs from the landing screen to a saved source without a dead end', async () => {
    const router = createMemoryRouter(ROUTES, { initialEntries: ['/'], future: ROUTER_FUTURE })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)

    // / → Try now on the Bid Hawk card, the first of the three.
    await act(async () => {
      fireEvent.click(screen.getAllByRole('link', { name: /try now/i })[0])
    })

    // → the module's introduction, then Begin setup
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /set up sourcing/i }))
    })

    // → Connect sources
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /connect sources/i }))
    })
    expect(router.state.location.pathname).toBe('/sources/new')

    // → state A → Add new source → state B
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /add new source/i }))
    })
    await screen.findByRole('combobox', { name: 'Platform' })

    await fillForm()

    // → Add source → #/sources with the new row highlighted
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add source$/i }))
    })

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/sources')
      },
      { timeout: 4000 },
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Sources' })).toBeInTheDocument()

    // The five the workspace already had arrive alongside the first creation, so
    // the count reads six and the created one is first and highlighted.
    const table = await screen.findByRole('table', { name: /sources/i })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(7)
    expect(rows[1]).toHaveTextContent('Government e-Marketplace')
    expect(rows[1].className).toContain('bg-primary-subtle')
    expect(within(screen.getByRole('navigation', { name: 'Sources' })).getByText('6')).toBeInTheDocument()

    // Back on the add screen: the count moved, and only the created row is
    // recorded as this visit's work.
    const nav = screen.getByRole('navigation', { name: 'Sources' })
    await act(async () => {
      fireEvent.click(within(nav).getByRole('link', { name: /add source/i }))
    })

    expect(await screen.findByRole('button', { name: /view current sources 6/i })).toBeInTheDocument()
    expect(screen.getByText('Added in this session.')).toBeInTheDocument()
    const schema = screen.getByRole('table', { name: /what a source records|added in this session/i })
    expect(within(schema).getAllByRole('row')).toHaveLength(2)

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})

describe('Add source, state A', () => {
  it('opens at a count of zero with an empty schema table', async () => {
    const { warn, error } = renderAt('/sources/new')

    expect(screen.getByRole('button', { name: /view current sources 0/i })).toBeInTheDocument()
    expect(screen.getByText('What a source records.')).toBeInTheDocument()
    // Headers only: one row, and it is the header row.
    expect(screen.getAllByRole('row')).toHaveLength(1)

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('is a fork: two actions and nothing else', () => {
    const { warn, error } = renderAt('/sources/new')

    expect(screen.getByRole('heading', { level: 1, name: 'Add source' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Choose how to add' })).toBeInTheDocument()

    const view = screen.getByRole('button', { name: /view current sources/i })
    const add = screen.getByRole('button', { name: /add new source/i })
    expect(view).toBeInTheDocument()
    expect(add).toHaveFocus()

    // No form until it is asked for.
    expect(screen.queryByRole('combobox', { name: 'Platform' })).not.toBeInTheDocument()

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('reveals the form in place rather than navigating', async () => {
    const { router } = renderAt('/sources/new')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add new source/i }))
    })

    expect(router.state.location.pathname).toBe('/sources/new')
    expect(await screen.findByRole('combobox', { name: 'Platform' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add new source/i })).not.toBeInTheDocument()
    })
  })

  it('goes to the list from the secondary action', async () => {
    const { router } = renderAt('/sources/new')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /view current sources/i }))
    })

    expect(router.state.location.pathname).toBe('/sources')
  })
})

describe('Add source, state B', () => {
  async function openForm() {
    const rendered = renderAt('/sources/new')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add new source/i }))
    })
    await screen.findByRole('combobox', { name: 'Platform' })
    return rendered
  }

  it('holds five required fields and names every one still outstanding', async () => {
    await openForm()

    expect(screen.getByRole('combobox', { name: 'Platform' })).toBeInTheDocument()
    expect(screen.getByLabelText('Listing URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Registered ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Keywords')).toBeInTheDocument()

    const add = screen.getByRole('button', { name: /^add source$/i })
    expect(add).toBeDisabled()

    fireEvent.focus(add.parentElement as HTMLElement)
    const reason = await screen.findByText(/^Still to do:/)
    for (const item of ['platform', 'listing url', 'registered id', 'password', 'keyword']) {
      expect(reason.textContent?.toLowerCase()).toContain(item)
    }
  })

  it('enables the primary only once all five are present', async () => {
    await openForm()

    await fillForm()

    expect(screen.getByRole('button', { name: /^add source$/i })).toBeEnabled()
  })

  it('reveals and re-masks the password from a labelled control', async () => {
    await openForm()

    const field = screen.getByLabelText('Password')
    expect(field).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: 'Show password' })
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    })
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('adds a keyword from the suggestion list by keyboard, without leaving the field', async () => {
    await openForm()

    const keywords = screen.getByLabelText('Keywords')
    expect(keywords).toHaveAttribute('role', 'combobox')
    expect(keywords).toHaveAttribute('aria-expanded', 'false')

    // As a keyboard user arrives: focus the field, then open the list.
    await act(async () => {
      keywords.focus()
    })

    // ArrowDown opens the list, a second press highlights the first option.
    await act(async () => {
      fireEvent.keyDown(keywords, { key: 'ArrowDown' })
    })
    expect(await screen.findByRole('listbox', { name: 'Suggested keywords' })).toBeInTheDocument()
    expect(screen.getByLabelText('Keywords')).toHaveAttribute('aria-expanded', 'true')

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'ArrowDown' })
    })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    // Focus never left the text input, so typing keeps filtering.
    expect(screen.getByLabelText('Keywords')).toHaveFocus()

    const chosen = options[0].textContent ?? ''
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' })
    })

    // A chip added from the list is identical to a typed one, remove control included.
    expect(screen.getByRole('button', { name: `Remove ${chosen}` })).toBeInTheDocument()
    expect(screen.getByLabelText('Keywords')).toHaveFocus()
  })

  it('filters suggestions as you type and still takes an unmatched keyword', async () => {
    await openForm()

    const keywords = screen.getByLabelText('Keywords')
    fireEvent.change(keywords, { target: { value: 'meter' } })

    const options = await screen.findAllByRole('option')
    expect(options.every((option) => /meter/i.test(option.textContent ?? ''))).toBe(true)

    fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'bespoke term' } })
    expect(await screen.findByText(/No suggestion matches "bespoke term"/)).toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' })
    })
    expect(screen.getByText('bespoke term')).toBeInTheDocument()
  })

  it('takes the listing URL and the ID label from the platform', async () => {
    await openForm()

    await chooseFromSelect('Platform', 'Government e-Marketplace (GeM)')

    expect(screen.getByLabelText('Listing URL')).toHaveValue('https://gem.gov.in/bidlists')
    expect(screen.getByLabelText('GeM Seller ID')).toBeInTheDocument()

    await chooseFromSelect('Platform', 'Central Public Procurement Portal (CPPP)')
    expect(screen.getByLabelText('Bidder registration ID')).toBeInTheDocument()
  })

  it('rejects a duplicate keyword instead of silently dropping it', async () => {
    await openForm()

    const field = screen.getByLabelText('Keywords')
    fireEvent.change(field, { target: { value: 'system integrator' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    fireEvent.change(field, { target: { value: 'System Integrator' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(screen.getByText('That keyword is already tracked')).toBeInTheDocument()
  })

  it('asks before discarding a part-filled form', async () => {
    const { router } = await openForm()

    await chooseFromSelect('Platform', 'Government e-Marketplace (GeM)')

    const nav = screen.getByRole('navigation', { name: 'Sources' })
    await act(async () => {
      fireEvent.click(within(nav).getByRole('link', { name: /^sources/i }))
    })

    // Still on the form, with the consequence stated.
    expect(router.state.location.pathname).toBe('/sources/new')
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(/leave without adding/i)

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /discard and leave/i }))
    })

    expect(router.state.location.pathname).toBe('/sources')
  })

  it('returns to the fork from Back', async () => {
    await openForm()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    })

    expect(await screen.findByRole('button', { name: /add new source/i })).toHaveFocus()
  })

  it('saves, navigates to the list, and highlights what it added', async () => {
    const { router } = await openForm()

    await fillForm()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add source$/i }))
    })

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/sources')
      },
      { timeout: 4000 },
    )
    expect(
      (router.state.location.state as { highlightIds?: string[] }).highlightIds,
    ).toHaveLength(1)
  })
})

describe('Sources', () => {
  beforeEach(withExistingSources)

  it('summarises count and platforms without a row of cards', async () => {
    renderAt('/sources')

    const summary = await screen.findByLabelText('Source summary', undefined, { timeout: 4000 })

    expect(within(summary).getByText('Connected sources')).toBeInTheDocument()
    expect(within(summary).getByText('5')).toBeInTheDocument()
    // One of the five is paused, across five distinct platforms.
    expect(within(summary).getByText('1 paused')).toBeInTheDocument()
    expect(within(summary).getByText('5 platforms')).toBeInTheDocument()
  })

  it('lists each source with its status as a word', async () => {
    renderAt('/sources')

    await screen.findByText('Systems integration and managed services', undefined, {
      timeout: 4000,
    })

    expect(screen.getAllByText('Active')).toHaveLength(4)
    expect(screen.getAllByText('Paused')).toHaveLength(1)
    // Nothing on this screen reports crawl state any more.
    expect(screen.queryByText(/captcha/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/next sync/i)).not.toBeInTheDocument()
  })

  it('sorts on demand and reports the direction to assistive technology', async () => {
    renderAt('/sources')

    await screen.findByText('Systems integration and managed services', undefined, {
      timeout: 4000,
    })

    const header = screen.getByRole('button', { name: /^platform/i })
    await act(async () => {
      fireEvent.click(header)
    })

    expect(header.closest('th')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('pauses and resumes from the same menu', async () => {
    renderAt('/sources')

    await screen.findByText('Systems integration and managed services', undefined, {
      timeout: 4000,
    })

    await openWithKeyboard(
      screen.getByRole('button', {
        name: /actions for Systems integration and managed services/i,
      }),
      'Enter',
    )
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /^pause$/i }))
    })

    await waitFor(
      () => {
        expect(screen.getAllByText('Paused')).toHaveLength(2)
      },
      { timeout: 4000 },
    )
  })

  it('names the source before removing it', async () => {
    renderAt('/sources')

    await screen.findByText('Maharashtra citizen services', undefined, { timeout: 4000 })

    await openWithKeyboard(screen.getByRole('button', { name: /actions for Maharashtra citizen services/i }), 'Enter')
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /remove source/i }))
    })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(/remove Maharashtra citizen services/i)

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /remove source/i }))
    })

    await waitFor(
      () => {
        expect(screen.queryByText('Maharashtra citizen services')).not.toBeInTheDocument()
      },
      { timeout: 4000 },
    )
  })

  it('offers adding people as the next step', async () => {
    const { router } = renderAt('/sources')

    await screen.findByText('Systems integration and managed services', undefined, {
      timeout: 4000,
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add people$/i }))
    })

    // The choice state, not an empty table.
    expect(router.state.location.pathname).toBe('/team/new')
    expect(await screen.findByRole('button', { name: /add new person/i })).toBeInTheDocument()
  })
})

describe('A source row opens the stored tender', () => {
  /** The row's own anchor, which the row delegates its click to. */
  function documentLink(row: HTMLElement) {
    const anchor = row.querySelector<HTMLAnchorElement>('a[data-row-document]')
    expect(anchor, 'the row carries no document link').not.toBeNull()
    return anchor as HTMLAnchorElement
  }

  /**
   * Records activations without letting jsdom attempt the navigation, which it
   * cannot perform and would log as an unimplemented feature.
   */
  function watch(anchor: HTMLAnchorElement) {
    const hits: string[] = []
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      hits.push(anchor.getAttribute('href') ?? '')
    })
    return hits
  }

  async function firstRow() {
    const table = await screen.findByRole('table', { name: /sources/i }, { timeout: 4000 })
    return within(table).getAllByRole('row')[1] as HTMLElement
  }

  it('offers the affordance on every row, matching the summary page action', async () => {
    withExistingSources()
    renderAt('/sources')
    const table = await screen.findByRole('table', { name: /sources/i }, { timeout: 4000 })
    const rows = within(table).getAllByRole('row').slice(1)

    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).toHaveTextContent('View RFP')
      expect(documentLink(row).getAttribute('href')).toMatch(
        /\/rfp\/aaple-sarkar-2\.0-rfp\.pdf$/,
      )
      // A clickable row has to look clickable.
      expect(row.className).toContain('cursor-pointer')
      // And say what it does, rather than leaving a reader to click blind.
      expect(row.getAttribute('aria-label')).toMatch(
        /Opens the Maharashtra RTS Aaple Sarkar 2\.0 tender document\./,
      )
    }
  })

  it('opens the document on click', async () => {
    withExistingSources()
    renderAt('/sources')
    const row = await firstRow()
    const hits = watch(documentLink(row))

    await act(async () => {
      fireEvent.click(row)
    })

    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatch(/\/rfp\/aaple-sarkar-2\.0-rfp\.pdf$/)
  })

  it('opens the document on Enter from a focused row', async () => {
    withExistingSources()
    renderAt('/sources')
    const row = await firstRow()
    const hits = watch(documentLink(row))

    await act(async () => {
      row.focus()
      fireEvent.keyDown(row, { key: 'Enter' })
    })

    expect(hits).toHaveLength(1)
  })

  it('leaves the overflow menu alone: it opens its menu, not the document', async () => {
    withExistingSources()
    renderAt('/sources')
    const row = await firstRow()
    const hits = watch(documentLink(row))
    const trigger = within(row).getByRole('button', { name: /actions for/i })

    // Both paths the row listens on have to be stopped at the menu's cell, not
    // just the one that happens to open the menu in jsdom.
    await act(async () => {
      fireEvent.click(trigger)
    })
    expect(hits, 'a click on the menu reached the row').toHaveLength(0)

    await act(async () => {
      fireEvent.keyDown(trigger, { key: 'Enter' })
    })
    expect(hits, 'Enter on the menu reached the row').toHaveLength(0)

    // And the menu itself still works. Opened from the keyboard because jsdom has
    // no PointerEvent constructor, so a synthesised pointerdown never satisfies
    // the checks Radix makes on it.
    await openWithKeyboard(trigger)
    expect(await screen.findByRole('menuitem', { name: /^pause$/i })).toBeInTheDocument()
    expect(hits).toHaveLength(0)
  })

  it('is not a way into the feed: the gate still needs a person', async () => {
    withExistingSources()
    renderAt('/sources')
    await screen.findByRole('table', { name: /sources/i }, { timeout: 4000 })

    // Sources exist; nobody does. Opening a document changes neither.
    expect(useWorkspace.getState().sources.length).toBeGreaterThan(0)
    expect(useWorkspace.getState().people).toHaveLength(0)
  })
})
