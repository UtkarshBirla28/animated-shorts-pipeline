"""SCRIPT v4: measure the one-word takes for the Go run and the shouts (nothing is played, nothing is paid).
  python pt4_pick.py v4_go v4_H v4_D v4_C
Per take: acoustic on/off and word length, f0 median / p10 / p90 (default track 62-420 Hz, and a 90-420 Hz track as an
octave check), voiced-frame air (6-12 kHz vs 1-3 kHz, the voiced-frame "full band" test), the longest pause inside the
word span (> -45 dBFS gaps after gaining to the probe's scale), loudness: BS.1770 on the word TILED to >= 1.6 s (a 0.3 s
word is shorter than one 400 ms gating block) and plain RMS of the voiced frames."""
import sys

import numpy as np

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
SR, H = L.SR, L.H


def tiled_lufs(x, min_s=1.6):
    if len(x) < 10:
        return -99.0
    n = int(np.ceil(min_s * SR / len(x)))
    return L.lufs(np.tile(x, max(1, n)))


def voiced_air(x, T, F, a, b):
    """6-12 kHz against 1-3 kHz (dB) over the voiced 40 ms frames in [a, b]"""
    k = np.where((T >= a) & (T <= b) & ~np.isnan(F))[0]
    if len(k) < 3:
        return None
    win = 2048
    P = 0
    for t in T[k]:
        i = int(t * SR) - win // 2
        if i < 0 or i + win > len(x):
            continue
        P = P + np.abs(np.fft.rfft(x[i:i + win] * np.hanning(win))) ** 2
    f = np.fft.rfftfreq(win, 1 / SR)
    b_ = lambda lo, hi: 10 * np.log10(np.sum(P[(f >= lo) & (f < hi)]) + 1e-20)
    return round(b_(6000, 12000) - b_(1000, 3000), 1)


def measure(folder, name):
    mp3 = L.TAKES / folder / f"{name}.mp3"
    m = L.read(mp3)
    pr = V.jload(mp3.with_suffix(".p4.json"))
    g = 10 ** (pr["raw_gain_db"] / 20)
    x = m * g
    on, off = pr["on"], pr["off"]
    T, F = L.f0_track(x)
    T2, F2 = L.f0_track(x, fmin=90.0)
    fs = L.f0_stats(T, F, on, off)
    fs2 = L.f0_stats(T2, F2, on, off)
    d = L.db_frames(x)
    inner = [(r[1] - r[0]) * H for r in L.runs_below(d, int((on + 0.03) / H), int((off - 0.03) / H))]
    w = x[int(on * SR):int(off * SR)]
    k = np.where((T >= on) & (T <= off) & ~np.isnan(F))[0]
    vr = [x[int(t * SR) - 960:int(t * SR) + 960] for t in T[k] if int(t * SR) > 960]
    rms_v = 20 * np.log10(np.sqrt(np.mean(np.concatenate(vr) ** 2)) + 1e-12) if vr else None
    meta = V.jload(mp3.with_suffix(".meta.json"))
    return {"take": f"{folder}/{name}", "text": meta.get("text"), "voice": meta.get("voice"), "cand": meta.get("candidate"),
            "on": on, "off": off, "len": round(off - on, 3), "f0": fs.get("med"), "p10": fs.get("p10"), "p90": fs.get("p90"),
            "f0_90": fs2.get("med"), "voiced_n": fs.get("n"), "air_v": voiced_air(x, T, F, on, off),
            "inner_max": round(max(inner), 3) if inner else 0.0, "lufs_tiled": round(tiled_lufs(w), 2),
            "rms_voiced": round(rms_v, 2) if rms_v is not None else None, "raw_gain_db": pr["raw_gain_db"],
            "clip_start": pr.get("clipped_start"), "end_rise": (pr["sentences"][0].get("end") or {}).get("rise_st")}


if __name__ == "__main__":
    out = {}
    for folder in sys.argv[1:]:
        names = sorted({p.stem for p in (L.TAKES / folder).glob("t*.p4.json")}, key=lambda s: int(s[1:].split(".")[0]))
        names = [n.replace(".p4", "") for n in names]
        for n in names:
            r = measure(folder, n)
            out[r["take"]] = r
            print(f"{r['take']:12s} {str(r['cand'] or ''):8s} len {r['len']:.3f}  f0 {r['f0']} (p10 {r['p10']} p90 {r['p90']}; 90-Hz floor {r['f0_90']})  "
                  f"n {r['voiced_n']}  air {r['air_v']} dB  inner {r['inner_max']:.2f}s  LUFS(tiled) {r['lufs_tiled']}  RMSv {r['rms_voiced']}  "
                  f"end {r['end_rise']}  {r['text']}")
    V.jsave(L.TAKES / "v4_pick.json", out)
