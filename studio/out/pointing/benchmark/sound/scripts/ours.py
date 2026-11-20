import os, json, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import yin, st, mom_loud, rms_db
from scipy.signal import resample_poly
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST = os.path.abspath(os.path.join(B, "..", "..", "..", "..", ".."))
SR = 48000
out = {}
for k in ["pointing", "clown", "antitheft", "saladoil", "typo"]:
    A = os.path.join(ST, "sound", k, "audio"); V = os.path.join(ST, "sound", k, "voice")
    R = {}
    stems = {s: sf.read(os.path.join(A, "stem_%s.wav" % s), dtype="float64")[0].mean(1) for s in ["voice", "music", "sfx", "amb"]}
    dur = len(stems["voice"]) / SR
    # amb 1-s jumps
    t, La = mom_loud(stems["amb"])
    L1 = np.array([np.mean(La[(t >= s) & (t < s + 1)]) for s in range(int(dur))])
    R["amb_jumps_over_6db_per_min"] = round(60 * float((np.abs(np.diff(L1)) > 6).sum()) / dur, 1)
    R["amb_level_range_p5_p95"] = round(float(np.percentile(L1, 95) - np.percentile(L1, 5)), 1)
    # steady tone coverage in amb+sfx
    fx = stems["amb"] + stems["sfx"]; n = 8192; H = int(0.25 * SR); cov = 0; tot = 0; freqs = []
    for i in range(0, len(fx) - n, H):
        seg = fx[i:i + n] * np.hanning(n); S = 20 * np.log10(np.abs(np.fft.rfft(seg)) + 1e-9); f = np.fft.rfftfreq(n, 1 / SR)
        sel = (f > 800) & (f < 6000); j = np.argmax(S[sel]); prom = S[sel][j] - np.median(S[sel]); lvl = S[sel][j] - 20 * np.log10(n / 4)
        tot += 1
        if prom > 25 and lvl > -55: cov += 1; freqs.append(f[sel][j])
    R["fx_steady_tone_s"] = round(cov * 0.25, 1); R["fx_tone_freq_median"] = round(float(np.median(freqs)), 0) if freqs else None
    # phrases / speakers
    pp = os.path.join(V, "phrases.json")
    if os.path.exists(pp):
        ph = json.load(open(pp, encoding="utf-8"))
        v16 = resample_poly(stems["voice"], 1, 3)
        tf, f0, ap, en = yin(v16)
        spk = {}; nar = []
        for p in ph:
            m = (tf >= p["s"]) & (tf <= p["e"]) & ~np.isnan(f0) & (ap < 0.15)
            if m.sum() < 8: continue
            med = float(np.median(f0[m]))
            seg = stems["voice"][int(p["s"] * SR):int(p["e"] * SR)]
            sp = np.abs(np.fft.rfft(seg)) ** 2; ff = np.fft.rfftfreq(len(seg), 1 / SR)
            cen = float((sp * ff).sum() / sp.sum())
            sk = p.get("speaker", "N")
            spk.setdefault(sk, []).append((med, cen, p["e"] - p["s"]))
            if sk == "N": nar.append((round(p["s"], 1), round(med, 0)))
        R["speakers"] = {s: {"lines": len(v), "f0_med": round(float(np.median([a for a, b, c in v])), 0),
                             "centroid": round(float(np.median([b for a, b, c in v])), 0), "secs": round(sum(c for a, b, c in v), 1)} for s, v in spk.items()}
        meds = np.array([m for _, m in nar])
        R["narrator_lines"] = len(nar)
        R["narrator_line_f0"] = nar
        if len(meds) > 1:
            j = np.abs(np.diff(st(meds, 1.0)))
            R["narrator_jump_median_st"] = round(float(np.median(j)), 1); R["narrator_jumps_over_6st"] = int((j > 6).sum())
            R["narrator_line_f0_spread_st_p10_p90"] = round(float(st(np.percentile(meds, 90), np.percentile(meds, 10))), 1)
    out[k] = R
json.dump(out, open(os.path.join(B, "data", "ours_extra.json"), "w"), indent=1, default=float)
for k, R in out.items():
    print("==", k); [print("  ", a, b) for a, b in R.items()]
