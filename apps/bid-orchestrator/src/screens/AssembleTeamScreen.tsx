import { useEffect, useMemo, useState } from "react";
import {
  assign, fetchCandidates, fetchWorkPackages, logEvent,
  ROLE_NAMES, ROLE_ORDER, type Candidate, type RoleId, type WorkPackage,
} from "../lib/rfps";
import type { SignedIn } from "../lib/session";
import { Avatar } from "../components/ui";
import { Check, ArrowRight, ChevronLeft, FileText } from "../lib/icons";

/**
 * Distributing the work, one role at a time.
 *
 * The packages are NOT created here. Bid Hawk derived them from the tender when
 * it read it: each role's action items cite the clause they came from, and each
 * form is an annexure the document actually lists. What happens on this screen is
 * only the decision about who does them.
 *
 * Step one is the bid manager's own package and carries no choice. It is shown
 * rather than skipped because a manager distributing six packages should see
 * their own share first -- assigning work you are not also doing is a different
 * job, and this product is not modelling that one.
 */

function Package({ pkg }: { pkg: WorkPackage }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Action items
        </h3>
        <ol className="mt-2 flex flex-col gap-2.5">
          {pkg.actionItems.map((item) => (
            <li key={item.id} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-ink">{item.text}</p>
                {item.ref ? (
                  <p className="mt-0.5 font-mono text-[11px] text-stone-400">
                    {item.ref}
                    {item.page_no ? ` · p${item.page_no}` : ""}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Forms to complete
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {pkg.forms.map((form) => (
            <li
              key={form.id}
              className="flex items-start gap-2.5 rounded-lg border border-stone-200 px-3 py-2.5"
            >
              <FileText width={14} height={14} className="mt-0.5 shrink-0 text-stone-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{form.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-stone-400">{form.annexure}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AssembleTeamScreen({
  rfpId,
  user,
  onDone,
}: {
  rfpId: string;
  user: SignedIn;
  onDone: () => void;
}) {
  const [packages, setPackages] = useState<WorkPackage[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchWorkPackages(rfpId), fetchCandidates()])
      .then(([p, c]) => {
        if (!live) return;
        setPackages(p);
        setCandidates(c);
      })
      .catch((caught: Error) => live && setError(caught.message));
    return () => {
      live = false;
    };
  }, [rfpId]);

  const current = packages?.[step];
  const role: RoleId | undefined = current?.role_id;

  /** Who can take this role, least loaded first. */
  const eligible = useMemo(
    () => (role ? candidates.filter((c) => c.capabilities.includes(role)) : []),
    [candidates, role],
  );

  const assigned = (packages ?? []).filter(
    (p) => p.role_id !== "bid-manager" && p.assignee_id,
  ).length;

  async function choose(candidateId: string) {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      await assign(current.id, candidateId);
      await logEvent({
        rfpId,
        roleId: current.role_id,
        kind: "assigned",
        actorName: user.fullName,
        subject: ROLE_NAMES[current.role_id],
        note: `To ${candidates.find((c) => c.id === candidateId)?.full_name ?? "a specialist"}.`,
      });
      setPackages((prev) =>
        (prev ?? []).map((p) =>
          p.id === current.id ? { ...p, assignee_id: candidateId, status: "assigned" } : p,
        ),
      );
      if (step < (packages?.length ?? 0) - 1) setStep(step + 1);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !packages) {
    return <p role="alert" className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-red-800">{error}</p>;
  }
  if (!packages || !current || !role) {
    return <p className="mx-auto w-full min-w-0 max-w-[1180px] px-5 py-10 text-sm text-stone-500">Loading the work…</p>;
  }

  const isOwn = role === "bid-manager";
  const chosen = candidates.find((c) => c.id === current.assignee_id);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] px-5 pb-5 pt-2">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {ROLE_ORDER.map((r, i) => {
            const pkg = packages.find((p) => p.role_id === r);
            const done = r === "bid-manager" || Boolean(pkg?.assignee_id);
            return (
              <button
                key={r}
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                  i === step ? "bg-stone-100 font-semibold text-ink" : "text-stone-500 hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-stone-700 text-white"
                      : i === step
                        ? "border-2 border-navy text-navy"
                        : "border-2 border-stone-300 text-stone-400"
                  }`}
                >
                  {done ? <Check width={13} height={13} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{ROLE_NAMES[r].split(":")[0]}</span>
              </button>
            );
          })}
        </div>

        <header className="mb-5 border-b border-stone-100 pb-5">
          <h1 className="text-xl font-extrabold tracking-tight text-ink">{ROLE_NAMES[role]}</h1>
          {current.brief ? (
            <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-stone-500">
              {current.brief}
            </p>
          ) : null}
          {current.source_sections.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.source_sections.map((section) => (
                <span
                  key={section}
                  className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600"
                >
                  {section}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <Package pkg={current} />

        <div className="mt-6 border-t border-stone-100 pt-5">
          {isOwn ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={user.initials} classes="bg-navy-soft text-navy" size="sm" />
                <div>
                  <p className="text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="text-[11px] text-stone-400">Yours. Assigned when the tender was routed.</p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
              >
                Assign the rest
                <ArrowRight width={16} height={16} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                {chosen ? "Assigned to" : "Assign to"}
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {eligible.map((c) => {
                  const isChosen = c.id === current.assignee_id;
                  return (
                    <li key={c.id}>
                      <button
                        disabled={saving}
                        onClick={() => choose(c.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                          isChosen
                            ? "border-navy bg-navy-soft"
                            : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <Avatar initials={c.initials} classes="bg-stone-100 text-stone-600" size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">{c.full_name}</p>
                          <p className="text-[11px] text-stone-400">{c.title}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-stone-400">
                          {c.active_bids} active
                        </span>
                        {isChosen ? <Check width={16} height={16} className="shrink-0 text-navy" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

              <div className="mt-5 flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 transition hover:text-ink"
                >
                  <ChevronLeft width={16} height={16} />
                  Back
                </button>
                {assigned === ROLE_ORDER.length - 1 ? (
                  <button
                    onClick={onDone}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
                  >
                    Team assembled
                    <ArrowRight width={16} height={16} />
                  </button>
                ) : (
                  <p className="text-sm text-stone-400">
                    {assigned} of {ROLE_ORDER.length - 1} assigned
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
