import { useCallback, useEffect, useState } from "react";
import {
  fetchWorkPackages, watchWorkPackages, ROLE_NAMES, ROLE_ORDER,
  type WorkPackage,
} from "../lib/rfps";
import {
  specialists as specialistsOf, readyToCompile, awaitingReview, approvedCount, rowState,
} from "../lib/review";
import { Check, ArrowRight, Clock } from "../lib/icons";

/**
 * Where the bid manager watches the work come back.
 *
 * Subscribed to the packages rather than polled. A specialist submitting in Bid
 * Author writes one row, and this board updates without anybody reloading --
 * which is the whole point of two people working on one bid at once.
 */

/**
 * One map, keyed on whatever `rowState` decided to show.
 *
 * Two maps -- one for the work state, one for the verdict -- meant the row had
 * to pick between them at render time, which is the decision `rowState` exists
 * to make and to be tested on.
 */
const LABEL: Record<string, { text: string; tone: string }> = {
  unassigned: { text: "Not assigned", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  assigned: { text: "Awaiting response", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  "in-progress": { text: "In progress", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  submitted: { text: "Submitted, unread", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  approved: { text: "Approved", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  "changes-requested": { text: "Changes requested", tone: "bg-amber-50 text-amber-900 ring-amber-200" },
};

export function TeamOverviewScreen({
  rfpId,
  onCompile,
  onReview,
  onLog,
}: {
  rfpId: string;
  onCompile: () => void;
  onReview: (pkg: WorkPackage) => void;
  onLog: () => void;
}) {
  const [packages, setPackages] = useState<WorkPackage[] | null>(null);
  const [justChanged, setJustChanged] = useState<string | null>(null);

  const load = useCallback(
    (highlight = false) => {
      fetchWorkPackages(rfpId).then((next) => {
        setPackages((prev) => {
          if (highlight && prev) {
            const changed = next.find(
              (p) => p.status !== prev.find((q) => q.id === p.id)?.status,
            );
            if (changed) {
              setJustChanged(changed.id);
              window.setTimeout(() => setJustChanged(null), 2600);
            }
          }
          return next;
        });
      });
    },
    [rfpId],
  );

  useEffect(() => {
    load();
    return watchWorkPackages(rfpId, () => load(true));
  }, [rfpId, load]);

  if (!packages) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading the board…</p>;
  }

  const specialists = specialistsOf(packages);
  const approved = approvedCount(packages);
  const everyoneIn = readyToCompile(packages);
  const unread = awaitingReview(packages);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">The bid team</h1>
            <p className="mt-1 text-sm text-stone-500">
              {approved} of {specialists.length} specialists approved.
              {unread > 0
                ? ` ${unread} waiting on you to read ${unread === 1 ? "it" : "them"}.`
                : " This updates as they submit."}
            </p>
          </div>
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-navy transition-[width] duration-500"
              style={{ width: `${specialists.length ? (approved / specialists.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-stone-100">
          {ROLE_ORDER.map((role) => {
            const pkg = packages.find((p) => p.role_id === role);
            if (!pkg) return null;
            const isSubmitted = pkg.status === "submitted";
            const own = role === "bid-manager";
            const label = LABEL[rowState(pkg)];
            const reviewable = isSubmitted && !own;
            return (
              <li
                key={role}
                className={`flex flex-wrap items-center gap-4 py-4 transition-colors duration-500 ${
                  justChanged === pkg.id ? "bg-emerald-50/60" : ""
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    pkg.review === "approved"
                      ? "bg-emerald-600 text-white"
                      : isSubmitted
                        ? "bg-stone-700 text-white"
                        : "border-2 border-stone-200 text-stone-400"
                  }`}
                >
                  {pkg.review === "approved" ? (
                    <Check width={14} height={14} />
                  ) : isSubmitted ? (
                    <Clock width={14} height={14} />
                  ) : null}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{ROLE_NAMES[role]}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    {own ? "You" : pkg.assignee_id ? "Assigned" : "Nobody yet"} ·{" "}
                    {pkg.actionItems.length} action items · {pkg.forms.length} forms
                  </p>
                  {/*
                   * The note stays on the row after it is sent back, so the board
                   * says why a role went amber without anybody opening anything.
                   */}
                  {pkg.review === "changes-requested" && pkg.review_note ? (
                    <p className="mt-1.5 max-w-[62ch] border-l-2 border-amber-300 pl-2.5 text-xs leading-relaxed text-amber-900">
                      {pkg.review_note}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                      own ? "bg-stone-100 text-stone-600 ring-stone-200" : label.tone
                    }`}
                  >
                    {own ? "Yours to complete" : label.text}
                  </span>
                  {reviewable ? (
                    <button
                      onClick={() => onReview(pkg)}
                      className="whitespace-nowrap rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                    >
                      {pkg.review === "pending" ? "Review" : "Read again"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-5">
          <div>
            <p className="text-sm text-stone-500">
              {everyoneIn
                ? "Everything is approved. Complete your own forms, then compile."
                : "Your own forms open once you have approved every specialist."}
            </p>
            <button
              onClick={onLog}
              className="mt-1.5 text-xs font-semibold text-stone-500 underline decoration-stone-300 underline-offset-2 transition hover:text-ink"
            >
              View the change log
            </button>
          </div>
          <button
            onClick={onCompile}
            disabled={!everyoneIn}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-40"
            title={everyoneIn ? undefined : "Waiting on the specialists you have not approved"}
          >
            Your forms
            <ArrowRight width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
