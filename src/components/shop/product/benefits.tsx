import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

const KEYS = ['coverage', 'allDay', 'noChemicals', 'safe', 'plugIn'] as const;

export async function Benefits({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'hero.benefits' });
  return (
    <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
      {KEYS.map((k) => (
        <li key={k} className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          {t(k)}
        </li>
      ))}
    </ul>
  );
}
