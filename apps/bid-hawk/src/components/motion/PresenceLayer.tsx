import type { ReactNode } from 'react'
import { useIsPresent } from 'framer-motion'

export interface PresenceLayerProps {
  children: ReactNode
  className?: string
}

/**
 * Wraps content that is animating out under AnimatePresence.
 *
 * An exiting layer stays mounted for the length of its fade, so for that window
 * two versions of a screen are in the document at once and the stale one is still
 * focusable and still announced. This marks it inert and hidden the moment it
 * starts leaving, which is what a browser would do for content that is no longer
 * really there.
 */
export function PresenceLayer({ children, className }: PresenceLayerProps) {
  const present = useIsPresent()

  return (
    <div
      className={className}
      aria-hidden={present ? undefined : true}
      // React 18 has no typed `inert` prop; an empty string renders the bare
      // attribute without tripping its unknown-property warning.
      {...(present ? {} : { inert: '' })}
    >
      {children}
    </div>
  )
}
