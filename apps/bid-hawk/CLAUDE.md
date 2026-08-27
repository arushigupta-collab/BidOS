# BidOS · Bid Hawk

This file supersedes all previous versions. Anything not stated here is not a
rule. Do not carry over conventions from earlier sessions, earlier decision
logs, or docs/BUILD-PLAN.md, which is obsolete.

## What this is

A frontend-only product demonstration built by EMB to show platform capability
to prospective enterprise and government clients. It is NOT built for a single
named client, and no client name appears anywhere in the product.

The product must read as mature software already running in production. Never
as a mockup, a prototype, or an AI-generated interface. Avoiding the last of
those is an explicit goal of this build, not an afterthought.

## Naming hierarchy, non-negotiable

```
EMB Global         the company. Logo only, no descriptive text
BidOS              the platform. Its landing page is the product's entry point
Bid Hawk           a module inside BidOS
Bid Orchestrator   a module inside BidOS. Deployed elsewhere
Bid Author         a module inside BidOS. Deployed elsewhere
Bid Partners       a module inside BidOS
```

Project Management and Opportunity Management were on the `/` landing as adjacent
systems either side of the bid. They have been REMOVED at the client's request.
They were never modules -- the hierarchy always said four -- and they are back on
the landing at the client's request as what they are: adjacent systems either side
of the bid, sitting after the four rather than among them.

BidOS has four modules and no more. None of them is the platform, and none is a
suite. The positioning line is "The operating layer for bidding".

**BidOS has exactly four modules.** The landing shows six cards: the four, then
Project Management and Opportunity Management, which are adjacent systems and not
part of this hierarchy. The card count has changed twice and the scope has not.

**The card order on `/` is set by the client: Bid Hawk, Bid Orchestrator, Bid Author,
Bid Partners, Project Management, Opportunity Management.** It holds in the `MODULES` constant, on the `/` grid, in the list above
and in the descriptions below. The grid renders straight from `MODULES` with no
positions hardcoded, so order and membership live in one place. Do not reorder it to a
lifecycle reading without being asked: that was proposed and the client chose this
instead.

Each module runs three stages:

```
Bid Hawk       RFP Sourcing      Summarisation      Assignation
Bid Partners   Partner Registry  Response Tracker   Partner Evaluation
```

Bid Hawk and Bid Partners are built here. Bid Orchestrator and Bid Author are in
production separately and are linked from the landing by absolute URL. All four
module cards are identical and all four actions are live; adding or moving a URL
must be a single line in `MODULES`.

Bid Hawk does three things, and they are the only three: it sources RFP briefs
from the platforms you connect, summarises each one, and assigns it to a bid
manager using your organisational rules.

There is no second agent. "Scout" does not exist: everything an agent does in
this product is done by Bid Hawk itself. "Build Team" is out of scope and must
not appear.

"Bid Hawk" is a first-class product name and appears prominently. It is not
banned under this file.

**THE LANDING NO LONGER USES THE VERBATIM DESCRIPTIONS.** At six cards in three columns a
card holds roughly 288px of text, where Bid Hawk's 240-character version runs to seven
lines and breaks the grid. `/` carries SHORT descriptions capped at 150 characters, two
to three lines each, held in `MODULES`. Do not restore the verbatim text there.

**And they are no longer used anywhere in the product.** Checked when the landing moved to
short-form: the module intro screens never carried this text either — each carries its own
shorter third-person lede ("Sources RFP briefs from multiple platforms based on selected
keywords…"). So the four below are now a REFERENCE held in this file only: the canonical
wording for a deck, a proposal or a future screen that wants the full sentence. Nothing
renders them, and nothing is expected to.

> The Bid Hawk module helps you source RFP briefs from multiple e-procurement
> platforms based on your selected keywords, summarise each tender against your
> eligibility, and route it to the right bid manager based on your organisational
> rules.

> The Bid Partners module helps you register your delivery partners, invite them
> to respond to an RFP, track every document they submit, and evaluate them on
> capability, commercials and past performance.

> The Bid Orchestrator module helps you orchestrate the end-to-end bid submission
> cycle from distribution of tasks to AI assisted form fillings to final bid
> submission document creation.

> The Bid Author module helps your teams write bid responses with AI, auto fill
> forms and author all sections to be submitted in a bid.


Each card carries a mark in one family: a 32px navy tile at radius 8 with its
figure knocked out by an even-odd fill. Bid Hawk is a chevron and an eye slot, Bid
Orchestrator three bars converging on a point, Bid Author three text lines with a
caret, Project Management three milestone diamonds on a rail, Opportunity
Management a three-stage funnel, Bid Partners two offset interlocking forms reading as two
parties joined. Their knocked-out areas are equalised by measurement, not by eye,
so all four carry the same optical weight.

### Banned strings

Two tiers, because a single rule could not pass its own grep. The repo runs Vitest
and carries a development panel, so words like "test" have to be legal in file
names while staying illegal in the interface.

**Banned everywhere in `src/`** — copy, labels, seed data, type names, file names,
variables, comments and tests alike:

```
vendor          the word is "partner" throughout
TCIL
Telecommunications Consultants India
Scout
Build Team
```

**The logged exception for `tcil-pm.vercel.app` is RETIRED.** It covered a hostname in
one `MODULES` href, for a deployment this product linked out to. That card has been
removed and the string appears nowhere in `src/`, so the ban now holds without exception.

plus any real client name used as the bidding organisation. A delivery partner is a
peer you bid alongside; "vendor" frames them as a supplier being procured from,
which is the wrong relationship and the wrong word for this product.

**Banned in USER-VISIBLE STRINGS ONLY**, and permitted in file names, test names
and development-only code:

```
demo   sample   mock   placeholder   dummy   lorem   test
```

`placeholder` is additionally permitted as the HTML attribute of that name.

The demo workspace is **Meridian Infratech Limited**, a fictional Indian
systems integrator. Its identity lives in ONE place in seed data so it is
swappable in a single line. Government BUYERS stay real, because that is what
makes the feed credible.

## The fifteen screens

Built fresh, in this order. Never build ahead of the screen requested.

| # | Route | Screen |
|---|---|---|
| 0 | `#/` | BidOS landing, three modules |
| 1 | `#/bid-hawk` | Bid Hawk landing and setup |
| 2 | `#/sources/new` | Add source |
| 3 | `#/sources` | Sources |
| 4 | `#/team/new` | Add people |
| 5 | `#/team` | People |
| 6 | `#/feed` | RFP feed |
| 7 | `#/feed/:id` | RFP summary |

Bid Partners' screens:

| # | Route | Screen |
|---|---|---|
| 8 | `/bid-partners` | Bid Partners landing and setup |
| 9 | `/bid-partners/registry` | Partner registry |
| 10 | `/bid-partners/registry/new` | Add partner |
| 11 | `/bid-partners/responses` | Response tracker |
| 12 | `/bid-partners/responses/:rfpId` | One RFP's responses |
| 13 | `/bid-partners/evaluation` | Evaluation list |
| 14 | `/bid-partners/evaluation/:rfpId` | Ranked comparison |

Both modules read the SAME fourteen tenders from `src/data/seed/tenders.ts`. There
is one tender seed and there must never be a second: the platform has to read as
one system, not two products sharing a shell.

Partners and their invitations LOAD BY DEFAULT. They do not follow the
empty-by-default reveal that sources and people use, because a partner network is
something an organisation already has rather than something built during setup.

AI appears in Partner Evaluation only. No suggested matches, no capability scores,
no confidence figures and no accent-toned agent attribution anywhere in the registry
or the response tracker.

Screen 0 is the default route and the platform entry point. It is a title page,
composed against a capped content wrapper centred in the workspace card and
LEFT ALIGNED to that wrapper's edge: the BidOS wordmark at Display size, one line
carrying the positioning line and the metadata line separated by a middot, a
full-width hairline rule, then **six cards in a 3x2 grid**. The wordmark,
the lede line, the rule and card 01 all share one vertical axis.

### Logged exceptions, scoped to `/` only

**Three** rules elsewhere in this file are overridden on the landing and nowhere
else. The reason is the same for all three: `/` is a platform landing where the
cards are peers, and a client must not read one as more real than the others. The
count in each exception below follows the card count; the scope does not.

| # | Rule overridden | On `/` |
|---|---|---|
| a | Exactly one primary filled button per view | One identical filled primary per card |
| c | No row or grid of identical cards | Identical cards in a grid, three across at most |
| d | Canvas chrome is consistent across every screen | The canvas BidOS wordmark is suppressed |

**RETIRED — (b) the card gradient.** The cards took a two-stop ramp; they now take a
flat `surface-sunken`, one luminance step below the white workspace, with a hairline
border that is permitted precisely because the card sits on a tone close to its
parent. **The no-gradients rule now holds everywhere, with no exception anywhere in
the product.** The gradient tokens are deleted rather than left unused.

**The three that remain do not generalise.** No other route may take any of them.
Every other screen keeps one filled primary, no identical-card grid, and the canvas
wordmark. The count changes with the card count and the scope does not: (a) and (c)
were written at four, went to six when the adjacent systems were added, and are back
at four now they have been removed. `CanvasShell` takes `showWordmark`, and `/` is the only route that passes
`false`; the environment string stays on the same right edge and baseline so the
canvas does not reflow between routes.

**The landing has no fit-above-the-fold requirement.** It may exceed the fold and the
footer may sit below it. An earlier pass was held to fitting 1440x900, and chasing
that compressed the type and the card padding until the descriptions ran to the card's
edge — the constraint cost more than it bought. What is NOT acceptable is dead space:
the workspace card sizes to its content and ends where the grid ends plus its own
bottom padding. The landing's container therefore does not take `flex-1`.

Bid Hawk has an introduction state at `#/bid-hawk`, and it is State A of two on
that one route. It carries the Bid Hawk mark, a micro-label, "Bid Hawk" at Display
size, its lede, a hairline rule, a "Begin setup" primary, and a three-stage flow
band on a recessed surface with icons, hairline connectors between stages and NO
ordinals. "Begin setup" recedes it in place and the setup path takes its position;
"Back" returns to State A. Getting to `/` is the shell's job, not this screen's.

The RFP summary is a full page, not a drawer. It carries an eleven-row eligibility
snapshot and the risk flags, which a drawer would cramp.

The RFP feed is the working product; sources and people are configuration. The
canvas navigation leads with the feed and groups the two configuration screens
after it.

There is no crawl screen and no crawl flow. A source is a platform, a listing
URL, an identifier and a set of keywords; nothing in the product reports crawl
state, connection health or sync scheduling.

There is no routing rules screen and no rule simulator. A person record holds the
domains and regions a bid manager covers, and that is what routing is matched
against. Every person added is a bid manager; there is no second role.

The workspace starts **empty** for sources and people. Each begins at a count of
zero, and creating the FIRST record of a kind reveals the five seeded records of
that kind behind it, so the count then reads 6 with the created one first. The two
are independent: creating a source does not reveal people. Cmd+Shift+D offers
"Reset to empty", which re-arms both.

`/feed` is gated behind at least one source AND at least one bid manager. Reaching
either `/feed` or `/feed/:id` directly while a prerequisite is missing resolves to
a state naming which step is outstanding and offering that screen — never a silent
redirect and never an empty table.

Sources and people both grow as records are created. The seeded eight sources and six people stay in
the codebase but are not loaded by default; a development-only panel on
Cmd+Shift+D loads or clears them. That panel is never surfaced in the product.

## Design authority

Read `.claude/skills/ui-frontend-updated/SKILL.md` at the start of every
session. It governs component architecture, enterprise patterns, motion and
accessibility.

Depth: Production Build. Modes: Code plus Pitch.
Skip the skill's Discovery Checklist, Readiness Gate and collaborator
dependency check. 21st.dev, Emil Kowalski Motion, UI/UX Pro Max and Context7
are all unavailable. Use the skill's internalised equivalents.
There is no `/mnt` filesystem. All paths are local to the repo.

## Library layer, mandatory

Behaviour comes from real libraries. Styling comes from our tokens. A library
never supplies colour, spacing, radius, type or duration.

| Concern | Library |
|---|---|
| Dialog, tooltip, popover, select, switch, slider, tabs, scroll area, separator, avatar, progress, dropdown menu | Radix primitives |
| Data table behaviour | `@tanstack/react-table` |
| Drawer | `vaul` |
| Toasts | `sonner` |
| Command palette | `cmdk` |
| Variant maps | `class-variance-authority` |
| Fonts | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` |
| Motion | `framer-motion` |
| Icons | `lucide-react` |

Do NOT install shadcn/ui via its CLI. It ships its own HSL token contract and
would collide with ours. Radix headless behaviour plus our styling layer.

Fonts are self-hosted. The build must render real Inter and real JetBrains Mono
from `file://` with zero network requests. System font fallback is a defect.

Never hand-roll a primitive that a listed library provides.

## Shell model: canvas and floating workspace

This is the load-bearing structural decision. Every screen inherits it.

- **Canvas**: a warm light neutral. Not pure white, not grey-blue. It is the
  desk the product sits on.
- **Workspace**: white, radius 16, one soft shadow, inset from every canvas edge
  by one large spacing step. It floats. It never touches the viewport edge.
- **Brand marks and navigation sit ON the canvas, OUTSIDE the workspace.** This
  is deliberate and is the detail that reads as designed rather than generated.
- Canvas chrome is consistent across every screen: EMB mark top left, BidOS
  wordmark top right with the environment string "Sovereign · IN-North" beneath
  it. There is no footer, with one exception: `CanvasShell` takes a `footer` prop
  and the BidOS landing is the only route that passes it, carrying "v1.2" left and
  "© 2026 EMB Global. All rights reserved." right, on the canvas.

## Tokens, frozen

Radius: 4 inputs, chips, badges. 8 buttons, small cards. 12 cards, dropdowns,
popovers. 16 dialogs, drawers, the workspace card. Full for avatars and pills.
No other values.

Spacing: 2 4 8 12 16 20 24 32 40 48 64 80 96. Nothing else.

Colour: semantic tokens only. The severity token is `destructive`, never
`danger`. Primary is deep navy, used on filled primary buttons and active
navigation only. A single restrained amber accent is reserved exclusively for
agent activity and time-sensitive metadata. Three deadline urgency tokens:
critical under 72h, warning under 7 days, normal. One `--accent-ai-wash`, a
warm cream, behind AI-generated text.

Tailwind's colour, spacing, radius, fontSize, shadow, zIndex and duration
scales are replaced by these tokens, so an off-scale utility such as `p-6` or
`rounded-md` fails to compile. Dark theme authored as a pure value swap. Ship
light.

Never write a raw hex, raw px, or raw duration in a component file.

## Type system

Widen the range aggressively. Narrow range is what flattens generated UI.

Every text element maps to a named style. Minimum set: Display, PageTitle,
SectionTitle, PanelTitle, Body, SecondaryBody, MicroLabel, Label, Caption,
Metadata, Button, TableCell, KpiValue, KpiLabel, Code, Helper.

- Display and PageTitle: large, tight negative tracking, high weight
- SectionTitle: distinct from Body in both size AND weight
- MicroLabel: uppercase, small, positive letter-spacing, muted. Used for group
  headers and field labels
- Metadata and Caption: genuinely small and genuinely muted
- All numerals, tender references, currency and countdowns: JetBrains Mono with
  tabular figures, right-aligned in tables

No component may use a size or weight outside a named style.

## Depth over borders

Communicate structure through layered surfaces, spacing, alignment and subtle
elevation. Borders are supporting elements, never the primary organiser.

Keep a visible border only on input outlines, table header rules, and card
edges where a card sits on the same tone as its parent. Everywhere else use a
surface luminance shift instead.

## Forbidden patterns

These are the specific tells that make an interface read as machine-produced.
None may appear.

- A row of three or four identical bordered cards evenly spaced
- Two identical side-by-side cards presenting a binary choice
- A single centred card floating on an empty background as an entire screen
- Uniform visual weight across a whole view
- Borders as the primary structural device
- Gradients, glows, coloured shadows, hero illustrations, stock imagery
- Decorative or looping motion, pulsing, parallax
- Emoji as iconography

Compositions should be asymmetric and editorial where the content allows it.
Whitespace is an active element, not leftover space.

## Motion

Micro-feedback 100 to 150ms. Standard 150 to 250ms. Large surfaces 250 to
400ms. Drawer 260ms ease-out, exit ease-in. Spring only for drag.

Honour `prefers-reduced-motion` with instant or opacity-only transitions.
Motion must communicate state change, cause and effect, or spatial
relationship. Never decoration.

## Component architecture

`Tokens -> Primitives -> Shared -> Feature -> Page Layouts -> Pages`

Never put an app-level pattern in a feature folder. It goes in Shared.
Every interactive component implements: Default, Hover, Pressed, Focused,
Active, Selected, Disabled, Loading, Success, Warning, Error, Empty, Read-only.
Keep components under 200 lines.

## Product-not-prototype rules

Every screen implements default, empty, loading, error and partial states.
Every list has a real empty state that names the next action.
Every async action shows pending state and resolves to a toast.
Every timestamp is relative with the absolute value on hover.
Currency uses Indian digit grouping: `INR 1,006 Cr`, `INR 85 Lakh`.
Empty values render as a muted dash, never a blank cell.
Exactly one primary filled button per view or section.
Nothing is a dead end. Every control navigates, mutates state, or is disabled
with a tooltip explaining why.

## Data

All data is local and typed, in `src/data/seed/`. Never fetch from a network.
All reads and writes go through `src/lib/mockApi.ts`, which simulates 300 to
900ms latency so loading states are genuinely exercised.

### Hero seed record, verified against the real RFP

Retain this. It is real and was validated line by line against the 262-page
source document.

```
title: Selection of System Integrator for Implementation of Maharashtra RTS
       Aaple Sarkar 2.0
tenderRef: MAHAIT/RTS2.0/001/2025/080
source: MahaTenders (https://www.mahatenders.gov.in)
issuingAuthority: Maharashtra Information Technology Corporation Limited
       (MahaIT), a Government of Maharashtra Enterprise
selectionMethod: QCBS, Bn = 0.70*Tn + 0.30*Fn, prices inclusive of GST
consortium: Not allowed
tenderFee: INR 25,000 non-refundable, paid on the e-tendering portal
emd: INR 1,00,00,000 as Bank Guarantee, original submitted physically
prebidQueriesDue: 13 Aug 2027, 12:00, to tender@mahait.org only
prebidConference: 18 Aug 2027, 12:00, Board Room, MahaIT, 3rd Floor Apeejay
       House, Churchgate, Mumbai 400020
bidDue: 28 Aug 2027, 17:00 online
bidOpening: 29 Aug 2027, 12:00
bidValidity: 180 days from bid submission
contractTerm: 45 months, 9 implementation plus 36 O&M
pbg: 10% of total contract value, unconditional and irrevocable, within 30 days
       of LOI, Nationalised or Scheduled Commercial Bank, valid 180 days beyond
       end of O&M
envelopes: Four envelope system. E1 Tender Fee and EMD, E2 Pre-Qualification,
       E3 Technical, E4 Commercial
estimatedValue: INR 72 Cr, INFERRED not published. Must be labelled in the UI
       as "Estimated. Not published in the RFP."
```

The real RFP closed 28 Aug 2025. Day and month are unchanged, year is 2027, so
countdowns run live. No other field is altered.

Eligibility snapshot, eleven rows with status:

```
pass  Registered under Companies Act 1956/2013, or a partnership firm, or an
      LLP under the LLP Act 2008
pass  7 years in IT/ITeS software development or IT implementation in India
warn  Average annual turnover >= INR 250 Cr over 3 FY to 31 Mar 2025.
      Standalone entity only; parent and subsidiary turnover excluded.
pass  Positive net worth each of the last 3 FY
warn  Govt/PSU IT turnkey: 1 project > INR 50 Cr, or 2 > INR 30 Cr, or
      3 > INR 20 Cr
pass  Two citizen service or scheme delivery projects in the last 7 years
pass  Not blacklisted or convicted of an economic offence
fail  CMMI Level 5 (development) plus ISO 9001, 20000, 27001. Certificate under
      renewal. Must be verifiable at cmmiinstitute.com/pars before commercial
      bid opening or the bid is disqualified.
pass  GST registration
pass  100 IT/ITeS resources on payroll since 1 Apr 2022, 100 seat office in
      India
warn  20 seat office within Mumbai Metropolitan Region. Undertaking route
      available: establish within 15 days of award.
```

The CMMI row is the emotional centre of the demo. Give it visual weight.

### Risk flags on the hero tender

Two real defects in the source RFP. Each carries severity, Bid Hawk's
recommendation, the applicable deadline, and a working "Raise as pre-bid query"
action.

1. **SLA contradiction, high severity.** The SLA schedule specifies API response
   of 0.30 ms or less per call, with a 1% milestone payment penalty per
   breaching call. Section 7 of the same RFP states response times should be
   under 30 ms. 0.30 ms is not achievable over a network. Recommend pre-bid
   clarification before 13 Aug 2027.
2. **Unspecified ABG, medium severity.** The RFP does not specify an Advance
   Bank Guarantee. Confirm with MahaIT during pre-bid before pricing one in.

These two flags are the most persuasive content in the build. They show the
agent exercising judgment on a real document with a named consequence and a
deadline.

### Remaining seed

Thirteen further tenders from the real Indian government-buyer landscape: BSNL,
RailTel, MTNL, state DISCOMs, NHAI, municipal corporations, defence PSUs, state
IT departments. Values INR 45 Lakh to INR 210 Cr. Two closing inside 72h, four
inside 7 days. Six people with domain tags, region tags, capabilities and active
bid counts.

Eight sources across GeM, CPPP, IREPS, the Defence Procurement portal,
MahaTenders, a state e-Procurement portal and a custom platform. Each carries a
platform, a name, a listing URL, a registered identifier, keywords, an active or
paused status, and the date it was added. Two are paused. Nothing else: a source
holds no credential, no certificate, no schedule and no health.

## Working style

- Build only the screen requested. Never read ahead or build later screens.
- Do not ask permission for anything specified in the prompt. Build it.
- Prefer single-purpose bash commands. Compound commands get blocked by the
  permission classifier.
- Append what changed and why to `docs/decisions.md`.
- No comments explaining what code does. Only why, when non-obvious.
- If you must make an unspecified choice, make it and log it rather than
  stopping to ask.
- Verify every session: `npm run build` clean, tests pass, zero console
  warnings, no raw hex or px outside `tokens.css`, `dist/` opens from `file://`
  with fonts loading and no network requests.

## Open items

Recorded, not acted on. Each is resolved by the next session that touches the
screen it belongs to.

1. **The EMB Global logo is a raster PNG.** It does not invert with the theme, so
   on the dark theme the charcoal wordmark sits on a dark canvas at low contrast,
   and it does not resample above its native 179x79. Replace with the official
   brand SVG when one is available; at that point the wordmark can take the
   foreground token and the leaf cluster can keep the brand green.

2. **The response tracker tracks a narrower document set than the composer
   requests.** The tracker reads `invitation.documents`, six entries typed by
   `PartnerDocumentType`, while the invitation composer stores
   `requestedDocuments`, an open list of twelve or more strings. Receipt state
   therefore under-reports what was asked for. Resolving it means widening the
   closed union to a string, which changes the tracker, the composer and the
   documentation sub-score in Partner Evaluation together. Resolve on the next
   session that touches any of the three.

3. **The unchecked checkbox and radio boundary is 1.71:1 against white.** `border-border-strong`
   is the darkest border token in the system, and WCAG 1.4.11 asks 3:1 of a control
   boundary. Raised while fixing the button border reset, which had been zeroing these
   borders entirely. Strengthening it is a product-wide colour decision touching every
   Checkbox, RadioGroup and input outline, so it is recorded rather than done. Resolve on
   the next session that touches the colour tokens.

4. **The colour paragraph above does not mention `success`, but the product depends on
   it.** The stated set is primary navy, one amber accent, three urgency tokens,
   `destructive` and `--accent-ai-wash`. `success` is a properly defined semantic token
   (`--color-success` and its subtle, border and foreground variants, both themes) used on
   26 files: the eligibility snapshot's passing rows, risk flags, `Badge tone="success"`,
   toasts, `StatusDot` and the import dialog. Found while removing Bid Partners' green
   completion tick, and checked at that point: it is NOT a raw hex and NOT a Tailwind
   default that survived the scale replacement, so there is no token violation to fix. The
   rule is simply out of date with the palette. Reconcile the paragraph on the next session
   that touches the colour tokens, alongside item 3.

5. **RESOLVED, and the card that caused it is back without it.** The `/` landing
   printed `leadership@emb.global` and a password on the Opportunity Management card,
   for a deployment with no authentication in front of it. Removing the card resolved
   the exposure by accident; the card has since been restored at the client's request
   and the credentials have NOT been. `src/routes/platform.test.tsx` asserts the landing
   prints no address and no password, so restoring them is a failing test rather than a
   judgement call. **The deployed reference at `emb-bidos.vercel.app` still prints them**
   and should not be copied from on this point.

6. **RESOLVED. Every outbound URL on the landing has been loaded once and returns 200:**
   `bid-orchestrator`, `bid-author`, `nexus.emb.global/#features` (Project Management)
   and `emb-global-crm.vercel.app/login?redirectTo=%2F` (Opportunity Management). The
   last two replaced `tcil-pm` and the CRM root at the client's instruction and were
   loaded before being committed. Kept as a note rather than deleted, because the
   constructed `tcil-crm.vercel.app` returned DEPLOYMENT_NOT_FOUND, and a 404 on one of
   six equal cards undoes the argument that all six are real. Check every outbound href
   resolves whenever one is added or changed.
