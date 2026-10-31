import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageReports } from '@/lib/reports';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (!canManageReports(session.user.role)) {
    return NextResponse.json({ error: 'Réservé aux responsables du bâtiment.' }, { status: 403 });
  }
  const { id } = await params;
  const { body } = await req.json();
  const text = String(body ?? '').trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: 'Commentaire vide.' }, { status: 400 });

  const exists = await db.buildingReport.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 });

  const comment = await db.reportComment.create({ data: { reportId: id, userId: session.user.id, body: text } });
  return NextResponse.json(comment, { status: 201 });
}
