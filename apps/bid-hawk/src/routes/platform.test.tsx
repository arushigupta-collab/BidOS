import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { MODULES } from '@/features/platform/modules'
import { PEOPLE } from '@/data/seed/people'
import { SOURCES } from '@/data/seed/sources'
import { TENDERS } from '@/data/seed/tenders'
import { useWorkspace } from '@/store/useWorkspace'
import { ROUTER_FUTURE, ROUTES } from './router'

beforeEach(() => {
  useWorkspace.getState().resetToEmpty()
})

/** Mounts the real shell and route tree, and fails on any console noise. */
function renderAt(path: string) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const router = createMemoryRouter(ROUTES, { initialEntries: [path], future: ROUTER_FUTURE })
  const result = render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
  return { ...result, router, warn, error }
}

describe('BidOS landing', () => {
  it('leads with the platform, not with a module', () => {
    const { warn, error } = renderAt('/')

    expect(screen.getByRole('heading', { level: 1, name: 'BidOS' })).toBeInTheDocument()
    expect(screen.getByText('The operating layer for bidding')).toBeInTheDocument()
    /*
     * The line counts the cards, and the two have drifted apart twice: "Six
     * modules" over four cards, then "Four modules" over six. A literal in a
     * sentence is invisible to a test that counts cards, so it is derived here
     * and derived in the component.
     */
    const spelled = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven']
    expect(screen.getByText(`${spelled[MODULES.length]} modules. One bid lifecycle.`)).toBeInTheDocument()

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('states every card as one list, in the platform words', () => {
    renderAt('/')

    const list = screen.getByRole('list', { name: 'BidOS modules' })
    // Against the constant. Written as a literal 4 it survived the grid going to
    // six and back, saying nothing either time.
    expect(within(list).getAllByRole('listitem')).toHaveLength(MODULES.length)

    for (const module of MODULES) {
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(module.name) })).toBeInTheDocument()
      expect(screen.getByText(module.description)).toBeInTheDocument()
      expect(screen.getByRole('img', { name: module.name })).toBeInTheDocument()
    }

    // No ordinals. They were mono numerals in the amber accent, which CLAUDE.md
    // reserves for agent activity and time-sensitive metadata — a card index is
    // neither — and they contradicted their own removal from Bid Hawk's flow band.
    for (const ordinal of ['01', '02', '03', '04', '05', '06']) {
      expect(within(list).queryByText(ordinal)).not.toBeInTheDocument()
    }
  })

  it('renders every card in MODULES order', () => {
    renderAt('/')

    const list = screen.getByRole('list', { name: 'BidOS modules' })
    const rendered = within(list)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('h2')?.textContent?.trim())

    // Asserted against the CONSTANT, not a literal list, so the two cannot drift: the grid
    // is a MODULES.map with no hardcoded positions, and this is what proves it.
    expect(rendered).toEqual(MODULES.map((module) => module.name))

    // And the constant itself is the order the client set. Spelled out once so a
    // reordering of MODULES has to be deliberate rather than accidental.
    expect(rendered).toEqual([
      'Opportunity Management',
      'Bid Hawk',
      'Bid Orchestrator',
      'Bid Author',
      'Bid Partners',
      'Project Management',
    ])

    /*
     * BIDOS STILL HAS FOUR MODULES. The first and last cards are adjacent systems
     * either side of the bid and are not in the naming hierarchy; their place on
     * the row is chronological -- the deal, the bid, the delivery -- and reading it
     * as a ranking would be reading six modules where there are four.
     */
    expect(rendered.filter((name) => name?.startsWith('Bid '))).toEqual([
      'Bid Hawk', 'Bid Orchestrator', 'Bid Author', 'Bid Partners',
    ])
  })

  it('sends each card to its own target, so a reorder cannot swap label and destination', () => {
    renderAt('/')

    const list = screen.getByRole('list', { name: 'BidOS modules' })
    const pairs = within(list)
      .getAllByRole('listitem')
      .map((item) => ({
        name: item.querySelector('h2')?.textContent?.trim(),
        href: item.querySelector('a')?.getAttribute('href'),
      }))

    // The failure mode a reorder introduces is a card keeping its old neighbour's link.
    // Each name is checked against its OWN href, not against position.
    // Every URL checked individually. A reorder that moves a label without its target is
    // the failure mode here, and only a name-to-href pairing catches it.
    expect(pairs).toEqual([
      /*
       * First on the row: the deal exists before the tender does. Straight to its
       * sign-in, which is the honest destination -- it has one, and landing
       * somebody on a page that immediately bounces them is a worse arrival.
       */
      {
        name: 'Opportunity Management',
        href: 'https://emb-global-crm.vercel.app/login?redirectTo=%2F',
      },
      { name: 'Bid Hawk', href: '/bid-hawk' },
      { name: 'Bid Orchestrator', href: 'https://bid-orchestrator.vercel.app/' },
      { name: 'Bid Author', href: 'https://bid-author.vercel.app/' },
      /*
       * The registry, not the module's introduction. That introduction was a page
       * whose only content described the page after it, and it made this the one
       * card that opened a description rather than the work.
       */
      { name: 'Bid Partners', href: '/bid-partners/registry' },
      /*
       * Last on the row: what happens after a win. Hardcoded rather than
       * configurable -- somebody else's product at somebody else's address, the
       * same in every environment -- and loaded once, returning 200, before being
       * committed. A pattern-derived hostname shipped once and returned
       * DEPLOYMENT_NOT_FOUND, so every outbound href is checked on the way in.
       */
      { name: 'Project Management', href: 'https://tcil-pm.vercel.app/' },
    ])
  })

  it('caps every landing description at 150 characters, short-form not verbatim', () => {
    for (const module of MODULES) {
      expect(module.description.length, module.name).toBeLessThanOrEqual(150)
    }

    // The landing text deliberately differs from the intro screens. At six cards in three
    // columns the card holds about 288px of text, and Bid Hawk's 240-character verbatim
    // description runs to seven lines there and breaks the grid.
    const intro = readFileSync('CLAUDE.md', 'utf8')
    expect(intro).toMatch(/The Bid Hawk module helps you source RFP briefs/)
    const hawk = MODULES.find((m) => m.id === 'bid-hawk')!
    expect(hawk.description).not.toMatch(/^The Bid Hawk module helps you/)
  })

  it('prints no credential on the landing, which is a public page', () => {
    renderAt('/')

    /**
     * THIS IS THE ASSERTION THAT MATTERS MOST ON THIS PAGE.
     *
     * The Opportunity Management card used to print a live address and password
     * in plain text, on a public and indexable Vercel page, for a deployment with
     * no sign-in of its own. CLAUDE.md held it as an open item; removing the card
     * resolved it by accident.
     *
     * The card is back. The credentials are not, and this is what keeps it that
     * way -- restoring them is a failing test rather than a judgement call. The
     * deployed reference at emb-bidos.vercel.app still prints them.
     */
    const page = document.body.textContent ?? ''
    expect(page).not.toMatch(/@emb[.]global/)
    expect(page).not.toMatch(/EMB@[0-9]{4}/)
    expect(page).not.toMatch(/password/i)
  })

  it('lays the cards in a 3x2 from lg, a 2x3 from sm, one column below that', () => {
    renderAt('/')

    const list = screen.getByRole('list', { name: 'BidOS modules' })

    // One column narrow, two from sm, three from lg — a 3x2 at six cards. Never
    // more than three across: a fourth column pushes every description to a
    // measure it cannot hold. An instructed exception to the forbidden-patterns
    // list, scoped to this page; CLAUDE.md's exception always said the count
    // changes with the card count and the scope does not.
    expect(list.className).toContain('grid-cols-1')
    expect(list.className).toContain('sm:grid-cols-2')
    expect(list.className).toContain('lg:grid-cols-3')
    expect(list.className).not.toContain('lg:grid-cols-4')
    // NOT stretched. The fixed description block equalises the cards by construction,
    // across both rows rather than only within one; stretch would equalise the card
    // and leave the content ragged.
    expect(list.className).not.toContain('items-stretch')
  })

  it('keeps each card portrait at every width, never a horizontal row', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    for (const card of cards) {
      expect(card.className).toContain('flex-col')
      // Nothing turns the composition horizontal at any breakpoint.
      expect(card.className).not.toMatch(/(sm|md|lg|xl):flex-row/)
    }

    // NO max-width on the card at any breakpoint. The pair it used to carry —
    // `max-w-module lg:max-w-none` — is symmetric only while the lg reset applies, and
    // a card stranded at its below-lg cap strands dead space beside a left-aligned
    // wrapper. The grid fills its container unconditionally now.
    for (const item of within(screen.getByRole('list', { name: 'BidOS modules' })).getAllByRole('listitem')) {
      expect(item.className).not.toMatch(/max-w-/)
      expect(item.className).not.toContain('mx-auto')
    }
  })

  it('aligns every action by construction, not by pushing it to the card foot', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    // The descriptions run 20 to 45 words, and the block is fixed to the longest, so
    // the action sits at the same offset in every card with a plain fixed gap. No
    // mt-auto: that pushes the action to the card's foot and opens a band above it.
    for (const card of cards) {
      const action = card.lastElementChild as HTMLElement
      expect(action.className).toContain('mt-8')
      expect(action.className).not.toContain('mt-auto')
      expect(action.querySelector('a')).not.toBeNull()
    }
  })

  it('treats all six as peers: identical cards, identical filled primaries', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    // Same surface, same border, same elevation. No card is elevated over another.
    expect(new Set(cards.map((card) => card.className)).size).toBe(1)

    // Class tokens, not substrings: 'hover:border-border-strong' legitimately
    // contains the resting token's name and is not a resting treatment.
    const resting = cards[0].className.split(/\s+/).filter((c) => !c.includes(':'))
    // A flat surface step, not a gradient: exception (b) is retired.
    expect(resting).toContain('bg-surface-sunken')
    expect(resting).toContain('border-border')
    expect(resting).not.toContain('bg-module-card')
    expect(resting).not.toContain('border-border-strong')

    // One filled primary per card, which overrides the one-primary-per-view rule
    // for this page only. See decision 193: peers, with no basis for ranking them.
    const actions = screen.getAllByRole('link', { name: /try now/i })
    expect(actions).toHaveLength(MODULES.length)
    expect(new Set(actions.map((action) => action.className)).size).toBe(1)
    for (const action of actions) expect(action.className).toContain('bg-primary')
  })

  it('makes every action live, with nothing disabled anywhere', () => {
    renderAt('/')

    const actions = screen.getAllByRole('link', { name: /try now/i })
    expect(actions).toHaveLength(MODULES.length)

    // The disabled state and its tooltip are gone, not hidden.
    expect(screen.queryByRole('button', { name: /try now/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/deploying shortly/i)).not.toBeInTheDocument()

    // NOTHING takes focus on load. This asserted the opposite until the ring it caused
    // was reported: Chrome matches :focus-visible on a programmatic focus when the last
    // input was not a pointer, so card 01's action rendered ringed on a fresh load while
    // the other three did not.
    expect(document.body).toHaveFocus()
    for (const action of actions) {
      expect(action).not.toHaveFocus()
    }
  })

  it('takes no focus on load, and keeps the ring on :focus-visible only', () => {
    const view = renderAt('/')

    // 1. No mount effect, no autoFocus, no ref plumbing anywhere on this page.
    const source =
      readFileSync('src/features/platform/LandingPage.tsx', 'utf8') +
      readFileSync('src/features/platform/ModuleCard.tsx', 'utf8')
    expect(source).not.toMatch(/autoFocus/)
    expect(source).not.toMatch(/\.focus\(\)/)

    // 2. The four actions are now structurally identical: the conditional ref was the
    //    one thing that made card 01 unlike its peers.
    const actions = screen.getAllByRole('link', { name: /try now/i })
    const classes = actions.map((action) => action.className)
    expect(new Set(classes).size, 'the four actions carry one class list').toBe(1)

    expect(document.activeElement).toBe(document.body)
    view.unmount()

    // 3. The ring is a GLOBAL rule and it is scoped to :focus-visible, with the plain
    //    :focus case explicitly suppressed so a mouse click never leaves one behind.
    //    It lives in base.css, not on the Button primitive, so no component may reapply
    //    it on bare :focus.
    const base = readFileSync('src/styles/base.css', 'utf8')
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:/)
    expect(base).toMatch(/:focus:not\(:focus-visible\)\s*\{[^}]*outline:\s*none/)
    expect(readFileSync('src/components/ui/Button.tsx', 'utf8')).not.toMatch(/focus:/)
  })

  it('sends all six to their own address, all in the same tab', () => {
    renderAt('/')

    const actions = screen.getAllByRole('link', { name: /try now/i })

    // Bound to each module's own entry rather than destructured by position. The positional
    // version broke the moment MODULES was reordered, which is the failure mode the code
    // does not have and the test did: the cards render from MODULES, so a card cannot
    // inherit its neighbour's link, but a test can assume it did not move.
    for (const module of MODULES) {
      const card = screen
        .getByRole('heading', { level: 2, name: new RegExp(module.name) })
        .closest('li') as HTMLElement
      expect(card, module.name).not.toBeNull()
      expect(within(card).getByRole('link', { name: /try now/i })).toHaveAttribute(
        'href',
        module.href,
      )
    }

    // The three modules are one product, so nothing announces a departure: no new
    // tab, no rel (which only matters alongside target), no external glyph, and no
    // accessible name claiming otherwise. Browser back returns here.
    for (const action of actions) {
      expect(action).not.toHaveAttribute('target')
      expect(action).not.toHaveAttribute('rel')
      expect(action).toHaveAccessibleName('Try now')
    }
  })

  it('gives all six the same trailing arrow', () => {
    renderAt('/')

    const glyphs = screen
      .getAllByRole('link', { name: /try now/i })
      .map((action) => action.querySelector('svg')?.innerHTML ?? '')

    expect(glyphs).toHaveLength(MODULES.length)
    expect(glyphs.every((g) => g !== '')).toBe(true)
    // One arrow, not a diagonal on two of them.
    expect(new Set(glyphs).size).toBe(1)
  })

  it('never dims a card, and hovers on elevation rather than colour', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    for (const card of cards) {
      expect(card.className).not.toContain('opacity')
      // Hover firms the edge. No scale, no glow, no fill change: the card is not a
      // button and should not behave like one.
      expect(card.className).toContain('hover:border-border-strong')
      expect(card.className).not.toMatch(/hover:(scale|bg-)/)
    }
  })

  it('carries the version and copyright on this page only', () => {
    const { unmount } = renderAt('/')

    const footer = document.querySelector('footer') as HTMLElement
    expect(footer).not.toBeNull()
    expect(within(footer).getByText('v1.3')).toBeInTheDocument()
    expect(within(footer).getByText(/© 2026 EMB Global\. All rights reserved\./)).toBeInTheDocument()

    unmount()

    for (const path of ['/bid-hawk', '/sources', '/team']) {
      const view = renderAt(path)
      expect(document.querySelector('footer')).toBeNull()
      view.unmount()
    }
  })

  it('carries the canvas chrome outside the workspace', () => {
    renderAt('/')

    expect(screen.getByRole('img', { name: 'EMB Global' })).toBeInTheDocument()
    expect(screen.getByText('Sovereign · IN-North')).toBeInTheDocument()
  })

  it('suppresses the canvas wordmark here and keeps it on every other route', () => {
    const { unmount } = renderAt('/')

    // Set at Display size inside the card, so the canvas does not repeat it. Two
    // BidOS wordmarks on one screen read as a duplication defect.
    expect(screen.getByRole('heading', { level: 1, name: 'BidOS' })).toBeInTheDocument()
    expect(screen.getAllByText(/^Bid/).filter((n) => n.tagName === 'P')).toHaveLength(0)
    // The environment string stays, so the canvas does not reflow between routes.
    expect(screen.getByText('Sovereign · IN-North')).toBeInTheDocument()

    unmount()

    for (const path of ['/bid-hawk', '/bid-partners', '/sources', '/team']) {
      const view = renderAt(path)
      const wordmark = screen
        .getAllByText((_, node) => node?.textContent === 'BidOS' && node.tagName === 'P')
        .filter((n) => n.className.includes('text-panel-title'))
      expect(wordmark.length, path).toBeGreaterThan(0)
      view.unmount()
    }
  })

  it('sets the wordmark at Display and never lets it collapse again', () => {
    renderAt('/')

    const wordmark = screen.getByRole('heading', { level: 1, name: 'BidOS' })

    // The size lives in a named style, so the guard is on the token the style reads.
    expect(wordmark.className).toContain('text-display')

    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    const display = tokens.match(/--type-display:\s*([0-9.]+)rem/)
    expect(display, '--type-display is missing').not.toBeNull()
    const px = Number(display?.[1]) * 16

    // This regressed once, to roughly 20px and below the card names. 48 is the floor.
    expect(px, `--type-display computes to ${px}px`).toBeGreaterThanOrEqual(48)

    // And it must stay larger than any module name.
    const sectionTitle = Number(
      tokens.match(/--type-section-title:\s*([0-9.]+)rem/)?.[1] ?? 0,
    ) * 16
    expect(px).toBeGreaterThan(sectionTitle)
  })

  it('puts every card button at an identical offset from its own card top', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    // Equal by construction: identical padding, an identical mark row, and a
    // description block fixed to five lines whatever the description's own length.
    // That is what aligns the four across BOTH rows, not merely within one.
    for (const card of cards) {
      const description = card.querySelector('p')
      expect(description?.className).toContain('min-h-description')
      expect(card.className).toContain('py-20')
      // Horizontal padding is unchanged and stays: it is the breathing room that
      // fixed the cramped feeling, and it is symmetric by construction.
      expect(card.className).toContain('px-24')
    }

    // None of the mechanisms that equalise the card while leaving content ragged.
    const list = screen.getByRole('list', { name: 'BidOS modules' })
    expect(list.className).not.toContain('items-stretch')
    for (const card of cards) {
      expect(card.className).not.toContain('h-full')
      expect(card.querySelector('.mt-auto')).toBeNull()
      expect(card.className).not.toContain('justify-between')
    }
  })

  it('holds every description inside its block, so a copy change cannot open a gap', () => {
    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    const lines = Number(
      tokens.match(/--size-description-block:\s*calc\((\d+)/)?.[1] ?? 0,
    )
    expect(lines, 'the block is not expressed as a line count').toBeGreaterThan(0)

    // FOUR, and four is now true at every supported width rather than at one of them.
    // The description is capped at its own measure, `--measure-landing`, so its line
    // count no longer moves with the viewport: the longest of the four renders on four
    // lines at 1190, 1280 and 1440, measured in Chrome. The block therefore holds
    // exactly its own content, which is what keeps the gap below the longest
    // description at 16 rather than a spare line more.
    const LONGEST_RENDERED_LINES = 4
    expect(lines).toBe(LONGEST_RENDERED_LINES)

    // A rough upper bound on wrapping, from the real character counts at the 504px
    // measure the paragraph is capped to, which fits roughly 66 characters.
    const CHARS_PER_LINE = 66
    for (const module of MODULES) {
      const wrapped = Math.ceil(module.description.length / CHARS_PER_LINE)
      expect(wrapped, `${module.name} wraps to ${wrapped} lines`).toBeLessThanOrEqual(lines)
    }
  })

  it('leaves the content inset equal on both sides, at every width', () => {
    renderAt('/')

    const list = screen.getByRole('list', { name: 'BidOS modules' })
    const wrapper = list.parentElement as HTMLElement
    const container = wrapper.parentElement as HTMLElement

    // jsdom does not lay out, so this asserts the STRUCTURE that makes the two insets
    // equal rather than the pixels, which are measured in Chrome instead: at 1190, 1280
    // and 1440 the left inset and the right inset both read 72.
    //
    // Three facts together are what force it, and each has been the defect at least
    // once, so each is asserted separately.

    // 1. The card's horizontal padding is ONE symmetric value, not a left and a right.
    const padding = container.className
      .split(/\s+/)
      .filter((token) => /^(md:)?p[xlr]-/.test(token))
    for (const token of padding) {
      expect(token, `${token} sets one side only`).toMatch(/^(md:)?px-/)
    }
    expect(padding.length, 'no horizontal padding on the container').toBeGreaterThan(0)

    // 2. The wrapper fills that padding box. A max-width here is symmetric only until
    //    it engages, and above roughly a 1260 viewport it does.
    expect(wrapper.className).toContain('w-full')
    expect(wrapper.className).not.toContain('max-w-')

    // 3. The grid fills the wrapper, and no card carries a cap that would strand it
    //    narrower than its own column.
    expect(list.className).toContain('w-full')
    const cards = within(list)
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)
    for (const card of cards) {
      expect(card.className).toContain('w-full')
      expect(card.className).not.toContain('max-w-')
    }

    // The rule and the metadata line are siblings of the grid inside the wrapper, so
    // they end where it ends. Neither may carry a width of its own.
    // The rule is a decorative Radix Separator, so it carries `role="none"` and is
    // found by its orientation attribute rather than by a separator role.
    const rule = wrapper.querySelector('[data-orientation="horizontal"]') as HTMLElement
    expect(rule, 'the hairline rule').not.toBeNull()
    expect(rule.className).not.toContain('max-w-')
    expect(rule.className).not.toContain('w-1/')
    const meta = screen.getByText(/modules\. One bid lifecycle\./)
    expect(meta.className).not.toContain('max-w-')
  })

  it('holds the description to its own measure, not the card width', () => {
    renderAt('/')

    const descriptions = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.querySelector('p') as HTMLElement)

    // The measure moved off the composition and onto the paragraph. This is what makes
    // the line count viewport independent, and therefore what makes the four-line block
    // exact rather than one line of slack at the widths where it does not bind.
    for (const description of descriptions) {
      expect(description.className).toContain('max-w-landing')
      expect(description.className).toContain('min-h-description')
    }

    const tokens = readFileSync('src/styles/tokens.css', 'utf8')
    // A px measure, not `--measure-prose`: 68ch computes to 600px at this font size and
    // so never engaged inside a card.
    expect(tokens).toMatch(/--measure-landing:\s*\d+px/)
    const measure = Number(tokens.match(/--measure-landing:\s*(\d+)px/)?.[1] ?? 0)
    expect(measure).toBeGreaterThan(400)
    expect(measure).toBeLessThan(600)
  })

  it('gives the cards a flat surface step, with the gradient retired', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    for (const card of cards) {
      expect(card.className).toContain('bg-surface-sunken')
      expect(card.className).not.toContain('bg-module-card')
      expect(card.className).toContain('border-border')
    }
    // Retired exception (b): no gradient anywhere in the product now.
    expect(readFileSync('tailwind.config.ts', 'utf8')).not.toContain('module-card')
  })

  it('left aligns the header block on the same axis as card 01', () => {
    renderAt('/')

    // The wrapper holds the header row, the rule and the grid, and it is not centred,
    // so all three share its left edge. It is the grid's grandparent.
    const list = screen.getByRole('list', { name: 'BidOS modules' })
    const wrapper = list.parentElement as HTMLElement
    expect(wrapper).not.toBeNull()
    // NO max-width on the wrapper. It capped at 1180 and was left anchored, which is
    // symmetric only until the cap engages: at 1440 it stranded 116px to the right of
    // the block. The cap moved onto the description, where the measure actually lives.
    expect(wrapper.className).not.toContain('max-w-')
    expect(wrapper.className).toContain('w-full')
    expect(wrapper?.className).not.toContain('mx-auto')
    expect(wrapper?.className).not.toContain('items-center')
    expect(within(wrapper).getByRole('heading', { level: 1, name: 'BidOS' })).toBeInTheDocument()

    // Nothing in the header block is centred any more.
    for (const node of [screen.getByRole('heading', { level: 1, name: 'BidOS' })]) {
      expect(node.className).not.toContain('text-center')
    }
  })

  it('gives every card a fixed description block and a natural-width action', () => {
    renderAt('/')

    const cards = within(screen.getByRole('list', { name: 'BidOS modules' }))
      .getAllByRole('listitem')
      .map((item) => item.firstElementChild as HTMLElement)

    for (const card of cards) {
      // Same height by construction: the block is fixed to the longest description.
      const description = card.querySelector('p')
      expect(description?.className).toContain('min-h-description')
    }

    // Natural width, not a full-width navy bar, and all four identical.
    const actions = screen.getAllByRole('link', { name: /try now/i })
    expect(new Set(actions.map((a) => a.className)).size).toBe(1)
    for (const action of actions) {
      expect(action.className).toContain('w-fit')
      expect(action.className).not.toContain('w-full')
    }
  })

  it('offers no module-level navigation, because this is the platform level', () => {
    const { unmount } = renderAt('/')

    // Sources, people and the feed are Bid Hawk's own screens. Offering them here
    // would be a way into a module's configuration without entering the module.
    expect(screen.queryByRole('navigation', { name: 'Workspace' })).not.toBeInTheDocument()

    unmount()

    // One level in, the same nav is present.
    const view = renderAt('/bid-hawk')
    expect(screen.getByRole('navigation', { name: 'Workspace' })).toBeInTheDocument()
    view.unmount()
  })

  it('gives an unknown address a route back, under the two-branch router', async () => {
    renderAt('/no-such-screen')

    // The catch-all lives in the second branch, so the branch that owns the index
    // route must not shadow it.
    expect(
      await screen.findByRole('heading', { name: /does not match a BidOS surface/i }),
    ).toBeInTheDocument()
    // Its way back names the platform, not the setup path that used to live at #/.
    expect(screen.getByRole('button', { name: /back to BidOS/i })).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeNull()
  })
})

describe('Bid Hawk, State A', () => {
  it('opens on its own introduction, not on the setup steps', async () => {
    const { warn, error } = renderAt('/bid-hawk')

    expect(screen.getByRole('heading', { level: 1, name: 'Bid Hawk' })).toBeInTheDocument()
    // "MODULE", never a suite. This was CLAUDE.md's open item 1, resolved alongside Bid
    // Partners' identical label.
    expect(screen.getByText('Module')).toBeInTheDocument()
    expect(screen.queryByText(/suite/i)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bid Hawk' })).toBeInTheDocument()
    expect(
      screen.getByText(
        /Reads a tender document against your eligibility, flags what is wrong with it, splits the work across your team and assigns an owner\./,
      ),
    ).toBeInTheDocument()

    // Two ways in, and which is which is not in question: reading a tender is
    // what the module is for, and configuring sourcing is preparation for it.
    expect(screen.getByRole('button', { name: /read a tender/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set up sourcing/i })).toBeInTheDocument()

    // Neither destination is already on screen.
    expect(screen.queryByText(/Drop a tender document here/i)).not.toBeInTheDocument()

    // The setup steps are one press away, not already here.
    expect(screen.queryByText('Connect your platforms')).not.toBeInTheDocument()

    // Nothing takes focus on arrival, so the heading is read first.
    expect(document.body).toHaveFocus()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('states the three stages as unnumbered capabilities, not as three cards', () => {
    renderAt('/bid-hawk')

    const band = screen.getByLabelText('What Bid Hawk does')
    const stages = band.querySelectorAll('li')
    expect(stages).toHaveLength(3)

    for (const title of ['RFP Sourcing', 'Summarisation', 'Assignation']) {
      expect(within(band).getByText(title)).toBeInTheDocument()
    }

    // No ordinals. This is the band's intended design and it must not regress:
    // it is the third time they have been taken out. See decision 204.
    for (const ordinal of ['01', '02', '03']) {
      expect(within(band).queryByText(ordinal)).not.toBeInTheDocument()
    }

    expect(within(band).getByText(/polls the platforms you connect/i)).toBeInTheDocument()
    expect(within(band).getByText(/EMD and PBG\s+exposure/)).toBeInTheDocument()
    expect(within(band).getByText(/holds weak\s+matches for review/)).toBeInTheDocument()

    // One recessed surface with hairlines between stages, not three bordered cards.
    expect(band.className).toContain('bg-surface-sunken')
    expect((stages[0] as HTMLElement).className).not.toContain('border-t')
    expect((stages[1] as HTMLElement).className).toContain('border-t')
    expect((stages[2] as HTMLElement).className).toContain('border-t')
  })
})

describe('Bid Hawk, A to B and back', () => {
  it('transitions in place, keeps the route, and moves focus to the new primary', async () => {
    const { router, warn, error } = renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })

    const connect = await screen.findByRole('button', { name: /connect sources/i })

    // Same route: State A receded, it did not navigate.
    expect(router.state.location.pathname).toBe('/bid-hawk')
    expect(screen.getByRole('heading', { level: 1, name: 'Bid Hawk' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /set up sourcing/i })).not.toBeInTheDocument()
    })
    expect(connect).toHaveFocus()

    // The band explains State A and has no business repeating itself here.
    expect(screen.queryByLabelText('What Bid Hawk does')).not.toBeInTheDocument()

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('announces each state change to assistive technology', async () => {
    renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent(/sourcing setup opened/i)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent(/returned to the bid hawk overview/i)
  })

  it('is not a one-way door: Back returns to State A and restores focus', async () => {
    const { router } = renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    await screen.findByRole('button', { name: /connect sources/i })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    })

    const begin = await screen.findByRole('button', { name: /set up sourcing/i })
    expect(begin).toHaveFocus()
    // Back means State A, not the platform. The platform is the shell's job.
    expect(router.state.location.pathname).toBe('/bid-hawk')
    expect(screen.getByLabelText('What Bid Hawk does')).toBeInTheDocument()
  })

  it('offers both steps once open, neither gated on the other', async () => {
    renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })

    expect(await screen.findByText('Connect your platforms')).toBeInTheDocument()
    expect(screen.getByText('Add your bid managers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect sources/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^add people$/i })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /available after/i })).not.toBeInTheDocument()
  })

  it('hands step 01 to the add-source screen', async () => {
    const { router } = renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /connect sources/i }))
    })

    expect(router.state.location.pathname).toBe('/sources/new')
    expect(await screen.findByRole('heading', { level: 1, name: 'Add source' })).toBeInTheDocument()
  })

  it('sends step 02 to the people screen', async () => {
    const { router } = renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^add people$/i }))
    })

    expect(router.state.location.pathname).toBe('/team/new')
    expect(await screen.findByRole('heading', { level: 1, name: 'Add people' })).toBeInTheDocument()
  })

  it('reports each side as started once it holds a record', async () => {
    renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    await screen.findByRole('button', { name: /connect sources/i })

    await act(async () => {
      useWorkspace.getState().addSources([
        {
          id: 's-test',
          name: 'GeM',
          platformId: 'gem',
          url: 'https://gem.gov.in/bidlists',
          registeredId: 'GEM-SLR-1',
          credentialLabel: 'Vault-encrypted portal login',
          keywords: ['system integrator'],
          status: 'active',
          addedAt: new Date().toISOString(),
        },
      ])
    })

    // The label reports the state without ever disabling the control.
    expect(await screen.findByRole('button', { name: /manage sources/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^add people$/i })).toBeEnabled()
  })
})

describe('Getting back to the platform', () => {
  /** Every screen inside the module, including the two nested ones. */
  const INSIDE = ['/bid-hawk', '/sources', '/sources/new', '/team', '/team/new', '/feed']
  const NESTED = ['/feed/t-mahait-rts2', '/team/p-meera/edit']

  function withEverything() {
    useWorkspace.setState({
      sources: SOURCES.map((row) => ({ ...row })),
      people: PEOPLE.map((row) => ({ ...row })),
      tenders: TENDERS.map((row) => ({ ...row })),
      sourcesRevealed: true,
      peopleRevealed: true,
    })
  }

  it('offers both affordances on every screen inside the module', async () => {
    withEverything()

    for (const path of [...INSIDE, ...NESTED]) {
      const view = renderAt(path)

      const logo = screen.getByRole('link', { name: 'BidOS home' })
      expect(logo, path).toHaveAttribute('href', '/')

      const nav = screen.getByRole('navigation', { name: 'Workspace' })
      const item = within(nav).getByRole('link', { name: 'BidOS' })
      expect(item, path).toHaveAttribute('href', '/')

      view.unmount()
    }
  })

  it('returns to the platform from a nested route, by the logo', async () => {
    withEverything()
    const { router } = renderAt('/feed/t-mahait-rts2')

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'BidOS home' }))
    })

    expect(router.state.location.pathname).toBe('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'BidOS' })).toBeInTheDocument()
  })

  it('returns to the platform from a nested route, by the nav item', async () => {
    withEverything()
    const { router } = renderAt('/team/p-meera/edit')

    const nav = screen.getByRole('navigation', { name: 'Workspace' })
    await act(async () => {
      fireEvent.click(within(nav).getByRole('link', { name: 'BidOS' }))
    })

    expect(router.state.location.pathname).toBe('/')
  })

  it('renders neither affordance on the platform page itself', () => {
    renderAt('/')

    // The logo is a plain image there: a link to the current page does nothing.
    expect(screen.queryByRole('link', { name: 'BidOS home' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'EMB Global' })).toBeInTheDocument()
    // And there is no module nav at all to carry the item.
    expect(screen.queryByRole('navigation', { name: 'Workspace' })).not.toBeInTheDocument()
  })

  it('separates leaving the module from moving within it', () => {
    withEverything()
    renderAt('/feed')

    const nav = screen.getByRole('navigation', { name: 'Workspace' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => (link.textContent ?? '').replace(/\d+$/, '').trim())

    // BidOS leads, then the working screen, then configuration.
    // BidOS leads, then the two things somebody opens Bid Hawk to do. Sources and
    // People are configuration and are no longer offered here.
    expect(labels).toEqual(['BidOS', 'RFP feed', 'Read a tender'])

    // Two hairlines: one after BidOS, one after the feed. Hidden from AT, since
    // the grouping is visual.
    const dividers = nav.querySelectorAll('li[aria-hidden="true"]')
    expect(dividers).toHaveLength(2)
  })

  it('carries no Back to BidOS inside the setup path any more', async () => {
    renderAt('/bid-hawk')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /set up sourcing/i }))
    })
    await screen.findByRole('button', { name: /connect sources/i })

    // Its job moved into the shell; Back here means State A.
    expect(screen.queryByRole('button', { name: /back to BidOS/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
  })
})
