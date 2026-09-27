'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getEnv } from '@/env';
import { revokeInvite, revokeSessions, setStaffActive, setStaffRole } from '@/server/admin/staff';
import { audit } from '@/server/audit';
import { createInvite } from '@/server/auth/invites';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { requestIp } from '@/server/next/request';

const MESSAGES = {
  last_owner: 'The shop needs at least one active owner.',
  self: "You can't deactivate your own account.",
  not_found: 'That person no longer exists.',
} as const;

async function log(userId: string, action: string, entityId: string | undefined, summary: string) {
  await audit(getDb(), { userId, action, entity: 'staff', entityId, summary, ip: await requestIp() });
  revalidatePath('/admin/staff');
}

export async function inviteAction(email: string, role: 'owner' | 'staff'): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const { user } = await requireAdmin('staff');
  const parsed = z.object({ email: z.email().max(120), role: z.enum(['owner', 'staff']) }).safeParse({ email, role });
  if (!parsed.success) return { ok: false, error: 'Enter a valid email address.' };
  const { token } = await createInvite(getDb(), { ...parsed.data, invitedBy: user.id });
  await log(user.id, 'staff.invited', undefined, `Invited ${parsed.data.email} as ${parsed.data.role}`);
  return { ok: true, link: `${getEnv().SITE_URL}/admin/invite/${token}` };
}

export async function setRoleAction(userId: string, role: 'owner' | 'staff'): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin('staff');
  if (!['owner', 'staff'].includes(role)) return { ok: false };
  const r = await setStaffRole(getDb(), { actorId: user.id, userId: String(userId), role });
  if (!r.ok) return { ok: false, error: MESSAGES[r.error] };
  await log(user.id, 'staff.role_changed', userId, `Changed role to ${role}`);
  return { ok: true };
}

export async function setActiveAction(userId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin('staff');
  const r = await setStaffActive(getDb(), { actorId: user.id, userId: String(userId), active: Boolean(active) });
  if (!r.ok) return { ok: false, error: MESSAGES[r.error] };
  await log(user.id, active ? 'staff.activated' : 'staff.deactivated', userId, active ? 'Reactivated an account' : 'Deactivated an account');
  return { ok: true };
}

export async function signOutEverywhereAction(userId: string): Promise<void> {
  const { user } = await requireAdmin('staff');
  await revokeSessions(getDb(), String(userId));
  await log(user.id, 'staff.sessions_revoked', userId, 'Signed an account out everywhere');
}

export async function revokeInviteAction(id: string): Promise<void> {
  const { user } = await requireAdmin('staff');
  if (!z.uuid().safeParse(id).success) return;
  await revokeInvite(getDb(), id);
  await log(user.id, 'staff.invite_revoked', id, 'Revoked an invite');
}
