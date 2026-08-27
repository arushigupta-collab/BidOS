import { useCallback, useEffect, useState } from "react";
import {
  fetchAllResponses, fetchBidSections, fetchDetail, fetchWorkPackages, saveBidSection,
  ROLE_NAMES, type RfpDetail, type ResponseRecord, type RoleId, type WorkPackage,
} from "../lib/rfps";
import { downloadDocx, type CompiledSection } from "../lib/exportDocx";
import { useElapsed } from "../lib/useElapsed";
import { Sparkle, Download, ChevronLeft, CheckCircle } from "../lib/icons";

/**
 * Assembling what goes back.
 *
 * Two kinds of content sit here. What the specialists wrote arrives already
 * written and is editable but not regenerable -- it is theirs, and quietly
 * rewriting somebody's section from the bid manager's chair would make the
 * assignment meaningless. The four sections below are the bid manager's own and
 * can be generated, because nobody else was asked for them.
 */

const AUTHORED = [
  { id: "cover-letter", title: "Cover Letter" },
  { id: "executive-summary", title: "Executive Summary" },
  { id: "company-profile", title: "Company Profile" },
  { id: "table-of-contents", title: "Table of Contents" },
] as const;

const BIDDER = "Meridian Infratech Limited";

interface Authored {
  title: string;
  paragraphs: { text: string; ai: boolean }[];
}

export function CompilerScreen({ rfpId, onBack }: { rfpId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<RfpDetail | null>(null);
  const [packages, setPackages] = useState<WorkPackage[]>([]);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [authored, setAuthored] = useState<Record<string, Authored>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(busy !== null);

  const load = useCallback(async () => {
    const [d, p, r, saved] = await Promise.all([
      fetchDetail(rfpId), fetchWorkPackages(rfpId), fetchAllResponses(rfpId), fetchBidSections(rfpId),
    ]);
    setDetail(d);
    setPackages(p);
    setResponses(r);
    setAuthored(
      Object.fromEntries(saved.map((s) => [s.section_id, { title: s.title, paragraphs: s.body }])),
    );
  }, [rfpId]);

  useEffect(() => { void load(); }, [load]);

  async function generate(sectionId: string, ord: number) {
    setBusy(sectionId);
    setError(null);
    try {
      const res = await fetch("/api/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfpId, sectionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not write that section");
      const paragraphs = (json.paragraphs as string[]).map((text) => ({ text, ai: true }));
      setAuthored((prev) => ({ ...prev, [sectionId]: { title: json.title as string, paragraphs } }));
      await saveBidSection(rfpId, sectionId, json.title as string, paragraphs, ord);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function roleFor(workPackageId: string): RoleId | undefined {
    return packages.find((p) => p.id === workPackageId)?.role_id;
  }

  async function download() {
    if (!detail) return;
    const sections: CompiledSection[] = [
      ...AUTHORED.filter((a) => authored[a.id]).map((a) => ({
        title: authored[a.id].title || a.title,
        paragraphs: authored[a.id].paragraphs.map((p) => p.text),
        asList: a.id === "table-of-contents",
      })),
      ...responses.map((r) => {
        const role = roleFor(r.work_package_id);
        return {
          title: role ? `${r.title} (${ROLE_NAMES[role]})` : r.title,
          paragraphs: r.body.map((p) => p.text),
        };
      }),
    ];

    await downloadDocx(
      {
        tenderTitle: detail.rfp.title,
        tenderRef: detail.rfp.tender_ref,
        issuingAuthority: detail.rfp.issuing_authority,
        bidder: BIDDER,
        sections,
      },
      `Bid response — ${detail.rfp.tender_ref ?? "tender"}.docx`.replace(/[/\\]/g, "-"),
    );
  }

  const ready = AUTHORED.filter((a) => authored[a.id]).length;

  if (!detail) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading the response…</p>;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">The response</h1>
            <p className="mt-1 text-sm text-stone-500">
              {responses.length} contributed {responses.length === 1 ? "section" : "sections"} and{" "}
              {ready} of {AUTHORED.length} of your own.
            </p>
          </div>
          <button
            onClick={download}
            disabled={ready === 0 && responses.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-40"
          >
            <Download width={16} height={16} />
            Download the document
          </button>
        </div>

        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}

        <h2 className="mt-7 text-sm font-bold text-ink">Yours to write</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {AUTHORED.map((section, index) => {
            const written = authored[section.id];
            return (
              <li key={section.id} className="rounded-xl border border-stone-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle
                      width={15} height={15}
                      className={written ? "text-emerald-600" : "text-stone-300"}
                    />
                    <p className="text-sm font-semibold text-ink">{section.title}</p>
                  </div>
                  <button
                    onClick={() => generate(section.id, index)}
                    disabled={busy === section.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                  >
                    <Sparkle width={13} height={13} className="text-navy" />
                    {busy === section.id
                      ? `Writing… ${elapsed ?? 0}s`
                      : written
                        ? "Write again"
                        : "Write with AI"}
                  </button>
                </div>

                {written ? (
                  <div className="border-t border-stone-100 bg-cream-soft/50 px-4 py-3">
                    {written.paragraphs.map((p, i) => (
                      <textarea
                        key={i}
                        value={p.text}
                        rows={Math.max(2, Math.ceil(p.text.length / 100))}
                        onChange={(e) => {
                          const next = written.paragraphs.map((q, j) =>
                            j === i ? { text: e.target.value, ai: false } : q);
                          setAuthored((prev) => ({ ...prev, [section.id]: { ...written, paragraphs: next } }));
                        }}
                        onBlur={() =>
                          void saveBidSection(rfpId, section.id, written.title, written.paragraphs, index)}
                        /*
                         * Looks like a field, because it is one. A transparent
                         * border and background made a generated section
                         * indistinguishable from static text, so nobody could tell
                         * it could be changed.
                         */
                        className="mb-2 w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink transition hover:border-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 text-sm font-bold text-ink">From the team</h2>
        <p className="mt-1 text-sm text-stone-500">
          Written by the person each was assigned to. Shown as they submitted it: change
          it by asking them, not by rewriting it here.
        </p>
        {responses.length === 0 ? (
          <p className="mt-3 rounded-xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
            Nothing has come back yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {responses.map((r) => {
              const role = roleFor(r.work_package_id);
              return (
                <li key={r.id} className="rounded-xl border border-stone-200 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{r.title}</p>
                    {role ? (
                      <span className="rounded-full bg-navy-soft px-2.5 py-0.5 text-[11px] font-semibold text-navy">
                        {ROLE_NAMES[role]}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {r.body.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-stone-700">{p.text}</p>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-7 border-t border-stone-100 pt-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
          >
            <ChevronLeft width={16} height={16} />
            Your forms
          </button>
        </div>
      </div>
    </div>
  );
}
