# Fabrique les voix, les bruitages, la musique de fond et le plan de montage (timeline.json)
import json, os, subprocess, sys, wave, hashlib
from episodes import EPISODES

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
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, v, rate=r, pitch=p).save(out)
            return
        except Exception:
            if attempt == 3:
                raise
            await asyncio.sleep(2 + 2 * attempt)

def tts(who, text):
    v, r, p = VOICE[who]
    key = hashlib.md5(f"{who}|{v}|{r}|{p}|{text}".encode()).hexdigest()[:12]
    path = os.path.join(CACHE, f"{who}_{key}.wav")
    if not os.path.exists(path):
        raw = path + ".mp3"
        asyncio.run(_say(text, v, r, p, raw))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"{_SR},areverse,{_SR},areverse",
                        "-ar", "24000", "-ac", "1", path], check=True)
        os.remove(raw)
    return path, dur(path)

SFX_EXPR = {
    "vibrate": ("0.5*sin(2*PI*150*t)*gt(sin(2*PI*28*t),0)*lt(mod(t,0.7),0.4)", 1.4, ""),
    "door": ("0.9*sin(2*PI*75*t)*exp(-10*t)+0.25*(random(0)*2-1)*exp(-35*t)", 0.8, ""),
    "zip": ("(random(0)*2-1)*0.7*(0.6+0.4*sin(2*PI*45*t))*lt(t,1.0)", 1.1, ",bandpass=f=2800:w=1800"),
    "bell": ("0.5*sin(2*PI*880*t)*exp(-3*t)*lt(t,0.6)+0.5*sin(2*PI*698*(t-0.6))*exp(-3*(t-0.6))*gt(t,0.6)", 1.8, ""),
    "ring": ("0.35*(sin(2*PI*440*t)+sin(2*PI*480*t))*lt(mod(t,3),1.2)", 3.2, ""),
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
    for sh in ep["shots"]:
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
                lines_out.append({**ln, "start": cur, "end": cur + d})
                cur += d + 0.3
            if lines_out:
                cur -= 0.3
            length = max(cur + sh.get("post", 0.6), sh.get("min", 0))
            length += sh.get("blackEnd", 0)
        for (at, name) in sh.get("sfx", []):
            clips.append((sfx(name), t + at, 1.0))
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
          "total": total, "shots": shots}
    with open(os.path.join(d, "timeline.json"), "w") as f:
        json.dump(tl, f, ensure_ascii=False, indent=1)
    print(f"Épisode {ep['num']} : {total:.1f} s, {len(clips)} sons")

if __name__ == "__main__":
    for ep in EPISODES:
        if len(sys.argv) < 2 or str(ep["num"]) in sys.argv[1:]:
            build(ep)
