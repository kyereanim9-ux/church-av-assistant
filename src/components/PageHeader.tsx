import { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 font-display text-xs uppercase tracking-[0.2em] text-amber-dim dark:text-amber">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl uppercase tracking-wide text-ink dark:text-cream">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft dark:text-cream/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
