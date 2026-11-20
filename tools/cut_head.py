"""Cut the first N words off an assembled narration (e.g. a slow date opener) and shift every time after it.

Usage: python -s cut_head.py <voice dir> <n words> [--keep 0.10] [--cap]
Keeps <dir>/_before_cut_head/ backups. --keep = silence kept before the new first word (s); --cap capitalises it.
The phrase that held the cut words keeps its start; its markup must be edited by hand (printed at the end).
"""
import json, shutil, subprocess, sys
from pathlib import Path
import numpy as np

d, n = Path(sys.argv[1]), int(sys.argv[2])
keep = float(sys.argv[sys.argv.index("--keep") + 1]) if "--keep" in sys.argv else 0.10
SR = 48000
bak = d / "_before_cut_head"
if not bak.exists():
    bak.mkdir()
    for f in ("voice.wav", "words.json", "phrases.json", "voice_info.json", "words_whisper.json", "words_refined.json"):
        if (d / f).exists(): shutil.copy(d / f, bak / f)
words = json.loads((d / "words.json").read_text(encoding="utf-8"))
t_new = words[n]["s"]                    # the new first word's onset
a = words[0]["s"] - 0.0                  # keep the original lead-in up to the old first word...
c0, c1 = min(keep, a), t_new - 0.05      # ...cut from `keep` to 50 ms before the new first word
cut = c1 - c0
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-f", "f32le", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
ch = 2
x = np.frombuffer(raw, np.float32).reshape(-1, ch).copy()
i0, i1, xf = int(c0 * SR), int(c1 * SR), int(0.008 * SR)
ramp = np.linspace(1, 0, xf, dtype=np.float32)[:, None]
seam = x[i0:i0 + xf] * ramp + x[i1:i1 + xf] * (1 - ramp)
x = np.concatenate([x[:i0], seam, x[i1 + xf:]])
sh = lambda t: round(max(c0, t - cut) if t > c0 else t, 3)
for name in ("words.json", "words_whisper.json", "words_refined.json"):
    if not (d / name).exists(): continue
    w = json.loads((d / name).read_text(encoding="utf-8"))
    w = [e for e in w if e["s"] >= t_new - 0.06]
    for e in w: e["s"], e["e"] = sh(e["s"]), sh(e["e"])
    if "--cap" in sys.argv and w: w[0]["w"] = w[0]["w"][:1].upper() + w[0]["w"][1:]
    (d / name).write_text(json.dumps(w, ensure_ascii=False, indent=1), encoding="utf-8")
ph = json.loads((d / "phrases.json").read_text(encoding="utf-8"))
for p in ph:
    p["s"] = p["s"] if p["s"] <= c0 else sh(p["s"]); p["e"] = sh(p["e"])
(d / "phrases.json").write_text(json.dumps(ph, ensure_ascii=False, indent=1), encoding="utf-8")
vi = json.loads((d / "voice_info.json").read_text(encoding="utf-8"))
vi["cut_head"] = {"from_s": round(c0, 3), "removed_s": round(cut, 3), "words": n}
vi["duration_s"] = round(len(x) / SR, 3)
(d / "voice_info.json").write_text(json.dumps(vi, ensure_ascii=False, indent=1), encoding="utf-8")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-", "-c:a", "pcm_s24le",
                str(d / "voice.wav")], input=x.tobytes(), check=True)
print(f"cut {cut:.3f} s ({c0:.2f}-{c1:.2f}); new duration {len(x) / SR:.2f} s; phrase 0 markup: {ph[0]['markup']}")
