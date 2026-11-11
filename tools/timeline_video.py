"""timeline.json (picture clock, old frames) + warp.json -> timeline_video.json (frames of the rendered video, new voice).
Auditors cite VIDEO frames; the code works on the picture clock: old = warp[new], new = inv[old].
Usage: python -s timeline_video.py"""
import json
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent)); from short_cfg import SHORT  # noqa: E402
A = Path(__file__).resolve().parent.parent / "sound" / SHORT / "audio"
tl = json.load(open(A / "timeline.json", encoding="utf-8"))
W = json.load(open(A / "warp.json", encoding="utf-8"))
assert W["old_total"] == tl["total"], (W["old_total"], tl["total"])
inv = np.asarray(W["inv"])
I = lambda f: int(round(float(np.interp(f, np.arange(len(inv)), inv))))
for s in tl["shots"]:
    s["a"], s["b"] = I(s["a"]), I(s["b"]); s["t0"], s["t1"] = round(s["a"] / 30, 3), round(s["b"] / 30, 3)
    for r in s.get("relight", []):
        r["f"] = I(r["f"])
for b in tl["beat"].values():
    b["f"] = I(b["f"]); b["t"] = round(b["f"] / 30, 3)
tl["total"], tl["duration_s"] = W["new_total"], round(W["new_total"] / 30, 3)
tl["_doc"] = "VIDEO frames (ElevenLabs narration). The picture code runs on the old clock: old = warp.json warp[new]."
json.dump(tl, open(A / "timeline_video.json", "w", encoding="utf-8"), indent=1)
print("timeline_video.json:", tl["total"], "frames;", " ".join(f"{s['id']}:{s['a']}-{s['b']}" for s in tl["shots"]))
