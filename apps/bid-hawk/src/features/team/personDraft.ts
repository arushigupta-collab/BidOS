import { DOMAIN_EXPERTISE, REGION_STATES, REGION_ZONES } from '@/data/seed/vocabulary'
import type { Person, TagGroupSeed } from '@/types'

/** A person being added or edited. Four fields; the role is a constant. */
export interface PersonDraft {
  name: string
  email: string
  domains: string[]
  regions: string[]
}

export const EMPTY_PERSON: PersonDraft = {
  name: '',
  email: '',
  domains: [],
  regions: [],
}

export function draftFromPerson(person: Person): PersonDraft {
  return {
    name: person.name,
    email: person.email,
    domains: [...person.domains],
    regions: [...person.regions],
  }
}

export const DOMAIN_GROUPS: TagGroupSeed[] = [{ label: 'Suggested', items: DOMAIN_EXPERTISE }]

/**
 * Zones and states are offered separately because they are different kinds of
 * answer, not two halves of one list. A person may hold both.
 */
export const REGION_GROUPS: TagGroupSeed[] = [
  { label: 'Zones', items: REGION_ZONES },
  { label: 'States', items: REGION_STATES },
]

/**
 * Deliberately not the RFC. It rejects what an operator actually mistypes — a
 * missing @, a missing domain, a trailing dot, a space — and accepts everything
 * else, because a stricter pattern rejects valid addresses and teaches nobody.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export type EmailProblem = 'empty' | 'no-at' | 'no-domain' | 'spaces' | null

export function emailProblem(value: string): EmailProblem {
  const email = value.trim()
  if (email === '') return 'empty'
  // Surrounding whitespace is forgiven; whitespace inside the address is not.
  if (/\s/.test(email)) return 'spaces'
  if (!email.includes('@')) return 'no-at'
  if (!EMAIL.test(email)) return 'no-domain'
  return null
}

/** Names the problem rather than reporting that the value is invalid. */
export function emailError(value: string): string | undefined {
  switch (emailProblem(value)) {
    case 'empty':
      return undefined
    case 'spaces':
      return 'An email address cannot contain a space.'
    case 'no-at':
      return 'This is missing the @ symbol.'
    case 'no-domain':
      return 'This is missing a domain, for example meridianinfratech.in.'
    default:
      return undefined
  }
}

export interface Missing {
  id: string
  /** Names the specific missing thing, never "complete all fields". */
  label: string
}

/**
 * Everything standing between this draft and a saved person. The disabled tooltip
 * reads from this list, so the control and its explanation cannot disagree.
 */
export function missingFrom(draft: PersonDraft): Missing[] {
  const out: Missing[] = []
  if (draft.name.trim() === '') out.push({ id: 'name', label: 'add a name' })

  const problem = emailProblem(draft.email)
  if (problem === 'empty') out.push({ id: 'email', label: 'add an email address' })
  else if (problem !== null) out.push({ id: 'email', label: 'correct the email address' })

  if (draft.domains.length === 0 && draft.regions.length === 0) {
    out.push({ id: 'expertise', label: 'add at least one area of expertise' })
  }

  return out
}

/** True when neither expertise field holds anything, which is the only pairing rule. */
export function expertiseMissing(draft: PersonDraft): boolean {
  return draft.domains.length === 0 && draft.regions.length === 0
}

export function sentenceList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
