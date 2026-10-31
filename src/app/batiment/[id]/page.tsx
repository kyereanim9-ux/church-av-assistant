import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, User, Phone, Mail, ExternalLink } from 'lucide-react';
import { requireReportManager } from '@/lib/session';
import { db } from '@/lib/db';
import { categoryEmoji, categoryLabel } from '@/lib/reports';
import { ReportStatusBadge, UrgencyBadge } from '@/components/reports/Badges';
import { ReportActions } from '@/components/reports/ReportActions';
import { DeleteButton } from '@/components/DeleteButton';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function contactHref(contact: string) {
  if (contact.includes('@')) return { href: `mailto:${contact}`, icon: Mail };
  const digits = contact.replace(/[^\d+]/g, '');
  if (digits.length >= 6) return { href: `tel:${digits}`, icon: Phone };
  return null;
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireReportManager();
  const { id } = await params;

  const [report, users] = await Promise.all([
    db.buildingReport.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        photos: { orderBy: { createdAt: 'asc' } },
        comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  if (!report) notFound();

  const before = report.photos.filter((p) => p.kind === 'SIGNALEMENT');
  const after = report.photos.filter((p) => p.kind === 'RESOLUTION');
  const contact = report.reporterContact ? contactHref(report.reporterContact) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/batiment" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:underline dark:text-cream/60">
        <ArrowLeft className="h-4 w-4" /> Tous les signalements
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrgencyBadge urgency={report.urgency} />
        <ReportStatusBadge status={report.status} />
        <span className="font-mono text-xs text-ink-soft dark:text-cream/50">#{report.reference}</span>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rack-card p-4">
            <p className="mb-2 text-sm text-ink-soft dark:text-cream/60">
              {categoryEmoji(report.category)} {categoryLabel(report.category)}
            </p>
            <p className="whitespace-pre-line text-base">{report.description}</p>

            <dl className="mt-4 space-y-2 border-t border-ink/10 pt-3 text-sm dark:border-white/10">
              {(report.room || report.location) && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
                  <span>
                    {report.room && <Link href={`/rooms/${report.room.id}`} className="underline">{report.room.name}</Link>}
                    {report.room && report.location && ' · '}
                    {report.location}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
                <span>
                  {report.reporterName || 'Anonyme'}
                  {report.reporterContact && (
                    <>
                      {' · '}
                      {contact ? (
                        <a href={contact.href} className="inline-flex items-center gap-1 text-signal underline">
                          <contact.icon className="h-3.5 w-3.5" />{report.reporterContact}
                        </a>
                      ) : report.reporterContact}
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-ink-soft dark:text-cream/50">Reçu le {formatDateTime(report.createdAt)}</p>
            </dl>
          </section>

          {before.length > 0 && (
            <section>
              <p className="field-label">Photos envoyées</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {before.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden rounded-lg bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Photo du signalement" className="h-full w-full object-cover transition group-hover:scale-105" />
                    <ExternalLink className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {after.length > 0 && (
            <section>
              <p className="field-label">Après intervention</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {after.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Photo après intervention" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="field-label">Journal et commentaires internes</p>
            <div className="space-y-2">
              {report.comments.length === 0 && (
                <p className="text-sm text-ink-soft dark:text-cream/50">Aucune activité pour l&apos;instant.</p>
              )}
              {report.comments.map((c) =>
                c.isSystem ? (
                  <p key={c.id} className="px-1 text-xs text-ink-soft dark:text-cream/50">
                    {formatDateTime(c.createdAt)} — {c.user?.name ?? 'Quelqu’un'} : {c.body}
                  </p>
                ) : (
                  <div key={c.id} className="rack-card p-3">
                    <p className="mb-1 text-xs text-ink-soft dark:text-cream/50">
                      <strong className="text-ink dark:text-cream">{c.user?.name ?? 'Utilisateur supprimé'}</strong> · {formatDateTime(c.createdAt)}
                    </p>
                    <p className="whitespace-pre-line text-sm">{c.body}</p>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ReportActions
            report={{
              id: report.id,
              reference: report.reference,
              status: report.status,
              urgency: report.urgency,
              category: report.category,
              assignedToId: report.assignedToId,
              publicNote: report.publicNote ?? '',
            }}
            users={users}
          />
          <DeleteButton url={`/api/reports/${report.id}`} redirectTo="/batiment" confirmLabel="Supprimer définitivement ce signalement et ses photos ?" />
        </aside>
      </div>
    </div>
  );
}
