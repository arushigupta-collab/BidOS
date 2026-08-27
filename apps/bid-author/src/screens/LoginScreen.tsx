import { useEffect, useState } from "react";
import { fetchSpecialists, signIn, SignInError, ROLE_NAMES, type Account, type SignedIn } from "../lib/session";
import { Target, FileText, Route } from "../lib/icons";

/**
 * Signing in as one of the specialists a bid is distributed to.
 *
 * The picker is a convenience over the address field, not a substitute for it:
 * choosing a name fills the email, and the passcode is still required. It is
 * there because the six roles are the point of this module and a reader arriving
 * cold should be able to see them.
 */

const FEATURES = [
  { icon: Target, title: "Only your part", body: "The action items and annexures the bid manager assigned to you, drawn from the tender itself." },
  { icon: FileText, title: "Draft with the tender open", body: "Generate your section from what the RFP actually asks for, then edit it." },
  { icon: Route, title: "Hand it back", body: "Submit, and it appears on the bid manager's board straight away." },
];

const field =
  "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-stone-300 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";
const labelClass =
  "mt-3 block text-[11px] font-semibold uppercase tracking-wide text-stone-400";

export function LoginScreen({ onSignedIn }: { onSignedIn: (u: SignedIn) => void }) {
  const [people, setPeople] = useState<Account[]>([]);
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecialists().then(setPeople).catch(() => setPeople([]));
  }, []);

  /** Choosing a role fills both fields, not just the address. */
  function choose(next: string) {
    const account = people.find((p) => p.email === next);
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
      setError(caught instanceof SignInError ? caught.message : "Could not reach the workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1080px] gap-10 px-6 py-16 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div className="flex flex-col justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">BidOS</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Bid Author</h1>
        <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-stone-500">
          Where each part of a bid gets written. Your action items come from the tender,
          your annexures come with it, and what you submit goes straight back to the bid
          manager.
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

      <form onSubmit={submit} className="self-center rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(30,27,22,0.04),0_12px_32px_-8px_rgba(30,27,22,0.10)]">
        <h2 className="text-lg font-bold text-ink">Sign in</h2>
        <p className="mt-1 text-sm text-stone-500">Choose your role, or type your address.</p>

        <label className={labelClass} htmlFor="role">Role</label>
        <select
          id="role"
          value={people.some((p) => p.email === email) ? email : ""}
          onChange={(e) => choose(e.target.value)}
          className={field}
        >
          <option value="">Choose a role…</option>
          {people.map((p) => (
            <option key={p.email} value={p.email}>
              {ROLE_NAMES[p.role_id]} — {p.full_name}
            </option>
          ))}
        </select>

        <label className={labelClass} htmlFor="email">Email</label>
        <input
          id="email" type="email" required autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={field} placeholder="name@meridianinfratech.in"
        />

        <label className={labelClass} htmlFor="passcode">Passcode</label>
        <input
          id="passcode" type="password" required autoComplete="current-password"
          value={passcode} onChange={(e) => setPasscode(e.target.value)}
          className={field}
        />

        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit" disabled={busy}
          className="mt-5 w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
