import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(90%_60%_at_50%_0%,var(--color-ice-2)_0%,#f8fafc_70%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Logo className="h-7" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-navy/60">Admin</span>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(1,39,85,0.35)] sm:p-8">
          <h1 className="text-xl font-extrabold text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
