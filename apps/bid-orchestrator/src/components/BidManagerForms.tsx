import { useEffect, useRef, useState } from "react";
import type { BidForm, ChecklistStatus } from "../types";
import { BID_MANAGER_FORMS } from "../data/seed";
import { Sparkle, ChevronDown, FileText, Check } from "../lib/icons";

const CHECK_STYLES: Record<ChecklistStatus, string> = {
  Yes: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "In progress": "bg-amber-100 text-amber-800 ring-amber-200",
  No: "bg-red-100 text-red-700 ring-red-200",
  "N/A": "bg-stone-100 text-stone-500 ring-stone-200",
};

export function FieldsBody({ form, filled }: { form: BidForm; filled: boolean }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {form.fields!.map((f) => (
        <div key={f.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            {f.label}
          </dt>
          {filled ? (
            <dd className="animate-para mt-1 rounded-md bg-cream px-2.5 py-1.5 text-sm leading-snug text-ink ring-1 ring-inset ring-cream-line">
              {f.value}
            </dd>
          ) : (
            <dd className="mt-1 h-7 rounded-md border border-dashed border-stone-200 bg-stone-50" />
          )}
        </div>
      ))}
    </div>
  );
}

export function ChecklistBody({
  form,
  filled,
}: {
  form: BidForm;
  filled: boolean;
}) {
  return (
    <ul className="space-y-1.5">
      {form.rows!.map((r) => (
        <li
          key={r.item}
          className="flex items-center gap-3 rounded-md px-2 py-1.5 odd:bg-stone-50/60"
        >
          <span className="min-w-0 flex-1 text-[13px] text-stone-700">
            {r.item}
          </span>
          {filled ? (
            <>
              <span className="shrink-0 font-mono text-[10px] text-stone-400">
                {r.ref}
              </span>
              <span
                className={`animate-para inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${CHECK_STYLES[r.status]}`}
              >
                {r.status}
              </span>
            </>
          ) : (
            <span className="h-4 w-16 shrink-0 rounded border border-dashed border-stone-200 bg-stone-50" />
          )}
        </li>
      ))}
    </ul>
  );
}

function FormCard({
  form,
  filled,
  expanded,
  onToggle,
}: {
  form: BidForm;
  filled: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
      >
        <FileText className="shrink-0 text-navy" width={17} height={17} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
              {form.annexure}
            </span>
            <span className="truncate text-sm font-semibold text-ink">
              {form.title}
            </span>
          </span>
        </span>
        {filled ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 ring-1 ring-inset ring-stone-200">
            <Check width={11} height={11} /> Auto-filled
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-400">
            Not filled
          </span>
        )}
        <ChevronDown
          className={`shrink-0 text-stone-400 transition ${expanded ? "rotate-180" : ""}`}
          width={16}
          height={16}
        />
      </button>
      {expanded ? (
        <div className="border-t border-stone-100 px-4 py-4">
          {form.kind === "fields" ? (
            <FieldsBody form={form} filled={filled} />
          ) : (
            <ChecklistBody form={form} filled={filled} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function BidManagerForms({
  bidManagerName,
}: {
  bidManagerName: string;
}) {
  const [filledIds, setFilledIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filling, setFilling] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );

  const total = BID_MANAGER_FORMS.length;
  const done = filledIds.size;
  const allFilled = done === total;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function autoFill() {
    if (filling || allFilled) return;
    setFilling(true);
    // Fake 800ms think, then fill + expand each form in sequence.
    const think = window.setTimeout(() => {
      BID_MANAGER_FORMS.forEach((form, i) => {
        const t = window.setTimeout(() => {
          setFilledIds((prev) => new Set(prev).add(form.id));
          setExpandedIds((prev) => new Set(prev).add(form.id));
          if (i === BID_MANAGER_FORMS.length - 1) setFilling(false);
        }, i * 320);
        timers.current.push(t);
      });
    }, 800);
    timers.current.push(think);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-stone-500">
          Statutory annexures owned by{" "}
          <span className="font-medium text-ink">{bidManagerName}</span>.{" "}
          {done} of {total} prepared.
        </p>
        <button
          onClick={autoFill}
          disabled={filling || allFilled}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
            allFilled
              ? "cursor-default bg-stone-200 text-stone-500 shadow-none"
              : filling
                ? "cursor-wait bg-navy/70 text-white"
                : "bg-navy text-white hover:bg-navy-dark"
          }`}
        >
          <Sparkle width={16} height={16} />
          {allFilled
            ? "All forms auto-filled"
            : filling
              ? "Auto-filling…"
              : "Auto-fill with AI"}
        </button>
      </div>

      {filling && done === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-cream-line bg-cream-soft px-4 py-3 text-sm text-stone-600">
          <Sparkle className="animate-pulse text-amber-600" width={16} height={16} />
          Reading company profile and RFP data, drafting each annexure…
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {BID_MANAGER_FORMS.map((form) => (
          <FormCard
            key={form.id}
            form={form}
            filled={filledIds.has(form.id)}
            expanded={expandedIds.has(form.id)}
            onToggle={() => toggle(form.id)}
          />
        ))}
      </div>
    </div>
  );
}
