import Link from 'next/link';
import { Box, Cable, MonitorPlay, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiagramStep = {
  id: string;
  order: number;
  label: string;
  type: string;
  cableType?: string | null;
  notes?: string | null;
  equipmentId?: string | null;
};

const TYPE_META: Record<string, { icon: typeof Box; style: string }> = {
  EQUIPEMENT: { icon: Box, style: 'rack-card px-4 py-3' },
  CABLE: {
    icon: Cable,
    style: 'rounded-full border border-dashed border-signal/50 bg-signal/5 px-4 py-1.5 text-signal dark:bg-signal/10',
  },
  LOGICIEL: { icon: MonitorPlay, style: 'rounded-card border-2 border-dashed border-ink/20 px-4 py-3 dark:border-cream/20' },
  SORTIE: { icon: Radio, style: 'rounded-card bg-amber px-4 py-3 text-stage' },
};

export function ConnectionDiagram({ steps }: { steps: DiagramStep[] }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="flex flex-col items-stretch">
      {sorted.map((step, idx) => {
        const meta = TYPE_META[step.type] ?? TYPE_META.EQUIPEMENT;
        const Icon = meta.icon;
        const content = (
          <div className={cn('flex w-full items-center gap-3', meta.style)}>
            <Icon className="h-4 w-4 shrink-0 opacity-70" />
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate font-display text-sm uppercase tracking-wide',
                  step.type === 'SORTIE' ? 'text-stage' : 'text-ink dark:text-cream'
                )}
              >
                {step.label}
              </p>
              {step.cableType && (
                <p className="font-mono text-[11px] uppercase tracking-wide opacity-70">{step.cableType}</p>
              )}
              {step.notes && <p className="mt-0.5 text-xs opacity-70">{step.notes}</p>}
            </div>
          </div>
        );

        return (
          <li key={step.id} className="flex flex-col items-stretch">
            {step.equipmentId ? (
              <Link href={`/equipment/${step.equipmentId}`} className="transition hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
            {idx < sorted.length - 1 && (
              <div className="flex items-center gap-2 py-1 pl-6 text-ink-soft/40 dark:text-cream/30">
                <span className="h-4 w-px bg-current" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
