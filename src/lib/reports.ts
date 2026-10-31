/**
 * Module « Bâtiment » — signalements envoyés par les fidèles via QR code.
 *
 * Principe d'accès :
 * - Les personnes qui signalent n'ont pas de compte. Elles ouvrent un lien secret
 *   (/signaler/<clé>) encodé dans le QR code affiché dans l'église.
 * - La clé est stockée en base (table AppSetting). Un administrateur peut la régénérer :
 *   les anciens QR codes cessent alors immédiatement de fonctionner (utile si un QR code
 *   a circulé hors de l'église).
 * - Seuls les rôles ADMIN et BATIMENT voient et traitent les signalements.
 */

import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';

export * from '@/lib/report-constants';

// ── Référence lisible (donnée au signaleur pour suivre son signalement) ──────────
// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). 8 caractères ≈ 10^11 combinaisons :
// impossible à deviner, donc la page de suivi peut rester publique sans exposer les autres.
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReference() {
  let s = '';
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function normalizeReference(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : null;
}

// ── Clé secrète du QR code ───────────────────────────────────────────────────
const ACCESS_KEY_SETTING = 'report_access_key';

export async function getReportAccessKey(): Promise<string> {
  const existing = await db.appSetting.findUnique({ where: { key: ACCESS_KEY_SETTING } });
  if (existing) return existing.value;
  const value = randomBytes(12).toString('base64url');
  // upsert : évite un doublon si deux requêtes arrivent en même temps
  const created = await db.appSetting.upsert({
    where: { key: ACCESS_KEY_SETTING },
    update: {},
    create: { key: ACCESS_KEY_SETTING, value },
  });
  return created.value;
}

export async function regenerateReportAccessKey(): Promise<string> {
  const value = randomBytes(12).toString('base64url');
  await db.appSetting.upsert({
    where: { key: ACCESS_KEY_SETTING },
    update: { value },
    create: { key: ACCESS_KEY_SETTING, value },
  });
  return value;
}

export async function isValidReportAccessKey(candidate: string | null | undefined) {
  if (!candidate) return false;
  const key = await getReportAccessKey();
  const a = Buffer.from(candidate);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Anti-spam très simple (par adresse IP, en mémoire) ──────────────────────────
// Sur Vercel la mémoire n'est pas partagée entre instances : c'est un garde-fou de base,
// complété par le champ piège (honeypot) du formulaire et la clé secrète du QR code.
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;

export function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export function getBaseUrl(headers: Headers) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost:3000';
  const proto = headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
