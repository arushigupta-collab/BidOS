/**
 * Who is signed in.
 *
 * Credentials are checked against the seeded `users` table rather than through an
 * auth provider: the roles in this product are fixed and known, and the sign-in
 * exists so the demo can be walked from one person's desk to another's, not to
 * secure anything. It is deliberately not presented as more than that.
 *
 * The session is held in sessionStorage rather than localStorage so two windows
 * can be signed in as different people at once -- which is exactly how the
 * hand-off between a bid manager and a specialist gets shown.
 */
import { supabase } from './supabase'

export interface SignedIn {
  id: string
  email: string
  fullName: string
  initials: string
  title: string | null
  roleId: string
  industry: string | null
}

const KEY = 'bidos.session'

export function currentUser(): SignedIn | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SignedIn
  } catch {
    return null
  }
}

export function signOut(): void {
  sessionStorage.removeItem(KEY)
}

export class SignInError extends Error {}

/**
 * Signs a bid manager in.
 *
 * Restricted to `bid-manager` here rather than filtered in the interface: a
 * Solution Architect's credentials are valid, but they belong in Bid Author, and
 * signing them into a screen built around assigning work would show them a view
 * of the bid that is not theirs.
 */
export async function signIn(email: string, passcode: string): Promise<SignedIn> {
  const { data, error } = await supabase()
    .from('users')
    .select('id, email, passcode, full_name, initials, title, role_id, industry')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (error) throw new SignInError('Could not reach the workspace. Try again.')
  if (!data || data.passcode !== passcode) {
    throw new SignInError('That email and passcode do not match an account.')
  }
  if (data.role_id !== 'bid-manager') {
    throw new SignInError(
      `${data.full_name} is a ${String(data.title ?? data.role_id)}. Bid Orchestrator is for bid managers; specialists work in Bid Author.`,
    )
  }

  const user: SignedIn = {
    id: data.id as string,
    email: data.email as string,
    fullName: data.full_name as string,
    initials: data.initials as string,
    title: (data.title as string) ?? null,
    roleId: data.role_id as string,
    industry: (data.industry as string) ?? null,
  }
  sessionStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export interface Account {
  email: string
  passcode: string
  fullName: string
  title: string | null
  industry: string | null
}

/**
 * The bid managers who can sign in here, for the picker on the sign-in screen.
 *
 * Their passcodes come back with them, because choosing an account fills both
 * fields. That is a deliberate property of a workspace whose roles are fixed and
 * known: the sign-in exists so the bid can be walked from one person's desk to
 * another's, and making somebody type a passcode they were told to use is
 * ceremony rather than security.
 *
 * It is also honest about what this is. Anyone who can reach the workspace can
 * read this table; presenting the accounts openly says so, rather than implying
 * a protection that is not there.
 */
export async function fetchAccounts(): Promise<Account[]> {
  const { data } = await supabase()
    .from('users')
    .select('email, passcode, full_name, title, industry')
    .eq('role_id', 'bid-manager')
    .order('full_name')

  return (data ?? []).map((u) => ({
    email: u.email as string,
    passcode: u.passcode as string,
    fullName: u.full_name as string,
    title: (u.title as string) ?? null,
    industry: (u.industry as string) ?? null,
  }))
}
