import { forwardRef, type ReactNode } from 'react'
import { Button, type ButtonProps } from './Button'
import { Tooltip, type TooltipProps } from './Tooltip'

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'iconLeft' | 'iconRight' | 'iconOnly'> {
  /** Serves as both the accessible name and the tooltip, so neither can be omitted. */
  label: string
  icon: ReactNode
  /** Overrides the tooltip copy when the reason needs more words than the name. */
  tooltip?: ReactNode
  tooltipSide?: TooltipProps['side']
}

/**
 * An icon-only control is square, ghost by default, and always carries an
 * accessible name plus a tooltip. Both are required by the type, so an unlabelled
 * icon button cannot be written.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, tooltip, tooltipSide = 'top', variant = 'ghost', disabled, ...rest },
  ref,
) {
  return (
    <Tooltip content={tooltip ?? label} side={tooltipSide} wrapDisabled={Boolean(disabled)}>
      <Button
        ref={ref}
        iconOnly
        variant={variant}
        disabled={disabled}
        aria-label={label}
        iconLeft={icon}
        {...rest}
      />
    </Tooltip>
  )
})
