/**
 * The bidder the draft deck is written for, and how it looks on a slide.
 *
 * Held apart from `companyProfile.ts`, which is Meridian Infratech and is what
 * eligibility is scored against. The two are deliberately not merged: eligibility
 * has a validated fixture behind it and changing the bidder there would rewrite
 * every expected verdict. Worth knowing that the deck therefore says TCIL while
 * the eligibility snapshot beside it still says Meridian.
 */

/** Sampled from the TCIL logo itself rather than guessed. */
export const TCIL_BLUE = '0233AC'
export const TCIL_INK = '13213D'
export const TCIL_MUTED = '5A6472'
export const TCIL_WASH = 'EEF2FB'
export const TCIL_RULE = 'C9D4EC'

/**
 * Public, checkable facts. Nothing here is invented.
 *
 * The capability slide is a different matter and is labelled on the slide as
 * illustrative, because the client asked for placeholder capability and a deck
 * that quietly mixes the two is worse than one that says which is which.
 */
export const TCIL = {
  name: 'Telecommunications Consultants India Limited',
  short: 'TCIL',
  standing: 'A Government of India Public Sector Enterprise under the Department of Telecommunications',
  incorporated: '1978',
  facts: [
    ['Ownership', 'Wholly owned by the Government of India, under the Department of Telecommunications'],
    ['Incorporated', '1978, New Delhi'],
    ['Standing', 'Miniratna Category-I public sector enterprise'],
    ['Practice', 'Telecom, IT and e-governance consultancy, turnkey projects and managed services'],
    ['Reach', 'Projects delivered across India and in Asia, Africa and the Middle East'],
    ['Quality', 'ISO certified delivery, with a public-sector procurement and compliance record'],
  ] as const,
}

/** Said on the slide, not just in a comment. */
export const ILLUSTRATIVE_NOTE =
  'Illustrative capability for this draft. Replace with audited project references before submission.'
