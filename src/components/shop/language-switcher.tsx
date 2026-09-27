'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'en' ? 'ar' : 'en';
  return (
    <Link
      href={pathname}
      locale={other}
      data-testid="lang-switch"
      aria-label={t('switchLanguageLabel')}
      lang={other}
      className={
        className ??
        'inline-flex h-10 items-center rounded-full border border-line px-3.5 text-sm font-semibold text-navy transition hover:border-navy hover:bg-ice'
      }
    >
      {t('switchLanguage')}
    </Link>
  );
}
