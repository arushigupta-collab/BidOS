/**
 * Cleans generated prose before it leaves the server.
 *
 * The prompts ask for none of this, and asking is not enough: a model told not to
 * elide a quotation still elided one, and a model told not to use em dashes still
 * reaches for them. Where the rule can be enforced deterministically it is
 * enforced deterministically, and the prompt becomes an explanation rather than a
 * hope.
 *
 * Every substitution is safe on text that never had the problem, so it can run
 * over everything without checking first.
 */
export function tidyProse(text: string): string {
  return (
    text
      /*
       * A dash standing in for a clause boundary is the clearest tell of
       * generated text, and this output is pasted into a bid document that a
       * procurement officer reads.
       *
       * A conjunction after the dash takes a comma, because "x, and y" reads
       * better than "x. And y". Anything else becomes a full stop, and the word
       * that follows is capitalised, because a sentence that starts lowercase is
       * a worse tell than the dash was.
       */
      .replace(
        /\s+[\u2014\u2013]\s+(\w)/g,
        (_match, next: string, offset: number, whole: string) => {
          const rest = whole.slice(offset).replace(/^\s+[\u2014\u2013]\s+/, '')
          if (/^(and|but|or|so|which|because|including|though|while)\b/i.test(rest)) {
            return `, ${next}`
          }
          return `. ${next.toUpperCase()}`
        },
      )
      // An unspaced dash between words is a range or a compound: a hyphen serves.
      .replace(/([A-Za-z0-9])[—–]([A-Za-z0-9])/g, '$1-$2')
      // Curly punctuation arrives as mojibake in half the systems a bid passes
      // through, and a bid passes through several.
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, '...')
      .replace(/ /g, ' ')
      // A stray bullet inside a paragraph, where each paragraph is already one.
      .replace(/^\s*[•·]\s*/gm, '')
      // Two sentences that met when a dash became a full stop.
      .replace(/\.\s*\.\s*/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}
