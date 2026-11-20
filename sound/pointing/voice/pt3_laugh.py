"""Measure the laugh-only takes (v3_x01, v3_x02): what Whisper hears (words are not wanted), the sound's span, its
bursts (runs of sound between true silences), level, pitch, voiced share.
  python pt3_laugh.py v3_x01 v3_x02"""
import json
import sys

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
for sub in sys.argv[1:]:
    for mp3 in sorted((L.TAKES / sub).glob("*.mp3")):
        m = L.read(mp3)
        raw = L.lufs(m)
        g = 10 ** ((-18 - raw) / 20)
        d = L.db_frames(m * g)
        loud = np.where(d > L.THR)[0]
        on, off = loud[0] * L.H, loud[-1] * L.H + 0.01
        runs = [(a * L.H, b * L.H) for a, b in L.runs_below(d, loud[0], loud[-1]) if (b - a) * L.H >= 0.06]
        bursts, t = [], on
        for a, b in runs:
            bursts.append((round(t, 2), round(a, 2)))
            t = b
        bursts.append((round(t, 2), round(off, 2)))
        hw = L.whisper(L.read(mp3, sr=24000) * g)
        T, F = L.f0_track(m * g)
        v = ~np.isnan(F)
        res = {"file": f"{sub}/{mp3.stem}", "dur": round(len(m) / L.SR, 2), "raw_lufs": round(raw, 1), "on": round(on, 2), "off": round(off, 2),
               "bursts": bursts, "silences": [(round(a, 2), round(b, 2)) for a, b in runs], "heard": " ".join(w["w"] for w in hw),
               "heard_p": [round(float(w["p"]), 2) for w in hw], "f0_med": round(float(np.nanmedian(F)), 0) if v.any() else None,
               "voiced_share": round(float(v.mean()), 2), "text": mp3.with_suffix(".txt").read_text(encoding="utf-8"),
               "clip_end": bool(np.max(d[-4:]) > L.THR)}
        mp3.with_suffix(".laugh.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        print(json.dumps(res, ensure_ascii=False), flush=True)
