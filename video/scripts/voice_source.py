"""Where the voice-over comes from.

By default each sentence is synthesised with edge-tts. With VOICE_DIR set
(a folder made by split_voice.py from a natural recording, e.g. an
ElevenLabs voice or your own), the sentences are taken from there in order.
VOICE_TEMPO (default 0.94) slows those clips slightly, keeping the pitch,
for a calmer delivery.
"""

import json
import os
import subprocess

import numpy as np

from build_aime_moi import edge
from build_pas_a_pas_audio import SR, read_wav

VOICE_DIR = os.environ.get("VOICE_DIR")
TEMPO = float(os.environ.get("VOICE_TEMPO", "0.94"))


def speaker(tmp, voice, rate, pitch):
    words_all = json.load(open(os.path.join(VOICE_DIR, "words.json"))) if VOICE_DIR else None
    state = {"i": 0}

    def speak(line):
        if not VOICE_DIR:
            return edge(line, voice, rate, pitch, tmp)
        i = state["i"]
        state["i"] += 1
        src = os.path.join(VOICE_DIR, f"clip_{i:03d}.wav")
        dst = os.path.join(tmp, "slow.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"atempo={TEMPO}", "-ar", str(SR), dst], check=True)
        clip = read_wav(dst).astype(np.float32)
        # even out loudness: soft endings of a natural read must not sink under the music
        rms = np.sqrt(np.mean(clip[np.abs(clip) > 0.01] ** 2)) if np.any(np.abs(clip) > 0.01) else 0.05
        clip = clip * (0.1 / max(rms, 1e-4))
        clip = np.tanh(clip * 1.3) / 1.3
        words = [(w["w"], w["t"] / TEMPO) for w in words_all[i]]
        return clip, words

    return speak
