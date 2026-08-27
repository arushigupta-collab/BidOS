import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

const SEEDED_RFP = PARTNER_INVITATIONS[0].rfpId

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  return { ...render(<RouterProvider router={router} future={{ v7_startTransition: true }} />), router, warn, error }
}

const detail = () => screen.findByLabelText('Invited partners', undefined, { timeout: 4000 })

describe('The tracker list', () => {
  it('lists only the Aaple Sarkar tender, the one RFP this build holds a document for', async () => {
    const { warn, error } = renderAt('/bid-partners/responses')
    const table = await screen.findByRole('table', { name: /response tracker/i }, { timeout: 4000 })

    // One row. Both this screen and evaluation offer "View RFP", and the build holds exactly
    // one real RFP document, so serving it from another tender's row would be a visible
    // inconsistency. The tender seed is untouched; Bid Hawk still lists all fourteen.
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(1)
    expect(bodyRows[0].textContent).toContain('MAHAIT/RTS2.0/001/2025/080')
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('has an empty state naming the registry, distinct from the per-RFP one', async () => {
    await act(async () => {
      useWorkspace.setState({ invitations: [] })
    })
    renderAt('/bid-partners/responses')

    expect(
      await screen.findByRole('heading', { name: /no RFP has been sent to partners yet/i }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to the registry/i })).toBeInTheDocument()
  })

  it('opens a tender on row click', async () => {
    const { router } = renderAt('/bid-partners/responses')
    const table = await screen.findByRole('table', { name: /response tracker/i }, { timeout: 4000 })
    const row = within(table).getAllByRole('row')[1]

    await act(async () => {
      fireEvent.click(row)
    })
    expect(router.state.location.pathname).toMatch(/^\/bid-partners\/responses\/t-/)
  })
})

describe('One tender', () => {
  it('labels the two dates so they cannot be confused', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    expect(screen.getByText('Partner response deadline')).toBeInTheDocument()
    expect(screen.getByText('Your bid due date')).toBeInTheDocument()
  })

  it('carries no upload control anywhere', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    // Nothing arrives on its own in this build, so there is nothing to upload to.
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0)
    for (const banned of [/upload/i, /drag/i, /drop/i, /choose file/i, /browse/i]) {
      expect(screen.queryByText(banned)).not.toBeInTheDocument()
    }
  })

  it('uses the destructive token for Overdue and no deadline urgency token', async () => {
    // Force one partner overdue: a past deadline with something outstanding.
    await act(async () => {
      useWorkspace.setState({
        invitations: useWorkspace.getState().invitations.map((row) =>
          row.rfpId === SEEDED_RFP ? { ...row, responseDeadline: '2020-01-01' } : row,
        ),
      })
    })
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    const list = await detail()

    expect(within(list).getAllByText('Overdue').length).toBeGreaterThan(0)
    // The urgency scale belongs to your own bid deadlines in the feed.
    expect(document.body.innerHTML).not.toMatch(/urgency-(critical|warning|normal)/)
    // And the accent means agent activity, which nothing here is.
    expect(document.body.innerHTML).not.toMatch(/text-accent|bg-accent/)
  })

  it('keeps a row expanded through a mark-received action', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    const list = await detail()

    // Expand every row, then work on one that has something outstanding: the first
    // partner alphabetically may already have sent everything.
    for (const item of within(list).getAllByRole('listitem')) {
      await act(async () => {
        fireEvent.click(within(item).getByRole('button', { expanded: false }))
      })
    }
    const first = within(list)
      .getAllByRole('listitem')
      .find((item) => within(item).queryAllByRole('button', { name: /mark received/i }).length > 0)
    expect(first, 'no partner on this tender has anything outstanding').toBeDefined()
    const row = first as HTMLElement
    const mark = within(row).getAllByRole('button', { name: /mark received/i })[0]

    await act(async () => {
      fireEvent.click(mark)
    })
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // Still open: expansion lives in the page, not in the row that re-rendered.
    expect(within(row).getByRole('button', { expanded: true })).toBeInTheDocument()
  })

  it('moves a partner to Complete when everything is in, and back when one is undone', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    const list = await detail()
    for (const item of within(list).getAllByRole('listitem')) {
      await act(async () => {
        fireEvent.click(within(item).getByRole('button', { expanded: false }))
      })
    }
    const row = within(list)
      .getAllByRole('listitem')
      .find((item) => within(item).queryAllByRole('button', { name: /mark received/i }).length > 0) as HTMLElement
    expect(row).toBeDefined()

    // Mark everything outstanding as received.
    let remaining = within(row).queryAllByRole('button', { name: /mark received/i })
    while (remaining.length > 0) {
      await act(async () => {
        fireEvent.click(remaining[0])
      })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      remaining = within(row).queryAllByRole('button', { name: /mark received/i })
    }
    expect(within(row).getByText('Complete')).toBeInTheDocument()

    // Undo one, and it is no longer complete.
    await act(async () => {
      fireEvent.click(within(row).getAllByRole('button', { name: /undo receipt of/i })[0])
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(within(row).queryByText('Complete')).not.toBeInTheDocument()
    // Seven invited partners now rather than four, each expanded and each receipt waiting on
    // the 300-900ms latency boundary, so this genuinely needs longer than the 5s default.
  }, 20000)
})

describe('Reminders', () => {
  it('disables the bulk reminder with a tooltip when nothing is outstanding', async () => {
    // Everything received on every invitation for this tender.
    await act(async () => {
      useWorkspace.setState({
        invitations: useWorkspace.getState().invitations.map((row) =>
          row.rfpId === SEEDED_RFP
            ? {
                ...row,
                documents: row.documents.map((doc) => ({
                  ...doc,
                  status: 'submitted' as const,
                  submittedAt: new Date().toISOString(),
                })),
              }
            : row,
        ),
      })
    })
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    const button = screen.getByRole('button', { name: /send reminder to all outstanding/i })
    expect(button).toBeDisabled()
    await act(async () => {
      fireEvent.focus(button.parentElement as HTMLElement)
    })
    expect(await screen.findByText(/has sent everything that was asked for/i)).toBeInTheDocument()
  })

  it('excludes Complete partners and never claims an email was sent', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    const outstanding = useWorkspace
      .getState()
      .invitations.filter(
        (row) =>
          row.rfpId === SEEDED_RFP &&
          row.documents.some((doc) => doc.status === 'not-submitted' || doc.status === 'rejected'),
      ).length

    const button = screen.getByRole('button', { name: new RegExp(`send reminder to ${outstanding} partner`, 'i') })
    expect(button).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(button)
    })
    const toast = await screen.findByText(/on a connected workspace/i, undefined, { timeout: 4000 })
    const copy = toast.parentElement?.textContent ?? ''
    expect(copy).toMatch(/recorded/i)
    expect(copy).not.toMatch(/\b(sent to|emailed|delivered)\b/i)
    expect(copy).not.toMatch(/demo/i)
  })

  it('offers View RFP where the mail escape hatch used to be, and no mailto anywhere', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    // "Open in mail client" is gone. It was the only control on this screen that left the
    // product, and it left it to compose a message the primary beside it already records.
    expect(screen.queryByRole('link', { name: /open in mail client/i })).not.toBeInTheDocument()
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^mailto:/)
    }

    // The reminder primary stays. Asserted BEFORE the viewer opens: a dialog makes
    // the page behind it inert, which is correct and means nothing there is
    // reachable while it is up.
    expect(screen.getByRole('button', { name: /send reminder to/i })).toBeInTheDocument()

    // The shared control is in its place, and opens the document without leaving
    // the tracker. It used to be an anchor with a target, which handed the file to
    // the browser -- and on most configurations that downloads rather than shows.
    fireEvent.click(screen.getByRole('button', { name: /view RFP/i }))

    const frame = await screen.findByTitle(/tender document/i)
    expect(frame.getAttribute('src')).toMatch(/aaple-sarkar-2\.0-rfp\.pdf/)
  })
})

describe('The stat strip', () => {
  const strip = () => screen.getByRole('region', { name: 'Response summary' })
  const stat = (label: string) => {
    const node = within(strip()).getByText(label)
    return (node.parentElement?.querySelector('p:last-of-type')?.textContent ?? '').trim()
  }

  it('holds exactly four figures, with no documents aggregate and no progress bar', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    const labels = within(strip())
      .getAllByText(/^[A-Z]/)
      .map((n) => n.textContent?.trim())
      .filter((t) => t && !/^\d+$/.test(t))
    expect(labels).toEqual([
      'Partners invited',
      'Process initiated',
      'Process completed',
      'Process pending',
    ])

    // The removed items are gone by name, and nothing proportional replaced them: no bar,
    // no ring, no percentage.
    for (const gone of ['Sent something', 'Fully complete', 'Documents received', 'Completeness']) {
      expect(within(strip()).queryByText(gone), gone).not.toBeInTheDocument()
    }
    expect(strip().textContent).not.toMatch(/%/)
    expect(strip().querySelector('svg')).toBeNull()
    expect(strip().querySelector('[style*="width"]')).toBeNull()
  })

  it('equals Partners invited on Process initiated, which is intended', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    // DELIBERATE DUPLICATION. With no zero-received state every invited partner has
    // something in, so the two coincide. Asserted so a later session cannot "tidy" one of
    // them away believing it redundant. See docs/decisions.md.
    expect(stat('Process initiated')).toBe(stat('Partners invited'))
    expect(Number(stat('Partners invited'))).toBe(PARTNER_INVITATIONS.length)
  })

  it('adds up: completed plus pending equals initiated', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    await detail()

    const initiated = Number(stat('Process initiated'))
    const completed = Number(stat('Process completed'))
    const pending = Number(stat('Process pending'))
    expect(completed + pending).toBe(initiated)
    expect(completed).toBeGreaterThan(0)
    expect(pending).toBeGreaterThan(0)
  })

  it('moves completed and pending when a partner’s last document arrives', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    const list = await detail()

    const before = { done: Number(stat('Process completed')), pending: Number(stat('Process pending')) }

    // Expand every row, then finish whichever partner has the fewest outstanding.
    for (const item of within(list).getAllByRole('listitem')) {
      await act(async () => {
        fireEvent.click(within(item).getByRole('button', { expanded: false }))
      })
    }
    const target = within(list)
      .getAllByRole('listitem')
      .map((item) => ({ item, marks: within(item).queryAllByRole('button', { name: /mark received/i }) }))
      .filter((row) => row.marks.length > 0)
      .sort((a, b) => a.marks.length - b.marks.length)[0]
    expect(target).toBeDefined()

    let remaining = within(target.item).queryAllByRole('button', { name: /mark received/i })
    while (remaining.length > 0) {
      await act(async () => {
        fireEvent.click(remaining[0])
      })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      remaining = within(target.item).queryAllByRole('button', { name: /mark received/i })
    }

    expect(Number(stat('Process completed'))).toBe(before.done + 1)
    expect(Number(stat('Process pending'))).toBe(before.pending - 1)
  }, 20000)
})

describe('Not started is gone as a state, not just as a label', () => {
  it('resolves every invited partner to In progress, Complete or Overdue', async () => {
    renderAt(`/bid-partners/responses/${SEEDED_RFP}`)
    const list = await detail()

    const partners = within(list).getAllByRole('listitem')
    expect(partners.length).toBe(PARTNER_INVITATIONS.length)

    const seen = new Set<string>()
    for (const item of partners) {
      const text = item.textContent ?? ''
      expect(text, 'a partner still reads Not started').not.toMatch(/not started/i)
      for (const status of ['In progress', 'Complete', 'Overdue']) {
        if (text.includes(status)) seen.add(status)
      }
    }

    // All three present, so the screen shows the full range the two states plus the modifier
    // can express rather than seven rows saying the same thing.
    expect([...seen].sort()).toEqual(['Complete', 'In progress', 'Overdue'])
  })

  it('derives no third state anywhere in the union or the copy', () => {
    const model = readFileSync('src/features/bidPartners/responses/responsesModel.ts', 'utf8')
    const badge = readFileSync('src/features/bidPartners/responses/ResponseStatusBadge.tsx', 'utf8')
    for (const source of [model, badge]) {
      expect(source).not.toMatch(/not-started/)
      expect(source).not.toMatch(/Not started/)
    }
    // The union itself is three members, one of which is a modifier on the first.
    expect(model).toMatch(/ResponseStatus =\s*'in-progress' \| 'complete' \| 'overdue'/)
  })
})

describe('The setup path', () => {
  it('shows step 02 as an ordinal even with invitations in the store', async () => {
    renderAt('/bid-partners')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin setup/i }))
    })

    const step = (await screen.findByText('Track their responses')).closest('div')
    expect(step?.textContent).toContain('02')
    expect(step?.textContent).not.toMatch(/complete/i)
  })
})
