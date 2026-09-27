import { setRequestLocale } from 'next-intl/server';

// Replaced by the product landing page in Task 11.
export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <div className="mx-auto max-w-6xl px-4 py-16" />;
}
