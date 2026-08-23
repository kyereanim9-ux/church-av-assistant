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

  const installation = await db.installation.findUnique({
    where: { id },
    include: {
      room: true,
      steps: { orderBy: { order: 'asc' }, include: { equipment: true } },
      equipment: { include: { equipment: { include: { category: true } } } },
      createdBy: { select: { name: true } },
      photos: true,
    },
  });
  if (!installation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(installation);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut modifier une installation.' }, { status: 403 });
  }

  const body = await req.json();

  const installation = await db.installation.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      purpose: body.purpose ?? undefined,
      configuration: body.configuration ?? undefined,
      settings: body.settings ?? undefined,
      instructions: body.instructions ?? undefined,
      knownIssues: body.knownIssues ?? undefined,
      knownFixes: body.knownFixes ?? undefined,
      photoUrl: body.photoUrl ?? undefined,
      diagramUrl: body.diagramUrl ?? undefined,
    },
  });

  await logHistory({
    action: 'Installation modifiée',
    entityType: 'Installation',
    entityId: installation.id,
    description: `Installation "${installation.name}" mise à jour.`,
    userId: session.user.id,
  });

  return NextResponse.json(installation);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut supprimer une installation.' }, { status: 403 });
  }
  const installation = await db.installation.findUnique({ where: { id } });
  if (!installation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await db.installation.delete({ where: { id } });
  await logHistory({
    action: 'Installation supprimée',
    entityType: 'Installation',
    entityId: id,
    description: `Installation "${installation.name}" supprimée.`,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
