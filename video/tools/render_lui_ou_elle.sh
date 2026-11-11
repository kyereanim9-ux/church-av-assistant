#!/usr/bin/env bash
# Rend les 6 épisodes et leurs couvertures dans out/lui-ou-elle/.
# BROWSER=/chemin/vers/chrome-headless-shell si Remotion ne peut pas télécharger le sien.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/lui-ou-elle
B=${BROWSER:+--browser-executable=$BROWSER}
for n in ${EPISODES:-1 2 3 4 5 6}; do
  npx remotion still "LuiOuElleCover-Ep$n" "out/lui-ou-elle/ep$n-couverture.png" $B --log=error
  npx remotion render "LuiOuElle-Ep$n" "out/lui-ou-elle/ep$n.mp4" $B --log=error --crf=20
  echo "ep$n ok"
done
