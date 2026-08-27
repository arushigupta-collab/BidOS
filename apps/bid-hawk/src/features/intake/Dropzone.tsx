import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui'
import { ICON } from '@/lib/tokens'
import { cn } from '@/lib/cn'

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

        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          Choose a file
        </Button>

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
