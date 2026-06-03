import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

/** The current user, or null. Safe to call in any server component. */
export async function getUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

/** The current user, redirecting to login if unauthenticated. */
export async function requireUser(nextPath = '/dashboard'): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}
