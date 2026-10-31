/**
 * Constantes du module « Bâtiment », sans dépendance serveur : importables aussi bien
 * par les pages serveur que par les composants exécutés dans le navigateur.
 */

/** Nom affiché sur les pages publiques (variable NEXT_PUBLIC_CHURCH_NAME). */
export const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "l'église";

export const REPORT_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: 'ELECTRICITE', label: 'Électricité / éclairage', emoji: '💡' },
  { value: 'PLOMBERIE', label: 'Plomberie / sanitaires', emoji: '🚰' },
  { value: 'CHAUFFAGE', label: 'Chauffage / climatisation', emoji: '🌡️' },
  { value: 'MOBILIER', label: 'Mobilier (chaises, tables…)', emoji: '🪑' },
  { value: 'PORTES_FENETRES', label: 'Portes / fenêtres / serrures', emoji: '🚪' },
  { value: 'PROPRETE', label: 'Propreté / nuisibles', emoji: '🧹' },
  { value: 'SECURITE', label: 'Sécurité (extincteur, issue de secours…)', emoji: '🧯' },
  { value: 'EXTERIEUR', label: 'Extérieur / parking / toiture', emoji: '🌳' },
  { value: 'AUDIOVISUEL', label: 'Son / vidéo / projection', emoji: '🎤' },
  { value: 'AUTRE', label: 'Autre', emoji: '📝' },
];

export const REPORT_URGENCIES: { value: string; label: string; hint: string; dot: string }[] = [
  { value: 'FAIBLE', label: 'Pas pressé', hint: 'Peut attendre', dot: 'bg-ink-soft' },
  { value: 'NORMALE', label: 'Normal', hint: 'À régler dans les semaines à venir', dot: 'bg-signal' },
  { value: 'URGENTE', label: 'Urgent', hint: 'Gêne les cultes ou les activités', dot: 'bg-amber' },
  { value: 'DANGER', label: 'Danger', hint: 'Risque pour la sécurité des personnes', dot: 'bg-danger' },
];

export const REPORT_STATUSES: { value: string; label: string; dot: string }[] = [
  { value: 'NOUVEAU', label: 'Nouveau', dot: 'bg-amber' },
  { value: 'EN_COURS', label: 'En cours', dot: 'bg-signal' },
  { value: 'RESOLU', label: 'Résolu', dot: 'bg-ok' },
  { value: 'REJETE', label: 'Classé sans suite', dot: 'bg-ink-soft' },
];

export const OPEN_STATUSES = ['NOUVEAU', 'EN_COURS'];

export const categoryLabel = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const categoryEmoji = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.emoji ?? '📝';
export const urgencyInfo = (v: string) => REPORT_URGENCIES.find((u) => u.value === v) ?? REPORT_URGENCIES[1];
export const statusInfo = (v: string) => REPORT_STATUSES.find((s) => s.value === v) ?? REPORT_STATUSES[0];

export const isValidCategory = (v: unknown): v is string => REPORT_CATEGORIES.some((c) => c.value === v);
export const isValidUrgency = (v: unknown): v is string => REPORT_URGENCIES.some((u) => u.value === v);
export const isValidStatus = (v: unknown): v is string => REPORT_STATUSES.some((s) => s.value === v);

/** Qui peut voir et traiter les signalements. */
export function canManageReports(role?: string | null) {
  return role === 'ADMIN' || role === 'BATIMENT';
}

export const MAX_REPORT_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // les photos sont compressées côté téléphone avant envoi

/** Numéro d'urgence affiché en cas de « Danger » (112 en Europe, 911 au Canada…). */
export const EMERGENCY_NUMBER = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || '112';
