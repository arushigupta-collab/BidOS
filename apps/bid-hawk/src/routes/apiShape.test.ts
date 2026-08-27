import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Every file under `api/` is deployed as a serverless function, so what is in
 * that directory is a deployment decision rather than a filing one.
 *
 * Vercel exempts a leading underscore, which is the only way to keep shared code
 * beside the routes that use it. Without it a helper is published as an endpoint
 * that answers nothing, and a TEST FILE is published as an endpoint -- which is
 * what `api/tidyProse.test.ts` was about to become on the first deploy.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('the api directory only holds things that answer a request', () => {
  const ROOT = join(process.cwd(), 'api')

  it('gives every file either a default export or a leading underscore', () => {
    const wrong: string[] = []
    for (const file of walk(ROOT)) {
      if (!file.endsWith('.ts')) continue
      const name = file.split('/').pop() as string
      if (name.startsWith('_')) continue
      if (!/^export default/m.test(readFileSync(file, 'utf8'))) {
        wrong.push(`${name} would deploy as an endpoint and has no handler`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('keeps test files out of the deployed surface', () => {
    const tests = walk(ROOT)
      .map((f) => f.split('/').pop() as string)
      .filter((n) => n.includes('.test.') && !n.startsWith('_'))
    expect(tests, 'a test file in api/ is deployed as a function').toEqual([])
  })
})
