import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { documentIdFor, UPLOADED_SOURCE_ID } from '@/data/uploaded'
import { TENDERS } from '@/data/seed/tenders'

describe('which document a tender opens', () => {
  it('shows a reading its own stored file', () => {
    expect(documentIdFor({ id: 'abc-123', sourceId: UPLOADED_SOURCE_ID })).toBe('abc-123')
  })

  /*
   * Null, not undefined. The bundled document is a deliberate answer, and the
   * difference matters: `rfpId` was optional, and a screen that simply omitted it
   * got the bundled file for whatever tender it was on.
   */
  it('returns null for a seeded tender rather than nothing', () => {
    expect(documentIdFor({ id: 't-nhai-atms', sourceId: 's-etenders' })).toBeNull()
  })

  it('agrees with the seed: none of the fourteen has a stored document', () => {
    for (const tender of TENDERS) {
      expect(documentIdFor(tender), tender.tenderRef).toBeNull()
    }
  })
})

/**
 * The regression itself.
 *
 * The tracker and the ranked comparison rendered `<ViewRfpButton />` bare, so both
 * opened the one document that ships with the build regardless of the tender --
 * beside page citations pointing into a different document entirely. Nothing
 * failed, because the argument was optional and its absence had a plausible
 * meaning.
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

  it('passes rfpId at every call site', () => {
    const offenders: string[] = []
    for (const file of walk(ROOT)) {
      const source = readFileSync(file, 'utf8')
      // Each opening tag, up to its close. A bare <ViewRfpButton /> is the bug.
      for (const match of source.matchAll(/<ViewRfpButton\b[\s\S]*?\/?>/g)) {
        if (!/rfpId=/.test(match[0])) offenders.push(`${file.replace(ROOT, '')}: ${match[0]}`)
      }
    }
    expect(offenders, 'a View RFP with no rfpId opens the bundled document').toEqual([])
  })
})
