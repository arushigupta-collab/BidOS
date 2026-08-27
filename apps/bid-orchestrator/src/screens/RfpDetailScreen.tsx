import { useEffect, useState } from "react";
import { fetchDetail, fetchWorkPackages, type RfpDetail } from "../lib/rfps";
import { day, EMPTY, when } from "../lib/display";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { Sparkle, FileText, ArrowRight, CheckCircle } from "../lib/icons";

/**
 * One tender, in full.
 *
 * A page rather than a drawer. The eligibility snapshot alone runs to a dozen
 * rows, each with a criterion, a verdict and the reason for it, and a drawer
 * would have it scrolling in a column beside the thing it is about. Bid Hawk
 * makes the same argument about the same content.
 *
 * Every figure here was read off a numbered page, and the page number stays
 * attached to it. That is the difference between a summary a reader has to
 * believe and one they can check.
 */

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  fail: "bg-red-50 text-red-800 ring-red-200",
};

const STATUS_WORD: Record<string, string> = {
  pass: "Met",
  warn: "Check",
  fail: "Not met",
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-stone-200 bg-stone-50",
};

function Cite({ page }: { page: number | null }) {
  if (!page) return null;
  return (
    <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-500">
      p{page}
    </span>
  );
}

function Fact({
  label,
  value,
  page,
}: {
  label: string;
  value: string | null;
  page?: number | null;
}) {
  return (
    <div className="border-b border-stone-100 py-3 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">
        {value ?? <span className="text-stone-400">{EMPTY}</span>}
        <Cite page={page ?? null} />
      </dd>
    </div>
  );
}

export function RfpDetailScreen({
  rfpId,
  onBuildTeam,
  onOpenTeam,
  onSendToUnitHead,
  onLog,
}: {
  rfpId: string;
  onBuildTeam: () => void;
  onOpenTeam: () => void;
  onSendToUnitHead: () => void;
  onLog: () => void;
}) {
  const [detail, setDetail] = useState<RfpDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const approval = detail?.rfp.approval ?? "pending";

  useEffect(() => {
    let live = true;
    fetchDetail(rfpId)
      .then((d) => live && setDetail(d))
      .catch((caught: Error) => live && setError(caught.message));
    // Whether the work has been handed out yet decides which action leads here.
    fetchWorkPackages(rfpId)
      .then((p) => live && setHasTeam(p.some((w) => w.role_id !== "bid-manager" && w.assignee_id)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [rfpId]);

  if (error) {
    return (
      <p role="alert" className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (!detail) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading…</p>;
  }

  const { rfp, eligibility, risks, fields, summary } = detail;
  const page = (key: string) => fields.find((f) => f.key === key)?.page_no ?? null;
  const notMet = eligibility.filter((r) => r.status === "fail").length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <header className="mb-6">
        <p className="font-mono text-[11px] text-stone-400">{rfp.tender_ref ?? EMPTY}</p>
        <h1 className="mt-1 max-w-[70ch] text-2xl font-extrabold leading-snug tracking-tight text-ink">
          {rfp.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setViewing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <FileText width={16} height={16} />
            View the RFP
          </button>
          {/*
            * Distributing the work is gated on the unit head's decision.
            *
            * A bid manager can read the tender and see everything it demands
            * without anyone having committed. Handing it to six people is the
            * commitment, so it waits for an answer -- and where the answer was
            * no, the control stays but says why rather than disappearing, which
            * would leave a reader wondering whether it had ever been there.
            */}
          {approval === "pending" ? (
            <button
              onClick={onSendToUnitHead}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
            >
              Send to unit head
              <ArrowRight width={16} height={16} />
            </button>
          ) : approval === "rejected" ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled
                title="The unit head declined this tender"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white opacity-40"
              >
                Assemble the team
                <ArrowRight width={16} height={16} />
              </button>
              <button
                onClick={onSendToUnitHead}
                className="text-sm font-semibold text-stone-500 underline underline-offset-4 transition hover:text-ink"
              >
                Not approved. See why
              </button>
              <button
                onClick={onLog}
                className="text-sm font-semibold text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-ink"
              >
                Change log
              </button>
            </div>
          ) : hasTeam ? (
            <>
              <button
                onClick={onBuildTeam}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Change assignments
              </button>
              <button
                onClick={onLog}
                className="text-sm font-semibold text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-ink"
              >
                Change log
              </button>
              <button
                onClick={onOpenTeam}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
              >
                The bid team
                <ArrowRight width={16} height={16} />
              </button>
            </>
          ) : (
            <button
              onClick={onBuildTeam}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
            >
              Assemble the team
              <ArrowRight width={16} height={16} />
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Sparkle width={15} height={15} className="text-navy" />
              Summary
            </h2>
            <div className="mt-3 rounded-xl bg-cream-soft px-4 py-3 ring-1 ring-cream-line">
              <ul className="flex flex-col gap-2">
                {summary.map((line, i) => (
                  <li key={i} className="text-sm leading-relaxed text-ink">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-bold text-ink">Eligibility</h2>
              <p className="text-sm text-stone-500">
                {eligibility.length} criteria
                {notMet > 0 ? (
                  <span className="ml-2 font-semibold text-red-700">{notMet} not met</span>
                ) : null}
              </p>
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-stone-100">
              {eligibility.map((row) => (
                <li key={row.ord} className="flex gap-4 py-3.5">
                  <span
                    className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLE[row.status]}`}
                  >
                    {STATUS_WORD[row.status]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-relaxed text-ink">
                      {row.criterion}
                      <Cite page={row.page_no} />
                    </p>
                    {row.note ? (
                      <p className="mt-1 text-sm leading-relaxed text-stone-500">{row.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {risks.length > 0 ? (
            <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]">
              <h2 className="text-sm font-bold text-ink">
                Defects in the tender document
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Raise these as pre-bid queries before the window closes.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {risks.map((flag) => (
                  <li
                    key={flag.ord}
                    className={`rounded-xl border px-4 py-3.5 ${SEVERITY_STYLE[flag.severity]}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {flag.title}
                        <Cite page={flag.page_no} />
                      </p>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{flag.detail}</p>
                    {flag.recommendation ? (
                      <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-600">
                        <CheckCircle width={14} height={14} className="mt-0.5 shrink-0" />
                        {flag.recommendation}
                      </p>
                    ) : null}
                    {flag.deadline_at ? (
                      <p className="mt-2 font-mono text-[11px] text-stone-500">
                        By {when(flag.deadline_at)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]">
            <h2 className="text-sm font-bold text-ink">Key facts</h2>
            <dl className="mt-2">
              <Fact label="Issuing Authority" value={rfp.issuing_authority} page={page("issuing_authority")} />
              <Fact label="Selection Method" value={rfp.selection_method} page={page("selection_method")} />
              <Fact label="Tender Fee" value={rfp.tender_fee} page={page("tender_fee")} />
              <Fact label="EMD" value={rfp.emd} page={page("emd")} />
              <Fact label="Bid Due Date" value={day(rfp.bid_due_at)} page={page("bid_due")} />
              <Fact label="Bid Validity" value={rfp.bid_validity} page={page("bid_validity")} />
              <Fact label="Contract Term" value={rfp.contract_term} page={page("contract_term")} />
              <Fact label="PBG" value={rfp.pbg} page={page("pbg")} />
              <Fact
                label="Est. Value"
                value={
                  rfp.est_value
                    ? rfp.est_value + (rfp.est_value_is_inferred ? " (estimated, not published)" : "")
                    : null
                }
                page={page("est_value")}
              />
            </dl>
          </div>
        </aside>
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
