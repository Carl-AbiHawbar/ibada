import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckoutForm } from '@/components/shop/checkout/checkout-form';
import { getEnv } from '@/env';

// Dynamic so the strict per-request CSP nonce applies to this page.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[locale]/checkout'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<'/[locale]/checkout'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t('title')}</h1>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-navy/70">
          <ShieldCheck className="size-4 text-blue" aria-hidden /> {t('secure')}
        </p>
      </div>
      <CheckoutForm siteKey={getEnv().TURNSTILE_SITE_KEY} />
    </section>
  );
}
