"""Build voice, music, storm sound design and timeline for "Tempete".

An original French voice-over on the storm and the calm (Mark 4), over a
3D boat on a stormy sea that turns calm. Thunder is scheduled here and the
lightning flashes in the video use the same times.

Usage (from video/):  python3 scripts/build_tempete.py
Writes public/tempete/mix.wav and src/compositions/tempete.timeline.json
"""

import json
import os
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_aime_moi import piano, reverb  # noqa: E402
from voice_source import VOICE_DIR, speaker  # noqa: E402
from build_pas_a_pas_audio import SR, add, env, fast_bp, fast_lp, midi, noise, tone, write_wav  # noqa: E402

VOICE = os.environ.get("TEMPETE_VOICE", "fr-FR-RemyMultilingualNeural")
RATE, PITCH = "-6%", "+0Hz"

# (palette, title, sentences)  palettes: 0 wind rising, 1-2 storm, 3-4 calm night, 5 dawn
SECTIONS = [
    (0, "", ["Il y a des jours où tout est calme…", "et puis, sans prévenir, le vent se lève."]),
    (1, "LA TEMPÊTE", [
        "Les vagues montent. Le ciel se ferme.",
        "Et ta petite barque semble bien trop fragile pour tout ça.",
        "Tu rames de toutes tes forces… mais l'eau continue d'entrer.",
        "Et au fond de toi, une question : est-ce que Dieu dort pendant ma tempête ?",
    ]),
    (2, "", [
        "Les disciples se sont posé la même question.",
        "Ils étaient dans la barque… et Jésus dormait à l'arrière.",
        "Alors ils l'ont réveillé : Maître, cela ne te fait rien que nous périssions ?",
    ]),
    (3, "LE CALME", [
        "Il s'est levé.",
        "Il a parlé au vent.",
        "Et il y eut un grand calme.",
    ]),
    (4, "", [
        "Remarque bien : il n'a pas empêché la tempête.",
        "Il était dans la barque, au milieu d'elle.",
        "Ta tempête ne prouve pas son absence.",
        "Parfois, il calme la tempête… et parfois, il calme son enfant au milieu de la tempête.",
    ]),
    (5, "", [
        "Alors respire.",
        "Celui qui commande aux vagues tient aussi ta barque.",
        "Le calme vient. Il arrive toujours.",
    ]),
]
VERSE = "« Silence ! tais-toi ! Et le vent cessa, et il y eut un grand calme. »"
VERSE_REF = "Marc 4:39"
CTA = "Envoie ce message à quelqu'un qui traverse une tempête."

START = 1.4
GAP = 0.7 if VOICE_DIR else 0.5  # natural recordings get a calmer pace
SECTION_GAP = 1.6
VERSE_LEN = 5.4
CTA_LEN = 3.6
rng = np.random.default_rng(21)


# ------------------------------------------------------------- sound design
def rain(d, amount=1.0):
    n = noise(d)
    hiss = fast_bp(n, 2500, 11000) * 0.25 + fast_lp(n, 900) * 0.15
    drops = np.zeros_like(hiss)
    for _ in range(int(d * 60 * amount)):
        j = rng.integers(0, len(drops) - 400)
        drops[j: j + 300] += fast_bp(rng.standard_normal(300).astype(np.float32), 1500, 6000)[:300] * np.exp(-np.arange(300) / 60) * 0.3
    return (hiss + drops) * amount


def gusts(d, amount=1.0):
    n = noise(d)
    t = np.linspace(0, d, len(n))
    lfo = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(t * 0.9) * np.sin(t * 0.37 + 1))
    return fast_bp(n, 200, 1600) * lfo * 0.6 * amount


def waves(d, rough=1.0):
    t = np.arange(int(d * SR)) / SR
    period = 4.5 - 2 * rough
    sw = (0.5 + 0.5 * np.sin(2 * np.pi * t / period)) ** (2 + 2 * rough)
    surf = fast_lp(noise(d), 600 + 1800 * rough)[: len(t)] * sw
    return surf * (0.25 + 0.5 * rough)


def lapping(d):
    t = np.arange(int(d * SR)) / SR
    sw = (0.5 + 0.5 * np.sin(2 * np.pi * t / 2.6)) ** 6
    return fast_bp(noise(d), 300, 2000)[: len(t)] * sw * 0.18


def thunder():
    d = 5.0
    n = int(d * SR)
    t = np.arange(n) / SR
    crack = fast_bp(noise(0.25), 800, 9000)[: int(0.25 * SR)] * np.exp(-np.arange(int(0.25 * SR)) / (0.04 * SR))
    rumble = fast_lp(noise(d), 160)[:n] * (np.minimum(1, t / 0.3) * np.exp(-t / 1.6)) * 3.0
    rumble += fast_lp(noise(d), 60)[:n] * np.exp(-t / 2.2) * 2.0
    out = rumble.astype(np.float32)
    out[: len(crack)] += crack * 0.9
    return out


def seagulls(d):
    out = np.zeros(int(d * SR), np.float32)
    t = 1.0
    while t < d - 1:
        dur = 0.35
        f = lambda x: 1500 + 700 * np.sin(np.pi * x / dur) - 500 * x  # noqa: E731
        s = tone(f, dur, "tri") * env(int(dur * SR), 0.02, 0.2) * 0.05
        j = int(t * SR)
        out[j: j + len(s)] += s
        t += rng.uniform(1.5, 3.5)
    return out


# --------------------------------------------------------------------- music
STORM = [[45, 48, 52], [41, 45, 48], [43, 46, 50], [40, 44, 47]]  # Am F Gm E
CALM = [[48, 52, 55], [53, 57, 60], [45, 48, 52], [55, 59, 62]]  # C F Am G


def music(total, mood):
    """mood(t) -> (storm 0..1, level 0..1)."""
    out = np.zeros((int(total * SR) + SR, 2), np.float32)
    beat = 60 / 72
    bar = 4 * beat
    for b in range(int(total / bar) + 1):
        t0 = b * bar
        storm, lvl = mood(t0)
        ch = (STORM if storm > 0.5 else CALM)[b % 4]
        pad = sum(tone(midi(n), bar + 1.4) + 0.5 * tone(midi(n) * 1.005, bar + 1.4) for n in ch) / 4
        pad += 0.8 * tone(midi(ch[0] - 12), bar + 1.4)
        fade = np.minimum(1, np.arange(len(pad)) / (0.8 * SR)) * np.minimum(1, np.arange(len(pad))[::-1] / (0.8 * SR))
        add(out, fast_lp((pad * fade).astype(np.float32), 500 + 2200 * lvl), t0, 0.11)
        if storm > 0.5:
            # tense ostinato + toms
            for k in range(8):
                p = tone(midi(ch[0]), 0.25, "tri") * env(int(0.25 * SR), 0.004, 0.09)
                add(out, p.astype(np.float32), t0 + k * beat / 2, 0.05 * lvl, pan=0.3 if k % 2 else -0.3)
            for k in (0, 1.5, 2, 3.5):
                tt = np.arange(int(0.6 * SR)) / SR
                tom = np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 15)) * tt) * np.exp(-tt * 5)
                add(out, tom.astype(np.float32), t0 + k * beat, 0.3 * lvl)
        else:
            notes = [ch[0] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 12]
            step = 2 if lvl < 0.4 else 1
            for k in range(0, 4, step):
                add(out, piano(notes[k], 3.4), t0 + k * beat, 0.055 + 0.04 * lvl, pan=(k % 2) * 0.4 - 0.2)
    m = reverb(out.mean(1), 3.2, 0.45)
    st = np.stack([m, m], 1) * 0.9 + out * 0.4
    return st


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    sentences, sections, clips = [], [], []
    t = START
    with tempfile.TemporaryDirectory() as tmp:
        speak = speaker(tmp, VOICE, RATE, PITCH)
        for k, (pal, title, lines) in enumerate(SECTIONS):
            if k:
                t += SECTION_GAP if pal != 3 else 2.4
            sections.append({"palette": pal, "start": round(t, 3), "title": title})
            if title:
                t += 1.1
            for line in lines:
                clip, words = speak(line)
                clips.append((t, clip))
                sentences.append({
                    "start": round(t, 3), "end": round(t + len(clip) / SR, 3), "text": line,
                    "words": [{"w": w, "t": round(wt, 3)} for w, wt in words],
                })
                t += len(clip) / SR + GAP
    verse_start = t + 0.6
    cta_start = verse_start + VERSE_LEN
    total = cta_start + CTA_LEN + 0.6
    sec_t = [s["start"] for s in sections] + [total]
    calm_t = sections[3]["start"]

    def pal_at(x):
        return sections[max([0] + [i for i, s in enumerate(sec_t[:-1]) if s <= x])]["palette"]

    # lightning schedule (shared with the video)
    flashes = []
    x = sections[0]["start"] + 4.0
    while x < calm_t - 0.6:
        p = pal_at(x)
        if p in (1, 2) or (p == 0 and x > sections[1]["start"] - 3):
            flashes.append(round(x, 3))
            x += rng.uniform(2.4, 4.6)
        else:
            x += 0.5
    flashes = [f for f in flashes if f < calm_t - 0.8]

    n = int(total * SR) + SR
    voice = np.zeros((n, 2), np.float32)
    for st, c in clips:
        add(voice, c, st, 1.0)
    vm = reverb(voice[:, 0].copy(), 1.2, 0.12)
    voice = np.stack([vm, vm], 1)

    def mood(x):
        p = pal_at(x)
        return {0: (1, 0.35), 1: (1, 0.8), 2: (1, 0.95), 3: (0, 0.25), 4: (0, 0.35), 5: (0, 0.8)}[p]

    mus = music(total, mood)[:n]
    envv = np.convolve(np.abs(voice[:, 0]), np.ones(2205) / 2205, "same")
    duck = 1 - 0.45 * np.clip(envv / 0.05, 0, 1)
    duck = np.convolve(duck, np.ones(8820) / 8820, "same")[:, None]
    mus *= duck
    out_dir = os.path.join(root, "public", "tempete")
    os.makedirs(out_dir, exist_ok=True)

    # storm bed: rises from the start, cuts quickly into the calm
    storm_len = calm_t + 1.5
    ramp = np.clip(np.arange(int(storm_len * SR)) / SR / sections[1]["start"], 0.2, 1)
    cut = np.clip((calm_t + 1.2 - np.arange(int(storm_len * SR)) / SR) / 1.6, 0, 1)
    bed = (rain(storm_len) * 0.9 + gusts(storm_len) + waves(storm_len, 1.0))[: len(ramp)] * ramp * cut
    amb = np.zeros((n, 2), np.float32)
    add(amb, bed.astype(np.float32), 0, 0.9)
    for f in flashes:
        add(amb, thunder(), f + rng.uniform(0.15, 0.5), 0.65, pan=rng.uniform(-0.4, 0.4))
    calm_len = total - calm_t
    add(amb, (lapping(calm_len) + gusts(calm_len, 0.15)).astype(np.float32), calm_t, 0.9)
    dawn = sections[5]["start"]
    add(amb, seagulls(total - dawn), dawn, 0.8, pan=0.3)

    # the storm must never cover the words: duck it hard under the voice
    amb_duck = 1 - 0.78 * np.clip(envv / 0.04, 0, 1)
    amb_duck = np.convolve(amb_duck, np.ones(6615) / 6615, "same")[:, None]
    write_wav(os.path.join(out_dir, "voice-check.wav"), voice[: int(total * SR)] / max(1e-6, np.max(np.abs(voice))) * 0.9)
    mix = voice * 1.0 + mus * 0.6 + amb * 0.5 * amb_duck
    mix /= np.max(np.abs(mix)) / 0.89
    write_wav(os.path.join(out_dir, "mix.wav"), mix[: int(total * SR)])
    tl = {
        "audioFile": "tempete/mix.wav",
        "durationSeconds": round(total, 3),
        "sections": sections,
        "sentences": sentences,
        "flashes": flashes,
        "verse": {"start": round(verse_start, 3), "text": VERSE, "ref": VERSE_REF},
        "cta": {"start": round(cta_start, 3), "text": CTA},
    }
    with open(os.path.join(root, "src", "compositions", "tempete.timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    for s in sections:
        print("section", s)
    print("flashes", len(flashes), "total", round(total, 2))


if __name__ == "__main__":
    main()
