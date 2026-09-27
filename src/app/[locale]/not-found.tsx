import { useTranslations } from 'next-intl';
import { LogoMark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  const tc = useTranslations('common');
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <LogoMark className="mb-6 h-12" />
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">{t('title')}</h1>
      <p className="mt-3 text-muted-ink">{t('body')}</p>
      <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-6 font-semibold text-white hover:bg-navy-700">
        {tc('backHome')}
      </Link>
    </section>
  );
}
