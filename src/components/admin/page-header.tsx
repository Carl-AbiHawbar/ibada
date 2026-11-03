import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 lg:mb-5">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            title={back.label}
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-[#303030] hover:bg-black/5"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-8 text-[#303030]">{title}</h1>
          {description && <p className="text-[13px] text-[#616161]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
