import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, Minus } from 'lucide-react'
import { Spinner, StatusDot } from '@/components/ui'
import { ICON, MOTION } from '@/lib/tokens'
import { STAGES, type StageId, type StageProgress } from './ingestClient'

/**
 * What the agent is doing, while it does it.
 *
 * Reading a 262-page tender takes over four minutes, and four minutes of a
 * spinner reads as a hang. More importantly, this is the one screen where the
 * work is otherwise invisible: the summary that comes out is only believable if
 * you watched which pages were read and which steps were skipped.
 *
 * Every row is present from the start, including the ones that will not run. A
 * trail that grows as it goes hides its own length.
 */

const ATTRIBUTION: Record<string, string> = {
  reading: 'Read',
  model: 'Agent',
  rules: 'Rules',
}

function StageIcon({ state }: { state: StageProgress['state'] }) {
  if (state === 'running') return <Spinner size="sm" />
  if (state === 'done') return <Check width={ICON.sm} height={ICON.sm} className="text-success-fg" />
  if (state === 'skipped') return <Minus width={ICON.sm} height={ICON.sm} className="text-fg-muted" />
  if (state === 'failed') return <AlertTriangle width={ICON.sm} height={ICON.sm} className="text-destructive-fg" />
  return <StatusDot tone="neutral" />
}

export interface StageTrailProps {
  progress: Partial<Record<StageId, StageProgress>>
}

export function StageTrail({ progress }: StageTrailProps) {
  const reduce = useReducedMotion()

  return (
    <ol className="flex w-full max-w-prose flex-col">
      {STAGES.map((spec, index) => {
        const state = progress[spec.id]?.state ?? 'waiting'
        const ms = progress[spec.id]?.ms
        const note = progress[spec.id]?.note
        const pending = state === 'waiting'

        return (
          <motion.li
            key={spec.id}
            initial={reduce ? false : { opacity: 0, y: MOTION.offset.rise }}
            animate={{ opacity: pending ? 0.55 : 1, y: 0 }}
            transition={{
              duration: reduce ? 0 : MOTION.duration.standard,
              ease: MOTION.ease.out,
              delay: reduce ? 0 : index * MOTION.stagger,
            }}
            className="flex items-start gap-12 border-b border-border-subtle py-12 last:border-b-0"
          >
            <span className="mt-2 flex h-16 w-16 shrink-0 items-center justify-center">
              <StageIcon state={state} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-8">
                <span className="text-body font-medium text-fg">{spec.label}</span>
                <span className="text-micro-label uppercase text-fg-muted">
                  {ATTRIBUTION[spec.by]}
                </span>
              </span>
              <span className="mt-2 block text-secondary-body text-fg-muted">
                {note ?? spec.detail}
              </span>
            </span>

            <span className="shrink-0 pt-2 text-metadata tabular-nums text-fg-muted">
              {state === 'skipped'
                ? 'not needed'
                : ms !== undefined
                  ? `${(ms / 1000).toFixed(1)}s`
                  : ''}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
