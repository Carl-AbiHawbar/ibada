import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { LanguageSwitcher } from './language-switcher';

export async function ShopHeader({ locale, actions }: { locale: Locale; actions?: ReactNode }) {
  const t = await getTranslations({ locale, namespace: 'header' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const nav = [
    { href: '/shop', label: t('shop') },
    { href: '/#how-it-works', label: t('howItWorks') },
    { href: '/#reviews', label: t('reviews') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <details className="group relative md:hidden">
          <summary
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-navy hover:bg-ice [&::-webkit-details-marker]:hidden"
            aria-label={t('menu')}
          >
            <Menu className="size-5" aria-hidden />
          </summary>
          <nav className="absolute start-0 top-12 w-56 rounded-2xl border border-line bg-white p-2 shadow-xl">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-4 py-3 font-medium text-navy hover:bg-ice">
                {item.label}
              </Link>
            ))}
          </nav>
        </details>

        <Link href="/" aria-label={tc('homeLabel')} className="shrink-0">
          <Logo className="h-5 sm:h-6" />
        </Link>

        <nav className="ms-6 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[15px] font-medium text-ink/80 transition hover:bg-ice hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          {actions}
        </div>
      </div>
    </header>
  );
}
