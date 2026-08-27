import { AlertTriangle } from 'lucide-react'
import { ICON } from '@/lib/tokens'

/**
 * Says when something on screen did not reach the workspace.
 *
 * The partner screens write optimistically -- the registry updates before the
 * round trip, because waiting on the network to show a partner you just added
 * feels broken. The cost is that a failed write leaves the interface showing
 * something the database does not hold, and silence there is the worst outcome
 * available: work that looks saved and is gone on the next reload.
 */
export function SyncNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="flex items-start gap-8 rounded-control bg-warning-subtle ring-1 ring-inset ring-warning-border px-16 py-12 text-body text-fg"
    >
      <AlertTriangle size={ICON.sm} aria-hidden="true" className="mt-2 shrink-0 text-warning" />
      <span>
        {message} It is shown here but will not survive a reload. Check the connection and
        try again.
      </span>
    </div>
  )
}
