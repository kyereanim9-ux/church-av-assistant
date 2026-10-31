import { ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import { CHURCH_NAME } from '@/lib/report-constants';

/** Mise en page des pages publiques (sans menu, pensée pour le téléphone). */
export function PublicShell({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-paper px-4 pb-16 pt-6 dark:bg-stage">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber text-stage">
            <Building2 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg uppercase leading-tight tracking-wide">Prenons soin de {CHURCH_NAME}</p>
            {subtitle && <p className="text-sm text-ink-soft dark:text-cream/60">{subtitle}</p>}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
