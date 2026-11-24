"""Split one continuous voice-over recording into per-sentence clips.

Usage (from video/):
  python3 scripts/split_voice.py recording.mp3 src/compositions/x.timeline.json out_dir

Aligns the known script to the recording with faster-whisper word
timestamps, cuts between sentences in the middle of the pauses and writes
out_dir/clip_000.wav ... plus out_dir/words.json (word times relative to
each clip). The audio builders read these with VOICE_DIR=out_dir.
"""

import difflib
import json
import os
import re
import subprocess
import sys
import unicodedata
import wave

import numpy as np

SR = 44100


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z]", "", s)


def main():
    src, tl_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    sentences = [s["text"] for s in json.load(open(tl_path))["sentences"]]
    wav = os.path.join(out, "full.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), wav], check=True)
    with wave.open(wav) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)

    from faster_whisper import WhisperModel

    m = WhisperModel("small", compute_type="int8")
    segs, _ = m.transcribe(a16, language="fr", word_timestamps=True, initial_prompt=" ".join(sentences))
    heard = [(norm(w.word), w.start, w.end) for s in segs for w in s.words if norm(w.word)]

    script = []  # (sentence index, word)
    for i, s in enumerate(sentences):
        for tok in s.split():
            if norm(tok):
                script.append((i, norm(tok)))
    sm = difflib.SequenceMatcher(None, [w for _, w in script], [h[0] for h in heard], autojunk=False)
    t_start = [None] * len(script)
    t_end = [None] * len(script)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            t_start[blk.a + k] = heard[blk.b + k][1]
            t_end[blk.a + k] = heard[blk.b + k][2]
    # fill gaps by interpolation
    known = [k for k in range(len(script)) if t_start[k] is not None]
    for k in range(len(script)):
        if t_start[k] is None:
            prev = max([j for j in known if j < k], default=None)
            nxt = min([j for j in known if j > k], default=None)
            if prev is not None and nxt is not None:
                f = (k - prev) / (nxt - prev)
                t_start[k] = t_end[prev] + f * (t_start[nxt] - t_end[prev])
            else:
                t_start[k] = t_end[prev] if prev is not None else 0.0
            t_end[k] = t_start[k] + 0.2

    first = {}
    last = {}
    for k, (i, _) in enumerate(script):
        first.setdefault(i, k)
        last[i] = k
    bounds = []
    for i in range(len(sentences)):
        s0, s1 = t_start[first[i]], t_end[last[i]]
        bounds.append([s0, s1])
    cuts = [max(0.0, bounds[0][0] - 0.15)]
    for i in range(len(sentences) - 1):
        cuts.append((bounds[i][1] + bounds[i + 1][0]) / 2)
    cuts.append(min(len(a) / SR, bounds[-1][1] + 0.6))

    words_out = []
    matched = sum(1 for b in sm.get_matching_blocks() for _ in range(b.size))
    for i in range(len(sentences)):
        c0, c1 = cuts[i], cuts[i + 1]
        clip = a[int(c0 * SR): int(c1 * SR)].copy()
        # trim silence at both ends, keep a short tail
        idx = np.where(np.abs(clip) > 0.008)[0]
        lead = max(0, idx[0] - int(0.03 * SR)) if len(idx) else 0
        tail = min(len(clip), idx[-1] + int(0.25 * SR)) if len(idx) else len(clip)
        clip = clip[lead:tail]
        f = int(0.02 * SR)
        clip[:f] *= np.linspace(0, 1, f)
        clip[-f:] *= np.linspace(1, 0, f)
        with wave.open(os.path.join(out, f"clip_{i:03d}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(clip, -1, 1) * 32767).astype(np.int16).tobytes())
        off = c0 + lead / SR
        ws = [(sentences[i].split()[j], t_start[k] - off)
              for j, k in enumerate([k for k in range(len(script)) if script[k][0] == i])]
        words_out.append([{"w": w, "t": round(max(0.0, t), 3)} for w, t in ws])
        print(f"{i:02d} {c0:6.2f}-{c1:6.2f} {len(clip) / SR:4.2f}s  {sentences[i]}")
    json.dump(words_out, open(os.path.join(out, "words.json"), "w"), ensure_ascii=False)
    os.remove(wav)
    print(f"matched {matched}/{len(script)} words")


if __name__ == "__main__":
    main()
