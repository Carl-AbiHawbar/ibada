'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from './cart-provider';

export function CartButton() {
  const t = useTranslations('cart');
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      data-testid="cart-button"
      onClick={() => setOpen(true)}
      aria-label={t('button', { count })}
      className="relative flex size-10 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy-700"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span
          data-testid="cart-count"
          className="absolute -end-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-blue px-1 text-[11px] font-bold text-white ring-2 ring-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
