import { STATUS_LABELS, type OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';

const COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue/10 text-blue ring-blue/20',
  confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  out_for_delivery: 'bg-amber-50 text-amber-800 ring-amber-200',
  delivered: 'bg-green-50 text-green-700 ring-green-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  returned: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function StatusBadge({ status, className, testId }: { status: OrderStatus; className?: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', COLORS[status], className)}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
