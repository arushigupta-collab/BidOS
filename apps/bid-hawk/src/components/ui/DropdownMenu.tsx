import type { ReactNode } from 'react'
import * as RadixDropdown from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'
import { OVERLAY } from '@/lib/tokens'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  /** Required when disabled, so the reason is never left implicit. */
  disabledReason?: string
  /** Starts a new group above this item. */
  separated?: boolean
}

export interface DropdownMenuProps {
  /** The glyph for the trigger. The menu builds the button around it. */
  triggerIcon: ReactNode
  items: MenuItem[]
  /** Accessible name for the trigger and for the menu. */
  label: string
  align?: RadixDropdown.DropdownMenuContentProps['align']
  className?: string
}

/**
 * The menu owns its trigger rather than accepting one.
 *
 * An icon-only trigger needs both a tooltip and a menu, and the two Radix
 * triggers have to nest in one specific order for their handlers to compose —
 * tooltip outside, menu innermost, both landing on the same button. Building it
 * here means a caller cannot get that order wrong.
 */
export function DropdownMenu({
  triggerIcon,
  items,
  label,
  align = 'end',
  className,
}: DropdownMenuProps) {
  return (
    <RadixDropdown.Root>
      <Tooltip content={label}>
        <RadixDropdown.Trigger asChild>
          <Button
            iconOnly
            variant="ghost"
            size="sm"
            aria-label={label}
            iconLeft={triggerIcon}
          />
        </RadixDropdown.Trigger>
      </Tooltip>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={OVERLAY.sideOffset}
          collisionPadding={OVERLAY.collisionPadding}
          aria-label={label}
          className={cn(
            'z-dropdown flex min-w-panel flex-col rounded-card bg-surface-overlay p-4 shadow-dropdown',
            className,
          )}
        >
          {items.map((item) => (
            <div key={item.id} className="contents">
              {item.separated && (
                <RadixDropdown.Separator className="my-4 h-hair bg-border-subtle" />
              )}
              <RadixDropdown.Item
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'flex h-control-md cursor-pointer select-none items-center gap-12 rounded-field px-12',
                  'text-body outline-none transition-colors duration-micro ease-out',
                  item.destructive
                    ? 'text-destructive data-[highlighted]:bg-destructive-subtle'
                    : 'text-fg-secondary data-[highlighted]:bg-surface-hover data-[highlighted]:text-fg',
                  'data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled-fg',
                  'data-[disabled]:data-[highlighted]:bg-transparent',
                )}
              >
                {item.icon && (
                  <span aria-hidden="true" className="shrink-0">
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </RadixDropdown.Item>

              {/* A disabled item states its reason in the menu itself. A tooltip
                  cannot be reached here: Radix takes pointer and keyboard focus
                  for menu navigation, so a hover target inside an item is dead. */}
              {item.disabled && item.disabledReason && (
                <p className="px-12 pb-8 pt-2 text-helper text-fg-muted">{item.disabledReason}</p>
              )}
            </div>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  )
}
