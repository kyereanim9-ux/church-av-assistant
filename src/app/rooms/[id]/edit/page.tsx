import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { RoomForm } from '@/components/forms/RoomForm';

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const room = await db.room.findUnique({ where: { id } });
  if (!room) notFound();

  return (
    <div>
      <PageHeader eyebrow="Salles" title={`Modifier : ${room.name}`} />
      <RoomForm
        initial={{
          id: room.id,
          name: room.name,
          floor: room.floor ?? '',
          description: room.description ?? '',
          photoUrl: room.photoUrl ?? '',
          notes: room.notes ?? '',
        }}
      />
    </div>
  );
}
