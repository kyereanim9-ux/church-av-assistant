import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, DoorOpen, Package, Cable } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

export default async function RoomsPage() {
  const session = await requireSession();
  const rooms = await db.room.findMany({
    include: { _count: { select: { equipment: true, installations: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Salles"
        title="Salles de l'église"
        subtitle={`${rooms.length} salle${rooms.length > 1 ? 's' : ''}`}
        action={
          session.user.role === 'ADMIN' && (
            <Link href="/rooms/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> Ajouter</Link>
          )
        }
      />

      {rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Aucune salle enregistrée" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="rack-card flex gap-3 p-3 transition hover:-translate-y-0.5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 dark:bg-white/5">
                {room.photoUrl ? (
                  <Image src={room.photoUrl} alt={room.name} width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  <DoorOpen className="h-6 w-6 text-ink-soft/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm uppercase tracking-wide">{room.name}</p>
                {room.floor && <p className="text-xs text-ink-soft dark:text-cream/50">Étage : {room.floor}</p>}
                <div className="mt-2 flex gap-3 text-xs text-ink-soft dark:text-cream/50">
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {room._count.equipment}</span>
                  <span className="flex items-center gap-1"><Cable className="h-3 w-3" /> {room._count.installations}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
