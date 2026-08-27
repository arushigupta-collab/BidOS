import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/**
 * Static, deliberately. A sweeping or pulsing placeholder is looping decoration:
 * it repeats after the information it stands in for has stopped changing. The
 * inset tone plus the layout it already occupies carries "not here yet".
 */
const skeleton = cva('block bg-surface-inset', {
  variants: {
    rounded: {
      field: 'rounded-field',
      control: 'rounded-control',
      card: 'rounded-card',
      full: 'rounded-full',
    },
  },
  defaultVariants: { rounded: 'field' },
})

export interface SkeletonProps extends VariantProps<typeof skeleton> {
  className?: string
}

export function Skeleton({ rounded, className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn(skeleton({ rounded }), className)} />
}

export interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cn('flex flex-col gap-8', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-12', index === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </span>
  )
}
