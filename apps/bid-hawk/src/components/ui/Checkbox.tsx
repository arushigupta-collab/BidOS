import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'

export interface CheckboxProps {
  id: string
  checked: boolean
  /**
   * Partial selection. Radix carries this as a third checked value rather than a
   * boolean, and it must be announced as well as drawn — a header box that looks
   * half-selected but reports itself unchecked is worse than no header box.
   */
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  detail?: string
  /**
   * Hides the label text visually while keeping it as the control's accessible name.
   * A prop rather than a caller-supplied `[&_span]:sr-only`, which is what the registry
   * did: that selector matches EVERY descendant span, and Radix renders its Indicator as
   * one, so the checked tick was being clipped along with the label and a checked box read
   * as a solid navy square with no tick.
   */
  labelHidden?: boolean
  disabled?: boolean
  className?: string
}

export function Checkbox({
  id,
  checked,
  indeterminate = false,
  onCheckedChange,
  label,
  detail,
  labelHidden = false,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start rounded-control',
        labelHidden ? 'gap-0 p-8' : 'gap-12 px-12 py-8',
        'transition-colors duration-micro ease-out',
        // With the label hidden there is no text for a selected tint to sit behind, and
        // the row already carries its own selected surface.
        checked && !labelHidden ? 'bg-surface-selected' : 'hover:bg-surface-hover',
        disabled && 'cursor-not-allowed opacity-disabled',
        className,
      )}
    >
      <RadixCheckbox.Root
        id={id}
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        disabled={disabled}
        className={cn(
          'mt-2 grid h-16 w-16 shrink-0 place-items-center rounded-field border',
          'transition-colors duration-micro ease-out',
          'data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
          'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
          'disabled:border-disabled-border disabled:bg-disabled',
        )}
      >
        <RadixCheckbox.Indicator className="text-primary-fg">
          {indeterminate ? (
            <Minus size={ICON.xs} strokeWidth={3} aria-hidden="true" />
          ) : (
            <Check size={ICON.xs} strokeWidth={3} aria-hidden="true" />
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>

      <span className={cn('flex min-w-0 flex-col gap-2', labelHidden && 'sr-only')}>
        <span className={cn('text-body', checked ? 'text-fg' : 'text-fg-secondary')}>{label}</span>
        {detail && <span className="text-helper text-fg-muted">{detail}</span>}
      </span>
    </label>
  )
}

export interface CheckboxGroupProps {
  name: string
  label?: string
  helper?: string
  options: Array<{ value: string; label: string; detail?: string }>
  values: string[]
  onChange: (values: string[]) => void
  className?: string
}

export function CheckboxGroup({
  name,
  label,
  helper,
  options,
  values,
  onChange,
  className,
}: CheckboxGroupProps) {
  const toggle = (value: string, next: boolean) =>
    onChange(next ? [...values, value] : values.filter((v) => v !== value))

  return (
    <fieldset className={cn('flex flex-col gap-8', className)}>
      {label && <legend className="pb-4 text-label text-fg-secondary">{label}</legend>}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            id={`${name}-${option.value}`}
            label={option.label}
            detail={option.detail}
            checked={values.includes(option.value)}
            onCheckedChange={(next) => toggle(option.value, next)}
          />
        ))}
      </div>
      {helper && <p className="text-helper text-fg-muted">{helper}</p>}
    </fieldset>
  )
}
