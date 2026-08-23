import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { askAIWithImage } from '@/lib/ai';
import { searchEntities } from '@/lib/search';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Tu es un assistant d'identification de matériel audiovisuel (caméras, micros,
consoles, câbles, écrans, etc.). On te montre une photo d'un équipement. Réponds UNIQUEMENT avec un
objet JSON valide (sans texte autour, sans balises markdown), au format exact suivant :
{
  "brand": string | null,
  "model": string | null,
  "category": string | null,
  "description": string,
  "visibleFeatures": string,
  "confidence": "faible" | "moyenne" | "élevée"
}
Ne prétends jamais être certain si l'image ne permet pas une identification fiable : utilise alors
"confidence": "faible" et laisse brand/model à null si tu ne peux pas les déterminer avec un minimum
de certitude.`;

function parseJSON(text: string) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucune image reçue.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Seules les images sont acceptées.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  const result = await askAIWithImage(
    SYSTEM_PROMPT,
    'Identifie cet équipement audiovisuel.',
    base64,
    file.type
  );

  if (!result.available) {
    return NextResponse.json({ identification: null, matches: [], error: result.reason });
  }

  const identification = parseJSON(result.text);
  if (!identification) {
    return NextResponse.json({
      identification: null,
      matches: [],
      error: "L'IA n'a pas renvoyé un résultat exploitable. Réessayez avec une photo plus nette.",
    });
  }

  const queryTerms = [identification.brand, identification.model, identification.category]
    .filter(Boolean)
    .join(' ');
  const matches = queryTerms ? (await searchEntities(queryTerms)).equipment : [];

  return NextResponse.json({ identification, matches });
}
