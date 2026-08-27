import { useEffect, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { useWorkspace } from '@/store/useWorkspace'

/**
 * Development affordance, not product chrome.
 *
 * Deliberately plain and unbranded: no brand colour, no elevation from the
 * product's scale, nothing that could be mistaken for a feature if it were opened
 * in front of an audience. Reachable only by Cmd+Shift+D and advertised nowhere.
 *
 * Its title is "Workspace state", not "Demo data": no user-visible string in this
 * build may carry that word, and a keystroke away is still user-visible.
 *
 * There is no "load populated workspace" any more: the workspace reveals its
 * existing records on the first creation, so loading them by hand would skip the
 * behaviour worth showing. Reset is what remains, so the journey can be run again
 * without a page reload.
 */
export function DemoControls() {
  const [open, setOpen] = useState(false)
  const sources = useWorkspace((state) => state.sources.length)
  const people = useWorkspace((state) => state.people.length)
  const tenders = useWorkspace((state) => state.tenders.length)
  const sourcesRevealed = useWorkspace((state) => state.sourcesRevealed)
  const peopleRevealed = useWorkspace((state) => state.peopleRevealed)
  const resetToEmpty = useWorkspace((state) => state.resetToEmpty)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed bottom-24 right-24 z-dialog flex w-panel flex-col gap-12 rounded-card bg-surface-overlay p-16 shadow-dialog"
        >
          <RadixDialog.Title className="text-label text-fg">Workspace state</RadixDialog.Title>

          <dl className="flex flex-col gap-4 text-metadata text-fg-muted">
            <div className="flex justify-between gap-8">
              <dt>Sources</dt>
              <dd className="numeric font-mono">
                {sourcesRevealed ? `${sources}, revealed` : `${sources}, not yet revealed`}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt>People</dt>
              <dd className="numeric font-mono">
                {peopleRevealed ? `${people}, revealed` : `${people}, not yet revealed`}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt>RFPs</dt>
              <dd className="numeric font-mono">{tenders}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={resetToEmpty}
            className="rounded-control bg-surface-sunken px-12 py-8 text-left text-body text-fg-secondary transition-colors duration-micro ease-out hover:bg-surface-hover hover:text-fg"
          >
            Reset to empty
          </button>

          <RadixDialog.Close asChild>
            <button
              type="button"
              className="self-start rounded-field text-metadata text-fg-muted underline underline-offset-4 hover:text-fg"
            >
              Close
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
