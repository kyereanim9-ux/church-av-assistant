import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveUpload } from '@/lib/storage';
import {
  MAX_PHOTO_BYTES, MAX_REPORT_PHOTOS, generateReference, isRateLimited, isValidCategory,
  isValidReportAccessKey, isValidUrgency,
} from '@/lib/reports';

export const runtime = 'nodejs';

// Seuls ces formats sont acceptés ; l'extension enregistrée est imposée par le type
// (jamais par le nom de fichier envoyé) pour qu'aucun fichier piégé ne soit servi.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const str = (v: FormDataEntryValue | null, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/**
 * Création PUBLIQUE d'un signalement (sans compte), protégée par la clé secrète du QR code.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Trop de signalements envoyés en peu de temps. Réessayez dans quelques minutes.' },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Envoi invalide (photos trop lourdes ?).' }, { status: 400 });
  }

  if (!(await isValidReportAccessKey(str(form.get('key'), 100)))) {
    return NextResponse.json(
      { error: "Ce lien de signalement n'est plus valide. Scannez à nouveau le QR code affiché dans l'église." },
      { status: 403 }
    );
  }

  // Champ piège invisible : un humain le laisse vide, un robot le remplit.
  if (str(form.get('website'), 200)) {
    return NextResponse.json({ reference: 'MERCI-0000' }, { status: 201 });
  }

  const description = str(form.get('description'), 2000);
  if (description.length < 5) {
    return NextResponse.json({ error: 'Décrivez le problème en quelques mots.' }, { status: 400 });
  }

  const category = str(form.get('category'), 40);
  const urgency = str(form.get('urgency'), 20);
  let roomId: string | null = str(form.get('roomId'), 60) || null;
  if (roomId && !(await db.room.findUnique({ where: { id: roomId }, select: { id: true } }))) roomId = null;

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_REPORT_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_REPORT_PHOTOS} photos.` }, { status: 400 });
  }
  for (const f of files) {
    if (!ALLOWED_TYPES[f.type]) return NextResponse.json({ error: 'Seules les photos sont acceptées.' }, { status: 400 });
    if (f.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Une photo est trop volumineuse.' }, { status: 400 });
  }

  const urls: string[] = [];
  for (const f of files) {
    urls.push(await saveUpload(Buffer.from(await f.arrayBuffer()), `photo${ALLOWED_TYPES[f.type]}`));
  }

  // Collision de référence quasi impossible, mais on réessaie par sécurité.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const report = await db.buildingReport.create({
        data: {
          reference: generateReference(),
          description,
          category: isValidCategory(category) ? category : 'AUTRE',
          urgency: isValidUrgency(urgency) ? urgency : 'NORMALE',
          roomId,
          location: str(form.get('location'), 200) || null,
          reporterName: str(form.get('reporterName'), 100) || null,
          reporterContact: str(form.get('reporterContact'), 150) || null,
          photos: { create: urls.map((url) => ({ url, kind: 'SIGNALEMENT' })) },
        },
        select: { reference: true },
      });
      return NextResponse.json({ reference: report.reference }, { status: 201 });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
  }
  return NextResponse.json({ error: 'Erreur, réessayez.' }, { status: 500 });
}
