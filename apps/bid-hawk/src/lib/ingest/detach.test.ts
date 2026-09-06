import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadPdf } from './loadPdf'

/**
 * pdf.js takes ownership of the array it is handed.
 *
 * This is not a detail of our code and cannot be worked around by being careful:
 * `loadPdf` detaches the buffer, and every byte of it is gone by the time it
 * returns. Anything that needs the file afterwards must have taken its own copy
 * first.
 *
 * It cost a real bug. `api/ingest/start.ts` uploaded to storage after parsing, so
 * every tender uploaded through the screen was stored as a 0-byte file -- and
 * nothing failed: the fingerprint and the page count are both computed before the
 * detach, so the database row looked perfect and the signed URL served an empty
 * PDF with a 200.
 */
describe('loadPdf takes ownership of what it is given', () => {
  const bytes = () =>
    new Uint8Array(readFileSync('public/rfp/aaple-sarkar-2.0-rfp.pdf'))

  it('leaves the array it was passed empty', async () => {
    const passed = bytes()
    expect(passed.byteLength).toBeGreaterThan(0)

    await loadPdf(passed)

    // If this ever starts failing, pdf.js has changed and the copy in start.ts
    // is no longer load-bearing. Confirm before removing it.
    expect(passed.byteLength).toBe(0)
  })

  /**
   * The shape start.ts uses. `.slice()` copies rather than viewing the same
   * buffer, so the parse cannot reach it -- `.subarray()` would NOT survive,
   * because it shares the buffer being detached.
   */
  it('cannot reach a copy taken with slice beforehand', async () => {
    const original = bytes()
    const forStorage = original.slice()
    const size = forStorage.byteLength

    await loadPdf(original)

    expect(original.byteLength).toBe(0)
    expect(forStorage.byteLength).toBe(size)
    expect(String.fromCharCode(...forStorage.slice(0, 5))).toBe('%PDF-')
  })

  it('does not survive subarray, which is why the copy is a slice', async () => {
    const original = bytes()
    const view = original.subarray()

    await loadPdf(original)

    expect(view.byteLength).toBe(0)
  })
})
