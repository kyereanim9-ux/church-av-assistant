"""Build the soundtrack and timeline for the AimeMoi composition.

Deep quotes shown as comments over a dark night scene, each read by a
neural French voice, separated by a glitchy "MOI" hit with a whispered
"aime-moi". Writes public/aime-moi/mix.wav and
src/compositions/aimeMoi.timeline.json.

Usage (from video/):  python3 scripts/build_aime_moi.py
"""

import asyncio
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_pas_a_pas_audio import (  # noqa: E402
    SR, add, env, fast_bp, fast_lp, midi, noise, read_wav, tone, write_wav,
)

VOICE = "fr-FR-HenriNeural"
WHISPER_VOICE = "fr-FR-DeniseNeural"

QUOTES = [
    ("ame.silencieuse", "42 min", "Le ciel cache ses étoiles le jour… comme un homme cache ses larmes."),
    ("nuit_sans_lune", "38 min", "Beaucoup restent quand il fait beau. Très peu restent quand il pleut."),
    ("le.marcheur", "31 min", "Ne cours pas après ceux qui partent. Un chemin qui se vide fait de la place à ceux qui arrivent."),
    ("coeur.en.veille", "24 min", "J'ai tout donné sans compter… et j'ai oublié d'en garder un peu pour moi."),
    ("ombre_douce", "12 min", "Le silence d'un homme n'est pas du vide. C'est tout ce qu'il n'a jamais pu dire."),
]
FINAL = "Aime-toi… avant que le monde t'apprenne à t'oublier."

LEAD = 0.6  # card visible before the voice starts
TAIL = 0.9  # after the voice, before the hit
HIT = 1.9  # length of a "MOI" interlude
rng = np.random.default_rng(11)


def edge(text, voice, rate, pitch, tmp):
    os.environ.setdefault("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt")
    import edge_tts

    mp3 = os.path.join(tmp, "v.mp3")
    wav = os.path.join(tmp, "v.wav")
    words = []

    async def run():
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary",
                                 proxy=os.environ.get("HTTPS_PROXY"))
        with open(mp3, "wb") as f:
            async for ch in c.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    words.append((ch["text"], ch["offset"] / 1e7))

    asyncio.run(run())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", str(SR), "-ac", "1", wav], check=True)
    a = read_wav(wav)
    idx = np.where(np.abs(a) > 0.01)[0]
    cut = max(0, idx[0] - 200)
    return a[cut: idx[-1] + 3000], [(w, t - cut / SR) for w, t in words]


def reverb(x, seconds=2.6, wet=0.35, damp=3500):
    n = int(seconds * SR)
    ir = rng.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / (SR * seconds / 6))
    ir = fast_lp(ir, damp)
    ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
    return x * (1 - wet) + y.astype(np.float32) * wet * 2.2


def piano(m, dur=3.5):
    f = midi(m)
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * k * t) * (0.6 ** k) for k in range(1, 6))
    return (s * np.exp(-t * 1.4) * np.minimum(1, t / 0.004)).astype(np.float32)


def music(total, hits):
    out = np.zeros(int(total * SR) + SR, np.float32)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
    bar = 4.8
    for b in range(int(total / bar) + 1):
        notes = chords[b % 4]
        pad = sum(tone(midi(n - 12), bar + 1.0) for n in notes) / 3
        pad += 0.5 * tone(midi(notes[0] - 24), bar + 1.0)
        fade = np.minimum(1, np.arange(len(pad)) / (1.2 * SR)) * np.minimum(1, np.arange(len(pad))[::-1] / (1.2 * SR))
        i = int(b * bar * SR)
        seg = (fast_lp(pad.astype(np.float32), 900) * fade)[: len(out) - i]
        out[i: i + len(seg)] += seg * 0.12
        for k, m in enumerate([notes[0] + 12, notes[2] + 12, notes[1] + 24, notes[2] + 12]):
            t = b * bar + k * 1.2 + rng.uniform(0, 0.05)
            j = int(t * SR)
            p = piano(m)[: max(0, len(out) - j)]
            out[j: j + len(p)] += p * 0.09
    # vinyl crackle
    cr = np.zeros_like(out)
    for _ in range(int(total * 14)):
        j = rng.integers(0, len(cr) - 50)
        cr[j: j + 30] += rng.standard_normal(30) * rng.uniform(0.02, 0.08)
    out += fast_bp(cr, 1000, 9000) + fast_lp(noise(len(out) / SR), 3000)[: len(out)] * 0.004
    out = reverb(out, 3.2, 0.45)
    # duck the music hard during the hits (they bring their own sound)
    g = np.ones_like(out)
    for s0, s1 in hits:
        a, b = int(s0 * SR), int(s1 * SR)
        g[a:b] = 0.25
    g = np.convolve(g, np.ones(int(0.08 * SR)) / int(0.08 * SR), "same")
    return out * g


def hit_sfx(whisper):
    d = HIT
    n = int(d * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 12)) * t) * np.exp(-t * 2.2)
    glitch = fast_bp(noise(d), 800, 7000)[:n]
    gate = ((np.floor(t * 28) % 3) == 0) * (t < 0.35) + ((np.floor(t * 40) % 4) == 0) * ((t > 1.2) & (t < 1.45))
    s = boom * 0.9 + glitch * gate * 0.25
    s[: len(whisper)] += whisper[:n] * 0.9
    return s.astype(np.float32)


def riser(d=0.9):
    n = int(d * SR)
    x = fast_bp(noise(d), 1500, 9000)[:n]
    return (x * (np.linspace(0, 1, n) ** 3) * 0.35).astype(np.float32)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    events, voice_clips, hits = [], [], []
    t = 0.4
    with tempfile.TemporaryDirectory() as tmp:
        w_clip, _ = edge("Aime-moi.", WHISPER_VOICE, "-20%", "-6Hz", tmp)
        whisper = reverb(fast_lp(w_clip, 5000), 2.5, 0.6)
        for user, ago, text in QUOTES + [("", "", FINAL)]:
            clip, words = edge(text, VOICE, "-12%", "-6Hz", tmp)
            start = t
            v0 = start + LEAD
            end = v0 + len(clip) / SR + TAIL
            voice_clips.append((v0, clip))
            ev = {
                "type": "quote" if user else "final",
                "start": round(start, 3), "end": round(end, 3),
                "user": user, "ago": ago, "text": text,
                "words": [{"w": w, "t": round(v0 + wt - start, 3)} for w, wt in words],
            }
            events.append(ev)
            t = end
            if user:
                hits.append((t, t + HIT))
                events.append({"type": "hit", "start": round(t, 3), "end": round(t + HIT, 3)})
                t += HIT
        total = t + 3.2
        events.append({"type": "end", "start": round(t, 3), "end": round(total, 3)})
        hits.append((t, total))

    n = int(total * SR) + SR
    voice = np.zeros((n, 2), np.float32)
    for st, c in voice_clips:
        add(voice, c, st, 1.0)
    vmono = reverb(voice[:, 0].copy(), 1.6, 0.18)
    voice = np.stack([vmono, vmono], 1)

    mus = music(total, hits)[:n]
    envv = np.convolve(np.abs(voice[:, 0]), np.ones(2205) / 2205, "same")
    duck = 1 - 0.45 * np.clip(envv / 0.05, 0, 1)
    mus *= np.convolve(duck, np.ones(6615) / 6615, "same")

    fx = np.zeros((n, 2), np.float32)
    for s0, s1 in hits[:-1]:
        add(fx, riser(), s0 - 0.9, 1.0)
        add(fx, hit_sfx(whisper), s0, 1.0)
    end0 = hits[-1][0]
    add(fx, riser(1.2), end0 - 1.2, 1.0)
    add(fx, hit_sfx(whisper), end0, 1.2)
    add(fx, hit_sfx(whisper) * 0.6, end0 + 1.0, 1.0)

    mix = voice * 1.0 + np.stack([mus, mus], 1) * 0.9 + fx * 0.8
    mix /= np.max(np.abs(mix)) / 0.89
    os.makedirs(os.path.join(root, "public", "aime-moi"), exist_ok=True)
    write_wav(os.path.join(root, "public", "aime-moi", "mix.wav"), mix[: int(total * SR)])
    tl = {"audioFile": "aime-moi/mix.wav", "durationSeconds": round(total, 3), "events": events}
    with open(os.path.join(root, "src", "compositions", "aimeMoi.timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    for e in events:
        print(e["type"], e["start"], e["end"], e.get("text", "")[:50])
    print("total", round(total, 2))


if __name__ == "__main__":
    main()
