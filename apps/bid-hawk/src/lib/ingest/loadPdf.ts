/**
 * Text-layer extraction. Node-only: unpdf pulls in a pdfjs build that has no
 * business in the browser bundle, and nothing under src/features imports this.
 *
 * Whitespace is collapsed per page because the source PDF wraps mid-phrase, and
 * a newline inside "180 (One\nHundred and Eighty) days" otherwise hides the value
 * from every pattern that looks for it.
 */
import { extractText, getDocumentProxy } from 'unpdf'
import type { Page } from './pageIndex'

export interface LoadedDocument {
  pageCount: number
  pages: Page[]
  /** Pages with no usable text layer. These, and only these, need the VLM. */
  scannedPages: number[]
}

/** Below this, a page is treated as having no usable text layer. */
const MIN_TEXT_CHARS = 40

export async function loadPdf(bytes: Uint8Array): Promise<LoadedDocument> {
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: false })
  const raw = text as string[]

  const pages: Page[] = raw.map((t, i) => ({
    pageNo: i + 1,
    text: t.replace(/\s+/g, ' ').trim(),
  }))

  return {
    pageCount: pdf.numPages,
    pages,
    scannedPages: pages.filter((p) => p.text.length < MIN_TEXT_CHARS).map((p) => p.pageNo),
  }
}
