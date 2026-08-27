import { Outlet } from 'react-router-dom'
import { ToastViewport, TooltipProvider } from '@/components/ui'
import { CanvasEnvironment, CanvasIdentity } from './CanvasChrome'
import { CanvasNav } from './CanvasNav'
import { DemoControls } from './DemoControls'

/**
 * The shell every screen inherits.
 *
 * CANVAS is a warm light neutral — the desk. WORKSPACE is a white card floating
 * on it, inset from every edge by one large spacing step, which below md steps
 * down but never reaches full bleed. Brand marks and, from Screen 2, navigation
 * sit on the canvas outside the card.
 */
export interface CanvasShellProps {
  /**
   * False on the platform landing only, which sets the wordmark at Display size
   * inside the card. One of four exceptions scoped to `/`; see CLAUDE.md. No other
   * route may pass it.
   */
  showWordmark?: boolean
  /**
   * The platform landing carries a version and a copyright line on the canvas.
   * No other screen does, so it is a prop rather than global chrome: the route
   * that wants it asks for it.
   */
  footer?: boolean
}

export function CanvasShell({ footer = false, showWordmark = true }: CanvasShellProps) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-canvas p-16 md:px-32 md:pb-32 md:pt-20">
        <div className="mx-auto flex min-h-0 w-full max-w-workspace flex-1 flex-col">
          <header className="flex shrink-0 flex-col gap-16 pb-20 lg:flex-row lg:items-center lg:justify-between lg:gap-24">
            <div className="flex min-w-0 items-center gap-32">
              <CanvasIdentity />
              <CanvasNav />
            </div>
            <CanvasEnvironment showWordmark={showWordmark} />
          </header>

          {/* The card takes its height from its content above a floor, rather
              than stretching to fill the desk. Stretching left short screens
              with several hundred pixels of empty card, and a document that
              does not reach the bottom of the desk is the point of the model. */}
          <main className="flex min-h-workspace flex-col overflow-hidden rounded-overlay bg-surface shadow-workspace">
            <Outlet />
          </main>

          {/* Rendered only when asked for. An unconditional footer reserved its
              line and its padding at the bottom of every canvas even when it held
              nothing, which is the dead space that got it removed before. */}
          {footer && (
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-8 pt-20 text-metadata text-fg-muted">
              <p className="numeric font-mono">v1.3</p>
              <p>© 2026 EMB Global. All rights reserved.</p>
            </footer>
          )}
        </div>
      </div>

      <ToastViewport />
      <DemoControls />
    </TooltipProvider>
  )
}
