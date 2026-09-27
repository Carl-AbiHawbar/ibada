import { Mail, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatLebanesePhone } from '@/lib/phone';
import { getSettingsCached } from '@/server/next/storefront-data';
import { FacebookIcon, InstagramIcon, TikTokIcon } from './social-icons';

export async function ShopFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const s = await getSettingsCached();
  const socials = [
    { href: s.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: s.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: s.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
  ].filter((x): x is typeof x & { href: string } => !!x.href);

  const link = 'text-white/70 transition hover:text-white';
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo tone="light" className="h-6" />
          <p className="max-w-xs text-sm leading-relaxed text-white/70">{t('tagline')}</p>
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">{t('codNote')}</p>
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">{t('shop')}</h2>
          <ul className="space-y-2.5">
            <li><Link href="/shop" className={link}>{t('shop')}</Link></li>
            <li><Link href="/track" className={link}>{t('trackOrder')}</Link></li>
            <li><Link href="/contact" className={link}>{t('contact')}</Link></li>
          </ul>
        </div>

        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">{t('help')}</h2>
          <ul className="space-y-2.5">
            <li><Link href="/policies/shipping" className={link}>{t('shipping')}</Link></li>
            <li><Link href="/policies/returns" className={link}>{t('returns')}</Link></li>
            <li><Link href="/policies/privacy" className={link}>{t('privacy')}</Link></li>
            <li><Link href="/policies/terms" className={link}>{t('terms')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-4">
            {s.contactPhone && (
              <a href={`tel:${s.contactPhone}`} className={`inline-flex items-center gap-1.5 ${link}`} dir="ltr">
                <Phone className="size-4" aria-hidden /> {formatLebanesePhone(s.contactPhone)}
              </a>
            )}
            {s.contactEmail && (
              <a href={`mailto:${s.contactEmail}`} className={`inline-flex items-center gap-1.5 ${link}`}>
                <Mail className="size-4" aria-hidden /> {s.contactEmail}
              </a>
            )}
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={link}>
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
