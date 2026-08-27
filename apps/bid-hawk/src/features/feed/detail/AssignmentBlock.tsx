import type { Person } from '@/types'
import { routeTender, type RoutingMatch } from '@/lib/routingEngine'
import type { Tender } from '@/types'
import { Avatar, Button } from '@/components/ui'

export interface AssignmentBlockProps {
  owner: Person
  /** Everyone on the workspace, so the owner can be changed to any of them. */
  people: Person[]
  /** The tender, so the alternates can be ranked against it rather than listed. */
  tender: Tender
  onAssign: (personId: string) => void
}

/**
 * Who owns this bid, and who else could.
 *
 * Reassignment used to be a select of every name in the workspace, the current
 * owner among them, in the order they were added. That is a list of people, not a
 * list of alternatives: it gave a reader no way to tell which of five names was a
 * sensible second choice for THIS tender, so the decision fell back to whoever
 * they happened to recognise.
 *
 * The routing engine already answers the question. It scores every bid manager
 * against the tender's domain and region, so its ranking decides the ORDER: the
 * strongest alternative is offered first.
 *
 * What each row SAYS is that person's coverage -- the domains and regions they
 * hold -- not the reason the engine matched them and not its confidence figure.
 * The distinction is deliberate and predates this change: a person's coverage is
 * a fact about them that a reader can check, while a match reason is the product
 * explaining its own scoring, which invites auditing the score instead of reading
 * the tender. The ranking uses that scoring without narrating it.
 */
export function AssignmentBlock({ owner, people, tender, onAssign }: AssignmentBlockProps) {
  const ranked: RoutingMatch[] =
    people.length > 0 ? routeTender(tender, people).candidates : []

  /**
   * Everyone except the current owner, ranked first and then the rest.
   *
   * A bid manager no rule matched is still a valid choice -- somebody has to own a
   * tender nothing covers -- so they appear after those that did, rather than not
   * at all.
   */
  const matched = ranked.filter((match) => match.person.id !== owner.id)
  const unmatched = people.filter(
    (person) => person.id !== owner.id && !ranked.some((m) => m.person.id === person.id),
  )

  return (
    <section aria-labelledby="assignment" className="flex flex-col gap-16">
      <h2 id="assignment" className="text-section-title text-fg">
        Assignment
      </h2>

      <div className="flex flex-col gap-16 rounded-card bg-surface-sunken p-20">
        <div className="flex min-w-0 items-start gap-12">
          <Avatar name={owner.name} size="md" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-body-strong text-fg">{owner.name}</p>
            <p className="truncate font-mono text-metadata text-fg-muted">{owner.email}</p>
          </div>
        </div>

        {matched.length + unmatched.length > 0 ? (
          <div className="flex flex-col gap-8 border-t border-border-subtle pt-16">
            <p className="text-micro-label uppercase text-fg-muted">Reassign</p>

            <ul className="flex flex-col gap-4">
              {[...matched.map((m) => m.person), ...unmatched].map((person) => (
                <li key={person.id}>
                  <Alternate person={person} onAssign={onAssign} />
                </li>
              ))}
            </ul>

            <p className="text-helper text-fg-muted">
              Bid Hawk routed this on the domains and regions each owner covers. Anyone
              here can take it instead.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** One name, what that person covers, and the action that hands the bid over. */
function Alternate({
  person,
  onAssign,
}: {
  person: Person
  onAssign: (personId: string) => void
}) {
  /**
   * What this person covers, which is what makes them a sensible alternative.
   *
   * Their own record, not the engine's verdict on it. A bid manager holding no
   * domains and no regions is a real state -- the form requires one or the other,
   * not both -- and says so rather than showing an empty line.
   */
  const covers = [...person.domains, ...person.regions].join(' · ')

  return (
    <div className="flex items-center gap-12 rounded-control bg-surface px-12 py-8">
      <Avatar name={person.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-secondary-body-strong text-fg">{person.name}</p>
        <p className="truncate text-caption text-fg-muted">
          {covers || 'No domains or regions recorded'}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onAssign(person.id)}>
        Assign
      </Button>
    </div>
  )
}
