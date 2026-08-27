/**
 * Numeric mirrors of src/styles/tokens.css.
 *
 * framer-motion takes seconds as numbers, Radix positioning takes pixel offsets
 * as numbers, and lucide takes an icon size as a number. None of them can
 * consume a CSS custom property, so those three cases are restated here — once —
 * and every component imports from this module instead of writing a literal.
 * If a value changes in tokens.css it changes here in the same commit.
 */

/** --duration-* and --ease-*, in the units framer-motion expects. */
export const MOTION = {
  duration: {
    micro: 0.12,
    fast: 0.16,
    standard: 0.2,
    emphasis: 0.24,
    surface: 0.26,
    slow: 0.32,
  },
  ease: {
    out: [0.22, 0.61, 0.36, 1],
    in: [0.55, 0.06, 0.68, 0.19],
    inOut: [0.45, 0.05, 0.55, 0.95],
  },
  /** --stagger-step */
  stagger: 0.06,
  /** Entry offsets. A rise of one small spacing step, never a long slide. */
  offset: {
    rise: 8,
  },
} as const

/** Floating-surface offsets for Radix and sonner, taken from the spacing scale. */
export const OVERLAY = {
  /** --space-8 */
  sideOffset: 8,
  /** --space-16 */
  collisionPadding: 16,
  /** --space-8, between stacked toasts */
  stackGap: 8,
  /** --space-24, from the viewport edge */
  viewportInset: 24,
} as const

/** Icon sizes on a consistent optical grid, one step per control size. */
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const
