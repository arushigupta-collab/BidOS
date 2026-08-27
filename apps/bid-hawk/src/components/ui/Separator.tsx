import * as RadixSeparator from '@radix-ui/react-separator'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const separator = cva('shrink-0 bg-border', {
  variants: {
    orientation: {
      horizontal: 'h-hair w-full',
      vertical: 'h-full w-hair',
    },
    /** A short rule reads as a typographic mark rather than a container edge. */
    length: {
      full: null,
      short: 'w-rule-short',
    },
    tone: {
      DEFAULT: 'bg-border',
      subtle: 'bg-border-subtle',
      strong: 'bg-border-strong',
    },
  },
  defaultVariants: { orientation: 'horizontal', length: 'full', tone: 'DEFAULT' },
})

export interface SeparatorProps extends VariantProps<typeof separator> {
  className?: string
  /** False keeps it out of the accessibility tree, for purely visual rules. */
  semantic?: boolean
}

export function Separator({
  orientation = 'horizontal',
  length,
  tone,
  semantic = false,
  className,
}: SeparatorProps) {
  return (
    <RadixSeparator.Root
      orientation={orientation ?? 'horizontal'}
      decorative={!semantic}
      className={cn(separator({ orientation, length, tone }), className)}
    />
  )
}
