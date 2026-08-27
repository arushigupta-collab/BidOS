import * as RadixRadioGroup from '@radix-ui/react-radio-group'
import { cn } from '@/lib/cn'

export interface RadioOption {
  value: string
  label: string
  /** One line explaining what choosing this actually does. */
  detail?: string
  /** Rendered as a caution beneath the detail, for a costly choice. */
  caution?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  name: string
  value: string
  onValueChange: (value: string) => void
  options: RadioOption[]
  label?: string
  helper?: string
  className?: string
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  options,
  label,
  helper,
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn('flex flex-col gap-8', className)}>
      {label && <legend className="pb-4 text-label text-fg-secondary">{label}</legend>}

      <RadixRadioGroup.Root
        name={name}
        value={value}
        onValueChange={onValueChange}
        aria-describedby={helper ? `${name}-helper` : undefined}
        className="flex flex-col gap-4"
      >
        {options.map((option) => {
          const id = `${name}-${option.value}`
          const selected = option.value === value

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-12 rounded-control px-12 py-12',
                'transition-colors duration-micro ease-out',
                selected ? 'bg-surface-selected' : 'hover:bg-surface-hover',
                option.disabled && 'cursor-not-allowed opacity-disabled',
              )}
            >
              <RadixRadioGroup.Item
                id={id}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'mt-2 grid h-16 w-16 shrink-0 place-items-center rounded-full border',
                  'transition-colors duration-micro ease-out',
                  'data-[state=unchecked]:border-border-strong data-[state=unchecked]:bg-surface',
                  'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
                  'disabled:border-disabled-border disabled:bg-disabled',
                )}
              >
                <RadixRadioGroup.Indicator className="h-4 w-4 rounded-full bg-primary-fg" />
              </RadixRadioGroup.Item>

              <span className="flex min-w-0 flex-col gap-2">
                <span className={cn('text-body', selected ? 'text-fg' : 'text-fg-secondary')}>
                  {option.label}
                </span>
                {option.detail && (
                  <span className="text-helper text-fg-muted">{option.detail}</span>
                )}
                {option.caution && (
                  <span className="text-helper text-warning">{option.caution}</span>
                )}
              </span>
            </label>
          )
        })}
      </RadixRadioGroup.Root>

      {helper && (
        <p id={`${name}-helper`} className="text-helper text-fg-muted">
          {helper}
        </p>
      )}
    </fieldset>
  )
}
