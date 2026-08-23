import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rack-card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Icon className="h-8 w-8 text-ink-soft/50 dark:text-cream/30" />
      <p className="font-display text-sm uppercase tracking-wide text-ink-soft dark:text-cream/70">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-soft dark:text-cream/50">{description}</p>}
      {action}
    </div>
  );
}
