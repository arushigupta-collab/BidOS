import { describe, expect, it } from 'vitest'
import { resolveRfpHref } from './rfpDocument'

const PDF = 'rfp/aaple-sarkar-2.0-rfp.pdf'

/**
 * The document link is the one path in the product that cannot be written the same
 * way for both targets, because what a relative reference resolves against differs.
 * Both branches are exercised here from a NESTED route, which is where the wrong
 * answer shows up — at the root both forms happen to work.
 */
describe('Where the source RFP resolves', () => {
  describe('offline, hash routing', () => {
    const base = 'file:///Users/x/bidos/dist-offline/index.html'

    it('resolves against the document from every route, because a fragment cannot', () => {
      for (const route of ['', '#/feed', '#/feed/t-railtel-wifi', '#/bid-hawk']) {
        expect(resolveRfpHref(true, `${base}${route}`)).toBe(
          `file:///Users/x/bidos/dist-offline/${PDF}`,
        )
      }
    })

    it('never produces a root-relative path, which on file:// means the disk root', () => {
      const href = resolveRfpHref(true, `${base}#/feed/t-hal-plm`)

      expect(href.startsWith('file:///')).toBe(true)
      expect(href).not.toBe(`/${PDF}`)
      // The route never leaks into the document path.
      expect(href).not.toContain('feed')
      expect(href).not.toContain('#')
    })
  })

  describe('web, browser routing', () => {
    it('is root-relative, so a nested route cannot bend it', () => {
      for (const base of [
        'https://bidos.example/',
        'https://bidos.example/feed',
        'https://bidos.example/feed/t-railtel-wifi',
        'https://bidos.example/bid-hawk',
      ]) {
        expect(resolveRfpHref(false, base)).toBe(`/${PDF}`)
      }
    })

    it('would have broken had it been resolved relatively', () => {
      // The bug this avoids, stated so the reason for the branch is not lost:
      // relative resolution from /feed/:id lands the document inside the route.
      const wrong = new URL(PDF, 'https://bidos.example/feed/t-railtel-wifi').pathname
      expect(wrong).toBe('/feed/rfp/aaple-sarkar-2.0-rfp.pdf')
      expect(resolveRfpHref(false, 'https://bidos.example/feed/t-railtel-wifi')).not.toBe(wrong)
    })
  })
})
