/**
 * Couche d'abstraction IA.
 *
 * Toute l'application (Assistant IA, identification photo, analyse
 * automatique de fiche matériel) passe par les deux fonctions ci-dessous :
 * `askAI` (texte) et `askAIWithImage` (texte + image).
 *
 * Pour changer de fournisseur IA, il suffit de modifier la variable
 * d'environnement AI_PROVIDER ("anthropic" | "openai") et la clé API
 * correspondante — aucun autre fichier de l'application n'a besoin d'être
 * modifié. Si aucune clé n'est configurée, les fonctions renvoient
 * `available: false` et les pages concernées affichent un message clair
 * au lieu de planter, conformément à la consigne "commencer gratuitement".
 */

type ChatResult = { available: true; text: string } | { available: false; reason: string };

const PROVIDER = process.env.AI_PROVIDER || 'anthropic';

function isConfigured(): boolean {
  if (PROVIDER === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (PROVIDER === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

export async function askAI(systemPrompt: string, userMessage: string): Promise<ChatResult> {
  if (!isConfigured()) {
    return {
      available: false,
      reason:
        "Aucune clé IA n'est configurée (ANTHROPIC_API_KEY ou OPENAI_API_KEY). L'administrateur peut en ajouter une dans les variables d'environnement pour activer l'Assistant IA.",
    };
  }

  try {
    if (PROVIDER === 'anthropic') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const text = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n')
        .trim();
      return { available: true, text };
    }

    if (PROVIDER === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });
      const data = await res.json();
      return { available: true, text: data.choices?.[0]?.message?.content ?? '' };
    }

    return { available: false, reason: `Fournisseur IA inconnu : ${PROVIDER}` };
  } catch (err) {
    console.error('Erreur IA', err);
    return { available: false, reason: "L'assistant IA est momentanément indisponible. Réessayez dans un instant." };
  }
}

export async function askAIWithImage(
  systemPrompt: string,
  userMessage: string,
  imageBase64: string,
  mediaType: string
): Promise<ChatResult> {
  if (!isConfigured()) {
    return {
      available: false,
      reason:
        "Aucune clé IA n'est configurée. L'administrateur peut ajouter ANTHROPIC_API_KEY pour activer l'identification photo.",
    };
  }

  try {
    if (PROVIDER === 'anthropic') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 },
              },
              { type: 'text', text: userMessage },
            ],
          },
        ],
      });
      const text = response.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n')
        .trim();
      return { available: true, text };
    }

    if (PROVIDER === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userMessage },
                { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
              ],
            },
          ],
        }),
      });
      const data = await res.json();
      return { available: true, text: data.choices?.[0]?.message?.content ?? '' };
    }

    return { available: false, reason: `Fournisseur IA inconnu : ${PROVIDER}` };
  } catch (err) {
    console.error('Erreur IA (image)', err);
    return { available: false, reason: "L'analyse de la photo a échoué. Réessayez dans un instant." };
  }
}
