/**
 * @vitest-environment node
 *
 * What must never reach a browser.
 *
 * The ingestion pipeline lives under src/lib/ingest and is server-only: it holds
 * the OpenRouter key handling, the model identifiers, and a pdfjs build pulled in
 * by unpdf. Nothing under src/features imports any of it, so tree-shaking keeps
 * it out of both bundles -- but that is a property of the import graph, and an
 * import graph is one careless line away from changing.
 *
 * A `VITE_`-prefixed variable is inlined into the bundle by Vite as a literal.
 * The day someone reaches for `import.meta.env.VITE_OPENROUTER_API_KEY` because
 * it is convenient, this test is what says no.
 *
 * Skipped when a target has not been built, so a fresh clone still passes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const TARGETS = [
  { name: 'web', dir: 'dist' },
  { name: 'offline', dir: 'dist-offline' },
]

/**
 * Everything in a target's assets folder, concatenated.
 *
 * Returns empty rather than throwing when the target has not been built.
 * `describe.runIf` skips the tests but still evaluates the block to collect
 * them, so a fresh clone that ran `npm run build` and not `build:offline` hit
 * ENOENT here during collection -- a failure in the guard rather than in the
 * thing being guarded.
 */
function bundle(dir: string): string {
  const assets = join(root, dir, 'assets')
  if (!existsSync(assets)) return ''
  return readdirSync(assets)
    .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n')
}

/**
 * Each entry is a string that only exists in server-only code. A hit means the
 * ingestion path has been imported into the client graph.
 */
const FORBIDDEN: { needle: string; why: string }[] = [
  { needle: 'OPENROUTER_API_KEY', why: 'the OpenRouter key must never be readable in a browser' },
  { needle: 'openrouter.ai', why: 'the model endpoint is called from the server, never the client' },
  { needle: 'sk-or-v1-', why: 'an OpenRouter key literal has been committed into the source' },
  { needle: 'SUPABASE_SERVICE_ROLE_KEY', why: 'the service-role key bypasses every policy and is server-only' },
  { needle: 'service_role', why: 'a service-role token has reached the client graph' },
  { needle: 'commercial_terms', why: 'the extraction schemas are server-only' },
]

for (const target of TARGETS) {
  describe.runIf(existsSync(join(root, target.dir, 'index.html')))(
    `the ${target.name} bundle`,
    () => {
      const code = bundle(target.dir)

      // Without this, an empty or misread assets folder would make every
      // assertion below pass by finding nothing in nothing.
      it('was actually read, so the assertions below mean something', () => {
        expect(code.length).toBeGreaterThan(100_000)
        expect(code).toContain('Bid Hawk')
      })

      for (const { needle, why } of FORBIDDEN) {
        it(`does not contain "${needle}" -- ${why}`, () => {
          expect(code).not.toContain(needle)
        })
      }

      it('does not bundle the PDF reader, which is a server dependency', () => {
        expect(code).not.toMatch(/unpdf|pdfjs-dist|GlobalWorkerOptions/)
      })

      if (target.name === 'offline') {
        /**
         * The offline target exists because demos get run on machines with no
         * network, opened from a folder by double-click. A build that reaches for
         * a remote host there does not degrade gracefully -- it hangs on a screen
         * somebody is presenting.
         *
         * `__OFFLINE__` is replaced with a literal at build time, so every branch
         * guarding a database call folds away and the client is dropped entirely.
         * This asserts the folding actually happened, which no runtime check can:
         * by the time this build runs, there is nothing left to interrogate.
         */
        it('reaches no network at all: no database client, no remote host', () => {
          expect(code).not.toMatch(/supabase\.co/)
          expect(code).not.toMatch(/createClient/)
          expect(code).not.toMatch(/VITE_SUPABASE_URL/)
        })
      }
    },
  )
}
