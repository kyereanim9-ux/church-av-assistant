import { STATUS_LABEL, STATUS_DOT, cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('label-tag bg-ink/5 text-ink-soft dark:bg-white/5 dark:text-cream/70', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-ink-soft')} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
