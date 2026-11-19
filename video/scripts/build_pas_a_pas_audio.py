"""Build the soundtrack and synced timeline for the PasAPas composition.

Reads scripts/pas-a-pas.script.json (scenes + French voice lines), then:
  1. synthesises each voice line (Microsoft neural voice via edge-tts, or Piper offline),
  2. aligns the on-screen words to the spoken words with faster-whisper,
  3. re-times the scenes around the voice,
  4. synthesises music (plucked guitar, bass, drums, glockenspiel) and SFX,
  5. writes public/pas-a-pas/mix.wav and src/compositions/pasAPas.timeline.json.

Usage (from video/):
  python3 scripts/build_pas_a_pas_audio.py                       # natural neural voice
  python3 scripts/build_pas_a_pas_audio.py --voice fr_FR-tom-medium.onnx  # offline Piper
"""

import argparse
import json
import os
import re
import subprocess
import tempfile
import unicodedata
import wave

import numpy as np

SR = 44100
LEAD = 0.3  # seconds of scene before the voice starts
TAIL = 0.9  # seconds after the voice before the next scene
GAP = 1.5  # silence inserted for "|" in a voice line
END_PAD = 2.2
rng = np.random.default_rng(7)


# --------------------------------------------------------------------------- io
def read_wav(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2:
            a = a.reshape(-1, 2).mean(1)
    if sr != SR:
        a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a).astype(np.float32)
    return a


def write_wav(path, stereo):
    s = np.clip(stereo, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((s * 32767).astype(np.int16).tobytes())


def resample16k(a):
    return np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)


# ------------------------------------------------------------------------ voice
def edge_tts_words(text, voice, mp3):
    """Neural voice via edge-tts; returns [(word, start_seconds), ...] from WordBoundary events."""
    import asyncio

    if os.path.exists("/root/.ccr/ca-bundle.crt"):
        os.environ.setdefault("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt")
    import edge_tts

    words = []

    async def run():
        c = edge_tts.Communicate(
            text, voice, rate="-6%", boundary="WordBoundary", proxy=os.environ.get("HTTPS_PROXY")
        )
        with open(mp3, "wb") as f:
            async for ch in c.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    words.append((ch["text"], ch["offset"] / 1e7))

    asyncio.run(run())
    return words


def tts(text, model, tmp):
    """model is a Piper .onnx path, or "edge:<VoiceName>" for a Microsoft neural voice.

    Returns (audio, words) where words is [(word, start)] or None if unknown."""
    out = os.path.join(tmp, "seg.wav")
    words = None
    if model.startswith("edge:"):
        mp3 = os.path.join(tmp, "seg.mp3")
        words = edge_tts_words(text, model[5:], mp3)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", str(SR), "-ac", "1", out], check=True)
    else:
        subprocess.run(
            ["python3", "-m", "piper", "-m", model, "-f", out, "--length-scale", "1.08"],
            input=text.encode(),
            check=True,
            capture_output=True,
        )
    a = read_wav(out)
    # trim leading/trailing silence
    idx = np.where(np.abs(a) > 0.01)[0]
    if not len(idx):
        return a, words
    cut = max(0, idx[0] - 200)
    if words is not None:
        words = [(w, st - cut / SR) for w, st in words]
    return a[cut : idx[-1] + 2000], words


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z']", "", s).replace("'", "")


def align(chunks, audio, whisper, text, known=None):
    """Return the start time (s) of each on-screen chunk inside audio."""
    if known is not None:
        spoken = [(norm(w), st) for w, st in known]
    else:
        segs, _ = whisper.transcribe(
            resample16k(audio), language="fr", word_timestamps=True, initial_prompt=text
        )
        spoken = [(norm(w.word), w.start) for s in segs for w in s.words]
    times, j, last = [], 0, 0.0
    for c in chunks:
        first = norm(c.split()[0])
        found = None
        for k in range(j, len(spoken)):
            sw = spoken[k][0]
            if sw and first and (sw.startswith(first[:4]) or first.startswith(sw[:4])):
                found = k
                break
        if found is None:
            t = last + 0.35
        else:
            t = spoken[found][1]
            j = found + 1
        t = max(t, last + 0.12 if times else 0)
        times.append(t)
        last = t
    return times


# ------------------------------------------------------------------------ synth
def env(n, a=0.005, r=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def tone(freq, dur, kind="sine"):
    t = np.arange(int(dur * SR)) / SR
    if callable(freq):
        ph = 2 * np.pi * np.cumsum(freq(t)) / SR
    else:
        ph = 2 * np.pi * freq * t
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def noise(dur):
    return rng.standard_normal(int(dur * SR)).astype(np.float32)


def onepole(x, cutoff, high=False):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a) * x[i] + a * prev
        y[i] = prev
    return x - y if high else y


def fast_lp(x, cutoff):
    # vectorised one-pole via lfilter-free FFT approximation (fine for noise)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / cutoff) ** 2), len(x)).astype(np.float32)


def fast_bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] *= 0.05
    return np.fft.irfft(X, len(x)).astype(np.float32)


def pluck(freq, dur, bright=0.5):
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p).astype(np.float32)
    buf = fast_lp(np.tile(buf, 4), 2000 + bright * 6000)[:p]
    out = np.zeros(n, np.float32)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, 0.002, dur)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def add(track, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= len(track) or i < 0:
        return
    sig = sig[: len(track) - i] * gain
    track[i : i + len(sig), 0] += sig * (1 - max(0, pan))
    track[i : i + len(sig), 1] += sig * (1 + min(0, pan))


# ---- SFX library -----------------------------------------------------------
def sfx_pop():
    return tone(lambda t: 380 + 900 * np.minimum(t / 0.07, 1), 0.12) * env(int(0.12 * SR), 0.002, 0.04)


def sfx_whoosh(d=0.35):
    n = noise(d)
    sweep = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return fast_bp(n, 600, 5000) * sweep * 0.5


def sfx_drop():
    d = 0.28
    whistle = tone(lambda t: 1400 - 2600 * t, d, "tri") * 0.35 * np.linspace(1, 0.4, int(d * SR))
    thud = tone(lambda t: 140 * np.exp(-t * 18) + 45, 0.25) * env(int(0.25 * SR), 0.001, 0.07)
    return np.concatenate([whistle, thud * 1.4])


def sfx_tick():
    return fast_bp(noise(0.02), 2000, 8000) * env(int(0.02 * SR), 0.0005, 0.006) * 0.8


def sfx_boing():
    d = 0.55
    return tone(lambda t: 170 + 70 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 5), d) * env(
        int(d * SR), 0.003, 0.2
    )


def sfx_chime(notes=(84, 88, 91, 96), step=0.07):
    out = np.zeros(int((len(notes) * step + 1.4) * SR), np.float32)
    for i, m in enumerate(notes):
        f = midi(m)
        s = (tone(f, 1.2) + 0.3 * tone(f * 2.76, 1.2)) * env(int(1.2 * SR), 0.002, 0.35)
        j = int(i * step * SR)
        out[j : j + len(s)] += s
    return out * 0.35


def sfx_sparkle(d=1.2, density=18):
    out = np.zeros(int(d * SR), np.float32)
    for _ in range(int(density * d)):
        f = rng.uniform(2200, 5200)
        s = tone(f, 0.25) * env(int(0.25 * SR), 0.001, 0.05)
        j = int(rng.uniform(0, d - 0.25) * SR)
        out[j : j + len(s)] += s * rng.uniform(0.1, 0.3)
    return out


def sfx_rain(d):
    n = fast_lp(noise(d), 1800) * 0.25
    for _ in range(int(d * 22)):
        s = tone(rng.uniform(900, 1800), 0.04) * env(int(0.04 * SR), 0.001, 0.01)
        j = int(rng.uniform(0, d - 0.05) * SR)
        n[j : j + len(s)] += s * 0.25
    fade = np.minimum(1, np.minimum(np.arange(len(n)), np.arange(len(n))[::-1]) / (0.4 * SR))
    return n * fade


def sfx_question():
    d = 0.3
    return tone(lambda t: 500 + 700 * (t / d) ** 2, d, "tri") * env(int(d * SR), 0.01, 0.15) * 0.6


def sfx_slide(down=True, d=0.55):
    f = (lambda t: 1500 - 1100 * t / d) if down else (lambda t: 450 + 1200 * t / d)
    return tone(f, d) * np.hanning(int(d * SR)) * 0.5


def sfx_thud():
    return tone(lambda t: 110 * np.exp(-t * 12) + 40, 0.4) * env(int(0.4 * SR), 0.001, 0.12) * 1.6 + fast_lp(
        noise(0.4), 400
    ) * env(int(0.4 * SR), 0.001, 0.05) * 0.6


def sfx_rustle(d=0.6):
    n = fast_bp(noise(d), 1500, 7000)
    am = (np.abs(np.sin(np.linspace(0, 9 * np.pi, len(n)))) ** 3) * np.hanning(len(n))
    return n * am * 0.35


def sfx_sip():
    d = 0.5
    return fast_bp(noise(d), 300, 1400) * (np.abs(np.sin(np.linspace(0, 3 * np.pi, int(d * SR))))) * 0.5


def sfx_ting():
    f = midi(98)
    return (tone(f, 1.0) + 0.5 * tone(f * 2.4, 1.0)) * env(int(1.0 * SR), 0.001, 0.25) * 0.3


def sfx_step():
    return fast_lp(noise(0.08), 900) * env(int(0.08 * SR), 0.001, 0.02) * 0.8


# ----------------------------------------------------------------------- music
CHORDS = {  # root midi, chord tones (midi) — I V vi IV in C
    "C": (48, [60, 64, 67, 72]),
    "G": (43, [59, 62, 67, 71]),
    "Am": (45, [57, 60, 64, 69]),
    "F": (41, [57, 60, 65, 69]),
    "Dm": (50, [57, 62, 65, 69]),
}
PROG = ["C", "G", "Am", "F"]
MELODY = [76, 79, 81, 79, 76, 74, 72, 74]  # pentatonic glock motif (one note per beat)


def music(total, sections):
    bpm = 96
    beat = 60 / bpm
    bar = 4 * beat
    tr = np.zeros((int(total * SR) + SR, 2), np.float32)
    nbars = int(np.ceil(total / bar))

    def level(t, name):
        return next((s[name] for s in sections if s["start"] <= t < s["end"]), sections[-1][name])

    kick = tone(lambda t: 120 * np.exp(-t * 25) + 48, 0.3) * env(int(0.3 * SR), 0.001, 0.12)
    shaker = fast_bp(noise(0.06), 5000, 12000) * env(int(0.06 * SR), 0.003, 0.02)
    clap = fast_bp(noise(0.15), 900, 4000) * env(int(0.15 * SR), 0.001, 0.05)

    for b in range(nbars):
        t0 = b * bar
        if t0 > total - 1.5:
            break
        moody = level(t0, "moody")
        prog = ["Am", "F", "Dm", "G"] if moody else PROG
        root, notes = CHORDS[prog[b % 4]]
        # guitar arpeggio, 8th notes
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for k, idx in enumerate(pattern):
            t = t0 + k * beat / 2
            add(tr, pluck(midi(notes[idx]), 1.2, 0.4), t, 0.32, pan=-0.3 + 0.15 * (k % 2))
        # warm pad
        pad = sum(tone(midi(n), bar) for n in notes[:3]) / 3
        pad *= np.minimum(1, np.arange(len(pad)) / (0.3 * SR)) * np.minimum(1, np.arange(len(pad))[::-1] / (0.3 * SR))
        add(tr, pad, t0, 0.06)
        # bass
        for k in (0, 2.5, 3):
            if level(t0, "drums") or k == 0:
                bass = (tone(midi(root), beat) + 0.3 * tone(midi(root) * 2, beat)) * env(int(beat * SR), 0.005, 0.35)
                add(tr, np.tanh(bass * 1.5), t0 + k * beat, 0.32)
        # drums
        if level(t0, "drums"):
            for k in range(4):
                if k in (0, 2):
                    add(tr, kick, t0 + k * beat, 0.55)
                for h in range(2):
                    add(tr, shaker, t0 + k * beat + h * beat / 2, 0.12 if h else 0.07, pan=0.4)
            if level(t0, "claps"):
                for k in (1, 3):
                    add(tr, clap, t0 + k * beat, 0.3)
        # glockenspiel
        if level(t0, "glock"):
            for k in range(4):
                m = MELODY[(b * 4 + k) % len(MELODY)]
                g = (tone(midi(m), 0.9) + 0.25 * tone(midi(m) * 2.76, 0.9)) * env(int(0.9 * SR), 0.002, 0.3)
                add(tr, g, t0 + k * beat, 0.12, pan=0.35)
    # final chord ring
    root, notes = CHORDS["C"]
    for i, n in enumerate(notes + [76]):
        add(tr, pluck(midi(n), 2.5, 0.6), total - 1.9 + i * 0.03, 0.3)
    add(tr, sfx_chime((84, 88, 91, 96, 100)), total - 1.9, 0.6)
    fade = np.minimum(1, (len(tr) - np.arange(len(tr))) / (0.8 * SR))[:, None]
    return tr * fade


# ------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="edge:fr-FR-HenriNeural",
                    help="edge:<Voice> (natural, needs network) or a Piper .onnx model (offline)")
    ap.add_argument("--whisper", default="small")
    args = ap.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    script = json.load(open(os.path.join(here, "pas-a-pas.script.json")))

    from faster_whisper import WhisperModel

    whisper = WhisperModel(args.whisper, compute_type="int8")

    scenes, voice_clips, t = [], [], 0.0
    with tempfile.TemporaryDirectory() as tmp:
        for sc in script["scenes"]:
            parts = sc["voice"].split("|")
            clip = np.zeros(0, np.float32)
            known = []
            for i, p in enumerate(parts):
                if i:
                    clip = np.concatenate([clip, np.zeros(int(GAP * SR), np.float32)])
                seg, words = tts(p, args.voice, tmp)
                if words is None:
                    known = None
                elif known is not None:
                    known += [(w, st + len(clip) / SR) for w, st in words]
                clip = np.concatenate([clip, seg])
            text = sc["voice"].replace("|", " ")
            times = align([w["text"] for w in sc["words"]], clip, whisper, text, known)
            dur = max(3.4, LEAD + len(clip) / SR + TAIL)
            new = {k: v for k, v in sc.items() if k != "voice"}
            new["start"], new["end"] = round(t, 3), round(t + dur, 3)
            new["words"] = [dict(w, at=round(float(LEAD + tt - 0.04), 3)) for w, tt in zip(sc["words"], times)]
            if sc.get("fall"):
                new["fallAt"] = round(new["words"][0]["at"] + 0.75, 3)
                new["riseAt"] = round(new["words"][1]["at"] - 0.2, 3)
            print(f"{t:6.2f}s  {dur:4.2f}s  {text}  ->  {[w['at'] for w in new['words']]}")
            voice_clips.append((t + LEAD, clip))
            scenes.append(new)
            t += dur

    total = t + END_PAD
    n = int(total * SR) + SR

    # ---- voice track (+ light room reverb)
    voice = np.zeros((n, 2), np.float32)
    for st, c in voice_clips:
        add(voice, c, st, 1.0)
    v = voice[:, 0].copy()
    rev = np.zeros_like(v)
    for dly, g in ((0.045, 0.25), (0.083, 0.18), (0.131, 0.12), (0.19, 0.08)):
        k = int(dly * SR)
        rev[k:] += v[:-k] * g
    voice += fast_lp(rev, 3500)[:, None] * 0.6

    # ---- music with sections
    def at(i):
        return scenes[i]["start"]

    sections = [
        {"start": 0, "end": at(1), "moody": False, "drums": False, "claps": False, "glock": True},
        {"start": at(1), "end": at(2), "moody": True, "drums": False, "claps": False, "glock": False},
        {"start": at(2), "end": at(5), "moody": False, "drums": True, "claps": False, "glock": False},
        {"start": at(5), "end": at(6), "moody": False, "drums": True, "claps": False, "glock": False},
        {"start": at(6), "end": total + 5, "moody": False, "drums": True, "claps": True, "glock": True},
    ]
    mus = music(total, sections)[:n]

    # sidechain duck under the voice
    envv = np.abs(voice[:, 0])
    k = int(0.05 * SR)
    envv = np.convolve(envv, np.ones(k) / k, "same")
    duck = 1 - 0.55 * np.clip(envv / 0.05, 0, 1)
    duck = np.convolve(duck, np.ones(int(0.15 * SR)) / int(0.15 * SR), "same")
    mus *= duck[:, None]

    # ---- SFX
    fx = np.zeros((n, 2), np.float32)
    for i, sc in enumerate(scenes):
        s0 = sc["start"]
        if i:
            add(fx, sfx_whoosh(0.4), s0 - 0.2, 0.35)
        for w in sc["words"]:
            wt = s0 + w["at"]
            pan = (w["x"] - 960) / 1400
            st = w.get("style", "pop")
            if st == "pop":
                add(fx, sfx_pop(), wt, 0.35, pan)
            elif st in ("slide", "vertical"):
                add(fx, sfx_whoosh(0.3), wt - 0.05, 0.4, pan)
            elif st == "drop":
                add(fx, sfx_drop(), wt, 0.35, pan)
            elif st == "type":
                for c in range(len(w["text"])):
                    add(fx, sfx_tick(), wt + c * 2 / 30, 0.25, pan)
            elif st == "stretch":
                add(fx, sfx_boing(), wt, 0.35, pan)
                add(fx, sfx_sparkle(0.8, 14), wt + 0.1, 0.5, pan)
        prop, end = sc["prop"], sc["end"]
        if prop == "cloud":
            add(fx, sfx_rain(end - s0), s0, 0.5)
        elif prop == "sun":
            add(fx, sfx_chime(), s0 + 0.2, 0.8, -0.4)
        elif prop == "plan":
            add(fx, sfx_rustle(), s0 + 0.1, 0.7, -0.2)
        elif prop == "question":
            for d in (0.2, 0.6, 1.0):
                add(fx, sfx_question(), s0 + d, 0.4, 0.3)
        elif prop == "rock":
            add(fx, sfx_slide(True), s0 + sc["fallAt"], 0.6)
            add(fx, sfx_thud(), s0 + sc["fallAt"] + 0.6, 0.9)
            add(fx, sfx_slide(False), s0 + sc["riseAt"], 0.5)
        elif prop == "coffee":
            add(fx, sfx_sip(), s0 + 0.3, 0.6, 0.2)
            add(fx, sfx_ting(), s0 + 0.9, 0.7, 0.2)
        elif prop == "lantern" and sc["pose"] != "walk":
            add(fx, sfx_sparkle(1.5, 22), s0 + 0.1, 0.8, -0.1)
            add(fx, sfx_chime((79, 84, 88, 91)), s0 + 0.2, 0.6)
        if sc["pose"] == "walk":
            step = 31.4 / 30 / 2
            k2 = 0
            while s0 + k2 * step < end - 0.3:
                add(fx, sfx_step(), s0 + k2 * step, 0.5, 0.15 if k2 % 2 else -0.15)
                k2 += 1

    mix = voice * 1.0 + mus * 0.55 + fx * 0.6
    mix /= max(1e-6, np.max(np.abs(mix))) / 0.89
    out_dir = os.path.join(root, "public", "pas-a-pas")
    os.makedirs(out_dir, exist_ok=True)
    write_wav(os.path.join(out_dir, "mix.wav"), mix[: int(total * SR)])

    timeline = {
        "title": script["title"],
        "audioFile": "pas-a-pas/mix.wav",
        "durationSeconds": round(total, 3),
        "scenes": scenes,
    }
    with open(os.path.join(root, "src", "compositions", "pasAPas.timeline.json"), "w") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)
    print(f"total {total:.2f}s -> public/pas-a-pas/mix.wav")


if __name__ == "__main__":
    main()
