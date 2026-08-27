/**
 * Who is signed in.
 *
 * The mirror of Bid Orchestrator's sign-in, and deliberately the same table: one
 * person, one record, whichever module they open. A Solution Architect signs in
 * here with the credentials that are refused there, and vice versa.
 *
 * sessionStorage rather than localStorage, so a bid manager and a specialist can
 * be signed in side by side in two windows. That hand-off is the thing this
 * module exists to complete.
 */
import { supabase } from "./supabase";

export type RoleId =
  | "bid-manager" | "solution-architect" | "legal-1" | "legal-2" | "finance" | "delivery";

export const ROLE_NAMES: Record<RoleId, string> = {
  "bid-manager": "Bid Manager",
  "solution-architect": "Solution Architect",
  "legal-1": "Legal Counsel 1: General",
  "legal-2": "Legal Counsel 2: Functional",
  finance: "Finance Owner",
  delivery: "Delivery Lead",
};

export interface SignedIn {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  title: string | null;
  roleId: RoleId;
}

const KEY = "bidos.author.session";

export function currentUser(): SignedIn | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignedIn;
  } catch {
    return null;
  }
}

export function signOut(): void {
  sessionStorage.removeItem(KEY);
}

export class SignInError extends Error {}

/**
 * Signs a specialist in.
 *
 * A bid manager is turned away with the reason, rather than shown an empty
 * dashboard: their work is distributing the bid, not drafting a part of it, and
 * that is a different module.
 */
export async function signIn(email: string, passcode: string): Promise<SignedIn> {
  const { data, error } = await supabase()
    .from("users")
    .select("id, email, passcode, full_name, initials, title, role_id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new SignInError("Could not reach the workspace. Try again.");
  if (!data || data.passcode !== passcode) {
    throw new SignInError("That email and passcode do not match an account.");
  }
  if (data.role_id === "bid-manager") {
    throw new SignInError(
      `${data.full_name} is a bid manager. Bid Author is for the specialists a bid is distributed to; bid managers work in Bid Orchestrator.`,
    );
  }

  const user: SignedIn = {
    id: data.id as string,
    email: data.email as string,
    fullName: data.full_name as string,
    initials: data.initials as string,
    title: (data.title as string) ?? null,
    roleId: data.role_id as RoleId,
  };
  sessionStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export interface Account {
  email: string;
  passcode: string;
  full_name: string;
  title: string | null;
  role_id: RoleId;
}

/**
 * Everyone who can sign in here, for the picker on the sign-in screen.
 *
 * Their passcodes come back with them, because choosing a role fills both
 * fields. The picker used to fill only the address, which left a reader with a
 * form half-completed and a passcode to go and find -- a stop in the middle of
 * the thing they were doing, for no protection: anyone who can reach the
 * workspace can read this table anyway.
 */
export async function fetchSpecialists(): Promise<Account[]> {
  const { data } = await supabase()
    .from("users")
    .select("email, passcode, full_name, title, role_id")
    .neq("role_id", "bid-manager")
    .order("role_id");
  return (data ?? []) as Account[];
}
