import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId') || undefined;
  const roomId = searchParams.get('roomId') || undefined;
  const status = searchParams.get('status') || undefined;
  const q = searchParams.get('q') || undefined;

  const equipment = await db.equipment.findMany({
    where: {
      categoryId: categoryId || undefined,
      roomId: roomId || undefined,
      status: (status as never) || undefined,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: { category: true, room: true },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(equipment);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Seul un administrateur peut ajouter du matériel." }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });

  const equipment = await db.equipment.create({
    data: {
      name: body.name,
      categoryId: body.categoryId || null,
      brand: body.brand || null,
      model: body.model || null,
      serialNumber: body.serialNumber || null,
      reference: body.reference || null,
      quantity: body.quantity ? Number(body.quantity) : 1,
      status: body.status || 'DISPONIBLE',
      roomId: body.roomId || null,
      location: body.location || null,
      photoUrl: body.photoUrl || null,
      description: body.description || null,
      usage: body.usage || null,
      instructions: body.instructions || null,
      cablesNeeded: body.cablesNeeded || null,
      accessories: body.accessories || null,
      notes: body.notes || null,
    },
  });

  await logHistory({
    action: 'Équipement ajouté',
    entityType: 'Equipment',
    entityId: equipment.id,
    description: `"${equipment.name}" ajouté${equipment.roomId ? ' et associé à une salle' : ''}.`,
    userId: session.user.id,
  });

  return NextResponse.json(equipment, { status: 201 });
}
