'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { AdminButton, AdminField, AdminInput } from '@/components/admin/ui';
import { authClient } from '@/lib/auth-client';
import { CodeInput } from './code-input';

type Step = { kind: 'password' } | { kind: 'scan'; qr: string; secret: string; backupCodes: string[] } | { kind: 'codes'; backupCodes: string[] };

export function SetupTwoFactor() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (err || !data || !('totpURI' in data)) {
      setError('Password is not correct.');
      return;
    }
    const secret = new URL(data.totpURI).searchParams.get('secret') ?? '';
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220, color: { dark: '#012755', light: '#ffffff' } });
    setStep({ kind: 'scan', qr, secret, backupCodes: data.backupCodes });
  };

  const verify = async (value = code) => {
    if (step.kind !== 'scan' || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: value });
    setBusy(false);
    if (err) {
      setCode('');
      setError('That code is not correct. Check the time on your phone and try again.');
      return;
    }
    setStep({ kind: 'codes', backupCodes: step.backupCodes });
  };

  if (step.kind === 'password') {
    return (
      <form onSubmit={start} className="space-y-4">
        <p className="text-sm text-slate-600">
          Every admin account must use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Confirm your password to begin.
        </p>
        <AdminField id="password" label="Password">
          <AdminInput id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </AdminField>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <AdminButton type="submit" disabled={busy} className="w-full">
          Continue
        </AdminButton>
      </form>
    );
  }

  if (step.kind === 'scan') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="space-y-4"
      >
        <p className="text-sm text-slate-600">1. Scan this QR code with your authenticator app.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.qr} alt="QR code for your authenticator app" width={220} height={220} className="mx-auto rounded-xl border border-slate-200" />
        <p className="text-xs text-slate-500">Can&apos;t scan? Enter this key manually:</p>
        <code data-testid="totp-secret" className="block break-all rounded-lg bg-slate-100 p-2 text-center font-mono text-sm text-navy">
          {step.secret}
        </code>
        <label htmlFor="code" className="block pt-2 text-sm text-slate-600">
          2. Enter the 6-digit code it shows.
        </label>
        <CodeInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} />
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <AdminButton type="submit" disabled={busy || code.length !== 6} className="w-full">
          Verify and turn on
        </AdminButton>
      </form>
    );
  }

  const text = step.backupCodes.join('\n');
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-semibold text-green-700">
        <Check className="size-5" /> Two-step sign-in is on.
      </p>
      <p className="text-sm text-slate-600">
        Save these backup codes somewhere safe. Each works once if you lose your phone.
      </p>
      <ul data-testid="backup-codes" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-3 font-mono text-sm text-navy">
        {step.backupCodes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <AdminButton
        variant="secondary"
        className="w-full"
        onClick={async () => {
          await navigator.clipboard?.writeText(text).catch(() => {});
          setCopied(true);
        }}
      >
        <Copy /> {copied ? 'Copied' : 'Copy codes'}
      </AdminButton>
      <AdminButton className="w-full" onClick={() => router.replace('/admin')}>
        I saved them
      </AdminButton>
    </div>
  );
}
