import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { POLICIES, POLICY_SLUGS, type PolicySlug } from '@/content/policies';
import { getEnv } from '@/env';

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

const isSlug = (s: string): s is PolicySlug => (POLICY_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: PageProps<'/[locale]/policies/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSlug(slug)) return {};
  return {
    title: POLICIES[slug][locale === 'ar' ? 'ar' : 'en'].title,
    alternates: { canonical: `/${locale}/policies/${slug}`, languages: { en: `/en/policies/${slug}`, ar: `/ar/policies/${slug}` } },
  };
}

export default async function PolicyPage({ params }: PageProps<'/[locale]/policies/[slug]'>) {
  const { locale, slug } = await params;
  if (!isSlug(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'policies' });
  const policy = POLICIES[slug][locale === 'ar' ? 'ar' : 'en'];

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      {getEnv().APP_ENV !== 'production' && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{t('draft')}</p>
      )}
      <h1 className="text-4xl font-extrabold tracking-tight text-navy">{policy.title}</h1>
      <p className="mt-2 text-sm text-muted-ink">{t('updated', { date: policy.updated })}</p>
      <div className="mt-10 space-y-8">
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-bold text-navy">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink/80">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
