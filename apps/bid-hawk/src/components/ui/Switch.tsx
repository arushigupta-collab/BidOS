import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  helper?: string
  disabled?: boolean
  /** Required when disabled: every disabled control explains itself. */
  disabledReason?: string
  required?: boolean
  id: string
  className?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  helper,
  disabled = false,
  disabledReason,
  required = false,
  id,
  className,
}: SwitchProps) {
  const control = (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-describedby={helper ? `${id}-helper` : undefined}
      className={cn(
        'relative inline-flex h-20 w-32 shrink-0 items-center rounded-full',
        'transition-colors duration-standard ease-out',
        // fg-subtle rather than a border tone: an off switch is a UI component
        // boundary and has to clear 3:1 against the surface behind it.
        'data-[state=unchecked]:bg-fg-subtle data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:bg-disabled-border',
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block h-16 w-16 rounded-full bg-surface shadow-card',
          'transition-transform duration-standard ease-out',
          'translate-x-2 data-[state=checked]:translate-x-[calc(var(--space-32)-var(--space-16)-var(--space-2))]',
        )}
      />
    </RadixSwitch.Root>
  )

  return (
    <div className={cn('flex items-start gap-12', className)}>
      {disabled && disabledReason ? (
        <Tooltip content={disabledReason} wrapDisabled>
          {control}
        </Tooltip>
      ) : (
        control
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <label
          htmlFor={id}
          className={cn('text-body cursor-pointer', disabled ? 'text-disabled-fg' : 'text-fg')}
        >
          {label}
          {required && (
            <span className="ml-4 text-metadata text-fg-muted" aria-hidden="true">
              Required
            </span>
          )}
        </label>
        {helper && (
          <p id={`${id}-helper`} className="text-helper text-fg-muted">
            {helper}
          </p>
        )}
      </div>
    </div>
  )
}
