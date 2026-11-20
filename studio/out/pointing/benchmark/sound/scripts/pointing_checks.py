"""Checks on the rejected film's stems for things that sound bad. Nothing is played."""
import os, json, sys
import numpy as np, soundfile as sf
from scipy.signal import correlate, butter, sosfiltfilt, find_peaks

B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.abspath(os.path.join(B, "..", "..", "..", "..", ".."))
A = os.path.join(ST, "sound", "pointing", "audio")
V = os.path.join(ST, "sound", "pointing", "voice")
SR = 48000
CUTS = [("s01", 0), ("s02", 81), ("s03", 140), ("s03b", 164), ("s04", 212), ("s05", 262), ("s06", 344), ("s07", 416), ("s08", 509),
        ("s09", 623), ("s10", 719), ("s11", 770), ("s12", 874), ("s13", 943), ("s14", 1020), ("s15", 1053), ("s16a", 1150),
        ("s16b", 1272), ("s17", 1356), ("s18", 1467), ("s19", 1497), ("s20", 1601), ("s21", 1675), ("s22", 1706), ("s23", 1799),
        ("s24", 1855)]
END = 1913


def rd(path):
    x, sr = sf.read(path, dtype="float64"); assert sr == SR
    return x if x.ndim == 1 else x.mean(1)


def db(x): return 10 * np.log10(np.mean(np.asarray(x) ** 2) + 1e-20)


def bp(x, lo, hi):
    return sosfiltfilt(butter(4, [lo, hi], "bandpass", fs=SR, output="sos"), x)


R = {}
mix = rd(os.path.join(A, "mix.wav"))
stem = {k: rd(os.path.join(A, "stem_%s.wav" % k)) for k in ["voice", "music", "sfx", "amb"]}
words = json.load(open(os.path.join(V, "words.json"), encoding="utf-8"))
phr = json.load(open(os.path.join(V, "phrases.json"), encoding="utf-8"))

# ---- per shot: what is under each shot (levels dBFS RMS of each stem), voice words in it
shots = []
for i, (nm, f) in enumerate(CUTS):
    f2 = CUTS[i + 1][1] if i + 1 < len(CUTS) else END
    a, b = int(f / 30 * SR), int(f2 / 30 * SR)
    wn = [w["w"] for w in words if f / 30 <= w["s"] < f2 / 30]
    shots.append({"shot": nm, "s": round(f / 30, 2), "e": round(f2 / 30, 2), "words": len(wn),
                  **{k: round(db(stem[k][a:b]), 1) for k in stem}, "mix": round(db(mix[a:b]), 1)})
R["per_shot"] = shots

# ---- cuts: amb / sfx / music level 100 ms before vs after, and the click test on the mix
cut = []
d = np.abs(np.diff(mix))
for nm, f in CUTS[1:]:
    c = int(round(f / 30 * SR)); w = int(0.1 * SR)
    row = {"shot": nm, "t": round(f / 30, 3)}
    for k in ["amb", "music", "sfx"]:
        row[k + "_step_db"] = round(db(stem[k][c:c + w]) - db(stem[k][c - w:c]), 1)
    loc = d[c - int(0.005 * SR): c + int(0.005 * SR)].max()
    ref = np.percentile(d[c - int(0.5 * SR): c - int(0.05 * SR)], 99.5)
    row["click_ratio"] = round(float(loc / (ref + 1e-12)), 2)
    cut.append(row)
R["cuts"] = cut

# ---- music: list each music event (onset of the stem after >=0.3 s of silence, or level jump > 10 dB)
def env(x, win=0.05):
    W = int(win * SR); c = np.concatenate([[0], np.cumsum(x ** 2)])
    s0 = np.arange(0, len(x) - W, W)
    return s0 / SR, 10 * np.log10((c[s0 + W] - c[s0]) / W + 1e-20)
tm, em = env(stem["music"])
on = em > -60
runs = []; i = 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and on[j]: j += 1
        runs.append((round(tm[i], 2), round(tm[j - 1] + 0.05, 2), round(float(np.max(em[i:j])), 1)))
        i = j
    else: i += 1
R["music_runs_over_-60dBFS"] = runs

# ---- laughs: the laughs stem of the voice build (before the mix) + giggles in sfx
lg = rd(os.path.join(V, "stems", "laughs.wav")); dl = rd(os.path.join(V, "stems", "dialogue.wav"))
ph = rd(os.path.join(V, "stems", "phone.wav"))
tl, el = env(lg)
on = el > -50
L = []; i = 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and (on[j] or (j + 4 < len(on) and on[j:j + 4].any())): j += 1
        a, b = tl[i], tl[min(j, len(tl) - 1)] + 0.05
        if b - a > 0.15:
            seg = lg[int(a * SR):int(b * SR)]
            L.append({"s": round(a, 2), "e": round(b, 2), "rms": round(db(seg), 1), "peak": round(20 * np.log10(np.abs(seg).max()), 1),
                      "2_5k_share_db": round(db(bp(seg, 2000, 5000)) - db(seg), 1)})
        i = j
    else: i += 1
# narrator reference (dialogue stem during narrator words)
nar = [p for p in phr if p["speaker"] == "N"]
nseg = np.concatenate([dl[int(p["s"] * SR):int(p["e"] * SR)] for p in nar])
R["narrator_rms_build"] = round(db(nseg), 1)
R["narrator_2_5k_share_db"] = round(db(bp(nseg, 2000, 5000)) - db(nseg), 1)
for l in L:
    l["vs_narrator_db"] = round(l["rms"] - R["narrator_rms_build"], 1)
# repetition: normalized xcorr between laugh spans (envelope of 2-5k band) to spot the same recording reused
segs = [lg[int(l["s"] * SR):int(l["e"] * SR)] for l in L]
rep = []
for i in range(len(segs)):
    for j in range(i + 1, len(segs)):
        a, b = segs[i], segs[j]
        if min(len(a), len(b)) < 0.2 * SR: continue
        a2, b2 = a[::4], b[::4]
        cc = correlate(a2, b2, "full", method="fft")
        nrm = np.sqrt(np.sum(a2 ** 2) * np.sum(b2 ** 2)) + 1e-12
        rep.append((L[i]["s"], L[j]["s"], round(float(np.abs(cc).max() / nrm), 2)))
R["laughs"] = L
R["laugh_pair_xcorr"] = sorted(rep, key=lambda r: -r[2])[:8]
# laughs in the final voice stem (sum) vs the narrator in the final mix
# ---- per line level and f0 already in voice_info; here: each line's level in the FINAL voice stem vs narrator median
vs = stem["voice"]
lines = []
for p in phr:
    seg = vs[int(p["s"] * SR):int(p["e"] * SR)]
    lines.append((p["id"], p["speaker"], round(p["s"], 2), round(db(seg), 1), round(20 * np.log10(np.abs(seg).max() + 1e-12), 1), p.get("text", p["markup"])))
nmed = np.median([l[3] for l in lines if l[1] == "N"])
R["lines_final_voice"] = [dict(id=l[0], spk=l[1], s=l[2], rms=l[3], vs_narr=round(l[3] - nmed, 1), peak=l[4], text=l[5]) for l in lines]

# ---- word endings: decay after each phrase end in the dialogue stem (time to fall 30 dB below the last 60 ms)
ends = []
for p in phr:
    e = p["e"]; ie = int(e * SR)
    pre = dl[ie - int(0.06 * SR): ie]
    if len(pre) < 100: continue
    ref = db(pre)
    env5 = [db(dl[ie + k * 240: ie + (k + 1) * 240]) for k in range(-12, 40)]  # 5 ms frames from -60 ms
    # last frame above ref-30 after the end
    tail = None
    for k in range(12, 52):
        if env5[k] < ref - 30: tail = (k - 12) * 5; break
    # abrupt: drop >25 dB inside 10 ms anywhere in [-30 ms, +100 ms]
    jumps = [env5[k] - env5[k + 2] for k in range(6, 50)]
    ends.append({"id": p["id"], "e": e, "ms_to_-30dB_after_end": tail, "max_drop_in_10ms_db": round(max(jumps), 1)})
R["phrase_ends"] = ends

# ---- train whine and harsh band: 2-5 kHz of (sfx+amb) vs the voice's 2-5 kHz during words, per 0.5 s
fx = stem["sfx"] + stem["amb"]
fx25 = bp(fx, 2000, 5000); v25 = bp(vs, 2000, 5000); mu25 = bp(stem["music"], 2000, 5000)
win = int(0.5 * SR)
inw = np.zeros(len(vs), bool)
for w in words: inw[int(w["s"] * SR):int(w["e"] * SR)] = True
vref = db(v25[inw])
rows = []
for k in range(0, len(fx) - win, win):
    rows.append((round(k / SR, 1), round(db(fx25[k:k + win]) - vref, 1), round(db(mu25[k:k + win]) - vref, 1), bool(inw[k:k + win].any())))
R["fx_2_5k_vs_voice_2_5k_per_0_5s"] = rows
R["fx_2_5k_loudest"] = sorted(rows, key=lambda r: -r[1])[:10]
# tonal whine: strongest narrow peak 800-6000 Hz in sfx+amb per 0.25 s with prominence
n = 8192; H = int(0.25 * SR)
tone = []
for k in range(0, len(fx) - n, H):
    seg = fx[k:k + n] * np.hanning(n)
    S = 20 * np.log10(np.abs(np.fft.rfft(seg)) + 1e-9); f = np.fft.rfftfreq(n, 1 / SR)
    sel = (f > 800) & (f < 6000)
    i0 = np.argmax(S[sel]); fpk = f[sel][i0]
    prom = S[sel][i0] - np.median(S[sel])
    tone.append((round(k / SR, 2), round(float(fpk), 0), round(float(prom), 1), round(float(S[sel][i0] - 20 * np.log10(n / 4)), 1)))
R["fx_tonal_peaks_prom_over_25dB"] = [t for t in tone if t[2] > 25]

# ---- dead air in the mix: 0.25 s windows with no word and mix rms < -40 dBFS
dz = []
for k in range(0, len(mix) - int(0.25 * SR), int(0.25 * SR)):
    a, b = k, k + int(0.25 * SR)
    if not inw[a:b].any():
        v = db(mix[a:b])
        if v < -36: dz.append((round(a / SR, 2), round(v, 1)))
R["quiet_no_voice_windows_under_-36dBFS"] = dz
json.dump(R, open(os.path.join(B, "data", "pointing_checks.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False, default=float)
print("ok")
