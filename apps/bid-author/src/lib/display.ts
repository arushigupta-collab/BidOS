/** Shared formatting. Mirrors Bid Orchestrator's, which mirrors Bid Hawk's bands. */
export const EMPTY = "—";

export function shortMoney(text: string | null): string {
  if (!text) return EMPTY;
  const m = /(?:INR|Rs\.?|₹)\s*[\d,]+(?:\s*(?:Cr|Crore|Lakh|Lac)\b)?/i.exec(text);
  return m ? m[0].replace(/\s+/g, " ").trim() : text.slice(0, 28).trim();
}

export function day(iso: string | null): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function countdown(iso: string | null, now = new Date()): string {
  if (!iso) return EMPTY;
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms < 0) return "Closed";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}
