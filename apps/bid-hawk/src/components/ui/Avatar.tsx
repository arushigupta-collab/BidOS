import * as RadixAvatar from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { initials, stableHash } from '@/lib/format'

const avatar = cva('inline-flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      xs: 'h-20 w-20',
      sm: 'h-24 w-24',
      md: 'h-32 w-32',
    },
  },
  defaultVariants: { size: 'sm' },
})

const fallback = cva('grid h-full w-full place-items-center uppercase', {
  variants: {
    size: {
      xs: 'text-metadata-strong',
      sm: 'text-metadata-strong',
      md: 'text-label',
    },
    /** Derived from the name so a person keeps one colour everywhere. */
    tone: {
      1: 'bg-chart-1/tint text-chart-1',
      2: 'bg-chart-2/tint text-chart-2',
      3: 'bg-chart-4/tint text-chart-4',
      4: 'bg-chart-5/tint text-chart-5',
      5: 'bg-chart-6/tint text-chart-6',
      6: 'bg-chart-7/tint text-chart-7',
    },
  },
  defaultVariants: { size: 'sm', tone: 1 },
})

const TONE_COUNT = 6

export interface AvatarProps extends VariantProps<typeof avatar> {
  name: string
  src?: string
  className?: string
  title?: string
}

export function Avatar({ name, src, size, className, title }: AvatarProps) {
  const tone = ((stableHash(name) % TONE_COUNT) + 1) as 1 | 2 | 3 | 4 | 5 | 6

  return (
    <RadixAvatar.Root
      title={title ?? name}
      className={cn(avatar({ size }), className)}
      aria-hidden="true"
    >
      {src && <RadixAvatar.Image src={src} alt="" className="h-full w-full object-cover" />}
      <RadixAvatar.Fallback delayMs={src ? 120 : 0} className={fallback({ size, tone })}>
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
