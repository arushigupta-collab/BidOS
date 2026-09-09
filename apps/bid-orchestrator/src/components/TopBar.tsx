import type { ReactNode } from "react";
import { ArrowLeft } from "../lib/icons";

/**
 * Back to the platform.
 *
 * Configurable for the same reason the landing's outbound links are: in
 * development the platform is a dev server on this machine, and sending a reader
 * to the hosted build instead drops them out of whatever they were working on.
 * Defaults to the hosted address.
 */
/**
 * Back to the platform.
 *
 * The default is THIS repository's Bid Hawk deployment, which serves the BidOS
 * landing. It used to be emb-bidos.vercel.app -- a different build reading a
 * different workspace -- so Back left the product the user was working in and
 * landed them on somebody else's data, which is not a broken link so much as a
 * silently wrong one.
 *
 * Overridable, because a developer running the platform locally wants the local
 * landing. The default is what a build with no configuration should do.
 */
const PORTAL_URL = import.meta.env.VITE_BIDOS_URL || "https://bid-hawk-livid.vercel.app/";

export interface WorkspaceTab {
  id: string;
  label: string;
  count: number;
}

function EmbBrand() {
  return (
    <img src="/emb-global-logo.png" alt="EMB GLOBAL" className="h-9 w-auto" />
  );
}

function ProductLabel() {
  return (
    <div className="text-right leading-tight">
      <div className="text-[17px] font-extrabold tracking-tight text-ink">
        Bid Orchestrator
      </div>
      <div className="font-mono text-[11px] tracking-tight text-stone-400">
        Sovereign · IN-North
      </div>
    </div>
  );
}

export function TopBar({
  tabs,
  activeTab,
  onTab,
  onBack,
  backLabel,
  right,
}: {
  tabs?: WorkspaceTab[];
  activeTab?: string;
  onTab?: (id: string) => void;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    /*
     * Chrome sits ON the canvas, outside the workspace card, matching Bid Hawk.
     *
     * Not a full-bleed bar clamped to the viewport edge. The card floating clear
     * of every edge with the marks on the desk around it is the structural
     * signature the platform is built on, and a module that loses it stops
     * looking like the same product one click later.
     */
    <header className="flex h-16 shrink-0 items-stretch justify-between gap-4 px-5 pt-4">
      <div className="flex items-stretch gap-5">
        {/* Back to the BidOS portal */}
        <a
          href={PORTAL_URL}
          className="flex items-center gap-1.5 self-center rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-ink"
        >
          <ArrowLeft width={16} height={16} />
          Back
        </a>
        <span className="my-3 w-px bg-stone-200" />
        <a href={PORTAL_URL} className="flex items-center">
          <EmbBrand />
        </a>

        {tabs ? (
          <nav className="flex items-stretch gap-6">
            {tabs.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  onClick={() => onTab?.(t.id)}
                  className={`flex items-center gap-2 border-b-2 text-sm transition ${
                    active
                      ? "border-ink font-semibold text-ink"
                      : "border-transparent font-medium text-stone-500 hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      active
                        ? "bg-stone-200 text-stone-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </nav>
        ) : onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-ink"
          >
            <ArrowLeft width={16} height={16} />
            {backLabel ?? "Back"}
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {right}
        <ProductLabel />
      </div>
    </header>
  );
}
