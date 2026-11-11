"""Génère les voix (edge-tts), la musique d'ambiance et les données de timing
de la série « Lui ou elle ? ».

    pip install edge-tts numpy
    python3 tools/lui_ou_elle.py            # depuis video/

Sorties : public/luiouelle/<ep>/NN.mp3, public/luiouelle/pad.mp3,
src/compositions/luiouelle/data.ts. Les répliques déjà présentes ne sont pas
régénérées. Derrière un proxy TLS, définir CA_BUNDLE=/chemin/ca.crt.
"""
import asyncio, json, os, subprocess, sys
import numpy as np

if os.environ.get("CA_BUNDLE"):
    import certifi
    certifi.where = lambda: os.environ["CA_BUNDLE"]
import edge_tts

FPS = 30
GAP = 0.3      # silence entre deux répliques (s)
INTRO = 0.4    # silence avant la première réplique (s)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public", "luiouelle")
OUT = os.path.join(ROOT, "src", "compositions", "luiouelle", "data.ts")

# Voix 100 % françaises : les voix « Multilingual » prononcent parfois les
# répliques courtes (« Non. », « Elle. ») dans une autre langue.
V = {  # voix, débit, hauteur
    "M": ("fr-FR-HenriNeural", "-6%", "-6Hz"),
    "L": ("fr-CH-FabriceNeural", "+2%", "+2Hz"),
    "E": ("fr-FR-DeniseNeural", "+0%", "+0Hz"),
}

# (qui, texte, pause avant en secondes). "LE" = Lui et Elle ensemble : "lui|elle"
EP = {}
EP["ep1_elle_a_change"] = [
("M","Tu te souviens de la personne que tu as rencontrée au début ?",0),
("L","Oui… Elle riait de tout.",0),
("M","Et quand ton nom s'affichait sur son téléphone ?",0),
("L","Elle souriait avant même de décrocher.",0),
("M","Et en voiture ?",0),
("L","Elle posait sa main sur la mienne. Sans raison.",0),
("M","Et aujourd'hui ?",0),
("L","Elle ne le fait plus.",1.2),
("M","Le premier soir où elle t'a dit « ça m'a fait mal », tu as répondu quoi ?",0.8),
("L","Que ce n'était pas ce que je voulais dire.",0),
("M","Et ensuite ?",0),
("L","Qu'elle prenait tout mal.",0),
("M","Et qui a fini par s'excuser ?",0),
("L","Elle.",1.2),
("M","Et la fois d'après ?",0),
("L","Elle aussi.",0),
("M","Alors la fois suivante, avant de te dire qu'elle avait mal… elle s'est demandé quoi ?",0.8),
("L","Si ça valait une dispute.",0),
("M","Et un jour ?",0),
("L","Elle a arrêté de me le dire.",0),
("M","Et toi, tu as pensé quoi ?",0),
("L","Que ça allait mieux. Moins de disputes.",0),
("M","Moins de disputes… ou moins d'espoir d'être entendue ?",0),
("M","Le matin, avant de parler, elle regarde quoi ?",2.0),
("L","Mon humeur… je suppose.",0),
("M","Ses amis, ceux que tu critiquais ?",0),
("L","Elle ne les voit plus.",0),
("M","Son avis ?",0),
("L","Elle ne le donne plus.",0),
("M","Alors quand tu lui dis « tu as changé »…",0),
("L","Elle a changé. Parce qu'elle ne m'aime plus ?",0),
("M","Ou parce qu'elle a appris à se protéger… de toi ?",0),
("L","Je ne voulais pas lui faire de mal.",1.8),
("M","Je te crois. Qui t'a fait mal, toi, quand tu étais petit ?",0),
("L","Beaucoup de monde.",1.2),
("M","Et elle, elle en faisait partie ?",0),
("L","Non.",0),
("M","Alors pourquoi c'est elle qui paie ?",0),
("M","Premier Jean, chapitre 4, verset 18 : « La crainte n'est pas dans l'amour, mais l'amour parfait bannit la crainte. »",1.5),
("M","Est-ce qu'elle a peur de toi ?",0.5),
("L","De ma réaction… oui.",2.0),
("M","Alors ce que vous vivez… c'est encore de l'amour ?",0),
("L","Je veux que ça le redevienne.",0),
("M","La prochaine fois qu'elle te dira « ça m'a fait mal », tu répondras quoi ?",0.8),
("L","Je t'entends. Je suis désolé.",0),
("M","Et après ?",0),
("L","Je le prouverai. Jour après jour.",0),
("M","Et la femme qui te prenait la main en voiture… tu crois qu'elle est partie ?",0.8),
("L","Non… Elle attend juste de ne plus avoir peur.",0),
]
EP["ep2_il_a_change"] = [
("M","Tu te souviens de l'homme que tu as rencontré au début ?",0),
("E","Il m'écrivait dès qu'il se réveillait.",0),
("M","Et quand il rentrait du travail ?",0),
("E","Il me racontait tout. Même les détails sans importance.",0),
("M","Et aujourd'hui ?",0),
("E","Il rentre. Il dit « ça va ». Et il prend son téléphone.",1.2),
("M","La première fois qu'il t'a dit « ce que tu as dit devant tes amies, ça m'a blessé »… tu as répondu quoi ?",0.8),
("E","Que c'était une blague. Qu'il était trop susceptible.",0),
("M","Et quand il a insisté ?",0),
("E","Je lui ai rappelé tout ce que lui m'avait fait.",0),
("M","Et qui a fini par s'excuser ?",0),
("E","Lui.",1.2),
("M","Et la fois d'après ?",0),
("E","Lui aussi.",0),
("M","Alors aujourd'hui, avant de te raconter sa journée… il se demande quoi ?",0.8),
("E","Si je vais trouver quelque chose à critiquer.",0),
("M","Ses amis ?",0),
("E","Je ne les aimais pas. Il ne les voit plus.",0),
("M","Et quand il se tait, tu penses quoi ?",0),
("E","Qu'il s'en fiche. Qu'il ne m'aime plus.",0),
("M","Ou qu'il a compris que chaque mot pouvait se retourner contre lui ?",0),
("E","Je ne voulais pas le blesser. J'avais juste peur qu'il parte.",2.0),
("M","Qui est parti, avant lui ?",0),
("E","Mon père.",2.0),
("M","Et lui… c'est ton père ?",0),
("E","Non.",0),
("M","Alors pourquoi c'est lui qui paie ?",0),
("M","Proverbes, chapitre 12, verset 18 : « Tel, qui parle légèrement, blesse comme un glaive ; mais la langue des sages apporte la guérison. »",1.5),
("M","Tes mots… ils le blessent, ou ils le guérissent ?",0.5),
("E","Ils le blessent.",1.5),
("M","Et ta peur qu'il parte… elle le retient, ou elle le pousse dehors ?",0),
("E","Elle le pousse.",0.8),
("M","Ce soir, quand il rentrera et dira « ça va »… tu feras quoi ?",0.8),
("E","Je poserai mon téléphone. Je lui demanderai comment il va vraiment.",0),
("M","Et s'il te dit que tu l'as blessé ?",0),
("E","Je ne me défendrai pas. Je dirai : je t'entends.",0),
("M","Et l'homme qui t'écrivait dès son réveil… tu crois qu'il est parti ?",0.8),
("E","Non… Il attend juste de pouvoir parler sans être jugé.",0),
]
EP["ep3_celle_qui_s_est_eteinte"] = [
("M","Quand est-ce que tu as ri pour la dernière fois… vraiment ?",0),
("E","Je ne me souviens plus.",1.2),
("M","Avant, tu étais comment ?",0),
("E","Je parlais beaucoup. Je racontais tout. Je chantais en cuisinant.",0),
("M","Et maintenant ?",0),
("E","Maintenant, je fais attention.",0),
("M","À quoi ?",0),
("E","À son humeur. Au ton de sa voix. À la façon dont il ferme la porte.",0),
("M","Le matin, tu penses d'abord à quoi ? À comment tu vas… ou à comment il va ?",0.8),
("E","À comment il va.",1.2),
("M","Et tes amies ?",0),
("E","Il ne les aimait pas. C'était plus simple de ne plus les voir.",0),
("M","Ton avis ?",0),
("E","Je le garde. Ça évite les disputes.",0),
("M","Tes besoins ?",0),
("E","Je ne veux pas être « trop ».",0),
("M","Qui t'a dit que tu étais trop ?",0),
("E","Lui. Chaque fois que je disais « ça m'a fait mal ».",0),
("M","Et tu l'as cru ?",0),
("E","J'ai fini par le croire.",0),
("M","Alors il reste quoi de toi ?",0),
("E","Pas grand-chose. Ma lumière est éteinte.",2.0),
("M","Ésaïe, chapitre 42, verset 3 : « Il ne brisera point le roseau cassé, et il n'éteindra point le lumignon qui fume. »",1.5),
("M","Une mèche qui fume… elle est éteinte ?",0.5),
("E","Non. Il reste une braise.",0),
("M","Et Dieu, il souffle dessus pour l'éteindre… ou pour la rallumer ?",0),
("E","Pour la rallumer.",1.5),
("M","Ce que tu ressentais… c'était « trop » ?",1.0),
("E","Non. C'était réel.",0),
("M","Tu mérites quel amour ?",0),
("E","Un amour où je peux dire « ça m'a fait mal »… sans avoir peur.",0),
("M","Et demain, une seule petite chose pour toi ?",0),
("E","Appeler une amie. Celle que je ne vois plus.",0),
("M","Et ta lumière ?",0),
("E","Elle n'a pas disparu… Elle était juste fatiguée de se cacher.",0),
]
EP["ep4_celui_qui_s_est_eteint"] = [
("M","Ça fait combien de temps que tu n'as pas dit ce que tu ressens vraiment ?",0),
("L","Je ne sais plus.",0),
("M","Pourquoi ?",0),
("L","Parce que ça finit toujours mal.",0),
("M","Quand tu dis « ça m'a fait mal », elle répond quoi ?",0),
("L","Que je suis trop sensible. Qu'un homme ne devrait pas se plaindre.",0),
("M","Et toi, tu as fini par croire quoi ?",0),
("L","Que mes émotions dérangent.",0),
("M","Alors tu fais quoi, de ce que tu ressens ?",0.8),
("L","Je le garde. Je travaille plus. Je rentre plus tard.",0),
("M","Et ça, c'est la paix ?",0),
("L","C'est le calme.",0),
("M","Le calme dehors… et dedans ?",0),
("L","Dedans, c'est la tempête.",1.2),
("M","Tu te souviens de qui tu étais avant ?",0),
("L","Je riais fort. Je faisais des projets.",0),
("M","Il est où, cet homme ?",0),
("L","Je l'ai rangé. Pour éviter les disputes.",0),
("M","Tu crois que Dieu aussi te trouve trop sensible ?",1.0),
("L","Je ne sais pas.",1.5),
("M","Psaume 34, verset 19 : « L'Éternel est près de ceux qui ont le cœur brisé, et il sauve ceux qui ont l'esprit dans l'abattement. »",1.0),
("M","Il s'éloigne de ceux qui ont mal… ou il s'approche ?",0.5),
("L","Il s'approche.",0),
("M","Alors pourquoi toi, tu te caches ?",0),
("M","Est-ce que te taire a sauvé votre couple ?",2.0),
("L","Non. Ça l'a juste rendu silencieux.",0),
("M","Et si demain tu disais une seule phrase vraie, sans crier, sans reproche ?",0),
("L","Quand tu dis ça, je me sens petit. J'ai besoin que tu m'écoutes.",0),
("M","Et si elle se défend ?",0),
("L","Je resterai calme. Mais je ne me tairai plus.",0),
("M","Alors cet homme qui riait fort… il a disparu ?",0.8),
("L","Non… Il était juste fatigué de se cacher.",0),
]
EP["ep5_je_t_entends"] = [
("M","Il vient de te dire « ça m'a fait mal ». Ta première envie, c'est quoi ?",0),
("E","Me défendre. Expliquer ce que je voulais dire.",0),
("M","Et ensuite ?",0),
("E","Lui rappeler ce qu'il a fait, lui.",0),
("M","Et ça finit comment, d'habitude ?",0),
("E","Par trois jours de silence.",0),
("M","Alors qu'est-ce qu'il te demandait vraiment ? Que tu reconnaisses que tu as tort ?",0.8),
("E","Non… Juste que je l'écoute.",1.0),
("M","Jacques, chapitre 1, verset 19 : « Que tout homme soit prompt à écouter, lent à parler, lent à se mettre en colère. »",1.2),
("M","Prompt à quoi ?",0.5),
("E","À écouter.",0),
("M","Et toi, tu es prompte à quoi ?",0),
("E","À répondre.",1.0),
("M","Alors essayons. Il te dit « ça m'a fait mal ». Tu réponds quoi ?",0.8),
("E","Ce n'est pas ce que je voul…",0),
("E","Je t'entends. Explique-moi.",2.0),
("M","Et quand il a fini ?",0),
("E","Je suis désolée. Je ne veux plus te blesser comme ça.",0),
("M","Et demain ?",0),
("E","Je le montre. Pas seulement avec des mots.",0),
("M","Avec quoi ?",0),
("E","En le laissant parler… sans qu'il ait peur de ma réaction.",0),
("M","Trois phrases. Tu peux les dire ce soir ?",0.8),
("E","Oui.",0),
]
EP["ep6_et_si_c_etait_les_deux"] = [
("M","Qui a commencé ?",0),
("LE","Elle.|Lui.",0),
("M","Vous voyez le problème ?",0.3),
("M","Quand elle te fait un reproche, tu fais quoi ?",0.5),
("L","Je me tais.",0),
("M","Et quand il se tait ?",0),
("E","Je parle plus fort. Je pique.",0),
("M","Et quand elle pique ?",0),
("L","Je me tais encore plus.",0),
("M","Alors… qui a commencé ?",0),
("E","Personne.",1.2),
("L","Tous les deux.",0),
("M","Pourquoi tu te tais ?",0.8),
("L","Pour éviter la dispute.",0),
("M","Et toi, pourquoi tu piques ?",0),
("E","Pour qu'il réagisse. Pour sentir que je compte.",0),
("M","Lui cherche la paix. Toi, tu cherches le lien. Au fond, vous voulez quoi ?",0),
("L","Rester ensemble.",1.0),
("M","Alors vous vous battez l'un contre l'autre… ou contre le problème ?",0),
("E","L'un contre l'autre.",0),
("M","Colossiens, chapitre 3, verset 13 : « Supportez-vous les uns les autres, et, si l'un a sujet de se plaindre de l'autre, pardonnez-vous réciproquement. »",1.5),
("M","Réciproquement. Ça veut dire quoi ?",0.5),
("L","Pas un seul qui pardonne.",0),
("E","Les deux.",0),
("M","Alors ce soir… qui fait le premier pas ?",0.8),
("L","Moi. Je parle au lieu de me taire.",2.0),
("E","Et moi, j'écoute au lieu d'attaquer.",0),
("M","Et la prochaine fois que ça déraille ?",0),
("E","On dit « pause ». Pas « tu fais toujours ça ».",0),
("L","Et on en reparle le soir même. Avant de dormir.",0),
("M","Alors vous êtes quoi, maintenant ? Deux adversaires ?",0),
("LE","Une équipe.|Une équipe.",0.8),
]


META = {
    "ep1_elle_a_change": dict(num=1, love="L", action="Réponds en commentaire", title="Elle a changé", verse="1 Jean 4:18",
        cover=["Elle a changé…", "ou tu l'as éteinte ?"], cast="ML",
        end=["Tu te reconnais en lui…", "ou en elle ?"]),
    "ep2_il_a_change": dict(num=2, love="E", action="Réponds en commentaire", title="Il a changé", verse="Proverbes 12:18",
        cover=["Il a changé…", "ou tu l'as fait taire ?"], cast="ME",
        end=["Tu te reconnais en elle…", "ou en lui ?"]),
    "ep3_celle_qui_s_est_eteinte": dict(num=3, love="E", action="Partage cette vidéo à quelqu'un qui a besoin de l'entendre", title="Celle qui s'est éteinte", verse="Ésaïe 42:3",
        cover=["Tu n'étais pas", "trop sensible"], cast="ME",
        end=["Tu n'étais pas « trop ».", "Ta lumière n'a pas disparu."]),
    "ep4_celui_qui_s_est_eteint": dict(num=4, love="L", action="Partage cette vidéo à quelqu'un qui a besoin de l'entendre", title="Celui qui s'est éteint", verse="Psaume 34:19",
        cover=["Un homme aussi", "a le droit d'avoir mal"], cast="ML",
        end=["Tu n'es pas trop sensible.", "Ce que tu ressens est réel."]),
    "ep5_je_t_entends": dict(num=5, love="E", action="Enregistre cette vidéo pour t'en souvenir", title="Je t'entends", verse="Jacques 1:19",
        cover=["Les 3 phrases", "qui sauvent un couple"], cast="ME",
        end=["« Je t'entends. Je suis désolé(e).", "Je vais changer. »", "Dis-le ce soir. Puis montre-le."]),
    "ep6_et_si_c_etait_les_deux": dict(num=6, love="LE", action="Dis-moi en commentaire quel sujet tu veux voir", title="Et si c'était les deux ?", verse="Colossiens 3:13",
        cover=["Qui a commencé ?"], cast="MLE",
        end=["Ce n'est pas toi contre lui ou elle.", "C'est vous deux contre le problème."]),
}

# Accroche à froid : la phrase la plus forte de l'épisode, dite par le mentor
# pendant qu'on voit le personnage concerné (qui, texte).
HOOK = {
    "ep1_elle_a_change": ("L", "Elle n'a pas changé. Elle a appris à se protéger… de toi."),
    "ep2_il_a_change": ("E", "Il ne s'en fiche pas. Il a compris que chaque mot se retournait contre lui."),
    "ep3_celle_qui_s_est_eteinte": ("E", "Qui t'a dit que tu étais « trop » ?"),
    "ep4_celui_qui_s_est_eteint": ("L", "Un homme ne devrait pas se plaindre. C'est ce qu'elle t'a dit ?"),
    "ep5_je_t_entends": ("E", "Trois phrases peuvent sauver ton couple. Tu en dis zéro."),
}


def sh(*a):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], check=True)


def pcm(path):
    raw = subprocess.check_output(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "24000", "-f", "s16le", "-"])
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


# On garde 80 ms avant/après la voix pour ne pas rogner les attaques douces (« Il », « Qu'elle »).
_SR = "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08"
TRIM = f"{_SR},areverse,{_SR},areverse"


async def say(sp, text, out):
    v, r, p = V[sp]
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, v, rate=r, pitch=p).save(out + ".raw.mp3")
            break
        except Exception as e:  # le service renvoie parfois une réponse vide
            print("nouvelle tentative :", sp, text, "->", type(e).__name__, file=sys.stderr)
            if attempt == 3:
                raise
            await asyncio.sleep(2 + attempt * 2)
    sh("-i", out + ".raw.mp3", "-af", TRIM, out)
    os.remove(out + ".raw.mp3")


def envelope(a):
    n = max(1, int(np.ceil(len(a) / 24000 * FPS)))
    hop = 24000 // FPS
    e = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) if len(a[i * hop:(i + 1) * hop]) else 0 for i in range(n)])
    ref = np.percentile(e, 92) or 1.0
    e = np.clip(e / ref, 0, 1)
    e = np.convolve(e, [0.25, 0.5, 0.25], mode="same")
    return [round(float(x), 2) for x in e]


def pad():
    """Nappe d'ambiance libre de droits (synthèse), boucle de 64 s."""
    out = os.path.join(PUB, "pad.mp3")
    if os.path.exists(out):
        return
    sr, bar = 24000, 8.0
    chords = [[110, 164.81, 220, 261.63], [87.31, 130.81, 220, 261.63], [130.81, 196, 261.63, 329.63], [98, 146.83, 246.94, 293.66]]
    total = int(sr * bar * 8)
    mix = np.zeros(total + sr * 3, dtype=np.float64)
    for k in range(8):
        n = int(sr * (bar + 3))
        t = np.arange(n) / sr
        env = np.minimum(1, t / 3) * np.minimum(1, (bar + 3 - t) / 3)
        seg = sum(np.sin(2 * np.pi * f * d * t) / (1 + i) for i, f in enumerate(chords[k % 4]) for d in (0.997, 1.003))
        seg *= env * (0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t))
        mix[int(k * bar * sr):int(k * bar * sr) + n] += seg
    mix[:sr * 3] += mix[total:total + sr * 3]  # boucle sans couture
    mix = mix[:total] / np.max(np.abs(mix)) * 0.5
    wav = out + ".wav"
    (mix * 32767).astype(np.int16).tofile(wav + ".raw")
    sh("-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", wav + ".raw", "-af", "lowpass=f=1800", "-b:a", "128k", out)
    os.remove(wav + ".raw")


async def episode(name, lines):
    m = META[name]
    d = os.path.join(PUB, name)
    os.makedirs(d, exist_ok=True)
    t = 0.15 if name in HOOK else INTRO
    out = []
    if name in HOOK:
        show, text = HOOK[name]
        f = os.path.join(d, "hook.mp3")
        if not os.path.exists(f):
            await say("M", text, f)
        env = envelope(pcm(f))
        out.append(dict(sp="M", text=text, file=f"luiouelle/{name}/hook.mp3", **{"from": round(t * FPS)},
                        dur=len(env), env=env, hook=True, show=show))
        t += len(env) / FPS + 0.45
    for i, (sp, text, pre) in enumerate(lines, 1):
        f = os.path.join(d, f"{i:02d}.mp3")
        if not os.path.exists(f):
            if sp == "LE":
                a, b = text.split("|")
                await say("L", a, f + ".a.mp3")
                await say("E", b, f + ".b.mp3")
                sh("-i", f + ".a.mp3", "-i", f + ".b.mp3", "-filter_complex", "amix=inputs=2:normalize=0", f)
                os.remove(f + ".a.mp3"); os.remove(f + ".b.mp3")
            else:
                await say(sp, text, f)
        a = pcm(f)
        env = envelope(a)
        t += pre
        line = dict(sp=sp, text=text, file=f"luiouelle/{name}/{i:02d}.mp3", **{"from": round(t * FPS)}, dur=len(env), env=env)
        if sp == "LE":
            a_, b_ = text.split("|")
            line["text"] = a_ if a_ == b_ else f"{a_} / {b_}"
        if " : «" in text:
            pre_txt, quote = text.split(" : ", 1)
            line["verse"] = dict(ref=m["verse"], quote=quote, prefixFrac=round(len(pre_txt) / len(text) + 0.03, 3))
        out.append(line)
        t += len(env) / FPS + GAP
    # Carte de fin : le mentor dit la phrase de fin, le personnage dit « Tu es aimé(e) »,
    # puis le mentor dit l'appel final.
    order = list(META)
    nxt = META[order[order.index(name) + 1]]["title"] if m["num"] < len(order) else None
    if nxt:
        outro = dict(action=m["action"], label="PROCHAIN ÉPISODE", next=f"« {nxt} »", sub="Abonne-toi pour ne pas le manquer")
        say_cta = f"{m['action']}. Prochain épisode : {nxt}. Abonne-toi pour ne pas le manquer."
    else:
        outro = dict(action=m["action"], label="SAISON 2", next="Bientôt", sub="Abonne-toi pour ne pas la manquer")
        say_cta = f"C'était la saison 1 de Lui ou elle. {m['action']}. Et abonne-toi pour ne pas manquer la saison 2."
    spoken = [("M", " ".join(m["end"]).replace("(e)", "")), (m["love"], "Tu es aimé."), ("M", say_cta)]
    end_from = round((t + 0.5) * FPS)
    t = end_from / FPS + 0.8
    items = []
    for i, (sp, text) in enumerate(spoken, 1):
        f = os.path.join(d, f"fin{i}.mp3")
        if not os.path.exists(f):
            if sp == "LE":
                await say("L", text, f + ".a.mp3")
                await say("E", text, f + ".b.mp3")
                sh("-i", f + ".a.mp3", "-i", f + ".b.mp3", "-filter_complex", "amix=inputs=2:normalize=0", f)
                os.remove(f + ".a.mp3"); os.remove(f + ".b.mp3")
            else:
                await say(sp, text, f)
        n = len(envelope(pcm(f)))
        items.append({"file": f"luiouelle/{name}/fin{i}.mp3", "from": round(t * FPS), "dur": n})
        t += n / FPS + 0.5
    return dict(id=name, num=m["num"], title=m["title"], cover=m["cover"], cast=m["cast"], endLines=m["end"],
                endFrom=end_from, endItems=items, outro=outro, durationInFrames=round((t + 1.2) * FPS), lines=out)


async def main():
    os.makedirs(PUB, exist_ok=True)
    pad()
    eps = [await episode(n, EP[n]) for n in EP]
    with open(OUT, "w") as fh:
        fh.write("// Fichier généré par tools/lui_ou_elle.py — ne pas modifier à la main.\n")
        fh.write('import type { Episode } from "./types";\n\n')
        fh.write("export const episodes: Episode[] = " + json.dumps(eps, ensure_ascii=False, separators=(",", ":")) + ";\n")
    for e in eps:
        print(e["id"], round(e["durationInFrames"] / FPS, 1), "s")


asyncio.run(main())
