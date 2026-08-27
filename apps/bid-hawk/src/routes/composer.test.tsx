import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PARTNERS } from '@/data/seed/partners'
import { TENDERS } from '@/data/seed/tenders'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { defaultDeadline, deadlineProblem, mailtoHref, composeNote } from '@/features/bidPartners/registry/inviteDraft'
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
  return { ...render(<RouterProvider router={router} future={{ v7_startTransition: true }} />), router, warn, error }
}

const table = () => screen.findByRole('table', { name: /partner registry/i }, { timeout: 4000 })
const rows = async () => within(await table()).getAllByRole('row').slice(1)

/** Radix computes an option's name from nested spans, so pick positionally. */
async function chooseRfp(index = 0) {
  const select = screen.getByRole('combobox', { name: /RFP to invite partners to/i })
  await act(async () => {
    fireEvent.keyDown(select, { key: 'ArrowDown' })
  })
  const options = await screen.findAllByRole('option')
  await act(async () => {
    fireEvent.click(options[index])
  })
}

/** Newest-discovery order, which is the order the selector lists them in. */
const ORDER = [...TENDERS].sort(
  (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
)
/** A tender nobody has been invited to, so a send is a create rather than an update. */
const CLEAN_INDEX = ORDER.findIndex(
  (t) => !PARTNER_INVITATIONS.some((row) => row.rfpId === t.id),
)

/*
 * RFP first, then the partner -- which is also the order the screen now requires.
 * Choosing an RFP narrows the table to its industry and clears the selection, so
 * a partner ticked beforehand is neither visible nor selected afterwards.
 */
async function openComposer(rowIndex = 0, rfpIndex = CLEAN_INDEX) {
  await chooseRfp(rfpIndex)
  const row = (await rows())[rowIndex]
  await act(async () => {
    fireEvent.click(within(row).getByRole('checkbox'))
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /invite selected/i }))
  })
  return screen.findByRole('dialog')
}

describe('The deadline default', () => {
  it('falls before the bid due date for every one of the fourteen tenders', () => {
    expect(TENDERS).toHaveLength(14)
    for (const tender of TENDERS) {
      const { date } = defaultDeadline(tender)
      const deadline = new Date(`${date}T23:59:59`).getTime()
      expect(deadline, `${tender.tenderRef} deadline is not before its bid date`).toBeLessThan(
        new Date(tender.bidDueAt).getTime(),
      )
      // And it is a date the composer itself accepts.
      expect(deadlineProblem(date, tender), tender.tenderRef).toBeNull()
    }
  })

  it('falls back to the midpoint when seven days would overshoot, and says so', () => {
    const soon = { ...TENDERS[0], bidDueAt: new Date(Date.now() + 4 * 86400000).toISOString() }
    const { date, shortened } = defaultDeadline(soon)
    expect(shortened).toBe(true)
    expect(new Date(`${date}T23:59:59`).getTime()).toBeLessThan(new Date(soon.bidDueAt).getTime())
  })

  it('rejects a date in the past and one at or after the bid date', () => {
    const tender = TENDERS[0]
    expect(deadlineProblem('2020-01-01', tender)).toMatch(/in the past/i)
    expect(deadlineProblem(tender.bidDueAt.slice(0, 10), tender)).toMatch(/before the bid closes/i)
    expect(deadlineProblem('', tender)).toMatch(/required/i)
  })
})

describe('The covering note and the mail escape hatch', () => {
  it('composes from the tender record, with no invented facts', () => {
    const tender = TENDERS[0]
    const note = composeNote(tender, 3, '2026-08-20')

    expect(note).toContain(tender.title)
    expect(note).toContain(tender.tenderRef)
    expect(note).toContain(tender.issuingAuthority)
    expect(note).toContain('Meridian Infratech')
    expect(note).toContain('3 partners')
    // No em dash anywhere in copy this product sends.
    expect(note).not.toContain('—')
  })

  it('builds a mailto with recipients, subject and body intact', () => {
    const tender = TENDERS[0]
    const chosen = [PARTNERS[0], PARTNERS[1]]
    const href = mailtoHref(tender, chosen, 'Dear partner,\nA note.', ['Company profile'])

    expect(href.startsWith('mailto:?')).toBe(true)
    const params = new URLSearchParams(href.slice('mailto:?'.length))
    expect(params.get('bcc')).toBe(`${chosen[0].contactEmail},${chosen[1].contactEmail}`)
    expect(params.get('subject')).toContain(tender.tenderRef)
    expect(params.get('body')).toContain('Dear partner,')
    expect(params.get('body')).toContain('- Company profile')
    // A space must not survive as '+', which a mail client shows literally.
    expect(href).not.toMatch(/\+/)
  })
})

describe('The composer in the drawer', () => {
  it('opens with recipients, a note, pre-checked documents and a deadline', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()

    expect(within(drawer).getByText(/1 recipient resolved/)).toBeInTheDocument()
    const note = within(drawer).getByLabelText(/covering note/i) as HTMLTextAreaElement
    expect(note.value).toContain('Dear partner,')
    expect(within(drawer).getByLabelText('Company profile')).toBeChecked()
    expect(within(drawer).getByLabelText(/response deadline/i)).toHaveValue()
    // A real anchor with a mailto href, so it is a link and not a button.
    const mail = within(drawer).getByRole('link', { name: /open in mail client/i })
    expect(mail.getAttribute('href')).toMatch(/^mailto:\?/)
  })

  it('disables Send with a reason when the last recipient is removed', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()

    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /remove .* from this invitation/i }))
    })

    const send = within(drawer).getByRole('button', { name: /send invitation/i })
    expect(send).toBeDisabled()
    await act(async () => {
      fireEvent.focus(send.parentElement as HTMLElement)
    })
    expect(await screen.findByText(/add at least one recipient/i)).toBeInTheDocument()
  })

  it('disables Send when every document is unchecked', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()

    const boxes = within(drawer)
      .getAllByRole('checkbox')
      .filter((box) => box.getAttribute('data-state') === 'checked')
    for (const box of boxes) {
      await act(async () => {
        fireEvent.click(box)
      })
    }

    const send = within(drawer).getByRole('button', { name: /send invitation/i })
    expect(send).toBeDisabled()
    await act(async () => {
      fireEvent.focus(send.parentElement as HTMLElement)
    })
    expect(await screen.findByText(/at least one document/i)).toBeInTheDocument()
  })

  it('requires a folder address when partners upload rather than reply', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()

    const channel = within(drawer).getByRole('combobox', { name: /how partners respond/i })
    await act(async () => {
      fireEvent.keyDown(channel, { key: 'ArrowDown' })
    })
    const options = await screen.findAllByRole('option')
    await act(async () => {
      fireEvent.click(options[1])
    })

    expect(within(drawer).getByLabelText(/folder address/i)).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: /send invitation/i })).toBeDisabled()
  })
})

describe('Sending', () => {
  it('records one invitation per recipient and never a duplicate for the same pair', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()

    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /send invitation/i }))
    })
    await screen.findByText(/on a connected workspace/i, undefined, { timeout: 4000 })

    const after = useWorkspace.getState().invitations
    const pairs = after.map((row) => `${row.rfpId}:${row.partnerId}`)
    expect(new Set(pairs).size, 'a partner and tender pair holds two records').toBe(pairs.length)
    expect(after.length).toBe(PARTNER_INVITATIONS.length + 1)
  })

  it('updates rather than duplicates when the same partner is invited twice', async () => {
    renderAt('/bid-partners/registry')

    // Send once, to a tender nobody has been invited to.
    let drawer = await openComposer()
    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /send invitation/i }))
    })
    await screen.findByText(/on a connected workspace/i, undefined, { timeout: 4000 })
    const afterFirst = useWorkspace.getState().invitations.length

    // Send again to the same partner and the same RFP.
    drawer = await openComposer()
    expect(within(drawer).getByText(/already invited to this RFP/i)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /update invitation/i }))
    })
    await screen.findByText(/invitation updated/i, undefined, { timeout: 4000 })

    expect(useWorkspace.getState().invitations).toHaveLength(afterFirst)
    const pairs = useWorkspace.getState().invitations.map((r) => `${r.rfpId}:${r.partnerId}`)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('never claims an email was sent', async () => {
    renderAt('/bid-partners/registry')
    const drawer = await openComposer()
    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /send invitation/i }))
    })

    const toast = await screen.findByText(/on a connected workspace/i, undefined, { timeout: 4000 })
    const copy = toast.parentElement?.textContent ?? ''
    expect(copy).toMatch(/recorded/i)
    expect(copy).not.toMatch(/\b(sent|emailed|delivered)\b/i)
    expect(copy).not.toMatch(/demo/i)
  })
})

describe('Registry feedback', () => {
  it('shows the seeded invited state on arrival for a seeded tender', async () => {
    renderAt('/bid-partners/registry')
    await table()

    // The RFP with seeded invitations, chosen through the selector.
    const seeded = PARTNER_INVITATIONS[0].rfpId
    await chooseRfp(ORDER.findIndex((t) => t.id === seeded))

    const marks = within(await table()).getAllByText('Invited')
    expect(marks.length).toBeGreaterThan(0)
    // And the summary stat reflects the same tender.
    const expected = PARTNER_INVITATIONS.filter((row) => row.rfpId === seeded).length
    expect(screen.getByText('Invited to this RFP').parentElement?.textContent).toContain(
      String(expected),
    )
  })

  it('shows a dash, not a zero, before an RFP is chosen', async () => {
    renderAt('/bid-partners/registry')
    await table()

    const stat = screen.getByText('Invited to this RFP').parentElement
    expect(stat?.textContent).not.toMatch(/\d/)
    expect(within(await table()).queryByText('Invited')).not.toBeInTheDocument()
  })
})

/**
 * The invited count, driven THROUGH THE UI.
 *
 * The store-level test added last session read the same source the component reads, so it
 * could only ever confirm the arithmetic. This drives the selector and the send button and
 * reads the figure off the screen, which is the only thing that can catch a broken
 * subscription, a value captured at module load, or a write that lands somewhere else.
 */
describe('The invited count, through the UI', () => {
  const figure = () => {
    const label = screen.getByText('Invited to this RFP')
    return (label.parentElement?.querySelector('p:last-of-type')?.textContent ?? '').trim()
  }

  it('shows a dash with no RFP, then the real count, then moves when an invitation is sent', async () => {
    renderAt('/bid-partners/registry')
    await table()

    // 1. No RFP chosen: a muted dash. "None invited yet" and "no RFP chosen" are different
    //    facts, and a 0 would state the first when the second is true.
    expect(figure()).toBe(EMPTY_VALUE)

    // 2. The seeded tender, which every partner has been invited to.
    const seededIndex = ORDER.findIndex((t) =>
      PARTNER_INVITATIONS.some((row) => row.rfpId === t.id),
    )
    await chooseRfp(seededIndex)
    const seeded = PARTNER_INVITATIONS.filter(
      (row) => row.rfpId === ORDER[seededIndex].id,
    ).length
    expect(seeded).toBeGreaterThan(0)
    expect(figure()).toBe(String(seeded))

    // 3. A tender nobody has been invited to reads ZERO, not a dash. This is the behaviour
    //    that reads as "frozen" in the browser: thirteen of the fourteen tenders have no
    //    invitations, so clicking through the selector shows 0 every time.
    await chooseRfp(CLEAN_INDEX)
    expect(figure()).toBe('0')

    // 4. Sending moves it, in the same render pass the toast arrives in.
    const row = (await rows())[0]
    await act(async () => {
      fireEvent.click(within(row).getByRole('checkbox'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /invite selected/i }))
    })
    const drawer = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(drawer).getByRole('button', { name: /send invitation/i }))
    })
    await screen.findByText(/on a connected workspace/i, undefined, { timeout: 4000 })

    expect(figure()).toBe('1')
  })
})
