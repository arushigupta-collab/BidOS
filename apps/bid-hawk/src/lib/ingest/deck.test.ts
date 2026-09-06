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

describe('bullet glyphs the model wrote itself', () => {
  /*
   * Observed on a live run. The schema asks for an array of sentences and the
   * renderer draws the bullet, but the model returned two points in one item
   * joined by a literal glyph -- so the slide showed a stray bullet mid-line.
   */
  it('removes a glyph the model put in the middle of a line', async () => {
    const { unzipSync, strFromU8 } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: {
        ...COPY,
        requirement: ['Pay the fee on the portal.• Maintain bid validity for 180 days.'],
      },
      terms: TERMS, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    const slide = strFromU8(files['ppt/slides/slide3.xml'])
    expect(slide).not.toContain('•')
    expect(slide).toContain('Pay the fee on the portal. Maintain bid validity')
  })

  it('drops a glyph the model put at the start of a line', async () => {
    const { unzipSync, strFromU8 } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: { ...COPY, requirement: ['• Complete implementation in nine months.'] },
      terms: TERMS, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    const text = [...strFromU8(files['ppt/slides/slide3.xml']).matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => m[1])
    expect(text).toContain('Complete implementation in nine months.')
  })
})

describe('the TCIL mark', () => {
  /*
   * Embedded rather than read from disk: a file under public/ is served to
   * browsers and is not traced into a serverless function bundle, so reading it
   * at render time would work locally and fail once deployed.
   */
  it('reaches every slide, through the master that carries it', async () => {
    const { unzipSync, strFromU8 } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: COPY, terms: TERMS, title: 'A tender', tenderRef: 'REF/1', issuingAuthority: 'A buyer',
    }))

    const slides = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    expect(slides).toHaveLength(MAX_SLIDES)

    /*
     * Followed through the relationships rather than asserted on the layouts
     * directly: pptxgenjs also emits a default blank layout that nothing uses,
     * so "every layout draws the mark" is false while the deck is still correct.
     * What matters is that every SLIDE resolves to a layout that does.
     */
    for (const slide of slides) {
      const name = slide.split('/').pop() as string
      const rels = strFromU8(files[`ppt/slides/_rels/${name}.rels`])
      const layout = /slideLayout(\d+)\.xml/.exec(rels)?.[1]
      expect(layout, `${slide} is not bound to a layout`).toBeDefined()

      const layoutRels = strFromU8(files[`ppt/slideLayouts/_rels/slideLayout${layout}.xml.rels`])
      expect(layoutRels, `${slide} resolves to a layout with no mark`).toMatch(/\.png/)
    }
  })

  /*
   * pptxgenjs stores an image once per slide that draws it. Drawn directly, the
   * 51 KB mark became 306 KB of a file whose whole point is being small enough to
   * send. On the masters it is stored once each, and there are two: the cover is
   * dark with the mark large, the content slides light with it in the footer.
   */
  it('stores the mark once per master, not once per slide', async () => {
    const { unzipSync } = await import('fflate')
    const files = unzipSync(await buildDeck({
      copy: COPY, terms: TERMS, title: 'A tender', tenderRef: null, issuingAuthority: null,
    }))
    const media = Object.keys(files).filter((n) => n.endsWith('.png'))
    expect(media).toHaveLength(2)
  })
})
