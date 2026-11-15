# Church AV Assistant

The audio-visual manual of a church technical team: equipment, rooms,
documented installations with connection diagrams, global search, equipment
identification from a photo, and an AI assistant that answers from the
database first. The owner is not a professional developer: explain in plain
words, avoid jargon, and say exactly what to click when something must be done
in Vercel, Neon or GitHub.

## Language

- Everything the user sees in the app is **French** (vouvoiement: "vous").
  Code comments and the README are in French too.
- Answer the owner in the language they write to you in.

## Stack and layout

Next.js 15 (App Router, TypeScript) · Prisma 5 + PostgreSQL (Neon) · NextAuth
(email + password, JWT sessions, roles `ADMIN` / `MEMBER`) · Tailwind CSS 3,
mobile-first with dark mode · lucide-react icons · zod.

```
prisma/schema.prisma   Data model (users, rooms, equipment, categories, installations,
                       connection steps, photos, maintenance, history)
prisma/seed.ts         Demo data and the seed admin account
src/app/*              Pages (dashboard, equipment, rooms, installations, assistant,
                       identify, search, admin)
src/app/api/*          All API routes (CRUD, search, assistant, identify, upload)
src/components/*       Shared components (ConnectionDiagram = the visual wiring diagram)
src/lib/ai.ts          The ONLY place that talks to an AI provider (askAI, askAIWithImage)
src/lib/storage.ts     The ONLY place that stores photos (local disk in dev, Vercel Blob in prod)
src/lib/search.ts      Global search + the context given to the AI
src/lib/session.ts     requireSession / requireAdmin
src/lib/history.ts     Records important changes
video/                 Separate Remotion project (own package.json, React 19, Tailwind 4)
```

## Commands

```bash
npm install
cp .env.example .env      # first time; set DATABASE_URL and NEXTAUTH_SECRET
npm run db:push           # apply prisma/schema.prisma to the database
npm run db:seed           # demo data
npm run dev               # http://localhost:3000
npm run lint
npm run build             # must pass before pushing
```

There is no test suite. To check a change, run `npm run lint` and
`npm run build`, then try it for real: open the page in the pre-installed
Playwright Chromium (phone width first, then desktop, light and dark) and look
at a screenshot. Say plainly if you could not verify something — for example
when no `DATABASE_URL` is available in the session.

## Rules that are easy to break

- **Every API route checks the session, and the role before any write.**
  Pages use `requireSession()` / `requireAdmin()` from `src/lib/session.ts`;
  API routes call `getServerSession(authOptions)` and return 401/403 themselves.
- **All AI calls go through `src/lib/ai.ts`**, all photo storage through
  `src/lib/storage.ts`. Don't import an AI SDK or `@vercel/blob` elsewhere.
- **The app must work with no AI key.** `askAI` returns `available: false`
  with a reason, and the page shows that message instead of crashing.
- **The assistant answers from the database first** and must say when an
  answer is general knowledge rather than the team's own data. It never
  invents equipment, rooms or wiring.
- **Status and role fields are plain strings** checked in the app, not
  database enums. Allowed values are listed at the top of
  `prisma/schema.prisma`; keep code and that comment in sync.
- **After any change to `schema.prisma`**: `npm run db:generate`, update
  `prisma/seed.ts` if needed, and tell the owner that `npm run db:push` must
  be run against the production database. Never use `--force-reset` or
  `--accept-data-loss`, and never drop or delete production data, without
  asking first.
- **Important changes are logged** with the helper in `src/lib/history.ts`.
- **Mobile first.** The team uses this on phones in the church; check the
  bottom navigation and forms at phone width.
- **`video/` stays out of the Next.js build**: it is excluded in the root
  `tsconfig.json`. Never import from `video/` in `src/`, and run its commands
  inside `video/`.
- **Secrets only in environment variables.** Never commit `.env`.
- Stay on Prisma 5.x and Next 15.x unless asked to upgrade; a major upgrade
  needs its own testing.
- Before changing a Claude model name, API parameter or SDK call in
  `src/lib/ai.ts`, load the `claude-api` skill instead of trusting memory.

## Deployment

- Hosted on Vercel (Hobby plan) with a Neon database; photos on Vercel Blob
  (`BLOB_READ_WRITE_TOKEN` is added by Vercel itself).
- A changed environment variable only applies after a redeploy.
- The seed creates demo accounts with known passwords; remind the owner to
  change them before real use.

## Skills in this repo

- `remotion-video` (`.claude/skills/remotion-video/`): videos made with code in `video/`.
- `3d` (`.claude/skills/3d/`): any 3D model, scene, render or viewer.
- `animate` (`.claude/skills/animate/`): `/animate <idea>` writes the story and prompts for an animated short film.
- `hyperframes` plugin (enabled in `.claude/settings.json`): animated videos from HTML, with voice-over and sound effects. Local French voice needs `pip install kokoro-onnx soundfile`.
- `films/` : films animés HyperFrames (hors application, ne jamais importer depuis `src/`).
