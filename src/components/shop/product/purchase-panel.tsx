'use client';

import { Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MAX_LINE_QUANTITY } from '@/lib/cart-schema';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

export function QuantityStepper({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const t = useTranslations('purchase');
  const btn = cn(
    'flex items-center justify-center text-navy transition hover:bg-ice disabled:opacity-30',
    size === 'md' ? 'size-12' : 'size-9',
  );
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white" role="group" aria-label={t('quantity')}>
      <button type="button" className={cn(btn, 'rounded-s-full')} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t('decrease')}>
        <Minus className="size-4" />
      </button>
      <span className={cn('min-w-8 text-center font-bold tabular-nums text-navy', size === 'sm' && 'text-sm')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, 'rounded-e-full')}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_LINE_QUANTITY}
        aria-label={t('increase')}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function PurchasePanel({ deliveryTime }: { deliveryTime: string }) {
  const t = useTranslations('purchase');
  const { product, quantity, setQuantity, addToCart, registerMainButton } = useSelectedBundle();

  return (
    <div className="mt-6 space-y-4">
      {deliveryTime && (
        <p className="flex items-center gap-2 text-sm font-medium text-ink/80">
          <Truck className="size-4 text-blue" aria-hidden /> {deliveryTime}
        </p>
      )}
      <div className="flex gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button
          ref={registerMainButton}
          type="button"
          onClick={addToCart}
          disabled={!product.inStock}
          className="h-12 flex-1 rounded-full bg-navy px-6 text-base font-extrabold tracking-wide text-white shadow-[0_12px_30px_-12px_rgba(1,39,85,0.8)] transition hover:bg-navy-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {product.inStock ? t('addToCart') : t('soldOut')}
        </button>
      </div>
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-navy">
        <ShieldCheck className="size-4 text-blue" aria-hidden /> {t('guarantee')}
      </p>
    </div>
  );
}
