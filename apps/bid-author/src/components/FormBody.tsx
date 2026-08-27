import type { BidForm, ChecklistStatus } from "../types";

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
