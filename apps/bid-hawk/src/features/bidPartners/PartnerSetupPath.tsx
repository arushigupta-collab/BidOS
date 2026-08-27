import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ICON, MOTION } from '@/lib/tokens'
import { criteriaSentence } from '@/features/bidPartners/evaluation/evaluationModel'
import { useWorkspace } from '@/store/useWorkspace'
import { SetupStepRow } from '@/components/shared/SetupStepRow'

export interface PartnerSetupPathProps {
  /** Returns to State A. Opening setup must not be a one-way door. */
  onBack: () => void
}

/**
 * Bid Partners' three stages. NOT a setup checklist, and deliberately with no completion
 * state at all.
 *
 * These are the module's three stages — Partner Registry, Response Tracker, Partner
 * Evaluation — and all three always exist. There is nothing to complete: partners and
 * their invitations load from seed, so `complete` was true for rows 01 and 02 on a fresh
 * load before the reader had done anything. Two permanent ticks and one ordinal read as
 * broken numbering and invited the question "what are those ticks asking of me", whose
 * honest answer is nothing.
 *
 * Every row shows its ordinal, always. The action label still reports whether that side
 * has been started, which is the part that was carrying real information.
 *
 * Bid Hawk's setup path is genuinely different — its workspace starts empty and a source
 * or a person has to be created — but it does not use `complete` either: it flips its
 * button labels and reveals an "Open the RFP feed" action once both steps are done. So
 * `SetupStepRow`'s completion capability now has no consumer. It is kept rather than
 * removed, on instruction; see docs/decisions.md.
 */
export function PartnerSetupPath({ onBack }: PartnerSetupPathProps) {
  const navigate = useNavigate()
  const partners = useWorkspace((state) => state.partners.length)
  const invitations = useWorkspace((state) => state.invitations.length)
  const responded = useWorkspace(
    (state) => state.invitations.filter((row) => row.status === 'submitted').length,
  )
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

  const steps = [
    {
      step: '01',
      heading: 'Register and invite partners',
      detail:
        'Hold what each partner can do, where they work and what they are certified for, then send them an RFP with the documents you need back.',
      action: partners > 0 ? 'Manage partners' : 'Register partners',
      to: '/bid-partners/registry',
      primary: true,
    },
    {
      step: '02',
      heading: 'Track their responses',
      detail:
        'See what has come in against each RFP and what is still outstanding, partner by partner and document by document.',
      action: invitations > 0 ? 'Open the tracker' : 'Track responses',
      to: '/bid-partners/responses',
      primary: false,
    },
    {
      step: '03',
      heading: 'Evaluate and choose',
      // Names all five criteria, in the same order and the same words as the comparison
      // page's own criteria sentence, so the two screens cannot disagree. It named three
      // until Technical capability and Documentation were added; a row that promises a
      // shorter list than the screen it links to is a row that will be believed and then
      // contradicted one click later.
      detail: `Rank the partners who responded on ${criteriaSentence()}, and see the reasoning behind the ranking.`,
      action: responded > 0 ? 'Open evaluation' : 'Evaluate partners',
      to: '/bid-partners/evaluation',
      primary: false,
    },
  ]

  return (
    <div className="flex flex-col items-center gap-24">
      <ol className="flex w-full max-w-step flex-col gap-16">
        {steps.map((step, index) => (
          <motion.li key={step.step} {...enter(index)}>
            <SetupStepRow
              step={step.step}
              heading={step.heading}
              detail={step.detail}
              action={
                <Button
                  ref={step.primary ? firstAction : undefined}
                  variant={step.primary ? 'primary' : 'secondary'}
                  iconRight={<ArrowRight size={ICON.md} aria-hidden="true" />}
                  onClick={() => navigate(step.to)}
                >
                  {step.action}
                </Button>
              }
            />
          </motion.li>
        ))}
      </ol>

      {/* Returns to State A, not to the platform. Getting to the platform is the
          shell's job — the EMB logo and the "BidOS" nav item both do it from every
          route — so this control has one unambiguous destination. */}
      <motion.div {...enter(3)}>
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
