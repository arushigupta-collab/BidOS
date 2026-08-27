import { PLATFORMS_BY_ID } from '@/data/seed/platforms'

/** A source being added. Five fields, and nothing that is not one of them. */
export interface SourceDraft {
  platformId: string
  url: string
  registeredId: string
  password: string
  keywords: string[]
}

export const EMPTY_DRAFT: SourceDraft = {
  platformId: '',
  url: '',
  registeredId: '',
  password: '',
  keywords: [],
}

/**
 * Choosing a platform fills in the listing URL it publishes and leaves anything
 * the operator has typed alone. Custom has no known URL, so it clears the field
 * and hands it back.
 */
export function applyPlatform(draft: SourceDraft, platformId: string): SourceDraft {
  const platform = PLATFORMS_BY_ID.get(platformId)
  if (!platform) return { ...draft, platformId }
  return { ...draft, platformId, url: platform.listingUrl }
}

export function idLabelFor(platformId: string): string {
  return PLATFORMS_BY_ID.get(platformId)?.idLabel ?? 'Registered ID'
}

export interface Missing {
  id: string
  /** Names the specific missing thing, never "complete all fields". */
  label: string
}

/**
 * Everything standing between this draft and a saved source. The disabled Add
 * tooltip reads from this list, so the control and its explanation cannot
 * disagree about what is outstanding.
 */
export function missingFrom(draft: SourceDraft): Missing[] {
  const out: Missing[] = []
  if (!draft.platformId) out.push({ id: 'platform', label: 'choose a platform' })
  if (draft.url.trim() === '') out.push({ id: 'url', label: 'add the listing URL' })
  if (draft.registeredId.trim() === '')
    out.push({ id: 'registeredId', label: `add the ${idLabelFor(draft.platformId).toLowerCase()}` })
  if (draft.password === '') out.push({ id: 'password', label: 'add the password' })
  if (draft.keywords.length === 0) out.push({ id: 'keywords', label: 'add at least one keyword' })
  return out
}

export function sentenceList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
