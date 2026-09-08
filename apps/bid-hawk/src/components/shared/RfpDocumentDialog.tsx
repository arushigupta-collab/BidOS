import { useEffect, useState } from 'react'
import { Dialog, Spinner, StatusBanner } from '@/components/ui'
import { RFP_DOCUMENT_LABEL, rfpDocumentHref } from '@/lib/rfpDocument'
import type { TenderDocument } from '@/data/uploaded'

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
   * Which document to show, as one of three named states.
   *
   * It was `string | null`, where null meant the bundled document -- so a tender
   * with NO document was indistinguishable from a tender whose document happens
   * to be the bundled one, and thirteen seeded tenders took the wrong branch.
   * Use `documentFor(tender)`.
   */
  document: TenderDocument
}

export function RfpDocumentDialog({ open, onOpenChange, title, document }: RfpDocumentDialogProps) {
  const [src, setSrc] = useState<string | null>(
    document.kind === 'bundled' ? rfpDocumentHref() : null,
  )
  const [missing, setMissing] = useState(document.kind === 'none')

  const rfpId = document.kind === 'stored' ? document.rfpId : null

  useEffect(() => {
    // A tender with no document has nothing to fetch and says so; the bundled one
    // is on disk and needs no signing.
    if (document.kind === 'none') {
      setSrc(null)
      setMissing(true)
      return
    }
    if (document.kind === 'bundled') {
      setSrc(rfpDocumentHref())
      setMissing(false)
      return
    }
    if (!open) return

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
  }, [open, rfpId, document.kind])

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
          description={
            document.kind === 'none'
              ? 'This is a sourced listing rather than a document this workspace holds. Upload the tender to read it here.'
              : 'It was read before the file was kept, so there is nothing to display. Reading it again stores the document alongside the result.'
          }
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
