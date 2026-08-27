import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const spinner = cva(
  [
    'inline-block shrink-0 animate-spinner rounded-full',
    'border-current border-t-transparent opacity-muted',
  ],
  {
    variants: {
      size: {
        xs: 'h-12 w-12 border',
        sm: 'h-16 w-16 border',
        md: 'h-24 w-24 border-2',
      },
    },
    defaultVariants: { size: 'sm' },
  },
)

export interface SpinnerProps extends VariantProps<typeof spinner> {
  className?: string
  label?: string
}

export function Spinner({ size, className, label = 'Working' }: SpinnerProps) {
  return <span role="status" aria-label={label} className={cn(spinner({ size }), className)} />
}
