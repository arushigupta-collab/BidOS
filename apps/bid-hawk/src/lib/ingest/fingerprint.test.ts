/**
 * @vitest-environment node
 *
 * A document is identified by its bytes, and only by its bytes.
 *
 * Two code paths write `rfp_documents`: `api/ingest/start`, when a file is
 * uploaded through the screen, and `persistRun`, when the CLI pushes a run. They
 * disagreed, and the disagreement was invisible until somebody uploaded the same
 * tender twice.
 *
 * `start` stored the real SHA-256. `finish` then called `persistRun` with the
 * document's UUID in place of its hash, and the upsert wrote that over the top.
 * From then on the file no longer matched itself: the next upload computed the
 * real hash, found nothing, and collided with the unique constraint instead --
 * surfacing on screen as an upload that never finished.
 *
 * These assert the properties that make that impossible, without touching a
 * database: what a fingerprint has to look like, and that nothing invents one.
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

/** SHA-256 of no bytes at all. Passes a shape check while meaning nothing. */
const EMPTY_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const HEX64 = /^[0-9a-f]{64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('what a document fingerprint is', () => {
  it('is the hash of the file, stable across reads', async () => {
    const bytes = await readFile('public/rfp/aaple-sarkar-2.0-rfp.pdf')
    const once = createHash('sha256').update(bytes).digest('hex')
    const twice = createHash('sha256').update(bytes).digest('hex')

    expect(once).toMatch(HEX64)
    expect(once).toBe(twice)
    expect(once).not.toBe(EMPTY_SHA)
  })

  it('is not a UUID, which is the shape that was written over it', () => {
    // The defect in one line: an identifier and a fingerprint are both strings,
    // and only one of them says anything about the bytes.
    const identifier = '542428cf-829e-4c40-b247-3def3f1dda9c'
    expect(identifier).toMatch(UUID)
    expect(identifier).not.toMatch(HEX64)
  })

  it('distinguishes an empty read from a real one', async () => {
    expect(createHash('sha256').update(Buffer.alloc(0)).digest('hex')).toBe(EMPTY_SHA)
    const bytes = await readFile('public/rfp/aaple-sarkar-2.0-rfp.pdf')
    expect(createHash('sha256').update(bytes).digest('hex')).not.toBe(EMPTY_SHA)
  })
})

describe('who is allowed to write one', () => {
  it('finish passes null rather than inventing a fingerprint', async () => {
    // The upload path stores the file and hashes it before any model runs, so
    // the stage that finishes the reading has nothing to add and must say so.
    const source = await readFile('api/ingest/finish.ts', 'utf8')
    expect(source).toMatch(/sha256:\s*null/)
    expect(source).not.toMatch(/sha256:\s*documentId/)
  })

  it('persist leaves an existing document row alone', async () => {
    const source = await readFile('src/lib/ingest/persist.ts', 'utf8')
    // Guarded on the row not already existing: the upload path created it, and
    // rewriting it is what destroyed the hash.
    expect(source).toMatch(/if \(byId\.length === 0 && run\.sha256\)/)
  })
})
