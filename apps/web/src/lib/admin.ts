import { notFound } from 'next/navigation';
import { requireUser, type SessionUser } from './session';

function operatorEmails(): string[] {
  return (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Require an operator. Locked down by default: if `OPERATOR_EMAILS` is unset,
 * nobody is an operator (404, not 403, so the admin area isn't even disclosed).
 */
export async function requireOperator(): Promise<SessionUser> {
  const user = await requireUser('/admin');
  if (!operatorEmails().includes(user.email.toLowerCase())) notFound();
  return user;
}
