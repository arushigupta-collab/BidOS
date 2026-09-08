import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { documentFor, BUNDLED_DOCUMENT_TENDER_ID, UPLOADED_SOURCE_ID } from '@/data/uploaded'
import { TENDERS } from '@/data/seed/tenders'

describe('which document a tender opens', () => {
  it('shows a reading its own stored file', () => {
    expect(documentFor({ id: 'abc-123', sourceId: UPLOADED_SOURCE_ID }))
      .toEqual({ kind: 'stored', rfpId: 'abc-123' })
  })

  /*
   * The bundled PDF is ONE tender's document. It was every seeded tender's,
   * because the argument was `string | null` and null meant "the file that ships
   * with the build" -- so a tender with no document and a tender whose document
   * is the bundled one were the same value, and thirteen of the fourteen took the
   * wrong branch. They opened a plausible document for the wrong tender, beside
   * page citations pointing into it.
   */
  it('gives the bundled document to the one tender it belongs to', () => {
    expect(documentFor({ id: BUNDLED_DOCUMENT_TENDER_ID, sourceId: 's-mahatenders' }))
      .toEqual({ kind: 'bundled' })
  })

  it('says a sourced listing has no document rather than lending it another', () => {
    expect(documentFor({ id: 't-nhai-atms', sourceId: 's-etenders' })).toEqual({ kind: 'none' })
  })

  it('holds that across the whole seed: one bundled, the rest none', () => {
    const kinds = TENDERS.map((tender) => documentFor(tender).kind)
    expect(kinds.filter((k) => k === 'bundled')).toHaveLength(1)
    expect(kinds.filter((k) => k === 'none')).toHaveLength(TENDERS.length - 1)
    expect(kinds).not.toContain('stored')
  })

  it('names a real tender as the bundled one, not a stale id', () => {
    expect(TENDERS.some((t) => t.id === BUNDLED_DOCUMENT_TENDER_ID)).toBe(true)
  })
})

/**
 * The regression this file exists for.
 *
 * The tracker and the ranked comparison rendered `<ViewRfpButton />` bare, so
 * both opened the bundled document regardless of the tender. Nothing failed,
 * because the argument was optional and its absence had a plausible meaning.
 *
 * A required union makes that impossible today. The grep makes it impossible
 * after someone widens the type again.
 */
describe('every View RFP says which document it means', () => {
  const ROOT = join(__dirname, '..', '..')

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full)
      return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [full] : []
    })
  }

  it('passes a document at every call site', () => {
    const offenders: string[] = []
    for (const file of walk(ROOT)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/<ViewRfpButton\b[\s\S]*?\/?>/g)) {
        if (!/document=/.test(match[0])) offenders.push(`${file.replace(ROOT, '')}: ${match[0]}`)
      }
    }
    expect(offenders, 'a View RFP with no document opens whatever it likes').toEqual([])
  })

  /*
   * And every one of them derives it, rather than restating the rule. Three call
   * sites restated it once and two got it wrong by omission.
   */
  it('derives it from documentFor rather than deciding locally', () => {
    const wrong: string[] = []
    for (const file of walk(ROOT)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/<ViewRfpButton\b[\s\S]*?\/?>/g)) {
        const value = /document=\{([^}]*)\}/.exec(match[0])?.[1] ?? ''
        if (!value.includes('documentFor(')) wrong.push(`${file.replace(ROOT, '')}: ${value}`)
      }
    }
    expect(wrong).toEqual([])
  })
})
