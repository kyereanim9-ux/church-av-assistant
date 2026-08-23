import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logHistory } from '@/lib/history';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId') || undefined;

  const installations = await db.installation.findMany({
    where: { roomId: roomId || undefined },
    include: {
      room: true,
      steps: { orderBy: { order: 'asc' } },
      equipment: { include: { equipment: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(installations);
}

type StepInput = {
  label: string;
  type?: 'EQUIPEMENT' | 'CABLE' | 'LOGICIEL' | 'SORTIE';
  equipmentId?: string;
  cableType?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut créer une installation.' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.roomId) {
    return NextResponse.json({ error: 'Le nom et la salle sont obligatoires.' }, { status: 400 });
  }

  const steps: StepInput[] = Array.isArray(body.steps) ? body.steps : [];
  const equipmentIds: string[] = Array.isArray(body.equipmentIds) ? body.equipmentIds : [];

  const installation = await db.installation.create({
    data: {
      name: body.name,
      roomId: body.roomId,
      purpose: body.purpose || null,
      photoUrl: body.photoUrl || null,
      diagramUrl: body.diagramUrl || null,
      configuration: body.configuration || null,
      settings: body.settings || null,
      instructions: body.instructions || null,
      knownIssues: body.knownIssues || null,
      knownFixes: body.knownFixes || null,
      createdById: session.user.id,
      equipment: { create: equipmentIds.map((id) => ({ equipmentId: id })) },
      steps: {
        create: steps.map((s, idx) => ({
          order: idx + 1,
          label: s.label,
          type: s.type || 'EQUIPEMENT',
          equipmentId: s.equipmentId || null,
          cableType: s.cableType || null,
          notes: s.notes || null,
        })),
      },
    },
    include: { steps: true, room: true },
  });

  await logHistory({
    action: 'Installation créée',
    entityType: 'Installation',
    entityId: installation.id,
    description: `Installation "${installation.name}" créée en ${installation.room.name}.`,
    userId: session.user.id,
  });

  return NextResponse.json(installation, { status: 201 });
}
