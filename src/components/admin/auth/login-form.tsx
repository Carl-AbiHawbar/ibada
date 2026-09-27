'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminButton, AdminField, AdminInput } from '@/components/admin/ui';
import { authClient } from '@/lib/auth-client';

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setBusy(false);
      setError(err.status === 429 ? 'Too many attempts. Try again in 15 minutes.' : 'Wrong email or password.');
      return;
    }
    // Accounts with 2FA are sent to /admin/two-factor by the client plugin.
    if (!(data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) router.replace('/admin');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {notice && <p className="rounded-xl bg-blue/10 p-3 text-sm text-navy">{notice}</p>}
      <AdminField id="email" label="Email">
        <AdminInput id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </AdminField>
      <AdminField id="password" label="Password">
        <AdminInput
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </AdminField>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <AdminButton type="submit" disabled={busy} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </AdminButton>
    </form>
  );
}
