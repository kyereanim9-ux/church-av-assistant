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

  const room = await db.room.findUnique({
    where: { id },
    include: {
      equipment: { include: { category: true } },
      installations: { include: { steps: { orderBy: { order: 'asc' } } } },
      photos: true,
      responsable: { select: { name: true } },
    },
  });
  if (!room) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(room);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut modifier une salle.' }, { status: 403 });
  }

  const body = await req.json();
  const room = await db.room.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      floor: body.floor ?? undefined,
      description: body.description ?? undefined,
      photoUrl: body.photoUrl ?? undefined,
      planUrl: body.planUrl ?? undefined,
      notes: body.notes ?? undefined,
      responsableId: body.responsableId !== undefined ? body.responsableId || null : undefined,
    },
  });

  await logHistory({
    action: 'Salle modifiée',
    entityType: 'Room',
    entityId: room.id,
    description: `Salle "${room.name}" mise à jour.`,
    userId: session.user.id,
  });

  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut supprimer une salle.' }, { status: 403 });
  }
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await db.room.delete({ where: { id } });
  await logHistory({
    action: 'Salle supprimée',
    entityType: 'Room',
    entityId: id,
    description: `Salle "${room.name}" supprimée.`,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
