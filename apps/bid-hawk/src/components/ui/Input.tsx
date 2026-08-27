import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
  iconLeft?: ReactNode
  addonRight?: ReactNode
  mono?: boolean
  /** Saved secrets render as read-only text, never as an editable password. */
  readOnlyValue?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, iconLeft, addonRight, mono, readOnlyValue, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined

  return (
    <div className="flex w-full flex-col gap-4">
      {label && (
        <label htmlFor={inputId} className="text-label text-fg-secondary">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex h-control-md items-center gap-8 rounded-field border bg-surface px-12',
          'transition-colors duration-micro ease-out',
          error
            ? 'border-destructive'
            : 'border-border focus-within:border-primary hover:border-border-strong',
          (rest.disabled || readOnlyValue) && 'border-disabled-border bg-disabled',
          className,
        )}
      >
        {iconLeft && (
          <span aria-hidden="true" className="shrink-0 text-fg-muted">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          readOnly={readOnlyValue || rest.readOnly}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-body text-fg outline-none',
            'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:text-disabled-fg',
            readOnlyValue && 'text-fg-secondary',
            mono && 'font-mono text-code',
          )}
          {...rest}
        />
        {addonRight && <span className="shrink-0">{addonRight}</span>}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-helper text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-helper`} className="text-helper text-fg-muted">
          {helper}
        </p>
      ) : null}
    </div>
  )
})
