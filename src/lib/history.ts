import { db } from '@/lib/db';

export async function logHistory(params: {
  action: string;
  entityType: 'Equipment' | 'Room' | 'Installation';
  entityId: string;
  description: string;
  userId?: string | null;
}) {
  await db.history.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      userId: params.userId ?? null,
    },
  });
}
