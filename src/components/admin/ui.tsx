// Admin form primitives: large touch targets for phone use, brand navy actions.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const control =
  'block w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-ink shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue focus:ring-4 focus:ring-blue/15 disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-red-500';

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11', className)} {...props} />;
}

export function AdminTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-24 py-2.5', className)} {...props} />;
}

export function AdminSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, 'h-11 pe-8', className)} {...props} />;
}

const buttonStyles = {
  primary: 'bg-navy text-white hover:bg-navy-700 disabled:bg-slate-300',
  secondary: 'border border-slate-200 bg-white text-navy hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-navy hover:bg-slate-100',
} as const;

export function AdminButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles; size?: 'sm' | 'md' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4',
        size === 'md' ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-sm',
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
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
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function AdminCard({ className, children, title, actions }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-xs', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-navy">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
