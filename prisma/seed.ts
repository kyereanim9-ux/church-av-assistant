import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  'Caméra', 'Objectif', 'Trépied', 'Microphone', 'Console audio', 'Enceinte',
  'Écran', 'Projecteur', 'Ordinateur', 'Éclairage', 'Carte mémoire', 'Câble',
  'Adaptateur', 'Convertisseur', 'Switch réseau', 'Capture vidéo',
  'Interface audio', 'Enregistreur', 'Streaming', 'Accessoire', 'Autre',
];

async function main() {
  console.log('Seed : catégories…');
  const categories: Record<string, string> = {};
  for (const name of DEFAULT_CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, isDefault: true },
    });
    categories[name] = cat.id;
  }

  console.log('Seed : utilisateurs…');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@eglise.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme123';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrateur AV',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'ADMIN',
    },
  });
  const member = await prisma.user.upsert({
    where: { email: 'membre@eglise.local' },
    update: {},
    create: {
      name: 'Membre Équipe AV',
      email: 'membre@eglise.local',
      passwordHash: await bcrypt.hash('membre123', 10),
      role: 'MEMBER',
    },
  });

  console.log('Seed : salles…');
  const salleTechniquePrincipale = await prisma.room.create({
    data: {
      name: 'DC Room du salle principale',
      floor: 'RDC',
      description: 'Salle technique associée à la salle principale.',
      responsableId: admin.id,
    },
  });
  const sallePrincipale = await prisma.room.create({
    data: {
      name: 'Salle principale',
      floor: 'RDC',
      description: "Salle principale de l'église.",
      responsableId: admin.id,
    },
  });
  const dcRoom1F = await prisma.room.create({
    data: {
      name: 'DC Room 1F',
      floor: '1F',
      description: 'Salle technique située au 1er étage.',
      responsableId: admin.id,
    },
  });
  const salle1F = await prisma.room.create({
    data: {
      name: 'Salle 1F',
      floor: '1F',
      description: 'Salle située au 1er étage.',
    },
  });

  console.log('Seed : matériel…');
  const fx9 = await prisma.equipment.create({
    data: {
      name: 'Sony FX9',
      categoryId: categories['Caméra'],
      brand: 'Sony',
      model: 'FX9',
      serialNumber: 'FX9-0001',
      quantity: 1,
      status: 'EN_UTILISATION',
      roomId: sallePrincipale.id,
      location: 'Pied de caméra, fond de salle',
      description: 'Caméra principale utilisée pour le streaming et les enregistrements.',
      usage: "S'allume avec l'interrupteur latéral. Sortie vidéo par port SDI à l'arrière.",
      instructions:
        '1. Fixer la caméra sur le trépied.\n2. Brancher le câble SDI en sortie caméra.\n3. Relier le câble SDI au convertisseur dans le DC Room.\n4. Vérifier le signal sur le moniteur.',
      cablesNeeded: 'Câble SDI (min. 10m)',
      accessories: 'Batterie V-Lock, trépied vidéo',
    },
  });
  const a7iii = await prisma.equipment.create({
    data: {
      name: 'Sony A7 III',
      categoryId: categories['Caméra'],
      brand: 'Sony',
      model: 'A7 III',
      serialNumber: 'A7III-0002',
      quantity: 1,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Armoire matériel, étagère 1',
      description: 'Caméra secondaire / plan large ou captation photo.',
      usage: 'Utiliser en mode vidéo pour un second angle.',
      cablesNeeded: 'Câble HDMI',
    },
  });
  const micro = await prisma.equipment.create({
    data: {
      name: 'Microphone sans fil',
      categoryId: categories['Microphone'],
      brand: 'Sennheiser',
      model: 'EW 100 G4',
      quantity: 2,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Mallette micros, tiroir 2',
      description: 'Micro cravate / main pour la prise de parole.',
      usage: "Allumer le récepteur puis l'émetteur. Vérifier le canal identique sur les deux.",
      accessories: 'Piles AA, pince cravate',
    },
  });
  const console_ = await prisma.equipment.create({
    data: {
      name: 'Console audio',
      categoryId: categories['Console audio'],
      brand: 'Yamaha',
      model: 'MG16XU',
      quantity: 1,
      status: 'EN_UTILISATION',
      roomId: salleTechniquePrincipale.id,
      location: 'Rack technique',
      description: 'Console de mixage audio principale.',
      usage: 'Chaque micro est assigné à une tranche. Le master sort vers le système de streaming.',
    },
  });
  const convertisseur = await prisma.equipment.create({
    data: {
      name: 'Convertisseur SDI',
      categoryId: categories['Convertisseur'],
      brand: 'Blackmagic',
      model: 'Mini Converter SDI to HDMI',
      quantity: 1,
      status: 'EN_UTILISATION',
      roomId: salleTechniquePrincipale.id,
      location: 'Rack technique, tiroir 1',
      description: 'Convertit le signal SDI caméra en HDMI pour capture.',
      usage: "Entrée SDI depuis la caméra, sortie HDMI vers l'ordinateur de streaming.",
      cablesNeeded: 'Câble SDI en entrée, câble HDMI en sortie',
    },
  });
  const switchReseau = await prisma.equipment.create({
    data: {
      name: 'Switch réseau',
      categoryId: categories['Switch réseau'],
      brand: 'Netgear',
      model: 'GS108',
      quantity: 1,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Rack technique',
      description: 'Distribue le réseau local au matériel de streaming.',
    },
  });
  const moniteur = await prisma.equipment.create({
    data: {
      name: 'Moniteur',
      categoryId: categories['Écran'],
      brand: 'Blackmagic',
      model: 'SmartView 4K',
      quantity: 1,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Rack technique',
      description: 'Contrôle visuel du retour caméra.',
    },
  });
  const ordiStreaming = await prisma.equipment.create({
    data: {
      name: 'Ordinateur streaming',
      categoryId: categories['Ordinateur'],
      brand: 'Dell',
      model: 'Precision 3660',
      quantity: 1,
      status: 'EN_UTILISATION',
      roomId: salleTechniquePrincipale.id,
      location: 'Rack technique',
      description: "Fait tourner OBS pour l'encodage et la diffusion.",
      usage: 'Ouvrir OBS, vérifier les sources, cliquer sur "Start Streaming".',
    },
  });
  const cableSDI = await prisma.equipment.create({
    data: {
      name: 'Câble SDI',
      categoryId: categories['Câble'],
      quantity: 4,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Panière câbles',
      description: 'Câbles SDI de 10 à 15 mètres.',
    },
  });
  const cableHDMI = await prisma.equipment.create({
    data: {
      name: 'Câble HDMI',
      categoryId: categories['Câble'],
      quantity: 5,
      status: 'DISPONIBLE',
      roomId: salleTechniquePrincipale.id,
      location: 'Panière câbles',
      description: 'Câbles HDMI de 2 à 5 mètres.',
    },
  });

  // Un équipement à vérifier, pour peupler le tableau de bord
  await prisma.equipment.create({
    data: {
      name: 'Enceinte de façade',
      categoryId: categories['Enceinte'],
      brand: 'JBL',
      model: 'EON615',
      quantity: 1,
      status: 'A_VERIFIER',
      roomId: sallePrincipale.id,
      location: 'Côté scène jardin',
      description: 'Grésillement signalé le dernier dimanche.',
    },
  });

  console.log('Seed : installation + schéma de branchement…');
  const installation = await prisma.installation.create({
    data: {
      name: 'Streaming — Salle principale',
      roomId: sallePrincipale.id,
      purpose: 'Diffuser le culte en direct sur YouTube.',
      configuration: 'OBS configuré avec scène "Culte" (caméra + logo + minuteur).',
      settings: 'Résolution 1080p, 30 fps, bitrate 4500 kbps.',
      instructions:
        "1. Allumer la caméra Sony FX9 et vérifier la mise au point.\n2. Vérifier que le câble SDI relie la caméra au convertisseur.\n3. Allumer le convertisseur SDI vers HDMI.\n4. Vérifier que le switch réseau et le moniteur sont alimentés.\n5. Sur l'ordinateur de streaming, ouvrir OBS.\n6. Vérifier la source caméra dans OBS.\n7. Cliquer sur \"Start Streaming\".",
      knownIssues: "Pas d'image dans OBS malgré la caméra allumée.",
      knownFixes: "Vérifier le câble SDI entre la caméra et le convertisseur, puis redémarrer le convertisseur.",
      createdById: admin.id,
      equipment: {
        create: [
          { equipmentId: fx9.id },
          { equipmentId: convertisseur.id },
          { equipmentId: switchReseau.id },
          { equipmentId: ordiStreaming.id },
          { equipmentId: cableSDI.id },
        ],
      },
      steps: {
        create: [
          { order: 1, label: 'Caméra Sony FX9', type: 'EQUIPEMENT', equipmentId: fx9.id },
          { order: 2, label: 'Câble SDI', type: 'CABLE', cableType: 'SDI', equipmentId: cableSDI.id },
          { order: 3, label: 'Convertisseur SDI → HDMI', type: 'EQUIPEMENT', equipmentId: convertisseur.id },
          { order: 4, label: 'Switch réseau', type: 'EQUIPEMENT', equipmentId: switchReseau.id },
          { order: 5, label: 'Ordinateur streaming', type: 'EQUIPEMENT', equipmentId: ordiStreaming.id },
          { order: 6, label: 'OBS', type: 'LOGICIEL' },
          { order: 7, label: 'Streaming YouTube', type: 'SORTIE' },
        ],
      },
    },
  });

  await prisma.history.createMany({
    data: [
      {
        action: 'Équipement ajouté',
        entityType: 'Equipment',
        entityId: fx9.id,
        description: 'Sony FX9 ajouté et installé en Salle principale.',
        userId: admin.id,
      },
      {
        action: 'Installation créée',
        entityType: 'Installation',
        entityId: installation.id,
        description: 'Installation "Streaming — Salle principale" créée.',
        userId: admin.id,
      },
    ],
  });

  console.log('✔ Seed terminé.');
  console.log(`   Connexion admin : ${adminEmail} / ${adminPassword}`);
  console.log('   Connexion membre : membre@eglise.local / membre123');
  void member;
  void a7iii;
  void micro;
  void console_;
  void moniteur;
  void cableHDMI;
  void dcRoom1F;
  void salle1F;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
