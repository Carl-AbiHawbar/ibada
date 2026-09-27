import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Check, PhoneCall } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClearCart } from '@/components/shop/checkout/clear-cart';
import { Link } from '@/i18n/navigation';
import { formatUsd } from '@/lib/money';
import { getDb } from '@/server/db/client';
import { readOrderCookie } from '@/server/next/order-cookie';
import { getOrderForConfirmation } from '@/server/orders/manage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[locale]/order/[number]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'thankYou' });
  return { title: t('items'), robots: { index: false, follow: false } };
}

export default async function OrderConfirmationPage({ params }: PageProps<'/[locale]/order/[number]'>) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ar' ? 'ar' : 'en';

  // Only the browser that placed the order may see it; everyone else is sent to tracking.
  const orderId = await readOrderCookie();
  const order = orderId ? await getOrderForConfirmation(getDb(), orderId) : null;
  if (!order || String(order.number) !== number) redirect(`/${locale}/track`);

  const t = await getTranslations({ locale, namespace: 'thankYou' });
  const firstName = order.name.split(/\s+/)[0] ?? order.name;

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <ClearCart />
      <div className="flex flex-col items-center text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-blue/10">
          <span className="flex size-14 items-center justify-center rounded-full bg-blue text-white shadow-lg">
            <Check className="size-8" strokeWidth={3} aria-hidden />
          </span>
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl" dir="auto">
          {t('title', { name: firstName })}
        </h1>
        <p className="mt-3 rounded-full bg-ice px-4 py-1.5 font-bold text-navy" dir="ltr">
          #{order.number}
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl bg-ice px-6 py-5">
          <PhoneCall className="size-6 text-blue" aria-hidden />
          <p className="text-lg font-semibold text-navy">{t('confirmCall')}</p>
        </div>
        <p className="mt-4 text-muted-ink">{t('payOnDelivery', { total: formatUsd(order.totalCents) })}</p>
      </div>

      <div className="mt-10 rounded-3xl border border-line bg-white p-6">
        <h2 className="font-extrabold text-navy">{t('items')}</h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between py-3 text-sm">
              <span className="font-semibold text-navy">{i.bundleName[lang]}</span>
              <span className="text-muted-ink">×{i.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-4">
          <span className="font-bold text-navy">{t('total')}</span>
          <span className="text-xl font-extrabold text-navy">{formatUsd(order.totalCents)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/track" className="inline-flex h-12 items-center justify-center rounded-full border-2 border-navy px-6 font-bold text-navy hover:bg-navy hover:text-white">
          {t('track')}
        </Link>
        <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full bg-navy px-6 font-bold text-white hover:bg-navy-700">
          {t('continue')}
        </Link>
      </div>
    </section>
  );
}
