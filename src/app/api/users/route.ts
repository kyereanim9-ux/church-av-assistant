import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'Nom, email et mot de passe sont obligatoires.' }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 409 });

  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: body.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
