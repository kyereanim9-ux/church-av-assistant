import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

/**
 * En production auto-hébergée (`next start`), Next.js ne sert pas les fichiers ajoutés dans
 * /public après la compilation : les photos envoyées seraient en 404. Cette route prend le
 * relais pour /uploads/<fichier>. (Sur Vercel, les photos sont sur Vercel Blob : non concerné.)
 */
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  const type = TYPES[path.extname(safe).toLowerCase()];
  if (!type || safe !== name) return new NextResponse('Not found', { status: 404 });
  try {
    const data = await readFile(path.join(process.cwd(), 'public', 'uploads', safe));
    return new NextResponse(new Uint8Array(data), {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
