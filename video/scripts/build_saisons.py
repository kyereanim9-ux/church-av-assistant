"""Build voice, music, ambiences and timeline for the "Saisons" composition.

An original French voice-over about the seasons of life, read by a neural
voice, over a continuous 3D flight where the landscape changes season.

Usage (from video/):  python3 scripts/build_saisons.py
Writes public/saisons/mix.wav and src/compositions/saisons.timeline.json
"""

import json
import os
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_aime_moi import edge, piano, reverb  # noqa: E402
from build_pas_a_pas_audio import SR, add, env, fast_bp, fast_lp, midi, noise, tone, write_wav  # noqa: E402

VOICE = "fr-FR-HenriNeural"

# (palette index, title shown at section start, sentences)
SECTIONS = [
    (0, "", ["Dieu n'a pas fait ta vie en un seul jour.", "Il l'a faite en saisons."]),
    (1, "HIVER", [
        "Il y a l'hiver.",
        "Le temps où rien ne semble pousser.",
        "Mais sous la neige, les racines travaillent en silence.",
    ]),
    (2, "PRINTEMPS", [
        "Puis vient le printemps.",
        "Ce que tu croyais mort recommence à fleurir.",
        "Doucement. Sans faire de bruit.",
    ]),
    (3, "ÉTÉ", [
        "Ensuite, l'été.",
        "Le temps de la lumière, de la récolte, et de la joie partagée.",
        "Profite… mais n'oublie jamais qui a fait pousser le fruit.",
    ]),
    (4, "AUTOMNE", [
        "Et puis, l'automne.",
        "Le temps de lâcher ce qui doit tomber.",
        "Les arbres ne pleurent pas leurs feuilles.",
        "Ils savent que c'est le prix du prochain printemps.",
    ]),
    (5, "", [
        "Alors, si tu traverses un hiver aujourd'hui…",
        "ne crois pas que c'est la fin de ton histoire.",
        "Une saison, ce n'est pas une sentence.",
        "C'est un passage.",
    ]),
    (6, "", [
        "Et celui qui a créé les saisons…",
        "n'a jamais oublié de faire revenir le printemps.",
    ]),
]
VERSE = "« Il y a un temps pour tout, un temps pour toute chose sous les cieux. »"
VERSE_REF = "Ecclésiaste 3:1"
CTA = "Partage ce message à quelqu'un qui traverse son hiver."

START = 1.2
GAP = 0.45
SECTION_GAP = 1.5
VERSE_LEN = 5.0
CTA_LEN = 3.6
rng = np.random.default_rng(5)


# ------------------------------------------------------------------ ambiences
def wind(d):
    n = noise(d)
    lfo = 0.6 + 0.4 * np.sin(np.linspace(0, d * 0.9, len(n)) + 1.3) * np.sin(np.linspace(0, d * 0.37, len(n)))
    return fast_bp(n, 150, 1100) * lfo * 0.5


def birds(d):
    out = np.zeros(int(d * SR), np.float32)
    t = 0.3
    while t < d - 0.6:
        base = rng.uniform(2600, 4200)
        for k in range(rng.integers(2, 5)):
            dur = rng.uniform(0.05, 0.12)
            f = lambda x, b=base: b + 900 * np.sin(2 * np.pi * x / dur * 0.5)  # noqa: E731
            s = tone(f, dur) * env(int(dur * SR), 0.005, dur / 2)
            j = int((t + k * dur * 1.4) * SR)
            out[j: j + len(s)] += s * 0.12
        t += rng.uniform(0.6, 1.6)
    return out


def crickets(d):
    t = np.arange(int(d * SR)) / SR
    chirp = np.sin(2 * np.pi * 4700 * t) * (np.sin(2 * np.pi * 30 * t) > 0.3) * ((t * 1.7) % 1 < 0.45)
    return (chirp * 0.035 + fast_bp(noise(d), 5000, 9000)[: len(t)] * 0.01).astype(np.float32)


def leaves(d):
    out = fast_bp(noise(d), 1200, 7000) * 0.0
    for _ in range(int(d * 2.2)):
        g = 0.4
        s = fast_bp(noise(g), 1500, 6000)[: int(g * SR)] * np.hanning(int(g * SR)) * rng.uniform(0.05, 0.14)
        j = int(rng.uniform(0, d - g) * SR)
        out[j: j + len(s)] += s
    return out + wind(d) * 0.4


def whoosh(d=1.6):
    n = int(d * SR)
    x = fast_bp(noise(d), 300, 6000)[:n]
    return x * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.35


def soft_hit():
    d = 2.5
    tt = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * (55 + 30 * np.exp(-tt * 8)) * tt) * np.exp(-tt * 1.6) * 0.5).astype(np.float32)


# --------------------------------------------------------------------- music
PROG = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]  # Dm Bb F C


def music(total, marks, intensity):
    """intensity(t) in 0..1 drives the layers."""
    out = np.zeros((int(total * SR) + SR, 2), np.float32)
    bpm = 78
    beat = 60 / bpm
    bar = 4 * beat
    for b in range(int(total / bar) + 1):
        t0 = b * bar
        lvl = intensity(t0)
        ch = PROG[b % 4]
        pad = sum(tone(midi(n), bar + 1.5) + 0.5 * tone(midi(n) * 1.004, bar + 1.5) for n in ch) / 4
        pad += 0.6 * tone(midi(ch[0] - 12), bar + 1.5)
        fade = np.minimum(1, np.arange(len(pad)) / (0.9 * SR)) * np.minimum(1, np.arange(len(pad))[::-1] / (0.9 * SR))
        add(out, fast_lp((pad * fade).astype(np.float32), 700 + 2500 * lvl), t0, 0.10)
        # piano: sparse in winter, arpeggios when it grows
        notes = [ch[0] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[2] + 24]
        step = 2 if lvl < 0.35 else 1
        for k in range(0, 8, step):
            add(out, piano(notes[k], 3.0), t0 + k * beat / 2, 0.05 + 0.04 * lvl, pan=(k % 2) * 0.4 - 0.2)
        # pulse + soft drums in summer / finale
        if lvl > 0.55:
            for k in range(8):
                p = tone(midi(ch[0] - 12), 0.22) * env(int(0.22 * SR), 0.005, 0.08)
                add(out, p.astype(np.float32), t0 + k * beat / 2, 0.12 * lvl)
            for k in (0, 2):
                kk = np.arange(int(0.4 * SR)) / SR
                kick = np.sin(2 * np.pi * (50 + 70 * np.exp(-kk * 20)) * kk) * np.exp(-kk * 7)
                add(out, kick.astype(np.float32), t0 + k * beat, 0.35 * lvl)
            for k in (1, 3):
                sn = fast_bp(noise(0.25), 1500, 6000)[: int(0.25 * SR)] * env(int(0.25 * SR), 0.002, 0.06)
                add(out, sn, t0 + k * beat, 0.10 * lvl)
    m = out.mean(1)
    m = reverb(m, 3.0, 0.4)
    st = np.stack([m, m], 1)
    st[:, 0] = st[:, 0] * 0.9 + out[:, 0] * 0.4
    st[:, 1] = st[:, 1] * 0.9 + out[:, 1] * 0.4
    return st


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    sentences, sections, voice_clips = [], [], []
    t = START
    with tempfile.TemporaryDirectory() as tmp:
        for k, (pal, title, lines) in enumerate(SECTIONS):
            if k:
                t += SECTION_GAP
            sections.append({"palette": pal, "start": round(t, 3), "title": title})
            if title:
                t += 1.0  # let the title breathe before the voice
            for line in lines:
                clip, words = edge(line, VOICE, "-8%", "-4Hz", tmp)
                voice_clips.append((t, clip))
                sentences.append({
                    "start": round(t, 3), "end": round(t + len(clip) / SR, 3), "text": line,
                    "words": [{"w": w, "t": round(wt, 3)} for w, wt in words],
                })
                t += len(clip) / SR + GAP
    verse_start = t + 0.6
    cta_start = verse_start + VERSE_LEN
    total = cta_start + CTA_LEN + 0.6

    n = int(total * SR) + SR
    voice = np.zeros((n, 2), np.float32)
    for st, c in voice_clips:
        add(voice, c, st, 1.0)
    vm = reverb(voice[:, 0].copy(), 1.2, 0.12)
    voice = np.stack([vm, vm], 1)

    sec_t = [s["start"] for s in sections] + [total]

    def intensity(x):
        idx = max([0] + [i for i, s in enumerate(sec_t[:-1]) if s <= x + 1e-6])
        return [0.15, 0.2, 0.45, 0.8, 0.5, 0.15, 0.95][sections[idx]["palette"]]

    mus = music(total, sec_t, intensity)[:n]
    envv = np.convolve(np.abs(voice[:, 0]), np.ones(2205) / 2205, "same")
    duck = 1 - 0.4 * np.clip(envv / 0.05, 0, 1)
    mus *= np.convolve(duck, np.ones(8820) / 8820, "same")[:, None]

    amb = np.zeros((n, 2), np.float32)
    for i, s in enumerate(sections):
        a, b = s["start"] - 0.8, sec_t[i + 1] + 0.8
        d = b - a
        sig = {0: wind, 1: wind, 2: birds, 3: crickets, 4: leaves, 5: wind, 6: birds}[s["palette"]](d)
        sig = sig[: int(d * SR)] * np.minimum(1, np.minimum(np.arange(int(d * SR)), np.arange(int(d * SR))[::-1]) / (0.8 * SR))
        add(amb, sig.astype(np.float32), a, 0.8, pan=0.1)
        if i:
            add(amb, whoosh(), s["start"] - 0.9, 0.8)
            add(amb, soft_hit(), s["start"], 0.6)

    mix = voice * 1.0 + mus * 0.75 + amb * 0.6
    mix /= np.max(np.abs(mix)) / 0.89
    out_dir = os.path.join(root, "public", "saisons")
    os.makedirs(out_dir, exist_ok=True)
    write_wav(os.path.join(out_dir, "mix.wav"), mix[: int(total * SR)])
    tl = {
        "audioFile": "saisons/mix.wav",
        "durationSeconds": round(total, 3),
        "sections": sections,
        "sentences": sentences,
        "verse": {"start": round(verse_start, 3), "text": VERSE, "ref": VERSE_REF},
        "cta": {"start": round(cta_start, 3), "text": CTA},
    }
    with open(os.path.join(root, "src", "compositions", "saisons.timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    for s in sections:
        print("section", s)
    print("total", round(total, 2))


if __name__ == "__main__":
    main()
