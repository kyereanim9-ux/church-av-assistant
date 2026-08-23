import Link from 'next/link';
import { PlusCircle, Cable } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';

export default async function InstallationsPage() {
  const session = await requireSession();
  const installations = await db.installation.findMany({
    include: { room: true, steps: true },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Installations"
        title="Installations documentées"
        subtitle={`${installations.length} installation${installations.length > 1 ? 's' : ''}`}
        action={
          session.user.role === 'ADMIN' && (
            <Link href="/installations/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> Ajouter</Link>
          )
        }
      />

      {installations.length === 0 ? (
        <EmptyState icon={Cable} title="Aucune installation documentée" description="Documentez un branchement pour que l'équipe puisse le reproduire facilement." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {installations.map((i) => (
            <Link key={i.id} href={`/installations/${i.id}`} className="rack-card p-4 transition hover:-translate-y-0.5">
              <p className="font-display text-sm uppercase tracking-wide">{i.name}</p>
              <p className="text-xs text-ink-soft dark:text-cream/50">{i.room.name}</p>
              {i.purpose && <p className="mt-2 text-sm">{i.purpose}</p>}
              <p className="mt-3 text-xs text-ink-soft dark:text-cream/40">
                {i.steps.length} étape{i.steps.length > 1 ? 's' : ''} · mis à jour le {formatDate(i.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
