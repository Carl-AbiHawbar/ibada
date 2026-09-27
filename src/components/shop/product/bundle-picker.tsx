'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { formatUsd } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

export function BundlePicker() {
  const t = useTranslations('bundles');
  const locale = useLocale() as 'en' | 'ar';
  const { product, bundle: selected, select } = useSelectedBundle();

  return (
    <fieldset className="mt-8">
      <legend className="mb-3 text-sm font-bold uppercase tracking-widest text-navy/70">{t('title')}</legend>
      <div className="space-y-3">
        {product.bundles.map((b) => {
          const checked = b.id === selected.id;
          return (
            <label
              key={b.id}
              data-testid="bundle-option"
              className={cn(
                'relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white p-3 pe-4 transition',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/30',
                checked
                  ? 'border-navy bg-ice shadow-[0_10px_30px_-18px_rgba(1,39,85,0.6)]'
                  : 'border-line hover:border-navy/40',
                b.badge !== 'none' && 'mt-5',
              )}
            >
              {b.badge !== 'none' && (
                <span
                  className={cn(
                    'absolute -top-3 start-4 rounded-full px-3 py-0.5 text-[11px] font-extrabold tracking-wider text-white shadow-sm',
                    b.badge === 'most_popular' ? 'bg-blue' : 'bg-navy',
                  )}
                >
                  {b.badge === 'most_popular' ? t('mostPopular') : t('bestValue')}
                </span>
              )}
              <input
                type="radio"
                name="bundle"
                value={b.id}
                checked={checked}
                onChange={() => select(b.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                  checked ? 'border-navy' : 'border-slate-300',
                )}
              >
                <span className={cn('size-2.5 rounded-full bg-navy transition', checked ? 'scale-100' : 'scale-0')} />
              </span>
              {b.imageUrl && (
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                  <Image src={b.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight text-navy">{b.name[locale]}</span>
                <span className="block text-sm text-muted-ink">{b.subtitle[locale]}</span>
                <span className="mt-0.5 block text-xs font-semibold text-blue">
                  {t('perUnit', { price: formatUsd(b.perUnitCents) })}
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="block text-lg font-extrabold leading-tight text-navy">{formatUsd(b.priceCents)}</span>
                {b.compareAtCents !== null && (
                  <span className="block text-sm text-muted-ink line-through">{formatUsd(b.compareAtCents)}</span>
                )}
                {b.savePercent !== null && (
                  <span className="mt-0.5 inline-block rounded-md bg-blue/10 px-1.5 py-0.5 text-[11px] font-bold text-blue">
                    {t('save', { percent: b.savePercent })}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
