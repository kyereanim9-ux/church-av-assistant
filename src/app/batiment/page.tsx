import Link from 'next/link';
import { Building2, QrCode, ImageIcon, MessageSquare, MapPin } from 'lucide-react';
import { requireReportManager } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ReportStatusBadge, UrgencyBadge } from '@/components/reports/Badges';
import { OPEN_STATUSES, REPORT_STATUSES, REPORT_URGENCIES, categoryEmoji, categoryLabel } from '@/lib/reports';
import { formatDateTime, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const URGENCY_RANK: Record<string, number> = { DANGER: 0, URGENTE: 1, NORMALE: 2, FAIBLE: 3 };

const FILTERS = [
  { value: 'ouverts', label: 'À traiter' },
  ...REPORT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  { value: 'tous', label: 'Tous' },
];

export default async function BatimentPage({ searchParams }: { searchParams: Promise<{ statut?: string; urgence?: string }> }) {
  await requireReportManager();
  const { statut = 'ouverts', urgence } = await searchParams;

  const statusWhere =
    statut === 'tous' ? {} : statut === 'ouverts' ? { status: { in: OPEN_STATUSES } } : { status: statut };
  const urgencyWhere = urgence && REPORT_URGENCIES.some((u) => u.value === urgence) ? { urgency: urgence } : {};

  const [reports, counts] = await Promise.all([
    db.buildingReport.findMany({
      where: { ...statusWhere, ...urgencyWhere },
      include: {
        room: { select: { name: true } },
        assignedTo: { select: { name: true } },
        photos: { where: { kind: 'SIGNALEMENT' }, take: 1, orderBy: { createdAt: 'asc' } },
        _count: { select: { photos: true, comments: { where: { isSystem: false } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.buildingReport.groupBy({ by: ['status'], _count: true }),
  ]);

  // Les signalements à traiter sont triés par urgence, puis du plus récent au plus ancien.
  if (statut === 'ouverts') {
    reports.sort((a, b) => (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9));
  }

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const openCount = countOf('NOUVEAU') + countOf('EN_COURS');

  const stats = [
    { label: 'Nouveaux', value: countOf('NOUVEAU'), href: '/batiment?statut=NOUVEAU', accent: 'text-amber-dim dark:text-amber' },
    { label: 'En cours', value: countOf('EN_COURS'), href: '/batiment?statut=EN_COURS', accent: 'text-signal' },
    { label: 'Résolus', value: countOf('RESOLU'), href: '/batiment?statut=RESOLU', accent: 'text-ok' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Bâtiment"
        title="Signalements"
        subtitle={`${openCount} signalement${openCount > 1 ? 's' : ''} à traiter, envoyés par les fidèles via QR code.`}
        action={
          <Link href="/batiment/qr" className="btn-secondary">
            <QrCode className="h-4 w-4" /> QR codes
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rack-card p-4 transition hover:-translate-y-0.5">
            <p className={cn('font-display text-2xl', s.accent)}>{s.value}</p>
            <p className="text-xs text-ink-soft dark:text-cream/50">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/batiment?statut=${f.value}${urgence ? `&urgence=${urgence}` : ''}`}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm',
              statut === f.value ? 'border-amber bg-amber/15 font-medium' : 'border-ink/15 text-ink-soft dark:border-white/15 dark:text-cream/70'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Link
          href={`/batiment?statut=${statut}`}
          className={cn('shrink-0 rounded-full px-3 py-1 text-xs', !urgence ? 'bg-ink/10 font-medium dark:bg-white/10' : 'text-ink-soft dark:text-cream/60')}
        >
          Toutes urgences
        </Link>
        {REPORT_URGENCIES.map((u) => (
          <Link
            key={u.value}
            href={`/batiment?statut=${statut}&urgence=${u.value}`}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs', urgence === u.value ? 'bg-ink/10 font-medium dark:bg-white/10' : 'text-ink-soft dark:text-cream/60')}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', u.dot)} />{u.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={statut === 'ouverts' ? 'Rien à traiter 🎉' : 'Aucun signalement'}
          description="Affichez les QR codes dans l'église pour que les fidèles puissent signaler un problème."
          action={<Link href="/batiment/qr" className="btn-primary mt-3"><QrCode className="h-4 w-4" /> Voir les QR codes</Link>}
        />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Link key={r.id} href={`/batiment/${r.id}`} className="rack-card flex gap-3 p-3 transition hover:-translate-y-0.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink/5 dark:bg-white/5">
                {r.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photos[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl">{categoryEmoji(r.category)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <UrgencyBadge urgency={r.urgency} />
                  <ReportStatusBadge status={r.status} />
                </div>
                <p className="line-clamp-2 text-sm">{r.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft dark:text-cream/50">
                  <span>{categoryLabel(r.category)}</span>
                  {(r.room || r.location) && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{[r.room?.name, r.location].filter(Boolean).join(' · ')}</span>
                  )}
                  {r._count.photos > 0 && <span className="flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{r._count.photos}</span>}
                  {r._count.comments > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{r._count.comments}</span>}
                  {r.assignedTo && <span>→ {r.assignedTo.name}</span>}
                  <span>{formatDateTime(r.createdAt)}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
