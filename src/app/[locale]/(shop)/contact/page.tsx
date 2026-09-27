import type { Metadata } from 'next';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FacebookIcon, InstagramIcon, TikTokIcon } from '@/components/shop/social-icons';
import { formatLebanesePhone } from '@/lib/phone';
import { getSettingsCached } from '@/server/next/storefront-data';

export async function generateMetadata({ params }: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('title'), alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });
  const s = await getSettingsCached();
  const socials = [
    { href: s.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: s.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: s.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
  ].filter((x): x is typeof x & { href: string } => !!x.href);

  const cards = [
    s.contactPhone && {
      href: `tel:${s.contactPhone}`,
      Icon: Phone,
      label: t('phone'),
      value: formatLebanesePhone(s.contactPhone),
      ltr: true,
    },
    s.contactPhone && {
      href: `https://wa.me/${s.contactPhone.replace(/\D/g, '')}`,
      Icon: MessageCircle,
      label: t('whatsapp'),
      value: formatLebanesePhone(s.contactPhone),
      ltr: true,
    },
    s.contactEmail && { href: `mailto:${s.contactEmail}`, Icon: Mail, label: t('email'), value: s.contactEmail, ltr: true },
  ].filter(Boolean) as { href: string; Icon: typeof Phone; label: string; value: string; ltr: boolean }[];

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-navy">{t('title')}</h1>
      <p className="mt-2 text-lg text-muted-ink">{t('subtitle')}</p>
      {cards.length === 0 && socials.length === 0 ? (
        <p className="mt-10 rounded-3xl bg-ice p-6 text-muted-ink">{t('none')}</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cards.map(({ href, Icon, label, value, ltr }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 transition hover:border-blue/40 hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-ice text-navy">
                <Icon className="size-6" aria-hidden />
              </span>
              <span>
                <span className="block text-sm text-muted-ink">{label}</span>
                <span className="block font-bold text-navy" dir={ltr ? 'ltr' : undefined}>
                  {value}
                </span>
              </span>
            </a>
          ))}
          {socials.length > 0 && (
            <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5">
              <span className="text-sm text-muted-ink">{t('social')}</span>
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-navy hover:text-blue">
                  <Icon className="size-6" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
