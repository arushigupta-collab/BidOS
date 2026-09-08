import { useRef, useState } from 'react'
import { Mail, Upload } from 'lucide-react'
import { Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/toast'

/**
 * Where a tender comes in.
 *
 * Drag-and-drop with a real file input behind it rather than instead of it: a
 * drop target alone is unreachable from a keyboard, and this is the only way into
 * the screen.
 */

const ACCEPT = '.pdf,application/pdf'

export interface DropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  function accept(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setRefused(`${file.name} is not a PDF. Tender documents are published as PDF.`)
      return
    }
    setRefused(null)
    onFile(file)
  }

  return (
    <div className="w-full max-w-prose">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (!disabled) accept(e.dataTransfer.files[0])
        }}
        className={cn(
          'flex flex-col items-center gap-16 rounded-12 border border-dashed px-32 py-48 text-center transition-colors duration-standard',
          over ? 'border-primary bg-surface-selected' : 'border-border-strong bg-surface-sunken',
          disabled && 'opacity-60',
        )}
      >
        <Upload width={ICON.xl} height={ICON.xl} className="text-fg-subtle" aria-hidden />

        <div className="flex flex-col gap-4">
          <p className="text-panel-title text-fg">Drop a tender document here</p>
          <p className="text-secondary-body text-fg-muted">
            PDF, up to 400 pages. Nothing is read until you upload it.
          </p>
        </div>

        <div className="flex flex-col items-center gap-8">
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            Choose a file
          </Button>

          {/*
            * NOT WIRED, and it says so when pressed rather than doing nothing.
            *
            * Sourcing a tender from a mailbox is the second intake path this
            * product will need, and the button is here to show where it goes. A
            * control that looks live and silently does nothing is the worst of
            * the options available -- so this one names itself as unbuilt, which
            * is also what stops it being mistaken for working in a demo.
            */}
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Mail size={ICON.sm} aria-hidden="true" />}
            onClick={() =>
              toast.info('Email sync is not connected yet', {
                description:
                  'This is where a connected mailbox would be read for tenders that arrive as attachments. Upload the document for now.',
              })
            }
          >
            Sync Email
          </Button>
        </div>

        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {refused ? (
        <p role="alert" className="mt-12 text-secondary-body text-destructive-fg">
          {refused}
        </p>
      ) : null}
    </div>
  )
}
