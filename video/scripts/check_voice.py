"""Check every voiced sentence of a timeline: detected language and transcription.

Usage (from video/): python3 scripts/check_voice.py public/x/mix.wav src/compositions/x.timeline.json
Prints one line per sentence; lines marked !! need attention.
"""

import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave

import numpy as np
from faster_whisper import WhisperModel


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z ]", "", s)


def main():
    mix, tl = sys.argv[1], json.load(open(sys.argv[2]))
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mix, "-ac", "1", "-ar", "16000", f.name], check=True)
        with wave.open(f.name) as w:
            a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    m = WhisperModel("small", compute_type="int8")
    bad = 0
    for s in tl["sentences"]:
        seg = a[int((s["start"] - 0.1) * 16000): int((s["end"] + 0.2) * 16000)]
        r, info = m.transcribe(seg)
        heard = " ".join(x.text for x in r).strip()
        score = difflib.SequenceMatcher(None, norm(heard), norm(s["text"])).ratio()
        flag = "!!" if info.language != "fr" or score < 0.8 else "ok"
        bad += flag == "!!"
        print(f"{flag} {info.language} {score:.2f} | {s['text']}  =>  {heard}")
    print("sentences needing attention:", bad)


if __name__ == "__main__":
    main()
