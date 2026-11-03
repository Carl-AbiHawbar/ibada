'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, FileText, Inbox, Search, Tag, User } from 'lucide-react';
import { searchAction } from '@/app/admin/(dashboard)/actions';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatUsd } from '@/lib/money';
import type { StaffRole } from '@/lib/permissions';
import { formatLebanesePhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { AdminSearchResult } from '@/server/admin/search';
import { navItemsFor } from './nav-items';
import { StatusBadge } from './orders/status-badge';

type Hit = { key: string; href: string; group: string; icon: typeof Search; title: string; meta?: ReactNode };

function hitsFrom(r: AdminSearchResult): Hit[] {
  return [
    ...r.orders.map((o) => ({
      key: `o${o.id}`,
      href: `/admin/orders/${o.id}`,
      group: 'Orders',
      icon: Inbox,
      title: `#${o.number} · ${o.name}`,
      meta: (
        <span className="flex items-center gap-2">
          <StatusBadge status={o.status} /> {formatUsd(o.totalCents)}
        </span>
      ),
    })),
    ...r.customers.map((c) => ({
      key: `c${c.id}`,
      href: `/admin/customers/${c.id}`,
      group: 'Customers',
      icon: User,
      title: c.name,
      meta: `${formatLebanesePhone(c.phone)} · ${c.orderCount} order${c.orderCount === 1 ? '' : 's'}`,
    })),
    ...r.products.map((p) => ({
      key: `p${p.id}`,
      href: `/admin/products/${p.id}`,
      group: 'Products',
      icon: Tag,
      title: p.nameEn,
      meta: p.status === 'active' ? 'Active' : 'Draft',
    })),
    ...r.pages.map((p) => ({ key: `n${p.href}`, href: p.href, group: 'Pages', icon: FileText, title: p.label })),
  ];
}

/** Ctrl/Cmd+K search over orders, customers, products and admin pages. */
export function CommandPalette({ role, open, onOpenChange }: { role: StaffRole; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [result, setResult] = useState<AdminSearchResult | null>(null);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const latest = useRef(0);

  // Before typing, offer the admin pages as shortcuts.
  const shortcuts = useMemo<Hit[]>(
    () =>
      navItemsFor(role).map((i) => ({ key: `n${i.href}`, href: i.href, group: 'Go to', icon: i.icon, title: i.label })),
    [role],
  );
  const hits = q.trim() ? (result ? hitsFrom(result) : []) : shortcuts;

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ticket = ++latest.current;
    const t = setTimeout(
      () =>
        start(async () => {
          const r = await searchAction(term);
          if (ticket === latest.current) {
            setResult(r);
            setActive(0);
          }
        }),
      180,
    );
    return () => clearTimeout(t);
  }, [q]);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setQ('');
      setResult(null);
      setActive(0);
    }
  };

  const go = (h: Hit | undefined) => {
    if (!h) return;
    close(false);
    router.push(h.href);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden bg-white p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search the admin</DialogTitle>
        <div className="flex items-center gap-2 border-b border-[#e3e3e3] px-3">
          <Search className="size-4 text-[#8a8a8a]" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="admin-search-results"
            aria-label="Search orders, customers, products and pages"
            placeholder="Search orders, customers, products…"
            className="h-12 flex-1 bg-transparent text-[15px] text-[#303030] outline-none placeholder:text-[#8a8a8a]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          {pending && <span className="size-3 animate-spin rounded-full border-2 border-[#8a8a8a] border-t-transparent" aria-hidden />}
        </div>
        <ul id="admin-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {hits.map((h, i) => {
            const header = hits[i - 1]?.group !== h.group ? h.group : null;
            return (
              <li key={h.key} role="presentation">
                {header && <p className="px-2 pb-1 pt-2 text-xs font-semibold text-[#616161]">{header}</p>}
                <Link
                  href={h.href}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => close(false)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] text-[#303030]',
                    i === active && 'bg-[#f1f1f1]',
                  )}
                >
                  <h.icon className="size-4 shrink-0 text-[#616161]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{h.title}</span>
                  {h.meta && <span className="shrink-0 text-xs text-[#616161]">{h.meta}</span>}
                  {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-[#8a8a8a]" aria-hidden />}
                </Link>
              </li>
            );
          })}
          {q.trim() && result && hits.length === 0 && (
            <li className="px-2 py-8 text-center text-[13px] text-[#616161]">No results for “{q.trim()}”</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
