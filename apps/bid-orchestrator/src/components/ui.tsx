import type { RfpStatus, Source, SourceStatus } from "../types";
import { SortCaret, MoreHorizontal } from "../lib/icons";

// ---- Status pill -----------------------------------------------------------

// Neutral pills: differentiate by the dot only, no green/amber/red.
const STATUS_DOT: Record<RfpStatus, string> = {
  "Pending Review": "border border-stone-400",
  Accepted: "bg-stone-700",
  Rejected: "bg-stone-300",
};

export function StatusPill({ status }: { status: RfpStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {status}
    </span>
  );
}

// ---- Platform / source badge (neutral, reference style) --------------------

const BADGE_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-200";

export function PlatformBadge({ label }: { label: string }) {
  return <span className={BADGE_CLASS}>{label}</span>;
}

export function SourceBadge({ source }: { source: Source }) {
  return <span className={BADGE_CLASS}>{source}</span>;
}

// ---- Source status pill ----------------------------------------------------

export function SourceStatusPill({ status }: { status: SourceStatus }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-stone-100 text-stone-500 ring-stone-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

// ---- Sortable table header -------------------------------------------------

export function SortHeader({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ${className}`}
    >
      <span className="inline-flex cursor-pointer items-center gap-1 select-none hover:text-stone-700">
        {label}
        <SortCaret className="text-stone-300" />
      </span>
    </th>
  );
}

// ---- Keyword chips ---------------------------------------------------------

export function KeywordChips({
  items,
  max = 2,
}: {
  items: string[];
  max?: number;
}) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((k) => (
        <span
          key={k}
          className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200"
        >
          {k}
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-md px-1 text-[11px] font-semibold text-stone-400">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

// ---- Overflow (...) button -------------------------------------------------

export function OverflowButton() {
  return (
    <button
      className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-ink"
      aria-label="More options"
    >
      <MoreHorizontal width={18} height={18} />
    </button>
  );
}

// ---- Avatar ----------------------------------------------------------------

export function Avatar({
  initials,
  classes = "bg-navy text-white",
  size = "md",
}: {
  initials: string;
  classes?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm"
      ? "h-6 w-6 text-[10px]"
      : size === "lg"
        ? "h-11 w-11 text-sm"
        : "h-9 w-9 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${dim} ${classes}`}
    >
      {initials}
    </span>
  );
}

// ---- Load indicator (active bids) ------------------------------------------

export function LoadIndicator({ count }: { count: number }) {
  const tone =
    count >= 3
      ? "text-red-600"
      : count === 2
        ? "text-amber-600"
        : "text-emerald-600";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500">
      <span className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < count ? tone : "text-stone-200"
            } bg-current`}
          />
        ))}
      </span>
      {count} active {count === 1 ? "bid" : "bids"}
    </span>
  );
}
