/**
 * Drafting a specialist's part of the response, and filling their annexures.
 *
 * Server-side because it holds the OpenRouter key. Two operations behind one
 * endpoint, because they share the same grounding: what the tender actually
 * demands of this role, taken from the action items Bid Hawk derived and the
 * commercial terms it extracted.
 *
 * FORM FILLING RESOLVES IN THREE WAYS, and the order matters more than the
 * wording:
 *
 *   1. The value is in the tender. Copied verbatim with its page, badged as
 *      coming from the RFP.
 *   2. It is not in the tender but is in the company profile -- turnover, CIN,
 *      certifications. Taken from there and badged as such.
 *   3. Neither. Drafted, and badged as drafted.
 *
 * The badge is the point. A reader who cannot tell which of the three a value
 * came from has to treat all three as invented.
 */
import { createClient } from '@supabase/supabase-js'
import { tidyProse } from './_tidyProse.js'

interface Req { method?: string; body?: unknown }
interface Res { status: (code: number) => Res; json: (body: unknown) => void }

const MODEL = 'openai/gpt-5'

const COMPANY = `
Meridian Infratech Limited. Incorporated 14 March 2016 under the Companies Act 2013,
CIN U72900MH2016PLC287341, PAN AABCM4521Q, GSTIN 27AABCM4521Q1ZP.
Registered office: 7th Floor, Trident Tech Park, Plot 21, MIDC, Andheri East, Mumbai 400093.
Average annual turnover INR 268.4 Cr standalone (FY 2022-23 to FY 2024-25). Net worth positive
in each of the last three years. 1,240 IT/ITeS resources on payroll.
ISO 9001:2015, ISO/IEC 20000-1:2018 and ISO/IEC 27001:2022 in force. CMMI-DEV Level 5 lapsed
and under renewal, not currently listed on the CMMI Institute PARS directory.
Authorised signatory Rajeev Menon, Whole-time Director. bids@meridianinfratech.in, +91 22 6812 4400.
`.trim()

function db() {
  return createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function complete(system: string, user: string, schema: Record<string, unknown>, name: string) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'BidOS Bid Author',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Sized for reasoning plus answer: a reasoning model spends this budget
      // before writing a character, and running out returns nothing at all.
      max_tokens: 12_000,
      temperature: 0,
      usage: { include: true },
      /**
       * Low, because this is writing rather than working out.
       *
       * The facts are decided before this call: what the tender demands was
       * extracted by Bid Hawk, and what the bidder can claim is on record. What
       * is left is putting them into sentences, and deep reasoning buys nothing
       * for that.
       *
       * Measured on the same prompt: default 32.7s for 2,568 characters, low
       * 20.2s for 2,536 -- the same five paragraphs, a third of the wait.
       * "minimal" was also tried and gives back 20% of the content, which is too
       * much to pay.
       *
       * The stages that genuinely reason -- extraction, eligibility, risk -- are
       * left alone in Bid Hawk.
       */
      reasoning: { effort: 'low' },
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    }),
  })

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(json.error?.message ?? `OpenRouter returned ${res.status}`)

  const raw = json.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error(
      json.choices?.[0]?.finish_reason === 'length'
        ? 'The model spent its whole budget reasoning and returned no answer.'
        : 'The model returned no content.',
    )
  }
  return JSON.parse(raw) as unknown
}

/** What the tender says, for grounding both operations. */
async function context(workPackageId: string) {
  const client = db()
  const { data: pkg } = await client
    .from('work_packages')
    .select('id, role_id, brief, source_sections, rfp_id')
    .eq('id', workPackageId)
    .single()
  if (!pkg) throw new Error('That work package no longer exists')

  const [items, fields, eligibility] = await Promise.all([
    client.from('action_items').select('text, ref, page_no').eq('work_package_id', workPackageId).order('ord'),
    client.from('rfp_fields').select('key, value, page_no, quote').eq('rfp_id', pkg.rfp_id),
    client.from('eligibility_rows').select('criterion, status, note').eq('rfp_id', pkg.rfp_id).order('ord'),
  ])

  return { pkg, items: items.data ?? [], fields: fields.data ?? [], eligibility: eligibility.data ?? [] }
}

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'paragraphs'],
  properties: {
    title: { type: 'string', description: 'A section heading for this role\'s contribution.' },
    paragraphs: {
      type: 'array',
      description: 'Four to eight paragraphs. Each addresses something the tender actually asks for.',
      items: { type: 'string' },
    },
  },
}

const FILL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fields'],
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'source', 'page_no'],
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          source: {
            type: 'string',
            enum: ['rfp', 'profile', 'ai'],
            description:
              '"rfp" when copied from the tender, "profile" when taken from the company record, ' +
              '"ai" when neither held it and it was drafted.',
          },
          page_no: {
            type: ['integer', 'null'],
            description: 'The tender page, for source "rfp" only. Null otherwise.',
          },
        },
      },
    },
  },
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  try {
    const { workPackageId, operation, formId } = req.body as {
      workPackageId: string
      operation: 'draft' | 'fill'
      formId?: string
    }
    const { pkg, items, fields, eligibility } = await context(workPackageId)

    const tender = [
      '--- WHAT THE TENDER SAYS ---',
      ...fields.map((f) => `${f.key}: ${f.value ?? '(not stated)'}${f.page_no ? ` [p${f.page_no}]` : ''}`),
      '',
      '--- WHAT IT REQUIRES OF US ---',
      ...eligibility.map((e) => `[${e.status}] ${e.criterion} — ${e.note ?? ''}`),
      '',
      '--- THIS ROLE MUST ---',
      ...items.map((i) => `- ${i.text}${i.ref ? ` (${i.ref})` : ''}`),
    ].join('\n')

    if (operation === 'draft') {
      const data = await complete(
        `You are the ${pkg.role_id} on a bid for an Indian government tender, writing your part
of the response. ${pkg.brief ?? ''}

Write what this bidder will actually do, in specific terms drawn from what the tender asks
for. Address the action items. Where the tender sets a threshold, name it.

Never claim a capability the company record does not support. Where the company falls short
of a requirement, say what will be done about it rather than asserting compliance -- a bid
that overstates is worse than one that explains.

No marketing language. No "world-class", no "leverage", no "robust". Plain declarative
sentences a technical evaluator can score.

Punctuation, and this matters because the output is pasted into a bid document:

- No em dashes and no en dashes. Where you would reach for one, use a full stop,
  a colon, or a comma. A dash standing in for a clause boundary is a habit of
  generated text and reads as one.
- Straight quotes and straight apostrophes only. Curly ones arrive as mojibake in
  half the systems a bid passes through.
- No bullet characters inside a paragraph. Each paragraph is a paragraph.
- Ordinary sentence punctuation, ordinary spacing. Nothing that has to survive a
  copy and paste twice should depend on a character above ASCII.`,
        `${tender}\n\n--- THE BIDDER ---\n${COMPANY}`,
        DRAFT_SCHEMA,
        'draft',
      )
      const draft = data as { title: string; paragraphs: string[] }
      res.status(200).json({
        title: tidyProse(draft.title),
        paragraphs: draft.paragraphs.map(tidyProse),
      })
      return
    }

    const form = formId
      ? (await db().from('forms').select('annexure, title, kind').eq('id', formId).single()).data
      : null

    const data = await complete(
      `You are completing an annexure for a bid. For each field the form needs, decide where its
value comes from, in this order:

1. The tender states it. Copy it verbatim, set source "rfp", give the page.
2. The value RESTS ON the company record. Source "profile".
3. Neither source supports it. Draft something appropriate, source "ai".

Rule 2 is the one that gets answered wrongly, so read it carefully. "profile" is not
restricted to values copied out word for word. It covers ANY answer whose factual basis is
the company record, including where you had to do the reasoning:

  - "Does the bidder have 100+ IT/ITeS resources?" -> "Yes" is source "profile". The record
    says 1,240. You compared two numbers; you did not invent one.
  - "Is the bidder GST registered?" -> "Yes" is "profile". The GSTIN is on the record.
  - "Office within the Mumbai Metropolitan Region?" -> "Yes, Andheri East" is "profile".
  - "Are the required certifications in force?" -> the answer is "profile" either way,
    because the record is what decides it.

Reserve "ai" for values with NO basis in either source: a date to be filled in at signing,
a commitment to enclose a document, a form of words the bidder must choose.

The source is not a formality. A reader who cannot tell a figure taken from the tender from
one a model invented has to treat both as invented, and marking a grounded answer as drafted
throws away the grounding you actually had.

Where the company record does not satisfy a requirement, say so plainly. A bid that
overstates is worse than one that explains.

Return the fields this specific annexure needs, in the order a form would ask for them.`,
      `--- THE FORM ---\n${form ? `${form.annexure}: ${form.title} (${form.kind})` : 'General bid annexure'}\n\n${tender}\n\n--- THE BIDDER ---\n${COMPANY}`,
      FILL_SCHEMA,
      'fill',
    )
    const filled = data as { fields: { label: string; value: string }[] }
    res.status(200).json({
      fields: filled.fields.map((f) => ({ ...f, label: tidyProse(f.label), value: tidyProse(f.value) })),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
