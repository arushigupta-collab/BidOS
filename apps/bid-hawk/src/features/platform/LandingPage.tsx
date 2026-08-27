import { motion, useReducedMotion } from 'framer-motion'
import { Separator } from '@/components/ui'
import { MOTION } from '@/lib/tokens'
import { ModuleCard } from './ModuleCard'
import { MODULES } from './modules'

/**
 * The lede's count, spelled the way a person reads it.
 *
 * Derived from the array rather than typed, because it has now been wrong twice:
 * the sentence read "Six modules" over a four-card grid, and "Four modules" over
 * six. Five card-count assertions passed both times -- a literal in a sentence is
 * invisible to a test that counts cards.
 *
 * Falls back to the numeral above eight, which is a count this landing will never
 * have and a wrong word would be worse than a digit.
 */
const COUNT_WORD: Record<number, string> = {
  1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight',
}

/**
 * Screen 0, the platform entry point at `/`.
 *
 * LEFT ALIGNED and FILLING the card's inner width. Five consecutive elements centred
 * on one axis is the strongest generated-interface tell there is, and it was what this
 * page did. The wordmark, the lede line, the rule and card 01 share one vertical axis,
 * which is what makes the composition read as set rather than as poured into the middle.
 *
 * The wrapper carries NO max-width. It used to cap at `--measure-landing`, which is
 * symmetric only while the cap does not engage — and above roughly a 1260 viewport it
 * did, stranding 116px to the right of a left-anchored block. The cap was protecting the
 * measure rather than the composition, so it moved onto the description paragraph, where
 * it now also fixes the line count and lets the description block be exact.
 *
 * NOTHING ON THIS PAGE TAKES FOCUS ON LOAD. It used to focus the first module's action
 * in a mount effect, on the reasoning that the platform should be one key from arrival.
 * That was wrong twice over. A landing page is not a form, so there is no field waiting
 * for input to justify moving the caret; and Chrome matches `:focus-visible` on a
 * PROGRAMMATIC focus when the last input was not a pointer, so on a fresh load with no
 * interaction at all the first card's action rendered ringed while the other three did
 * not. Returning from a module remounted the page and did it again. See docs/decisions.md.
 *
 * The canvas does not repeat the BidOS wordmark on this route — see `showWordmark` in
 * CanvasShell. One of four exceptions scoped to `/`; CLAUDE.md lists them.
 *
 * THERE IS NO FIT-ABOVE-THE-FOLD REQUIREMENT. That constraint was withdrawn, because
 * chasing it compressed the type and the card padding until the descriptions ran to
 * the card's edge. The page may exceed the fold and the footer may sit below it.
 *
 * What is not acceptable is dead space: this container does NOT take `flex-1`, so the
 * workspace card sizes to its content and ends where the grid ends plus its own bottom
 * padding. With `flex-1` the card stretched to the shell's floor and left an empty
 * band below the second row.
 */
export function LandingPage() {
  const reduce = useReducedMotion()

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
    <div className="scrollable flex flex-col px-24 pb-20 pt-20 md:px-40">
      {/* FILLS the card's inner width. It used to cap at `--measure-landing`, 1180,
          left anchored — which is symmetric only while the cap does not engage. Above
          roughly a 1260 viewport it does: at 1440 the card offers 1296 of inner width,
          the cap took 1180, and all 116px of the remainder was stranded to the right of
          a left-anchored block. Left inset 72 against right inset 188, measured.

          Filling rather than centring, because centring the block would restore the
          composition's own symmetry by breaking the one that matters: the wordmark, the
          lede, the rule and card 01 share a vertical axis, and that axis has to sit on
          the card's own left padding to read as set rather than as floated in the middle.
          Card padding is a single symmetric 40 either side, so filling makes the two
          insets equal by construction at every width instead of at some of them.

          The cap was protecting the MEASURE, not the symmetry, and the measure is now
          held where it belongs: on the description paragraph itself. See ModuleCard. */}
      <div className="flex w-full flex-col">
        {/* A two-part row with its ends baseline aligned: the wordmark and lede on the
            left, the module count on the wrapper's right edge sitting on the lede's own
            baseline. The count is NOT a third centred line and NOT joined to the lede
            by a middot — that version read as one sentence with a typo, and a screen
            reader ran the clauses together. */}
        <h1 className="text-display text-fg">BidOS</h1>

        {/* The row is the LEDE and the count, not the whole left column and the count.
            `items-baseline` aligns each child's FIRST baseline, so with the wordmark
            inside this row the count aligned to the wordmark instead of the lede —
            visibly level with its cap height. Lifting the wordmark out puts the two
            remaining children on the lede's own baseline, which is what was asked. */}
        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-24 gap-y-4">
          <p className="text-secondary-body text-fg-secondary">
            The operating layer for bidding
          </p>

          <p className="numeric font-mono text-metadata text-fg-muted">
            {COUNT_WORD[MODULES.length] ?? MODULES.length} modules. One bid lifecycle.
          </p>
        </div>

        {/* Full wrapper width. The short centred stub this replaces read as decoration;
            a rule that spans the measure is structure. */}
        <Separator className="mt-20" />

        {/* Peers, so one list. No stretch of any kind: the fixed description block
            makes every card the same height by construction, which is what aligns the
            buttons across both rows rather than only within one.

            No max-width on the card at any breakpoint. It used to carry
            `max-w-module lg:max-w-none`, which is symmetric only while the lg reset
            applies — and a card stranded at its below-lg cap is exactly the reported
            symptom: a grid narrower than its container, centred, stranding dead space
            on the right of a left-aligned wrapper. The cap is gone rather than
            defended, so the grid fills its container unconditionally. */}
        <ol
          aria-label="BidOS modules"
          className="mt-20 grid w-full grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MODULES.map((module, index) => (
            <motion.li key={module.id} {...enter(index)} className="flex w-full">
              <ModuleCard module={module} />
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}
