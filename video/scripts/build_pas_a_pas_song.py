"""Build the timeline for the full-song version of PasAPas ("PasAPasChanson").

Input: the song (mp3) and a list of sung lines with their start times
(from a faster-whisper transcription, corrected to the real lyrics).
Each line becomes a scene: the character's pose / props are picked from
keywords, the words are laid out around the character and appear when
they are sung (word timestamps from faster-whisper).

Usage (from video/):
  python3 scripts/build_pas_a_pas_song.py path/to/song.mp3
Writes public/pas-a-pas/chanson.mp3 and src/compositions/pasAPasSong.timeline.json
"""

import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

import numpy as np

BPM = 101.99
BEAT_OFFSET = 0.493

# (start, end_of_singing, text). Ad-libs in parentheses become their own word.
LINES = [
    (14.3, 17.9, "Seigneur, j'essaie, je fais de mon mieux (amen !)"),
    (18.2, 22.7, "J'ai des soucis plein la tête, mais je lève les yeux"),
    (23.5, 27.3, "Je te fais confiance, ton plan vaut mieux que le mien"),
    (27.3, 32.3, "Même quand je ne comprends pas, je sais que tu me tiens"),
    (33.5, 36.1, "Quand je tombe ? Tu me relèves ! (Oui, Seigneur !)"),
    (36.1, 38.2, "Quand j'avance ? Tu me soulèves ! (Amen !)"),
    (38.6, 41.2, "Un café, une prière, et c'est parti !"),
    (42.4, 46.2, "Tu me donnes du courage, tu remplis ma vie !"),
    (47.4, 49.4, "Pas à pas, main dans ta main"),
    (50.0, 52.2, "Je danse sur le chemin (glory !)"),
    (52.3, 54.0, "Pas à pas, jour après jour"),
    (54.5, 56.5, "Je marche dans ton amour (hallelujah !)"),
    (56.6, 58.6, "Pas à pas, je n'ai plus peur"),
    (59.3, 61.3, "Ta joie remplit mon cœur"),
    (61.7, 63.6, "Pas à pas, main dans ta main"),
    (64.0, 65.9, "Avec toi tout ira bien !"),
    (66.3, 69.2, "Pas à pas, main dans ta main"),
    (69.4, 73.3, "Pas à pas, main dans ta main"),
    (73.6, 75.4, "Avec toi tout ira bien !"),
    (75.6, 78.5, "Le matin mon lit est en désordre, mais mon cœur est en paix"),
    (78.7, 80.6, "Tu connais mes faiblesses et tu m'aimes à jamais"),
    (80.8, 83.5, "Si la pluie tombe, je chante sous les nuages"),
    (83.7, 85.8, "Car ta lumière brille au bout de chaque page"),
    (85.8, 88.1, "Mon âme chante, mon esprit s'envole"),
    (88.2, 90.4, "Dans ce rythme joyeux, qui console"),
    (90.5, 92.4, "Chaque pas est une note, une mélodie"),
    (92.8, 95.1, "Ma vie est un hymne, une symphonie"),
    (97.0, 98.9, "Pas à pas, main dans ta main"),
    (99.1, 101.1, "Je danse sur le chemin (glory !)"),
    (101.7, 103.6, "Pas à pas, jour après jour"),
    (103.9, 106.0, "Je marche dans ton amour (hallelujah !)"),
    (106.1, 108.7, "Pas à pas, je n'ai plus peur"),
    (108.8, 110.7, "Ta joie remplit mon cœur"),
    (111.1, 113.0, "Pas à pas, main dans ta main"),
    (113.3, 115.4, "Avec toi tout ira bien !"),
    (115.8, 121.4, "Pas à pas… (pas à pas)"),
    (124.5, 130.6, "Main dans ta main… (main dans ta main)"),
    (132.3, 134.2, "Avec toi… tout ira bien ! ✨"),
]
SONG_END = 146.0

# keyword -> (pose, eyes, mouth, prop); first match wins
MOODS = [
    ("tombe ? tu", ("cheer", "worried", "open", "rock")),
    ("mieux (amen", ("cheer", "happy", "grin", "none")),
    ("soucis", ("worried", "worried", "frown", "cloud")),
    ("confiance", ("heart", "closed", "smile", "sun")),
    ("comprends", ("shrug", "open", "o", "question")),
    ("avance", ("wave", "happy", "grin", "sun")),
    ("cafe", ("hold", "wink", "grin", "coffee")),
    ("courage", ("hold", "happy", "smile", "lantern")),
    ("danse", ("cheer", "happy", "grin", "notes")),
    ("amour", ("heart", "closed", "smile", "sun")),
    ("peur", ("cheer", "happy", "grin", "none")),
    ("joie", ("heart", "happy", "grin", "notes")),
    ("ira bien", ("cheer", "happy", "grin", "none")),
    ("matin", ("shrug", "happy", "grin", "none")),
    ("faiblesses", ("heart", "closed", "smile", "sun")),
    ("pluie", ("cheer", "happy", "grin", "cloud")),
    ("lumiere", ("hold", "happy", "smile", "lantern")),
    ("ame chante", ("wave", "happy", "open", "notes")),
    ("rythme", ("cheer", "happy", "grin", "notes")),
    ("note", ("wave", "happy", "open", "notes")),
    ("hymne", ("heart", "closed", "open", "notes")),
    ("plan", ("hold", "open", "grin", "plan")),
    ("main dans", ("walk", "happy", "smile", "lantern")),
    ("pas a pas", ("walk", "happy", "smile", "lantern")),
]
HEROES = ["mieux", "soucis", "confiance", "comprends", "relèves", "soulèves", "parti", "courage",
          "danse", "amour", "peur", "cœur", "bien", "paix", "jamais", "nuages", "lumière",
          "s'envole", "console", "mélodie", "symphonie", "chemin", "main", "jour"]

PALETTE = ["#24366b", "#c8553d", "#6f9a7c", "#4f8fd6", "#7a4f9a", "#1d2433", "#e08aa0"]
GOLD = "#d9a441"
FONTS = ["sans", "serif", "sans", "mono", "serif"]
STYLES = ["pop", "slide", "drop", "pop", "type", "slide"]


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z' ?(]", "", s)


def nword(s):
    return re.sub(r"[^a-z]", "", norm(s))


def chunks_of(text):
    adlib = re.findall(r"\(([^)]*)\)", text)
    main = re.sub(r"\s*\([^)]*\)", "", text).strip()
    out, cur = [], []
    for tok in main.split():
        if cur and len(" ".join(cur + [tok])) > 14 and not re.fullmatch(r"[!?…✨]+", tok):
            out.append(" ".join(cur))
            cur = []
        cur.append(tok)
        if re.search(r"[,?!…]$", tok):
            out.append(" ".join(cur))
            cur = []
    if cur:
        out.append(" ".join(cur))
    # glue a lone punctuation chunk ("!", "?") to the previous one
    merged = []
    for c in out:
        if merged and re.fullmatch(r"[!?…✨]+", c):
            merged[-1] += " " + c
        else:
            merged.append(c)
    return merged, [f"({a})" for a in adlib]


def transcribe(song):
    from faster_whisper import WhisperModel

    wav = song + ".16k.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", song, "-ac", "1", "-ar", "16000", wav], check=True)
    import wave

    with wave.open(wav) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    os.remove(wav)
    m = WhisperModel("small", compute_type="int8")
    segs, _ = m.transcribe(a, language="fr", word_timestamps=True,
                           initial_prompt="Pas à pas, main dans ta main. Seigneur, j'essaie.")
    return [(nword(w.word), w.start) for s in segs for w in s.words]


def chunk_times(chunks, start, end, spoken):
    """First-word time of each chunk, matched in the transcription; else spread evenly."""
    window = [(w, t) for w, t in spoken if start - 0.4 <= t <= end + 0.4]
    times, j = [], 0
    for i, c in enumerate(chunks):
        first = nword(c.split()[0]) or "x"
        hit = None
        for k in range(j, len(window)):
            w = window[k][0]
            if w and (w.startswith(first[:4]) or first.startswith(w[:4])):
                hit = k
                break
        guess = start + (end - start) * i / max(1, len(chunks))
        if hit is not None and abs(window[hit][1] - guess) < 1.6:
            times.append(window[hit][1])
            j = hit + 1
        else:
            times.append(guess)
    # keep increasing, at least 0.15 s apart
    for i in range(1, len(times)):
        times[i] = max(times[i], times[i - 1] + 0.15)
    return times


def place(items, cx, prop, seed, s0):
    """Stack the chunks in columns, sized to their real height, so nothing overlaps."""
    words = []
    top_free = not (cx == 960 and prop in ("cloud", "question", "sun"))
    side_w = 760 if cx == 960 else 900

    def size_of(text, hero, adlib):
        if adlib:
            return 80
        return int(np.clip(side_w / (0.6 * max(4, len(text))), 80 if hero else 72, 165 if hero else 125))

    cols = {}  # x -> list of (item, size)
    for k, (c, t, hero, adlib) in enumerate(items):
        if hero and cx == 960 and top_free:
            words.append(dict(text=c.upper() if len(c) <= 10 else c, at=t, x=960, y=150,
                              size=min(190, int(1500 / (0.62 * max(4, len(c))))), hero=True, adlib=False))
            continue
        if cx == 960:
            n_col = sum(1 for it in items if not (it[2] and top_free))
            x = 420 if sum(len(v) for v in cols.values()) < (n_col + 1) // 2 else 1500
        else:
            x = 1380 if cx < 960 else 540
        cols.setdefault(x, []).append(((c, t, hero, adlib), size_of(c, hero, adlib)))
    for x, col in cols.items():
        heights = [s * 1.22 for _, s in col]
        y = max(270 if cx == 960 else 130, 540 - sum(heights) / 2) if cx != 960 else 300
        for ((c, t, hero, adlib), s), h in zip(col, heights):
            words.append(dict(text=(c.upper() if hero and len(c) <= 10 else c), at=t, x=x,
                              y=round(y + h / 2), size=s, hero=hero, adlib=adlib))
            y += h
    out = []
    for k, w in enumerate(sorted(words, key=lambda w: w["at"])):
        hero, adlib = w.pop("hero"), w.pop("adlib")
        style = "stretch" if hero else ("pop" if adlib else STYLES[(seed + k) % len(STYLES)])
        if style == "type" and len(w["text"]) > 11:
            style = "slide"
        w.update(
            at=round(w["at"] - s0 - 0.05, 3),
            color=GOLD if hero else ("#7a4f9a" if adlib else PALETTE[(seed * 2 + k) % len(PALETTE)]),
            font="sans" if hero else ("serif" if adlib else FONTS[(seed + k) % len(FONTS)]),
            style=style,
        )
        out.append(w)
    return out


def main():
    song = sys.argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    os.makedirs(os.path.join(root, "public", "pas-a-pas"), exist_ok=True)
    shutil.copy(song, os.path.join(root, "public", "pas-a-pas", "chanson.mp3"))
    spoken = transcribe(song)

    beat = 60 / BPM
    b = lambda k: round(BEAT_OFFSET + k * beat, 3)  # noqa: E731
    scenes = [{
        "start": 0, "end": LINES[0][0] - 0.3, "pose": "wave", "eyes": "happy", "mouth": "grin",
        "prop": "notes", "cx": 960,
        "words": [
            {"text": "Pas", "at": b(4), "x": 430, "y": 300, "size": 180, "color": "#24366b", "font": "serif", "style": "drop"},
            {"text": "à", "at": b(5), "x": 960, "y": 150, "size": 160, "color": GOLD, "font": "serif", "style": "pop"},
            {"text": "pas", "at": b(6), "x": 1490, "y": 300, "size": 180, "color": "#24366b", "font": "serif", "style": "drop"},
            {"text": "main dans", "at": b(12), "x": 430, "y": 620, "size": 110, "color": "#c8553d", "style": "slide"},
            {"text": "ta main ✦", "at": b(13), "x": 1490, "y": 620, "size": 110, "color": "#6f9a7c", "style": "pop"},
        ],
    }]

    cxs = [960, 640, 1280, 960, 1280, 640]
    for i, (start, sung_end, text) in enumerate(LINES):
        nxt = LINES[i + 1][0] if i + 1 < len(LINES) else min(SONG_END - 9, sung_end + 2.5)
        key = norm(text)
        pose, eyes, mouth, prop = next((m for k, m in MOODS if k in key), ("wave", "happy", "smile", "none"))
        cx = 960 if prop in ("cloud", "question") else cxs[i % len(cxs)]
        chunks, adlibs = chunks_of(text)
        times = chunk_times(chunks, start, sung_end, spoken)
        hero_idx = max(range(len(chunks)), key=lambda k: (any(h in chunks[k].lower() for h in HEROES), k))
        items = [(c, t, k == hero_idx, False) for k, (c, t) in enumerate(zip(chunks, times))]
        ad_t = max(sung_end - 0.6, times[-1] + 0.3)
        items += [(a, ad_t + n * 0.4, False, True) for n, a in enumerate(adlibs)]
        # long lines: split into two scenes so nothing has to wrap
        groups = [items]
        if len(items) > 5:
            h = (len(items) + 1) // 2
            groups = [items[:h], items[h:]]
        for g, group in enumerate(groups):
            s0 = round((start if g == 0 else group[0][1]) - 0.3, 3)
            e0 = round((groups[g + 1][0][1] - 0.3) if g + 1 < len(groups) else nxt - 0.3, 3)
            words = place(group, cx, prop, i + g, s0)
            sc = {"start": s0, "end": e0, "pose": pose, "eyes": eyes, "mouth": mouth,
                  "prop": prop, "cx": cx, "words": words}
            if g:
                sc["cont"] = True
            if prop == "rock" and g == 0:
                tomb = next((tt for w, tt in spoken if w.startswith("tomb") and start - 0.5 <= tt <= sung_end), start + 0.5)
                rel = next((tt for w, tt in spoken if w.startswith("rel") and start <= tt <= sung_end + 0.5), tomb + 1.2)
                sc["fall"] = True
                sc["fallAt"] = round(tomb - s0, 3)
                sc["riseAt"] = round(max(rel - s0 - 0.1, sc["fallAt"] + 0.9), 3)
            scenes.append(sc)
            print(f"{s0:6.1f}-{e0:6.1f} {pose:7} {prop:8} cx={cx:4} {[w['text'] for w in words]}")

    timeline = {
        "title": "Pas à pas",
        "audioFile": "pas-a-pas/chanson.mp3",
        "durationSeconds": SONG_END,
        "bpm": BPM,
        "beatOffset": BEAT_OFFSET,
        "scenes": scenes,
    }
    with open(os.path.join(root, "src", "compositions", "pasAPasSong.timeline.json"), "w") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
