import { Toaster } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { ICON, OVERLAY } from '@/lib/tokens'

/**
 * sonner supplies the queue, the timers, the stacking and the swipe-to-dismiss.
 * Every visual value is ours: `unstyled` switches off its stylesheet so nothing
 * is inherited from the library, and each slot is a token class.
 */
export function ToastViewport() {
  return (
    <Toaster
      position="bottom-right"
      gap={OVERLAY.stackGap}
      offset={OVERLAY.viewportInset}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CheckCircle2 size={ICON.md} aria-hidden="true" className="text-success" />,
        info: <Info size={ICON.md} aria-hidden="true" className="text-info" />,
        warning: <AlertTriangle size={ICON.md} aria-hidden="true" className="text-warning" />,
        error: <XCircle size={ICON.md} aria-hidden="true" className="text-destructive" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-start gap-12 rounded-card bg-surface-overlay px-16 py-12 shadow-dropdown',
          content: 'flex min-w-0 flex-1 flex-col gap-4',
          title: 'text-body-strong text-fg',
          description: 'text-secondary-body text-fg-muted',
          icon: 'mt-2 shrink-0',
          actionButton:
            'shrink-0 rounded-control border border-secondary-border bg-secondary px-12 py-4 text-button-sm text-secondary-fg transition-colors duration-micro ease-out hover:bg-secondary-hover',
          closeButton:
            'grid h-20 w-20 place-items-center rounded-field text-fg-muted transition-colors duration-micro ease-out hover:bg-surface-hover hover:text-fg',
        },
      }}
    />
  )
}
