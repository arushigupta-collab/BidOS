import { useEffect, useState } from "react";
import { currentUser, signOut, ROLE_NAMES, type SignedIn } from "./lib/session";
import { hasDatabase } from "./lib/supabase";
import { TopBar } from "./components/TopBar";
import { Avatar } from "./components/ui";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { WorkScreen } from "./screens/WorkScreen";

/**
 * Bid Author.
 *
 * The last leg. A tender was read by Bid Hawk, routed to a bid manager, split
 * into six packages and distributed; this is where the five specialists answer
 * the part that came to them, and where it goes back.
 */
type Screen = "dashboard" | "work";

export default function App() {
  const [user, setUser] = useState<SignedIn | null>(currentUser);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [workPackageId, setWorkPackageId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-[46rem] px-6 py-20">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Bid Author</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          This build has no workspace connection configured, so there is no work to show.
          Set the workspace address and key, then reload.
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
    setWorkPackageId(null);
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        {...(screen === "work"
          ? { onBack: () => setScreen("dashboard"), backLabel: "Your work" }
          : {})}
        right={
          <>
            <div className="flex items-center gap-2.5 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3">
              <Avatar initials={user.initials} classes="bg-navy-soft text-navy" size="sm" />
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold text-ink">{user.fullName}</div>
                <div className="max-w-[170px] truncate text-[10px] text-stone-400">
                  {ROLE_NAMES[user.roleId]}
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
            setWorkPackageId(id);
            setScreen("work");
          }}
        />
      )}

      {screen === "work" && workPackageId && (
        <WorkScreen
          workPackageId={workPackageId}
          user={user}
          onBack={() => setScreen("dashboard")}
          onSubmitted={() => {
            setScreen("dashboard");
            setToast("Submitted. The bid manager has it.");
          }}
        />
      )}

      {toast ? (
        <div className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
