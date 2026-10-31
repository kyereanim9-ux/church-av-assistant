import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { regenerateReportAccessKey } from '@/lib/reports';

/** Régénère la clé du QR code : tous les anciens QR codes cessent de fonctionner. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });
  }
  await regenerateReportAccessKey();
  return NextResponse.json({ ok: true });
}
