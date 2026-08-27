import { useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'

const chip = cva(
  [
    'inline-flex max-w-full items-center gap-4 rounded-field border py-2 pl-8',
    'text-label transition-colors duration-micro ease-out',
  ],
  {
    variants: {
      /**
       * `subtractive` is for a term that removes listings rather than adding
       * them. It reads as a deduction, not as an error.
       */
      tone: {
        default: 'border-border bg-surface-sunken text-fg-secondary',
        selected: 'border-primary-border bg-primary-subtle text-primary',
        subtractive: 'border-destructive-border bg-destructive-subtle text-destructive',
      },
      interactive: { true: null, false: null },
      disabled: { true: 'cursor-not-allowed opacity-disabled', false: null },
      removable: { true: 'pr-2', false: 'pr-8' },
    },
    compoundVariants: [
      {
        interactive: true,
        tone: 'default',
        class: 'hover:border-border-strong hover:bg-surface-hover hover:text-fg',
      },
    ],
    defaultVariants: { tone: 'default', interactive: false, disabled: false, removable: false },
  },
)

export type ChipTone = NonNullable<VariantProps<typeof chip>['tone']>

export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  onRemove?: () => void
  onClick?: () => void
  disabled?: boolean
  removeLabel?: string
  className?: string
}

export function Chip({
  children,
  tone = 'default',
  onRemove,
  onClick,
  disabled = false,
  removeLabel,
  className,
}: ChipProps) {
  const interactive = Boolean(onClick) && !disabled

  return (
    <span
      className={cn(
        chip({ tone, interactive, disabled, removable: Boolean(onRemove) }),
        className,
      )}
    >
      {interactive ? (
        <button type="button" onClick={onClick} className="truncate">
          {children}
        </button>
      ) : (
        <span className="truncate">{children}</span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? `Remove ${String(children)}`}
          className={cn(
            'grid h-16 w-16 shrink-0 place-items-center rounded-field',
            'text-fg-muted transition-colors duration-micro ease-out',
            'hover:bg-destructive-subtle hover:text-destructive',
            'disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-fg-muted',
          )}
        >
          <X size={ICON.xs} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

export interface ChipInputProps {
  values: string[]
  onChange: (values: string[]) => void
  id: string
  label?: string
  helper?: string
  placeholder?: string
  /** Announced when the typed value already exists. */
  duplicateMessage?: string
  tone?: ChipTone
  disabled?: boolean
  /** Renders the helper in the error tone and marks the field invalid. */
  helperTone?: 'muted' | 'error'
  invalid?: boolean
  /**
   * Rendered inside the field, after the text input. Used to hang a suggestion
   * dropdown off the field itself rather than beside it.
   */
  adornment?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  /** Controls the typed text. Supply it with onDraftChange to own the draft. */
  draft?: string
  /** Reports what is being typed, so a parent can filter a suggestion list. */
  onDraftChange?: (draft: string) => void
  /**
   * Runs before the built-in key handling. Calling preventDefault takes the key
   * over — a parent owns the arrow keys while its suggestion list is open.
   */
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  /** Combobox wiring when a parent supplies a suggestion list. */
  inputAria?: {
    role?: string
    'aria-expanded'?: boolean
    'aria-controls'?: string
    'aria-activedescendant'?: string
    'aria-autocomplete'?: 'list' | 'none' | 'both' | 'inline'
  }
}

/**
 * Chip collection with duplicate rejection and inline feedback. Enter commits what
 * is typed; there is no add button, because one that does nothing until the field
 * has text reads as broken.
 */
export function ChipInput({
  values,
  onChange,
  id,
  label,
  helper,
  placeholder = 'Add a term and press Enter',
  duplicateMessage = 'That term is already in this list',
  tone = 'default',
  disabled = false,
  helperTone = 'muted',
  invalid = false,
  adornment,
  inputRef,
  draft: controlledDraft,
  onDraftChange,
  onInputKeyDown,
  inputAria,
}: ChipInputProps) {
  const [internalDraft, setInternalDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const draft = controlledDraft ?? internalDraft

  const setDraftValue = (value: string) => {
    if (controlledDraft === undefined) setInternalDraft(value)
    setNotice(null)
    onDraftChange?.(value)
  }

  const commit = () => {
    const value = draft.trim()
    if (!value) return
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setNotice(duplicateMessage)
      return
    }
    onChange([...values, value])
    setDraftValue('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onInputKeyDown?.(event)
    if (event.defaultPrevented) return

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {label && (
        <label htmlFor={id} className="text-label text-fg-secondary">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex min-h-control-md flex-wrap items-center gap-8 rounded-field border bg-surface p-8',
          'transition-colors duration-micro ease-out focus-within:border-primary',
          notice ? 'border-warning' : invalid ? 'border-destructive' : 'border-border',
          disabled && 'bg-disabled opacity-disabled',
        )}
      >
        {values.map((value) => (
          <Chip
            key={value}
            tone={tone}
            disabled={disabled}
            onRemove={() => onChange(values.filter((v) => v !== value))}
          >
            {value}
          </Chip>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          disabled={disabled}
          aria-describedby={helper ? `${id}-helper` : undefined}
          aria-invalid={invalid || undefined}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-panel flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
          {...inputAria}
        />
        {/* No add button. It was inert until something was typed, which read as a
            broken control, and a second icon in one field was clutter. Enter
            commits typed text; the adornment opens whatever else is on offer. */}
        {adornment}
      </div>

      {notice ? (
        <p role="status" aria-live="polite" className="text-helper text-warning">
          {notice}
        </p>
      ) : helper ? (
        <p
          id={`${id}-helper`}
          className={cn('text-helper', helperTone === 'error' ? 'text-destructive' : 'text-fg-muted')}
        >
          {helper}
        </p>
      ) : null}
    </div>
  )
}
