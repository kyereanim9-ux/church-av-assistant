import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const categories = await db.category.findMany({
    include: { _count: { select: { equipment: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul un administrateur peut ajouter une catégorie.' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 });

  const existing = await db.category.findUnique({ where: { name: body.name } });
  if (existing) return NextResponse.json({ error: 'Cette catégorie existe déjà.' }, { status: 409 });

  const category = await db.category.create({ data: { name: body.name, icon: body.icon || null } });
  return NextResponse.json(category, { status: 201 });
}
