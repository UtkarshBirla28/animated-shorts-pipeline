"""Score candidate narrator voices (preview mp3/wav files) against the reference channel's measured voice profile.

Measures per file: F0 median / p10 / p90 (YIN on voiced frames, 60-400 Hz), range in semitones (p10-p90), the spectral
tilt (band levels relative to 120-500 Hz, same bands as the style bible), voiced-time ratio and pause count. Then a
distance to the reference: F0 median ~195 Hz, range ~14 st, warm low-mids (mid 500-3k ~ -15.6 dB vs low, high 3-8k ~ -22.7).
Usage: python -s voice_match.py <folder with *.mp3|*.wav> [out.json]
Decodes with ffmpeg to 16 kHz mono. Never plays audio.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from voice_pitch import yin_f0  # noqa: E402

SR = 16000
REF = {"f0": 195.0, "st": 14.0, "mid": -15.6, "high": -22.7}  # mix tilt (music included): weight it lightly


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def bands(x):
    n = 4096
    spec = np.zeros(n // 2 + 1)
    for i in range(0, len(x) - n, n // 2):
        seg = x[i:i + n] * np.hanning(n)
        spec += np.abs(np.fft.rfft(seg)) ** 2
    fr = np.fft.rfftfreq(n, 1 / SR)
    def b(lo, hi):
        m = (fr >= lo) & (fr < hi)
        return 10 * np.log10(spec[m].mean() + 1e-20)
    low = b(120, 500)
    return {"mid": b(500, 3000) - low, "high": b(3000, 7900) - low}


def analyse(p):
    x = load(p)
    win, hop = int(0.04 * SR), int(0.01 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
    thr = 0.1 * np.percentile(env, 95)
    f0 = []
    for k in range(0, len(x) - win, hop):
        if env[min(k // hop, len(env) - 1)] < thr:
            continue
        v, _ = yin_f0(x[k:k + win], SR)
        if v and 60 <= v <= 400:
            f0.append(v)
    f0 = np.array(f0)
    if len(f0) < 20:
        return {"file": p.name, "error": "too little voiced audio"}
    med, p10, p90 = np.median(f0), np.percentile(f0, 10), np.percentile(f0, 90)
    st = 12 * np.log2(p90 / p10)
    sp = bands(x)
    voiced = env > thr
    # pauses >= 0.3 s inside the speech
    runs, cur = [], 0
    for v in voiced:
        if not v:
            cur += 1
        else:
            if cur:
                runs.append(cur)
            cur = 0
    pauses = sum(1 for r in runs if r >= 30)
    d = (abs(12 * np.log2(med / REF["f0"])) / 3.0) ** 2 + ((st - REF["st"]) / 4.0) ** 2 + ((sp["mid"] - REF["mid"]) / 9.0) ** 2 + ((sp["high"] - REF["high"]) / 9.0) ** 2
    return {"file": p.name, "dur": round(len(x) / SR, 2), "f0_med": round(med, 1), "f0_p10": round(p10, 1), "f0_p90": round(p90, 1),
            "range_st": round(st, 1), "mid_vs_low_db": round(sp["mid"], 1), "high_vs_low_db": round(sp["high"], 1),
            "pauses_0_3s": pauses, "distance": round(float(np.sqrt(d)), 2)}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    folder = Path(sys.argv[1])
    files = sorted([*folder.glob("*.mp3"), *folder.glob("*.wav")])
    rows = [analyse(p) for p in files]
    rows.sort(key=lambda r: r.get("distance", 99))
    for r in rows:
        if "error" in r:
            print(f"{r['file'][:40]:40} {r['error']}")
        else:
            print(f"{r['file'][:40]:40} F0 {r['f0_med']:6.1f} Hz  p10-p90 {r['f0_p10']:5.0f}-{r['f0_p90']:5.0f}  {r['range_st']:4.1f} st  "
                  f"mid {r['mid_vs_low_db']:6.1f}  high {r['high_vs_low_db']:6.1f}  dist {r['distance']:.2f}")
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(json.dumps(rows, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
