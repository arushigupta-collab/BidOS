import { useEffect, useState } from 'react'
import { Dialog, Spinner, StatusBanner } from '@/components/ui'
import { RFP_DOCUMENT_LABEL, rfpDocumentHref } from '@/lib/rfpDocument'

/**
 * The tender document, read in place.
 *
 * Every figure on the summary page came off a numbered page of this file, and a
 * reader checking one should not have to leave the summary to do it. Opening it
 * in a new tab pushed the document into the browser's own handling, where it
 * frequently downloads rather than displays -- so a reader wanting to look at
 * page 48 got a file in their downloads folder and lost their place.
 *
 * An iframe rather than a rendering library: the browser already has a PDF
 * viewer, it has page navigation and search built in, and shipping a second one
 * would add a megabyte to the bundle to do worse.
 */
export interface RfpDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The tender's title, so the dialog says which document this is. */
  title?: string
  /**
   * The reading whose document to show, or null for the bundled one.
   *
   * REQUIRED, and null is the explicit way to ask for the document that ships
   * with the build. It was optional, and two of the three call sites omitted it
   * and silently got the bundled Aaple Sarkar PDF for whatever tender they were
   * on. An argument whose absence produces a plausible wrong answer is worse than
   * one that will not compile: use `documentIdFor(tender)`.
   */
  rfpId: string | null
}

export function RfpDocumentDialog({ open, onOpenChange, title, rfpId }: RfpDocumentDialogProps) {
  const [src, setSrc] = useState<string | null>(rfpId ? null : rfpDocumentHref())
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!open || !rfpId) return
    let live = true
    setSrc(null)
    setMissing(false)

    fetch('/api/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfpId }),
    })
      .then((res) => res.json())
      .then((json: { url: string | null }) => {
        if (!live) return
        if (json.url) setSrc(json.url)
        else setMissing(true)
      })
      .catch(() => live && setMissing(true))

    return () => {
      live = false
    }
  }, [open, rfpId])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? RFP_DOCUMENT_LABEL}
      description={title ? RFP_DOCUMENT_LABEL : undefined}
      className="h-[86vh] w-[min(96vw,72rem)] max-w-none"
    >
      {missing ? (
        <StatusBanner
          tone="info"
          title="This tender's document is not held"
          description="It was read before the file was kept, so there is nothing to display. Reading it again stores the document alongside the result."
        />
      ) : src ? (
        // FitH so the page arrives at the reader's width rather than at whatever
        // zoom the browser last used on some other document.
        <iframe
          src={`${src}#view=FitH`}
          title={RFP_DOCUMENT_LABEL}
          className="h-full w-full rounded-card bg-surface-sunken"
        />
      ) : (
        <div className="flex h-full items-center justify-center rounded-card bg-surface-sunken">
          <Spinner size="md" label="Opening the document" />
        </div>
      )}
    </Dialog>
  )
}
