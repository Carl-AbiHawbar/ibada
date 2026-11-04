import { Banknote, ShieldCheck, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

/** Shown above the gallery while there are no reviews: real promises, never a rating. */
export async function TrustBadge({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'hero.trustBadge' });
  const items = [
    { Icon: Banknote, label: t('cod') },
    { Icon: ShieldCheck, label: t('guarantee') },
    { Icon: Truck, label: t('delivery') },
  ];
  return (
    <ul
      data-testid="trust-badge"
      className="mb-4 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-navy px-4 py-3 shadow-[0_14px_34px_-18px_rgba(1,39,85,0.7)]"
    >
      {items.map(({ Icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-7 items-center justify-center rounded-[6px] bg-blue">
            <Icon className="size-4 text-white" aria-hidden />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
