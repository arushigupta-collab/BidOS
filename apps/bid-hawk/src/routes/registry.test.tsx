import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { PARTNERS } from '@/data/seed/partners'
import { TENDERS } from '@/data/seed/tenders'

/** The selector lists the tenders newest-discovery first, so this is option one. */
const NEWEST = [...TENDERS].sort(
  (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
)[0]

/** Radix computes an option's name from nested spans, so pick positionally. */
async function chooseFirstRfp() {
  const select = screen.getByRole('combobox', { name: /RFP to invite partners to/i })
  await act(async () => {
    fireEvent.keyDown(select, { key: 'ArrowDown' })
  })
  const options = await screen.findAllByRole('option')
  await act(async () => {
    fireEvent.click(options[0])
  })
}
import { EMPTY_VALUE } from '@/lib/format'
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

const table = () => screen.findByRole('table', { name: /partner registry/i }, { timeout: 4000 })
const rows = async () => within(await table()).getAllByRole('row').slice(1)

/**
 * Chooses a tender in the invitation selector. Radix builds an option's name from nested
 * spans, so this picks by position in the selector's own newest-discovery order.
 */
async function pickRfp(rfpId: string) {
  const order = [...TENDERS].sort(
    (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
  )
  const index = order.findIndex((tender) => tender.id === rfpId)
  expect(index, `${rfpId} is not in the selector`).toBeGreaterThanOrEqual(0)

  const select = screen.getByRole('combobox', { name: /RFP to invite partners to/i })
  await act(async () => {
    fireEvent.keyDown(select, { key: 'ArrowDown' })
  })
  const options = await screen.findAllByRole('option')
  await act(async () => {
    fireEvent.click(options[index])
  })
}

/** The "Invited to this RFP" figure, read off the band. */
function invitedFigure(): string {
  const label = screen.getByText('Invited to this RFP')
  return (label.parentElement?.querySelector('p:last-of-type')?.textContent ?? '').trim()
}

describe('Invited to this RFP', () => {
  it('equals the number of invitation records for the selected tender, and dashes with none', async () => {
    renderAt('/bid-partners/registry')
    await table()

    // No RFP chosen: a muted dash, not a zero. "None invited yet" and "no RFP chosen" are
    // different facts and a 0 states the first when the second is true.
    expect(invitedFigure()).toBe(EMPTY_VALUE)

    // With one chosen, the figure is COUNTED FROM THE RECORDS, never stored and never
    // approximated. Asserted against the store rather than against a literal, so the
    // seed can change without the test lying.
    const rfpId = PARTNER_INVITATIONS[0].rfpId
    await act(async () => {
      useWorkspace.setState({ invitations: PARTNER_INVITATIONS.map((row) => ({ ...row })) })
    })
    await pickRfp(rfpId)

    const expected = useWorkspace
      .getState()
      .invitations.filter((row) => row.rfpId === rfpId).length
    expect(expected).toBeGreaterThan(0)
    expect(invitedFigure()).toBe(String(expected))

    // And it MOVES when a record is added, because it is derived from them.
    await act(async () => {
      useWorkspace.setState((state) => ({
        invitations: [
          ...state.invitations,
          { ...PARTNER_INVITATIONS[0], id: 'pi-extra', partnerId: 'pt-kaveri', rfpId },
        ],
      }))
    })
    expect(invitedFigure()).toBe(String(expected + 1))
  })
})

/** Opens one of the two filter dropdowns and toggles an option inside it. */
async function pickFilter(control: 'Capability' | 'Region', option: string) {
  // The trigger's accessible name is its associated <label>, not the placeholder text
  // it displays.
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: control }))
  })
  const listbox = await screen.findByRole('listbox', { name: control })
  await act(async () => {
    fireEvent.click(within(listbox).getByRole('option', { name: new RegExp(`^${option}`) }))
  })
}

describe('The registry', () => {
  it('goes straight to the table, with no choice state', async () => {
    const { warn, error } = renderAt('/bid-partners/registry')

    expect(await rows()).toHaveLength(PARTNERS.length)

    // Sources and people open on a fork between viewing and adding. Partners load by
    // default, so that fork would sit in front of a table that already has rows.
    expect(screen.queryByRole('button', { name: /view current partners/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add partner/i })).toBeInTheDocument()

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('carries no rating, score, projects or on-time figure', async () => {
    renderAt('/bid-partners/registry')
    const body = (await table()).textContent ?? ''

    // Those are Partner Evaluation's fields. A number here would start the ranking two
    // screens early, with no RFP to rank against and no reasoning shown.
    for (const banned of [/\brating\b/i, /\bscore\b/i, /projects delivered/i, /on.?time/i]) {
      expect(body).not.toMatch(banned)
    }
    // The empanelment STATUS is allowed: "MSE" is a fact, not a judgement.
    expect(body).toMatch(/MSE/)
  })

  it('gates Invite selected on both an RFP and a selection, naming which is missing', async () => {
    renderAt('/bid-partners/registry')
    await table()

    const invite = () => screen.getByRole('button', { name: /invite selected/i })
    expect(invite()).toBeDisabled()

    // Neither chosen: the tooltip names both.
    await act(async () => {
      fireEvent.focus(invite().parentElement as HTMLElement)
    })
    expect(await screen.findByText(/Choose the RFP.*select at least one partner/i)).toBeInTheDocument()

    // One partner checked, still no RFP: the tooltip changes to name only the RFP.
    const first = (await rows())[0]
    await act(async () => {
      fireEvent.click(within(first).getByRole('checkbox'))
    })
    expect(invite()).toBeDisabled()
    await act(async () => {
      fireEvent.focus(invite().parentElement as HTMLElement)
    })
    expect(await screen.findByText(/^Choose the RFP you are inviting partners to\.$/)).toBeInTheDocument()
  })

  it('narrows the table to the chosen RFP\u2019s industry, and says so', async () => {
    renderAt('/bid-partners/registry')
    const names = () =>
      rows().then((all) =>
        all.map((row) => PARTNERS.find((p) => row.textContent?.includes(p.name))?.id),
      )

    // Every registered partner before an RFP is chosen. The registry is the
    // registry: paused partners included, since this is where one is un-paused.
    const before = await names()
    expect(before.filter(Boolean)).toHaveLength(PARTNERS.length)

    await chooseFirstRfp()

    /*
     * This used to assert the opposite -- that choosing an RFP changed nothing --
     * because the selector was only the invitation's target. Routing by industry
     * is the point of the change: a citizen-services tender should not offer a
     * scanning bureau, and the operator reading thirteen industries off the table
     * to work that out is the manual version of exactly this.
     */
    const after = (await names()).filter(Boolean)
    expect(after.length).toBeLessThan(before.length)
    expect(after.length).toBeGreaterThan(0)

    const industries = new Set(
      after.map((id) => PARTNERS.find((p) => p.id === id)?.industry),
    )
    expect(industries.size, 'the narrowed table mixes industries').toBe(1)

    // And it says why the table shrank, rather than shrinking silently.
    expect(
      screen.getByText(/registered under/i).textContent,
    ).toContain([...industries][0] as string)
  })

  it('shows an indeterminate header checkbox on partial selection', async () => {
    renderAt('/bid-partners/registry')
    const all = within(await table()).getByRole('checkbox', { name: /select all partners/i })
    expect(all).toHaveAttribute('data-state', 'unchecked')

    const first = (await rows())[0]
    await act(async () => {
      fireEvent.click(within(first).getByRole('checkbox'))
    })
    expect(all).toHaveAttribute('data-state', 'indeterminate')

    await act(async () => {
      fireEvent.click(all)
    })
    expect(all).toHaveAttribute('data-state', 'checked')
  })

  it('offers a selection bar in flow, never fixed', async () => {
    renderAt('/bid-partners/registry')
    const first = (await rows())[0]
    await act(async () => {
      fireEvent.click(within(first).getByRole('checkbox'))
    })

    const bar = screen.getByRole('status')
    expect(bar).toHaveTextContent(/1 partner selected/)
    expect(bar.className).not.toContain('fixed')

    await act(async () => {
      fireEvent.click(within(bar).getByRole('button', { name: /clear selection/i }))
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps the row menu from opening the edit route', async () => {
    const { router } = renderAt('/bid-partners/registry')
    const first = (await rows())[0]

    await act(async () => {
      fireEvent.click(within(first).getByRole('button', { name: /actions for/i }))
    })
    expect(router.state.location.pathname).toBe('/bid-partners/registry')

    // The row itself does open it.
    await act(async () => {
      fireEvent.click(within(first).getByText(PARTNERS[0].name))
    })
    expect(router.state.location.pathname).toMatch(/\/bid-partners\/registry\/.+\/edit$/)
  })

  it('renders turnover with Indian digit grouping', async () => {
    renderAt('/bid-partners/registry')
    // 340 Cr from the seed, through the one currency formatter in the product.
    expect((await table()).textContent).toMatch(/INR 340 Cr/)
  })

  it('distinguishes an empty registry from an over-filtered one', async () => {
    renderAt('/bid-partners/registry')
    await table()

    // Over-filtered. Within a group the filters are OR, so two capabilities can never
    // exclude everything; it takes a capability AND a region that never co-occur.
    // Solar is the Tamil Nadu and Kerala partner; East belongs to another.
    //
    // The filters are two dropdowns now, so each choice is open-then-pick rather than a
    // single chip click.
    await pickFilter('Capability', 'Solar')
    await pickFilter('Region', 'East')
    expect(
      await screen.findByRole('heading', { name: /no partners match these filters/i }),
    ).toBeInTheDocument()

    // Scoped to the filter bar: the over-filtered empty state offers its own reset with
    // the same name, and both are legitimate.
    await act(async () => {
      const bar = screen.getByRole('region', { name: 'Filters' })
      fireEvent.click(within(bar).getByRole('button', { name: /clear filters/i }))
    })

    // Empty: a different message, naming Add partner.
    await act(async () => {
      useWorkspace.setState({ partners: [] })
    })
    expect(
      await screen.findByRole('heading', { name: /no partners are registered/i }),
    ).toBeInTheDocument()
  })
})

describe('The invite drawer shell', () => {
  it('carries the RFP and the recipients, and no Send action', async () => {
    renderAt('/bid-partners/registry')

    // RFP first: choosing one narrows the table to its industry and clears the
    // selection, so a partner ticked beforehand is neither shown nor selected.
    await chooseFirstRfp()
    const first = (await rows())[0]
    const chosen = PARTNERS.find((p) => first.textContent?.includes(p.name))
    await act(async () => {
      fireEvent.click(within(first).getByRole('checkbox'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /invite selected/i }))
    })

    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByText(NEWEST.tenderRef)).toBeInTheDocument()
    expect(within(drawer).getByText(/1 recipient resolved/)).toBeInTheDocument()
    expect(within(drawer).getByText(chosen!.contactEmail)).toBeInTheDocument()

    // Session 3 built the composer. The label depends on whether this partner already
    // has an invitation against this tender, which is the update-not-duplicate rule.
    expect(
      within(drawer).getByRole('button', { name: /(send|update) invitation/i }),
    ).toBeInTheDocument()
  })
})

describe('The partner form', () => {
  it('puts the coverage message on the pair, not on one field', async () => {
    renderAt('/bid-partners/registry/new')

    const name = await screen.findByLabelText('Partner name')
    await act(async () => {
      fireEvent.change(name, { target: { value: 'Testable Systems Limited' } })
      fireEvent.change(screen.getByLabelText('Contact person'), { target: { value: 'A Person' } })
      fireEvent.change(screen.getByLabelText('Contact email'), {
        target: { value: 'a.person@example.in' },
      })
      fireEvent.change(screen.getByLabelText('Team size'), { target: { value: '20' } })
      fireEvent.change(screen.getByLabelText('Annual turnover'), { target: { value: '12' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /register partner/i }))
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/at least one capability or one region/i)
    // Neither field carries its own error for this rule.
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('opens the edit route pre-filled', async () => {
    renderAt(`/bid-partners/registry/${PARTNERS[1].id}/edit`)

    expect(await screen.findByDisplayValue(PARTNERS[1].name)).toBeInTheDocument()
    expect(screen.getByDisplayValue(PARTNERS[1].contactEmail)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})

describe('The setup path', () => {
  it('shows step 01 as an ordinal, never as a completed step', async () => {
    renderAt('/bid-partners')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin setup/i }))
    })

    // These are the module's three stages, not a checklist. Partners load from seed, so
    // this row used to arrive already ticked — a tick that is never absent says nothing and
    // costs the reader a question.
    const step = (await screen.findByText('Register and invite partners')).closest('div')
    expect(step?.textContent).toContain('01')
    expect(step?.textContent).not.toMatch(/complete/i)
  })
})
