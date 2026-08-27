import { useEffect, useState } from "react";
import {
  fetchSubmitted, approveWork, requestChanges, ROLE_NAMES,
  type WorkPackage, type SubmittedWork, type FilledValue,
} from "../lib/rfps";
import type { SignedIn } from "../lib/session";
import { Check, ChevronLeft } from "../lib/icons";

/**
 * Reading one specialist's work, and saying what happens to it.
 *
 * The manager signs the bid, so this screen is where a draft becomes the
 * company's answer. It shows the prose and the annexure figures together
 * because they are one claim: the section argues a capability and the annexure
 * is the number backing it, and approving either alone is how a bid ends up
 * promising a turnover it cannot evidence.
 */

const SOURCE_LABEL: Record<FilledValue["filled_by"], string> = {
  rfp: "From the RFP",
  profile: "From the company record",
  ai: "Drafted",
  human: "Typed",
};

function Provenance({ value }: { value: FilledValue }) {
  const drafted = value.filled_by === "ai";
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
        drafted
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-stone-100 text-stone-600 ring-stone-200"
      }`}
    >
      {SOURCE_LABEL[value.filled_by]}
      {value.source_page ? ` p.${value.source_page}` : ""}
    </span>
  );
}

export function ReviewScreen({
  pkg,
  rfpId,
  user,
  onBack,
  onDecided,
}: {
  pkg: WorkPackage;
  rfpId: string;
  user: SignedIn;
  onBack: () => void;
  onDecided: (message: string) => void;
}) {
  const [work, setWork] = useState<SubmittedWork | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "changes" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchSubmitted(pkg)
      .then((next) => live && setWork(next))
      .catch((caught: Error) => live && setError(caught.message));
    return () => {
      live = false;
    };
  }, [pkg]);

  const reviewer = { id: user.id, fullName: user.fullName };

  async function act(kind: "approve" | "changes") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "approve") {
        await approveWork(pkg, rfpId, reviewer, note);
        onDecided(`${ROLE_NAMES[pkg.role_id]} approved.`);
      } else {
        await requestChanges(pkg, rfpId, reviewer, note);
        onDecided(`Sent back to the ${ROLE_NAMES[pkg.role_id]}.`);
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const drafted = Object.values(work?.values ?? {})
    .flat()
    .filter((v) => v.filled_by === "ai").length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <header className="mb-6 border-b border-stone-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
            For your review
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
            {ROLE_NAMES[pkg.role_id]}
          </h1>
          <p className="mt-1.5 max-w-[68ch] text-sm text-stone-500">
            {pkg.submitted_at
              ? `Handed back ${new Date(pkg.submitted_at).toLocaleString("en-IN", {
                  day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                })}.`
              : "Handed back."}{" "}
            {drafted > 0
              ? `${drafted} ${drafted === 1 ? "figure was" : "figures were"} drafted rather than taken from the tender or the company record. Those are the ones to check.`
              : "Every figure came from the tender or the company record."}
          </p>
        </header>

        {error ? (
          <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>
        ) : null}

        {pkg.review === "changes-requested" && pkg.review_note ? (
          <div className="mb-6 rounded-xl bg-amber-50 px-5 py-4 ring-1 ring-inset ring-amber-200">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-amber-800">
              You already asked for changes
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{pkg.review_note}</p>
          </div>
        ) : null}

        {!work ? (
          <p className="text-sm text-stone-500">Loading what they sent…</p>
        ) : (
          <>
            <h2 className="text-sm font-bold text-ink">Their written section</h2>
            {work.responses.length === 0 ? (
              <p className="mt-2 rounded-xl bg-stone-50 px-5 py-4 text-sm text-stone-600">
                Nothing written yet. There is no section to approve.
              </p>
            ) : (
              work.responses.map((response) => (
                <article key={response.id} className="mt-3 rounded-xl border border-stone-200 px-5 py-4">
                  <h3 className="text-sm font-semibold text-ink">{response.title}</h3>
                  {response.body.map((paragraph, i) => (
                    <p key={i} className="mt-2.5 max-w-[76ch] text-sm leading-relaxed text-stone-700">
                      {paragraph.text}
                    </p>
                  ))}
                </article>
              ))
            )}

            <h2 className="mt-7 text-sm font-bold text-ink">Their annexures</h2>
            {pkg.forms.length === 0 ? (
              <p className="mt-2 rounded-xl bg-stone-50 px-5 py-4 text-sm text-stone-600">
                This tender assigns no annexures to the {ROLE_NAMES[pkg.role_id]}.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {pkg.forms.map((form) => {
                  const values = work.values[form.id] ?? [];
                  return (
                    <li key={form.id} className="rounded-xl border border-stone-200">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{form.title}</p>
                        <p className="font-mono text-[11px] text-stone-400">{form.annexure}</p>
                      </div>
                      {values.length === 0 ? (
                        <p className="border-t border-stone-100 px-4 py-3 text-sm text-stone-500">
                          Not filled in.
                        </p>
                      ) : (
                        <dl className="divide-y divide-stone-100 border-t border-stone-100">
                          {values.map((value) => (
                            <div key={value.field_key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                              <dt className="min-w-[13rem] flex-1 text-xs text-stone-500">
                                {value.field_key}
                              </dt>
                              <dd className="text-sm font-medium text-ink">{value.value || "—"}</dd>
                              <Provenance value={value} />
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-8 border-t border-stone-100 pt-6">
              <label htmlFor="review-note" className="text-sm font-bold text-ink">
                Your comment
              </label>
              <p className="mt-1 max-w-[68ch] text-sm text-stone-500">
                Required if you are sending it back, so the specialist knows what to change.
                Optional on an approval, and kept in the change log either way.
              </p>
              <textarea
                id="review-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Annexure IV understates the FY24 turnover. Use the audited figure."
                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-stone-300 focus:border-navy focus:outline-none"
              />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
                >
                  <ChevronLeft width={16} height={16} />
                  The bid team
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => act("changes")}
                    disabled={busy !== null || !note.trim()}
                    title={note.trim() ? undefined : "Say what needs changing first"}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === "changes" ? "Sending back…" : "Suggest changes"}
                  </button>
                  <button
                    onClick={() => act("approve")}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
                  >
                    <Check width={16} height={16} />
                    {busy === "approve" ? "Approving…" : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
