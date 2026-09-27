'use client';

import { AdminInput } from '@/components/admin/ui';

/** 6-digit authenticator code field; calls onComplete when all digits are typed. */
export function CodeInput({
  value,
  onChange,
  onComplete,
  id = 'code',
  backup = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  id?: string;
  backup?: boolean;
}) {
  return (
    <AdminInput
      id={id}
      inputMode={backup ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoFocus
      maxLength={backup ? 32 : 6}
      className="h-14 text-center text-2xl font-bold tracking-[0.4em]"
      value={value}
      onChange={(e) => {
        const v = backup ? e.target.value.trim() : e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(v);
        if (!backup && v.length === 6) onComplete?.(v);
      }}
    />
  );
}
