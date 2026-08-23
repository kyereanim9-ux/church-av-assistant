import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      room: true,
      photos: true,
      maintenance: { orderBy: { createdAt: 'desc' } },
      connectedTo: true,
      connectedFrom: true,
      installations: { include: { installation: { include: { room: true } } } },
    },
  });
  if (!equipment) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const history = await db.history.findMany({
    where: { entityType: 'Equipment', entityId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } },
    take: 20,
  });

  return NextResponse.json({ ...equipment, history });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut modifier une fiche.' }, { status: 403 });
  }

  const body = await req.json();
  const existing = await db.equipment.findUnique({ where: { id }, include: { room: true } });
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const equipment = await db.equipment.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      categoryId: body.categoryId ?? undefined,
      brand: body.brand ?? undefined,
      model: body.model ?? undefined,
      serialNumber: body.serialNumber ?? undefined,
      reference: body.reference ?? undefined,
      quantity: body.quantity !== undefined ? Number(body.quantity) : undefined,
      status: body.status ?? undefined,
      roomId: body.roomId !== undefined ? body.roomId || null : undefined,
      location: body.location ?? undefined,
      photoUrl: body.photoUrl ?? undefined,
      description: body.description ?? undefined,
      usage: body.usage ?? undefined,
      instructions: body.instructions ?? undefined,
      cablesNeeded: body.cablesNeeded ?? undefined,
      accessories: body.accessories ?? undefined,
      notes: body.notes ?? undefined,
    },
    include: { room: true },
  });

  if (body.roomId !== undefined && body.roomId !== existing.roomId) {
    await logHistory({
      action: 'Équipement déplacé',
      entityType: 'Equipment',
      entityId: equipment.id,
      description: `"${equipment.name}" déplacé de ${existing.room?.name ?? 'aucune salle'} vers ${equipment.room?.name ?? 'aucune salle'}.`,
      userId: session.user.id,
    });
  } else {
    await logHistory({
      action: 'Fiche modifiée',
      entityType: 'Equipment',
      entityId: equipment.id,
      description: `Fiche "${equipment.name}" mise à jour.`,
      userId: session.user.id,
    });
  }

  return NextResponse.json(equipment);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut supprimer.' }, { status: 403 });
  }
  const equipment = await db.equipment.findUnique({ where: { id } });
  if (!equipment) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await db.equipment.delete({ where: { id } });
  await logHistory({
    action: 'Équipement supprimé',
    entityType: 'Equipment',
    entityId: id,
    description: `"${equipment.name}" supprimé.`,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
