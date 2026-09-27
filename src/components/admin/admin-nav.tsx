'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { SignOutButton } from '@/components/admin/auth/sign-out-button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { StaffRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { isActive, navItemsFor } from './nav-items';

type NavUser = { name: string; email: string; role: StaffRole };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function Sidebar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const items = navItemsFor(user.role);
  const main = items.filter((i) => !['notifications', 'account', 'settings'].includes(i.area));
  const bottom = items.filter((i) => ['notifications', 'settings', 'account'].includes(i.area));
  const link = (i: (typeof items)[number]) => {
    const active = isActive(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition',
          active ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-navy',
        )}
      >
        <i.icon className="size-[18px]" aria-hidden /> {i.label}
      </Link>
    );
  };

  return (
    <aside data-testid="sidebar" className="sticky top-0 hidden h-dvh flex-col border-e border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo className="h-5" />
        <span className="rounded-md bg-ice px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">{main.map(link)}</nav>
      <div className="space-y-1 border-t border-slate-200 px-3 py-3">{bottom.map(link)}</div>
      <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-ice text-sm font-bold text-navy">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy">{user.name}</p>
          <p className="text-xs capitalize text-slate-500">{user.role}</p>
        </div>
        <a href="/en" target="_blank" rel="noopener" aria-label="View store" className="text-slate-400 hover:text-navy">
          <ExternalLink className="size-4" />
        </a>
      </div>
      <div className="px-4 pb-4">
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
      <Link href="/admin" aria-label="Admin home" className="flex items-center gap-2">
        <Logo className="h-4" />
        <span className="rounded-md bg-ice px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">Admin</span>
      </Link>
      <a href="/en" target="_blank" rel="noopener" className="flex items-center gap-1 text-sm font-medium text-slate-500">
        Store <ExternalLink className="size-3.5" />
      </a>
    </header>
  );
}

export function BottomTabs({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navItemsFor(user.role);
  const tabs = items.filter((i) => i.mobile === 'tab');
  const more = items.filter((i) => i.mobile === 'more');
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const tabClass = (active: boolean) =>
    cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', active ? 'text-navy' : 'text-slate-500');

  return (
    <nav
      data-testid="bottom-tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                <i.icon className={cn('size-6', active && 'stroke-[2.4]')} aria-hidden />
                {i.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setOpen(true)} className={cn(tabClass(moreActive), 'w-full')}>
            <MoreHorizontal className="size-6" aria-hidden />
            More
          </button>
        </li>
      </ul>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetTitle className="px-5 pt-5 text-base font-bold text-navy">More</SheetTitle>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {more.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold',
                    isActive(pathname, i.href) ? 'bg-navy text-white' : 'bg-slate-50 text-navy',
                  )}
                >
                  <i.icon className="size-5" aria-hidden /> {i.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 pt-2">
            <SignOutButton />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
