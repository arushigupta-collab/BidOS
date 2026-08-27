import type { ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/cn'
import { OVERLAY } from '@/lib/tokens'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: RadixTooltip.TooltipContentProps['side']
  align?: RadixTooltip.TooltipContentProps['align']
  /**
   * A disabled control emits no pointer events, so its trigger is wrapped in a
   * focusable span. Every disabled control has to explain itself, which means
   * the explanation has to stay reachable by both pointer and keyboard.
   */
  wrapDisabled?: boolean
  /**
   * Applied to the span that `wrapDisabled` introduces. A disabled full-width
   * control needs its wrapper to be full width too, or the span's inline-flex
   * shrinks to the content and the button has nothing to fill.
   */
  triggerClassName?: string
  className?: string
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={240} skipDelayDuration={120}>
      {children}
    </RadixTooltip.Provider>
  )
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  wrapDisabled = false,
  triggerClassName,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>
        {wrapDisabled ? (
          <span tabIndex={0} className={cn('inline-flex rounded-control', triggerClassName)}>
            {children}
          </span>
        ) : (
          children
        )}
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={OVERLAY.sideOffset}
          collisionPadding={OVERLAY.collisionPadding}
          className={cn(
            'z-tooltip max-w-panel rounded-control bg-fg px-12 py-8',
            'text-caption text-fg-inverted shadow-tooltip',
            className,
          )}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
