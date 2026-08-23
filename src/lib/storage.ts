/**
 * Stockage des photos.
 *
 * - En local / auto-hébergé : écriture sur disque dans /public/uploads (gratuit, zéro
 *   configuration).
 * - Sur Vercel : le disque n'est pas persistant entre les requêtes, donc dès que la
 *   variable d'environnement BLOB_READ_WRITE_TOKEN est présente (ajoutée automatiquement
 *   quand vous activez Vercel Blob sur le projet, gratuit sur le plan Hobby), le stockage
 *   bascule automatiquement sur Vercel Blob. Rien d'autre à changer dans le reste de l'app :
 *   tout le code appelle uniquement `saveUpload()`.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveUpload(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType: guessContentType(ext),
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

function guessContentType(ext: string) {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
