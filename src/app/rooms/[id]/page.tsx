import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { DoorOpen, Pencil, Sparkles, Package, Cable } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { DeleteButton } from '@/components/DeleteButton';

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const room = await db.room.findUnique({
    where: { id },
    include: {
      equipment: { include: { category: true } },
      installations: true,
      responsable: { select: { name: true } },
    },
  });
  if (!room) notFound();

  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        eyebrow={room.floor ? `Étage ${room.floor}` : 'Salle'}
        title={room.name}
        subtitle={room.description ?? undefined}
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Link href={`/rooms/${room.id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" /> Modifier</Link>
              <DeleteButton url={`/api/rooms/${room.id}`} redirectTo="/rooms" confirmLabel={`Supprimer "${room.name}" ?`} />
            </div>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="rack-card flex aspect-video items-center justify-center overflow-hidden md:aspect-square">
            {room.photoUrl ? (
              <Image src={room.photoUrl} alt={room.name} width={400} height={400} className="h-full w-full object-cover" />
            ) : (
              <DoorOpen className="h-12 w-12 text-ink-soft/40" />
            )}
          </div>
          {room.responsable && (
            <p className="mt-3 text-sm text-ink-soft dark:text-cream/60">Responsable : {room.responsable.name}</p>
          )}
          {room.notes && <p className="mt-2 text-sm">{room.notes}</p>}

          <Link
            href={`/assistant?q=${encodeURIComponent(`Explique-moi comment installer et utiliser le système audiovisuel de la salle : ${room.name}.`)}`}
            className="btn-primary mt-4 w-full"
          >
            <Sparkles className="h-4 w-4" /> Demander à l&apos;IA
          </Link>
        </div>

        <div className="space-y-6 md:col-span-2">
          <div>
            <p className="field-label flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Matériel présent dans cette salle</p>
            {room.equipment.length === 0 ? (
              <EmptyState icon={Package} title="Aucun équipement dans cette salle" />
            ) : (
              <div className="space-y-2">
                {room.equipment.map((e) => (
                  <Link key={e.id} href={`/equipment/${e.id}`} className="rack-card flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm uppercase tracking-wide">{e.name}</p>
                      <p className="truncate text-xs text-ink-soft dark:text-cream/50">{e.category?.name ?? '—'}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="field-label flex items-center gap-1.5"><Cable className="h-3.5 w-3.5" /> Installations de cette salle</p>
            {room.installations.length === 0 ? (
              <EmptyState icon={Cable} title="Aucune installation documentée" />
            ) : (
              <div className="space-y-2">
                {room.installations.map((i) => (
                  <Link key={i.id} href={`/installations/${i.id}`} className="rack-card block p-3">
                    <p className="font-display text-sm uppercase tracking-wide">{i.name}</p>
                    {i.purpose && <p className="text-xs text-ink-soft dark:text-cream/50">{i.purpose}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
