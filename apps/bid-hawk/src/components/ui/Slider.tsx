import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '@/lib/cn'

export interface SliderProps {
  id: string
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step?: number
  label: string
  helper?: string
  /** Rendered beside the value, e.g. "requests per minute". */
  unit?: string
  disabled?: boolean
  className?: string
}

export function Slider({
  id,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  label,
  helper,
  unit,
  disabled = false,
  className,
}: SliderProps) {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="flex items-baseline justify-between gap-16">
        <label htmlFor={id} className="text-label text-fg-secondary">
          {label}
        </label>
        <p className="flex items-baseline gap-4">
          <span className="numeric font-mono text-body-strong text-fg">{value}</span>
          {unit && <span className="text-metadata text-fg-muted">{unit}</span>}
        </p>
      </div>

      <RadixSlider.Root
        id={id}
        value={[value]}
        onValueChange={([next]) => onValueChange(next)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="relative flex h-20 w-full touch-none select-none items-center"
      >
        <RadixSlider.Track className="relative h-4 w-full grow rounded-full bg-surface-inset">
          <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
        </RadixSlider.Track>
        {/* role="slider" lands on the THUMB, so the name and the description belong
            there. On the Root they named an element with no role, which left four
            sliders on one screen announcing only their value. The visible <label>
            cannot do this job either: htmlFor points at the Root. */}
        <RadixSlider.Thumb
          aria-label={label}
          aria-describedby={helper ? `${id}-helper` : undefined}
          className={cn(
            'block h-16 w-16 rounded-full border-2 border-primary bg-surface shadow-card',
            'transition-colors duration-micro ease-out hover:bg-surface-hover',
            'disabled:border-disabled-border',
          )}
        />
      </RadixSlider.Root>

      <div className="flex items-center justify-between">
        <span className="numeric font-mono text-metadata text-fg-muted">{min}</span>
        <span className="numeric font-mono text-metadata text-fg-muted">{max}</span>
      </div>

      {helper && (
        <p id={`${id}-helper`} className="text-helper text-fg-muted">
          {helper}
        </p>
      )}
    </div>
  )
}
