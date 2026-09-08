import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { RfpDocumentDialog } from './RfpDocumentDialog'
import type { TenderDocument } from '@/data/uploaded'

export interface ViewRfpButtonProps {
  /** Primary on the RFP summary, where it is the page's main action; secondary elsewhere. */
  variant?: 'primary' | 'secondary'
  /** Named on screens where the surrounding context does not already say which tender. */
  title?: string
  /** Which document, as one of three named states. See `documentFor(tender)`. */
  document: TenderDocument
}

/**
 * Opens the one source document this build holds, in place.
 *
 * It used to open a new tab, on the reasoning that a 262-page PDF replacing the
 * workspace would lose whatever the reader was comparing it against. The tab was
 * the wrong remedy for a real problem: handing a PDF to the browser puts it into
 * the browser's own handling, which on most configurations downloads the file
 * rather than displaying it. A reader wanting to check page 48 got a file in
 * their downloads folder and lost their place anyway.
 *
 * A dialog keeps the summary underneath and returns to it on Escape, which is
 * what the new tab was reaching for.
 *
 * Self-contained on purpose. Three screens offer this -- the RFP summary, the
 * response tracker's detail page and the ranked comparison -- and threading a
 * dialog's open state through three parents is three chances for one of them to
 * be wired differently.
 */
export function ViewRfpButton({ variant = 'secondary', title, document }: ViewRfpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        iconLeft={<FileText size={ICON.md} aria-hidden="true" />}
      >
        View RFP
      </Button>

      <RfpDocumentDialog open={open} onOpenChange={setOpen} title={title} document={document} />
    </>
  )
}
