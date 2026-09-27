import { Rat } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Ant, BedBug, Cockroach, Flea, Fly, Mosquito, Spider, Termite } from './pest-icons';

function Rodent({ className }: { className?: string }) {
  return <Rat className={className} strokeWidth={1.6} aria-hidden />;
}

const PESTS = [
  ['cockroaches', Cockroach],
  ['rodents', Rodent],
  ['bedBugs', BedBug],
  ['spiders', Spider],
  ['mosquitoes', Mosquito],
  ['flies', Fly],
  ['ants', Ant],
  ['fleas', Flea],
  ['termites', Termite],
] as const;

export async function Pests({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pests' });
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-3 text-center text-muted-ink">{t('subtitle')}</p>
        <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 lg:grid-cols-9">
          {PESTS.map(([key, PestIcon]) => (
            <li
              key={key}
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-2 py-4 text-center transition hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-md"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-ice text-navy">
                <PestIcon className="size-8" />
              </span>
              <span className="text-xs font-semibold text-navy sm:text-sm">{t(`items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
