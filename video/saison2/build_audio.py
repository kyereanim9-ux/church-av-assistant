# Fabrique les voix, les bruitages, la musique de fond et le plan de montage (timeline.json)
import json, os, subprocess, sys, wave, hashlib
EPISODES = __import__(os.environ.get('EP_MODULE', 'episodes')).EPISODES

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "build")
CACHE = os.path.join(OUT, "tts")
os.makedirs(CACHE, exist_ok=True)

# Voix neuronales naturelles (edge-tts, gratuit). Derrière un proxy TLS : CA_BUNDLE=/chemin/ca.crt
if os.environ.get("CA_BUNDLE"):
    import certifi
    certifi.where = lambda: os.environ["CA_BUNDLE"]
import asyncio, edge_tts

VOICE = {  # voix, débit, hauteur
    "N": ("fr-FR-HenriNeural", "-8%", "-4Hz"),     # narrateur
    "V": ("fr-FR-HenriNeural", "-14%", "-4Hz"),    # lecture des versets, plus lente
    "M": ("fr-CH-FabriceNeural", "-2%", "+0Hz"),   # Marc
    "T": ("fr-CH-FabriceNeural", "-8%", "-2Hz"),   # Marc, dans sa tête
    "G": ("fr-FR-DeniseNeural", "-2%", "+0Hz"),    # Grâce
    "P": ("fr-BE-GerardNeural", "-12%", "-8Hz"),   # Samuel, le père
}
_SR = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.06"

def dur(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()

async def _say(text, v, r, p, out):
    """Synthèse + minutage de chaque mot (WordBoundary), pour les sous-titres mot à mot."""
    for attempt in range(4):
        try:
            audio, words = bytearray(), []
            async for c in edge_tts.Communicate(text, v, rate=r, pitch=p, boundary="WordBoundary").stream():
                if c["type"] == "audio":
                    audio += c["data"]
                elif c["type"] == "WordBoundary":
                    words.append({"w": c["text"], "s": c["offset"] / 1e7, "e": (c["offset"] + c["duration"]) / 1e7})
            if not audio:
                raise RuntimeError("audio vide")
            open(out, "wb").write(audio)
            return words
        except Exception:
            if attempt == 3:
                raise
            await asyncio.sleep(2 + 2 * attempt)

def tts(who, text):
    v, r, p = VOICE[who]
    key = hashlib.md5(f"{who}|{v}|{r}|{p}|{text}".encode()).hexdigest()[:12]
    path = os.path.join(CACHE, f"{who}_{key}.wav")
    wj = path + ".words.json"
    if not os.path.exists(path) or not os.path.exists(wj):
        raw = path + ".mp3"
        words = asyncio.run(_say(text, v, r, p, raw))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"{_SR},areverse,{_SR},areverse",
                        "-ar", "24000", "-ac", "1", path], check=True)
        os.remove(raw)
        shift = max(0.0, (words[0]["s"] if words else 0) - 0.06)  # silence de début retiré
        for w in words:
            w["s"] = round(max(0, w["s"] - shift), 3); w["e"] = round(max(0, w["e"] - shift), 3)
        json.dump(words, open(wj, "w"), ensure_ascii=False)
    return path, dur(path)

def words_for(who, text):
    v, r, p = VOICE[who]
    key = hashlib.md5(f"{who}|{v}|{r}|{p}|{text}".encode()).hexdigest()[:12]
    try:
        return json.load(open(os.path.join(CACHE, f"{who}_{key}.wav.words.json")))
    except Exception:
        return []

def sync_words(display, spoken, d):
    """Associe chaque mot affiché à un instant de la voix (les textes affiché/prononcé peuvent différer)."""
    disp = display.split()
    if not disp:
        return []
    if not spoken:
        return [{"w": w, "s": round(d * i / len(disp), 3)} for i, w in enumerate(disp)]
    n = len(spoken)
    return [{"w": w, "s": spoken[min(n - 1, int(i * n / len(disp)))]["s"]} for i, w in enumerate(disp)]

def split_shots(shots):
    """Une idée par plan : dans une scène à deux, chaque réplique passe en plan serré sur celui qui parle
    (champ / contrechamp). Le premier plan reste large pour situer la scène."""
    out = []
    for sh in shots:
        chars = sh.get("chars") or []
        lines = sh.get("lines") or []
        if sh["scene"] != "room" or len(chars) < 2 or len(lines) < 2 or sh.get("nosplit") \
           or any(c.get("hands") == "join" for c in chars) or any(l["who"] == "MG" for l in lines):
            out.append(sh); continue
        last_keys = ("post", "stampEnd", "suivre", "freeze", "blackEnd")
        for i, ln in enumerate(lines):
            part = {k: v for k, v in sh.items() if k not in ("lines",) + last_keys}
            if i > 0:
                part.pop("sfx", None); part.pop("label", None); part.pop("stamp", None); part["cut"] = True
            who = "M" if ln["who"] == "M" else ln["who"]
            solo = [c for c in chars if c["who"] == who]
            if i > 0 and solo and ln["who"] != "N":
                part["chars"] = [dict(solo[0], look=0)]
            part["lines"] = [ln]
            part["post"] = 0.15
            if i == len(lines) - 1:
                for k in last_keys:
                    if k in sh: part[k] = sh[k]
            out.append(part)
    return out


SFX_EXPR = {
    "vibrate": ("0.5*sin(2*PI*150*t)*gt(sin(2*PI*28*t),0)*lt(mod(t,0.7),0.4)", 1.4, ""),
    "door": ("0.9*sin(2*PI*75*t)*exp(-10*t)+0.25*(random(0)*2-1)*exp(-35*t)", 0.8, ""),
    "zip": ("(random(0)*2-1)*0.7*(0.6+0.4*sin(2*PI*45*t))*lt(t,1.0)", 1.1, ",bandpass=f=2800:w=1800"),
    "bell": ("0.5*sin(2*PI*880*t)*exp(-3*t)*lt(t,0.6)+0.5*sin(2*PI*698*(t-0.6))*exp(-3*(t-0.6))*gt(t,0.6)", 1.8, ""),
    "ring": ("0.35*(sin(2*PI*440*t)+sin(2*PI*480*t))*lt(mod(t,3),1.2)", 3.2, ""),
    "heart": ("0.9*sin(2*PI*48*t)*exp(-22*t)+0.7*sin(2*PI*44*(t-0.24))*exp(-22*(t-0.24))*gt(t,0.24)", 0.8, ",lowpass=f=200,volume=2.2"),
    "whoosh": ("(random(0)*2-1)*sin(PI*t/0.9)*0.8", 0.9, ",bandpass=f=900:w=1400"),
    "pop": ("0.8*sin(2*PI*(180-120*t)*t)*exp(-14*t)", 0.5, ",lowpass=f=1200"),
    "riser": ("(random(0)*2-1)*0.5*pow(t/1.8,2)+0.3*sin(2*PI*(80+200*t)*t)*pow(t/1.8,2)", 1.8, ",bandpass=f=1500:w=2500"),
    "hit": ("0.9*sin(2*PI*52*t)*exp(-3.5*t)+0.4*sin(2*PI*104*t)*exp(-6*t)", 1.5, ""),
}

def sfx(name):
    path = os.path.join(CACHE, f"sfx_{name}.wav")
    if not os.path.exists(path):
        expr, d, filt = SFX_EXPR[name]
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                        f"aevalsrc='{expr}':s=22050:d={d}", "-af", f"volume=0.8{filt}", path], check=True)
    return path

def build(ep):
    clips = []   # (path, start, volume)
    shots = []
    t = 0.0
    for sh in split_shots(ep["shots"]):
        s = dict(sh)
        s.pop("sfx", None)
        s["start"] = t
        lines_out = []
        sc = sh["scene"]
        if sc == "verse":
            cur = 0.4
            if sh.get("intro"):
                p, d = tts("N", sh["intro"]); lines_out.append({"who": "N", "text": sh["intro"], "start": cur, "end": cur + d, "role": "intro"})
                clips.append((p, t + cur, 1.0)); cur += d + 0.7
            p, d = tts("V", sh["verse"].strip("«» ")); lines_out.append({"who": "N", "text": sh["verse"], "start": cur, "end": cur + d, "role": "verse"})
            clips.append((p, t + cur, 1.0)); cur += d + 0.4
            p, d = tts("V", sh["refSay"]); lines_out.append({"who": "N", "text": sh["ref"], "start": cur, "end": cur + d, "role": "ref"})
            clips.append((p, t + cur, 1.0)); cur += d + 1.3
            length = cur
        elif sc in ("message", "end"):
            text = sh.get("say") or sh["text"].replace("\n", " ")
            cur = 0.5
            p, d = tts("N", text); lines_out.append({"who": "N", "text": text, "start": cur, "end": cur + d, "role": "voice"})
            clips.append((p, t + cur, 1.0)); cur += d
            length = cur + (1.8 if sc == "end" else 1.2)
        else:
            cur = 0.35
            for ln in sh.get("lines", []):
                say = ln.get("say", ln["text"])
                if ln["who"] == "MG":
                    p1, d1 = tts("M", say); p2, d2 = tts("G", say); d = max(d1, d2)
                    clips.append((p1, t + cur, 1.0)); clips.append((p2, t + cur, 0.9))
                else:
                    who = "T" if (ln["who"] == "M" and ln.get("think")) else ln["who"]
                    p, d = tts(who, say)
                    if ln.get("phone"):  # voix au téléphone
                        q = p.replace(".wav", "_tel.wav")
                        if not os.path.exists(q):
                            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-af", "highpass=f=350,lowpass=f=3200,volume=1.4", q], check=True)
                        p = q
                    clips.append((p, t + cur, 1.0))
                wsrc = "T" if (ln["who"] == "M" and ln.get("think")) else ("M" if ln["who"] == "MG" else ln["who"])
                lines_out.append({**ln, "start": cur, "end": cur + d, "words": sync_words(ln["text"], words_for(wsrc, say), d)})
                cur += d + 0.3
            if lines_out:
                cur -= 0.3
            length = max(cur + sh.get("post", 0.6), sh.get("min", 0))
            length += sh.get("blackEnd", 0)
        for (at, name) in sh.get("sfx", []):
            clips.append((sfx(name), t + at, 1.0))
        if sh.get("stamp"):
            clips.append((sfx("pop"), t + 0.12, 0.8))
        if sh.get("stampEnd") and lines_out:
            clips.append((sfx("pop"), t + lines_out[-1]["end"] + 0.22, 0.8))
        if sh.get("suivre") and lines_out:
            clips.append((sfx("riser"), max(t, t + lines_out[-1]["end"] + 0.3 - 1.8), 0.8))
            clips.append((sfx("hit"), t + lines_out[-1]["end"] + 0.3, 0.9))
        if sh.get("tension"):  # battements de cœur + nappe grave pendant tout le plan
            k = 0.3
            while k < length - 0.4:
                clips.append((sfx("heart"), t + k, 0.9)); k += 0.9
            dr = os.path.join(CACHE, f"drone_{round(length, 2)}.wav")
            if not os.path.exists(dr):
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                                f"aevalsrc='0.35*sin(2*PI*55*t)+0.2*sin(2*PI*82.4*t)*(0.6+0.4*sin(2*PI*0.4*t))+0.12*sin(2*PI*58.3*t)':s=22050:d={length}",
                                "-af", f"lowpass=f=400,volume=0.55,afade=t=in:d=0.8,afade=t=out:st={max(length-0.6, 0)}:d=0.6", dr], check=True)
            clips.append((dr, t, 1.0))
        s["lines"] = lines_out
        s["dur"] = round(length, 3)
        shots.append(s)
        t += length
    total = round(t, 3)
    d = os.path.join(OUT, f"ep{ep['num']}")
    os.makedirs(d, exist_ok=True)

    # Musique de fond : nappe douce (accord de la mineur) qui respire lentement
    music = os.path.join(d, "music.wav")
    expr = ("0.30*sin(2*PI*110*t)+0.22*sin(2*PI*164.81*t)+0.16*sin(2*PI*220.6*t)"
            "+0.12*sin(2*PI*261.63*t)*(0.5+0.5*sin(2*PI*0.07*t))+0.08*sin(2*PI*329.6*t)*(0.5+0.5*sin(2*PI*0.11*t+1))")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=44100:d={total}",
                    "-af", f"tremolo=f=0.18:d=0.35,lowpass=f=900,volume=0.09,afade=t=in:d=2,afade=t=out:st={max(total-2.5,0)}:d=2.5",
                    music], check=True)

    # Mixage
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", music]
    filt = ["[0:a]aresample=44100,aformat=channel_layouts=stereo[m]"]
    labels = ["[m]"]
    for i, (p, at, vol) in enumerate(clips, start=1):
        args += ["-i", p]
        ms = int(at * 1000)
        filt.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[a{i}]")
        labels.append(f"[a{i}]")
    filt.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first,alimiter=limit=0.95[out]")
    audio = os.path.join(d, "audio.wav")
    args += ["-filter_complex", ";".join(filt), "-map", "[out]", audio]
    subprocess.run(args, check=True)

    tl = {"num": ep["num"], "title": ep["title"], "tag": ep.get("tag", ""), "cover": ep["cover"],
          "total": total, "shots": shots,
          **{k: ep[k] for k in ("header", "verseLabel", "coverLines", "coverLabel", "hook") if k in ep}}
    with open(os.path.join(d, "timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    print(f"Épisode {ep['num']} : {total:.1f} s, {len(clips)} sons")

if __name__ == "__main__":
    for ep in EPISODES:
        if len(sys.argv) < 2 or str(ep["num"]) in sys.argv[1:]:
            build(ep)
