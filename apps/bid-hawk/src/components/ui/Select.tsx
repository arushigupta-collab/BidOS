import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON, OVERLAY } from '@/lib/tokens'

export interface SelectOption {
  value: string
  label: string
  /**
   * A second line under the label, for an identifier the label alone does not carry —
   * a tender reference, for instance. Rendered in mono metadata and excluded from the
   * trigger, which shows the label only.
   */
  detail?: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  label?: string
  helper?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  className?: string
  /** Matches the trigger width by default; set for a wider list than trigger. */
  contentClassName?: string
}

export function Select({
  options,
  value,
  onValueChange,
  label,
  helper,
  error,
  placeholder = 'Select an option',
  disabled,
  name,
  id,
  className,
  contentClassName,
}: SelectProps) {
  const selectId = id ?? name
  const describedBy = error ? `${selectId}-error` : helper ? `${selectId}-helper` : undefined

  return (
    <div className="flex w-full flex-col gap-4">
      {label && (
        <label htmlFor={selectId} className="text-label text-fg-secondary">
          {label}
        </label>
      )}

      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'flex h-control-md w-full items-center justify-between gap-8 rounded-field border bg-surface px-12',
            'text-body text-fg transition-colors duration-micro ease-out',
            'data-[placeholder]:text-fg-subtle',
            'disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-fg',
            error ? 'border-destructive' : 'border-border hover:border-border-strong',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={ICON.sm} aria-hidden="true" className="text-fg-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={OVERLAY.sideOffset}
            collisionPadding={OVERLAY.collisionPadding}
            className={cn(
              'z-dropdown min-w-[var(--radix-select-trigger-width)] overflow-hidden',
              'rounded-card bg-surface-overlay p-4 shadow-dropdown',
              contentClassName,
            )}
          >
            <RadixSelect.Viewport className="max-h-[var(--radix-select-content-available-height)]">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-8 rounded-field pl-12 pr-32',
                    option.detail ? 'min-h-control-lg py-8' : 'h-control-md',
                    'text-body text-fg outline-none',
                    'data-[highlighted]:bg-surface-hover',
                    'data-[state=checked]:bg-surface-selected data-[state=checked]:text-primary',
                    'data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled-fg',
                  )}
                >
                  {/* ItemText takes the label and nothing else. Radix mirrors its
                      children into a hidden native select and registers the item from
                      them, so an element nested inside it stops the item registering at
                      all — the list opened with zero options. The detail therefore sits
                      beside ItemText, inside the Item. */}
                  <span className="flex min-w-0 flex-col gap-2">
                    <RadixSelect.ItemText>
                      <span className="truncate">{option.label}</span>
                    </RadixSelect.ItemText>
                    {option.detail && (
                      <span className="numeric font-mono text-metadata text-fg-muted">
                        {option.detail}
                      </span>
                    )}
                  </span>
                  <RadixSelect.ItemIndicator className="absolute right-12">
                    <Check size={ICON.sm} aria-hidden="true" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {error ? (
        <p id={`${selectId}-error`} className="text-helper text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p id={`${selectId}-helper`} className="text-helper text-fg-muted">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
