import { Banknote, Leaf, ShieldCheck, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export async function TrustStrip({ locale, freeDelivery }: { locale: Locale; freeDelivery: boolean }) {
  const t = await getTranslations({ locale, namespace: 'trust' });
  const items = [
    { Icon: Banknote, label: t('cod') },
    { Icon: Truck, label: freeDelivery ? t('freeDelivery') : t('delivery') },
    { Icon: ShieldCheck, label: t('guarantee') },
    { Icon: Leaf, label: t('chemicalFree') },
  ];
  return (
    <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-ice px-2 py-3 text-center">
          <Icon className="size-5 text-navy" aria-hidden />
          <span className="text-xs font-semibold leading-tight text-navy">{label}</span>
        </li>
      ))}
    </ul>
  );
}
