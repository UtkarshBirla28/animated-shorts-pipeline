"""SCRIPT v4 shout casting from FREE library previews (no credits, no sign-ups): search the shared library, download each
hit's preview mp3 to takes/previews_v4/, measure its pitch median and its air (10-16 kHz against 400-2000 Hz).
  python pt4_cast.py "<search>" [gender] [age] [n]      (several searches may be run; results append to takes/cast_v4.json)"""
import json
import sys
import urllib.request

import numpy as np

import pt4_lib as V
from pt4_lib import L

sys.path.insert(0, str(L.ROOT / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
q = sys.argv[1]
params = {"search": q, "page_size": int(sys.argv[4]) if len(sys.argv) > 4 else 12, "language": "en"}
if len(sys.argv) > 2 and sys.argv[2] != "-":
    params["gender"] = sys.argv[2]
if len(sys.argv) > 3 and sys.argv[3] != "-":
    params["age"] = sys.argv[3]
d = el_api.req("GET", "/shared-voices", params=params)
OUT = L.TAKES / "previews_v4"
OUT.mkdir(parents=True, exist_ok=True)
DB = L.TAKES / "cast_v4.json"
db = V.jload(DB) if DB.exists() else {}


def air(m):
    P = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / L.SR)
    return float(10 * np.log10(np.sum(P[(f >= 10000) & (f < 16000)]) / (np.sum(P[(f >= 400) & (f < 2000)]) + 1e-20) + 1e-20))


for v in d.get("voices", []):
    if not v.get("free_users_allowed") or not v.get("preview_url"):
        continue
    f = OUT / f"{v['voice_id']}.mp3"
    if not f.exists():
        try:
            with urllib.request.urlopen(v["preview_url"], timeout=60) as r:
                f.write_bytes(r.read())
        except Exception as e:  # noqa: BLE001
            print("no preview", v["name"], e)
            continue
    m = L.read(f)
    T, F = L.f0_track(m)
    fv = F[~np.isnan(F)]
    rec = {"name": v["name"], "voice_id": v["voice_id"], "owner": v.get("public_owner_id"), "gender": v.get("gender"), "age": v.get("age"),
           "accent": v.get("accent"), "descriptive": v.get("descriptive"), "f0_med": round(float(np.median(fv)), 1) if len(fv) else None,
           "f0_p90": round(float(np.percentile(fv, 90)), 1) if len(fv) else None, "air_db": round(air(m), 1), "desc": (v.get("description") or "")[:140]}
    db[v["voice_id"]] = rec
    print(f"{rec['f0_med']!s:>6} Hz (p90 {rec['f0_p90']})  air {rec['air_db']:6.1f} dB  {v['name'][:44]:44s} {v.get('age')}/{v.get('accent')}/{v.get('descriptive')}  {v['voice_id']}")
V.jsave(DB, db)
