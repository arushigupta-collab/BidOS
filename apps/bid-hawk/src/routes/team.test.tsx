import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PEOPLE } from '@/data/seed/people'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

/**
 * The state after a first creation has revealed the five the workspace already
 * had, without going through the form. Tests about the list itself want the rows,
 * not the journey that produces them.
 */
function withExistingPeople() {
  useWorkspace.setState({
    people: PEOPLE.map((person) => ({ ...person })),
    peopleRevealed: true,
  })
}

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return { ...result, router, warn, error }
}

async function openWithKeyboard(element: HTMLElement, key = 'ArrowDown') {
  await act(async () => {
    fireEvent.keyDown(element, { key })
  })
}

async function openForm() {
  const rendered = renderAt('/team/new')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /add new person/i }))
  })
  await screen.findByLabelText('Name')
  return rendered
}

function fillIdentity(name = 'Ananya Deshpande', email = 'ananya.deshpande@meridianinfratech.in') {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
}

describe('Add people, state A', () => {
  it('opens at a count of zero with an empty schema table', () => {
    const { warn, error } = renderAt('/team/new')

    expect(screen.getByRole('heading', { level: 1, name: 'Add people' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Choose how to add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view current people 0/i })).toBeInTheDocument()
    expect(screen.getByText('What a person record holds.')).toBeInTheDocument()

    // Headers only: one row, and it is the header row.
    expect(screen.getAllByRole('row')).toHaveLength(1)
    for (const heading of ['Name', 'Email', 'Domain expertise', 'Regional expertise', 'Added']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(heading, 'i') })).toBeInTheDocument()
    }

    expect(screen.getByRole('button', { name: /add new person/i })).toHaveFocus()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('reveals the form in place rather than navigating', async () => {
    const { router } = renderAt('/team/new')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add new person/i }))
    })

    expect(router.state.location.pathname).toBe('/team/new')
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add new person/i })).not.toBeInTheDocument()
    })
  })
})

describe('Add people, state B', () => {
  it('states the single role rather than offering a choice', async () => {
    await openForm()

    expect(screen.getByText('Account Executive')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /role/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Everyone added here is an Account Executive/)).toBeInTheDocument()
  })

  it('names what is wrong with an email rather than calling it invalid', async () => {
    await openForm()

    const email = screen.getByLabelText('Email')

    fireEvent.change(email, { target: { value: 'ananya.deshpande' } })
    expect(screen.getByText('This is missing the @ symbol.')).toBeInTheDocument()

    fireEvent.change(email, { target: { value: 'ananya@meridian' } })
    expect(
      screen.getByText(/missing a domain, for example meridianinfratech\.in/),
    ).toBeInTheDocument()

    fireEvent.change(email, { target: { value: 'ananya deshpande@x.in' } })
    expect(screen.getByText('An email address cannot contain a space.')).toBeInTheDocument()

    fireEvent.change(email, { target: { value: 'ananya@meridianinfratech.in' } })
    expect(screen.queryByText(/missing/i)).not.toBeInTheDocument()
  })

  it('blocks the primary while both expertise fields are empty, and says so on the pair', async () => {
    await openForm()

    fillIdentity()

    const add = screen.getByRole('button', { name: /^add person$/i })
    expect(add).toBeDisabled()

    fireEvent.focus(add.parentElement as HTMLElement)
    const reason = await screen.findByText(/^Still to do:/)
    expect(reason).toHaveTextContent(/at least one area of expertise/i)

    // The message sits with the pair, not on one of the two fields.
    expect(
      screen.getByText(/At least one area of expertise is needed for routing/),
    ).toBeInTheDocument()
  })

  it('accepts either expertise field alone', async () => {
    await openForm()
    fillIdentity()

    // Regional only.
    const regions = screen.getByLabelText('Regional expertise')
    fireEvent.change(regions, { target: { value: 'Bihar' } })
    fireEvent.keyDown(regions, { key: 'Enter' })
    expect(screen.getByRole('button', { name: /^add person$/i })).toBeEnabled()

    // Then domain only.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bihar' }))
    expect(screen.getByRole('button', { name: /^add person$/i })).toBeDisabled()

    const domains = screen.getByLabelText('Domain expertise')
    fireEvent.change(domains, { target: { value: 'Solar' } })
    fireEvent.keyDown(domains, { key: 'Enter' })
    expect(screen.getByRole('button', { name: /^add person$/i })).toBeEnabled()
  })

  it('offers regional suggestions in two groups and takes one by keyboard', async () => {
    await openForm()

    const regions = screen.getByLabelText('Regional expertise')
    await act(async () => {
      regions.focus()
      fireEvent.keyDown(regions, { key: 'ArrowDown' })
    })

    const list = await screen.findByRole('listbox', { name: /suggested regional expertise/i })
    expect(within(list).getByRole('group', { name: 'Zones' })).toBeInTheDocument()
    expect(within(list).getByRole('group', { name: 'States' })).toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Regional expertise'), { key: 'ArrowDown' })
    })
    const active = screen.getAllByRole('option')[0]
    expect(active).toHaveAttribute('aria-selected', 'true')

    const chosen = active.textContent ?? ''
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Regional expertise'), { key: 'Enter' })
    })

    expect(screen.getByRole('button', { name: `Remove ${chosen}` })).toBeInTheDocument()
    expect(screen.getByLabelText('Regional expertise')).toHaveFocus()
  })

  it('saves, navigates to the list, and increments both counts', async () => {
    const { router } = await openForm()

    fillIdentity()
    const domains = screen.getByLabelText('Domain expertise')
    fireEvent.change(domains, { target: { value: 'AI - Computer Vision' } })
    fireEvent.keyDown(domains, { key: 'Enter' })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add person$/i }))
    })

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/team')
      },
      { timeout: 4000 },
    )

    // The five the workspace already had arrive alongside the first creation, so
    // the count reads six and the created one is first and highlighted.
    const table = await screen.findByRole('table', { name: /people/i })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(7)
    expect(rows[1]).toHaveTextContent('Ananya Deshpande')
    expect(rows[1].className).toContain('bg-primary-subtle')

    const nav = screen.getByRole('navigation', { name: 'People' })
    expect(within(nav).getByText('6')).toBeInTheDocument()
  })

  it('leaves sources untouched when a person is created', async () => {
    await openForm()

    fillIdentity()
    const domains = screen.getByLabelText('Domain expertise')
    fireEvent.change(domains, { target: { value: 'Solar' } })
    fireEvent.keyDown(domains, { key: 'Enter' })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add person$/i }))
    })

    await waitFor(() => expect(useWorkspace.getState().people).toHaveLength(6), { timeout: 4000 })
    // The two record types are independent.
    expect(useWorkspace.getState().sources).toHaveLength(0)
    expect(useWorkspace.getState().sourcesRevealed).toBe(false)
  })
})

describe('People', () => {
  it('explains what a person record is for when there is nobody', async () => {
    renderAt('/team')

    expect(
      await screen.findByRole('heading', { name: 'No people yet' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/routed against/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add the first person/i })).toBeInTheDocument()
  })

  it('lists each person with their role and expertise', async () => {
    withExistingPeople()
    renderAt('/team')

    await screen.findByText('Anand Raghunathan', undefined, { timeout: 4000 })

    expect(screen.getAllByText('Account Executive')).toHaveLength(5)
    // The two lopsided records show a dash where they hold nothing.
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('summarises the count and the domains covered', async () => {
    withExistingPeople()
    renderAt('/team')

    const summary = await screen.findByLabelText('People summary', undefined, { timeout: 4000 })
    expect(within(summary).getByText('Account Executives')).toBeInTheDocument()
    expect(within(summary).getByText('5')).toBeInTheDocument()
    expect(within(summary).getByText('1 by region only')).toBeInTheDocument()
  })

  it('edits a person from the row menu, pre-filled, and saves the change', async () => {
    withExistingPeople()
    const { router } = renderAt('/team')

    await screen.findByText('Meera Krishnan', undefined, { timeout: 4000 })

    await openWithKeyboard(
      screen.getByRole('button', { name: /actions for Meera Krishnan/i }),
      'Enter',
    )
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /edit person/i }))
    })

    expect(router.state.location.pathname).toBe('/team/p-meera/edit')
    expect(await screen.findByRole('heading', { level: 2, name: /Edit Meera Krishnan/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Meera Krishnan')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meera K Krishnan' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    })

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe('/team')
      },
      { timeout: 4000 },
    )
    expect(await screen.findByText('Meera K Krishnan')).toBeInTheDocument()
  })

  it('asks before abandoning an edit, and calls the exit Cancel', async () => {
    withExistingPeople()
    const { router } = renderAt('/team/p-vikram/edit')

    await screen.findByLabelText('Name')
    // Distinct label from the add route, where Back returns to the fork.
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Vikram I' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    })

    expect(router.state.location.pathname).toBe('/team/p-vikram/edit')
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(/leave without saving these changes/i)

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /discard and leave/i }))
    })
    // The landing, for the same reason the source form goes there.
    expect(router.state.location.pathname).toBe('/')
  })

  it('names the person before removing them', async () => {
    withExistingPeople()
    renderAt('/team')

    await screen.findByText('Nafisa Qureshi', undefined, { timeout: 4000 })

    await openWithKeyboard(
      screen.getByRole('button', { name: /actions for Nafisa Qureshi/i }),
      'Enter',
    )
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /remove person/i }))
    })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(/remove Nafisa Qureshi/i)

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /remove person/i }))
    })

    await waitFor(
      () => {
        expect(screen.queryByText('Nafisa Qureshi')).not.toBeInTheDocument()
      },
      { timeout: 4000 },
    )
  })
})

const CREATED_PERSON = {
  id: 'p-new',
  name: 'Created This Visit',
  email: 'created@meridianinfratech.in',
  domains: ['Solar'],
  regions: [],
  addedAt: '2026-07-30T00:00:00.000Z',
}

describe('Revealing the existing workspace', () => {
  it('reveals the existing five once, behind the created record', () => {
    renderAt('/team/new')

    act(() => {
      useWorkspace.getState().addPeople([CREATED_PERSON])
    })

    const first = useWorkspace.getState()
    expect(first.people).toHaveLength(6)
    expect(first.people[0].id).toBe('p-new')
    expect(first.peopleRevealed).toBe(true)
    // Only the created record counts as this visit's work.
    expect(first.sessionPeople).toHaveLength(1)

    act(() => {
      useWorkspace.getState().addPeople([{ ...CREATED_PERSON, id: 'p-second' }])
    })

    // A second creation adds one, it does not reveal the five again.
    const second = useWorkspace.getState()
    expect(second.people).toHaveLength(7)
    expect(second.people[0].id).toBe('p-second')
  })

  it('is re-armed by Reset to empty, so the journey can run again', () => {
    renderAt('/team/new')

    act(() => {
      useWorkspace.getState().addPeople([CREATED_PERSON])
    })
    expect(useWorkspace.getState().people).toHaveLength(6)

    act(() => {
      useWorkspace.getState().resetToEmpty()
    })

    const reset = useWorkspace.getState()
    expect(reset.people).toHaveLength(0)
    expect(reset.sessionPeople).toHaveLength(0)
    expect(reset.peopleRevealed).toBe(false)

    act(() => {
      useWorkspace.getState().addPeople([CREATED_PERSON])
    })
    expect(useWorkspace.getState().people).toHaveLength(6)
  })
})

describe('The workspace state panel', () => {
  it('offers reset only, on the keyboard shortcut, and nowhere else in the UI', async () => {
    renderAt('/')

    expect(screen.queryByText('Workspace state')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.keyDown(window, { key: 'D', shiftKey: true, metaKey: true })
    })

    expect(await screen.findByText('Workspace state')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset to empty/i })).toBeInTheDocument()
    // Loading by hand would skip the behaviour worth showing.
    expect(
      screen.queryByRole('button', { name: /load populated workspace/i }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText(/not yet revealed/)).toHaveLength(2)
  })
})
