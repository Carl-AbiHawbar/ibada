import { can, type Area, type StaffRole } from '@/lib/permissions';

export type AuthzUser = { id: string; role: StaffRole; active: boolean; twoFactorEnabled: boolean } | null;
export type AuthzDecision = 'ok' | 'login' | 'setup-2fa' | 'forbidden';

/** Pure access decision for an admin area; checked on every admin page and action. */
export function authorize(u: AuthzUser, area: Area): AuthzDecision {
  if (!u || !u.active) return 'login';
  if (!u.twoFactorEnabled) return 'setup-2fa';
  return can(u.role, area) ? 'ok' : 'forbidden';
}
