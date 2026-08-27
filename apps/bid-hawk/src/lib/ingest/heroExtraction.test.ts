/**
 * @vitest-environment node
 *
 * PHASE 1 GATE. Does extraction still agree with the document?
 *
 * CLAUDE.md carries a hero seed record that was verified by hand, line by line,
 * against the 262-page source RFP. That record is the ground truth here, and this
 * file is what stops a prompt edit or a page-index change from quietly degrading
 * extraction until somebody notices on stage.
 *
 * It asserts against a COMMITTED FIXTURE, never a live model call: a test that
 * costs half a dollar and takes six minutes would be run once and then disabled.
 * To exercise the real pipeline:
 *
 *     npm run ingest -- --fresh
 *     npx tsx scripts/promote-fixture.ts
 *     npx vitest run heroExtraction
 *
 * Values are matched on substance rather than on exact wording. The model phrases
 * the same fact differently between runs, and asserting on its prose would fail
 * for reasons that have nothing to do with correctness. What must not drift is
 * the figure, the instrument and the page.
 */
import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPdf } from './loadPdf'
import { shiftTenderDates } from './dates'
import fixture from './__fixtures__/hero-extraction.json'
import type { Page } from './pageIndex'

interface Cited { value: string | null; page_no: number | null; quote: string | null; confidence: number }
const terms = fixture.extract as unknown as Record<string, Cited> & {
  est_value_is_inferred: boolean
  consortium_allowed: boolean | null
  industry: string
  region: string
}
const eligibility = (fixture.eligibility as { rows: { criterion: string; status: string; note: string; page_no: number | null }[] }).rows
const risks = (fixture.risks as { flags: { title: string; severity: string; detail: string; page_no: number | null }[] }).flags
const packages = (fixture.workpackages as { packages: { role_id: string; action_items: unknown[]; forms: unknown[] }[] }).packages

let pages: Page[]
beforeAll(async () => {
  pages = (await loadPdf(new Uint8Array(await readFile('public/rfp/aaple-sarkar-2.0-rfp.pdf')))).pages
}, 60_000)

/** Normalised for comparison: the PDF's spacing is not stable across extractions. */
const flat = (s: string) => s.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().toLowerCase()

describe('the commercial terms match the hand-verified record', () => {
  it('reads the tender reference exactly', () => {
    expect(terms.tender_ref.value).toContain('MAHAIT/RTS2.0/001/2025/080')
  })

  it('names MahaIT as the issuing authority', () => {
    expect(terms.issuing_authority.value).toMatch(/Maharashtra Information Technology Corporation/i)
  })

  /**
   * The document states this twice: once as a named method on page 45 ("Quality
   * and Cost Based Selection"), and once as the operative formula on page 46
   * ("Bn = 0.70 * Tn + 0.30* Fn"). Extraction legitimately lands on either, and
   * an earlier version of this test demanded the acronym and failed on the run
   * that returned the formula -- the better of the two answers.
   *
   * What must not drift is the weighting. That is the fact a bid manager acts on.
   */
  it('reads the 70:30 weighting, however the document phrases it', () => {
    const v = terms.selection_method.value ?? ''
    expect(v).toMatch(/0\.70|70\s*%|70:30/)
    expect(v).toMatch(/0\.30|30\s*%/)
    expect(v).toMatch(/QCBS|Quality and Cost|composite|Bn\s*=/i)
  })

  it('reads the INR 25,000 tender fee', () => {
    expect(terms.tender_fee.value).toMatch(/25,000/)
  })

  it('reads the INR 1,00,00,000 EMD and that it is a bank guarantee', () => {
    expect(terms.emd.value).toMatch(/1,00,00,000|One Crore/i)
    expect(terms.emd.value).toMatch(/bank guarantee/i)
  })

  it('reads the 180-day bid validity', () => {
    expect(terms.bid_validity.value).toMatch(/180/)
  })

  it('reads the 45-month term and its 9 + 36 split', () => {
    const v = terms.contract_term.value ?? ''
    expect(v).toMatch(/45|forty[ -]five/i)
    expect(v).toMatch(/nine|\b9\b/i)
    expect(v).toMatch(/thirty[ -]six|\b36\b/i)
  })

  it('reads the 10% PBG, its issuer and its post-O&M validity', () => {
    const v = terms.pbg.value ?? ''
    expect(v).toMatch(/10\s*%|ten \(10\)\s*%/i)
    expect(v).toMatch(/nationali[sz]ed|scheduled commercial/i)
    expect(v).toMatch(/180/)
  })

  it('records that consortia are barred', () => {
    expect(terms.consortium_allowed).toBe(false)
  })

  it('routes as e-Governance in Maharashtra, which is what reaches a bid manager', () => {
    expect(terms.industry).toMatch(/e-?Governance|Citizen/i)
    expect(terms.region).toMatch(/Maharashtra/i)
  })
})

describe('the anti-hallucination contract', () => {
  /**
   * The single most important assertion in this file.
   *
   * CLAUDE.md records the estimated value as INFERRED, not published: the RFP
   * does not state one. A model that returns a confident figure here has invented
   * it, and every other number it returned becomes untrustworthy by association.
   */
  it('returns no estimated value, because the document publishes none', () => {
    expect(terms.est_value.value).toBeNull()
    expect(terms.est_value_is_inferred).toBe(false)
  })

  it('pairs every value it did find with a page and a quote', () => {
    for (const [key, v] of Object.entries(terms)) {
      if (typeof v !== 'object' || v === null || !('value' in v)) continue
      if (v.value === null) {
        expect(v.page_no, `${key} has no value but cites a page`).toBeNull()
        continue
      }
      expect(v.page_no, `${key} has a value but no page`).toBeGreaterThan(0)
      expect(v.quote, `${key} has a value but no quote`).toBeTruthy()
    }
  })

  /**
   * Verifies the citations are real rather than plausible. A quote is only a
   * citation if it is actually on the page it names -- otherwise it is a second
   * hallucination dressed as evidence for the first.
   */
  it('quotes text that genuinely appears on the page it cites', () => {
    const wrong: string[] = []
    for (const [key, v] of Object.entries(terms)) {
      if (typeof v !== 'object' || v === null || !('quote' in v)) continue
      if (!v.quote || !v.page_no) continue
      const page = pages[v.page_no - 1]
      if (!page) { wrong.push(`${key}: cites page ${v.page_no}, which does not exist`); continue }
      // Compared on a distinctive opening fragment: the model reflows and elides
      // long quotes, but it does not invent the first words of a real sentence.
      const fragment = flat(v.quote).slice(0, 60)
      if (!flat(page.text).includes(fragment)) {
        wrong.push(`${key}: quote not found on page ${v.page_no}`)
      }
    }
    expect(wrong).toEqual([])
  })
})

describe('the eligibility snapshot', () => {
  it('judges every criterion it lists', () => {
    expect(eligibility.length).toBeGreaterThanOrEqual(10)
    for (const row of eligibility) {
      expect(['pass', 'warn', 'fail']).toContain(row.status)
      expect(row.note.length).toBeGreaterThan(20)
    }
  })

  /**
   * CLAUDE.md: "The CMMI row is the emotional centre of the demo." It is the one
   * criterion this bid fails, and it lives on a table continuation page that the
   * page index originally dropped. Both halves have to keep working.
   */
  it('fails on CMMI, and on nothing else', () => {
    const failures = eligibility.filter((r) => r.status === 'fail')
    expect(failures).toHaveLength(1)
    expect(failures[0].criterion).toMatch(/CMMI/i)
  })

  it('says what would have to change, rather than only that it failed', () => {
    const cmmi = eligibility.find((r) => r.status === 'fail')!
    expect(cmmi.note).toMatch(/renew|PARS|lapsed|appraisal/i)
  })

  it('passes the turnover bar, which the profile clears standalone', () => {
    const turnover = eligibility.find((r) => /turnover/i.test(r.criterion))
    expect(turnover?.status).toBe('pass')
  })
})

describe('the risk flags', () => {
  /**
   * The defect CLAUDE.md calls the most persuasive content in the build: an API
   * response target of 0.30 ms with a penalty attached per breaching call, which
   * is not achievable over a network.
   */
  it('finds the unachievable API response-time SLA', () => {
    const sla = risks.find((f) => /API|response time/i.test(f.title) || /0\.30\s*ms|sub-?millisecond/i.test(f.detail))
    expect(sla, 'the hero SLA defect was not found').toBeDefined()
    expect(sla!.severity).toBe('high')
  })

  it('gives every flag a recommendation and a severity', () => {
    for (const f of risks) {
      expect(['high', 'medium', 'low']).toContain(f.severity)
      expect(f.detail.length).toBeGreaterThan(40)
    }
  })
})

describe('work distribution', () => {
  it('produces exactly one package per role, and no invented roles', () => {
    const roles = packages.map((p) => p.role_id).sort()
    expect(roles).toEqual([
      'bid-manager', 'delivery', 'finance', 'legal-1', 'legal-2', 'solution-architect',
    ])
  })

  it('gives every role real work', () => {
    for (const p of packages) {
      expect(p.action_items.length, `${p.role_id} has no action items`).toBeGreaterThan(0)
      expect(p.forms.length, `${p.role_id} has no forms`).toBeGreaterThan(0)
    }
  })
})

describe('the dates the product will count down to', () => {
  it('shifts the document\'s 2025 dates onto the seed\'s 2027, keeping day and month', () => {
    const { dates } = shiftTenderDates(
      {
        bid_due: terms.bid_due.value,
        prebid_queries_due: terms.prebid_queries_due.value,
        prebid_conference: terms.prebid_conference.value,
      },
      'bid_due',
      new Date('2026-08-25T19:00:00+05:30'),
    )
    expect(dates.bid_due).toBe('2027-08-28T17:00:00+05:30')
    expect(dates.prebid_queries_due).toBe('2027-08-13T12:00:00+05:30')
    expect(dates.prebid_conference).toBe('2027-08-18T12:00:00+05:30')
  })
})
