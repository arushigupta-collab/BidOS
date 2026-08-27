import { useEffect, useState } from "react";
import { fetchAssigned, type RfpRow } from "../lib/rfps";
import { countdown, day, EMPTY, shortMoney, sourceLabel, urgency } from "../lib/display";
import type { SignedIn } from "../lib/session";
import { SortHeader } from "../components/ui";
import { Layers } from "../lib/icons";

/**
 * What has been routed to the signed-in bid manager.
 *
 * Filtered on the assignment Bid Hawk made, not on anything chosen here: a bid
 * manager's list is the consequence of the routing rules, and a filter they could
 * widen would make ownership look advisory.
 */

const URGENCY_CLASS: Record<string, string> = {
  critical: "text-red-700",
  warning: "text-amber-700",
  normal: "text-stone-700",
  elapsed: "text-stone-400",
};

export function DashboardScreen({
  user,
  onOpen,
}: {
  user: SignedIn;
  onOpen: (id: string) => void;
}) {
  const [rfps, setRfps] = useState<RfpRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchAssigned(user.id)
      .then((rows) => live && setRfps(rows))
      .catch((caught: Error) => live && setError(caught.message));
    return () => {
      live = false;
    };
  }, [user.id]);

  const closingSoon = (rfps ?? []).filter(
    (r) => urgency(r.bid_due_at) === "critical" || urgency(r.bid_due_at) === "warning",
  ).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Assigned tenders
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Routed to you as {user.industry ?? "bid manager"}.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-stone-100/70 px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy ring-1 ring-stone-200">
              <Layers width={20} height={20} />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Open tenders
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-ink">
                  {rfps?.length ?? EMPTY}
                </span>
                <span className="text-sm text-stone-500">
                  {closingSoon > 0 ? `${closingSoon} closing soon` : "none closing this week"}
                </span>
              </div>
            </div>
          </div>
          <div className="max-w-[240px] text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Signed in as
            </div>
            <div className="text-sm font-bold text-ink">{user.fullName}</div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </p>
        ) : rfps === null ? (
          <p className="px-5 py-8 text-sm text-stone-500">Loading your tenders…</p>
        ) : rfps.length === 0 ? (
          <div className="rounded-xl bg-stone-50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-ink">Nothing is assigned to you yet</p>
            <p className="mx-auto mt-1 max-w-[46ch] text-sm text-stone-500">
              Tenders arrive here once Bid Hawk reads one that matches your domains and
              regions. Nothing needs doing in the meantime.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200">
                  <SortHeader label="RFP" />
                  <SortHeader label="Source" />
                  <SortHeader label="Issuing Authority" />
                  <SortHeader label="Due Date" />
                  <SortHeader label="Est. Value" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rfps.map((r) => (
                  <tr key={r.id} className="group transition hover:bg-stone-50/70">
                    <td className="max-w-[380px] px-5 py-4 align-top">
                      <button
                        onClick={() => onOpen(r.id)}
                        className="text-left text-sm font-semibold text-navy hover:underline"
                      >
                        {r.title}
                      </button>
                      <div className="mt-1 font-mono text-[11px] text-stone-400">
                        {r.tender_ref ?? EMPTY}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-sm whitespace-nowrap text-stone-600">
                      {sourceLabel(r)}
                    </td>
                    <td className="max-w-[240px] px-5 py-4 align-top text-sm text-stone-600">
                      {r.issuing_authority ?? EMPTY}
                    </td>
                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <span className="text-sm text-stone-700">{day(r.bid_due_at)}</span>
                      <span
                        className={`mt-0.5 block font-mono text-[11px] ${URGENCY_CLASS[urgency(r.bid_due_at)]}`}
                      >
                        {countdown(r.bid_due_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-sm whitespace-nowrap font-medium text-ink">
                      {shortMoney(r.est_value)}
                      {r.est_value && r.est_value_is_inferred ? (
                        <span className="mt-0.5 block text-[11px] font-normal text-stone-400">
                          Estimated. Not published.
                        </span>
                      ) : null}
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
