import Link from 'next/link';
import { SearchX, CheckCircle2, Clock, Wrench, Ban, MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { categoryEmoji, categoryLabel, normalizeReference, statusInfo } from '@/lib/reports';
import { PublicShell } from '@/components/reports/PublicShell';
import { formatDateTime, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suivi de signalement', robots: { index: false, follow: false } };

const STEPS = [
  { value: 'NOUVEAU', label: 'Reçu', icon: Clock },
  { value: 'EN_COURS', label: 'Pris en charge', icon: Wrench },
  { value: 'RESOLU', label: 'Résolu', icon: CheckCircle2 },
];

/**
 * Page de suivi PUBLIQUE : n'affiche volontairement que le statut, la catégorie, la date
 * et le message public. Jamais le nom/contact du signaleur ni les commentaires internes.
 */
export default async function SuiviReferencePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const reference = normalizeReference(decodeURIComponent(ref));
  const report = reference
    ? await db.buildingReport.findUnique({
        where: { reference },
        select: {
          reference: true, category: true, status: true, publicNote: true, createdAt: true,
          updatedAt: true, resolvedAt: true, room: { select: { name: true } },
        },
      })
    : null;

  if (!report) {
    return (
      <PublicShell>
        <div className="rack-card flex flex-col items-center gap-3 p-8 text-center">
          <SearchX className="h-10 w-10 text-ink-soft" />
          <p className="font-display text-base uppercase tracking-wide">Signalement introuvable</p>
          <p className="text-sm text-ink-soft dark:text-cream/60">Vérifiez le numéro de suivi.</p>
          <Link href="/suivi" className="btn-secondary mt-2">Réessayer</Link>
        </div>
      </PublicShell>
    );
  }

  const rejected = report.status === 'REJETE';
  const currentIdx = STEPS.findIndex((s) => s.value === report.status);

  return (
    <PublicShell subtitle="Suivi de votre signalement">
      <div className="rack-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="field-label">Numéro</p>
            <p className="font-mono text-xl font-semibold tracking-widest">{report.reference}</p>
          </div>
          <span className="label-tag bg-ink/5 dark:bg-white/5">
            <span className={cn('h-1.5 w-1.5 rounded-full', statusInfo(report.status).dot)} />
            {statusInfo(report.status).label}
          </span>
        </div>
        <p className="mt-3 text-sm text-ink-soft dark:text-cream/70">
          {categoryEmoji(report.category)} {categoryLabel(report.category)}
          {report.room ? ` · ${report.room.name}` : ''}
        </p>
        <p className="text-xs text-ink-soft dark:text-cream/50">Envoyé le {formatDateTime(report.createdAt)}</p>

        {rejected ? (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/5">
            <Ban className="h-4 w-4 shrink-0" /> Ce signalement a été classé sans suite.
          </div>
        ) : (
          <ol className="mt-6 grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s.value} className="flex flex-col items-center gap-1.5 text-center">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', done ? 'bg-ok text-white' : 'bg-ink/10 text-ink-soft dark:bg-white/10')}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className={cn('text-xs', done ? 'font-medium' : 'text-ink-soft dark:text-cream/50')}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {report.publicNote && (
          <div className="mt-5 rounded-lg border border-amber/40 bg-amber/10 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-dim dark:text-amber">
              <MessageSquare className="h-3.5 w-3.5" /> Message de l&apos;équipe
            </p>
            <p className="whitespace-pre-line text-sm">{report.publicNote}</p>
          </div>
        )}

        {report.resolvedAt && (
          <p className="mt-4 text-sm text-ok">Résolu le {formatDateTime(report.resolvedAt)}. Merci de votre vigilance 🙏</p>
        )}
      </div>
      <Link href="/suivi" className="mt-4 block text-center text-sm text-ink-soft underline dark:text-cream/60">
        Suivre un autre signalement
      </Link>
    </PublicShell>
  );
}
