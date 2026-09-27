import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TrackForm } from '@/components/shop/checkout/track-form';
import { getEnv } from '@/env';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[locale]/track'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'track' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function TrackPage({ params }: PageProps<'/[locale]/track'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'track' });
  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t('title')}</h1>
      <p className="mt-2 mb-8 text-muted-ink">{t('subtitle')}</p>
      <TrackForm siteKey={getEnv().TURNSTILE_SITE_KEY} />
    </section>
  );
}
