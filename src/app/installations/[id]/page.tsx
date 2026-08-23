import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { ConnectionDiagram } from '@/components/ConnectionDiagram';
import { DeleteButton } from '@/components/DeleteButton';

export default async function InstallationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const installation = await db.installation.findUnique({
    where: { id },
    include: {
      room: true,
      steps: { orderBy: { order: 'asc' } },
      equipment: { include: { equipment: { include: { category: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!installation) notFound();

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        eyebrow={installation.room.name}
        title={installation.name}
        subtitle={installation.purpose ?? undefined}
        action={
          isAdmin && (
            <DeleteButton url={`/api/installations/${installation.id}`} redirectTo="/installations" confirmLabel={`Supprimer "${installation.name}" ?`} />
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="field-label">Schéma de branchement</p>
          {installation.steps.length === 0 ? (
            <p className="rack-card p-4 text-sm text-ink-soft dark:text-cream/50">Aucune chaîne de connexion enregistrée.</p>
          ) : (
            <div className="rack-card p-4">
              <ConnectionDiagram steps={installation.steps} />
            </div>
          )}

          <div className="mt-6 space-y-4">
            {installation.configuration && <Section title="Configuration" text={installation.configuration} />}
            {installation.settings && <Section title="Réglages" text={installation.settings} />}
            {installation.instructions && <Section title="Instructions étape par étape" text={installation.instructions} pre />}
            {installation.knownIssues && (
              <div className="rack-card border-l-4 border-l-danger p-4">
                <p className="field-label flex items-center gap-1.5 text-danger"><AlertTriangle className="h-3.5 w-3.5" /> Problèmes connus</p>
                <p className="text-sm">{installation.knownIssues}</p>
              </div>
            )}
            {installation.knownFixes && (
              <div className="rack-card border-l-4 border-l-ok p-4">
                <p className="field-label flex items-center gap-1.5 text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Solutions connues</p>
                <p className="text-sm">{installation.knownFixes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href={`/assistant?q=${encodeURIComponent(`Comment reconnecter l'installation "${installation.name}" si elle a été débranchée ?`)}`}
            className="btn-primary w-full"
          >
            <Sparkles className="h-4 w-4" /> Demander à l&apos;IA
          </Link>

          <div>
            <p className="field-label">Équipements utilisés</p>
            <div className="space-y-2">
              {installation.equipment.map(({ equipment }) => (
                <Link key={equipment.id} href={`/equipment/${equipment.id}`} className="rack-card block p-3">
                  <p className="font-display text-sm uppercase tracking-wide">{equipment.name}</p>
                  <p className="text-xs text-ink-soft dark:text-cream/50">{equipment.category?.name ?? '—'}</p>
                </Link>
              ))}
              {installation.equipment.length === 0 && (
                <p className="text-sm text-ink-soft dark:text-cream/50">Aucun équipement lié.</p>
              )}
            </div>
          </div>

          {installation.createdBy && (
            <p className="text-xs text-ink-soft dark:text-cream/40">Créée par {installation.createdBy.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, text, pre }: { title: string; text: string; pre?: boolean }) {
  return (
    <div className="rack-card p-4">
      <p className="field-label">{title}</p>
      <p className={pre ? 'whitespace-pre-line text-sm' : 'text-sm'}>{text}</p>
    </div>
  );
}
