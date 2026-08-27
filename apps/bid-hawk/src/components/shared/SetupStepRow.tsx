import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'

export interface SetupStepRowProps {
  /** Rendered as a mono two-digit ordinal: 01, 02. A suggested order, not a gate. */
  step: string
  heading: string
  detail: string
  action: ReactNode
  /**
   * Marks the step as already satisfied, swapping the ordinal for a tick.
   *
   * NO CONSUMER AS OF THIS SESSION, and kept deliberately rather than deleted.
   *
   * Bid Partners passed it and stopped: its three rows are the module's stages rather than
   * a checklist, and because partners and invitations load from seed, rows 01 and 02 were
   * ticked on a fresh load before the reader had done anything. Bid Hawk never passed it —
   * its workspace does start empty, but it signals progress by flipping its button labels
   * and revealing an "Open the RFP feed" action, not with ticks.
   *
   * So this branch is currently unreachable. It was retained on instruction, against the
   * precedent that deleted the unused gradient tokens; anyone tidying up should know it is
   * unused rather than load-bearing. See docs/decisions.md.
   */
  complete?: boolean
  className?: string
}

/**
 * One step of setup, used by both modules' setup paths. Shared rather than living in
 * either feature folder, which is what CLAUDE.md requires of an app-level pattern.
 *
 * Every row renders identically: no step waits on another, so there is no recessed
 * state and no disabled action. The recession the
 * row used to carry described a dependency the product no longer has.
 *
 * The boundary comes from surface tone, not an outline.
 */
export function SetupStepRow({ step, heading, detail, action, complete = false, className }: SetupStepRowProps) {
  return (
    <div
      className={cn(
        'flex min-h-step-row flex-col gap-16 rounded-card bg-surface-sunken px-24 py-20',
        'sm:flex-row sm:items-center sm:gap-24',
        className,
      )}
    >
      {/* self-start plus the heading's own named style: the ordinal labels the
          heading, so it sits on the heading's first baseline rather than drifting
          to the centre of multi-line content. */}
      {/* A tick replaces the ordinal once the step is satisfied: the number says where
          in the sequence it sits, and that stops being the useful fact. Both branches are
          sized alike so a row does not change height or shift its left axis either way.
          Currently only the ordinal branch is reachable — see `complete` above. */}
      {complete ? (
        <span
          className="numeric mt-2 grid h-panel-title w-ordinal shrink-0 place-items-center self-start text-success"
          aria-hidden="true"
        >
          <Check size={ICON.md} />
        </span>
      ) : (
        <span
          className="numeric grid h-panel-title w-ordinal shrink-0 place-items-center self-start font-mono text-panel-title text-fg"
          aria-hidden="true"
        >
          {step}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-panel-title text-fg">
          <span className="sr-only">{`Step ${step}${complete ? ', complete' : ''}: `}</span>
          {heading}
        </p>
        <p className="max-w-lede text-secondary-body text-fg-muted">{detail}</p>
      </div>

      <div className="shrink-0">{action}</div>
    </div>
  )
}
