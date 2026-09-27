import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

const ITEMS = ['safe', 'coverage', 'results', 'payment', 'delivery', 'guarantee', 'power'] as const;

export async function Faq({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'faq' });
  return (
    <section className="bg-ice py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t('title')}</h2>
        <div className="mt-10 space-y-3">
          {ITEMS.map((k) => (
            <details key={k} className="group rounded-2xl border border-line bg-white px-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-start font-bold text-navy [&::-webkit-details-marker]:hidden">
                {t(`items.${k}.q`)}
                <Plus className="size-5 shrink-0 text-blue transition group-open:rotate-45" aria-hidden />
              </summary>
              <p className="pb-5 leading-relaxed text-ink/80">{t(`items.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
