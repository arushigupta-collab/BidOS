import { useEffect, useState } from "react";
import { fetchWorkPackages, type WorkPackage } from "../lib/rfps";
import { useElapsed } from "../lib/useElapsed";
import { Sparkle, ArrowRight, ChevronLeft } from "../lib/icons";

/**
 * The bid manager's own annexures.
 *
 * Gated behind every specialist having submitted, and the gate is not
 * ceremonial: several of these forms restate figures the specialists commit to,
 * and completing them first means writing numbers that may not survive.
 */

interface FilledFieldValue {
  label: string;
  value: string;
  source: "rfp" | "profile" | "ai" | "human";
  page_no: number | null;
}

/**
 * One filled field, editable.
 *
 * A value the bidder cannot change is not a form, it is a preview of one. Every
 * one of these goes into a document somebody signs, and the ones marked as
 * drafted are precisely the ones most likely to need a correction before it does.
 *
 * The provenance badge stays on an edited value and changes to say so: a figure a
 * person typed is neither from the tender nor from the record, and claiming it
 * came from either would be the badge lying about the one case that matters.
 */
function FilledField({
  field,
  onChange,
}: {
  field: FilledFieldValue;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-stone-50 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`f-${field.label}`}
          className="text-[11px] font-semibold uppercase tracking-wide text-stone-400"
        >
          {field.label}
        </label>
        <Provenance source={field.source} page={field.page_no} />
      </div>
      <textarea
        id={`f-${field.label}`}
        value={field.value}
        rows={Math.max(1, Math.ceil(field.value.length / 88))}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink transition hover:border-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
      />
    </div>
  );
}

function Provenance({ source, page }: { source: FilledFieldValue["source"]; page: number | null }) {
  const style =
    source === "rfp"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : source === "profile"
        ? "bg-stone-100 text-stone-600 ring-stone-200"
        : source === "human"
          ? "bg-navy-soft text-navy ring-navy/20"
          : "bg-cream-soft text-amber-900 ring-cream-line";
  const label =
    source === "rfp" ? `From the RFP${page ? ` · p${page}` : ""}`
      : source === "profile" ? "From the company record"
        : source === "human" ? "Edited here"
          : "Drafted";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${style}`}>
      {label}
    </span>
  );
}

export function MyFormsScreen({
  rfpId,
  onCompile,
  onBack,
}: {
  rfpId: string;
  onCompile: () => void;
  onBack: () => void;
}) {
  const [pkg, setPkg] = useState<WorkPackage | null>(null);
  const [filled, setFilled] = useState<Record<string, FilledFieldValue[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(busy !== null);

  useEffect(() => {
    fetchWorkPackages(rfpId).then((all) =>
      setPkg(all.find((p) => p.role_id === "bid-manager") ?? null),
    );
  }, [rfpId]);


  /**
   * Records an edit, and re-badges the value it changed.
   *
   * A figure a person typed is neither from the tender nor from the company
   * record, so it stops claiming to be. The badge exists so a reader can tell
   * where a value came from, and leaving "From the RFP" on something a bidder
   * rewrote would be it lying about the one case where the answer matters most.
   */
  function editField(formId: string, index: number, value: string) {
    setFilled((prev) => ({
      ...prev,
      [formId]: (prev[formId] ?? []).map((f, i) =>
        i === index
          ? { ...f, value, source: value === f.value ? f.source : "human" }
          : f,
      ),
    }));
  }

  async function fill(formId: string) {
    if (!pkg) return;
    setBusy(formId);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workPackageId: pkg.id, operation: "fill", formId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Filling failed");
      setFilled((prev) => ({ ...prev, [formId]: json.fields as FilledFieldValue[] }));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!pkg) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading your forms…</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your forms</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-stone-500">
          The annexures that came to you rather than to a specialist. Values are taken from
          the tender where it states them and from the company record where it does not; each
          one says which.
        </p>

        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}

        <ul className="mt-5 flex flex-col gap-3">
          {pkg.forms.map((form) => (
            <li key={form.id} className="rounded-xl border border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{form.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-stone-400">{form.annexure}</p>
                </div>
                <button
                  onClick={() => fill(form.id)}
                  disabled={busy === form.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  <Sparkle width={13} height={13} className="text-navy" />
                  {busy === form.id
                    ? `Filling… ${elapsed ?? 0}s`
                    : filled[form.id]
                      ? "Fill again"
                      : "Fill with AI"}
                </button>
              </div>

              {filled[form.id] ? (
                <div className="border-t border-stone-100 px-4 py-3">
                  {filled[form.id].map((f, i) => (
                    <FilledField
                      key={i}
                      field={f}
                      onChange={(value) => editField(form.id, i, value)}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
          >
            <ChevronLeft width={16} height={16} />
            The bid team
          </button>
          <button
            onClick={onCompile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
          >
            Compile the response
            <ArrowRight width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
