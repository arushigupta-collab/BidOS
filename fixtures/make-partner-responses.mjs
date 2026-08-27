/**
 * Mock partner responses to the Punjab and Sind Bank scanning tender.
 *
 * Fixtures for testing the Response Tracker's upload: real PDFs a person can drag
 * in, with content taken from the actual reading of GEM/2026/B/7116149 -- the
 * 11.68 Cr estimate, the 20 lakh EMD, the 700 lakh turnover floor, LCS selection,
 * the 5% ePBG over 24 months. A fixture quoting invented figures would test the
 * upload and mislead anybody who opened one.
 *
 * The four partners answer differently on purpose: different quotes, different
 * document counts, different strengths. Evaluation ranking four identical
 * submissions demonstrates nothing.
 *
 *   node fixtures/make-partner-responses.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'partner-responses')

/* ------------------------------------------------------------ a small PDF */

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** Wraps to a column width Helvetica 10.5 fits inside A4 margins. */
function wrap(line, width = 92) {
  if (line.length <= width) return [line]
  const out = []
  let current = ''
  for (const word of line.split(' ')) {
    if ((current + ' ' + word).trim().length > width) { out.push(current.trim()); current = word }
    else current += ' ' + word
  }
  if (current.trim()) out.push(current.trim())
  return out
}

function pdf(title, lines) {
  const PAGE_LINES = 46
  const flowed = lines.flatMap((l) => (l === '' ? [''] : wrap(l)))
  const pages = []
  for (let i = 0; i < flowed.length; i += PAGE_LINES) pages.push(flowed.slice(i, i + PAGE_LINES))
  if (pages.length === 0) pages.push([''])

  const objects = []
  const add = (body) => { objects.push(body); return objects.length }

  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  const pageIds = []
  const contentIds = []
  const pagesId = objects.length + pages.length * 2 + 1

  for (const page of pages) {
    let y = 792
    let stream = 'BT\n'
    for (const line of page) {
      const isHeading = line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 70
      stream += `/F${isHeading ? 2 : 1} ${isHeading ? 12 : 10.5} Tf\n1 0 0 1 56 ${y} Tm\n(${esc(line)}) Tj\n`
      y -= 16
    }
    stream += 'ET'
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    contentIds.push(contentId)
    pageIds.push(add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ))
  }

  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  const info = add(`<< /Title (${esc(title)}) /Producer (BidOS fixtures) >>`)

  let out = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i += 1) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, 'latin1')
}

/* ------------------------------------------------------------ the tender */

const TENDER = {
  ref: 'GEM/2026/B/7116149',
  title: 'Scanning and Digitisation Service (Version 2) - 200',
  buyer: 'Punjab And Sind Bank',
  estimate: '11,68,00,000',
  emd: '20,00,000',
  turnoverFloor: '700 Lakh',
  epbg: '5.00% for 24 months',
  method: 'Least Cost Method Based Evaluation (LCS)',
  term: '1 Year',
  place: 'Delhi (NCT)',
  due: '11 February 2027, 16:00',
  prebid: '22 January 2027, 16:00, Head Office, 21 Rajendra Place, New Delhi 110008',
}

function header(partner, document) {
  return [
    partner.name.toUpperCase(),
    partner.address,
    `CIN ${partner.cin}   ·   GSTIN ${partner.gstin}`,
    '',
    '─'.repeat(92),
    `RESPONSE TO ${TENDER.ref}`,
    `${TENDER.title}`,
    `Buyer: ${TENDER.buyer}   ·   Closing ${TENDER.due}`,
    `Document: ${document}`,
    '─'.repeat(92),
    '',
  ]
}

const PARTNERS = [
  {
    id: 'pt-lipika',
    name: 'Lipika Records Management Private Limited',
    short: 'Lipika',
    address: 'B-42, Okhla Industrial Area Phase II, New Delhi 110020',
    cin: 'U72900DL2011PTC221847',
    gstin: '07AABCL4471M1ZK',
    contact: 'Ashwini Bhatnagar, Director - Government Business',
    turnoverCr: [118, 124, 128],
    quote: '10,94,00,000',
    perImage: '0.68',
    bench: 610,
    scanners: 180,
    iso: ['ISO/IEC 27001:2022', 'ISO 9001:2015'],
    cmmi: 'CMMI-DEV Level 3',
    strength:
      'Ran the National Archives programme end to end: 2.1 crore pages captured, indexed and quality-assured against a 99.5% accuracy SLA.',
    weakness:
      'The Registrar of Companies engagement in 2022 ran four months late; the scanning bench was under-staffed at peak and has since been increased by 40%.',
    documents: [
      'Company profile', 'Technical approach note', 'Indicative commercial quote',
      'Audited financials, last three financial years', 'ISO certificates',
      'Similar work orders or completion certificates', 'CMMI certificate, where held',
      'Non-blacklisting undertaking',
    ],
  },
  {
    id: 'pt-akshara',
    name: 'Akshara Imaging Systems Limited',
    short: 'Akshara',
    address: 'Plot 17, MIDC Andheri East, Mumbai 400093',
    cin: 'L30007MH2004PLC148392',
    gstin: '27AAACA9921K1Z3',
    contact: 'Devang Mehta, Vice President - Public Sector',
    turnoverCr: [88, 91, 96],
    quote: '11,42,00,000',
    perImage: '0.74',
    bench: 210,
    scanners: 340,
    iso: ['ISO 9001:2015'],
    cmmi: null,
    strength:
      'Manufactures and commissions the capture hardware directly: 340 production scanners in the fleet, with spares and on-site engineers in eleven cities.',
    weakness:
      'Has supplied and commissioned capture estates but has not run an indexing and quality-assurance programme end to end. Proposes to subcontract indexing.',
    documents: [
      'Company profile', 'Technical approach note', 'Indicative commercial quote',
      'ISO certificates',
    ],
  },
  {
    id: 'pt-mudrika',
    name: 'Mudrika Bureau Services LLP',
    short: 'Mudrika',
    address: '221, Udyog Vihar Phase IV, Gurugram 122015',
    cin: 'AAF-8821',
    gstin: '06AAUFM2213Q1ZP',
    contact: 'Harpreet Sandhu, Managing Partner',
    turnoverCr: [38, 41, 44],
    quote: '9,86,00,000',
    perImage: '0.59',
    bench: 1400,
    scanners: 96,
    iso: ['ISO 9001:2015'],
    cmmi: null,
    strength:
      'The largest bench in the field at 1,400 operators, and the lowest rate offered. MSE registered, so the purchase preference within L-1 + 15% applies.',
    weakness:
      'No ISO/IEC 27001. Every programme to date has been delivered under a prime contractor. A 2023 Punjab Revenue engagement required rework on 6% of records after a quality-assurance sample failed.',
    documents: [
      'Company profile', 'Indicative commercial quote', 'Similar work orders or completion certificates',
    ],
  },
  {
    id: 'pt-nirvaha',
    name: 'Nirvaha Analytics Private Limited',
    short: 'Nirvaha',
    address: '4th Floor, Prestige Zackria, Anna Salai, Chennai 600002',
    cin: 'U72200KA2016PTC094411',
    gstin: '29AAGCN7712H1ZQ',
    contact: 'Sneha Raghavan, Head of Delivery',
    turnoverCr: [15, 17, 19],
    quote: '11,61,00,000',
    perImage: '0.72',
    bench: 46,
    scanners: 24,
    iso: ['ISO/IEC 27001:2022', 'ISO 9001:2015'],
    cmmi: null,
    strength:
      'Document intelligence rather than bulk capture: handwriting recognition and automated field extraction on legacy bank ledgers, at 94% field-level accuracy without a human pass.',
    weakness:
      'Turnover of 19 Cr against a bid of 11.68 Cr, and a bench of 46. Would need to subcontract the capture volume; proposes Lipika as capture partner.',
    documents: [
      'Company profile', 'Technical approach note', 'Indicative commercial quote',
      'ISO certificates', 'Audited financials, last three financial years',
    ],
  },
]

/* ------------------------------------------------------------- the bodies */

const BODY = {
  'Company profile': (p) => [
    'ABOUT THE FIRM',
    '',
    `${p.name} is a records and digitisation contractor operating from ${p.address}.`,
    `Contact for this bid: ${p.contact}.`,
    '',
    `Operating bench: ${p.bench} trained operators.`,
    `Capture estate: ${p.scanners} production scanners.`,
    `Certifications held: ${[...p.iso, p.cmmi].filter(Boolean).join(', ')}.`,
    '',
    'WHY US FOR THIS TENDER',
    '',
    p.strength,
    '',
    'WHERE WE ARE WEAKER',
    '',
    p.weakness,
    '',
    'TURNOVER, LAST THREE FINANCIAL YEARS',
    '',
    ...p.turnoverCr.map((v, i) => `FY${22 + i}-${23 + i}    INR ${v}.00 Cr`),
    '',
    `Three-year average: INR ${(p.turnoverCr.reduce((a, b) => a + b, 0) / 3).toFixed(2)} Cr, against the tender floor of ${TENDER.turnoverFloor}.`,
  ],

  'Technical approach note': (p) => [
    'PROPOSED APPROACH',
    '',
    `Against ${TENDER.ref}, over a contract period of ${TENDER.term}, delivered at ${TENDER.place}.`,
    '',
    '1. SURVEY AND PREPARATION',
    '',
    'Physical survey of every record room in scope, condition grading, and a de-stapling and',
    'flattening line before any capture begins. Damaged records are separated and handled on a',
    'flatbed rather than a sheet feeder.',
    '',
    '2. CAPTURE',
    '',
    `${p.scanners} production scanners, 300 dpi colour for all records and 600 dpi for any record`,
    'graded fragile. Batch headers are barcoded so a sheet can be traced to its file and shelf at',
    'any point.',
    '',
    '3. INDEXING AND QUALITY ASSURANCE',
    '',
    p.id === 'pt-nirvaha'
      ? 'Automated field extraction with handwriting recognition on ledger stock, at 94% field-level accuracy, with a human pass on everything the model scores below confidence.'
      : 'Double-key indexing on the metadata fields the Bank specifies, with a third-pass adjudication on any disagreement between the two operators.',
    '',
    'A 10% random sample per batch is checked against the physical record. A batch failing the',
    'sample is rejected whole and re-run.',
    '',
    '4. HANDOVER',
    '',
    'Searchable PDF/A output with the index as a delimited file, delivered on encrypted media and',
    'to the Bank\'s repository. Physical records are returned to their original sequence.',
    '',
    'SECURITY',
    '',
    p.iso.includes('ISO/IEC 27001:2022')
      ? 'Work is performed inside an ISO/IEC 27001:2022 certified facility. No record leaves the premises. Operators work on machines with no removable media and no external network route.'
      : 'Work is performed at our own premises under CCTV and access control. We hold ISO 9001:2015 but not ISO/IEC 27001, and note this as a gap against the tender.',
  ],

  'Indicative commercial quote': (p) => [
    'INDICATIVE COMMERCIAL QUOTE',
    '',
    `Tender: ${TENDER.ref}`,
    `Selection method: ${TENDER.method}`,
    `Estimated bid value published by the Bank: INR ${TENDER.estimate}`,
    '',
    '─'.repeat(92),
    `TOTAL QUOTED, INCLUSIVE OF ALL TAXES        INR ${p.quote}`,
    '─'.repeat(92),
    '',
    'BREAK-UP',
    '',
    `Rate per image, 300 dpi colour, indexed          INR ${p.perImage}`,
    'Survey, preparation and re-assembly              Included',
    'Quality assurance and adjudication               Included',
    'Media, encryption and handover                   Included',
    'Transport and insurance of records               Included',
    '',
    'COMMERCIAL CONDITIONS',
    '',
    `EMD of INR ${TENDER.emd} to be furnished with the bid.`,
    `ePBG at ${TENDER.epbg}, noting this exceeds the contract period of ${TENDER.term}.`,
    'Payment on certified batch completion, monthly.',
    'Quote held firm for 180 days from the closing date.',
    '',
    p.id === 'pt-mudrika'
      ? 'MSE registered. Purchase preference within L-1 + 15% is claimed under the GeM General Terms.'
      : 'No MSE purchase preference is claimed.',
    '',
    'This is an indicative quote for partner selection and is not a bid submitted to the Bank.',
  ],

  'Audited financials, last three financial years': (p) => [
    'AUDITED FINANCIALS',
    '',
    'Extract from audited statements, certified by the statutory auditor.',
    '',
    'FINANCIAL YEAR      TURNOVER (INR CR)      PROFIT AFTER TAX (INR CR)      NET WORTH (INR CR)',
    '',
    ...p.turnoverCr.map((v, i) =>
      `FY${22 + i}-${23 + i}              ${v.toFixed(2).padStart(8)}                    ${(v * 0.07).toFixed(2).padStart(8)}                 ${(v * 0.41).toFixed(2).padStart(8)}`,
    ),
    '',
    `Three-year average turnover: INR ${(p.turnoverCr.reduce((a, b) => a + b, 0) / 3).toFixed(2)} Cr.`,
    `Tender requirement: minimum average annual turnover of ${TENDER.turnoverFloor} over three years.`,
    '',
    (p.turnoverCr.reduce((a, b) => a + b, 0) / 3) >= 7
      ? 'The requirement is met.'
      : 'The requirement is NOT met on our own balance sheet.',
  ],

  'ISO certificates': (p) => [
    'CERTIFICATIONS HELD',
    '',
    ...p.iso.flatMap((cert, i) => [
      `${cert}`,
      `Certificate number ${p.short.toUpperCase()}-${2024 + i}-${4471 + i * 13}`,
      `Issued ${['14 March 2024', '02 August 2023'][i] ?? '11 June 2024'}, valid three years.`,
      `Scope: document capture, indexing and records management at ${p.address}.`,
      '',
    ]),
    ...(p.cmmi ? [`${p.cmmi}`, 'Appraisal completed 19 September 2024, valid three years.', ''] : []),
    'NOT HELD',
    '',
    ...(p.iso.some((c) => c.includes('27001'))
      ? ['None material to this tender.']
      : ['ISO/IEC 27001. We do not hold an information security certification and declare this openly.']),
  ],

  'Similar work orders or completion certificates': (p) => [
    'SIMILAR SERVICES, LAST THREE YEARS',
    '',
    'The tender requires three similar completed services each not less than 40% of the estimated',
    `cost, or two not less than 50%, or one not less than 80%. Against an estimate of INR ${TENDER.estimate},`,
    'that is 4.67 Cr, 5.84 Cr and 9.34 Cr respectively.',
    '',
    ...(p.id === 'pt-lipika'
      ? [
          'NATIONAL ARCHIVES OF INDIA — 2024 — INR 41.00 Cr',
          'Completion certificate enclosed. 2.1 crore pages captured, indexed and quality-assured.',
          '',
          'REGISTRAR OF COMPANIES, DELHI — 2022 — INR 27.00 Cr',
          'Completion certificate enclosed. Delivered four months beyond the original schedule.',
          '',
          'One engagement exceeds 80% of the estimate. The requirement is met on the single-order route.',
        ]
      : [
          'PUNJAB REVENUE DEPARTMENT — 2023 — INR 12.00 Cr',
          'Work order enclosed. Delivered under a prime contractor; rework on 6% of records.',
          '',
          'DELHI JAL BOARD — 2021 — INR 8.00 Cr',
          'Completion certificate enclosed. Delivered to schedule.',
          '',
          'Two engagements exceed 50% of the estimate. The requirement is met on the two-order route,',
          'though both were performed as a subcontractor rather than as the prime.',
        ]),
  ],

  'CMMI certificate, where held': (p) => [
    'CMMI APPRAISAL',
    '',
    `${p.cmmi ?? 'Not held.'}`,
    '',
    ...(p.cmmi
      ? [
          `Organisation: ${p.name}`,
          'Appraisal method: SCAMPI Class A',
          'Appraisal completed: 19 September 2024',
          'Valid until: 18 September 2027',
          `Scope: delivery of records digitisation and document management services at ${p.address}.`,
        ]
      : ['We hold no CMMI appraisal and make no claim to one.']),
  ],

  'Non-blacklisting undertaking': (p) => [
    'UNDERTAKING',
    '',
    `${p.name} declares that as on the date of this undertaking it is not blacklisted, debarred or`,
    'banned from participating in procurement by any Ministry or Department of the Government of',
    'India, any State Government, any Public Sector Undertaking or any Public Sector Bank.',
    '',
    'No case of a criminal nature is pending against the firm or any of its directors in relation',
    'to the performance of a public contract.',
    '',
    'We further declare that the information furnished in this response is true, and we accept that',
    'a material misstatement is grounds for rejection at any stage.',
    '',
    '',
    `For ${p.name}`,
    '',
    '',
    '_______________________',
    p.contact,
    'Authorised signatory',
    '',
    `Place: ${p.address.split(',').pop().trim()}`,
    'Date: 09 January 2027',
  ],
}

/* ------------------------------------------------------------------- run */

let written = 0
for (const partner of PARTNERS) {
  const folder = join(OUT, partner.short)
  await mkdir(folder, { recursive: true })
  for (const document of partner.documents) {
    const build = BODY[document]
    if (!build) continue
    const file = `${partner.short} - ${document.replace(/[/,]/g, '')}.pdf`
    await writeFile(join(folder, file), pdf(`${partner.short} — ${document}`, [
      ...header(partner, document),
      ...build(partner),
    ]))
    written += 1
  }
  const asked = 12
  console.log(
    `${partner.short.padEnd(9)} ${String(partner.documents.length).padStart(2)} of ${asked} documents` +
    `   quote INR ${partner.quote}`,
  )
}
console.log(`\n${written} files under fixtures/partner-responses/`)
