import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'block h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue focus:ring-4 focus:ring-blue/15 aria-invalid:border-red-500 aria-invalid:ring-red-500/15';

export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-ink">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props wiring an input to its Field's hint/error text. */
export function describe(id: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
