import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== 'ADMIN') redirect('/');
  return session;
}

/** Accès au module Bâtiment (signalements) : ADMIN ou BATIMENT. */
export async function requireReportManager() {
  const session = await requireSession();
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BATIMENT') redirect('/');
  return session;
}
