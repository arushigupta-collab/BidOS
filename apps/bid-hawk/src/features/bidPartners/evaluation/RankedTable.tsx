import { Fragment } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { EMPTY_VALUE, formatInr } from '@/lib/format'
import { ICON } from '@/lib/tokens'
import { CRITERIA, lowestQuote, type ScoredPartner } from './evaluationModel'

const CRORE = 1_00_00_000

const HEADINGS = [
  'Rank',
  'Select',
  'Partner',
  ...CRITERIA.map((criterion) => criterion.label),
  'Composite',
  'Quoted value',
]

/** Derived from CRITERIA, so adding a sixth criterion cannot desynchronise the breakpoints. */
const CRITERIA_START = 3
const CRITERIA_END = CRITERIA_START + CRITERIA.length
const COMPOSITE_INDEX = CRITERIA_END
const QUOTED_INDEX = CRITERIA_END + 1

export interface RankedTableProps {
  ranked: ScoredPartner[]
  expanded: Record<string, boolean>
  onToggle: (partnerId: string) => void
  onSelect: (partnerId: string) => void
  chosenPartnerIds: string[]
}

/**
 * One row per responding partner, ordered by composite, highest first.
 *
 * Composite is fixed to one decimal down the whole column. Tabular figures exist so a
 * column of numbers can be compared by eye, and "73" beside "66.9" throws that away.
 */
export function RankedTable({
  ranked,
  expanded,
  onToggle,
  onSelect,
  chosenPartnerIds,
}: RankedTableProps) {
  const lowest = lowestQuote(ranked.map((row) => row.invitation))

  return (
    <div className="overflow-hidden rounded-card">
      <table
        aria-labelledby="ranked-heading"
        className="w-full border-separate border-spacing-0 text-left"
      >
        <thead>
          <tr>
            <td aria-hidden="true" className="w-hair border-b border-border bg-surface-sunken p-0" />
            {HEADINGS.map((heading, index) => (
              <th
                key={heading}
                scope="col"
                className={cn(
                  'border-b border-border bg-surface-sunken py-8 text-micro-label uppercase text-fg-muted',
                  // px-8 on the numeric columns, px-12 elsewhere. Five criterion columns
                  // plus composite and quoted value put the table's min-content width 10px
                  // past its container at 1190, and single-word uppercase headers like
                  // DOCUMENTATION cannot wrap to give it back. Tighter padding on
                  // right-aligned figures is ordinary table density and frees 40px.
                  index >= CRITERIA_START ? 'px-8' : 'px-12',
                  // Headers WRAP rather than nowrap. With five criterion columns the
                  // uppercase labels at 0.11em tracking are the widest thing in the table's
                  // min-content width, and holding them on one line each pushed it past its
                  // container at 1190 — where the card's own overflow-hidden clips rather
                  // than scrolls.
                  index >= CRITERIA_START && index < CRITERIA_END && 'hidden text-right lg:table-cell',
                  index === COMPOSITE_INDEX && 'whitespace-nowrap text-right',
                  index === QUOTED_INDEX && 'hidden whitespace-nowrap text-right md:table-cell',
                )}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.map((row, index) => {
            const isOpen = expanded[row.partner.id] === true
            const chosen = chosenPartnerIds.includes(row.partner.id)
            const delta =
              row.unquoted || lowest === null
                ? null
                : Math.round(((row.invitation.quotedValueCr as number) - lowest) * 10) / 10
            const panelId = `detail-${row.partner.id}`

            return (
              <Fragment key={row.partner.id}>
                <tr
                  onClick={() => onToggle(row.partner.id)}
                  className={cn(
                    'cursor-pointer transition-colors duration-micro ease-out',
                    // Ranked first is distinguished by surface step and type weight only.
                    // Not a coloured rule and not the accent: ranked first is not chosen.
                    index === 0 ? 'bg-surface-sunken' : 'bg-surface hover:bg-surface-hover',
                  )}
                >
                  <td aria-hidden="true" className="w-hair border-b border-border p-0" />
                  <td className="border-b border-border px-12 py-12 align-middle">
                    {/* A real disclosure button, not a click handler on the row. The row
                        keeps its click as a mouse convenience, but the keyboard needs a
                        focusable control that reports its own state. */}
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      // aria-label rather than an sr-only suffix: the suffix duplicated
                      // the panel's own "Prior engagements" heading, and a name that
                      // repeats the thing it opens is noise in a screen-reader list.
                      aria-label={`Rank ${index + 1}, ${row.partner.name}, show detail`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggle(row.partner.id)
                      }}
                      className="flex items-center gap-4 rounded-field text-fg-muted transition-colors duration-micro ease-out hover:text-fg"
                    >
                      <span aria-hidden="true">
                        {isOpen ? <ChevronDown size={ICON.sm} /> : <ChevronRight size={ICON.sm} />}
                      </span>
                      <span className="numeric font-mono text-table-cell text-fg">{index + 1}</span>
                    </button>
                  </td>
                  {/* Every row carries its own select control, so choosing the partner
                      ranked third costs exactly what choosing the first costs. */}
                  <td
                    onClick={(event) => event.stopPropagation()}
                    className="border-b border-border px-12 py-12 align-middle"
                  >
                    {chosen ? (
                      <Badge tone="success">Chosen</Badge>
                    ) : (
                      // Ghost, not secondary: secondary's fill is invisible on white rows
                      // and visible on the top-ranked row's sunken one, which made one
                      // column show two different-looking controls and read as though
                      // rank one were already picked.
                      <Button variant="ghost" size="sm" onClick={() => onSelect(row.partner.id)}>
                        Select
                      </Button>
                    )}
                  </td>
                  <td className="min-w-col-partner border-b border-border px-12 py-12 align-middle">
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className={cn('text-fg', index === 0 ? 'text-body-strong' : 'text-body')}>
                        {row.partner.name}
                      </span>
                      <span className="text-caption text-fg-muted">{row.partner.contactName}</span>
                    </span>
                  </td>
                  {CRITERIA.map((criterion) => (
                    <td
                      key={criterion.id}
                      className="hidden border-b border-border px-8 py-12 text-right align-middle lg:table-cell"
                    >
                      <span className="flex flex-col gap-2">
                        <span className="numeric font-mono text-table-cell text-fg">
                          {Math.round(row.scores[criterion.id].score)}
                        </span>
                        {/* The figure the sub-score came from, so every number on this
                            page can be audited without leaving the table. */}
                        <span className="text-caption text-fg-muted">
                          {row.scores[criterion.id].raw}
                        </span>
                      </span>
                    </td>
                  ))}
                  <td className="border-b border-border px-8 py-12 text-right align-middle">
                    <span className="numeric font-mono text-kpi-value text-fg">
                      {row.composite.toFixed(1)}
                    </span>
                  </td>
                  <td className="hidden border-b border-border px-8 py-12 text-right align-middle md:table-cell">
                    {/* A MUTED DASH AND NOTHING ELSE. The cell used to carry a dash plus a
                        "Not quoted" badge plus no delta, which labelled the same absence
                        twice; the product's own rule is that an empty value is a muted
                        dash. The partner stays ranked and still scores zero on
                        commercials — see `commercialScore`. */}
                    {row.unquoted ? (
                      <span className="text-fg-subtle">{EMPTY_VALUE}</span>
                    ) : (
                      <span className="flex flex-col items-end gap-2">
                        <span className="numeric whitespace-nowrap font-mono text-table-cell text-fg">
                          {formatInr((row.invitation.quotedValueCr as number) * CRORE)}
                        </span>
                        <span className="numeric whitespace-nowrap font-mono text-caption text-fg-muted">
                          {delta === 0 ? 'Lowest quote' : `+${formatInr((delta ?? 0) * CRORE)}`}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>

                {isOpen && (
                  <tr id={panelId}>
                    <td aria-hidden="true" className="w-hair border-b border-border p-0" />
                    <td
                      colSpan={HEADINGS.length}
                      // A step deeper than the top-ranked row, so expanding rank one does
                      // not merge the panel into the row it belongs to.
                      className="border-b border-border bg-surface-inset px-16 py-16"
                    >
                      <div className="flex flex-col gap-12">
                        {row.invitation.commercialNote && (
                          <p className="max-w-prose text-secondary-body text-fg-secondary">
                            {`Commercial note: ${row.invitation.commercialNote}`}
                          </p>
                        )}
                        <p className="text-micro-label uppercase text-fg-muted">Prior engagements</p>
                        {row.partner.historyEntries.length === 0 ? (
                          <p className="text-secondary-body text-fg-muted">
                            Nothing recorded against this partner yet.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-8">
                            {row.partner.historyEntries.map((entry) => (
                              <li
                                key={`${entry.buyer}-${entry.year}`}
                                className="flex flex-col gap-2 rounded-control bg-surface p-12"
                              >
                                <span className="flex flex-wrap items-baseline gap-x-8">
                                  <span className="text-body-strong text-fg">{entry.buyer}</span>
                                  <span className="numeric font-mono text-metadata text-fg-muted">
                                    {`${entry.year}, ${formatInr(entry.valueCr * CRORE)}`}
                                  </span>
                                </span>
                                <span className="text-secondary-body text-fg-secondary">
                                  {entry.outcome}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
