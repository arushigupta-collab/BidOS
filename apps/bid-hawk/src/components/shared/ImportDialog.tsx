import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button, Dialog } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ImportReport } from '@/lib/importReport'
import { ICON } from '@/lib/tokens'

/**
 * CSV and its tab-separated sibling only. A .xlsx is a ZIP archive and reading it
 * would mean shipping a spreadsheet parser; the file picker therefore does not
 * offer a format that would be refused. A workbook dropped on the zone anyway is
 * still recognised and answered by name, because a drop cannot be filtered.
 */
const ACCEPT = '.csv,.tsv,text/csv'
const PREVIEW_ROWS = 6

export interface ImportDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (report: ImportReport<T>) => void
  pending: boolean
  title: string
  description: string
  /** Parses the file text into rows that can be added and rows that cannot. */
  read: (text: string) => ImportReport<T>
  template: string
  templateFileName: string
  previewHeaders: string[]
  /** Singular noun for the confirm label, e.g. "source" or "person". */
  noun: string
  pluralNoun: string
}

export function ImportDialog<T>({
  open,
  onOpenChange,
  onConfirm,
  pending,
  title,
  description,
  read,
  template,
  templateFileName,
  previewHeaders,
  noun,
  pluralNoun,
}: ImportDialogProps<T>) {
  const [report, setReport] = useState<ImportReport<T> | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const readFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setReport(read(String(reader.result ?? '')))
    reader.onerror = () =>
      setReport({ accepted: [], rejected: [], fatal: 'The file could not be read.' })
    reader.readAsText(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = templateFileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setReport(null)
    setFileName('')
  }

  const accepted = report?.accepted ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title={title}
      description={description}
      className="w-import"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={accepted.length === 0}
            loading={pending}
            onClick={() => report && onConfirm(report)}
          >
            {accepted.length === 0
              ? `Add ${pluralNoun}`
              : `Add ${accepted.length} ${accepted.length === 1 ? noun : pluralNoun}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-16">
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex w-fit items-center gap-8 rounded-field text-label text-primary underline decoration-primary-border underline-offset-4 transition-colors duration-micro ease-out hover:decoration-primary"
        >
          <Download size={ICON.sm} aria-hidden="true" />
          Download the CSV template
        </button>

        {/* Dropping is the shortcut; the button inside is the path that works
            without a pointer. The zone itself claims no role, so assistive
            technology is offered the button rather than a div to guess at. */}
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-8 rounded-card px-24 py-32 text-center',
            'transition-colors duration-micro ease-out',
            dragging ? 'bg-surface-selected' : 'bg-surface-sunken',
          )}
        >
          <FileSpreadsheet size={ICON.xl} aria-hidden="true" className="text-fg-muted" />
          <p className="text-body text-fg-secondary">
            {fileName === '' ? 'Drop a CSV here, or choose one' : fileName}
          </p>
          <p className="text-helper text-fg-muted">
            CSV or tab-separated. Export a workbook as CSV first.
          </p>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Upload size={ICON.sm} aria-hidden="true" />}
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) readFile(file)
            }}
          />
        </div>

        {report?.fatal && (
          <p
            role="status"
            className="flex items-start gap-8 rounded-control bg-destructive-subtle px-12 py-8 text-secondary-body text-destructive"
          >
            <AlertTriangle size={ICON.md} aria-hidden="true" className="mt-2 shrink-0" />
            <span>{report.fatal}</span>
          </p>
        )}

        {report && !report.fatal && (
          <div role="status" className="flex flex-col gap-12">
            <p className="flex flex-wrap items-center gap-x-16 gap-y-4">
              <span className="flex items-center gap-8 text-body text-success">
                <CheckCircle2 size={ICON.md} aria-hidden="true" />
                {`${accepted.length} accepted`}
              </span>
              {report.rejected.length > 0 && (
                <span className="flex items-center gap-8 text-body text-warning">
                  <AlertTriangle size={ICON.md} aria-hidden="true" />
                  {`${report.rejected.length} rejected`}
                </span>
              )}
            </p>

            {accepted.length > 0 && (
              <div className="scrollable max-h-preview rounded-card bg-surface-sunken">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      {previewHeaders.map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="border-b border-border px-12 py-8 text-micro-label uppercase text-fg-muted"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accepted.slice(0, PREVIEW_ROWS).map((row) => (
                      <tr key={row.line}>
                        {row.preview.map((cell, index) => (
                          <td
                            key={previewHeaders[index] ?? index}
                            className={cn(
                              'border-b border-border px-12 py-8',
                              index === 0
                                ? 'text-table-cell text-fg'
                                : 'text-metadata text-fg-muted',
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accepted.length > PREVIEW_ROWS && (
                  <p className="px-12 py-8 text-metadata text-fg-muted">
                    {`and ${accepted.length - PREVIEW_ROWS} more`}
                  </p>
                )}
              </div>
            )}

            {report.rejected.length > 0 && (
              <ul className="flex flex-col gap-4">
                {report.rejected.map((row) => (
                  <li
                    key={row.line}
                    className="flex flex-wrap items-baseline gap-8 rounded-control bg-warning-subtle px-12 py-8"
                  >
                    <span className="numeric shrink-0 font-mono text-metadata-strong text-warning">
                      {`Line ${row.line}`}
                    </span>
                    <span className="text-secondary-body text-fg-secondary">{row.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
