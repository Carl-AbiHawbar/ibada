import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

// Two columns: what it covers, then what it is like to live with.
const COLUMNS = [
  ['coverage', 'allDay'],
  ['noChemicals', 'safe', 'plugIn'],
] as const;

export async function Benefits({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'hero.benefits' });
  return (
    <div data-testid="benefits" className="mt-6 grid gap-2.5 sm:grid-cols-2 sm:gap-x-6">
      {COLUMNS.map((keys, col) => (
        <ul key={col} className="space-y-2.5">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              {t(k)}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
