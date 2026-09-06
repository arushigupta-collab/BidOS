import { describe, expect, it } from 'vitest'
import { buildDeck, MAX_SLIDES } from './deck.js'
import { TCIL, ILLUSTRATIVE_NOTE } from './tcil.js'
import type { CommercialTerms } from './stages.js'

const cite = (value: string) => ({ value, page_no: 1, quote: value, confidence: 1 })

const TERMS = {
  title: cite('A tender'), tender_ref: cite('REF/1'), issuing_authority: cite('A buyer'),
  selection_method: cite('QCBS'), tender_fee: cite('INR 25,000'), emd: cite('INR 1,00,00,000'),
  bid_due: cite('11 Feb 2027'), bid_validity: cite('180 days'), contract_term: cite('45 months'),
  pbg: cite('10%'), est_value: cite('INR 72 Cr'), est_value_is_inferred: false,
  envelopes: cite('Four'), prebid_queries_due: cite('-'), prebid_conference: cite('-'),
  consortium_allowed: true,
} as unknown as CommercialTerms

const COPY = {
  requirementTitle: 'One citizen services platform',
  requirement: ['A.', 'B.', 'C.'],
  approachTitle: 'Migrate then onboard',
  approach: ['One.', 'Two.', 'Three.', 'Four.'],
  capability: [
    { label: 'Scale', detail: 'Reference needed.' },
    { label: 'Identity', detail: 'Reference needed.' },
    { label: 'Certification', detail: 'Evidence needed.' },
  ],
}

/** Reads the slide XML back out of the .pptx, which is a zip. */
async function slidesOf(bytes: Uint8Array): Promise<string[]> {
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(bytes)
  return Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
    .map((n) => strFromU8(files[n]))
}

const textOf = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' | ')

describe('the draft proposal deck', () => {
  it('is exactly six slides, which is the promise the format makes', async () => {
    const slides = await slidesOf(await buildDeck({
      copy: COPY, terms: TERMS, title: 'A tender', tenderRef: 'REF/1', issuingAuthority: 'A buyer',
    }))
    expect(slides).toHaveLength(MAX_SLIDES)
  })

  it('carries the tender it answers on the cover, so the file stands alone', async () => {
    const slides = await slidesOf(await buildDeck({
      copy: COPY, terms: TERMS,
      title: 'Selection of System Integrator for Aaple Sarkar 2.0',
      tenderRef: 'MAHAIT/RTS2.0/001/2025/080',
      issuingAuthority: 'MahaIT',
    }))
    expect(textOf(slides[0])).toContain('MAHAIT/RTS2.0/001/2025/080')
    expect(textOf(slides[0])).toContain('Aaple Sarkar 2.0')
    expect(textOf(slides[0])).toContain(TCIL.short)
  })

  /*
   * The capability slide is placeholder content by instruction. Saying so in a
   * comment protects nobody -- the deck leaves the building, and whoever opens it
   * has to be able to tell drafted claims from established ones.
   */
  it('says on the capability slide that it is illustrative', async () => {
    const slides = await slidesOf(await buildDeck({
      copy: COPY, terms: TERMS, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    expect(textOf(slides[4])).toContain(ILLUSTRATIVE_NOTE)
  })

  /* A term the tender does not state is a dash, never a guess. Same rule as the feed. */
  it('shows a dash for a term the tender does not state', async () => {
    const thin = { ...TERMS, pbg: { value: null } } as unknown as CommercialTerms
    const slides = await slidesOf(await buildDeck({
      copy: COPY, terms: thin, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    expect(textOf(slides[5])).toContain('—')
  })

  /* The prompt forbids em dashes; this is what makes it true of the artefact. */
  it('strips em dashes the model may have written anyway', async () => {
    const slides = await slidesOf(await buildDeck({
      copy: { ...COPY, requirement: ['The portal is late — and the deadline stands.'] },
      terms: TERMS, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    expect(textOf(slides[2])).not.toMatch(/—/)
    expect(textOf(slides[2])).toContain('late, and the deadline stands')
  })

  it('fits every shape inside the slide, so nothing runs off the page', async () => {
    const slides = await slidesOf(await buildDeck({
      copy: COPY, terms: TERMS, title: 'A tender', tenderRef: 'REF/1', issuingAuthority: 'A buyer',
    }))
    const EMU = 914400
    for (const [i, xml] of slides.entries()) {
      const offs = [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/g)]
      const exts = [...xml.matchAll(/<a:ext cx="(\d+)" cy="(\d+)"\/>/g)]
      for (let k = 0; k < Math.min(offs.length, exts.length); k += 1) {
        const right = (Number(offs[k][1]) + Number(exts[k][1])) / EMU
        const bottom = (Number(offs[k][2]) + Number(exts[k][2])) / EMU
        expect(right, `slide ${i + 1} overflows the width`).toBeLessThanOrEqual(13.34)
        expect(bottom, `slide ${i + 1} overflows the height`).toBeLessThanOrEqual(7.51)
      }
    }
  })
})

describe('the commercial gates table', () => {
  /*
   * Extraction keeps the whole clause so the citation stays checkable. A slide
   * cell cannot be that faithful: the tender fee arrived as the figure plus a
   * parenthetical plus the portal URL, which ran off the cell.
   */
  it('lifts the figure out of the clause, as the tender pages do', async () => {
    const wordy = {
      ...TERMS,
      tender_fee: {
        value:
          'INR 25,000/- (Indian Rupees Twenty-Five Thousand only) to be paid at e-Tendering Portal: ' +
          'https://www.mahatenders.gov.in before the submission deadline',
      },
    } as unknown as CommercialTerms

    const { unzipSync, strFromU8 } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: COPY, terms: wordy, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    const gates = strFromU8(files['ppt/slides/slide6.xml'])
    const text = [...gates.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1])

    expect(text).toContain('INR 25,000')
    expect(gates).not.toContain('mahatenders.gov.in')
  })

  it('cuts a long non-money term on a word boundary rather than mid-word', async () => {
    const LONG =
      'Quality and Cost Based Selection where the combined score is computed as ' +
      'Bn equals zero point seven zero times Tn plus zero point three zero times Fn across all responsive bidders'
    const wordy = { ...TERMS, selection_method: { value: LONG } } as unknown as CommercialTerms

    const { unzipSync, strFromU8 } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: COPY, terms: wordy, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    const cell = [...strFromU8(files['ppt/slides/slide6.xml']).matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => m[1]).find((t) => t.startsWith('Quality and Cost'))

    expect(cell).toBeDefined()
    expect(cell!.length).toBeLessThanOrEqual(70)
    expect(cell!).toMatch(/…$/)

    /*
     * The property is that the cut lands BETWEEN words: what survives is a prefix
     * of the original, and the original carries on with a space. Asserting the
     * ellipsis is not preceded by a letter would be wrong -- a clean cut ends on
     * the last whole word, so a letter before the ellipsis is what correct looks
     * like.
     */
    const body = cell!.replace(/…$/, '')
    expect(LONG.startsWith(body)).toBe(true)
    expect(LONG[body.length]).toBe(' ')
  })
})
