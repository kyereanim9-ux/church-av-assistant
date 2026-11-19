"""Voix + minutage mot à mot de la vidéo « L'amour est une faiblesse ? ».

    CA_BUNDLE=/root/.ccr/ca-bundle.crt python3 tools/coeur.py   # depuis video/

Sorties : public/coeur/NN.mp3 et src/compositions/coeur/data.ts.
"""
import asyncio, json, os, subprocess, sys

if os.environ.get("CA_BUNDLE"):
    import certifi
    certifi.where = lambda: os.environ["CA_BUNDLE"]
import edge_tts

FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public", "coeur")
OUT = os.path.join(ROOT, "src", "compositions", "coeur", "data.ts")
VOICE, RATE, PITCH = "fr-FR-HenriNeural", "-10%", "-10Hz"

# (texte, pause avant en s, partie : 0 = la blessure, 1 = la réponse)
LINES = [
    ("« L'amour… est une faiblesse. »", 0, 0),
    ("C'est ce que disent ceux qui ont été blessés.", 0.6, 0),
    ("Ils ont donné leur cœur. Et on l'a brisé.", 0.5, 0),
    ("Alors ils se sont promis : plus jamais.", 0.5, 0),
    ("Plus jamais attendre quelqu'un. Plus jamais dire « je t'aime » en premier.", 0.4, 0),
    ("Et ils appellent ça : être fort.", 0.5, 0),
    ("Mais dis-moi…", 1.4, 1),
    ("Qui est le plus fort ?", 0.4, 1),
    ("Celui qui ferme son cœur pour ne plus jamais souffrir…", 0.5, 1),
    ("ou celui qui a été blessé… et qui choisit encore d'aimer ?", 0.3, 1),
    ("Fermer son cœur, tout le monde sait le faire.", 0.9, 1),
    ("Aimer encore, après la blessure… ça, c'est du courage.", 0.5, 1),
    ("Le Cantique des cantiques le dit : « L'amour est fort comme la mort. »", 0.9, 1),
    ("L'amour n'est pas ta faiblesse.", 0.9, 1),
    ("C'est la preuve que ton cœur est encore vivant.", 0.4, 1),
    ("Envoie cette vidéo à quelqu'un qui a fermé son cœur.", 1.4, 1),
]


async def say(text, out):
    for attempt in range(4):
        try:
            words, audio = [], bytearray()
            async for c in edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary").stream():
                if c["type"] == "audio":
                    audio += c["data"]
                elif c["type"] == "WordBoundary":
                    words.append(dict(t=c["text"], s=c["offset"] / 1e7, e=(c["offset"] + c["duration"]) / 1e7))
            if not audio:
                raise RuntimeError("audio vide")
            open(out, "wb").write(audio)
            return words
        except Exception as e:
            print("nouvelle tentative :", text, type(e).__name__, file=sys.stderr)
            if attempt == 3:
                raise
            await asyncio.sleep(2 + 2 * attempt)


def duration(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))


async def main():
    os.makedirs(PUB, exist_ok=True)
    t, out = 0.5, []
    for i, (text, pre, part) in enumerate(LINES, 1):
        f = os.path.join(PUB, f"{i:02d}.mp3")
        js = f + ".json"
        if os.path.exists(f) and os.path.exists(js):
            words = json.load(open(js))
        else:
            words = await say(text, f)
            json.dump(words, open(js, "w"), ensure_ascii=False)
        d = duration(f)
        t += pre
        start = round(t * FPS)
        out.append(dict(text=text, part=part, file=f"coeur/{i:02d}.mp3", **{"from": start}, dur=round(d * FPS),
                        words=[dict(t=w["t"], f=start + round(w["s"] * FPS), e=start + round(w["e"] * FPS)) for w in words]))
        t += d - 0.25  # edge-tts laisse ~0,3 s de silence en fin de fichier
    total = round((t + 4.5) * FPS)
    with open(OUT, "w") as fh:
        fh.write("// Fichier généré par tools/coeur.py — ne pas modifier à la main.\n")
        fh.write(f"export const durationInFrames = {total};\n")
        fh.write("export const lines = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("durée", round(total / FPS, 1), "s")


asyncio.run(main())
