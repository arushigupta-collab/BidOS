import { toast as sonner } from 'sonner'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastInput {
  description?: string
  action?: ToastAction
  /** null keeps the toast up until it is acknowledged. */
  durationMs?: number | null
}

const SELF_DISMISS_MS = 5200
/** sonner treats Infinity as "never dismiss on its own". */
const UNTIL_ACKNOWLEDGED = Number.POSITIVE_INFINITY

function emit(tone: ToastTone, title: string, { description, action, durationMs }: ToastInput) {
  // Warning and error report something the operator has to act on, so they wait
  // for acknowledgement. Success and info self-dismiss.
  const requiresAck = tone === 'warning' || tone === 'error'
  const duration =
    durationMs === null
      ? UNTIL_ACKNOWLEDGED
      : durationMs !== undefined
        ? durationMs
        : requiresAck
          ? UNTIL_ACKNOWLEDGED
          : SELF_DISMISS_MS

  return sonner[tone](title, {
    description,
    duration,
    action: action ? { label: action.label, onClick: action.onClick } : undefined,
  })
}

/** The one entry point for feature code. Typed by tone; never a bare string. */
export const toast = {
  success: (title: string, input: ToastInput = {}) => emit('success', title, input),
  info: (title: string, input: ToastInput = {}) => emit('info', title, input),
  warning: (title: string, input: ToastInput = {}) => emit('warning', title, input),
  error: (title: string, input: ToastInput = {}) => emit('error', title, input),
  dismiss: (id?: string | number) => sonner.dismiss(id),
}
