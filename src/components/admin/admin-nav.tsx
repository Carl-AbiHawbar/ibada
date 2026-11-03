'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CircleUser, ExternalLink, LogOut, MoreHorizontal, Search } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { SignOutButton } from '@/components/admin/auth/sign-out-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { authClient } from '@/lib/auth-client';
import type { StaffRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { CommandPalette } from './command-palette';
import { isActive, navItemsFor, type NavItem } from './nav-items';

type NavUser = { name: string; email: string; role: StaffRole };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

async function signOut() {
  await authClient.signOut();
  // Full reload clears any cached admin data from memory.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/admin/login');
}

/** Dark top bar with search (Ctrl/Cmd+K), store link, notifications and the user menu. */
export function TopBar({ user }: { user: NavUser }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-[#1a1a1a] px-3 text-white lg:px-4">
      <Link href="/admin" aria-label="Admin home" className="flex shrink-0 items-center gap-2 lg:w-[216px]">
        <Logo tone="light" className="h-4" />
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
      </Link>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
        className="ms-auto flex h-9 items-center gap-2 rounded-lg bg-[#303030] px-3 text-[13px] text-[#b5b5b5] ring-1 ring-white/10 hover:bg-[#3a3a3a] sm:mx-auto sm:w-full sm:max-w-md"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden flex-1 text-start sm:block">Search</span>
        <kbd className="hidden rounded bg-white/10 px-1.5 text-[11px] font-medium sm:block">Ctrl K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <a href="/en" target="_blank" rel="noopener" aria-label="View store" title="View store" className="flex size-9 items-center justify-center rounded-lg text-[#e3e3e3] hover:bg-white/10">
          <ExternalLink className="size-4" />
        </a>
        <Link href="/admin/notifications" aria-label="Notifications" title="Notifications" className="hidden size-9 items-center justify-center rounded-lg text-[#e3e3e3] hover:bg-white/10 lg:flex">
          <Bell className="size-4" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="hidden h-9 items-center gap-2 rounded-lg px-1.5 text-[13px] font-medium hover:bg-white/10 lg:flex"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#0693E6] text-xs font-bold">{initials(user.name)}</span>
            <span className="max-w-32 truncate">{user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate text-[13px] font-semibold text-[#303030]">{user.name}</span>
              <span className="block truncate text-xs font-normal text-[#616161]">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin/account" />}>
              <CircleUser /> Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette role={user.role} open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function SidebarLink({ item, pathname, count, child }: { item: NavItem; pathname: string; count?: number; child?: boolean }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-[#303030] transition',
        child && 'ps-8 font-medium text-[#4a4a4a]',
        active ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]' : 'hover:bg-black/5',
        active && child && 'font-semibold text-[#303030]',
      )}
    >
      {!child && <item.icon className={cn('size-4 shrink-0', active ? 'text-[#303030]' : 'text-[#4a4a4a]')} aria-hidden />}
      <span className="flex-1 truncate">{item.label}</span>
      {count ? <span className="rounded-md bg-[#e3e3e3] px-1.5 text-[11px] font-semibold tabular-nums text-[#303030]">{count}</span> : null}
    </Link>
  );
}

export function Sidebar({ user, newOrders }: { user: NavUser; newOrders: number }) {
  const pathname = usePathname();
  const items = navItemsFor(user.role);
  const children = (href: string) => items.filter((i) => i.parent === href);
  const group = (g: NavItem['group']) =>
    items
      .filter((i) => i.group === g && !i.parent)
      .map((i) => (
        <li key={i.href}>
          <SidebarLink item={i} pathname={pathname} count={i.area === 'orders' ? newOrders : undefined} />
          {children(i.href).length > 0 && (
            <ul className="mt-0.5 space-y-0.5">
              {children(i.href).map((c) => (
                <li key={c.href}>
                  <SidebarLink item={c} pathname={pathname} child />
                </li>
              ))}
            </ul>
          )}
        </li>
      ));
  const team = group('team');

  return (
    <aside data-testid="sidebar" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] flex-col bg-[#ebebeb] lg:flex">
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">{group('main')}</ul>
        {team.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-5 text-xs font-semibold text-[#616161]">Team</p>
            <ul className="space-y-0.5">{team}</ul>
          </>
        )}
      </nav>
      <ul className="space-y-0.5 px-3 pb-3">{group('bottom')}</ul>
    </aside>
  );
}

export function BottomTabs({ user, newOrders }: { user: NavUser; newOrders: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navItemsFor(user.role);
  const tabs = items.filter((i) => i.mobile === 'tab');
  const more = items.filter((i) => i.mobile === 'more');
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const tabClass = (active: boolean) =>
    cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', active ? 'text-[#1a1a1a]' : 'text-[#8a8a8a]');

  return (
    <nav
      data-testid="bottom-tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e3e3e3] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                <i.icon className={cn('size-6', active && 'stroke-[2.4]')} aria-hidden />
                {i.label}
                {i.area === 'orders' && newOrders > 0 && (
                  <span className="absolute end-[22%] top-1 min-w-4 rounded-full bg-[#c70a24] px-1 text-[10px] leading-4 text-white">{newOrders}</span>
                )}
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
          <SheetTitle className="px-5 pt-5 text-base font-bold text-[#303030]">More</SheetTitle>
          <ul className="grid grid-cols-3 gap-2 px-4">
            {more.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold',
                    isActive(pathname, i.href) ? 'bg-[#1a1a1a] text-white' : 'bg-[#f1f1f1] text-[#303030]',
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

