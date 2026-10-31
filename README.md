# Church AV Assistant

Le manuel audiovisuel intelligent de l'équipe technique de l'église : matériel, salles,
installations documentées, recherche globale, identification de matériel par photo, et un
assistant IA qui répond en priorité à partir de votre base de données.

Ceci est une application **réelle et fonctionnelle** (Next.js + base de données + API), pas une
maquette. Le nom "Church AV Assistant" est configurable en un seul endroit
(`src/app/layout.tsx`, métadonnée `title`, + logo dans `Sidebar.tsx` / `TopBar.tsx` / `login/page.tsx`).

## 1. Choix techniques et pourquoi

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15 (App Router, TypeScript) | Un seul projet pour le frontend et l'API. Déploiement gratuit sur Vercel. |
| Base de données | Prisma ORM + **PostgreSQL** (Neon, gratuit) | Fonctionne aussi bien en local qu'en production ; Neon s'intègre en un clic à Vercel. |
| Authentification | NextAuth (identifiants + mot de passe, sessions JWT) | Gratuit, pas de service tiers, rôles Administrateur / Membre. |
| IA | Couche d'abstraction (`src/lib/ai.ts`) supportant Anthropic **ou** OpenAI | L'app fonctionne sans clé IA (message clair affiché). Ajoutez une clé quand vous êtes prêt·e ; changez de fournisseur via une seule variable d'environnement. |
| Photos | `src/lib/storage.ts` : disque local en dev, **Vercel Blob** (gratuit) en production, bascule automatique | Gratuit dans les deux cas, aucun code à changer selon l'environnement. |
| Style | Tailwind CSS, mobile-first, mode sombre | Prioritaire sur téléphone comme demandé, léger, pas de dépendance payante. |

## 2. Ouvrir l'application sur votre téléphone ET votre ordinateur (déploiement gratuit)

Ce projet est prêt à être déployé sur **Vercel** (gratuit, plan Hobby, usage personnel/associatif),
avec une base de données **Neon** (Postgres gratuit). Une fois déployée, l'application a une
adresse web (ex : `https://church-av-assistant.vercel.app`) accessible depuis n'importe quel
téléphone, tablette ou ordinateur — comme n'importe quel site.

Prérequis : Node.js 20+, un compte [Vercel](https://vercel.com) (gratuit, connexion possible avec
GitHub, GitLab ou email) et un compte [Neon](https://neon.tech) (gratuit).

### Étape 1 — Créer la base de données Neon
1. Sur [neon.tech](https://neon.tech), créez un projet gratuit.
2. Copiez la **chaîne de connexion** (`DATABASE_URL`, commence par `postgresql://...`).

### Étape 2 — Installer les dépendances et préparer la base
```bash
cd church-av-assistant
npm install
cp .env.example .env
```
Dans `.env`, collez votre `DATABASE_URL` Neon et générez un secret :
```bash
# Génère une valeur aléatoire à coller dans NEXTAUTH_SECRET
openssl rand -base64 32
```
Puis :
```bash
npx prisma db push     # crée les tables dans votre base Neon
npm run db:seed        # charge les données de démonstration
```

### Étape 3 — Déployer sur Vercel
```bash
npm install -g vercel   # une seule fois
vercel login            # ouvre une page web pour vous connecter
vercel                  # première fois : répondez aux questions (dossier courant, etc.)
```
Puis ajoutez les variables d'environnement (reprenez les valeurs de votre `.env`) :
```bash
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production   # ex : https://votre-projet.vercel.app
vercel env add AI_PROVIDER production        # facultatif, ex : anthropic
vercel env add ANTHROPIC_API_KEY production   # facultatif
```
Puis déployez en production :
```bash
vercel --prod
```
Vercel affiche l'adresse finale (ex : `https://church-av-assistant.vercel.app`). C'est cette
adresse que toute l'équipe ouvre — sur téléphone comme sur ordinateur, comme un site web normal.
Vous pouvez aussi ajouter un raccourci sur l'écran d'accueil du téléphone (Safari/Chrome →
"Ajouter à l'écran d'accueil") pour que ça ressemble à une vraie application.

### Étape 4 — Activer le stockage des photos (recommandé)
Sur le tableau de bord Vercel du projet : **Storage → Create Database → Blob**, plan gratuit.
Une fois activé, la variable `BLOB_READ_WRITE_TOKEN` est ajoutée automatiquement par Vercel —
rien à copier manuellement. Sans cette étape, l'ajout de photos ne fonctionnera pas correctement
en production (le disque de Vercel n'est pas permanent), mais le reste de l'application
fonctionne normalement.

### Mises à jour ultérieures
Après une modification du code, un simple `vercel --prod` republie la nouvelle version. Pour un
vrai flux de déploiement continu (déploiement automatique à chaque modification), poussez plutôt
le projet sur un dépôt GitHub et importez-le depuis le tableau de bord Vercel
(*Add New → Project → Import Git Repository*) : Vercel redéploiera alors automatiquement à chaque
`git push`.

## 3. Développer en local (au quotidien)

```bash
npm run dev     # http://localhost:3000, utilise le DATABASE_URL de votre .env
```
Vous pouvez utiliser la même base Neon qu'en production, ou créer une **branche Neon** séparée
(gratuite, en un clic dans Neon) pour développer sans toucher aux données réelles de l'équipe.

Comptes de démonstration créés par le seed :
- **Administrateur** : `admin@eglise.local` / `changeme123`
- **Membre** : `membre@eglise.local` / `membre123`

⚠️ Changez ces mots de passe (page Administration → Utilisateurs) avant toute utilisation réelle
par l'équipe.

## 4. Activer l'Assistant IA et l'identification photo

Sans clé IA configurée, l'app reste pleinement utilisable (fiches, salles, installations,
recherche) et affiche un message clair à la place des réponses IA. Pour activer l'IA, renseignez
`ANTHROPIC_API_KEY` (ou `AI_PROVIDER=openai` + `OPENAI_API_KEY`) dans `.env` en local, ou via
`vercel env add` pour la production, puis redéployez.

## 5. Ce qui est livré dans cette v1 (voir cahier des charges, point 27)

Authentification (rôles admin/membre) · Tableau de bord · Salles (CRUD + fiche + matériel/
installations associés) · Matériel (CRUD + fiche complète + historique) · Installations
documentées avec **schéma de branchement visuel** (chaîne de connexion ordonnée, cliquable) ·
Recherche globale · Assistant IA basé sur la base de données · Upload de photos · Identification
de matériel par photo avec correspondance automatique dans la base · Catégories et salles
ajoutables sans toucher au code (Administration) · Historique des modifications importantes.

## 5 bis. Module « Bâtiment » : signalements par QR code

Les fidèles signalent un problème dans le bâtiment (fuite, ampoule grillée, chaise cassée…)
**sans créer de compte** : ils scannent un QR code affiché dans l'église, prennent une photo,
décrivent le problème et l'envoient. Les responsables voient tout dans l'application.

**Parcours du fidèle (téléphone)**
1. Scanne le QR code → page `/signaler/<clé secrète>` (la salle est pré-remplie si c'est le QR
   code d'une salle).
2. Photo(s) (appareil photo ou galerie, 3 max, compressées automatiquement sur le téléphone),
   description, salle / emplacement, type, niveau d'urgence, coordonnées facultatives.
3. Reçoit un **numéro de suivi** (ex. `K7F3-9QPA`) et peut suivre l'état sur `/suivi/<numéro>`
   (Reçu → Pris en charge → Résolu) et lire le message de l'équipe. Ses numéros sont gardés sur
   son téléphone.

**Côté responsables** (menu **Bâtiment**, visible pour les rôles *Administrateur* et
*Responsable bâtiment*)
- Liste des signalements, triés par urgence (Danger en premier), filtres par statut et urgence.
- Fiche : photos, emplacement, contact cliquable (appel / email), statut, personne en charge,
  message visible par le signaleur, commentaires internes, photo « après intervention », journal
  automatique de chaque changement.
- Page **QR codes** (`/batiment/qr`) : un QR code général + un par salle, prêts à imprimer
  (une affiche par page A4). Un administrateur peut générer une **nouvelle clé** si un QR code a
  circulé hors de l'église : les anciens cessent alors de fonctionner.
- Encart sur le tableau de bord avec le nombre de signalements à traiter.

**Rôle « Responsable bâtiment »** : à créer dans Administration → Utilisateurs. Ce rôle voit les
signalements ; un simple membre de l'équipe AV ne les voit pas.

**Sécurité / vie privée** : la page de suivi publique n'affiche jamais le nom, le contact ni les
commentaires internes. Protection anti-spam : clé secrète dans le QR code, champ piège invisible,
limite de signalements par appareil.

**Après mise à jour** : lancez `npx prisma db push` pour créer les nouvelles tables
(`BuildingReport`, `ReportPhoto`, `ReportComment`, `AppSetting`). Variables facultatives :
`NEXT_PUBLIC_CHURCH_NAME` et `NEXT_PUBLIC_EMERGENCY_NUMBER` (voir `.env.example`).

## 6. Prêt pour la suite (architecture prévue, non développée dans cette v1)

- **Mode hors-ligne** : le stockage et les appels API sont isolés (`src/lib/storage.ts`,
  routes `/api/*`) pour pouvoir ajouter un service worker / cache local (PWA) sans réécrire la
  logique métier.
- **Éditeur visuel de schémas** (glisser-déposer) : le modèle `ConnectionStep` est déjà ordonné et
  typé ; `InstallationForm.tsx` peut être étendu avec du drag-and-drop (ex. `dnd-kit`) sans changer
  le schéma de données.
- **Nouveaux rôles** : le champ `role` est une chaîne libre en base ; ajouter un rôle ne demande
  qu'une modification des contrôles d'accès (`requireAdmin`, vérifications dans les routes API).
- **Maintenance** : la table `Maintenance` existe déjà (signalements, statut) ; il manque
  uniquement l'interface pour la piloter.

## 7. Structure du projet

```
prisma/schema.prisma       Modèle de données complet (users, rooms, equipment, categories,
                            installations, connections, photos, maintenance, history)
prisma/seed.ts              Données de démonstration
src/lib/ai.ts                Couche d'abstraction IA (texte + image), swappable
src/lib/storage.ts           Couche d'abstraction stockage photos, swappable
src/lib/search.ts            Recherche globale + contexte fourni à l'IA
src/app/api/*                Toutes les routes API (CRUD, recherche, assistant, identify, upload)
src/app/*                    Pages (tableau de bord, matériel, salles, installations, assistant,
                              identification, recherche, administration)
src/components/*             Composants réutilisables (dont ConnectionDiagram : le schéma visuel)
```

## 8. Sécurité

- Aucune clé secrète dans le code ou le frontend : tout passe par les variables d'environnement
  (`.env`, jamais commité — voir `.gitignore`).
- Chaque route API vérifie la session et le rôle avant toute écriture.
- `npm audit` signale, au moment de la livraison, des vulnérabilités **internes aux outils de
  build de Next.js** (postcss/sharp embarqués), pas dans le code de l'application elle-même.
  Lancez `npm audit` régulièrement et mettez à jour Next.js (`npm install next@latest`) au fil des
  correctifs — la ligne 15.x utilisée ici est activement maintenue par Vercel.
- Prisma est resté en version 5.x (compatible et stable avec ce projet) alors qu'une version 7.x
  existe déjà : une future montée de version majeure de Prisma est possible mais demandera des
  tests, car elle touche toute la couche base de données.
