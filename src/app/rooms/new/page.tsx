import { requireAdmin } from '@/lib/session';
import { PageHeader } from '@/components/PageHeader';
import { RoomForm } from '@/components/forms/RoomForm';

export default async function NewRoomPage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader eyebrow="Salles" title="Ajouter une salle" />
      <RoomForm />
    </div>
  );
}
