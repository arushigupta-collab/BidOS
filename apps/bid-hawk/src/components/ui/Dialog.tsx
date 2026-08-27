import type { ReactNode } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { Button } from './Button'
import { IconButton } from './IconButton'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Short, focused, never nested, and never a home for a multi-step form. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  // Radix warns when a dialog has no description. An explicit undefined is its
  // documented acknowledgement that none is wanted.
  const describedBy = description ? {} : { 'aria-describedby': undefined }

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-dialog bg-overlay/scrim" />
        <RadixDialog.Content
          {...describedBy}
          className={cn(
            'fixed left-1/2 top-1/2 z-dialog flex w-palette max-w-[calc(100vw-var(--space-32))]',
            '-translate-x-1/2 -translate-y-1/2 flex-col gap-16',
            'rounded-overlay bg-surface-overlay p-24 shadow-dialog',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-16">
            <div className="flex min-w-0 flex-col gap-8">
              <RadixDialog.Title className="text-section-title text-fg">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-secondary-body text-fg-secondary">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton
                label="Close"
                size="sm"
                icon={<X size={ICON.md} aria-hidden="true" />}
              />
            </RadixDialog.Close>
          </div>

          {children}

          {footer && <div className="flex items-center justify-end gap-8">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** States the consequence in full. Never "are you sure?". */
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  pending?: boolean
  destructive?: boolean
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  pending = false,
  destructive = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          {/* A destructive confirm never holds default focus. */}
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
