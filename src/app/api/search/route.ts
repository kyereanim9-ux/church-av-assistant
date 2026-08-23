import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchEntities } from '@/lib/search';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const q = new URL(req.url).searchParams.get('q') || '';
  const results = await searchEntities(q);
  return NextResponse.json(results);
}
