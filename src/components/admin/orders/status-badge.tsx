import { AdminBadge, type BadgeTone } from '@/components/admin/ui';
import { paymentLabel, STATUS_LABELS, type OrderStatus, type PaymentLabel } from '@/lib/order-status';

const STATUS_TONES: Record<OrderStatus, { tone: BadgeTone; dot?: 'empty' | 'half' | 'full' }> = {
  new: { tone: 'attention', dot: 'empty' },
  confirmed: { tone: 'warning', dot: 'half' },
  out_for_delivery: { tone: 'info', dot: 'half' },
  delivered: { tone: 'success', dot: 'full' },
  cancelled: { tone: 'neutral' },
  returned: { tone: 'critical' },
};

export function StatusBadge({ status, className, testId }: { status: OrderStatus; className?: string; testId?: string }) {
  const s = STATUS_TONES[status];
  return (
    <AdminBadge tone={s.tone} dot={s.dot} className={className} testId={testId}>
      {STATUS_LABELS[status]}
    </AdminBadge>
  );
}

const PAYMENT_TONES: Record<PaymentLabel, { tone: BadgeTone; dot?: 'empty' | 'full' }> = {
  'Payment pending': { tone: 'warning', dot: 'empty' },
  Paid: { tone: 'neutral', dot: 'full' },
  Voided: { tone: 'neutral' },
  Refunded: { tone: 'neutral' },
};

export function PaymentBadge({ status, paymentStatus, className }: { status: OrderStatus; paymentStatus: 'pending' | 'paid'; className?: string }) {
  const label = paymentLabel(status, paymentStatus);
  const p = PAYMENT_TONES[label];
  return (
    <AdminBadge tone={p.tone} dot={p.dot} className={className}>
      {label}
    </AdminBadge>
  );
}
