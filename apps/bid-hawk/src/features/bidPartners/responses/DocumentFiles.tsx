import { useRef, useState } from 'react'
import { Paperclip, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, IconButton } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { fileSize, removePartnerFile, signPartnerFile, uploadPartnerFile } from '@/data/partnerFiles'
import { markDocumentReceived } from '@/data/api'
import type { PartnerDocumentType } from '@/types'

/**
 * What a partner actually sent against one requested document.
 *
 * The tracker recorded a receipt and a hand-typed note -- "which thing arrived"
 * as prose, with the thing itself somewhere else entirely. A bid desk deciding
 * between partners on the strength of their technical proposals cannot do it from
 * a row that says a proposal exists.
 *
 * Several files per document, because one is the wrong number: a technical
 * proposal arrives as a proposal, an architecture note and a bill of materials,
 * and recording that as a single attachment loses two of the three.
 */
export function DocumentFiles({
  invitationId,
  documentType,
  partnerName,
}: {
  invitationId: string
  documentType: PartnerDocumentType
  partnerName: string
}) {
  const documentId = useWorkspace(
    (state) => state.documentIds.get(invitationId)?.get(documentType) ?? null,
  )
  const files = useWorkspace(
    (state) => state.partnerFiles.get(invitationId)?.get(documentType) ?? EMPTY,
  )
  const attachFile = useWorkspace((state) => state.attachFile)
  const detachFile = useWorkspace((state) => state.detachFile)

  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  /*
   * An invitation that was never written to the database has no document row to
   * attach to. Saying so beats a control that fails on click -- and it is a real
   * state: the offline build, and a workspace with no connection configured.
   */
  if (!documentId) {
    return (
      <p className="w-full text-caption text-fg-muted">
        Files can be attached once this invitation is saved to the workspace.
      </p>
    )
  }

  async function add(chosen: FileList | null) {
    if (!chosen?.length || !documentId) return
    setBusy(true)
    let added = 0
    try {
      for (const file of Array.from(chosen)) {
        const stored = await uploadPartnerFile(documentId, file)
        attachFile(invitationId, documentType, stored)
        added += 1
      }
      /*
       * The receipt follows the file rather than being ticked separately. A
       * document with a partner's proposal attached to it is submitted, and
       * leaving the operator to also mark it is how a tracker ends up reporting
       * outstanding work that is sitting in front of it.
       */
      await markDocumentReceived(invitationId, documentType, true)
      toast.success(`${added === 1 ? 'File' : `${added} files`} attached`, {
        description: `${documentType} from ${partnerName} is recorded as received.`,
      })
    } catch (caught) {
      toast.error('That file was not stored', { description: (caught as Error).message })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function open(storagePath: string, name: string) {
    try {
      const url = await signPartnerFile(storagePath)
      if (url) window.open(url, '_blank', 'noopener')
      else toast.error(`${name} could not be opened`)
    } catch (caught) {
      toast.error(`${name} could not be opened`, { description: (caught as Error).message })
    }
  }

  async function drop(fileId: string, name: string) {
    try {
      await removePartnerFile(fileId)
      detachFile(invitationId, documentType, fileId)
      toast.success(`${name} removed`)
    } catch (caught) {
      toast.error(`${name} could not be removed`, { description: (caught as Error).message })
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {files.length > 0 && (
        <ul className="flex flex-col gap-4">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-8 rounded-control bg-surface-sunken px-12 py-8"
            >
              <span className="min-w-0 flex-1 truncate text-body text-fg">{file.originalName}</span>
              <span className="numeric font-mono text-metadata text-fg-muted">
                {fileSize(file.sizeBytes)}
              </span>
              <IconButton
                label={`Open ${file.originalName}`}
                size="sm"
                icon={<ExternalLink size={ICON.sm} aria-hidden="true" />}
                onClick={() => void open(file.storagePath, file.originalName)}
              />
              <IconButton
                label={`Remove ${file.originalName}`}
                size="sm"
                icon={<Trash2 size={ICON.sm} aria-hidden="true" />}
                onClick={() => void drop(file.id, file.originalName)}
              />
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          id={`files-${invitationId}-${documentType}`}
          aria-label={`Attach files for ${documentType}, from ${partnerName}`}
          onChange={(event) => void add(event.target.files)}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          iconLeft={<Paperclip size={ICON.sm} aria-hidden="true" />}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Storing…' : files.length > 0 ? 'Attach more' : 'Attach files'}
        </Button>
      </div>
    </div>
  )
}

/** A stable empty array, so a document with no files does not re-render the row forever. */
const EMPTY: never[] = []
