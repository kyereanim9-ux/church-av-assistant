import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  canManageReports, categoryLabel, isValidCategory, isValidStatus, isValidUrgency, statusInfo, urgencyInfo,
} from '@/lib/reports';

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  if (!canManageReports(session.user.role)) {
    return { error: NextResponse.json({ error: 'Réservé aux responsables du bâtiment.' }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await guard();
  if (error) return error;
  const { id } = await params;

  const report = await db.buildingReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const log: string[] = [];

  if (body.status !== undefined && body.status !== report.status) {
    if (!isValidStatus(body.status)) return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    data.status = body.status;
    data.resolvedAt = body.status === 'RESOLU' ? new Date() : null;
    log.push(`Statut : ${statusInfo(report.status).label} → ${statusInfo(body.status).label}`);
  }
  if (body.urgency !== undefined && body.urgency !== report.urgency) {
    if (!isValidUrgency(body.urgency)) return NextResponse.json({ error: 'Urgence invalide.' }, { status: 400 });
    data.urgency = body.urgency;
    log.push(`Urgence : ${urgencyInfo(report.urgency).label} → ${urgencyInfo(body.urgency).label}`);
  }
  if (body.category !== undefined && body.category !== report.category) {
    if (!isValidCategory(body.category)) return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 });
    data.category = body.category;
    log.push(`Catégorie : ${categoryLabel(body.category)}`);
  }
  if (body.assignedToId !== undefined && (body.assignedToId || null) !== report.assignedToId) {
    const assignee = body.assignedToId
      ? await db.user.findUnique({ where: { id: body.assignedToId }, select: { id: true, name: true } })
      : null;
    if (body.assignedToId && !assignee) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 400 });
    data.assignedToId = assignee?.id ?? null;
    log.push(assignee ? `Confié à ${assignee.name}` : 'Plus personne en charge');
  }
  if (body.publicNote !== undefined) {
    const note = String(body.publicNote).trim().slice(0, 1000) || null;
    if (note !== report.publicNote) {
      data.publicNote = note;
      log.push('Message au signaleur mis à jour');
    }
  }
  if (typeof body.addResolutionPhotoUrl === 'string' && body.addResolutionPhotoUrl) {
    await db.reportPhoto.create({ data: { reportId: id, url: body.addResolutionPhotoUrl, kind: 'RESOLUTION' } });
    log.push('Photo après intervention ajoutée');
  }

  const updated = await db.buildingReport.update({ where: { id }, data });
  if (log.length) {
    await db.reportComment.create({
      data: { reportId: id, userId: session!.user.id, body: log.join(' · '), isSystem: true },
    });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await guard();
  if (error) return error;
  const { id } = await params;
  await db.buildingReport.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
