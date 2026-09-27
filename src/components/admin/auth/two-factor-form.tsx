'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminButton } from '@/components/admin/ui';
import { authClient } from '@/lib/auth-client';
import { CodeInput } from './code-input';

export function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async (value = code) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: value })
      : await authClient.twoFactor.verifyTotp({ code: value });
    if (err) {
      setBusy(false);
      setCode('');
      setError(err.status === 429 ? 'Too many attempts. Try again in 15 minutes.' : 'That code is not correct.');
      return;
    }
    router.replace('/admin');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void verify();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="code" className="block text-sm font-semibold text-navy">
        {backup ? 'Backup code' : 'Authenticator code'}
      </label>
      <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} backup={backup} />
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <AdminButton type="submit" disabled={busy || code.length < (backup ? 6 : 6)} className="w-full">
        {busy ? 'Checking…' : 'Verify'}
      </AdminButton>
      <button
        type="button"
        className="w-full text-center text-sm font-semibold text-blue hover:underline"
        onClick={() => {
          setBackup((b) => !b);
          setCode('');
          setError(null);
        }}
      >
        {backup ? 'Use the authenticator app instead' : 'Use a backup code'}
      </button>
    </form>
  );
}
