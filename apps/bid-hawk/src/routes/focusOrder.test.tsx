import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PEOPLE } from '@/data/seed/people'
import { SOURCES } from '@/data/seed/sources'
import { TENDERS } from '@/data/seed/tenders'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'
import { MODULES } from '@/features/platform/modules'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** aria-label, else the label bound to it, else its own text. */
function accessibleName(node: HTMLElement): string {
  const aria = node.getAttribute('aria-label')
  if (aria) return aria.trim()
  const bound = node.id
    ? document.querySelector<HTMLElement>(`label[for="${node.id}"]`)?.textContent
    : null
  if (bound) return bound.trim()
  return (node.textContent ?? '').trim()
}

/**
 * Reading order as a browser would compute it: skipping inert subtrees, anything
 * hidden from the tree, and disabled controls.
 */
function tabOrder(root: HTMLElement = document.body) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((node) => !node.closest('[inert]') && !node.closest('[aria-hidden="true"]'))
    .map(accessibleName)
}

async function openAddForm() {
  const router = createMemoryRouter(ROUTES, {
    initialEntries: ['/sources/new'],
    future: ROUTER_FUTURE,
  })
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /add new source/i }))
  })
  await screen.findByRole('combobox', { name: 'Platform' })
}

describe('Focus order, add source form', () => {
  it('reads down the form and reaches the password reveal in place', async () => {
    await openAddForm()

    const form = screen.getByLabelText('Password').closest('div[class*="bg-surface-sunken"]')
    const order = tabOrder(form as HTMLElement)

    expect(order).toEqual([
      'Platform',
      'Listing URL',
      'Registered ID',
      'Password',
      // The reveal sits with the field it belongs to, after its input.
      'Show password',
      'Keywords',
      // Straight from the input to the suggestion trigger: the field holds one
      // icon button, not two.
      'Show suggested keywords',
    ])
  })

  it('keeps focus in the keyword input while its list is open', async () => {
    await openAddForm()

    const keywords = screen.getByLabelText('Keywords')
    await act(async () => {
      keywords.focus()
      fireEvent.keyDown(keywords, { key: 'ArrowDown' })
    })

    // Radix would move focus into the popover by default; it is prevented so
    // typing keeps filtering, and the active option is reported instead.
    expect(await screen.findByRole('listbox', { name: 'Suggested keywords' })).toBeInTheDocument()
    expect(screen.getByLabelText('Keywords')).toHaveFocus()

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'ArrowDown' })
    })
    const active = screen.getByLabelText('Keywords').getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active as string)).toHaveAttribute('aria-selected', 'true')
  })

  it('closes the list on Escape without leaving the field or the screen', async () => {
    await openAddForm()

    const keywords = screen.getByLabelText('Keywords')
    await act(async () => {
      keywords.focus()
      fireEvent.keyDown(keywords, { key: 'ArrowDown' })
    })
    expect(screen.getByLabelText('Keywords')).toHaveAttribute('aria-expanded', 'true')

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Escape' })
    })

    expect(screen.getByLabelText('Keywords')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText('Keywords')).toHaveFocus()
    // Still on the form: Escape closed the list, not the screen.
    expect(screen.getByRole('combobox', { name: 'Platform' })).toBeInTheDocument()
  })
})

/** Sources, people and RFPs all present, so the feed is past its gate. */
function withEverything() {
  useWorkspace.setState({
    sources: SOURCES.map((row) => ({ ...row })),
    people: PEOPLE.map((row) => ({ ...row })),
    tenders: TENDERS.map((row) => ({ ...row })),
    sourcesRevealed: true,
    peopleRevealed: true,
  })
}

async function renderAt(path: string) {
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return router
}

describe('Focus order, setup path with the feed reachable', () => {
  it('reads down the two steps, then the feed, then back', async () => {
    withEverything()
    await renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /set up sourcing/i }, { timeout: 4000 }))
    })
    await screen.findByRole('button', { name: /manage sources/i })

    const order = tabOrder()
    const step1 = order.indexOf('Manage sources')
    const step2 = order.indexOf('Manage people')
    const feed = order.indexOf('Open the RFP feed')
    const back = order.indexOf('Back')

    expect(step1).toBeGreaterThanOrEqual(0)
    expect(step2).toBeGreaterThan(step1)
    expect(feed).toBeGreaterThan(step2)
    expect(back).toBeGreaterThan(feed)
  })
})

describe('Focus order, RFP summary', () => {
  it('reads header, then the sections, then the pager, with no dead control', async () => {
    withEverything()
    await renderAt('/feed/t-mahait-rts2')

    await screen.findByRole('button', { name: /view RFP/i }, { timeout: 4000 })

    const order = tabOrder()
    const view = order.indexOf('View RFP')
    // Reassignment is a list of alternates now, each with its own Assign, rather
    // than one select. The first of them stands where the select did. Each button
    // is named for the person it hands the bid to, so the label carries a name.
    const assign = order.findIndex((name) => name.startsWith('Assign to '))
    const next = order.indexOf('Next')

    expect(view).toBeGreaterThanOrEqual(0)
    expect(assign).toBeGreaterThan(view)
    expect(next).toBeGreaterThan(assign)
    // The Documents section is gone, so no Open control is in the sequence.
    expect(order).not.toContain('Open')
  })
})

describe('Focus order, feed rows', () => {
  it('puts nothing focusable inside a row, so the row itself is the target', async () => {
    withEverything()
    await renderAt('/feed')

    const table = await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })
    const body = table.querySelectorAll('tbody tr')

    // The assignee cell used to carry an "Add a bid manager" link, which competed
    // with the row's own Enter handler.
    for (const row of body) {
      expect(row.querySelectorAll('a[href]')).toHaveLength(0)
    }
    expect(body.length).toBe(TENDERS.length)
  })
})

describe('Focus order, the two home affordances', () => {
  it('puts the logo link first, then the nav, then the page', async () => {
    withEverything()
    await renderAt('/feed')

    await screen.findByRole('table', { name: /RFP feed/i }, { timeout: 4000 })

    const order = tabOrder()
    // The shell's chrome comes before the workspace, which is the reading order:
    // brand, then where you can go, then what is on the page.
    expect(order[0]).toBe('BidOS home')
    expect(order[1]).toBe('BidOS')

    // Then the destinations, which are now the two things Bid Hawk is for. The
    // nav labels carry their record count, so match on the prefix.
    const feed = order.findIndex((name) => name.startsWith('RFP feed'))
    expect(feed).toBeGreaterThan(order.indexOf('BidOS'))
    expect(order.findIndex((name) => name.startsWith('Sources'))).toBe(-1)
  })

  it('leaves neither in the sequence on the platform page', async () => {
    await renderAt('/')

    const order = tabOrder()
    expect(order).not.toContain('BidOS home')
    // The first thing reachable is a module, not chrome.
    expect(order[0]).toBe('Try now')
    expect(order.filter((name) => name === 'Try now')).toHaveLength(MODULES.length)
  })

  it('reads down State A in the order the actions are weighted', async () => {
    await renderAt('/bid-hawk')

    await screen.findByRole('button', { name: /set up sourcing/i }, { timeout: 4000 })

    const order = tabOrder()
    expect(order[0]).toBe('BidOS home')
    // Nothing in the flow band is focusable: it is prose, not controls.
    expect(order.filter((n) => /Sourcing|Summarisation|Assignation/.test(n))).toHaveLength(0)
    /**
     * Three ways on, in descending order of how often they are wanted: read a
     * tender, look at what has already been read, configure where listings come
     * from. The filled primary leads, so the reading order matches the visual
     * weight rather than contradicting it.
     */
    expect(order.slice(-3)).toEqual([
      'Read a tender',
      'View the RFP feed',
      'Set up sourcing',
    ])
  })
})
