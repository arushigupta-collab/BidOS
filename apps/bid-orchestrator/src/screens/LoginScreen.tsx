import { useEffect, useState } from "react";
import { fetchAccounts, signIn, SignInError, type Account, type SignedIn } from "../lib/session";
import { Target, FileText, Route } from "../lib/icons";

/**
 * Signing in as a bid manager.
 *
 * Credentials are checked against the workspace's own records rather than an
 * identity provider. The sign-in is here so the bid can be walked from one
 * person's desk to another's, which is the whole shape of this module: work
 * arrives at a named owner and leaves as named assignments.
 */

const FEATURES = [
  {
    icon: Target,
    title: "Tenders routed to you",
    body: "Bid Hawk assigns each RFP by domain and region. Yours arrive here with a deadline and a value.",
  },
  {
    icon: FileText,
    title: "The work, already split",
    body: "Action items and forms are drawn from the tender itself and grouped by the role that owns them.",
  },
  {
    icon: Route,
    title: "Assign, then assemble",
    body: "Send each package to a specialist, track what comes back, and compile the response.",
  },
];

const field =
  "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";
const label =
  "mt-3 block text-[11px] font-semibold uppercase tracking-wide text-stone-400";

export function LoginScreen({ onSignedIn }: { onSignedIn: (user: SignedIn) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  /**
   * Choosing a manager fills both fields.
   *
   * Not just the address: a sign-in that fills half of itself and then asks for
   * the other half has made a reader stop and look something up in the middle of
   * the thing they were doing.
   */
  function choose(next: string) {
    const account = accounts.find((a) => a.email === next);
    setEmail(next);
    if (account) {
      setPasscode(account.passcode);
      setError(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await signIn(email, passcode));
    } catch (caught) {
      setError(
        caught instanceof SignInError
          ? caught.message
          : "Could not reach the workspace. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-16 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div className="flex flex-col justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          BidOS
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
          Bid Orchestrator
        </h1>
        <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-stone-500">
          Runs the bid from the moment a tender is assigned to you: distribute the
          work, track every submission, and assemble the document that goes back.
        </p>

        <ul className="mt-8 flex flex-col gap-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-soft text-navy">
                <Icon width={16} height={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-0.5 max-w-[52ch] text-sm text-stone-500">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={submit}
        className="self-center rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]"
      >
        <h2 className="text-lg font-bold text-ink">Sign in</h2>
        <p className="mt-1 text-sm text-stone-500">
          Use your workspace address.
        </p>

        {accounts.length > 0 ? (
          <>
            <label className={label} htmlFor="account">
              Bid manager
            </label>
            <select
              id="account"
              value={accounts.some((a) => a.email === email) ? email : ""}
              onChange={(e) => choose(e.target.value)}
              className={field}
            >
              <option value="">Choose an account…</option>
              {accounts.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.fullName}
                  {a.industry ? ` — ${a.industry}` : ""}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <label className={label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
          placeholder="name@meridianinfratech.in"
        />

        <label className={label} htmlFor="passcode">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          required
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className={field}
        />

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
