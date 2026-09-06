/**
 * The draft proposal deck, as a .pptx.
 *
 * SIX SLIDES, and the cap is structural rather than a guideline: `buildDeck`
 * throws if it ever emits a seventh. A draft that grows to fifteen slides stops
 * being something a bid manager reads before a kickoff call, which is the only
 * moment this artefact is useful.
 *
 * Three slides are fixed -- cover, the company, the commercial gates -- because
 * none of them depends on judgement. The two that do are written by the model
 * from the extracted facts, and the capability slide says on its face that it is
 * illustrative.
 */
/**
 * pptxgenjs is loaded WHERE IT IS USED, not at module scope.
 *
 * It is a browser-first library that reaches for `document` and `window` in
 * places, and it drags jszip in behind it. Imported at the top of this file it
 * runs during cold start, where a failure is not catchable: the function dies
 * before the handler exists and Vercel answers FUNCTION_INVOCATION_FAILED with no
 * detail -- which is exactly what `/api/ingest/deck` did while its four siblings,
 * identical but for this one import, returned ordinary JSON errors.
 *
 * Loaded inside `buildDeck`, any failure lands inside the handler's try and comes
 * back as a message somebody can act on. It also keeps a 3 MB dependency off the
 * cold path of a stage that only runs once per reading.
 *
 * The type stays static: `import type` is erased, so it costs nothing at runtime.
 */
type PptxConstructor = typeof import('pptxgenjs').default
type Slide = ReturnType<InstanceType<PptxConstructor>['addSlide']>
import type { CommercialTerms } from './stages.js'
import type { DeckCopy } from './stages.js'
import { TCIL, TCIL_BLUE, TCIL_INK, TCIL_MUTED, TCIL_RULE, TCIL_WASH, ILLUSTRATIVE_NOTE } from './tcil.js'
import { TCIL_LOGO_PNG } from './tcilLogo.js'

export const MAX_SLIDES = 6

/** 16:9, in inches, which is what pptxgenjs measures in. */
const W = 13.333
const H = 7.5
const MARGIN = 0.62

export interface DeckSource {
  copy: DeckCopy
  terms: CommercialTerms
  title: string
  tenderRef: string | null
  issuingAuthority: string | null
}

const EM_DASH = /\s*[—–]\s*/g

/** A bullet glyph the model wrote into the middle of its own line. */
const INLINE_BULLET = /\s*[•▪●·]\s*/g

/**
 * The prompt forbids em dashes; this is what makes it true. It also removes
 * bullet glyphs, which is a different problem with the same cause.
 *
 * The schema asks for an array of sentences and the renderer draws the bullet.
 * The model returned two points inside one array item joined by a literal
 * bullet, so a slide rendered "...on the e-Tendering Portal.- Maintain bid
 * validity for 180 days" as a single line with a stray glyph in the middle of it.
 * A leading glyph is dropped; an interior one becomes a space, keeping the
 * sentence punctuation already in front of it.
 */
const clean = (text: string): string =>
  text
    .replace(EM_DASH, ', ')
    .replace(/^\s*[•▪●·-]\s*/, '')
    .replace(INLINE_BULLET, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Only what changes per slide. The rule, the mark and the wordmark live on the
 * master.
 *
 * Added there because pptxgenjs stores an image once per slide that draws it: on
 * six slides the 51 KB mark became 306 KB of the file, in an artefact whose point
 * is being small enough to send. A master holds it once, which is also what a
 * master is for.
 */
function chrome(slide: Slide, label: string, index: number): void {
  slide.addText(label, {
    x: W / 2 - 2.5, y: H - 0.62, w: 5, h: 0.3,
    fontSize: 9, color: TCIL_MUTED, align: 'center', fontFace: 'Arial',
  })
  slide.addText(String(index), {
    x: W - MARGIN - 1, y: H - 0.62, w: 1, h: 0.3,
    fontSize: 9, color: TCIL_MUTED, align: 'right', fontFace: 'Arial',
  })
}

function heading(slide: Slide, text: string): void {
  slide.addText(clean(text), {
    x: MARGIN, y: 0.55, w: W - MARGIN * 2, h: 0.75,
    fontSize: 28, bold: true, color: TCIL_INK, fontFace: 'Arial',
  })
  slide.addShape('rect', { x: MARGIN, y: 1.38, w: 1.5, h: 0.05, fill: { color: TCIL_BLUE } })
}

/** One column of sentences, sized so the longest slide still fits the page. */
function bullets(slide: Slide, lines: string[], y = 1.85): void {
  slide.addText(
    lines.map((line) => ({
      text: clean(line),
      options: { bullet: { code: '25AA' }, breakLine: true, paraSpaceAfter: 10 },
    })),
    {
      x: MARGIN, y, w: W - MARGIN * 2, h: H - y - 0.9,
      fontSize: 15, color: TCIL_INK, fontFace: 'Arial', lineSpacingMultiple: 1.15, valign: 'top',
    },
  )
}

const EMPTY = '—'

/**
 * The figure, not the clause it sits in.
 *
 * Extraction keeps the whole sentence so the citation stays checkable, which is
 * right for the tender page and wrong for a table cell: the fee arrived as
 * "INR 25,000/- (Indian Rupees Twenty-Five Thousand only) to be paid at
 * e-Tendering Portal: https://..." and a slide has no room to be that faithful.
 *
 * Same rule Bid Orchestrator's `shortMoney` uses on its own tables, so the two
 * screens do not disagree about what a term says. Anything that is not a money
 * figure is cut at a length a cell can hold, on a word boundary rather than
 * mid-word.
 */
function tighten(text: string): string {
  const money = /(?:INR|Rs\.?|₹)\s*[\d,]+(?:\s*(?:Cr|Crore|Lakh|Lac)\b)?/i.exec(text)
  if (money) return money[0].replace(/\s+/g, ' ').trim()

  const flat = clean(text)
  if (flat.length <= 68) return flat
  const cut = flat.slice(0, 68)
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`
}

export async function buildDeck(source: DeckSource): Promise<Uint8Array> {
  const { copy, terms, title, tenderRef, issuingAuthority } = source

  /*
   * The interop seam, stated once. The package ships a CJS build and an ESM build
   * behind an `exports` map and its types are a class merged with a namespace, so
   * the default is the class under the bundler resolution this app builds with
   * and the module object under the node16 resolution Vercel compiles with.
   */
  const imported = (await import('pptxgenjs')).default
  const PptxGenJS = imported as unknown as PptxConstructor

  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'BIDOS_16x9', width: W, height: H })
  pptx.layout = 'BIDOS_16x9'

  /* The mark, the accent rule and the wordmark, defined once for every slide. */
  pptx.defineSlideMaster({
    title: 'TCIL_CONTENT',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.09, fill: { color: TCIL_BLUE } } },
      { image: { data: TCIL_LOGO_PNG, x: MARGIN, y: H - 0.72, w: 0.42, h: 0.42 } },
      {
        text: {
          text: TCIL.short,
          options: {
            x: MARGIN + 0.5, y: H - 0.62, w: 2, h: 0.3,
            fontSize: 10, bold: true, color: TCIL_BLUE, fontFace: 'Arial',
          },
        },
      },
    ],
  })

  pptx.defineSlideMaster({
    title: 'TCIL_COVER',
    background: { color: TCIL_INK },
    objects: [
      { rect: { x: 0, y: 0, w: 0.28, h: H, fill: { color: TCIL_BLUE } } },
      /* Transparent, so it reads on the dark ground without a white plate. */
      { image: { data: TCIL_LOGO_PNG, x: MARGIN + 0.3, y: 0.85, w: 1.15, h: 1.15 } },
    ],
  })
  pptx.author = TCIL.name
  pptx.company = TCIL.name
  pptx.title = `${TCIL.short} draft proposal — ${title}`

  /* 1 — Cover. The tender it answers, named, so the file is identifiable on its own. */
  const cover = pptx.addSlide({ masterName: 'TCIL_COVER' })
  cover.addText(TCIL.short, {
    x: MARGIN + 0.3, y: 2.15, w: 6, h: 0.9,
    fontSize: 54, bold: true, color: 'FFFFFF', fontFace: 'Arial', charSpacing: 2,
  })
  cover.addText(TCIL.name, {
    x: MARGIN + 0.3, y: 3.07, w: 8.5, h: 0.4,
    fontSize: 13, color: 'C9D4EC', fontFace: 'Arial',
  })
  cover.addText('DRAFT PROPOSAL', {
    x: MARGIN + 0.3, y: 3.95, w: 6, h: 0.4,
    fontSize: 12, bold: true, color: TCIL_BLUE === '0233AC' ? '7FA0E8' : 'FFFFFF',
    fontFace: 'Arial', charSpacing: 3,
  })
  cover.addText(clean(title), {
    x: MARGIN + 0.3, y: 4.4, w: W - MARGIN * 2 - 0.6, h: 1.5,
    fontSize: 22, color: 'FFFFFF', fontFace: 'Arial', valign: 'top',
  })
  cover.addText(
    [tenderRef, issuingAuthority].filter(Boolean).join('   ·   ') || EMPTY,
    { x: MARGIN + 0.3, y: H - 1.5, w: W - MARGIN * 2, h: 0.4, fontSize: 11, color: 'C9D4EC', fontFace: 'Arial' },
  )

  /* 2 — Who is bidding. Public facts only; nothing here is drafted. */
  const company = pptx.addSlide({ masterName: 'TCIL_CONTENT' })
  heading(company, TCIL.name)
  company.addText(TCIL.standing, {
    x: MARGIN, y: 1.62, w: W - MARGIN * 2, h: 0.35,
    fontSize: 13, italic: true, color: TCIL_MUTED, fontFace: 'Arial',
  })
  company.addTable(
    TCIL.facts.map(([k, v]) => [
      { text: k, options: { bold: true, color: TCIL_INK, fontSize: 12 } },
      { text: v, options: { color: TCIL_MUTED, fontSize: 12 } },
    ]),
    {
      x: MARGIN, y: 2.25, w: W - MARGIN * 2,
      colW: [2.6, W - MARGIN * 2 - 2.6],
      rowH: 0.52, fontFace: 'Arial', valign: 'middle',
      border: { type: 'solid', pt: 1, color: TCIL_RULE },
    },
  )
  chrome(company, 'The bidder', 2)

  /* 3 — What the buyer asked for, from the reading. */
  const requirement = pptx.addSlide({ masterName: 'TCIL_CONTENT' })
  heading(requirement, copy.requirementTitle)
  bullets(requirement, copy.requirement)
  chrome(requirement, 'The requirement', 3)

  /* 4 — How it would be delivered. */
  const approach = pptx.addSlide({ masterName: 'TCIL_CONTENT' })
  heading(approach, copy.approachTitle)
  bullets(approach, copy.approach)
  chrome(approach, 'Technical approach', 4)

  /* 5 — Capability, labelled as illustrative ON the slide. */
  const capability = pptx.addSlide({ masterName: 'TCIL_CONTENT' })
  heading(capability, 'Capability')
  capability.addText(ILLUSTRATIVE_NOTE, {
    x: MARGIN, y: 1.6, w: W - MARGIN * 2, h: 0.4,
    fontSize: 11, italic: true, color: 'A05A00', fontFace: 'Arial',
  })
  const cols = copy.capability.slice(0, 4)
  const cardW = (W - MARGIN * 2 - 0.3 * (cols.length - 1)) / cols.length
  cols.forEach((item, i) => {
    const x = MARGIN + i * (cardW + 0.3)
    capability.addShape('rect', { x, y: 2.3, w: cardW, h: 2.5, fill: { color: TCIL_WASH } })
    capability.addShape('rect', { x, y: 2.3, w: cardW, h: 0.07, fill: { color: TCIL_BLUE } })
    capability.addText(clean(item.label), {
      x: x + 0.25, y: 2.55, w: cardW - 0.5, h: 0.6,
      fontSize: 15, bold: true, color: TCIL_INK, fontFace: 'Arial', valign: 'top',
    })
    capability.addText(clean(item.detail), {
      x: x + 0.25, y: 3.2, w: cardW - 0.5, h: 1.4,
      fontSize: 12, color: TCIL_MUTED, fontFace: 'Arial', valign: 'top',
    })
  })
  chrome(capability, 'Capability', 5)

  /* 6 — What it costs to enter, straight from the extracted terms. */
  const gates = pptx.addSlide({ masterName: 'TCIL_CONTENT' })
  heading(gates, 'What this tender demands')
  const rows: [string, string][] = [
    ['Selection method', terms.selection_method?.value ?? EMPTY],
    ['Tender fee', terms.tender_fee?.value ?? EMPTY],
    ['Earnest money', terms.emd?.value ?? EMPTY],
    ['Bid validity', terms.bid_validity?.value ?? EMPTY],
    ['Contract term', terms.contract_term?.value ?? EMPTY],
    ['Performance guarantee', terms.pbg?.value ?? EMPTY],
  ]
  gates.addTable(
    rows.map(([k, v]) => [
      { text: k, options: { bold: true, color: TCIL_INK, fontSize: 12 } },
      /*
       * The placeholder is exempt from cleaning, because it IS an em dash and
       * `clean` turns those into commas for prose. Run over it, a term the tender
       * does not state rendered as a stray comma -- which reads as a mistake
       * rather than as an absence, and the absence is the point.
       */
      { text: v === EMPTY ? EMPTY : tighten(v), options: { color: TCIL_MUTED, fontSize: 12 } },
    ]),
    {
      x: MARGIN, y: 1.85, w: W - MARGIN * 2,
      colW: [3.4, W - MARGIN * 2 - 3.4],
      rowH: 0.55, fontFace: 'Arial', valign: 'middle',
      border: { type: 'solid', pt: 1, color: TCIL_RULE },
    },
  )
  gates.addText('A dash is a term the tender does not state. It has not been assumed.', {
    x: MARGIN, y: H - 1.15, w: W - MARGIN * 2, h: 0.3,
    fontSize: 10, italic: true, color: TCIL_MUTED, fontFace: 'Arial',
  })
  chrome(gates, 'Commercial gates', 6)

  /*
   * The cap, enforced. Six is a promise made to whoever opens this before a
   * kickoff call, and a guideline in a comment is not a promise.
   */
  const count = (pptx as unknown as { slides: unknown[] }).slides.length
  if (count > MAX_SLIDES) {
    throw new Error(`the deck came to ${count} slides against a limit of ${MAX_SLIDES}`)
  }

  const out = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer
  return new Uint8Array(out)
}
