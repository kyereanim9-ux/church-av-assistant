import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { askAI } from '@/lib/ai';
import { buildAIContext } from '@/lib/search';

const SYSTEM_PROMPT = `Tu es l'Assistant IA audiovisuel d'une église. Tu aides les membres de l'équipe
audiovisuelle (souvent non-techniciens) à retrouver du matériel, comprendre les installations et
les branchements, et dépanner des problèmes simples.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT en français.
2. Pour toute question concernant le matériel, les salles ou les installations de l'église, base ta
   réponse EN PRIORITÉ sur les données fournies ci-dessous (extraites de la base de données de
   l'application). Ne les invente jamais.
3. Si l'information demandée n'apparaît PAS dans les données fournies, dis clairement et explicitement :
   "Je ne trouve pas cette information dans la base de données." Tu peux ensuite, si tu le souhaites,
   proposer une piste générale — mais indique alors explicitement qu'il s'agit de connaissances
   générales et non d'une information enregistrée dans l'application.
4. Sois concis, concret, et donne des étapes numérotées quand c'est utile (câblage, dépannage).
5. Ne mentionne jamais que tu es un modèle de langage ; réponds simplement comme un assistant technique.

DONNÉES DE LA BASE DE DONNÉES (contexte pertinent pour cette question) :
`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const question: string = (body.question || '').trim();
  if (!question) return NextResponse.json({ error: 'Question vide.' }, { status: 400 });

  const context = await buildAIContext(question);
  const result = await askAI(SYSTEM_PROMPT + context, question);

  if (!result.available) {
    return NextResponse.json({ answer: null, error: result.reason }, { status: 200 });
  }

  return NextResponse.json({ answer: result.text });
}
