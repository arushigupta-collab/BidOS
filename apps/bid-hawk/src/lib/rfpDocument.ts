/**
 * The one source document this environment holds: the Maharashtra RTS Aaple Sarkar
 * 2.0 RFP, 262 pages, at `public/rfp/`. Vite copies `public/` verbatim, so it
 * deploys as a static asset on both targets and is never inlined — a base64 PDF of
 * that size would be larger than the rest of the build put together.
 *
 * "View RFP" opens this file from every tender. One real document beats fourteen
 * controls that refuse to do anything.
 */
const RFP_DOCUMENT_PATH = 'rfp/aaple-sarkar-2.0-rfp.pdf'

/**
 * What the document is, for anywhere that has to say so out loud rather than just
 * link to it — a table row's accessible name, for instance.
 */
export const RFP_DOCUMENT_LABEL = 'Maharashtra RTS Aaple Sarkar 2.0 tender document'

/**
 * Where the document sits, for the active target. Pure, so both branches are
 * reachable from a test.
 *
 * The two targets need different answers, and the difference is entirely about what
 * a relative reference resolves against:
 *
 * - **Offline, hash routing.** At `#/feed/t-railtel-wifi` the document URL is still
 *   `…/index.html` with a fragment, and a fragment never participates in relative
 *   URL resolution. So `rfp/…` resolves against the directory holding index.html on
 *   every route. Resolved to an absolute URL here anyway, so what lands in the DOM
 *   is inspectable rather than something the browser works out later. A root-relative
 *   path would be wrong here: `/rfp/…` on a file:// origin points at the filesystem
 *   root, not at the build folder.
 *
 * - **Web, browser routing.** At `/feed/t-railtel-wifi` the document URL genuinely
 *   is that path, so `rfp/…` would resolve to `/feed/rfp/…` and 404. Root-relative
 *   is the only form that holds from a nested route, and it is correct because the
 *   web target is served from the site root (`base: '/'`).
 */
export function resolveRfpHref(offline: boolean, baseURI: string): string {
  return offline ? new URL(RFP_DOCUMENT_PATH, baseURI).href : `/${RFP_DOCUMENT_PATH}`
}

export function rfpDocumentHref(): string {
  return resolveRfpHref(__OFFLINE__, document.baseURI)
}
