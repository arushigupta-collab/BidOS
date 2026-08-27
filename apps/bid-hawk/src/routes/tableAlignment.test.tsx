import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PEOPLE } from '@/data/seed/people'
import { SOURCES } from '@/data/seed/sources'
import { TENDERS } from '@/data/seed/tenders'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

/**
 * Guards header-to-cell correspondence in both tables.
 *
 * Every body row carries a leading accent cell. When the header row did not
 * declare that column, the two ran on different column counts and every value
 * rendered one column right of its heading: on People the email sat under DOMAIN
 * EXPERTISE, the domain chips under REGIONAL EXPERTISE, the region under ADDED.
 * These tests fail if that ever comes back.
 */

beforeEach(() => {
  useWorkspace.setState({
    sources: SOURCES.map((source) => ({ ...source })),
    people: PEOPLE.map((person) => ({ ...person })),
    tenders: TENDERS.map((tender) => ({ ...tender })),
    sessionSources: [],
    sessionPeople: [],
    sourcesRevealed: true,
    peopleRevealed: true,
  })
})

function renderAt(path: string) {
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
}

/** The responsive visibility classes on a cell, which decide its breakpoints. */
function breakpointClasses(cell: Element): string[] {
  return Array.from(cell.classList)
    .filter((name) => name === 'hidden' || name.endsWith(':table-cell'))
    .sort()
}

interface Grid {
  headers: Element[]
  firstRow: Element[]
  /** Text of the body cell sitting under the named heading. */
  under: (heading: string) => string
}

async function grid(tableName: RegExp | string): Promise<Grid> {
  const table = await screen.findByRole('table', { name: tableName }, { timeout: 4000 })
  const rows = within(table).getAllByRole('row')
  const headers = Array.from(rows[0].children)
  const firstRow = Array.from(rows[1].children)

  return {
    headers,
    firstRow,
    under: (heading) => {
      const index = headers.findIndex(
        (cell) => (cell.textContent ?? '').trim().toLowerCase().startsWith(heading.toLowerCase()),
      )
      expect(index, `no heading starting with "${heading}"`).toBeGreaterThanOrEqual(0)
      return (firstRow[index]?.textContent ?? '').trim()
    },
  }
}

describe('Sources table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/sources')
    const { headers, firstRow } = await grid(/sources/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/sources')
    const { under } = await grid(/sources/i)

    expect(under('Platform')).toMatch(/Systems integration/)
    expect(under('Listing URL')).toMatch(/^https:\/\//)
    expect(under('Registered ID')).toMatch(/^GEM-SLR-/)
    expect(under('Keywords')).toMatch(/system integrator/)
    expect(under('Status')).toBe('Active')
    expect(under('Added')).toMatch(/ago$/)
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/sources')
    const { headers, firstRow } = await grid(/sources/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('Feed table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/feed')
    const { headers, firstRow } = await grid(/RFP feed/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/feed')
    const { under } = await grid(/RFP feed/i)

    // Sorted deadline ascending, so the first row is whatever closes soonest.
    expect(under('Tender')).toMatch(/[A-Z]/)
    expect(under('Source')).toMatch(/GeM|CPPP|IREPS|MahaTenders|State portal/)
    expect(under('Bid value')).toMatch(/^INR /)
    expect(under('Deadline')).toMatch(/\d/)
    expect(under('Matched keywords')).not.toBe('')
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/feed')
    const { headers, firstRow } = await grid(/RFP feed/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('People table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/team')
    const { headers, firstRow } = await grid(/people/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/team')
    const { under } = await grid(/people/i)

    expect(under('Name')).toMatch(/Anand Raghunathan/)
    expect(under('Email')).toBe('anand.raghunathan@meridianinfratech.in')
    expect(under('Domain expertise')).toMatch(/Telecom/)
    expect(under('Regional expertise')).toMatch(/North/)
    expect(under('Added')).toMatch(/ago$/)
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/team')
    const { headers, firstRow } = await grid(/people/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('Partner registry table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/bid-partners/registry')
    const { headers, firstRow } = await grid(/partner registry/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/bid-partners/registry')
    const { under } = await grid(/partner registry/i)

    expect(under('Partner')).toMatch(/[A-Z]/)
    expect(under('Team size')).toMatch(/^\d+$/)
    expect(under('Turnover')).toMatch(/^INR /)
    expect(under('Added')).toMatch(/ago$/)
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/bid-partners/registry')
    const { headers, firstRow } = await grid(/partner registry/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('Response tracker table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/bid-partners/responses')
    const { headers, firstRow } = await grid(/response tracker/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/bid-partners/responses')
    const { under } = await grid(/response tracker/i)

    expect(under('Tender')).toMatch(/[A-Z]/)
    expect(under('Partners invited')).toMatch(/^\d+$/)
    // "Responses in" counts PARTNERS, not documents, and survives.
    expect(under('Responses in')).toMatch(/^\d+ of \d+$/)
    expect(under('Response deadline')).toMatch(/[A-Za-z]/)
    expect(under('Status')).toMatch(/In progress|Complete|Overdue/)
  })

  it('carries five columns, with no document aggregate and no completeness bar', async () => {
    renderAt('/bid-partners/responses')
    const { headers } = await grid(/response tracker/i)

    // The leading accent spacer plus five headings plus the actions cell.
    const labels = headers
      .map((cell) => (cell.textContent ?? '').replace(/, sort by this column/, '').trim())
      .filter(Boolean)
    expect(labels).toEqual([
      'Tender',
      'Partners invited',
      'Responses in',
      'Response deadline',
      'Status',
    ])

    const table = await screen.findByRole('table', { name: /response tracker/i })
    expect(table.textContent).not.toMatch(/%/)
    expect(table.querySelector('[style*="width"]')).toBeNull()
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/bid-partners/responses')
    const { headers, firstRow } = await grid(/response tracker/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('Evaluation list table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/bid-partners/evaluation')
    const { headers, firstRow } = await grid(/partner evaluation/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/bid-partners/evaluation')
    const { under } = await grid(/partner evaluation/i)

    expect(under('Tender')).toMatch(/[A-Z]/)
    expect(under('Responded')).toMatch(/^\d+ of \d+$/)
    expect(under('Quotes received')).toMatch(/^\d+$/)
    expect(under('Lowest quote')).toMatch(/^(INR |—)/)
    expect(under('Highest quote')).toMatch(/^(INR |—)/)
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/bid-partners/evaluation')
    const { headers, firstRow } = await grid(/partner evaluation/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})

describe('Ranked comparison table alignment', () => {
  it('gives the header row the same column count as a body row', async () => {
    renderAt('/bid-partners/evaluation/t-mahait-rts2')
    const { headers, firstRow } = await grid(/ranked comparison/i)

    expect(headers).toHaveLength(firstRow.length)
  })

  it('puts every value under its own heading', async () => {
    renderAt('/bid-partners/evaluation/t-mahait-rts2')
    const { under } = await grid(/ranked comparison/i)

    expect(under('Rank')).toBe('1')
    expect(under('Select')).toBe('Select')
    expect(under('Partner')).toMatch(/[A-Z]/)
    // Each sub-score is a number with the figure it came from beneath it.
    expect(under('Capability fit')).toMatch(/^\d+/)
    expect(under('Commercials')).toMatch(/^\d+/)
    expect(under('Delivery history')).toMatch(/^\d+/)
    expect(under('Documentation')).toMatch(/^\d+/)
    expect(under('Composite')).toMatch(/^\d+(\.\d)?$/)
    expect(under('Quoted value')).toMatch(/^(INR |—)/)
  })

  it('hides each column at the same breakpoint in the header and the body', async () => {
    renderAt('/bid-partners/evaluation/t-mahait-rts2')
    const { headers, firstRow } = await grid(/ranked comparison/i)

    headers.forEach((header, index) => {
      expect(breakpointClasses(firstRow[index]), `column ${index}`).toEqual(
        breakpointClasses(header),
      )
    })
  })
})
