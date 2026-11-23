# Comment refaire les vidéos (pour Claude, dans une session Claude Code)

Ce dossier contient le programme qui a fabriqué les 4 vidéos. Tout est gratuit : il n'y a
aucune clé payante à fournir.

## Les fichiers

- `episodes.py` : **toute l'histoire**. Chaque plan y est décrit avec sa scène, les
  personnages, leur expression, les objets et les répliques. Pour une nouvelle saison, c'est
  ce fichier qu'on réécrit.
- `build_audio.py` : il fabrique les voix (avec Piper), les bruitages et la musique de fond,
  puis calcule la durée de chaque plan d'après les voix. Le résultat va dans
  `build/epN/audio.wav` et `build/epN/timeline.json`.
- `scene.html` : il dessine les scènes en SVG (le salon, Marc, Grâce, la bougie, le
  téléphone, l'enveloppe, le document, l'écran du verset, la fin), image par image.
- `render.js` : il ouvre `scene.html` dans Chromium (Playwright), capture 30 images par
  seconde, puis assemble la vidéo avec ffmpeg. Le résultat va dans `final/`.
- `fonts/` : les polices Nunito et Lora (libres, licence OFL).

## Ce qu'il faut installer

```bash
pip install piper-tts
mkdir -p voices && cd voices
for v in fr/fr_FR/tom/medium/fr_FR-tom-medium fr/fr_FR/siwis/medium/fr_FR-siwis-medium fr/fr_FR/upmc/medium/fr_FR-upmc-medium; do
  n=$(basename $v)
  curl -sL -o $n.onnx      "https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx"
  curl -sL -o $n.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx.json"
done
cd ..
```

Il faut aussi ffmpeg, Node.js et Playwright avec Chromium. Ils sont déjà installés dans les
sessions cloud de Claude Code.

Les voix :
- **Marc** : `fr_FR-tom-medium` ;
- **Grâce** : `fr_FR-siwis-medium` ;
- **le narrateur** : `fr_FR-upmc-medium`, locuteur 1 (« pierre »), un peu ralenti.

## Les commandes

```bash
python3 build_audio.py          # toutes les parties (ou : python3 build_audio.py 2)
node render.js 1 stills 2,10,30 # quelques images de contrôle dans build/ep1/stills/
node render.js 1 cover          # la couverture seule
node render.js 1                # la vidéo complète + la couverture, dans final/
```

Il faut compter environ 3 minutes par vidéo. On peut lancer les 4 en même temps.

## Ce qu'on peut changer dans `episodes.py`

- **`scene`** : `room` (le salon), `phone`, `envelope`, `document`, `verse`, `message` ou `end`.
- **`chars`** : 1 ou 2 personnages, `{"who": "M" ou "G", "expr": ..., "look": -1 à 1, "prop": ..., "suitcase": True, "hands": "join"}`.
  - Les expressions possibles : `neutral`, `sad`, `worried`, `suspicious`, `cold`, `angry`,
    `shocked`, `cry` (avec des larmes), `soft` (un léger sourire).
  - Les objets possibles : `phone` (téléphone dans les mains, qui éclaire le visage),
    `ear` (téléphone à l'oreille), `envelope` (l'enveloppe bleue).
- **Les options d'un plan** : `night`, `warm`, `stamp` (grand texte au début), `stampEnd`
  (grand texte à la fin), `label` (pastille comme « Jour 1 »), `shake` (l'image tremble),
  `freeze`, `blackEnd`, `min`, `post`, `sfx`.
  - Les bruitages possibles : `vibrate`, `door`, `zip`, `hit`.
- **Les répliques** : `{"who": "N"|"M"|"G"|"MG", "text": ..., "say": prononciation, "think": True}`.
  - Écrire `"say": "Esse"` pour que la voix prononce bien « S. ».
- **Un écran de verset** : `intro`, `verse`, `ref` et `refSay` (la référence telle qu'elle
  doit être lue à voix haute).
