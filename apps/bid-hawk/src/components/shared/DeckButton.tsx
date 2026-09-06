import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { buttonClasses } from '@/components/ui'
import { ICON } from '@/lib/tokens'

/**
 * The draft deck, fetched fresh.
 *
 * The link the intake screen hands out expires in an hour, so the deck would
 * otherwise be an artefact of one sitting. This asks for a new one when the page
 * loads, which is also how it discovers whether a deck exists at all.
 *
 * Renders NOTHING when there is none. A tender read before this stage existed has
 * no draft, and a disabled control saying so would put a dead button on every
 * seeded tender in the feed.
 */
export function DeckButton({ rfpId }: { rfpId: string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!rfpId) return
    let live = true

    fetch('/api/deck-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfpId }),
    })
      .then((res) => (res.ok ? res.json() : { url: null }))
      .then((json: { url: string | null }) => live && setUrl(json.url))
      // Silent: a missing deck is not an error worth putting on a tender page,
      // and the button simply does not appear.
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [rfpId])

  if (!url) return null

  return (
    <a href={url} download className={buttonClasses({ variant: 'secondary' })}>
      <Download size={ICON.md} aria-hidden="true" />
      Draft proposal
    </a>
  )
}
