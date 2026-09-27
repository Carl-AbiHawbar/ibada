import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatUsd } from '@/lib/money';
import { listActiveProductsCached } from '@/server/next/storefront-data';

export async function generateMetadata({ params }: PageProps<'/[locale]/shop'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: t('shopTitle'),
    description: t('shopDescription'),
    alternates: { canonical: `/${locale}/shop`, languages: { en: '/en/shop', ar: '/ar/shop' } },
  };
}

export default async function ShopPage({ params }: PageProps<'/[locale]/shop'>) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'shop' });
  const products = await listActiveProductsCached();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-navy">{t('title')}</h1>
      <p className="mt-2 text-lg text-muted-ink">{t('subtitle')}</p>
      {products.length === 0 ? (
        <p className="mt-12 text-muted-ink">{t('empty')}</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const cheapest = Math.min(...p.bundles.map((b) => b.priceCents));
            const image = p.images[0];
            return (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-line bg-white transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(1,39,85,0.45)]"
                >
                  <span className="relative block aspect-square bg-white">
                    {image && (
                      <Image src={image.url} alt={image.alt[locale]} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-8" />
                    )}
                    {!p.inStock && (
                      <span className="absolute start-4 top-4 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white">
                        {t('soldOut')}
                      </span>
                    )}
                  </span>
                  <span className="block border-t border-line p-6">
                    <span className="block text-xl font-extrabold text-navy">{p.name[locale]}</span>
                    <span className="mt-1 block text-sm text-muted-ink">{p.tagline[locale]}</span>
                    <span className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-navy">{t('from', { price: formatUsd(cheapest) })}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
                        {t('view')} <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
