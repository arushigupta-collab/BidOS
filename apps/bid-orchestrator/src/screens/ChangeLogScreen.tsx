import { useEffect, useState } from "react";
import { fetchEvents, ROLE_NAMES, type BidEvent, type RoleId } from "../lib/rfps";
import { ChevronLeft } from "../lib/icons";

/**
 * What has happened to this bid, in order.
 *
 * Append-only and never summarised. On a tender answered by six people over
 * weeks, "who changed the turnover figure and why" is asked after the fact, by
 * someone who was not there -- and a state machine that only shows you where
 * things stand cannot answer it.
 */

const KIND: Record<string, { label: string; tone: string }> = {
  "unit-head-accepted": { label: "Approved to bid", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  "unit-head-rejected": { label: "Declined", tone: "bg-red-50 text-red-800 ring-red-200" },
  assigned: { label: "Assigned", tone: "bg-navy-soft text-navy ring-navy/20" },
  submitted: { label: "Submitted", tone: "bg-stone-100 text-stone-700 ring-stone-200" },
  approved: { label: "Approved", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  "changes-requested": { label: "Changes requested", tone: "bg-amber-50 text-amber-900 ring-amber-200" },
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function ChangeLogScreen({ rfpId, onBack }: { rfpId: string; onBack: () => void }) {
  const [events, setEvents] = useState<BidEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchEvents(rfpId)
      .then((next) => live && setEvents(next))
      .catch((caught: Error) => live && setError(caught.message));
    return () => {
      live = false;
    };
  }, [rfpId]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <header className="mb-6 border-b border-stone-100 pb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Change log</h1>
          <p className="mt-1 max-w-[68ch] text-sm text-stone-500">
            Every decision taken on this tender, newest first. Nothing here is edited or
            removed once written.
          </p>
        </header>

        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}

        {!events ? (
          <p className="text-sm text-stone-500">Loading the log…</p>
        ) : events.length === 0 ? (
          <p className="rounded-xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-600">
            Nothing has happened to this tender yet. Decisions appear here as they are taken.
          </p>
        ) : (
          <ol className="flex flex-col">
            {events.map((event, i) => {
              const kind = KIND[event.kind] ?? {
                label: event.kind,
                tone: "bg-stone-100 text-stone-700 ring-stone-200",
              };
              return (
                <li key={event.id} className="flex gap-4">
                  {/*
                   * A rail rather than separate rows. These are one sequence, and
                   * a list of cards reads as unrelated events that happen to be
                   * sorted -- which is the opposite of what a log is for.
                   */}
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stone-300" />
                    {i < events.length - 1 ? <span className="w-px flex-1 bg-stone-200" /> : null}
                  </div>
                  <div className="min-w-0 flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${kind.tone}`}
                      >
                        {kind.label}
                      </span>
                      {event.subject ? (
                        <span className="text-sm font-semibold text-ink">{event.subject}</span>
                      ) : event.role_id ? (
                        <span className="text-sm font-semibold text-ink">
                          {ROLE_NAMES[event.role_id as RoleId]}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      {event.actor_name} · {when(event.at)}
                    </p>
                    {event.note ? (
                      <p className="mt-2 max-w-[74ch] border-l-2 border-stone-200 pl-3 text-sm leading-relaxed text-stone-700">
                        {event.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="border-t border-stone-100 pt-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
          >
            <ChevronLeft width={16} height={16} />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
