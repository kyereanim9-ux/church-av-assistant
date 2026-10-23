---
name: remotion-video
description: Create, edit and render videos with Remotion (React code → MP4). Use when the user wants a video, animation, announcement clip, lyric video, intro/outro, social clip or motion graphic made with code, mentions Remotion or `npx create-video`, or wants to add a new composition to the `video/` project in this repo.
---

# Remotion videos

Remotion makes videos from React components: each frame is rendered by a
component that reads `useCurrentFrame()`, then Remotion encodes the frames
to MP4/WebM/GIF/PNG.

## In this repo

A Remotion project already lives in `video/` (separate `package.json`, React 19,
Tailwind v4). It is excluded from the root Next.js `tsconfig.json`; keep it that
way so the Next build never type-checks it.

- `video/src/Root.tsx` registers every `<Composition>` (id, size, fps, duration, defaultProps).
- `video/src/compositions/` holds one file per video:
  - `Announcement.tsx` — title / subtitle / date card with spring animations.
  - `Lyrics.tsx` — one lyric line per `<Sequence>`; duration computed from the lines in `calculateMetadata`.

Commands (run inside `video/`):

```bash
npm install                     # first time only
npm run dev                     # Remotion Studio preview at http://localhost:3000
npm run lint                    # eslint + tsc — run before committing
npx remotion render <Id> out/<name>.mp4
npx remotion render <Id> out/x.mp4 --props='{"title":"Noël","date":"24 déc · 19h"}'
npx remotion still <Id> out/x.png --frame=60   # quick visual check of one frame
```

`out/` is git-ignored. Rendered videos are deliverables, not source.

## Starting a fresh project elsewhere

```bash
npx -y create-video@latest --yes --blank --tailwind <dir>
```

Other template flags: `--hello-world`, `--next`, `--audiogram`, `--tiktok`
(captions), `--music-visualization`, `--still`, `--three`, `--render-server`.
`--yes` needs a template flag and a directory. If the new folder sits inside
another TypeScript app, add it to that app's tsconfig `exclude`.

## Adding a new video

1. Create `src/compositions/<Name>.tsx` exporting the component, a `<Name>Props` type and `<name>Defaults`.
2. Register it in `src/Root.tsx` with a `<Composition>` (default 1920×1080, 30 fps).
   Use `calculateMetadata` when duration depends on props.
3. Keep all user-facing text in props so it can be changed with `--props` without code edits.
4. Verify: `npm run lint`, then render a still at a mid frame and look at it, then render the full video.

## Animation rules

- Drive everything from `useCurrentFrame()` / `useVideoConfig()`. Never use CSS
  transitions, `setTimeout` or `requestAnimationFrame`: renders are frame-by-frame and these break.
- `interpolate(frame, [in…], [out…], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })` for fades and moves.
- `spring({ frame, fps, config: { damping: 200 } })` for smooth entrances; offset with `frame - n` to stagger.
- `<Sequence from durationInFrames>` to time sections; inside, `useCurrentFrame()` starts at 0.
- Media: put files in `public/` and use `staticFile("x.mp4")` with `<Img>`, `<OffthreadVideo>`, `<Audio>` from `remotion`.
- Size text for a projector/TV: titles ≥ 96px, body ≥ 48px at 1080p; high contrast backgrounds.

## Rendering in a cloud/sandbox container

If Remotion can't download its Chrome Headless Shell (blocked network), point it at
a preinstalled one, e.g. Playwright's:

```bash
npx remotion render <Id> out/x.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell
```

## License

Remotion is free for individuals and companies of up to 3 people; larger
organizations need a company license (https://www.remotion.pro/license).
