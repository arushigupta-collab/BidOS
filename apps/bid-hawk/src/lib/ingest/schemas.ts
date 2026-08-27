/**
 * The extraction contract.
 *
 * Every schema here runs under OpenAI strict mode, which is what turns "please
 * do not invent values" from a prompt request into something the transport
 * enforces. Three properties matter and all three are structural:
 *
 *  - `additionalProperties: false` plus a complete `required` list means the
 *    model returns exactly our fields, never a helpful extra one.
 *  - Every value is nullable. A tender that does not state an ABG returns null
 *    for it, and the UI renders the muted dash the product already specifies,
 *    rather than a plausible figure nobody can source.
 *  - Every value is paired with `page_no` and `quote`. A fact that cannot be
 *    pointed at on a page is not extracted, and the reader can check the model
 *    rather than trust it.
 */

/** A value the model found, or an explicit statement that it did not. */
const cited = (description: string) => ({
  type: 'object',
  description,
  additionalProperties: false,
  required: ['value', 'page_no', 'quote', 'confidence'],
  properties: {
    value: {
      type: ['string', 'null'],
      description: 'The value exactly as the document states it, or null if the document does not state it.',
    },
    page_no: {
      type: ['integer', 'null'],
      description: 'The 1-based page the value appears on. Null when value is null.',
    },
    quote: {
      type: ['string', 'null'],
      description: 'The verbatim sentence supporting the value, copied exactly. Null when value is null.',
    },
    confidence: {
      type: 'number',
      description: '0 to 1. Below 0.5 when the document is ambiguous or the value is inferred rather than stated.',
    },
  },
})

export const COMMERCIAL_TERMS_SCHEMA = {
  name: 'commercial_terms',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'title', 'tender_ref', 'issuing_authority', 'selection_method', 'tender_fee', 'emd',
      'bid_due', 'bid_validity', 'contract_term', 'pbg', 'est_value', 'est_value_is_inferred',
      'envelopes', 'prebid_queries_due', 'prebid_conference', 'consortium_allowed',
      'industry', 'region',
    ],
    properties: {
      title: cited('The full title of the work being tendered.'),
      tender_ref: cited('The tender reference or NIT number.'),
      issuing_authority: cited('The department or corporation issuing the tender, with its parent government.'),
      selection_method: cited('How the winner is chosen. Include the weighting formula verbatim if one is given.'),
      tender_fee: cited('The non-refundable tender document fee, with currency.'),
      emd: cited('Earnest Money Deposit or bid security: amount, instrument and any validity.'),
      bid_due: cited('The last date and time for bid submission, as written.'),
      bid_validity: cited('How long bids must remain valid.'),
      contract_term: cited(
        'Total contract duration. If the RFP states implementation and O&M separately, give the total and the split. ' +
        'This is frequently stated only as a sum in prose rather than as a labelled field.',
      ),
      pbg: cited('Performance Bank Guarantee: percentage, basis, acceptable issuers and validity.'),
      est_value: cited('The estimated contract value, ONLY if the document states one.'),
      est_value_is_inferred: {
        type: 'boolean',
        description:
          'True when est_value was reasoned from scope, manpower or payment milestones rather than published. ' +
          'Set true whenever est_value.value is non-null but no figure is stated as the tender value.',
      },
      envelopes: cited('The envelope or cover structure, e.g. a four envelope system, listing what each holds.'),
      prebid_queries_due: cited('Deadline for submitting pre-bid queries, and the address they go to.'),
      prebid_conference: cited('Date, time and venue of the pre-bid meeting.'),
      consortium_allowed: {
        type: ['boolean', 'null'],
        description: 'True if consortia or joint ventures may bid, false if barred, null if not addressed.',
      },
      industry: {
        type: 'string',
        description:
          'A short domain label for routing, e.g. "e-Governance and Citizen Services", "Telecom and Networks", ' +
          '"Cloud and Infrastructure". Two to four words.',
      },
      region: {
        type: 'string',
        description: 'The Indian state or region the work is delivered in. "Pan-India" if nationwide.',
      },
    },
  },
} as const

export const ELIGIBILITY_SCHEMA = {
  name: 'eligibility_snapshot',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['rows'],
    properties: {
      rows: {
        type: 'array',
        description: 'One row per pre-qualification criterion, in the order the document lists them.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['criterion', 'status', 'note', 'page_no'],
          properties: {
            criterion: {
              type: 'string',
              description: 'The requirement, condensed to one sentence but keeping every threshold and date exact.',
            },
            status: {
              type: 'string',
              enum: ['pass', 'warn', 'fail'],
              description:
                'Judged against the supplied company profile. "pass" when the profile clearly satisfies it. ' +
                '"warn" when it is met but with a caveat, a near miss, or a condition needing action. ' +
                '"fail" when the profile does not satisfy it as things stand.',
            },
            note: {
              type: 'string',
              description:
                'One sentence naming the specific reason, citing the profile value that decided it. ' +
                'For a fail, say what would have to change.',
            },
            page_no: { type: ['integer', 'null'], description: 'Page the criterion is stated on.' },
          },
        },
      },
    },
  },
} as const

export const RISK_SCHEMA = {
  name: 'risk_flags',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['flags'],
    properties: {
      flags: {
        type: 'array',
        description:
          'Defects in the tender document itself: internal contradictions, unachievable requirements, ' +
          'and terms a bidder is exposed to that the document leaves unspecified. NOT ordinary commercial risk, ' +
          'and NOT anything the document states clearly and consistently. Return an empty array if there are none.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'severity', 'detail', 'evidence', 'recommendation', 'deadline', 'page_no'],
          properties: {
            title: { type: 'string', description: 'Six words or fewer naming the defect.' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            detail: {
              type: 'string',
              description:
                'What the document says and why it is a problem, in your own words. Do NOT put quotation marks ' +
                'in this field: the verbatim support goes in `evidence`, where it can be checked.',
            },
            /**
             * Split from `detail` because telling the model not to elide inside
             * quotation marks did not work. It kept writing "API response time
             * ... <= 0.30 ms per API call" -- a paraphrase presented as a
             * quotation, which reads as evidence while being the model's own
             * words. Separating the two makes the verbatim part a field that can
             * be checked against the page automatically.
             */
            evidence: {
              type: 'array',
              description:
                'The passages this flag rests on. Each must be copied EXACTLY from the page, contiguous, ' +
                'with nothing left out and no ellipsis. If a span is too long, quote a shorter one.',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['quote', 'page_no'],
                properties: {
                  quote: { type: 'string', description: 'Copied character for character from the page.' },
                  page_no: { type: 'integer', description: 'The page marker the passage appears under.' },
                },
              },
            },
            recommendation: {
              type: 'string',
              description: 'The specific action, e.g. raising it as a pre-bid query before the query deadline.',
            },
            deadline: {
              type: ['string', 'null'],
              description:
                'ONLY the date, and the time if one is given: "13/08/2025, 12:00". Not the address it goes to, ' +
                'not the sentence around it. Null when no deadline applies.',
            },
            page_no: { type: ['integer', 'null'] },
          },
        },
      },
    },
  },
} as const

export const SUMMARY_SCHEMA = {
  name: 'rfp_summary',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['bullets', 'condensed'],
    properties: {
      bullets: {
        type: 'array',
        description:
          'Four to six sentences for a bid manager deciding whether to bid. Lead with what the work is, ' +
          'then the selection method, then the financial gates, then anything unusual. No preamble, no hedging.',
        items: { type: 'string' },
      },
      condensed: {
        type: 'array',
        description: 'The same argument in at most two sentences, for a feed row.',
        items: { type: 'string' },
      },
    },
  },
} as const

/** The six roles work is distributed to. Fixed: the model assigns, it does not invent roles. */
export const ROLE_IDS = [
  'bid-manager', 'solution-architect', 'legal-1', 'legal-2', 'finance', 'delivery',
] as const

export const WORK_PACKAGE_SCHEMA = {
  name: 'work_packages',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['packages'],
    properties: {
      packages: {
        type: 'array',
        description: `Exactly one entry for each of the six roles: ${ROLE_IDS.join(', ')}.`,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['role_id', 'brief', 'source_sections', 'action_items', 'forms'],
          properties: {
            role_id: { type: 'string', enum: [...ROLE_IDS] },
            brief: {
              type: 'string',
              description: 'One sentence on what this role must ensure for this specific tender.',
            },
            source_sections: {
              type: 'array',
              description: 'The RFP clause numbers this role owns, e.g. "5.4", "Annexure 7".',
              items: { type: 'string' },
            },
            action_items: {
              type: 'array',
              description: 'Three to seven concrete tasks drawn from the document, not generic bid tasks.',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['text', 'ref', 'page_no'],
                properties: {
                  text: { type: 'string', description: 'The task, phrased as an instruction.' },
                  ref: { type: 'string', description: 'Where it comes from, e.g. "RFP 5.4, Annexure 24".' },
                  page_no: { type: ['integer', 'null'] },
                },
              },
            },
            forms: {
              type: 'array',
              description: 'The annexures or formats this role must complete, taken from the document\'s own list.',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['annexure', 'title', 'kind', 'page_no'],
                properties: {
                  annexure: { type: 'string', description: 'e.g. "Annexure 1".' },
                  title: { type: 'string', description: 'The form\'s title as the document gives it.' },
                  kind: {
                    type: 'string',
                    enum: ['fields', 'checklist'],
                    description: '"fields" for a form of labelled values, "checklist" for a compliance table.',
                  },
                  page_no: { type: ['integer', 'null'] },
                },
              },
            },
          },
        },
      },
    },
  },
} as const
