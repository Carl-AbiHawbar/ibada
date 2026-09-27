import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Area, StaffRole } from '@/lib/permissions';
import { getAuth } from '../auth/auth';
import { authorize } from '../auth/authorize';

export type AdminUser = { id: string; email: string; name: string; role: StaffRole };

async function currentSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/**
 * Gate for every admin page and Server Action: signed in, active, TOTP enabled and
 * allowed into `area`. Redirects otherwise (never trusts hidden buttons alone).
 */
export async function requireAdmin(area: Area): Promise<{ user: AdminUser }> {
  const s = await currentSession();
  const u = s
    ? {
        id: s.user.id,
        role: s.user.role as StaffRole,
        active: s.user.active !== false,
        twoFactorEnabled: s.user.twoFactorEnabled === true,
      }
    : null;
  const decision = authorize(u, area);
  if (decision === 'login') redirect('/admin/login');
  if (decision === 'setup-2fa') redirect('/admin/setup-2fa');
  if (decision === 'forbidden') redirect('/admin/forbidden');
  return { user: { id: s!.user.id, email: s!.user.email, name: s!.user.name, role: u!.role } };
}

/** Signed in and active, 2FA not required (the 2FA enrollment page itself). */
export async function requireSignedIn(): Promise<{ user: AdminUser & { twoFactorEnabled: boolean } }> {
  const s = await currentSession();
  if (!s || s.user.active === false) redirect('/admin/login');
  return {
    user: {
      id: s.user.id,
      email: s.user.email,
      name: s.user.name,
      role: s.user.role as StaffRole,
      twoFactorEnabled: s.user.twoFactorEnabled === true,
    },
  };
}
