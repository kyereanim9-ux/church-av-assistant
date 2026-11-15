# Films animés

Courts films d'animation faits avec HyperFrames (HTML rendu en vidéo). Ce dossier
est indépendant de l'application Next.js : rien ici n'est importé par `src/`.

- `after-the-rain/` — « After the Rain », 15 s, 1920×1080. L'animation est dans
  `compositions/film.html` (décor, pluie et personnage dessinés et animés en code).
  Voix off (`assets/voice/`) et bruitages (`assets/sfx/`) sont mixés sur la vidéo
  rendue avec `ffmpeg`.
- `prompts/` — les dossiers d'écriture produits par `/animate` (histoire, prompts
  d'images, prompt vidéo).

Rendu (environ 25 minutes pour 15 secondes) :

```bash
cd films/after-the-rain
npx --yes hyperframes@0.9.52 render -o ../after-the-rain.mp4
```

Les vidéos rendues ne sont pas versionnées. Deux bruitages sont sous licence
CC BY : créditer leurs auteurs à la publication (`after-the-rain/assets/sfx/CREDITS.md`).
