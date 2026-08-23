import { requireAdmin } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { EquipmentForm } from '@/components/forms/EquipmentForm';

export default async function NewEquipmentPage() {
  await requireAdmin();
  const [categories, rooms] = await Promise.all([
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.room.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Matériel" title="Ajouter un matériel" />
      <EquipmentForm categories={categories} rooms={rooms} />
    </div>
  );
}
