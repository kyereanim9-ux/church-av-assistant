import { statusInfo, urgencyInfo } from '@/lib/report-constants';
import { cn } from '@/lib/utils';

export function ReportStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = statusInfo(status);
  return (
    <span className={cn('label-tag bg-ink/5 text-ink-soft dark:bg-white/5 dark:text-cream/70', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  const u = urgencyInfo(urgency);
  return (
    <span
      className={cn(
        'label-tag',
        urgency === 'DANGER' && 'bg-danger text-white',
        urgency === 'URGENTE' && 'bg-amber/20 text-amber-dim dark:text-amber',
        urgency === 'NORMALE' && 'bg-signal/10 text-signal',
        urgency === 'FAIBLE' && 'bg-ink/5 text-ink-soft dark:bg-white/5 dark:text-cream/60',
        className
      )}
    >
      {u.label}
    </span>
  );
}
