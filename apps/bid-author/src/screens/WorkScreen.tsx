import { useEffect, useRef, useState } from "react";
import {
  fetchMyWork, fetchResponses, saveResponse, setItemDone, submit,
  saveFormValues, fetchFormValues, watchMyWork,
  type AssignedWork, type Paragraph,
} from "../lib/work";
import { ROLE_NAMES, type SignedIn } from "../lib/session";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { useElapsed } from "../lib/useElapsed";
import { Sparkle, Check, CheckCircle, FileText, ArrowRight, ChevronLeft } from "../lib/icons";

/**
 * Answering one work package, in three steps.
 *
 * Respond, then forms, then hand it back. The order is the order the work has:
 * the annexures restate commitments the response makes, so filling them first
 * means writing the same numbers twice and reconciling them later.
 */

type Step = "respond" | "forms" | "submit";

const STEPS: { id: Step; label: string }[] = [
  { id: "respond", label: "Respond" },
  { id: "forms", label: "Forms" },
  { id: "submit", label: "Compile & submit" },
];

interface FilledFieldValue {
  label: string;
  value: string;
  source: "rfp" | "profile" | "ai" | "human";
  page_no: number | null;
}

/**
 * Where a filled value came from.
 *
 * The single most important element on this screen. A reader who cannot tell a
 * figure copied from the tender from one a model invented has to treat both as
 * invented, and the whole argument for filling forms automatically collapses.
 */

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

function Stepper({ step, done, onGo }: { step: Step; done: Record<Step, boolean>; onGo: (s: Step) => void }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const active = s.id === step;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => onGo(s.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                active ? "bg-stone-100 font-semibold text-ink" : "text-stone-500 hover:text-ink"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  done[s.id] ? "bg-stone-700 text-white"
                    : active ? "border-2 border-navy text-navy"
                      : "border-2 border-stone-300 text-stone-400"
                }`}
              >
                {done[s.id] ? <Check width={13} height={13} /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 ? <span className="h-px w-6 bg-stone-200" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function WorkScreen({
  workPackageId,
  user,
  onSubmitted,
  onBack,
}: {
  workPackageId: string;
  user: SignedIn;
  onSubmitted: () => void;
  onBack: () => void;
}) {
  const [pkg, setPkg] = useState<AssignedWork | null>(null);
  const [step, setStep] = useState<Step>("respond");
  const [draft, setDraft] = useState<{ title: string; paragraphs: Paragraph[] } | null>(null);
  const [filled, setFilled] = useState<Record<string, FilledFieldValue[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [items, setItems] = useState<Record<string, boolean>>({});
  const elapsed = useElapsed(busy !== null);
  const saves = useRef<Record<string, number>>({});
  const pending = useRef<Record<string, FilledFieldValue[]>>({});

  /*
   * An edit still inside the debounce window is flushed on the way out, not
   * cancelled. Dropping a timer that was about to persist a figure somebody
   * signs is the exact silent loss the debounce was added to avoid.
   */
  useEffect(() => () => {
    for (const [formId, timer] of Object.entries(saves.current)) {
      window.clearTimeout(timer);
      const fields = pending.current[formId];
      if (fields) void saveFormValues(formId, fields);
    }
  }, []);

  useEffect(() => {
    let live = true;
    /*
     * Only the package is re-read on a change, not the draft or the filled
     * values. Those are what the person is editing, and replacing them under
     * their cursor because the manager left a comment would lose their work.
     */
    const stop = watchMyWork(user.id, () => {
      fetchMyWork(user.id)
        .then((all) => live && setPkg(all.find((w) => w.id === workPackageId) ?? null))
        .catch(() => undefined);
    });

    fetchMyWork(user.id)
      .then(async (all) => {
        const found = all.find((w) => w.id === workPackageId) ?? null;
        if (!live) return;
        setPkg(found);
        setItems(Object.fromEntries((found?.actionItems ?? []).map((i) => [i.id, i.done])));
        if (found) {
          const [saved, values] = await Promise.all([
            fetchResponses(found.id),
            fetchFormValues(found.forms.map((f) => f.id)),
          ]);
          if (!live) return;
          if (saved[0]) setDraft({ title: saved[0].title, paragraphs: saved[0].body });
          if (Object.keys(values).length) setFilled(values);
        }
      })
      .catch((caught: Error) => live && setError(caught.message));
    return () => {
      live = false;
      stop();
    };
  }, [workPackageId, user.id]);

  async function generate() {
    if (!pkg) return;
    setBusy("draft");
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workPackageId: pkg.id, operation: "draft" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Drafting failed");
      const paragraphs: Paragraph[] = (json.paragraphs as string[]).map((text) => ({ text, ai: true }));
      setDraft({ title: json.title as string, paragraphs });
      await saveResponse(pkg.id, "response", json.title as string, paragraphs);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }


  /**
   * Records an edit, and re-badges the value it changed.
   *
   * A figure a person typed is neither from the tender nor from the company
   * record, so it stops claiming to be. The badge exists so a reader can tell
   * where a value came from, and leaving "From the RFP" on something a bidder
   * rewrote would be it lying about the one case where the answer matters most.
   */
  function editField(formId: string, index: number, value: string) {
    setFilled((prev) => {
      const next = (prev[formId] ?? []).map((f, i) =>
        i === index
          ? { ...f, value, source: value === f.value ? f.source : ("human" as const) }
          : f,
      );
      /*
       * Written back on a delay, not on the keystroke. A save per character
       * would put a row-update per letter typed on a figure somebody signs, and
       * the value that matters is the one they stopped typing.
       */
      const timer = saves.current[formId];
      if (timer) window.clearTimeout(timer);
      pending.current[formId] = next;
      saves.current[formId] = window.setTimeout(() => {
        delete saves.current[formId];
        delete pending.current[formId];
        void saveFormValues(formId, next).catch((caught: Error) => setError(caught.message));
      }, 700);
      return { ...prev, [formId]: next };
    });
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
      const fields = json.fields as FilledFieldValue[];
      setFilled((prev) => ({ ...prev, [formId]: fields }));
      await saveFormValues(formId, fields);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }


  if (error && !pkg) {
    return <p role="alert" className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-red-800">{error}</p>;
  }
  if (!pkg) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading…</p>;
  }

  const done: Record<Step, boolean> = {
    respond: Boolean(draft),
    forms: Object.keys(filled).length === pkg.forms.length && pkg.forms.length > 0,
    submit: pkg.status === "submitted",
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <header className="mb-5">
        <p className="font-mono text-[11px] text-stone-400">{pkg.rfp?.tender_ref}</p>
        <h1 className="mt-1 max-w-[70ch] text-xl font-extrabold leading-snug tracking-tight text-ink">
          {pkg.rfp?.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-navy-soft px-2.5 py-1 text-xs font-semibold text-navy">
            {ROLE_NAMES[pkg.role_id]}
          </span>
          <button
            onClick={() => setViewing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
          >
            <FileText width={15} height={15} />
            View the RFP
          </button>
        </div>
      </header>

      {/*
        * Shown on every step rather than on the submit screen alone. What the
        * bid manager asked for is usually a change to the prose or a figure, so
        * putting it where the work is done is the only placement that helps.
        */}
      {pkg.review === "changes-requested" && pkg.review_note ? (
        <div className="mb-5 rounded-2xl bg-amber-50 px-6 py-5 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-amber-800">
            The bid manager has asked for changes
          </p>
          <p className="mt-2 max-w-[76ch] text-sm leading-relaxed text-amber-900">
            {pkg.review_note}
          </p>
          {pkg.review_at ? (
            <p className="mt-2 text-[11px] text-amber-700">
              {new Date(pkg.review_at).toLocaleString("en-IN", {
                day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>
      ) : pkg.review === "approved" ? (
        <div className="mb-5 rounded-2xl bg-emerald-50 px-6 py-4 ring-1 ring-inset ring-emerald-200">
          <p className="text-sm font-semibold text-emerald-900">
            Approved by the bid manager.
          </p>
          {pkg.review_note ? (
            <p className="mt-1.5 max-w-[76ch] text-sm leading-relaxed text-emerald-800">
              {pkg.review_note}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="mb-6 border-b border-stone-100 pb-5">
          <Stepper step={step} done={done} onGo={setStep} />
        </div>

        {step === "respond" ? (
          <>
            <h2 className="text-sm font-bold text-ink">What the tender asks of you</h2>
            <ol className="mt-3 flex flex-col gap-2.5">
              {pkg.actionItems.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <button
                    onClick={() => {
                      const next = !items[item.id];
                      setItems((p) => ({ ...p, [item.id]: next }));
                      void setItemDone(item.id, next);
                    }}
                    aria-label={items[item.id] ? "Mark as outstanding" : "Mark as done"}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      items[item.id] ? "border-navy bg-navy text-white" : "border-stone-300"
                    }`}
                  >
                    {items[item.id] ? <Check width={11} height={11} /> : null}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm leading-relaxed ${items[item.id] ? "text-stone-400 line-through" : "text-ink"}`}>
                      {item.text}
                    </p>
                    {item.ref ? (
                      <p className="mt-0.5 font-mono text-[11px] text-stone-400">
                        {item.ref}{item.page_no ? ` · p${item.page_no}` : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 border-t border-stone-100 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">Your section</h2>
                <button
                  onClick={generate}
                  disabled={busy === "draft"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  <Sparkle width={15} height={15} className="text-navy" />
                  {busy === "draft"
                    ? `Drafting… ${elapsed ?? 0}s`
                    : draft
                      ? "Draft again"
                      : "Draft with AI"}
                </button>
              </div>

              {busy === "draft" ? (
                <p className="mt-2 text-right text-[11px] text-stone-400">
                  Reading the tender and writing your section. About a minute.
                </p>
              ) : null}

              {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

              {draft ? (
                <div className="mt-4 rounded-xl bg-cream-soft px-5 py-4 ring-1 ring-cream-line">
                  <p className="text-sm font-bold text-ink">{draft.title}</p>
                  <div className="mt-3 flex flex-col gap-3">
                    {draft.paragraphs.map((p, i) => (
                      <textarea
                        key={i}
                        value={p.text}
                        rows={Math.max(2, Math.ceil(p.text.length / 95))}
                        onChange={(e) => {
                          const next = draft.paragraphs.map((q, j) =>
                            j === i ? { text: e.target.value, ai: false } : q);
                          setDraft({ ...draft, paragraphs: next });
                        }}
                        onBlur={() => void saveResponse(pkg.id, "response", draft.title, draft.paragraphs)}
                        /*
                         * Looks like a field, because it is one.
                         *
                         * It was styled with a transparent border and background,
                         * so a drafted section was indistinguishable from static
                         * text and nobody could tell it could be changed -- it was
                         * reported as needing to be made editable when it already
                         * was. A control that accepts input has to say so before
                         * it is touched, not on focus.
                         */
                        className="mb-2 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink transition hover:border-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-stone-500">
                    Drafted from the tender. Every paragraph is yours to rewrite, and
                    changes save as you leave each one.
                  </p>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
                  Nothing written yet. Draft a first version from the tender, then edit it.
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setStep("forms")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
                >
                  Forms
                  <ArrowRight width={16} height={16} />
                </button>
              </div>
            </div>
          </>
        ) : step === "forms" ? (
          <>
            <h2 className="text-sm font-bold text-ink">Annexures assigned to you</h2>
            <p className="mt-1 text-sm text-stone-500">
              Values are taken from the tender where it states them, and from the company
              record where it does not. Each one says which.
            </p>

            {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

            {pkg.forms.length === 0 ? (
              /*
               * Not every tender has annexures. A GeM bid is submitted on the
               * portal and carries none at all, and the extraction correctly
               * returned none -- which rendered as a step with nothing in it and
               * read as a failure. Saying so is the difference between "there is
               * nothing here" and "something did not load".
               */
              <div className="mt-4 rounded-xl bg-stone-50 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-ink">
                  This tender asks you for no annexures
                </p>
                <p className="mx-auto mt-1 max-w-[52ch] text-sm text-stone-500">
                  Nothing in the document assigns a form to your role. Some tenders,
                  GeM bids in particular, are submitted entirely on the portal and carry
                  no annexure pack. Your written section is what goes back.
                </p>
              </div>
            ) : null}

            <ul className="mt-4 flex flex-col gap-3">
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

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setStep("respond")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
              >
                <ChevronLeft width={16} height={16} />
                Back
              </button>
              <button
                onClick={() => setStep("submit")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
              >
                Compile
                <ArrowRight width={16} height={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold text-ink">What goes back to the bid manager</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li className="flex items-center gap-2.5 text-sm text-ink">
                <CheckCircle width={15} height={15} className={draft ? "text-emerald-600" : "text-stone-300"} />
                {draft ? `Your section: ${draft.paragraphs.length} paragraphs` : "No section written"}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-ink">
                <CheckCircle
                  width={15} height={15}
                  className={Object.keys(filled).length > 0 ? "text-emerald-600" : "text-stone-300"}
                />
                {Object.keys(filled).length} of {pkg.forms.length} annexures completed
              </li>
              <li className="flex items-center gap-2.5 text-sm text-ink">
                <CheckCircle
                  width={15} height={15}
                  className={Object.values(items).filter(Boolean).length === pkg.actionItems.length ? "text-emerald-600" : "text-stone-300"}
                />
                {Object.values(items).filter(Boolean).length} of {pkg.actionItems.length} action items marked done
              </li>
            </ul>

            {pkg.status === "submitted" ? (
              <p className="mt-6 rounded-xl bg-stone-50 px-5 py-4 text-sm text-stone-600">
                {pkg.review === "approved"
                  ? "Submitted and approved. Your part of this bid is done."
                  : "Submitted. Waiting for the bid manager to read it."}
              </p>
            ) : (
              <>
                {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setStep("forms")}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
                  >
                    <ChevronLeft width={16} height={16} />
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      setBusy("submit");
                      setError(null);
                      try {
                        await submit(pkg.id, {
                          rfpId: pkg.rfp_id,
                          roleId: pkg.role_id,
                          roleName: ROLE_NAMES[pkg.role_id],
                          actorName: user.fullName,
                          resubmit: pkg.review === "changes-requested",
                        });
                        onSubmitted();
                      } catch (caught) {
                        setError((caught as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                    disabled={busy === "submit" || !draft}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
                  >
                    {busy === "submit"
                      ? "Submitting…"
                      : pkg.review === "changes-requested"
                        ? "Resubmit to the bid manager"
                        : "Submit to the bid manager"}
                    <ArrowRight width={16} height={16} />
                  </button>
                </div>
                {!draft ? (
                  <p className="mt-2 text-right text-[11px] text-stone-400">
                    Write your section before submitting.
                  </p>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      {viewing ? (
        <PdfViewerModal
          rfpId={pkg.rfp_id}
          title={pkg.rfp?.title ?? "Tender"}
          subtitle={pkg.rfp?.tender_ref ?? undefined}
          onClose={() => setViewing(false)}
        />
      ) : null}

      <button onClick={onBack} className="sr-only">Back to your work</button>
    </div>
  );
}
