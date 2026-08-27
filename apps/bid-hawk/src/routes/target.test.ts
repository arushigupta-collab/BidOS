import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The two build targets, asserted against their built output.
 *
 * These cannot be checked by calling application code, because the whole point of
 * `__OFFLINE__` is that it is replaced with a literal at build time and the losing
 * branch is folded away. Nothing is left at runtime to interrogate — so the artefact
 * is the thing under test.
 *
 * Each block is skipped when its output is absent, so a fresh clone still passes.
 * Run `npm run build` and `npm run build:offline` to exercise them.
 */

const root = process.cwd()

interface Target {
  name: string
  dir: string
  script: string
}

const WEB: Target = { name: 'web', dir: 'dist', script: 'npm run build' }
const OFFLINE: Target = { name: 'offline', dir: 'dist-offline', script: 'npm run build:offline' }

const built = (target: Target) => existsSync(join(root, target.dir, 'index.html'))
const html = (target: Target) => readFileSync(join(root, target.dir, 'index.html'), 'utf8')

/**
 * Every asset of a kind, concatenated.
 *
 * This used to take the FIRST matching file, which was fine while each build
 * emitted exactly one script. It stopped being fine when the database client was
 * given a dynamic import and Vite split it into its own chunk: the helper then
 * picked whichever of the two happened to sort first, and assertions about the
 * main bundle started passing or failing depending on a filename hash.
 *
 * Reading all of them asserts what these tests actually mean -- that the built
 * output contains a thing, or does not -- rather than that one arbitrary file does.
 */
function asset(target: Target, extension: string): string {
  const dir = join(root, target.dir, 'assets')
  const files = readdirSync(dir).filter((name) => name.endsWith(extension))
  expect(files.length, `no ${extension} in ${target.dir}/assets`).toBeGreaterThan(0)
  return files.map((file) => readFileSync(join(dir, file), 'utf8')).join('\n')
}

describe.runIf(built(WEB))('The web build', () => {
  it('serves from the site root as a real ES module', () => {
    const index = html(WEB)

    expect(index).toMatch(/<script[^>]*type="module"/)
    expect(index).toMatch(/src="\/assets\//)
    // Not the relative base the offline target needs.
    expect(index).not.toMatch(/src="\.\/assets\//)
  })

  it('carries no IIFE wrapper', () => {
    const js = asset(WEB, '.js')

    expect(js.trimEnd().endsWith('})();')).toBe(false)
    expect(js.trimStart().startsWith('(function(){')).toBe(false)
  })

  it('resolves to browser history, with the hash implementation folded out', () => {
    const js = asset(WEB, '.js')

    // The factory name survives inside a react-router error string, so the real
    // evidence is the history implementation it would have pulled in.
    expect(js).not.toContain('createHashHistory')
  })

  it('deploys the document as a static asset rather than inlining it', () => {
    expect(existsSync(join(root, WEB.dir, 'rfp/aaple-sarkar-2.0-rfp.pdf'))).toBe(true)
    expect(asset(WEB, '.js')).toContain('rfp/aaple-sarkar-2.0-rfp.pdf')
    expect(asset(WEB, '.js')).not.toContain('data:application/pdf')
  })
})

describe.runIf(built(OFFLINE))('The offline build', () => {
  it('opens from file://: relative base, classic script, no module attributes', () => {
    const index = html(OFFLINE)

    expect(index).toMatch(/src="\.\/assets\//)
    expect(index).not.toContain('type="module"')
    expect(index).not.toContain('crossorigin')
    // A classic script in <head> would run before #root exists.
    expect(index).toMatch(/<script\s+defer\s+src=/)
  })

  it('is one IIFE, the only shape a file:// page can load', () => {
    const js = asset(OFFLINE, '.js')

    expect(js.trimEnd().endsWith('})();')).toBe(true)
    expect(js).toContain('(function(){"use strict"')
  })

  it('resolves to hash history, with the browser factory folded out', () => {
    expect(asset(OFFLINE, '.js')).not.toContain('createBrowserRouter')
  })

  it('deploys the document as a sibling asset rather than inlining it', () => {
    expect(existsSync(join(root, OFFLINE.dir, 'rfp/aaple-sarkar-2.0-rfp.pdf'))).toBe(true)
    expect(asset(OFFLINE, '.js')).toContain('rfp/aaple-sarkar-2.0-rfp.pdf')
    expect(asset(OFFLINE, '.js')).not.toContain('data:application/pdf')
  })

  it('fetches nothing over the network', () => {
    const css = asset(OFFLINE, '.css')

    // Every url() is a data URI, so no sibling file is requested from an opaque
    // origin and no face can fall back silently to a system font.
    expect(css).not.toMatch(/url\((?!['"]?data:)/)
  })
})
