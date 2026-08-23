import { db } from '@/lib/db';

export async function searchEntities(query: string) {
  const q = query.trim();
  if (!q) return { equipment: [], rooms: [], installations: [] };

  const [equipment, rooms, installations] = await Promise.all([
    db.equipment.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
          { room: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { category: true, room: true },
      take: 20,
    }),
    db.room.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { floor: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    }),
    db.installation.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { purpose: { contains: q, mode: 'insensitive' } },
          { room: { name: { contains: q, mode: 'insensitive' } } },
          { equipment: { some: { equipment: { name: { contains: q, mode: 'insensitive' } } } } },
        ],
      },
      include: { room: true },
      take: 20,
    }),
  ]);

  return { equipment, rooms, installations };
}

/**
 * Construit un contexte textuel, à partir de la base de données, pour
 * l'Assistant IA. Le système-prompt de l'assistant doit prioriser ces
 * informations et indiquer clairement quand rien n'a été trouvé.
 */
export async function buildAIContext(query: string): Promise<string> {
  const { equipment, rooms, installations } = await searchEntities(query);

  // Si la recherche par mots-clés ne donne rien, on élargit avec un
  // échantillon global pour laisser une chance à l'IA de répondre à des
  // questions plus vagues ("qu'est-ce qui est disponible en ce moment ?").
  const fallbackEquipment = equipment.length === 0
    ? await db.equipment.findMany({ include: { category: true, room: true }, take: 15, orderBy: { updatedAt: 'desc' } })
    : equipment;
  const fallbackRooms = rooms.length === 0 ? await db.room.findMany({ take: 10 }) : rooms;
  const fallbackInstallations = installations.length === 0
    ? await db.installation.findMany({ include: { room: true, steps: true }, take: 5, orderBy: { updatedAt: 'desc' } })
    : await db.installation.findMany({
        where: { id: { in: installations.map((i) => i.id) } },
        include: { room: true, steps: { orderBy: { order: 'asc' } } },
      });

  const parts: string[] = [];

  if (fallbackEquipment.length) {
    parts.push('MATÉRIEL :');
    for (const e of fallbackEquipment) {
      parts.push(
        `- ${e.name}${e.brand ? ` (${e.brand} ${e.model ?? ''})` : ''} | catégorie: ${e.category?.name ?? 'N/A'} | état: ${e.status} | salle: ${e.room?.name ?? 'non assignée'} | emplacement: ${e.location ?? 'N/A'}${e.instructions ? ` | instructions: ${e.instructions.slice(0, 300)}` : ''}${e.cablesNeeded ? ` | câbles: ${e.cablesNeeded}` : ''}`
      );
    }
  }

  if (fallbackRooms.length) {
    parts.push('\nSALLES :');
    for (const r of fallbackRooms) {
      parts.push(`- ${r.name} (étage: ${r.floor ?? 'N/A'})${r.description ? ` — ${r.description}` : ''}`);
    }
  }

  if (fallbackInstallations.length) {
    parts.push('\nINSTALLATIONS :');
    for (const i of fallbackInstallations) {
      const chain = i.steps?.map((s) => s.label).join(' → ');
      parts.push(
        `- "${i.name}" en salle ${i.room?.name ?? 'N/A'}${i.purpose ? ` | objectif: ${i.purpose}` : ''}${chain ? ` | schéma: ${chain}` : ''}${i.knownIssues ? ` | problème connu: ${i.knownIssues}` : ''}${i.knownFixes ? ` | solution: ${i.knownFixes}` : ''}`
      );
    }
  }

  return parts.length ? parts.join('\n') : "(Aucune donnée pertinente trouvée dans la base de données pour cette question.)";
}
