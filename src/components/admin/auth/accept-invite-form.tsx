'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { acceptInviteAction } from '@/app/admin/(auth)/invite/[token]/actions';
import { AdminButton, AdminField, AdminInput } from '@/components/admin/ui';

const MESSAGES: Record<string, string> = {
  invalid: 'This invite link is not valid.',
  expired: 'This invite link has expired. Ask the owner for a new one.',
  used: 'This invite link was already used.',
  email_taken: 'An account with this email already exists.',
  weak_password: 'Password must be at least 10 characters.',
  rate_limited: 'Too many attempts. Try again later.',
};

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 10) return setError(MESSAGES.weak_password!);
    start(async () => {
      const r = await acceptInviteAction({ token, name, password });
      if (r) setError(MESSAGES[r.error] ?? MESSAGES.invalid!);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-slate-100 p-3 text-sm text-navy">{email}</p>
      <AdminField id="name" label="Your name">
        <AdminInput id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </AdminField>
      <AdminField id="password" label="Password" hint="At least 10 characters.">
        <AdminInput id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </AdminField>
      <AdminField id="confirm" label="Repeat password">
        <AdminInput id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </AdminField>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      <AdminButton type="submit" disabled={pending} className="w-full">
        Create account
      </AdminButton>
    </form>
  );
}
