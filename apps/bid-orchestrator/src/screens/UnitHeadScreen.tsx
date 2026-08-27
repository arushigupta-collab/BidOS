import { useEffect, useState } from "react";
import { fetchDetail, setApproval, type RfpDetail } from "../lib/rfps";
import { day, EMPTY } from "../lib/display";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { Sparkle, FileText, Check, CrossCircle, ChevronLeft } from "../lib/icons";

/**
 * The decision to bid, before the work is handed out.
 *
 * A bid manager can read a tender and see everything it demands without anyone
 * having committed to anything. Distributing it across six people IS the
 * commitment -- six calendars, an EMD to arrange, a bank guarantee to price -- so
 * the decision sits between the two rather than being implied by whoever gets
 * assigned first.
 *
 * The unit head sees what the bid manager saw and nothing more: the document, the
 * reading, and what the tender costs to enter. No new analysis, because a second
 * summary written for the approver is a second thing that can disagree with the
 * first.
 */

export function UnitHeadScreen({
  rfpId,
  onDecided,
  onBack,
}: {
  rfpId: string;
  onDecided: () => void;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<RfpDetail | null>(null);
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetail(rfpId).then(setDetail).catch((c: Error) => setError(c.message));
  }, [rfpId]);

  async function decide(approval: "accepted" | "rejected") {
    setBusy(approval === "accepted" ? "accept" : "reject");
    setError(null);
    try {
      /*
       * The reason is kept on an acceptance too, not only a rejection. "Why did
       * we bid for this" is asked as often as "why did we not", and only one of
       * the two was being recorded.
       */
      await setApproval(rfpId, approval, note.trim() || undefined);
      onDecided();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error && !detail) {
    return <p role="alert" className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-red-800">{error}</p>;
  }
  if (!detail) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading…</p>;
  }

  const { rfp, summary } = detail;
  const decided = rfp.approval !== "pending";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Unit head approval
        </p>
        <h1 className="mt-1 max-w-[70ch] text-xl font-extrabold leading-snug tracking-tight text-ink">
          {rfp.title}
        </h1>
        <p className="mt-1 font-mono text-[11px] text-stone-400">{rfp.tender_ref ?? EMPTY}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setViewing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <FileText width={16} height={16} />
            View the RFP
          </button>
        </div>

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Sparkle width={15} height={15} className="text-navy" />
            What this tender is
          </h2>
          <div className="mt-3 rounded-xl bg-cream-soft px-4 py-3 ring-1 ring-cream-line">
            <ul className="flex flex-col gap-2">
              {summary.map((line, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink">{line}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* What entering costs, which is what the decision turns on. */}
        <section className="mt-6">
          <h2 className="text-sm font-bold text-ink">What it costs to enter</h2>
          <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Fact label="Tender fee" value={rfp.tender_fee} />
            <Fact label="EMD" value={rfp.emd} />
            <Fact label="Performance guarantee" value={rfp.pbg} />
            <Fact label="Contract term" value={rfp.contract_term} />
            <Fact label="Bid due" value={day(rfp.bid_due_at)} />
            <Fact label="Selection" value={rfp.selection_method} />
          </dl>
        </section>

        {decided ? (
          <div
            className={`mt-7 rounded-xl px-5 py-4 ${
              rfp.approval === "accepted"
                ? "bg-emerald-50 text-emerald-900"
                : "bg-red-50 text-red-900"
            }`}
          >
            <p className="text-sm font-semibold">
              {rfp.approval === "accepted" ? "Approved to bid" : "Not approved"}
            </p>
            {rfp.approval_note ? (
              <p className="mt-1 text-sm">{rfp.approval_note}</p>
            ) : null}
            <p className="mt-1 text-[11px] opacity-80">
              Decided {rfp.approval_at ? day(rfp.approval_at) : EMPTY}
            </p>
          </div>
        ) : (
          <div className="mt-7 border-t border-stone-100 pt-5">
            <label
              htmlFor="note"
              className="block text-[11px] font-semibold uppercase tracking-wide text-stone-400"
            >
              Reason, if declining
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this one is not worth bidding"
              className="mt-1 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />

            {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
              >
                <ChevronLeft width={16} height={16} />
                Tender
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => decide("rejected")}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                >
                  <CrossCircle width={16} height={16} />
                  {busy === "reject" ? "Recording…" : "Reject"}
                </button>
                <button
                  onClick={() => decide("accepted")}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
                >
                  <Check width={16} height={16} />
                  {busy === "accept" ? "Recording…" : "Accept"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewing ? (
        <PdfViewerModal
          rfpId={rfp.id}
          title={rfp.title}
          subtitle={rfp.tender_ref ?? undefined}
          onClose={() => setViewing(false)}
        />
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-ink">
        {value ?? <span className="text-stone-400">{EMPTY}</span>}
      </dd>
    </div>
  );
}
