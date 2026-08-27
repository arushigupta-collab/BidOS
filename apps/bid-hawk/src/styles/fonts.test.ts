import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const require = createRequire(join(root, 'package.json'))
const read = (relative: string) => readFileSync(join(root, relative), 'utf8')

const FONTS_CSS = read('src/styles/fonts.css')
const BASE_CONFIG = read('vite.config.base.ts')
const WEB_CONFIG = read('vite.config.ts')
const OFFLINE_CONFIG = read('vite.config.offline.ts')

/** The built stylesheet for a target, whatever the emitted filename. */
function builtCss(dir: string): string | null {
  const assets = join(root, dir, 'assets')
  if (!existsSync(assets)) return null
  const file = readdirSync(assets).find((name) => name.endsWith('.css'))
  return file ? readFileSync(join(assets, file), 'utf8') : null
}

const TARGETS = [
  { name: 'web', dir: 'dist' },
  { name: 'offline', dir: 'dist-offline' },
]

/**
 * Both faces are inlined on BOTH targets. On offline that is correctness — a
 * file:// origin is opaque, so a sibling woff2 can be refused as cross-origin and
 * the page drops silently to a system face. On web it removes two render-blocking
 * requests. The guarantee is asserted rather than assumed, and asserted for each
 * target rather than for one and hoped for the other.
 */
describe('Self-hosted typefaces', () => {
  it('declares exactly the two families the type system names', () => {
    const families = [...FONTS_CSS.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1])
    expect(families).toEqual(['Inter', 'JetBrains Mono'])
  })

  it('covers the whole weight range from one variable file per family', () => {
    const weights = [...FONTS_CSS.matchAll(/font-weight:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(weights).toEqual(['100 900', '100 900'])
    expect(FONTS_CSS).not.toContain('font-style: italic')
  })

  it('points at woff2 files that are present and genuinely woff2', () => {
    const sources = [...FONTS_CSS.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1])
    expect(sources).toHaveLength(2)

    for (const source of sources) {
      const resolved = require.resolve(source)
      const head = readFileSync(resolved).subarray(0, 4).toString('latin1')
      expect(head, `${source} is not a woff2 file`).toBe('wOF2')
    }
  })

  it('inlines woff2 from the shared config, so neither target can lose it', () => {
    // The rule lives once, in the config both targets extend.
    expect(BASE_CONFIG).toMatch(/assetsInlineLimit[\s\S]*\.woff2/)

    // And neither target overrides it, which is the way it would drift.
    for (const [name, config] of [
      ['web', WEB_CONFIG],
      ['offline', OFFLINE_CONFIG],
    ] as const) {
      expect(config, `${name} target must not override the inline rule`).not.toContain(
        'assetsInlineLimit',
      )
    }
  })

  for (const target of TARGETS) {
    const css = builtCss(target.dir)

    it.runIf(css !== null)(`ships both faces inlined in the ${target.name} build`, () => {
      const inlined = [
        ...(css as string).matchAll(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g),
      ]

      expect(inlined).toHaveLength(2)
      for (const [, base64] of inlined) {
        const buffer = Buffer.from(base64, 'base64')
        expect(buffer.subarray(0, 4).toString('latin1')).toBe('wOF2')
      }
      expect(css as string).not.toMatch(/url\((?!data:)[^)]*\.woff2\)/)
    })
  }
})
