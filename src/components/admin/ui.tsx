// Admin form primitives in a Shopify-like style: compact on desktop, large touch targets on phones.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const control =
  'block w-full rounded-lg border border-[#8a8a8a]/45 bg-white px-3 text-[15px] text-[#303030] outline-none transition placeholder:text-[#8a8a8a] hover:border-[#8a8a8a]/80 focus:border-blue focus:ring-2 focus:ring-blue/20 disabled:bg-[#f7f7f7] disabled:text-[#8a8a8a] aria-invalid:border-red-500 lg:text-[13px]';

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11 lg:h-9', className)} {...props} />;
}

export function AdminTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-24 py-2', className)} {...props} />;
}

export function AdminSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-11 pe-8 lg:h-9', className)} {...props} />;
}

const buttonStyles = {
  primary:
    'bg-navy text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.3)] hover:bg-navy-700 disabled:bg-[#b5b5b5] disabled:shadow-none',
  secondary:
    'bg-white text-[#303030] shadow-[0_0_0_1px_rgba(0,0,0,0.12),inset_0_-1px_0_rgba(0,0,0,0.12)] hover:bg-[#f7f7f7]',
  danger: 'bg-[#c70a24] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)] hover:bg-[#a30a1e]',
  ghost: 'text-[#303030] hover:bg-black/5',
} as const;

export function adminButtonClass(variant: keyof typeof buttonStyles = 'primary', size: 'sm' | 'md' = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4',
    size === 'md' ? 'h-11 px-4 text-[15px] lg:h-8 lg:px-3 lg:text-[13px]' : 'h-9 px-3 text-sm lg:h-7 lg:px-2.5 lg:text-xs',
    buttonStyles[variant],
  );
}

export function AdminButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles; size?: 'sm' | 'md' }) {
  return <button className={cn(adminButtonClass(variant, size), className)} {...props} />;
}

export function AdminField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-[#303030] lg:text-[13px]">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-[#8e1f0b] lg:text-[13px]">{error}</p> : hint ? <p className="text-xs text-[#616161]">{hint}</p> : null}
    </div>
  );
}

/** White card with a hairline edge, as in Shopify's admin. */
export const cardClass = 'rounded-xl bg-white shadow-[0_0_0_1px_rgba(26,26,26,0.08),0_1px_2px_rgba(26,26,26,0.07)]';

export function AdminCard({
  className,
  children,
  title,
  actions,
  flush,
}: {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  /** No inner padding: for tables and lists that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={cn(cardClass, !flush && 'p-4', className)}>
      {(title || actions) && (
        <div className={cn('mb-3 flex min-h-7 items-center justify-between gap-3', flush && 'mb-0 px-4 pt-4')}>
          {title && <h2 className="text-sm font-semibold text-[#303030]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const toneStyles = {
  neutral: 'bg-[#e3e3e3] text-[#303030]',
  info: 'bg-[#e0f0ff] text-[#00527c]',
  success: 'bg-[#cdfee1] text-[#0c5132]',
  attention: 'bg-[#ffeb78] text-[#4f4700]',
  warning: 'bg-[#ffdeb5] text-[#5e4200]',
  critical: 'bg-[#fedad9] text-[#8e1f0b]',
} as const;
export type BadgeTone = keyof typeof toneStyles;

/** Shopify-style status pill. `dot` adds the progress dot Shopify shows on payment and fulfillment badges. */
export function AdminBadge({
  tone = 'neutral',
  dot,
  children,
  className,
  testId,
}: {
  tone?: BadgeTone;
  dot?: 'empty' | 'half' | 'full';
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium', toneStyles[tone], className)}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            'size-2 rounded-full border-[1.5px] border-current',
            dot === 'full' && 'bg-current',
            dot === 'half' && 'bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]',
          )}
        />
      )}
      {children}
    </span>
  );
}
