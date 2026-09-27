'use client';

import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        // Full reload clears any cached admin data from memory.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/admin/login');
      }}
      className={cn('inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy', className)}
    >
      <LogOut className="size-4" aria-hidden /> Log out
    </button>
  );
}
