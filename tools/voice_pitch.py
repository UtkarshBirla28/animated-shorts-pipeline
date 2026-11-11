"""Voice pitch + per-sentence delivery stats for measured shorts (run after measure_video.py).

Reads  <data>/<slug>/audio16k.wav + transcript.json
Writes <data>/<slug>/voice.json and appends a "Voice delivery" section to SUMMARY.md

YIN pitch tracker (40 ms window, 10 ms hop, 60-400 Hz) restricted to word spans. Background music can
pull estimates around, so treat values as approximate.

Usage: python -s voice_pitch.py <data_root> [slug ...]
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

FMIN, FMAX = 60.0, 400.0


def yin_f0(frame, sr, thresh=0.15):
    w = len(frame) // 2
    tau_min, tau_max = int(sr / FMAX), int(sr / FMIN)
    x = frame - frame.mean()
    d = np.array([np.sum((x[:w] - x[t:t + w]) ** 2) for t in range(tau_max + 1)])
    cmnd = np.ones_like(d)
    cmnd[1:] = d[1:] * np.arange(1, len(d)) / np.maximum(np.cumsum(d[1:]), 1e-12)
    for t in range(tau_min, tau_max):
        if cmnd[t] < thresh:
            while t + 1 < tau_max and cmnd[t + 1] < cmnd[t]:
                t += 1
            # parabolic interpolation
            ti = t
            if 1 <= t < tau_max:
                a, b, c = cmnd[t - 1], cmnd[t], cmnd[t + 1]
                den = a - 2 * b + c
                shift = 0.5 * (a - c) / den if den != 0 else 0.0
                t = t + float(np.clip(shift, -1.0, 1.0))
            return sr / t, float(cmnd[ti])
    return None, None


def analyse(folder):
    sr, x = wavfile.read(folder / "audio16k.wav")
    x = x.astype(np.float32) / 32768.0
    tr = json.loads((folder / "transcript.json").read_text(encoding="utf-8"))
    words = tr["words"]
    win, hop = int(0.040 * sr), int(0.010 * sr)
    track = []
    for w in words:
        a, b = int(w["s"] * sr), int(w["e"] * sr)
        for s in range(a, max(a, b - win), hop):
            fr = x[s:s + win]
            if len(fr) < win or np.sqrt(np.mean(fr ** 2)) < 0.01:
                continue
            f0, conf = yin_f0(fr, sr)
            if f0 and FMIN <= f0 <= FMAX:
                track.append((s / sr, f0))
    f0s = np.array([f for _, f in track])
    out = {"note": "YIN over word spans; music under voice can bias values"}
    if len(f0s) > 20:
        med = float(np.median(f0s))
        p10, p90 = float(np.percentile(f0s, 10)), float(np.percentile(f0s, 90))
        out.update({"f0_median_hz": round(med, 1), "f0_p10_hz": round(p10, 1), "f0_p90_hz": round(p90, 1),
                    "range_semitones_p10_p90": round(12 * np.log2(p90 / p10), 1),
                    "register_guess": "low/male-typical" if med < 160 else ("mid" if med < 200 else "high (an energetic male narrator can also sit here)"),
                    "voiced_frames": int(len(f0s))})
    segs = []
    for sg in tr["segments"]:
        ws = [w for w in words if sg["s"] - 0.05 <= w["s"] <= sg["e"] + 0.05]
        fs = [f for t, f in track if sg["s"] <= t <= sg["e"]]
        a, b = int(sg["s"] * sr), int(sg["e"] * sr)
        rms = float(20 * np.log10(np.sqrt(np.mean(x[a:b] ** 2)) + 1e-9)) if b > a else None
        dur = sg["e"] - sg["s"]
        segs.append({"s": sg["s"], "e": sg["e"], "text": sg["text"], "words": len(ws),
                     "words_per_s": round(len(ws) / dur, 2) if dur > 0 else None,
                     "f0_median_hz": round(float(np.median(fs)), 1) if len(fs) > 5 else None,
                     "f0_last_word_hz": None, "rms_db": round(rms, 1) if rms is not None else None})
        if ws:
            lw = ws[-1]
            lf = [f for t, f in track if lw["s"] <= t <= lw["e"]]
            segs[-1]["f0_last_word_hz"] = round(float(np.median(lf)), 1) if lf else None
    out["segments"] = segs
    (folder / "voice.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    lines = ["", "## Voice delivery (approx. YIN pitch)", "",
             f"- median F0 {out.get('f0_median_hz')} Hz, p10-p90 {out.get('f0_p10_hz')}-{out.get('f0_p90_hz')} Hz, "
             f"range {out.get('range_semitones_p10_p90')} semitones, register: {out.get('register_guess')}", "",
             "| start | end | words/s | F0 med | F0 last word | RMS dB | text |", "|---|---|---|---|---|---|---|"]
    for s in segs:
        lines.append(f"| {s['s']:.2f} | {s['e']:.2f} | {s['words_per_s']} | {s['f0_median_hz']} | "
                     f"{s['f0_last_word_hz']} | {s['rms_db']} | {s['text']} |")
    summ = folder / "SUMMARY.md"
    txt = summ.read_text(encoding="utf-8")
    if "## Voice delivery" not in txt:
        summ.write_text(txt + "\n".join(lines) + "\n", encoding="utf-8")
    return out


def main():
    root = Path(sys.argv[1])
    slugs = sys.argv[2:] or [p.name for p in root.iterdir() if (p / "SUMMARY.md").exists()]
    for slug in slugs:
        f = root / slug
        if (f / "voice.json").exists():
            continue
        o = analyse(f)
        print(f"voice {slug}: F0 {o.get('f0_median_hz')} Hz ({o.get('register_guess')})", flush=True)


if __name__ == "__main__":
    main()
