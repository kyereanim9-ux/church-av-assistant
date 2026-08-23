import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Package, Pencil, Sparkles, MapPin, History as HistoryIcon } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { DeleteButton } from '@/components/DeleteButton';

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      room: true,
      installations: { include: { installation: { include: { room: true } } } },
    },
  });
  if (!equipment) notFound();

  const history = await db.history.findMany({
    where: { entityType: 'Equipment', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } },
    take: 10,
  });

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        eyebrow={equipment.category?.name ?? 'Matériel'}
        title={equipment.name}
        subtitle={equipment.room ? `Emplacement : ${equipment.room.name}` : 'Non assigné à une salle'}
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Link href={`/equipment/${equipment.id}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" /> Modifier
              </Link>
              <DeleteButton url={`/api/equipment/${equipment.id}`} redirectTo="/equipment" confirmLabel={`Supprimer "${equipment.name}" ?`} />
            </div>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="rack-card overflow-hidden">
            <div className="flex aspect-square items-center justify-center bg-ink/5 dark:bg-white/5">
              {equipment.photoUrl ? (
                <Image src={equipment.photoUrl} alt={equipment.name} width={400} height={400} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-12 w-12 text-ink-soft/40" />
              )}
            </div>
            <div className="space-y-2 p-4">
              <StatusBadge status={equipment.status} />
              <dl className="mt-2 space-y-1.5 text-sm">
                {equipment.brand && <Row label="Marque" value={equipment.brand} />}
                {equipment.model && <Row label="Modèle" value={equipment.model} />}
                {equipment.serialNumber && <Row label="N° de série" value={equipment.serialNumber} mono />}
                {equipment.reference && <Row label="Référence" value={equipment.reference} mono />}
                <Row label="Quantité" value={String(equipment.quantity)} />
                {equipment.location && <Row label="Emplacement" value={equipment.location} />}
              </dl>
            </div>
          </div>

          <Link
            href={`/assistant?q=${encodeURIComponent(`Comment utiliser ou reconnecter : ${equipment.name} ?`)}`}
            className="btn-primary mt-4 w-full"
          >
            <Sparkles className="h-4 w-4" /> Demander à l&apos;IA
          </Link>
        </div>

        <div className="space-y-4 md:col-span-2">
          {equipment.description && <Section title="Description" text={equipment.description} />}
          {equipment.usage && <Section title="Utilisation" text={equipment.usage} />}
          {equipment.instructions && <Section title="Instructions de (re)connexion" text={equipment.instructions} pre />}
          {equipment.cablesNeeded && <Section title="Câbles nécessaires" text={equipment.cablesNeeded} />}
          {equipment.accessories && <Section title="Accessoires" text={equipment.accessories} />}
          {equipment.notes && <Section title="Notes" text={equipment.notes} />}

          {equipment.installations.length > 0 && (
            <div>
              <p className="field-label">Installations associées</p>
              <div className="space-y-2">
                {equipment.installations.map(({ installation }) => (
                  <Link key={installation.id} href={`/installations/${installation.id}`} className="rack-card flex items-center gap-2 p-3">
                    <MapPin className="h-4 w-4 shrink-0 text-signal" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm uppercase tracking-wide">{installation.name}</p>
                      <p className="truncate text-xs text-ink-soft dark:text-cream/50">{installation.room.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="field-label flex items-center gap-1.5"><HistoryIcon className="h-3.5 w-3.5" /> Historique</p>
            {history.length === 0 ? (
              <p className="text-sm text-ink-soft dark:text-cream/50">Aucune modification enregistrée.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 border-b border-ink/5 pb-1.5 last:border-0 dark:border-white/5">
                    <span>{h.description}</span>
                    <span className="shrink-0 text-xs text-ink-soft dark:text-cream/40">{formatDateTime(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-soft dark:text-cream/50">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : ''}>{value}</dd>
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
