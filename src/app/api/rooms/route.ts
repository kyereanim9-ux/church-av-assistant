import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const rooms = await db.room.findMany({
    include: {
      _count: { select: { equipment: true, installations: true } },
      responsable: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut ajouter une salle.' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });

  const room = await db.room.create({
    data: {
      name: body.name,
      floor: body.floor || null,
      description: body.description || null,
      photoUrl: body.photoUrl || null,
      planUrl: body.planUrl || null,
      notes: body.notes || null,
      responsableId: body.responsableId || null,
    },
  });

  await logHistory({
    action: 'Salle ajoutée',
    entityType: 'Room',
    entityId: room.id,
    description: `Salle "${room.name}" créée.`,
    userId: session.user.id,
  });

  return NextResponse.json(room, { status: 201 });
}
