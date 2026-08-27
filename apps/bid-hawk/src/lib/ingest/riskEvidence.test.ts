/**
 * @vitest-environment node
 *
 * Are the risk flags real?
 *
 * This is the assertion that decides whether the flags can be shown to a client
 * who knows the document. A flag rests on passages the tender is claimed to
 * contain; if a passage is not on the page it names, the flag is not evidence of
 * anything, and a client finding one invented quotation stops believing the other
 * eleven.
 *
 * Checked against the real 262-page source rather than a fixture of it, because
 * the whole point is whether the quotations survive contact with the document.
 *
 * Two defects this file was written after, both found by running it by hand:
 *
 *  - A flag reported that the bid validity period was never stated. It is stated
 *    plainly on page 16. The risks stage reads a WINDOW of the document and had
 *    not been given that page, so it asserted a negative it could not see. It is
 *    now passed the extracted terms and checks omissions against them.
 *
 *  - Quotations were being elided: "API response time ... <= 0.30 ms per API
 *    call". A paraphrase inside quotation marks reads as evidence while being the
 *    model's own words. Telling it not to did not work, so `detail` and
 *    `evidence` are now separate fields and only the latter claims to be verbatim.
 */
import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPdf } from './loadPdf'
import fixture from './__fixtures__/hero-extraction.json'
import type { Page } from './pageIndex'

interface Evidence { quote: string; page_no: number }
interface Flag {
  title: string
  severity: 'high' | 'medium' | 'low'
  detail: string
  evidence: Evidence[]
  recommendation: string
  deadline: string | null
  page_no: number | null
}

const flags = (fixture.risks as { flags: Flag[] }).flags

let pages: Page[]
beforeAll(async () => {
  pages = (await loadPdf(new Uint8Array(await readFile('public/rfp/aaple-sarkar-2.0-rfp.pdf')))).pages
}, 60_000)

/** Whitespace, quote style and dash style all vary between extraction runs. */
const flat = (s: string) =>
  s.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[‑–—]/g, '-').trim().toLowerCase()

describe('every risk flag rests on the document', () => {
  it('cites at least one passage per flag', () => {
    expect(flags.length).toBeGreaterThan(0)
    for (const flag of flags) {
      expect(flag.evidence?.length, `"${flag.title}" cites nothing`).toBeGreaterThan(0)
    }
  })

  it('quotes text that is on the page it names, for every passage', () => {
    const wrong: string[] = []
    for (const flag of flags) {
      for (const e of flag.evidence) {
        const page = pages[e.page_no - 1]
        if (!page) {
          wrong.push(`${flag.title}: cites page ${e.page_no}, which does not exist`)
          continue
        }
        // A distinctive opening span: the model reflows long passages, but it
        // does not invent the first words of a real sentence.
        if (!flat(page.text).includes(flat(e.quote).slice(0, 60))) {
          wrong.push(`${flag.title}: "${e.quote.slice(0, 50)}" is not on page ${e.page_no}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('never elides inside a quotation', () => {
    // An ellipsis means the span is not contiguous, so it cannot be checked
    // against the page and is not a quotation.
    const elided = flags.flatMap((f) =>
      f.evidence.filter((e) => /…|\.\.\./.test(e.quote)).map((e) => `${f.title}: ${e.quote.slice(0, 40)}`),
    )
    expect(elided).toEqual([])
  })

  it('keeps quotation marks out of the prose, where nothing can check them', () => {
    const quoting = flags.filter((f) => /["“”]/.test(f.detail)).map((f) => f.title)
    expect(quoting).toEqual([])
  })
})

describe('what the flags say', () => {
  /**
   * CLAUDE.md calls this the most persuasive content in the build: an API
   * response target of 0.30 ms with a penalty per breaching call, which is not
   * achievable over a network.
   */
  it('still finds the unachievable API response-time SLA', () => {
    const sla = flags.find(
      (f) => /API|response time/i.test(f.title) || /0\.30\s*ms|sub-?millisecond|0\.30 milli/i.test(f.detail),
    )
    expect(sla, 'the hero SLA defect was not found').toBeDefined()
    expect(sla!.severity).toBe('high')
  })

  it('does not report a term as missing when the tender states it', () => {
    // The regression: bid validity is on page 16, and a flag once said it was
    // never stated. Anything claiming an omission must not name a term that was
    // successfully extracted.
    const extracted = fixture.extract as unknown as Record<string, { value: string | null }>
    const stated = Object.entries(extracted)
      .filter(([, v]) => v && typeof v === 'object' && 'value' in v && v.value)
      .map(([k]) => k.replace(/_/g, ' '))

    const bogus: string[] = []
    for (const flag of flags) {
      const claimsAbsence = /not (?:stated|specified|defined|given)|never (?:stated|specified)|omit|undefined|unspecified/i
      if (!claimsAbsence.test(flag.detail)) continue
      for (const term of ['bid validity', 'tender fee', 'emd', 'contract term', 'pbg']) {
        if (!stated.includes(term)) continue
        // Flags the case where the flag says a term is missing AND we extracted it.
        const near = new RegExp(`${term}[^.]{0,80}(not stated|not specified|never stated|is not defined)`, 'i')
        if (near.test(flag.detail)) bogus.push(`${flag.title}: says "${term}" is absent, but it was extracted`)
      }
    }
    expect(bogus).toEqual([])
  })

  it('gives every flag a deadline that is a date, not the sentence around it', () => {
    // Passing the extracted terms to this stage made it copy a whole field value
    // in as the deadline, address and trailing sentence included.
    for (const flag of flags) {
      if (!flag.deadline) continue
      expect(flag.deadline.length, `"${flag.title}" deadline is prose: ${flag.deadline}`).toBeLessThan(40)
      expect(flag.deadline).toMatch(/\d/)
    }
  })
})
