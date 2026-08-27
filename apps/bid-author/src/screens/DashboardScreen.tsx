import { useEffect, useState } from "react";
import { fetchMyWork, watchMyWork, type AssignedWork } from "../lib/work";
import { ROLE_NAMES, type SignedIn } from "../lib/session";
import { countdown, day, EMPTY, shortMoney } from "../lib/display";
import { SortHeader } from "../components/ui";
import { Layers } from "../lib/icons";
import { stateOf, stillMine } from "../lib/review";

/**
 * What has been assigned to the signed-in specialist.
 *
 * A work package, not a tender. The distinction matters: this person is not
 * evaluating whether to bid, they are answering a defined part of a bid somebody
 * else already committed to, and showing them the whole tender as though it were
 * theirs to weigh would misdescribe the job.
 */

const STATUS_LABEL: Record<string, string> = {
  assigned: "Awaiting response",
  "in-progress": "In progress",
  submitted: "Submitted",
  "changes-requested": "Changes requested",
  approved: "Approved",
  unassigned: "Not assigned",
};

const STATUS_DOT: Record<string, string> = {
  assigned: "border border-stone-400",
  "in-progress": "bg-stone-400",
  submitted: "bg-stone-700",
  "changes-requested": "bg-amber-500",
  approved: "bg-emerald-600",
  unassigned: "border border-stone-300",
};

export function DashboardScreen({
  user,
  onOpen,
}: {
  user: SignedIn;
  onOpen: (workPackageId: string) => void;
}) {
  const [work, setWork] = useState<AssignedWork[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetchMyWork(user.id)
        .then((rows) => live && setWork(rows))
        .catch((caught: Error) => live && setError(caught.message));

    load();
    const stop = watchMyWork(user.id, load);
    return () => {
      live = false;
      stop();
    };
  }, [user.id]);

  const awaiting = stillMine(work ?? []);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your work</h1>
          <p className="mt-1 text-sm text-stone-500">
            Assigned to you as {ROLE_NAMES[user.roleId]}.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-stone-100/70 px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy ring-1 ring-stone-200">
              <Layers width={20} height={20} />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Assigned packages
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-ink">{work?.length ?? EMPTY}</span>
                <span className="text-sm text-stone-500">
                  {awaiting > 0 ? `${awaiting} still with you` : "all approved"}
                </span>
              </div>
            </div>
          </div>
          <div className="max-w-[240px] text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Your role
            </div>
            <div className="text-sm font-bold text-ink">{ROLE_NAMES[user.roleId]}</div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-800">{error}</p>
        ) : work === null ? (
          <p className="px-5 py-8 text-sm text-stone-500">Loading your work…</p>
        ) : work.length === 0 ? (
          <div className="rounded-xl bg-stone-50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-ink">Nothing has been assigned to you</p>
            <p className="mx-auto mt-1 max-w-[48ch] text-sm text-stone-500">
              A bid manager assigns work when a tender is distributed. It will appear here
              with the action items and annexures already attached.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200">
                  <SortHeader label="RFP" />
                  <SortHeader label="Issuing Authority" />
                  <SortHeader label="Due Date" />
                  <SortHeader label="Est. Value" />
                  <SortHeader label="Status" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {work.map((w) => (
                  <tr key={w.id} className="group transition hover:bg-stone-50/70">
                    <td className="max-w-[360px] px-5 py-4 align-top">
                      <button
                        onClick={() => onOpen(w.id)}
                        className="text-left text-sm font-semibold text-navy hover:underline"
                      >
                        {w.rfp?.title ?? "Untitled tender"}
                      </button>
                      <div className="mt-1 font-mono text-[11px] text-stone-400">
                        {w.rfp?.tender_ref ?? EMPTY}
                      </div>
                    </td>
                    <td className="max-w-[240px] px-5 py-4 align-top text-sm text-stone-600">
                      {w.rfp?.issuing_authority ?? EMPTY}
                    </td>
                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <span className="text-sm text-stone-700">{day(w.rfp?.bid_due_at ?? null)}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-stone-400">
                        {countdown(w.rfp?.bid_due_at ?? null)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-sm whitespace-nowrap font-medium text-ink">
                      {shortMoney(w.rfp?.est_value ?? null)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[stateOf(w)]}`} />
                        {STATUS_LABEL[stateOf(w)]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
