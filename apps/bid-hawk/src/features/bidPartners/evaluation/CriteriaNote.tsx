import { criteriaSentence } from './evaluationModel'

/**
 * What the ranking is computed on, in one sentence and with no figures.
 *
 * THIS REPLACED A SCORING PANEL of four Radix sliders with live numeric weights, a running
 * total and a reset control. Removing them was an instruction, not a judgement, and it has
 * a cost worth stating plainly: with the sliders gone the composite is opaque, and this
 * sentence is the only thing left on the page that answers "on what basis is this the
 * leader". It is therefore load-bearing rather than decorative, and must not be removed as
 * a further tidy-up.
 *
 * No panel, no card, no icon. A single line of prose under the header, because a bordered
 * box around one sentence would give it the weight of the control it replaced without any
 * of the function.
 */
export function CriteriaNote() {
  return (
    <p className="max-w-prose text-secondary-body text-fg-secondary">
      {`Ranked on ${criteriaSentence()}.`}
    </p>
  )
}
