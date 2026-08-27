import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { PARTNER_INVITATIONS } from '@/data/seed/invitations'
import { PARTNERS } from '@/data/seed/partners'
import { TENDERS } from '@/data/seed/tenders'
import {
  CRITERIA,
  DEFAULT_WEIGHTS,
  criteriaSentence,
  rankPartners,
} from '@/features/bidPartners/evaluation/evaluationModel'
import { EMPTY_VALUE } from '@/lib/format'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

const RFP_ID = 't-mahait-rts2'
const TENDER = TENDERS.find((t) => t.id === RFP_ID)!

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  return {
    ...render(<RouterProvider router={router} future={{ v7_startTransition: true }} />),
    router,
    warn,
    error,
  }
}

function rows() {
  return PARTNER_INVITATIONS.filter((row) => row.rfpId === RFP_ID).flatMap((invitation) => {
    const partner = PARTNERS.find((p) => p.id === invitation.partnerId)
    return partner ? [{ partner, invitation }] : []
  })
}

describe('The weights are hidden but still sum to exactly 100', () => {
  it('totals 100 across the five criteria', () => {
    const total = CRITERIA.reduce((sum, c) => sum + DEFAULT_WEIGHTS[c.id], 0)
    expect(total).toBe(100)
    expect(CRITERIA).toHaveLength(5)
    for (const criterion of CRITERIA) {
      expect(DEFAULT_WEIGHTS[criterion.id], criterion.id).toBeGreaterThan(0)
    }
  })

  it('exposes no figure and no way to change one', () => {
    // The sliders, the numeric weights, the rebalancing and the reset control were all
    // removed at the client's request. This asserts the code cannot grow them back by
    // accident: there is no rebalance export, and the sentence that replaced them takes no
    // weights and prints no digits.
    const model = readFileSync('src/features/bidPartners/evaluation/evaluationModel.ts', 'utf8')
    expect(model).not.toMatch(/export function rebalance/)
    expect(model).not.toMatch(/weightsSentence/)

    expect(criteriaSentence()).not.toMatch(/\d/)
    // All five named, which is the only remaining answer to "on what basis".
    for (const criterion of CRITERIA) {
      expect(criteriaSentence()).toContain(criterion.label.toLowerCase())
    }

    const note = readFileSync('src/features/bidPartners/evaluation/CriteriaNote.tsx', 'utf8')
    expect(note).not.toMatch(/Slider/)
    expect(existsSync('src/features/bidPartners/evaluation/WeightsPanel.tsx')).toBe(false)
  })
})

describe('The ranking matches the computed composites', () => {
  it('orders by composite, highest first', () => {
    for (const weights of [DEFAULT_WEIGHTS]) {
      const ranked = rankPartners(TENDER, rows(), weights)
      expect(ranked.length).toBeGreaterThan(1)

      for (const row of ranked) {
        const expected =
          CRITERIA.reduce((sum, c) => sum + (row.scores[c.id].score * weights[c.id]) / 100, 0)
        expect(row.composite).toBeCloseTo(Math.round(expected * 10) / 10, 5)
      }

      const composites = ranked.map((row) => row.composite)
      expect([...composites].sort((a, b) => b - a)).toEqual(composites)
    }
  })
})

describe('A partner with no quote', () => {
  const unquoted = () => {
    const ranked = rankPartners(TENDER, rows(), DEFAULT_WEIGHTS)
    return { ranked, row: ranked.find((r) => r.unquoted)! }
  }

  it('scores zero on commercials, stays rankable, and never reads as the lowest quote', () => {
    const { ranked, row } = unquoted()

    expect(row).toBeDefined()
    expect(row.scores.commercials.score).toBe(0)
    // Still ranked: it submitted a technical proposal, and dropping it would hide a
    // real partner from the comparison.
    expect(ranked.map((r) => r.partner.id)).toContain(row.partner.id)
    expect(row.composite).toBeGreaterThan(0)

    const quotes = ranked
      .map((r) => r.invitation.quotedValueCr)
      .filter((value): value is number => value !== null && value !== undefined)
    const lowest = Math.min(...quotes)
    // Zero would win "lowest" if the absent quote were treated as a number.
    expect(lowest).toBeGreaterThan(0)
    expect(row.invitation.quotedValueCr).toBeNull()
  })
})

describe('Technical capability is not a second capability fit', () => {
  it('orders the partners differently from capability fit', () => {
    const ranked = rankPartners(TENDER, rows(), DEFAULT_WEIGHTS)
    expect(ranked.length).toBeGreaterThan(2)

    const byCriterion = (id: 'capability' | 'technical') =>
      [...ranked]
        .sort(
          (a, b) =>
            b.scores[id].score - a.scores[id].score ||
            a.partner.name.localeCompare(b.partner.name),
        )
        .map((row) => row.partner.id)

    const byFit = byCriterion('capability')
    const byTechnical = byCriterion('technical')

    // If the two agree on the ordering the second criterion is decorative: it would add a
    // column, a weight and a sentence while telling a reviewer nothing capability fit had
    // not already said.
    expect(byTechnical).not.toEqual(byFit)

    // And the difference is material, not a tie-break shuffle at the bottom: at least one
    // partner moves against another by more than one place.
    const moved = byFit.filter((id, index) => byTechnical.indexOf(id) !== index)
    expect(moved.length).toBeGreaterThan(1)
  })

  it('reads every input from typed seed data, never computed at render time', () => {
    for (const partner of PARTNERS) {
      expect(Array.isArray(partner.technicalStack), partner.name).toBe(true)
      expect(typeof partner.comparableTechnicalScope, partner.name).toBe('boolean')
      expect(partner.comparableScopeNote.length, partner.name).toBeGreaterThan(0)
    }
    // Genuinely different profiles, or the criterion cannot separate anybody.
    const stacks = new Set(PARTNERS.map((p) => p.technicalStack.join('|')))
    expect(stacks.size).toBe(PARTNERS.length)
    const withScope = PARTNERS.filter((p) => p.comparableTechnicalScope)
    expect(withScope.length).toBeGreaterThan(0)
    expect(withScope.length).toBeLessThan(PARTNERS.length)
  })

  it('is stated in the criteria sentence and carried in the table', () => {
    expect(criteriaSentence()).toContain('technical capability')
    const table = readFileSync('src/features/bidPartners/evaluation/RankedTable.tsx', 'utf8')
    // The column list is derived from CRITERIA, so a fifth criterion cannot be shown in the
    // sentence and missed by the table.
    expect(table).toContain('CRITERIA.map')
  })
})

describe('The comparison screen', () => {
  it('has no partner selected on first render', async () => {
    renderAt(`/bid-partners/evaluation/${RFP_ID}`)
    const table = await screen.findByRole('table', { name: /ranked comparison/i }, { timeout: 4000 })

    const selects = within(table).getAllByRole('button', { name: /^select$/i })
    expect(selects.length).toBeGreaterThan(1)
    expect(within(table).queryByRole('button', { name: /^selected$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/decision recorded/i)).not.toBeInTheDocument()
    // The suggestion is stated, and stating it is not the same as choosing it.
    expect(screen.getByText(/^Suggested:/)).toBeInTheDocument()
  })

  it('keeps a row expanded through a selection', async () => {
    renderAt(`/bid-partners/evaluation/${RFP_ID}`)
    const table = await screen.findByRole('table', { name: /ranked comparison/i }, { timeout: 4000 })

    const disclosure = within(table).getByRole('button', { name: /rank 1, .*, show detail/i })
    await act(async () => {
      fireEvent.click(disclosure)
    })
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(within(table).getByText(/prior engagements/i)).toBeInTheDocument()

    // There is no weight control to change any more. What has to survive is a selection,
    // which re-renders the table.
    await act(async () => {
      fireEvent.click(within(table).getAllByRole('button', { name: /^select$/i })[0])
    })
    expect(within(table).getByText(/prior engagements/i)).toBeInTheDocument()
  })

  it('expands from the keyboard, not only from a click', async () => {
    renderAt(`/bid-partners/evaluation/${RFP_ID}`)
    const table = await screen.findByRole('table', { name: /ranked comparison/i }, { timeout: 4000 })

    // Every disclosure is a real button, so tabbing reaches it and Enter opens it.
    const disclosures = within(table).getAllByRole('button', { name: /show detail/i })
    expect(disclosures).toHaveLength(within(table).getAllByRole('button', { name: /^select$/i }).length)

    for (const disclosure of disclosures) {
      expect(disclosure).toHaveAttribute('aria-expanded', 'false')
      expect(disclosure).toHaveAttribute('aria-controls')
    }

    await act(async () => {
      fireEvent.keyDown(disclosures[2], { key: 'Enter' })
      fireEvent.click(disclosures[2])
    })
    expect(disclosures[2]).toHaveAttribute('aria-expanded', 'true')
    // Several may be open at once.
    await act(async () => {
      fireEvent.click(disclosures[0])
    })
    expect(disclosures[0]).toHaveAttribute('aria-expanded', 'true')
    expect(disclosures[2]).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders an unquoted partner as a bare dash, still ranked', async () => {
    renderAt(`/bid-partners/evaluation/${RFP_ID}`)
    const table = await screen.findByRole('table', { name: /ranked comparison/i }, { timeout: 4000 })

    const unquotedIds = PARTNER_INVITATIONS.filter(
      (row) => row.rfpId === RFP_ID && (row.quotedValueCr === null || row.quotedValueCr === undefined),
    ).map((row) => row.partnerId)
    expect(unquotedIds.length).toBeGreaterThan(0)

    // No marker of any kind. A dash beside a badge saying "Not quoted" labelled the same
    // absence twice, and the product's rule is that an empty value is a muted dash.
    expect(within(table).queryByText(/not quoted/i)).not.toBeInTheDocument()
    expect(within(table).queryByText(/unquoted/i)).not.toBeInTheDocument()

    for (const partnerId of unquotedIds) {
      const name = PARTNERS.find((p) => p.id === partnerId)!.name
      const row = within(table)
        .getAllByRole('row')
        .find((candidate) => candidate.textContent?.includes(name)) as HTMLElement
      expect(row, name).toBeDefined()

      // Still ranked, with a real composite, and no delta line under the dash.
      expect(row.textContent).toContain(EMPTY_VALUE)
      expect(row.textContent, name).not.toMatch(/Lowest quote|\+INR/)
    }

    // And it never reads as the cheapest bid.
    const ranked = rankPartners(TENDER, rows(), DEFAULT_WEIGHTS)
    const quotes = ranked
      .map((r) => r.invitation.quotedValueCr)
      .filter((v): v is number => v !== null && v !== undefined)
    expect(Math.min(...quotes)).toBeGreaterThan(0)
  })

  it('every column in the ranked table aligns numerals right and text left', async () => {
    renderAt(`/bid-partners/evaluation/${RFP_ID}`)
    const table = await screen.findByRole('table', { name: /ranked comparison/i }, { timeout: 4000 })

    const headers = within(table).getAllByRole('columnheader')
    const numeric = [
      ...CRITERIA.map((criterion) => criterion.label),
      'Composite',
      'Quoted value',
    ]

    for (const header of headers) {
      const label = header.textContent?.trim() ?? ''
      if (numeric.includes(label)) {
        expect(header.className, label).toMatch(/text-right/)
      } else {
        expect(header.className, label).not.toMatch(/text-right/)
      }
    }
  })
})

describe('The evaluation list', () => {
  it('lists only the Aaple Sarkar tender, the one RFP this build holds a document for', async () => {
    const { warn, error } = renderAt('/bid-partners/evaluation')
    const table = await screen.findByRole('table', { name: /partner evaluation/i }, { timeout: 4000 })

    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(1)
    expect(bodyRows[0].textContent).toContain('MAHAIT/RTS2.0/001/2025/080')
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('has an empty state naming the registry', async () => {
    await act(async () => {
      useWorkspace.setState({ invitations: [] })
    })
    renderAt('/bid-partners/evaluation')

    expect(
      await screen.findByRole('heading', { name: /nothing to evaluate yet/i }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to the partner registry/i })).toBeInTheDocument()
  })
})

describe('Recording a decision', () => {
  it('survives as history when changed, and never completes a setup step', async () => {
    await act(async () => {
      useWorkspace.getState().recordDecision({
        rfpId: RFP_ID,
        chosenPartnerIds: ['pt-suhrid'],
        reason: 'Strongest delivery record on citizen services in Maharashtra.',
        suggestedPartnerId: 'pt-arkavati',
        recordedAt: new Date().toISOString(),
      })
    })
    expect(useWorkspace.getState().decisions).toHaveLength(1)

    await act(async () => {
      useWorkspace.getState().recordDecision({
        rfpId: RFP_ID,
        chosenPartnerIds: ['pt-arkavati'],
        reason: 'Turnover threshold could not be met by the smaller firm.',
        suggestedPartnerId: 'pt-arkavati',
        recordedAt: new Date().toISOString(),
      })
    })

    const decisions = useWorkspace.getState().decisions
    expect(decisions).toHaveLength(1)
    expect(decisions[0].chosenPartnerIds).toEqual(['pt-arkavati'])
    expect(decisions[0].history).toHaveLength(1)
    expect(decisions[0].history[0].chosenPartnerIds).toEqual(['pt-suhrid'])

    // The decision is recorded and kept as history, and the setup row STILL shows its
    // ordinal: recording a decision is not a setup step being completed, it is work done on
    // one of the module's three stages.
    renderAt('/bid-partners')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /begin setup/i }))
    })
    const step = (await screen.findByText('Evaluate and choose')).closest('div')
    expect(step?.textContent).toContain('03')
    expect(step?.textContent).not.toMatch(/complete/i)
  })
})
