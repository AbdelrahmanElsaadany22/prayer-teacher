import type { User } from './types/auth.types';

/**
 * The landing page for a signed-in user. An admin has no personal dashboard,
 * so sending everyone to /dashboard would bounce them straight back out — this
 * keeps that decision in one place instead of at every redirect.
 */
export function homeFor(user?: User | null): string {
  return user?.role === 'admin' ? '/admin/users' : '/dashboard';
}
