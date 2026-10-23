# Vidéos Remotion

Vidéos de l'église générées en code avec [Remotion](https://www.remotion.dev)
(composants React → MP4). Projet séparé de l'application Next.js.

## Vidéos disponibles

| Id             | Contenu                                         |
| -------------- | ----------------------------------------------- |
| `Announcement` | Titre, sous-titre et date animés (6 s, 1080p)   |
| `Lyrics`       | Paroles, une ligne à la fois (durée automatique) |

## Commandes

```console
cd video
npm install                 # première fois
npm run dev                 # aperçu dans le navigateur (Remotion Studio)
npx remotion render Announcement out/annonce.mp4
npx remotion render Announcement out/noel.mp4 --props='{"title":"Veillée de Noël","subtitle":"Chants et lumière","date":"24 déc · 19h00","accentColor":"#dc2626"}'
npx remotion render Lyrics out/paroles.mp4 --props='{"songTitle":"Mon chant","lines":["Ligne 1","Ligne 2"],"secondsPerLine":4}'
```

Les fichiers rendus vont dans `out/` (ignoré par Git).

## Licence

Remotion est gratuit jusqu'à 3 personnes ; au-delà, une
[licence entreprise](https://www.remotion.pro/license) est requise.
