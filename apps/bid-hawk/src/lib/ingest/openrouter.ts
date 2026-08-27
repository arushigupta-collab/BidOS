/**
 * The single OpenRouter boundary. Server-side only: the key must never reach a
 * bundle, which is why nothing under src/features may import this file and why
 * the variable is read from `process.env` rather than `import.meta.env` -- a
 * VITE_-prefixed name would be inlined into the browser build by Vite.
 */

export interface ModelCall {
  stage: string
  model: string
  promptTokens: number
  completionTokens: number
  /**
   * Counted separately because it is spent from the SAME budget as the answer.
   * A stage whose reasoning approaches its maxTokens is one document away from
   * returning nothing.
   */
  reasoningTokens: number
  costUsd: number
  ms: number
}

export class OpenRouterError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable = true) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

/**
 * Text extraction and reasoning. Chosen over a vision model for everything the
 * source document supports, because that document carries a text layer on every
 * page that says anything and reading it as images would cost more and read worse.
 */
export const TEXT_MODEL = 'openai/gpt-5'

/**
 * Vision, for pages with no text layer. Gemini Flash rather than GPT or Claude
 * vision: an order of magnitude cheaper per page, a context large enough to hold
 * a whole scanned section at once, and stronger on the dense bordered tables
 * Indian government tenders are built from.
 */
export const VISION_MODEL = 'google/gemini-2.5-flash'

/** Used when the primary refuses or returns unparseable output on a scan. */
export const VISION_FALLBACK = 'qwen/qwen2.5-vl-72b-instruct'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY is not set. The ingestion pipeline cannot run without it.',
      undefined,
      false,
    )
  }
  return key
}

export type Content =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface CompleteOptions {
  stage: string
  model?: string
  system: string
  content: Content[]
  /** A JSON Schema. Passing it forces structured output and turns on strict mode. */
  schema?: { name: string; schema: Record<string, unknown> }
  maxTokens?: number
  signal?: AbortSignal
}

export interface Completion<T = unknown> {
  data: T
  raw: string
  call: ModelCall
}

/**
 * What a call actually cost.
 *
 * `usage.cost` is what OpenRouter deducted from its own credits, and on a
 * bring-your-own-key account that is always zero: the request is routed to the
 * upstream provider on the caller's own key and billed there instead. Reading
 * only `cost` therefore reports every run as free, which is worse than reporting
 * nothing -- "free" is a number somebody will believe.
 */
function costOf(usage?: {
  cost?: number
  is_byok?: boolean
  cost_details?: { upstream_inference_cost?: number }
}): number {
  if (!usage) return 0
  if (usage.cost) return usage.cost
  return usage.cost_details?.upstream_inference_cost ?? 0
}

const MAX_ATTEMPTS = 3
const RETRY_STATUS = new Set([408, 409, 429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * One completion, with structured output when a schema is supplied.
 *
 * `strict: true` is what makes the extraction contract enforceable rather than
 * hopeful: the model cannot return a field we did not ask for, cannot omit one we
 * did, and cannot return a string where the schema says null is allowed. Every
 * "not stated in this RFP" answer therefore arrives as an explicit null instead
 * of an invented value, which is the single most important property of this
 * pipeline.
 */
export async function complete<T = unknown>(options: CompleteOptions): Promise<Completion<T>> {
  const model = options.model ?? TEXT_MODEL
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.content },
    ],
    // Reasoning models spend this budget before writing a single character of
    // the answer, so it is not a cap on output size -- it is a cap on thinking
    // plus output. Sized generously; the cost is per token actually used.
    max_tokens: options.maxTokens ?? 24_000,
    // Deterministic where the provider honours it, so a re-run of the same
    // document does not produce a different tender fee.
    temperature: 0,
    // Opt in to cost accounting. Omitted, the response carries no `usage.cost`
    // and every run silently reports zero -- which reads as "free" rather than
    // as "not measured", and is the more dangerous of the two.
    usage: { include: true },
  }

  if (options.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: options.schema.name, strict: true, schema: options.schema.schema },
    }
  }

  let lastError: unknown
  /** Whether the budget has already been raised once for this call. */
  let doubled = false

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now()
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          'Content-Type': 'application/json',
          'X-Title': 'BidOS Ingestion',
        },
        body: JSON.stringify(body),
        signal: options.signal,
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new OpenRouterError(
          `OpenRouter returned ${res.status} for ${options.stage}: ${detail.slice(0, 300)}`,
          res.status,
          RETRY_STATUS.has(res.status),
        )
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[]
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          completion_tokens_details?: { reasoning_tokens?: number }
          cost?: number
          is_byok?: boolean
          cost_details?: { upstream_inference_cost?: number }
        }
      }

      const choice = json.choices?.[0]
      const raw = choice?.message?.content
      const reasoningTokens = json.usage?.completion_tokens_details?.reasoning_tokens ?? 0

      /**
       * The failure this branch exists for, found on the first live call.
       *
       * A reasoning model that runs out of budget mid-thought returns HTTP 200,
       * finish_reason "length", a full completion_tokens count and content of
       * null. Read naively that is indistinguishable from an empty answer, and
       * the fix -- raise the budget -- is the opposite of what "returned nothing"
       * suggests. Diagnosed once here so nobody has to diagnose it again.
       */
      /**
       * Ran out of budget mid-thought. Try once more with twice as much.
       *
       * This is worth recovering from rather than reporting, because it is not
       * really an error: the stage asked a reasoning model to think inside a
       * budget, and how much thinking a given document needs is not knowable in
       * advance. Reasoning varies by a few hundred tokens between runs on the
       * same input, so a stage sized against one observed run is one unlucky run
       * from failing -- which it did, on a live upload, on the smallest stage.
       *
       * Doubling is free in every sense that matters: billing is on tokens
       * actually produced, so a budget that is never reached costs nothing, and
       * the schema bounds the answer regardless. Only the second failure is
       * reported, and it says what to change.
       */
      if (!raw && choice?.finish_reason === 'length') {
        if (!doubled) {
          doubled = true
          body.max_tokens = (body.max_tokens as number) * 2
          // Not a failed attempt: nothing went wrong, the budget was too small.
          attempt -= 1
          continue
        }
        throw new OpenRouterError(
          `${options.stage}: the model exhausted its ${body.max_tokens}-token budget on reasoning ` +
            `(${reasoningTokens} reasoning tokens) and returned no answer, twice. ` +
            `Raise maxTokens for this stage.`,
          undefined,
          false,
        )
      }
      if (!raw) {
        throw new OpenRouterError(
          `${options.stage}: OpenRouter returned no content (finish_reason=${choice?.finish_reason ?? 'unknown'})`,
        )
      }

      return {
        data: (options.schema ? JSON.parse(raw) : raw) as T,
        raw,
        call: {
          stage: options.stage,
          model,
          promptTokens: json.usage?.prompt_tokens ?? 0,
          completionTokens: json.usage?.completion_tokens ?? 0,
          reasoningTokens,
          costUsd: costOf(json.usage),
          ms: Date.now() - startedAt,
        },
      }
    } catch (error) {
      lastError = error
      const retryable = !(error instanceof OpenRouterError) || error.retryable
      if (!retryable || attempt === MAX_ATTEMPTS) break
      await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw lastError
}
