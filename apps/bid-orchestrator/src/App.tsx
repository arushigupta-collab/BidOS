import { useEffect, useState } from "react";
import { currentUser, signOut, type SignedIn } from "./lib/session";
import { hasDatabase } from "./lib/supabase";
import { TopBar } from "./components/TopBar";
import { Avatar } from "./components/ui";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { RfpDetailScreen } from "./screens/RfpDetailScreen";
import { AssembleTeamScreen } from "./screens/AssembleTeamScreen";
import { TeamOverviewScreen } from "./screens/TeamOverviewScreen";
import { MyFormsScreen } from "./screens/MyFormsScreen";
import { CompilerScreen } from "./screens/CompilerScreen";
import { UnitHeadScreen } from "./screens/UnitHeadScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { ChangeLogScreen } from "./screens/ChangeLogScreen";
import type { WorkPackage } from "./lib/rfps";

/**
 * Bid Orchestrator.
 *
 * Picks up where Bid Hawk stops: a tender has been read, judged and routed to a
 * named bid manager, and everything from here is about getting it answered.
 *
 * The screen sequence is a bid manager's day in order -- what is mine, what does
 * this one demand, who is doing which part -- so it is held as a small machine
 * rather than a router. Deep links are not wanted here: arriving mid-assembly
 * without having seen the tender is not a state the work has.
 */
type Screen =
  | "dashboard" | "detail" | "unit-head" | "assemble" | "team"
  | "review" | "log" | "forms" | "compile";

export default function App() {
  const [user, setUser] = useState<SignedIn | null>(currentUser);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [rfpId, setRfpId] = useState<string | null>(null);
  /*
   * The package under review is held, not re-fetched by id. Review reads what
   * the board already loaded, so opening one cannot show a different state from
   * the row that was clicked.
   */
  const [reviewing, setReviewing] = useState<WorkPackage | null>(null);
  /*
   * The log is reachable from two places, so it remembers which. Sending someone
   * back to the board when they opened it from the tender page loses their place.
   */
  const [backTo, setBackTo] = useState<Screen>("team");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-[46rem] px-6 py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Bid Orchestrator</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          This build has no workspace connection configured, so there are no tenders to
          show. Set the workspace address and key, then reload.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar />
        <LoginScreen onSignedIn={setUser} />
      </div>
    );
  }

  function leave() {
    signOut();
    setUser(null);
    setScreen("dashboard");
    setRfpId(null);
    setReviewing(null);
  }

  const BACK: Partial<Record<Screen, { to: Screen; label: string }>> = {
    detail: { to: "dashboard", label: "Assigned tenders" },
    "unit-head": { to: "detail", label: "Tender" },
    assemble: { to: "detail", label: "Tender" },
    team: { to: "detail", label: "Tender" },
    review: { to: "team", label: "The bid team" },
    log: { to: backTo, label: backTo === "detail" ? "Tender" : "The bid team" },
    forms: { to: "team", label: "The bid team" },
    compile: { to: "forms", label: "Your forms" },
  };
  const step = BACK[screen];
  const back = step
    ? { onBack: () => setScreen(step.to), backLabel: step.label }
    : {};

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        {...back}
        right={
          <>
            <div className="flex items-center gap-2.5 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3">
              <Avatar initials={user.initials} classes="bg-navy-soft text-navy" size="sm" />
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold text-ink">{user.fullName}</div>
                <div className="max-w-[170px] truncate text-[10px] text-stone-400">
                  {user.industry ?? user.title}
                </div>
              </div>
            </div>
            <button
              onClick={leave}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Sign out
            </button>
          </>
        }
      />

      {screen === "dashboard" && (
        <DashboardScreen
          user={user}
          onOpen={(id) => {
            setRfpId(id);
            setScreen("detail");
          }}
        />
      )}

      {screen === "detail" && rfpId && (
        <RfpDetailScreen
          rfpId={rfpId}
          onBuildTeam={() => setScreen("assemble")}
          onOpenTeam={() => setScreen("team")}
          onSendToUnitHead={() => setScreen("unit-head")}
          onLog={() => {
            setBackTo("detail");
            setScreen("log");
          }}
        />
      )}

      {screen === "unit-head" && rfpId && (
        <UnitHeadScreen
          rfpId={rfpId}
          onBack={() => setScreen("detail")}
          onDecided={() => {
            setScreen("detail");
            setToast("Decision recorded.");
          }}
        />
      )}

      {screen === "assemble" && rfpId && (
        <AssembleTeamScreen
          rfpId={rfpId}
          user={user}
          onDone={() => {
            setScreen("team");
            setToast("Team assembled. Each role has been notified.");
          }}
        />
      )}

      {screen === "team" && rfpId && (
        <TeamOverviewScreen
          rfpId={rfpId}
          onCompile={() => setScreen("forms")}
          onReview={(pkg) => {
            setReviewing(pkg);
            setScreen("review");
          }}
          onLog={() => {
            setBackTo("team");
            setScreen("log");
          }}
        />
      )}

      {screen === "review" && rfpId && reviewing && (
        <ReviewScreen
          pkg={reviewing}
          rfpId={rfpId}
          user={user}
          onBack={() => setScreen("team")}
          onDecided={(message) => {
            setScreen("team");
            setToast(message);
          }}
        />
      )}

      {screen === "log" && rfpId && (
        <ChangeLogScreen rfpId={rfpId} onBack={() => setScreen(backTo)} />
      )}

      {screen === "forms" && rfpId && (
        <MyFormsScreen
          rfpId={rfpId}
          onBack={() => setScreen("team")}
          onCompile={() => setScreen("compile")}
        />
      )}

      {screen === "compile" && rfpId && (
        <CompilerScreen rfpId={rfpId} onBack={() => setScreen("forms")} />
      )}

      {toast ? (
        <div className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
