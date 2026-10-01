'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { formatUsd } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

/** "50m²" from a pack subtitle such as "Up to 50m² coverage" (or the Arabic "50 م²"). */
function coverageOf(subtitle: string): string | null {
  return subtitle.match(/\d+\s*(?:m²|m2|م²)/)?.[0] ?? null;
}

/** Add-to-cart bar that slides in once the main button has scrolled out of view. */
export function StickyBar() {
  const t = useTranslations('purchase');
  const locale = useLocale() as 'en' | 'ar';
  const { product, bundle, select, addToCart, mainButton } = useSelectedBundle();
  const [show, setShow] = useState(false);

  // A scroll check (not IntersectionObserver): anchor jumps can move the button from
  // below the viewport to above it without it ever intersecting, which IO never reports.
  useEffect(() => {
    const el = mainButton;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const visible = el.getBoundingClientRect().bottom < 0;
      setShow(visible);
      // Lets other fixed elements (the free-delivery button) sit above the bar.
      document.body.dataset.stickyAtc = visible ? 'on' : 'off';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      delete document.body.dataset.stickyAtc;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [mainButton]);

  return (
    <div
      data-testid="sticky-atc"
      aria-hidden={!show}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(1,39,85,0.5)] backdrop-blur transition duration-300',
        show ? 'visible translate-y-0' : 'invisible translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        {bundle.imageUrl && (
          <span className="relative hidden size-11 shrink-0 overflow-hidden rounded-xl border border-line bg-white sm:block">
            <Image src={bundle.imageUrl} alt="" fill sizes="44px" className="object-contain p-1" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <label htmlFor="sticky-pack" className="sr-only">
            {t('packLabel')}
          </label>
          <select
            id="sticky-pack"
            data-testid="sticky-pack"
            value={bundle.id}
            onChange={(e) => select(e.target.value)}
            tabIndex={show ? 0 : -1}
            className="block w-full max-w-72 truncate rounded-lg border border-line bg-white py-1 ps-2 pe-6 text-[13px] font-bold text-navy sm:pe-7 sm:text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
          >
            {product.bundles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name[locale]} · {coverageOf(b.subtitle[locale]) ?? formatUsd(b.priceCents)}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-sm">
            <span className="font-extrabold text-navy">{formatUsd(bundle.priceCents)}</span>
            {bundle.compareAtCents !== null && (
              <s className="ms-2 text-muted-ink">{formatUsd(bundle.compareAtCents)}</s>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={addToCart}
          disabled={!product.inStock}
          tabIndex={show ? 0 : -1}
          className="h-11 shrink-0 rounded-full bg-navy px-4 text-[13px] font-extrabold tracking-wide text-white sm:px-5 sm:text-sm transition hover:bg-navy-700 disabled:bg-slate-300"
        >
          {product.inStock ? t('addToCart') : t('soldOut')}
        </button>
      </div>
    </div>
  );
}
