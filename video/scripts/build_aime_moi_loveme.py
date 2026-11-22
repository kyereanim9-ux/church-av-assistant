"""AimeMoi (colour) on a song: the instrumental part plays under the quotes
and each "MOI" interlude lands on a sung "love me" from the chorus.

Usage (from video/):
  python3 scripts/build_aime_moi_loveme.py path/to/song.mp3

The song is the user's file; the resulting mix (public/aime-moi/couleur.wav)
is git-ignored so the track is not committed to the repository.
Segment times below are for JMSN - "Love Me" (found with faster-whisper).
"""

import json
import os
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_aime_moi import FINAL, LEAD, QUOTES, edge, reverb, VOICE  # noqa: E402
from build_pas_a_pas_audio import SR, add, fast_bp, fast_lp, noise, read_wav, write_wav  # noqa: E402

GAP = 1.35  # gap after the voice clip: ~1 s of real silence once the reverb tail has died
BED_START = 19.0  # instrumental, no vocals until ~59 s
# (start, end, offset of "me" from start) for each interlude: single, isolated
# "Love me" phrases from the song's intro (each followed by a short silence)
HITS = [
    (0.30, 2.95, 0.84),
    (3.20, 5.95, 0.90),
    (6.20, 8.95, 0.84),
    (12.50, 14.25, 0.60),
    (3.20, 5.95, 0.90),
]
# ending: "oh, love me. Oh, love me baby... you should say that you love me"
END = (251.90, 264.60)
END_BEATS = [0.90, 2.24, 3.46, 4.14, 4.94, 10.66, 11.14]


def seg(song, a, b, fade=0.06):
    x = song[int(a * SR): int(b * SR)].copy()
    f = int(fade * SR)
    x[:f] *= np.linspace(0, 1, f)[:, None]
    x[-f:] *= np.linspace(1, 0, f)[:, None]
    return x


def main():
    src = sys.argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "song.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ar", str(SR), "-ac", "2", wav], check=True)
        import wave

        with wave.open(wav) as w:
            song = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, 2) / 32768

        events, voice_clips, bed_parts, hit_parts = [], [], [], []
        t, bed_pos = 0.4, BED_START
        for k, (user, ago, text) in enumerate(QUOTES + [("", "", FINAL)]):
            clip, words = edge(text, VOICE, "-12%", "-6Hz", tmp)
            start = t
            v0 = start + LEAD
            end = v0 + len(clip) / SR + GAP
            voice_clips.append((v0, clip))
            bed_parts.append((start, bed_pos, end - start))
            bed_pos += end - start
            events.append({
                "type": "quote" if user else "final", "start": round(start, 3), "end": round(end, 3),
                "user": user, "ago": ago, "text": text,
                "words": [{"w": w, "t": round(v0 + wt - start, 3)} for w, wt in words],
            })
            t = end
            if user:
                a, b, me = HITS[k]
                hit_parts.append((t, a, b))
                events.append({"type": "hit", "start": round(t, 3), "end": round(t + b - a, 3), "beats": [0.12, me]})
                t += b - a
        a, b = END
        hit_parts.append((t, a, b))
        events.append({"type": "end", "start": round(t, 3), "end": round(t + b - a + 1.2, 3), "beats": END_BEATS})
        total = t + b - a + 1.2

    n = int(total * SR) + SR
    mix = np.zeros((n, 2), np.float32)

    voice = np.zeros((n, 2), np.float32)
    for st, c in voice_clips:
        add(voice, c, st, 1.0)
    vm = reverb(voice[:, 0].copy(), 1.4, 0.15)
    voice = np.stack([vm, vm], 1)

    # instrumental bed under the quotes: a little muffled, ducked under the voice
    bed = np.zeros((n, 2), np.float32)
    for st, src_t, d in bed_parts:
        x = seg(song, src_t, src_t + d, 0.25)
        i = int(st * SR)
        bed[i: i + len(x)] += x[: n - i]
    bed = np.stack([fast_lp(bed[:, 0], 2400), fast_lp(bed[:, 1], 2400)], 1)
    envv = np.convolve(np.abs(voice[:, 0]), np.ones(2205) / 2205, "same")
    duck = 1 - 0.5 * np.clip(envv / 0.05, 0, 1)
    bed *= np.convolve(duck, np.ones(6615) / 6615, "same")[:, None]

    # the "love me" moments, clean: no boom or riser before them
    hits = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)
    for st, a, b in hit_parts:
        x = seg(song, a, b, 0.04)
        i = int(st * SR)
        hits[i: i + len(x)] += x[: n - i]
    # let the last hit ring out
    tail_i = int((total - 1.2) * SR)
    hits[tail_i:] *= np.linspace(1, 0, len(hits) - tail_i)[:, None]

    # music only on the "love me" moments: the quotes are voice only
    mix = voice * 1.0 + bed * 0.0 + hits * 1.0 + fx * 0.7
    mix /= np.max(np.abs(mix)) / 0.89
    os.makedirs(os.path.join(root, "public", "aime-moi"), exist_ok=True)
    write_wav(os.path.join(root, "public", "aime-moi", "couleur.wav"), mix[: int(total * SR)])
    tl = {"audioFile": "aime-moi/couleur.wav", "durationSeconds": round(total, 3), "color": True, "pair": ["LOVE", "ME"], "events": events}
    with open(os.path.join(root, "src", "compositions", "aimeMoiCouleur.timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    for e in events:
        print(e["type"], e["start"], e["end"])
    print("total", round(total, 2))


if __name__ == "__main__":
    main()
