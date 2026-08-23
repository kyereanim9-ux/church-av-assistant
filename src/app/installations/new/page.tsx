import { requireAdmin } from '@/lib/session';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { InstallationForm } from '@/components/forms/InstallationForm';

export default async function NewInstallationPage() {
  await requireAdmin();
  const [rooms, equipmentList] = await Promise.all([
    db.room.findMany({ orderBy: { name: 'asc' } }),
    db.equipment.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Installations" title="Documenter une installation" />
      <InstallationForm rooms={rooms} equipmentList={equipmentList} />
    </div>
  );
}
