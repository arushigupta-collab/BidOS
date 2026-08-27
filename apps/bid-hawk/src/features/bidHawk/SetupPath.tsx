import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ICON, MOTION } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { SetupStepRow } from '@/components/shared/SetupStepRow'

export interface SetupPathProps {
  /** Returns to State A. Opening setup must not be a one-way door. */
  onBack: () => void
}

/**
 * Two steps, both available from the start.
 *
 * The ordinals are a suggested order rather than a requirement: both screens
 * exist, neither depends on the other, and an operator who would rather map their
 * team first is not wrong. Each action reports whether its side has been started,
 * so the row reads as a task or as a place to return to.
 *
 * Once both are done a third element appears: the feed, which is what setup was
 * for. It enters on the same stagger the rows use rather than announcing itself
 * with a pattern of its own.
 */
export function SetupPath({ onBack }: SetupPathProps) {
  const navigate = useNavigate()
  const hasSource = useWorkspace((state) => state.sources.length > 0)
  const hasPerson = useWorkspace((state) => state.people.length > 0)
  const reduce = useReducedMotion()
  const firstAction = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstAction.current?.focus()
  }, [])

  const enter = (index: number) =>
    reduce
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: MOTION.offset.rise },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: MOTION.duration.emphasis,
            ease: MOTION.ease.out,
            delay: index * MOTION.stagger,
          },
        }

  return (
    <div className="flex flex-col items-center gap-24">
      <ol className="flex w-full max-w-step flex-col gap-16">
        <motion.li {...enter(0)}>
          <SetupStepRow
            step="01"
            heading="Connect your platforms"
            detail="Add the e-procurement platforms to read, and the keywords that qualify a listing."
            action={
              <Button
                ref={firstAction}
                variant={hasSource && hasPerson ? 'secondary' : 'primary'}
                iconRight={<ArrowRight size={ICON.md} aria-hidden="true" />}
                onClick={() => navigate('/sources/new')}
              >
                {hasSource ? 'Manage sources' : 'Connect sources'}
              </Button>
            }
          />
        </motion.li>

        <motion.li {...enter(1)}>
          <SetupStepRow
            step="02"
            heading="Add your bid managers"
            detail="Record the domains and regions each bid manager covers, so a qualifying tender routes to the right owner."
            action={
              <Button
                variant="secondary"
                iconRight={<ArrowRight size={ICON.md} aria-hidden="true" />}
                onClick={() => navigate('/team/new')}
              >
                {hasPerson ? 'Manage people' : 'Add people'}
              </Button>
            }
          />
        </motion.li>
      </ol>

      <AnimatePresence>
        {hasSource && hasPerson && (
          <motion.div
            key="open-feed"
            {...enter(2)}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: MOTION.offset.rise }}
            className="flex w-full max-w-step flex-col items-center gap-12"
          >
            <p className="max-w-lede text-center text-secondary-body text-fg-muted">
              Bid Hawk has matched listings against your connected platforms and routed
              each one to a bid manager.
            </p>
            <Button
              variant="primary"
              iconRight={<ArrowRight size={ICON.md} aria-hidden="true" />}
              onClick={() => navigate('/feed')}
            >
              Open the RFP feed
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...enter(3)}>
        {/* Returns to State A, not to the platform. Getting to the platform is the
            shell's job — the EMB logo and the "BidOS" nav item both do it from every
            route — so this control has one unambiguous destination. */}
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={ICON.sm} aria-hidden="true" />}
          onClick={onBack}
        >
          Back
        </Button>
      </motion.div>
    </div>
  )
}
