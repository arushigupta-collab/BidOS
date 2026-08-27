/**
 * @vitest-environment node
 *
 * The `locate` stage, tested against the real 262-page source document rather
 * than a fixture. A synthetic RFP would pass any scoring rule we wrote, which is
 * precisely the failure this stage is prone to.
 *
 * Every assertion below corresponds to a value in CLAUDE.md's hero seed record,
 * which was verified by hand against this document. If locate stops reaching one
 * of them, extraction returns null or the wrong figure for that field, and the
 * summary screen quietly shows a dash where a commercial term should be.
 */
import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPdf } from './loadPdf'
import { FIELD_SPECS, pagesNeedingVision, selectPages, type Page } from './pageIndex'

let pages: Page[]
let pageCount: number
let scannedPages: number[]

beforeAll(async () => {
  const buf = await readFile('public/rfp/aaple-sarkar-2.0-rfp.pdf')
  const doc = await loadPdf(new Uint8Array(buf))
  pages = doc.pages
  pageCount = doc.pageCount
  scannedPages = doc.scannedPages
}, 60_000)

/** Pages `locate` would hand the model for a field. */
const candidates = (key: string) =>
  selectPages(pages, FIELD_SPECS.find((s) => s.key === key)!).map((p) => p.pageNo)

const reaches = (key: string, needle: RegExp) =>
  candidates(key).some((n) => needle.test(pages[n - 1].text))

describe('the source document', () => {
  it('is the 262-page tender, with a text layer on every page that says anything', () => {
    expect(pageCount).toBe(262)
    // Two pages carry nothing but their own page number -- full-page diagrams
    // whose text does not extract. They are the only candidates the VLM would
    // ever be handed for this document.
    expect(scannedPages).toEqual([80, 142])
  })

  it('never routes those two pages to the vision model, because nothing needs them', () => {
    // Vision costs nothing on this document. The stage is carried for the
    // scanned tenders a client uploads on the day.
    expect(pagesNeedingVision(pages, scannedPages)).toEqual([])
  })

  it('does not mistake a blank neighbour for a page worth reading', () => {
    // Page 142 is blank and IS in the sla candidate set, pulled in by expansion
    // rather than on its own score. Selecting on membership alone would spend a
    // vision call rendering an empty page.
    const sla = selectPages(pages, FIELD_SPECS.find((s) => s.key === 'sla')!)
    const blank = sla.find((p) => p.pageNo === 142)
    expect(blank?.viaNeighbour).toBe(true)
    expect(blank?.score).toBe(0)
  })
})

describe('locate reaches every verified commercial term', () => {
  it('finds the tender reference', () => {
    expect(reaches('tender_ref', /MAHAIT\/RTS2\.0\/001\/2025\/080/)).toBe(true)
  })

  it('finds the INR 25,000 tender fee', () => {
    expect(reaches('tender_fee', /25,000/)).toBe(true)
  })

  it('finds the INR 1,00,00,000 EMD', () => {
    expect(reaches('emd', /1,00,00,000/)).toBe(true)
  })

  it('finds the 180-day bid validity', () => {
    expect(reaches('bid_validity', /180 \(One Hundred and Eighty\) days/i)).toBe(true)
  })

  it('finds the 45-month contract term, which the RFP spells out', () => {
    // "nine (9) months for Implementation and thirty-six (36) months for support
    // i.e. the project is for overall period of forty five (45) months."
    expect(reaches('contract_term', /\(45\)\s*months/i)).toBe(true)
  })

  it('finds the 10% performance bank guarantee', () => {
    expect(reaches('pbg', /\(10\)\s*%\s*of Total Contract Value/i)).toBe(true)
  })

  it('finds the QCBS 70:30 weighting', () => {
    expect(reaches('selection_method', /0\.70|70:30/)).toBe(true)
  })

  it('finds the consortium bar', () => {
    expect(reaches('consortium', /consorti/i)).toBe(true)
  })

  it('finds the pre-bid meeting', () => {
    expect(reaches('prebid', /pre-?bid (meeting|conference)/i)).toBe(true)
  })
})

describe('locate reaches criteria that continue across a page break', () => {
  /**
   * The regression this stage was rebuilt for. The Pre-Qualification table opens
   * under its heading on page 36 and continues onto page 37 under nothing but a
   * repeated column header. Scoring on terms alone selected 36 and dropped 37 --
   * and the CMMI criterion, the one this bid fails and the sharpest moment in the
   * demo, is on 37.
   */
  it('reaches the CMMI criterion on the continuation page', () => {
    expect(reaches('eligibility', /CMMI/i)).toBe(true)
    expect(candidates('eligibility')).toContain(37)
  })

  it('reaches the turnover threshold', () => {
    expect(reaches('eligibility', /turnover/i)).toBe(true)
  })
})

describe('locate stays cheap enough to run per upload', () => {
  it('sends well under half the document to any one batch', () => {
    const commercial = [
      'tender_ref','issuing_authority','selection_method','tender_fee','emd','bid_due',
      'bid_validity','contract_term','pbg','prebid','envelopes','est_value','consortium',
    ]
    const union = new Set(commercial.flatMap(candidates))
    expect(union.size).toBeLessThan(pageCount * 0.35)
  })

  it('never sends a page that matched nothing and neighbours nothing', () => {
    for (const spec of FIELD_SPECS) {
      for (const page of selectPages(pages, spec)) {
        expect(page.score > 0 || page.viaNeighbour).toBe(true)
      }
    }
  })
})
