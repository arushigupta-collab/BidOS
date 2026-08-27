import * as RadixPopover from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON, OVERLAY } from '@/lib/tokens'
import type { SelectOption } from './Select'

export interface MultiSelectProps {
  id: string
  options: SelectOption[]
  values: string[]
  onChange: (values: string[]) => void
  label?: string
  helper?: string
  placeholder?: string
  /** Overrides the "N selected" summary with a domain word, e.g. "states". */
  summaryNoun?: string
  disabled?: boolean
  className?: string
}

/**
 * Radix ships no multi-select, so this is its Popover plus a checkable list
 * rather than a hand-rolled dropdown. The trigger summarises the selection
 * instead of listing it, which keeps a row height stable when many are chosen.
 */
export function MultiSelect({
  id,
  options,
  values,
  onChange,
  label,
  helper,
  placeholder = 'Select options',
  summaryNoun,
  disabled = false,
  className,
}: MultiSelectProps) {
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])

  const selected = options.filter((option) => values.includes(option.value))
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].label
        : `${selected.length} ${summaryNoun ?? 'selected'}`

  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-fg-secondary">
          {label}
        </label>
      )}

      <RadixPopover.Root>
        <RadixPopover.Trigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-describedby={helper ? `${id}-helper` : undefined}
            className={cn(
              'flex h-control-md w-full items-center justify-between gap-8 rounded-field border bg-surface px-12',
              'text-body transition-colors duration-micro ease-out',
              'border-border hover:border-border-strong',
              'disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-fg',
              selected.length === 0 ? 'text-fg-subtle' : 'text-fg',
            )}
          >
            <span className="truncate">{summary}</span>
            <ChevronDown size={ICON.sm} aria-hidden="true" className="shrink-0 text-fg-muted" />
          </button>
        </RadixPopover.Trigger>

        <RadixPopover.Portal>
          <RadixPopover.Content
            align="start"
            sideOffset={OVERLAY.sideOffset}
            collisionPadding={OVERLAY.collisionPadding}
            className={cn(
              'z-popover w-[var(--radix-popover-trigger-width)] min-w-panel',
              'rounded-card bg-surface-overlay p-4 shadow-dropdown',
            )}
          >
            <div
              role="listbox"
              aria-multiselectable="true"
              aria-label={label ?? placeholder}
              className="scrollable flex max-h-[var(--radix-popover-content-available-height)] flex-col"
            >
              {options.map((option) => {
                const checked = values.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    disabled={option.disabled}
                    onClick={() => toggle(option.value)}
                    className={cn(
                      'flex h-control-md shrink-0 items-center justify-between gap-12 rounded-field px-12',
                      'text-left text-body transition-colors duration-micro ease-out',
                      checked ? 'bg-surface-selected text-fg' : 'text-fg-secondary hover:bg-surface-hover',
                      'disabled:cursor-not-allowed disabled:text-disabled-fg',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="flex shrink-0 items-center gap-8">
                      {/* `detail` as a trailing figure rather than a second line: in a
                          filter list it is how many rows the option would leave, which is
                          a number read against the label, not a caption under it. Excluded
                          from the trigger, matching the SelectOption contract. */}
                      {option.detail && (
                        <span className="numeric font-mono text-metadata text-fg-muted">
                          {option.detail}
                        </span>
                      )}
                      {checked ? (
                        <Check size={ICON.sm} aria-hidden="true" className="text-primary" />
                      ) : (
                        // Holds the tick's column open, so labels do not shift by 14px
                        // as options are checked.
                        <span aria-hidden="true" className="w-icon-sm" />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>

      {helper && (
        <p id={`${id}-helper`} className="text-helper text-fg-muted">
          {helper}
        </p>
      )}
    </div>
  )
}
