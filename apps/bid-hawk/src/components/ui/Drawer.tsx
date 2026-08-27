import type { ReactNode } from 'react'
import { Drawer as Vaul } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON } from '@/lib/tokens'
import { IconButton } from './IconButton'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Rendered under the title inside the drawer header. */
  subheader?: ReactNode
  /** Announced after the title. Omitted rather than padded with filler. */
  description?: string
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Right-side sheet. vaul supplies the behaviour — focus trap, scroll lock,
 * dismiss, drag-to-close with its spring — and every visual value comes from
 * our tokens. The 260ms timing and our easing are imposed in base.css, which
 * overrides vaul's injected 500ms default.
 */
export function Drawer({
  open,
  onClose,
  title,
  subheader,
  description,
  footer,
  children,
  className,
}: DrawerProps) {
  // Radix, which vaul builds on, warns when a dialog has no description. An
  // explicit undefined is its documented acknowledgement that none is wanted.
  const describedBy = description ? {} : { 'aria-describedby': undefined }

  return (
    <Vaul.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      direction="right"
      modal
    >
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-drawer bg-overlay/scrim" />
        <Vaul.Content
          {...describedBy}
          className={cn(
            'fixed inset-y-0 right-0 z-drawer flex w-full flex-col outline-none',
            'rounded-l-overlay bg-surface shadow-drawer md:w-drawer',
            className,
          )}
        >
          {/* No rules between regions: the sunken body tone separates them. */}
          <header className="flex shrink-0 items-start gap-16 bg-surface px-24 py-20">
            <div className="flex min-w-0 flex-1 flex-col gap-8">
              <Vaul.Title className="text-section-title text-fg">{title}</Vaul.Title>
              {/* The subheader identifies the thing named in the title, so it belongs
                  directly under it. The description explains the panel and follows. */}
              {subheader}
              {description && (
                <Vaul.Description className="text-secondary-body text-fg-muted">
                  {description}
                </Vaul.Description>
              )}
            </div>
            <IconButton
              label="Close panel"
              size="sm"
              icon={<X size={ICON.md} aria-hidden="true" />}
              onClick={onClose}
            />
          </header>

          <div className="scrollable flex-1 bg-surface-sunken">{children}</div>

          {footer && (
            <footer className="flex shrink-0 items-center justify-end gap-8 bg-surface px-24 py-16">
              {footer}
            </footer>
          )}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  )
}
