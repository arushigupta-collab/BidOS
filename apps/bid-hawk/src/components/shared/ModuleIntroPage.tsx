import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ListChecks } from 'lucide-react'
import { PresenceLayer } from '@/components/motion/PresenceLayer'
import { Link } from 'react-router-dom'
import { Button, Separator, buttonClasses } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ICON, MOTION } from '@/lib/tokens'
import { FlowBand, type Stage } from './FlowBand'

export interface ModuleIntroPageProps {
  /** The module's mark, from components/shell. */
  mark: ReactNode
  /** Uppercase micro-label above the name, e.g. "MODULE". Never "suite": BidOS has four
   *  modules and none of them is a suite. */
  microLabel: string
  name: string
  lede: string
  /** Exactly three, in the order the module runs them. */
  stages: Stage[]
  /** The module's setup path. Receives the handler that returns to State A. */
  renderSetup: (onBack: () => void) => ReactNode
  /**
   * What the primary says, and what opening it announces.
   *
   * Bid Partners opens a setup path; Bid Hawk opens the thing the module is for.
   * The two-state behaviour is the same either way, so only the words differ.
   */
  action?: { label: string; icon?: ReactNode; announcement?: string }
  /**
   * A second way in, rendered as a plain button beside the filled primary.
   *
   * Bid Hawk has two things behind its front door and they are not equals:
   * reading a tender is what the module is for, and configuring the platforms it
   * polls is preparation. One filled primary, one quiet secondary, so which is
   * which is not in question.
   */
  secondary?: {
    label: string
    icon?: ReactNode
    announcement?: string
    render: (onBack: () => void) => ReactNode
  }
  /**
   * A way OUT of the module rather than further into it.
   *
   * The other two actions open something in place; this one navigates. Kept as a
   * separate prop rather than a third variant of the same thing, because "opens a
   * panel here" and "leaves for another screen" are different promises and a
   * reader should be able to tell which they are about to get.
   */
  link?: { label: string; icon?: ReactNode; to: string }
  /** How many step rows the setup path has, for the announcement. */
  stepCount: number
}

/**
 * A module's landing: two states on one route, with no navigation between them.
 * State A's composition recedes in place and the setup sequence takes its position.
 *
 * Shared, because Bid Hawk and Bid Partners are the same screen with different
 * content, and a second copy of the two-state machinery would have been two copies
 * of the motion, the presence handling and the focus management. Everything module
 * specific arrives as a prop; the setup path itself is a render prop, because the two
 * modules have different steps and different completion rules.
 *
 * State A exists in both because the flow band explains HOW the module works, and
 * nothing on the BidOS landing says that — the module's card there says what it does.
 * The two are not the same fact, which is why neither replaces the other.
 *
 * "BACK" LEAVES FOR THE PLATFORM, on instruction. It used to return to State A,
 * on the reasoning that reaching the platform was the shell's job -- the EMB logo
 * and the "BidOS" nav item both do it from every route. The client wants the
 * control that says "Back" to mean the landing, so it does.
 *
 * Routed rather than linked to the deployment's own address. `/` IS that address
 * once deployed, and going out through the network would reload the app and drop
 * the workspace held in this browser -- the sources and people revealed by setup.
 * Same destination, without throwing away what the reader just did.
 */
export function ModuleIntroPage({
  mark,
  microLabel,
  name,
  lede,
  stages,
  renderSetup,
  stepCount,
  action,
  secondary,
  link,
}: ModuleIntroPageProps) {
  const navigate = useNavigate()
  const [inSetup, enterSetup] = useState(false)
  /** Which of the two ways in is open. Only read when `inSetup`. */
  const [openPath, setOpenPath] = useState<'primary' | 'secondary'>('primary')
  const secondaryButton = useRef<HTMLButtonElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const reduce = useReducedMotion()
  const beginButton = useRef<HTMLButtonElement>(null)

  /*
   * There is no returning focus to the button that opened the path any more.
   * Back leaves for the landing, so the path is a one-way door: nothing comes
   * back to State A to receive focus, and the effect that used to do it -- along
   * with the setter that triggered it -- was unreachable once Back changed.
   */

  const openSetup = () => {
    setOpenPath('primary')
    enterSetup(true)
    setAnnouncement(
      action?.announcement ??
        `Setup path opened. Step 01 is ready. ${stepCount} steps in total.`,
    )
  }

  const openSecondary = () => {
    setOpenPath('secondary')
    enterSetup(true)
    setAnnouncement(secondary?.announcement ?? `${secondary?.label ?? 'Setup'} opened.`)
  }

  /** The control reads "Back", and Back means the platform landing. */
  const closeSetup = () => {
    navigate('/')
  }

  const anchorTransition = reduce
    ? { duration: 0 }
    : { duration: MOTION.duration.slow, ease: MOTION.ease.out }

  const fade = reduce
    ? { initial: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: MOTION.duration.fast, ease: MOTION.ease.in },
      }

  return (
    <div className="scrollable flex flex-1 flex-col px-24 py-48 md:px-48 md:py-64">
      <VisuallyHidden.Root role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden.Root>

      {/*
       * Centred horizontally in both states. Vertically, State A is top-anchored
       * because the flow band anchors the floor of the card; State B has no band, so
       * its composition takes the middle rather than sitting top-heavy above the
       * space the band vacated.
       *
       * my-auto rather than justify-center on the scroll container: a centred flex
       * child cannot be scrolled back into view once it overflows.
       */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-editorial flex-col items-center',
          inSetup && 'my-auto',
        )}
      >
        {mark}

        <p className="mt-16 text-micro-label uppercase text-fg-muted">{microLabel}</p>

        {/* Survives the transition. It scales and repositions rather than
            cross-fading, which is what keeps the two states one screen. */}
        <motion.h1
          layout={!reduce}
          transition={anchorTransition}
          className={cn(
            'mt-12 text-center text-fg',
            // Page-title rather than display in State B: the step headings are
            // panel-title, and the anchor has to stay clearly above them or the top
            // of the screen loses all its weight.
            inSetup ? 'text-page-title' : 'text-display-l lg:text-display-xl',
          )}
        >
          {name}
        </motion.h1>

        <AnimatePresence mode="popLayout" initial={false}>
          {inSetup ? (
            <motion.div key="setup" className="mt-32 w-full" {...fade}>
              <PresenceLayer>
                {openPath === 'secondary' && secondary
                  ? secondary.render(closeSetup)
                  : renderSetup(closeSetup)}
              </PresenceLayer>
            </motion.div>
          ) : (
            <motion.div key="landing" className="mt-20 w-full" {...fade}>
              <PresenceLayer>
                <div className="flex flex-col items-center">
                  <p className="max-w-lede text-center text-secondary-body text-fg-secondary">
                    {lede}
                  </p>

                  <Separator length="short" className="mt-32" />

                  <Button
                    ref={beginButton}
                    variant="primary"
                    size="lg"
                    className="mt-32"
                    iconLeft={action?.icon ?? <ListChecks size={ICON.lg} aria-hidden="true" />}
                    onClick={openSetup}
                  >
                    {action?.label ?? 'Begin setup'}
                  </Button>

                  {/* A router Link, not an anchor: this stays inside the app, and
                      a plain href would reload the whole bundle to reach a screen
                      that is already loaded. */}
                  {link && (
                    <Link
                      to={link.to}
                      className={cn(buttonClasses({ variant: 'ghost', size: 'lg' }), 'mt-12')}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  )}

                  {secondary && (
                    <Button
                      ref={secondaryButton}
                      variant="ghost"
                      size="lg"
                      className="mt-12"
                      iconLeft={secondary.icon}
                      onClick={openSecondary}
                    >
                      {secondary.label}
                    </Button>
                  )}
                </div>
              </PresenceLayer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* State A only: it explains how the module works, which State B has no
          business repeating. Bottom-aligned in the card by mt-auto, with the
          wrapper's padding guaranteeing a gap when the composition above grows tall
          enough to collapse that margin. */}
      {!inSetup && (
        <div className="mt-auto w-full pt-48">
          <FlowBand
            stages={stages}
            label={`What ${name} does`}
            className="mx-auto w-full max-w-editorial"
          />
        </div>
      )}
    </div>
  )
}
