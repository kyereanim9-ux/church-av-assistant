import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_UTILISATION: 'En utilisation',
  A_VERIFIER: 'À vérifier',
  HORS_SERVICE: 'Hors service',
};

export const STATUS_DOT: Record<string, string> = {
  DISPONIBLE: 'bg-ok',
  EN_UTILISATION: 'bg-signal',
  A_VERIFIER: 'bg-amber',
  HORS_SERVICE: 'bg-danger',
};

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
