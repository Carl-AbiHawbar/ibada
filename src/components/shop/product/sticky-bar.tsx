'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { formatUsd } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

/** Add-to-cart bar that slides in once the main button has scrolled out of view. */
export function StickyBar() {
  const t = useTranslations('purchase');
  const locale = useLocale() as 'en' | 'ar';
  const { product, bundle, addToCart, mainButton } = useSelectedBundle();
  const [show, setShow] = useState(false);

  // A scroll check (not IntersectionObserver): anchor jumps can move the button from
  // below the viewport to above it without it ever intersecting, which IO never reports.
  useEffect(() => {
    const el = mainButton;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setShow(el.getBoundingClientRect().bottom < 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
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
          <p className="truncate text-sm font-bold text-navy">{bundle.name[locale]}</p>
          <p className="text-sm">
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
          className="h-11 shrink-0 rounded-full bg-navy px-5 text-sm font-extrabold tracking-wide text-white transition hover:bg-navy-700 disabled:bg-slate-300"
        >
          {product.inStock ? t('addToCart') : t('soldOut')}
        </button>
      </div>
    </div>
  );
}
