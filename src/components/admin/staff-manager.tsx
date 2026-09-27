'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  inviteAction,
  revokeInviteAction,
  setActiveAction,
  setRoleAction,
  signOutEverywhereAction,
} from '@/app/admin/(dashboard)/staff/actions';
import { AsyncSwitch } from '@/components/admin/async-switch';
import { CopyButton } from '@/components/admin/copy-button';
import { AdminButton, AdminCard, AdminField, AdminInput, AdminSelect } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

type StaffRow = { id: string; name: string; email: string; role: 'owner' | 'staff'; active: boolean; twoFactorEnabled: boolean };
type Invite = { id: string; email: string; role: 'owner' | 'staff'; expiresAt: string };

export function StaffManager({ me, staff, invites }: { me: string; staff: StaffRow[]; invites: Invite[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('staff');
  const [link, setLink] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r && !r.ok) toast.error(r.error ?? 'Could not update.');
      else toast.success(success);
      router.refresh();
    });

  const invite = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await inviteAction(email, role);
      if (!r.ok) return void toast.error(r.error);
      setLink(r.link);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <AdminCard
        title="Team"
        actions={
          !inviting && (
            <AdminButton size="sm" onClick={() => { setInviting(true); setLink(null); setEmail(''); }}>
              <UserPlus /> Invite
            </AdminButton>
          )
        }
      >
        {inviting && (
          <div className="mb-5 rounded-2xl border border-blue/30 bg-ice/40 p-4">
            {link ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-navy">Invite link for {email}</p>
                <p data-testid="invite-link" className="break-all rounded-lg bg-white p-2 font-mono text-xs text-navy">
                  {link}
                </p>
                <div className="flex items-center gap-2">
                  <CopyButton text={link} label="Copy link" />
                  <span className="text-xs text-slate-500">Send this link privately. It works once and expires in 72 hours.</span>
                </div>
                <AdminButton size="sm" variant="ghost" onClick={() => setInviting(false)}>
                  Done
                </AdminButton>
              </div>
            ) : (
              <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
                <AdminField id="invite-email" label="Email" className="min-w-56 flex-1">
                  <AdminInput id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </AdminField>
                <AdminField id="invite-role" label="Role">
                  <AdminSelect id="invite-role" value={role} onChange={(e) => setRole(e.target.value as 'owner' | 'staff')}>
                    <option value="staff">Staff (orders, products, customers)</option>
                    <option value="owner">Owner (everything)</option>
                  </AdminSelect>
                </AdminField>
                <AdminButton type="submit" disabled={pending}>
                  Create invite link
                </AdminButton>
                <AdminButton type="button" variant="ghost" onClick={() => setInviting(false)}>
                  Cancel
                </AdminButton>
              </form>
            )}
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {staff.map((s) => (
            <li key={s.id} data-testid="staff-row" className={cn('flex flex-wrap items-center gap-3 py-3', !s.active && 'opacity-60')}>
              <div className="min-w-48 flex-1">
                <p className="font-semibold text-navy">
                  {s.name} {s.id === me && <span className="text-xs font-normal text-slate-500">(you)</span>}
                </p>
                <p className="text-sm text-slate-500">{s.email}</p>
              </div>
              <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', s.twoFactorEnabled ? 'text-green-700' : 'text-amber-700')}>
                {s.twoFactorEnabled ? <ShieldCheck className="size-4" /> : <ShieldOff className="size-4" />}
                {s.twoFactorEnabled ? '2-step on' : '2-step pending'}
              </span>
              <AdminSelect
                aria-label={`Role of ${s.name}`}
                className="h-9 w-28 text-sm"
                value={s.role}
                disabled={pending}
                onChange={(e) => run(() => setRoleAction(s.id, e.target.value as 'owner' | 'staff'), 'Role updated')}
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </AdminSelect>
              <AsyncSwitch
                checked={s.active}
                label="Active"
                disabled={s.id === me}
                onChange={async (next) => {
                  const r = await setActiveAction(s.id, next);
                  if (!r.ok) toast.error(r.error ?? 'Could not update.');
                  else toast.success('Access updated');
                  router.refresh();
                  return r.ok;
                }}
              />
              <AdminButton size="sm" variant="ghost" disabled={pending} onClick={() => run(() => signOutEverywhereAction(s.id), 'Signed out everywhere')}>
                Sign out everywhere
              </AdminButton>
            </li>
          ))}
        </ul>
      </AdminCard>

      {invites.length > 0 && (
        <AdminCard title="Pending invites">
          <ul className="divide-y divide-slate-100">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="flex-1 font-medium text-navy">{i.email}</span>
                <span className="capitalize text-slate-500">{i.role}</span>
                <span className="text-xs text-slate-500">expires {new Date(i.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Beirut' })}</span>
                <AdminButton size="sm" variant="ghost" className="text-red-600" onClick={() => run(() => revokeInviteAction(i.id), 'Invite revoked')}>
                  Revoke
                </AdminButton>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}
    </div>
  );
}
