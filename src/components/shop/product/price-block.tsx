'use client';

import { useTranslations } from 'next-intl';
import { formatUsd } from '@/lib/money';
import { useSelectedBundle } from './selection-context';

export function PriceBlock() {
  const t = useTranslations('bundles');
  const tp = useTranslations('purchase');
  const { bundle } = useSelectedBundle();
  return (
    <div data-testid="price-block" className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-4xl font-extrabold tracking-tight text-navy">{formatUsd(bundle.priceCents)}</span>
        {bundle.compareAtCents !== null && (
          <s className="text-xl font-medium text-muted-ink">{formatUsd(bundle.compareAtCents)}</s>
        )}
        {bundle.savePercent !== null && (
          <span className="rounded-full bg-blue px-3 py-1 text-sm font-bold text-white">
            {t('save', { percent: bundle.savePercent })}
          </span>
        )}
      </div>
      {bundle.units > 1 && (
        <p className="mt-1 text-sm text-muted-ink">{tp('or', { price: formatUsd(bundle.perUnitCents) })}</p>
      )}
    </div>
  );
}
