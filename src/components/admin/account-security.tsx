'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Laptop, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { AdminButton, AdminCard, AdminField, AdminInput } from '@/components/admin/ui';
import { authClient } from '@/lib/auth-client';

export function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 10) return toast.error('New password must be at least 10 characters.');
    if (next !== confirm) return toast.error('New passwords do not match.');
    setBusy(true);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (error) return toast.error('Current password is not correct.');
    setCurrent('');
    setNext('');
    setConfirm('');
    toast.success('Password changed. Other devices were signed out.');
  };

  return (
    <AdminCard title="Change password">
      <form onSubmit={submit} className="grid gap-4 sm:max-w-md">
        <AdminField id="current" label="Current password">
          <AdminInput id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </AdminField>
        <AdminField id="new" label="New password" hint="At least 10 characters.">
          <AdminInput id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </AdminField>
        <AdminField id="confirm" label="Repeat new password">
          <AdminInput id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </AdminField>
        <AdminButton type="submit" disabled={busy} className="justify-self-start">
          Update password
        </AdminButton>
      </form>
    </AdminCard>
  );
}

export function BackupCodesCard() {
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    setBusy(false);
    if (error || !data) return toast.error('Password is not correct.');
    setCodes(data.backupCodes);
    setPassword('');
  };

  return (
    <AdminCard title="Backup codes">
      <p className="mb-4 text-sm text-slate-600">Lost your phone? Each backup code signs you in once. Making new codes cancels the old ones.</p>
      {codes ? (
        <ul className="grid max-w-md grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3 font-mono text-sm text-navy">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        <form onSubmit={submit} className="flex max-w-md flex-wrap items-end gap-3">
          <AdminField id="bc-password" label="Password" className="min-w-52 flex-1">
            <AdminInput id="bc-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </AdminField>
          <AdminButton type="submit" variant="secondary" disabled={busy}>
            New backup codes
          </AdminButton>
        </form>
      )}
    </AdminCard>
  );
}

type SessionRow = { id: string; token: string; userAgent?: string | null; createdAt: Date | string; ipAddress?: string | null };

export function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, me] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
    setSessions((list.data as SessionRow[] | null) ?? []);
    setCurrent(me.data?.session.token ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const revokeOthers = async () => {
    const { error } = await authClient.revokeOtherSessions();
    if (error) return toast.error('Could not sign out other devices.');
    toast.success('Signed out of all other devices.');
    void load();
  };

  return (
    <AdminCard title="Active sessions" actions={<AdminButton size="sm" variant="secondary" onClick={revokeOthers}>Sign out other devices</AdminButton>}>
      {!sessions ? (
        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => {
            const mobile = /iPhone|Android|Mobile/.test(s.userAgent ?? '');
            const Icon = mobile ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
                <Icon className="size-5 text-slate-400" aria-hidden />
                <span className="flex-1 text-navy">
                  {mobile ? 'Phone' : 'Computer'} · since {new Date(s.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Beirut' })}
                </span>
                {s.token === current && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">This device</span>}
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}
