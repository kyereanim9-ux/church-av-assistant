import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { EquipmentForm } from '@/components/forms/EquipmentForm';

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const [equipment, categories, rooms] = await Promise.all([
    db.equipment.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.room.findMany({ orderBy: { name: 'asc' } }),
  ]);
  if (!equipment) notFound();

  return (
    <div>
      <PageHeader eyebrow="Matériel" title={`Modifier : ${equipment.name}`} />
      <EquipmentForm
        categories={categories}
        rooms={rooms}
        initial={{
          id: equipment.id,
          name: equipment.name,
          categoryId: equipment.categoryId ?? '',
          brand: equipment.brand ?? '',
          model: equipment.model ?? '',
          serialNumber: equipment.serialNumber ?? '',
          reference: equipment.reference ?? '',
          quantity: equipment.quantity,
          status: equipment.status,
          roomId: equipment.roomId ?? '',
          location: equipment.location ?? '',
          photoUrl: equipment.photoUrl ?? '',
          description: equipment.description ?? '',
          usage: equipment.usage ?? '',
          instructions: equipment.instructions ?? '',
          cablesNeeded: equipment.cablesNeeded ?? '',
          accessories: equipment.accessories ?? '',
          notes: equipment.notes ?? '',
        }}
      />
    </div>
  );
}
