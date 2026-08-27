import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

const button = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap',
    'rounded-control transition-colors duration-micro ease-out',
    'disabled:cursor-not-allowed disabled:border-disabled-border disabled:bg-disabled',
    'disabled:text-disabled-fg disabled:shadow-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'border border-primary bg-primary text-primary-fg shadow-button',
          'hover:border-primary-hover hover:bg-primary-hover',
          'active:border-primary-pressed active:bg-primary-pressed',
        ],
        secondary: [
          'border border-secondary-border bg-secondary text-secondary-fg',
          'hover:bg-secondary-hover active:bg-secondary-pressed',
          'aria-pressed:bg-secondary-pressed',
        ],
        ghost: [
          'border border-transparent bg-transparent text-fg-muted',
          'hover:bg-surface-hover hover:text-fg active:bg-surface-pressed',
          'aria-pressed:bg-surface-pressed aria-pressed:text-fg',
        ],
        destructive: [
          'border border-destructive bg-destructive text-destructive-fg shadow-button',
          'hover:border-destructive-hover hover:bg-destructive-hover',
          'active:border-destructive-pressed active:bg-destructive-pressed',
        ],
      },
      size: {
        sm: 'h-control-sm gap-4 px-12 text-button-sm',
        md: 'h-control-md gap-8 px-16 text-button',
        lg: 'h-control-lg gap-8 px-24 text-button',
      },
      iconOnly: { true: 'px-0', false: null },
      fullWidth: { true: 'w-full', false: null },
    },
    compoundVariants: [
      { iconOnly: true, size: 'sm', class: 'w-control-sm' },
      { iconOnly: true, size: 'md', class: 'w-control-md' },
      { iconOnly: true, size: 'lg', class: 'w-control-lg' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md', iconOnly: false, fullWidth: false },
  },
)

/**
 * The variant map itself, for the rare case that needs the button's look on an
 * element neither Button nor ButtonLink can render — a router Link, for instance.
 * Prefer the components; reach for this only when the element is fixed by a library.
 */
export const buttonClasses = button

export type ButtonVariant = NonNullable<VariantProps<typeof button>['variant']>
export type ButtonSize = NonNullable<VariantProps<typeof button>['size']>

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof button> {
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>,
    VariantProps<typeof button> {
  href: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

/**
 * A real anchor wearing the button's clothes, for actions that are navigations.
 *
 * Opening a document is a navigation. Routed through window.open from a <button>
 * it cannot be middle-clicked, copied, or opened in a new tab from the keyboard,
 * which is capability the browser gives away for free through an href.
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, iconLeft, iconRight, iconOnly, fullWidth, className, children, ...rest },
  ref,
) {
  return (
    <a
      ref={ref}
      className={cn(button({ variant, size, iconOnly, fullWidth }), className)}
      {...rest}
    >
      {iconLeft && <span aria-hidden="true">{iconLeft}</span>}
      {!iconOnly && children}
      {iconRight && <span aria-hidden="true">{iconRight}</span>}
    </a>
  )
})

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    loading = false,
    iconLeft,
    iconRight,
    iconOnly,
    fullWidth,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size, iconOnly, fullWidth }), className)}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 'xs' : 'sm'} />
      ) : (
        iconLeft && <span aria-hidden="true">{iconLeft}</span>
      )}
      {!iconOnly && children}
      {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  )
})
