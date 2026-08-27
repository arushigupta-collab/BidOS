/**
 * The four sections a bid manager writes themselves.
 *
 * Cover letter, executive summary, company profile and table of contents. They
 * are the only parts of the response that are not somebody's work package, and
 * they are written last because each of them summarises the rest.
 *
 * The table of contents is generated from the sections that actually exist
 * rather than from a template. A contents page listing something the document
 * does not contain is worse than no contents page.
 */
import { createClient } from '@supabase/supabase-js'
import { tidyProse } from './tidyProse'

interface Req { method?: string; body?: unknown }
interface Res { status: (code: number) => Res; json: (body: unknown) => void }

const MODEL = 'openai/gpt-5'

export type SectionId = 'cover-letter' | 'executive-summary' | 'company-profile' | 'table-of-contents'

const COMPANY = `
Meridian Infratech Limited. Incorporated 14 March 2016 under the Companies Act 2013,
CIN U72900MH2016PLC287341, PAN AABCM4521Q, GSTIN 27AABCM4521Q1ZP.
Registered office: 7th Floor, Trident Tech Park, Plot 21, MIDC, Andheri East, Mumbai 400093.
Offices in Mumbai (340 seats) and Pune (210 seats).
Average annual turnover INR 268.4 Cr standalone (FY 2022-23 to FY 2024-25). Net worth positive
in each of the last three financial years. 1,240 IT/ITeS resources on payroll.
ISO 9001:2015, ISO/IEC 20000-1:2018, ISO/IEC 27001:2022 in force. CMMI-DEV Level 5 lapsed and
under renewal, not currently on the CMMI Institute PARS directory.
Government and PSU work in the last seven years: a statewide grievance redressal and service
delivery portal (INR 34.6 Cr, 2021), revenue and land-records digitisation (INR 28.2 Cr, 2023),
network and data-centre modernisation for a central PSU (INR 21.4 Cr, 2022), and a municipal
property tax and permits platform (INR 12.8 Cr, 2024).
Authorised signatory Rajeev Menon, Whole-time Director. bids@meridianinfratech.in.
`.trim()

const BRIEF: Record<SectionId, string> = {
  'cover-letter':
    `A covering letter from the authorised signatory to the issuing authority. It transmits the
bid, states unconditional acceptance of the terms, confirms the bid validity period and that
the EMD and tender fee are furnished, and is signed. Formal, short, no salesmanship. Address
it to the authority the tender names.`,
  'executive-summary':
    `Two to four paragraphs for an evaluator who will read nothing else first. What is being
proposed, how it will be delivered over the contract term, what the bidder brings that is
relevant to THIS tender, and the commercial shape. Specific. No adjectives that carry no
information.`,
  'company-profile':
    `The bidder's standing as it bears on this tender: incorporation, financial capacity against
the thresholds the tender sets, manpower, certifications, and comparable government work.
Where a requirement is not currently met, say so and say what is being done. A profile that
quietly omits a gap is worse than one that names it.`,
  'table-of-contents':
    `A contents list of the sections that actually exist in this response, in order, each a
single line. Do not invent sections. Do not number pages.`,
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'paragraphs'],
  properties: {
    title: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
  },
}

function db() {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const { rfpId, sectionId } = req.body as { rfpId: string; sectionId: SectionId }
    const client = db()

    const [rfp, fields, eligibility, summary, packages] = await Promise.all([
      client.from('rfps').select('*').eq('id', rfpId).single(),
      client.from('rfp_fields').select('key, value, page_no').eq('rfp_id', rfpId),
      client.from('eligibility_rows').select('criterion, status, note').eq('rfp_id', rfpId).order('ord'),
      client.from('rfp_summary').select('bullets').eq('rfp_id', rfpId).maybeSingle(),
      client.from('work_packages').select('id, role_id').eq('rfp_id', rfpId),
    ])

    // The contents list is built from responses that exist, not from a template.
    const ids = (packages.data ?? []).map((p) => p.id as string)
    const responses = ids.length
      ? (await client.from('responses').select('title, work_package_id').in('work_package_id', ids)).data ?? []
      : []

    /**
     * Dates come from the RFP ROW, not from the extracted field text.
     *
     * `rfp_fields` holds what the document literally says, and the source tender
     * closed in 2025. Those values are carried forward on ingest so deadlines run
     * against today, and the carried-forward version is what lives on the row.
     * Feeding the raw text here produced a cover letter dated 28 August 2025 for a
     * bid due in 2027 -- on the most formal page in the document.
     */
    const asDate = (iso: string | null | undefined) =>
      iso
        ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '(not stated)'

    const DATE_KEYS = new Set(['bid_due', 'prebid_queries_due', 'prebid_conference'])

    const context = [
      '--- THE TENDER ---',
      `Title: ${rfp.data?.title}`,
      `Reference: ${rfp.data?.tender_ref ?? '(not stated)'}`,
      `Issuing authority: ${rfp.data?.issuing_authority ?? '(not stated)'}`,
      `Bid due: ${asDate(rfp.data?.bid_due_at)}`,
      `Pre-bid queries due: ${asDate(rfp.data?.prebid_due_at)}`,
      `Today's date, for anything that must be dated: ${asDate(new Date().toISOString())}`,
      // The rest of the extracted facts, minus the dates, which are above.
      ...(fields.data ?? [])
        .filter((f) => !DATE_KEYS.has(f.key as string))
        .map((f) => `${f.key}: ${f.value ?? '(not stated)'}${f.page_no ? ` [p${f.page_no}]` : ''}`),
      '',
      '--- WHAT IT REQUIRES OF US ---',
      ...(eligibility.data ?? []).map((e) => `[${e.status}] ${e.criterion} — ${e.note ?? ''}`),
      '',
      '--- THE READING ---',
      ...((summary.data?.bullets as string[]) ?? []),
      '',
      '--- SECTIONS THIS RESPONSE CONTAINS ---',
      'Cover Letter', 'Executive Summary', 'Company Profile',
      ...responses.map((r) => r.title as string),
      '',
      '--- THE BIDDER ---',
      COMPANY,
    ].join('\n')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'BidOS Bid Orchestrator',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are the bid manager writing a section of a response to an Indian government
tender. ${BRIEF[sectionId]}

Never claim a capability the bidder's record does not support. Where the bidder falls short of
something the tender requires, state the position and the remedy rather than asserting
compliance: an evaluator who finds an overstatement stops trusting the rest.

Use ONLY the dates given above. Do not take a date from a quoted clause; the dates in this
brief are the operative ones.

No marketing language. Plain declarative sentences.

Punctuation, and this matters because the output is pasted into a bid document:

- No em dashes and no en dashes. Where you would reach for one, use a full stop,
  a colon, or a comma. A dash standing in for a clause boundary is a habit of
  generated text and reads as one.
- Straight quotes and straight apostrophes only. Curly ones arrive as mojibake in
  half the systems a bid passes through.
- No bullet characters inside a paragraph. Each paragraph is a paragraph.
- Ordinary sentence punctuation, ordinary spacing. Nothing that has to survive a
  copy and paste twice should depend on a character above ASCII.`,
          },
          { role: 'user', content: context },
        ],
        max_tokens: 12_000,
        temperature: 0,
        usage: { include: true },
        // Writing, not working out. See api/draft.ts.
        reasoning: { effort: 'low' },
        response_format: { type: 'json_schema', json_schema: { name: 'section', strict: true, schema: SCHEMA } },
      }),
    })

    const json = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[]
      error?: { message?: string }
    }
    if (!response.ok) throw new Error(json.error?.message ?? `OpenRouter returned ${response.status}`)

    const raw = json.choices?.[0]?.message?.content
    if (!raw) {
      throw new Error(
        json.choices?.[0]?.finish_reason === 'length'
          ? 'The model spent its whole budget reasoning and returned no answer.'
          : 'The model returned no content.',
      )
    }
    const section = JSON.parse(raw) as { title: string; paragraphs: string[] }
    res.status(200).json({
      title: tidyProse(section.title),
      paragraphs: section.paragraphs.map(tidyProse),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
