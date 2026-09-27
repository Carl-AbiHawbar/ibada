'use client';

import { useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

/** Checkbox switch that flips immediately and reverts if the server refuses. */
export function AsyncSwitch({
  checked,
  label,
  ariaLabel,
  disabled,
  onChange,
  className,
}: {
  checked: boolean;
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  onChange: (next: boolean) => Promise<boolean>;
  className?: string;
}) {
  const [value, setValue] = useState(checked);
  const [pending, start] = useTransition();

  // Follow the server value after a refresh.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setValue(checked), [checked]);

  return (
    <label className={cn('flex items-center gap-2 text-sm font-medium text-slate-600', className)}>
      <input
        type="checkbox"
        role="switch"
        aria-label={ariaLabel ?? label}
        className="size-4 accent-navy"
        checked={value}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          start(async () => {
            if (!(await onChange(next))) setValue(!next);
          });
        }}
      />
      {label}
    </label>
  );
}
