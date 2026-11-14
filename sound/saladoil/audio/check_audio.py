# Measures the saladoil mix the way the A1 sound audit did (50 ms RMS of the stems inside each cue's window, the music
# around the swell, the speech-band margin on the weak words, the mix's band tilt re 120-500 Hz, sibilance, the loop
# tail). Read-only: reads mix.wav + the four stems + timeline / words. Usage:
#   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s sound/saladoil/audio/check_audio.py [label]
import os
import sys
import json
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, read_wav  # noqa: E402
import timeline as T  # noqa: E402

FPS = T.FPS


def load(name):
    x, sr = read_wav(os.path.join(HERE, name))
    return x


MIX, V, M, S, A = (load(n) for n in ("mix.wav", "stem_voice.wav", "stem_music.wav", "stem_sfx.wav", "stem_amb.wav"))
mono = lambda x: x.mean(0)


def rms_track(x, win=0.05, hop=0.01):
    m = mono(x) if x.ndim == 2 else x
    w, h = int(win * SR), int(hop * SR)
    n = 1 + max(0, (len(m) - w) // h)
    c = np.cumsum(np.concatenate([[0.0], m ** 2]))
    i = np.arange(n) * h
    return 10 * np.log10((c[i + w] - c[i]) / w + 1e-14), (i + w / 2) / SR


TRK = {k: rms_track(x) for k, x in (("mix", MIX), ("voice", V), ("music", M), ("sfx", S), ("amb", A))}


def peak(stem, f0, f1):
    lv, tc = TRK[stem]
    k = (tc >= f0 / FPS) & (tc <= f1 / FPS)
    return float(lv[k].max()) if k.any() else float("nan")


def mean_db(stem, f0, f1):
    x = {"mix": MIX, "voice": V, "music": M, "sfx": S, "amb": A}[stem]
    seg = mono(x)[int(f0 / FPS * SR): int(f1 / FPS * SR)]
    return float(10 * np.log10(np.mean(seg ** 2) + 1e-14))


def band(x, lo, hi):
    sos = signal.butter(4, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, mono(x))


VB, BB = band(V, 1000, 4000), band(M + S + A, 1000, 4000)


def word_margin(word, near_f):
    try:
        w = T.word(word, near_f / FPS - 0.3)
    except KeyError:
        return None
    a, b = int(float(w["s"]) * SR), int(float(w["e"]) * SR)
    ev = 10 * np.log10(np.mean(VB[a:b] ** 2) + 1e-14)
    eb = 10 * np.log10(np.mean(BB[a:b] ** 2) + 1e-14)
    return w["w"], float(w["s"]) * FPS, ev - eb


def tilt(x):
    m = mono(x)
    f, P = signal.welch(m, SR, nperseg=8192)
    b = lambda lo, hi: 10 * np.log10(P[(f >= lo) & (f < hi)].mean() + 1e-20)      # mean power density (the audit's measure)
    ref = b(120, 500)
    return {k: round(b(lo, hi) - ref, 1) for k, (lo, hi) in {"20-120": (20, 120), "500-3k": (500, 3000), "3-8k": (3000, 8000),
                                                               "8-11k": (8000, 11000), "5-10k": (5000, 10000)}.items()}


def sibilance():
    v = mono(V)
    hf = band(V, 5000, 10000)
    w = int(0.01 * SR)
    n = len(v) // w
    lv = 10 * np.log10((v[: n * w] ** 2).reshape(n, w).mean(1) + 1e-14)
    lh = 10 * np.log10((hf[: n * w] ** 2).reshape(n, w).mean(1) + 1e-14)
    ref = np.percentile(lv[lv > lv.max() - 40], 95)
    return round(float(np.percentile(lh[lv > lv.max() - 40], 99) - ref), 1)


B = T.BEAT
rows = []


def cue(label, stem, f0, f1, vwin=None):
    p = peak(stem, f0, f1)
    vp = peak("voice", *(vwin or (f0 - 15, f1 + 15)))
    rows.append((label, stem, f0, f1, p, vp, p - vp))


# ---- the audit's cue checks (frames on the CURRENT clock, keyed to BEATs)
cue("flaps_1 roll", "sfx", B["borrowed"], B["million"] + 10)
cue("horn_1", "sfx", 160, 205)
cue("gull shot1 245", "sfx", 243, 258)
cue("flag shot2", "sfx", 300, 380)
cue("plip_2", "sfx", 456, 462)
cue("stamp_3", "sfx", 488, 496)
cue("ka 515", "sfx", 512, 519)
cue("ching", "sfx", 519, 530)
cue("plunk 705", "sfx", 703, 712)
cue("tick believed", "sfx", 884, 895)
cue("stamps_5 #1", "sfx", 931, 938)
cue("dings_5 more1", "sfx", B["more1"], B["more1"] + 12)
cue("dings_5 more2", "sfx", B["more2"], B["more2"] + 14)
cue("ratchet_6 #1", "sfx", B["moreOf"] - 4, B["moreOf"] + 12)
cue("drums/boing 6", "sfx", B["united"] - 4, B["united"] + 30)
cue("bloop_7", "sfx", B["insideQEnd"], B["insideQEnd"] + 14)
cue("phones/walla 8", "sfx", 1255, 1370)
cue("trading bed 8", "amb", 1260, 1370)
cue("crash 1376", "sfx", 1374, 1384)
cue("groan 8", "sfx", 1384, 1402)
cue("thunder_8", "sfx", 1396, 1420)
cue("slap_9", "sfx", B["bust"] - 4, B["bust"] + 6)
cue("storm bed gaps", "amb", 1444, 1457)
cue("ladder/steps 9", "sfx", 1457, 1525)
cue("reveal amb gap", "amb", 1554, 1568)
cue("slosh_10", "sfx", 1611, 1630)
cue("shake_11", "sfx", B["ever"], B["ever"] + 24)
cue("glug_11", "sfx", B["theOilRises"], B["top"] + 8)
cue("pour_12", "sfx", B["waterIn"] - 6, B["add"] + 4)
cue("trickle_12", "sfx", B["thin"] - 2, B["oilIn"] + 12)
cue("ding_12", "sfx", 1998, 2008)
cue("plates_13 #1", "sfx", B["tankTo"] + 4, B["tankTo"] + 10)
cue("sweat_13", "sfx", B["hardestW"] - 2, B["hardestW"] + 6)
cue("sigh_13", "sfx", 2275, 2290)
cue("scribble_15", "sfx", B["bought"], B["bought"] + 20)
cue("cha_ching_15", "sfx", B["cheap"], B["cheap"] + 18)
cue("cafe 15 rack", "amb", B["trusted"], B["brand"] + 10)
rows_music = [("music before 'Warren'", mean_db("music", B["warren"] - 26, B["warren"] - 2)),
              ("music on 'Warren Buffett.'", mean_db("music", B["warren"], B["warren"] + 32)),
              ("music gap after 'Buffett.'", mean_db("music", 2616, 2629)),
              ("music 'Ever' 1707-1731", mean_db("music", 1707, 1731)),
              ("voice 'Warren Buffett.'", mean_db("voice", B["warren"], B["warren"] + 32))]
words = [word_margin(w, f) for w, f in (("oil", B["oil1"]), ("it", B["againstIt"] + 12), ("more", B["more1"]), ("more", B["more2"]),
                                        ("He", B["heBet"]), ("bet", B["heBet"] + 8), ("people", B["heBet"] + 15),
                                        ("Warren", B["warren"]), ("Buffett", B["buffett"]), ("hardest-working", B["hardestW"]),
                                        ("full", B["fullShout"]), ("was", B["was"]), ("water", B["water"]))]
lab = sys.argv[1] if len(sys.argv) > 1 else ""
print(f"== check_audio {lab}: {MIX.shape[1] / SR:.3f} s")
print(f"{'cue':<22}{'stem':<7}{'frames':<12}{'peak50ms':>9}{'voice':>8}{'rel':>7}")
for l, s, a, b, p, vp, d in rows:
    print(f"{l:<22}{s:<7}{f'{a:.0f}-{b:.0f}':<12}{p:9.1f}{vp:8.1f}{d:7.1f}")
for l, v in rows_music:
    print(f"{l:<30}{v:7.1f} dBFS (mean)")
print("speech-band (1-4 kHz) margin voice vs bed per word:")
print("  " + ", ".join(f"{w} @{f:.0f}: {m:.1f}" for w, f, m in [x for x in words if x]))
print("mix tilt re 120-500 Hz:", tilt(MIX), " voice:", tilt(V), " sibilance p99 (5-10k vs voice p95):", sibilance())
tail = mono(MIX)[int((T.LAST_WORD_END + 0.05) * SR):]
head = mono(MIX)[: int(0.3 * SR)]
print(f"tail after 'real.' ({len(tail) / SR:.2f} s) RMS {10 * np.log10(np.mean(tail ** 2) + 1e-14):.1f} dBFS; first 0.3 s "
      f"{10 * np.log10(np.mean(head ** 2) + 1e-14):.1f}; seam jump {np.abs(MIX[:, 0] - MIX[:, -1]).max():.5f}")
