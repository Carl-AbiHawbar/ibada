'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/server/audit';
import { getAuth } from '@/server/auth/auth';
import { acceptInvite, type AcceptInviteResult } from '@/server/auth/invites';
import { getDb } from '@/server/db/client';
import { requestIp } from '@/server/next/request';
import { hitLimit } from '@/server/rate-limit';
import { hashIp } from '@/server/crypto';

const schema = z.object({ token: z.string().min(10).max(200), name: z.string().trim().min(1).max(60), password: z.string().max(128) });

export async function acceptInviteAction(input: unknown): Promise<Extract<AcceptInviteResult, { ok: false }> | { ok: false; error: 'rate_limited' }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const db = getDb();
  const ip = await requestIp();
  if (!(await hitLimit(db, `invite:ip:${hashIp(ip)}`, 10, 900)).allowed) return { ok: false, error: 'rate_limited' };
  const r = await acceptInvite(db, getAuth(), parsed.data);
  if (!r.ok) return r;
  await audit(db, { userId: r.userId, action: 'staff.joined', entity: 'user', entityId: r.userId, summary: `${r.email} accepted an invite`, ip });
  redirect('/admin/login?invited=1');
}
