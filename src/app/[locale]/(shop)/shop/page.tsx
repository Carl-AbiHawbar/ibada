import { getTranslations, setRequestLocale } from 'next-intl/server';

// Replaced by the product grid in Task 11.
export default async function ShopPage({ params }: PageProps<'/[locale]/shop'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'shop' });
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-extrabold text-navy">{t('title')}</h1>
    </section>
  );
}
