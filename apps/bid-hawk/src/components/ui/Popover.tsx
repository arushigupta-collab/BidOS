import type { ReactNode } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON, OVERLAY } from '@/lib/tokens'
import { IconButton } from './IconButton'

export interface PopoverProps {
  trigger: ReactNode
  title?: string
  children: ReactNode
  side?: RadixPopover.PopoverContentProps['side']
  align?: RadixPopover.PopoverContentProps['align']
  className?: string
}

export function Popover({
  trigger,
  title,
  children,
  side = 'top',
  align = 'start',
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={OVERLAY.sideOffset}
          collisionPadding={OVERLAY.collisionPadding}
          className={cn(
            'z-popover flex w-palette max-w-[calc(100vw-var(--space-32))] flex-col gap-8',
            'rounded-card bg-surface-overlay p-16 shadow-dropdown',
            className,
          )}
        >
          {title && (
            <div className="flex items-start justify-between gap-12">
              <p className="text-panel-title text-fg">{title}</p>
              <RadixPopover.Close asChild>
                <IconButton
                  label="Close"
                  size="sm"
                  icon={<X size={ICON.sm} aria-hidden="true" />}
                />
              </RadixPopover.Close>
            </div>
          )}
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
