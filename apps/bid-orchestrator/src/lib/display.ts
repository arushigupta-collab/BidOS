/**
 * Turning what the tender said into what the screen shows.
 *
 * Values are stored as the document wrote them, because the extraction contract
 * forbids normalising them: rewriting "INR 1,00,00,000 /- (Indian Rupees One
 * Crore only)" destroys the quote that makes the figure checkable against its
 * page. A table cell cannot carry that whole sentence, so it is shortened here
 * and the full text stays available on the detail page.
 */

/** What an absent value looks like. Never a blank cell, never a zero. */
export const EMPTY = "—";

/** The figure out of the phrase, e.g. "INR 1,00,00,000" from the full clause. */
export function shortMoney(text: string | null): string {
  if (!text) return EMPTY;
  const match = /(?:INR|Rs\.?|₹)\s*[\d,]+(?:\s*(?:Cr|Crore|Lakh|Lac)\b)?/i.exec(text);
  return match ? match[0].replace(/\s+/g, " ").trim() : text.slice(0, 28).trim();
}

/** "28 Aug 2027, 17:00", or a dash. */
export function when(iso: string | null): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(",", ",");
}

export function day(iso: string | null): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export type Urgency = "critical" | "warning" | "normal" | "elapsed";

/** Under 72h is critical, under 7 days is warning. Matches Bid Hawk's bands. */
export function urgency(iso: string | null, now = new Date()): Urgency {
  if (!iso) return "normal";
  const hours = (new Date(iso).getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return "elapsed";
  if (hours < 72) return "critical";
  if (hours < 24 * 7) return "warning";
  return "normal";
}

export function countdown(iso: string | null, now = new Date()): string {
  if (!iso) return EMPTY;
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms < 0) return "Closed";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

/** Where a tender came from, for the Source column. */
export function sourceLabel(rfp: { document_id: string | null }): string {
  // Every RFP this workspace holds was read from a document that was handed
  // over. When platform sourcing lands, this is the one place that changes.
  return rfp.document_id ? "Uploaded" : "Platform";
}
