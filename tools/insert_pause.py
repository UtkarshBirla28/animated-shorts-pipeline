"""Lengthen chosen pauses in an ASSEMBLED narration by inserting digital silence. eleven_build.py can only SHORTEN a
pause to its target; when a take's own pause is shorter than the beat the script needs, this adds the difference.

No time-stretch: the voice samples are untouched. The silence goes into the middle of the longest quiet run
(10 ms frames < -45 dBFS) between the two words, so the cut is inside silence. Every later word / phrase time in
words.json / phrases.json moves by the inserted amount, and voice_info.json is updated.

Usage: python -s insert_pause.py <assembled dir> "<word a>|<word b>|<target true-silence s>[|<nth match, 1-based>]" ...
   e.g. insert_pause.py takes/james_final2/_assembled "visitors|almost|0.40" "to|steal|0.26|1"
Keeps a backup <dir>/_before_pauses/ the first time it runs.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
SR = 48000
k = lambda w: re.sub(r"[^a-z0-9%']", "", w.lower())
bak = d / "_before_pauses"
if not bak.exists():
    bak.mkdir()
    for f in ("voice.wav", "words.json", "phrases.json", "voice_info.json", "words_whisper.json"):
        if (d / f).exists():
            shutil.copy(d / f, bak / f)
info = json.loads((bak / "voice_info.json").read_text(encoding="utf-8")) if (bak / "voice_info.json").exists() else {}
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels", "-of", "json", str(bak / "voice.wav")],
                       capture_output=True, text=True, check=True).stdout
st = json.loads(probe)["streams"][0]
SR, CH = int(st["sample_rate"]), int(st["channels"])
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(bak / "voice.wav"), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, CH).copy()
words = json.loads((bak / "words.json").read_text(encoding="utf-8"))
phr = json.loads((bak / "phrases.json").read_text(encoding="utf-8"))
mono = x.mean(axis=1).astype(np.float64)
hop = SR // 100
inserts = []  # (time s in the ORIGINAL file, seconds of silence)
for spec in sys.argv[2:]:
    parts = spec.split("|")
    a, b, tgt = parts[0].lower(), parts[1].lower(), float(parts[2])
    nth = int(parts[3]) if len(parts) > 3 else 1
    hits = [i for i in range(len(words) - 1) if k(words[i]["w"]) == a and k(words[i + 1]["w"]) == b]
    if len(hits) < nth:
        sys.exit(f"no match #{nth} for {a}|{b}")
    i = hits[nth - 1]
    s = words[i]["s"] + 0.5 * (words[i]["e"] - words[i]["s"])
    e = words[i + 1]["s"] + 0.5 * (words[i + 1]["e"] - words[i + 1]["s"])
    seg = mono[int(s * SR):int(e * SR)]
    n = len(seg) // hop
    db = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    best, run, end = 0, 0, 0
    for j, q in enumerate(db < -45):
        run = run + 1 if q else 0
        if run > best:
            best, end = run, j
    have = best * 0.01
    if have >= tgt:
        print(f"{a}|{b}: already {have:.2f} s >= {tgt:.2f} s, unchanged")
        continue
    mid = s + (end - best / 2 + 0.5) * 0.01
    inserts.append((mid, tgt - have))
    print(f"{a}|{b}: true silence {have:.2f} s -> {tgt:.2f} s (+{tgt - have:.2f} s at {mid:.2f} s)")
inserts.sort()
out, last, shift_at = [], 0, []
for t, dur in inserts:
    c = int(round(t * SR))
    out += [x[last:c], np.zeros((int(round(dur * SR)), CH), np.float32)]
    last = c
    shift_at.append((t, dur))
out.append(x[last:])
y = np.concatenate(out)
sh = lambda t: t + sum(dur for tt, dur in shift_at if tt <= t)
for w in words:
    w["s"], w["e"] = round(sh(w["s"]), 3), round(sh(w["e"]), 3)
for p in phr:
    p["s"], p["e"] = round(sh(p["s"]), 3), round(sh(p["e"]), 3)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(CH), "-i", "-", "-c:a", "pcm_s24le", str(d / "voice.wav")],
               input=y.tobytes(), check=True)
(d / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
if (bak / "words_whisper.json").exists() or (d / "words_whisper.json").exists():  # refine_onsets.py reads THIS raw copy
    if not (bak / "words_whisper.json").exists():
        shutil.copy(d / "words_whisper.json", bak / "words_whisper.json")
    ww = json.loads((bak / "words_whisper.json").read_text(encoding="utf-8"))
    for w in ww:
        w["s"], w["e"] = round(sh(w["s"]), 3), round(sh(w["e"]), 3)
    (d / "words_whisper.json").write_text(json.dumps(ww, ensure_ascii=False, indent=1), encoding="utf-8")
(d / "phrases.json").write_text(json.dumps(phr, ensure_ascii=False, indent=1), encoding="utf-8")
if info:
    info["inserted_pauses"] = [{"at_s": round(t, 3), "added_s": round(dd, 3)} for t, dd in inserts]
    info["duration_s"] = round(len(y) / SR, 3)
    (d / "voice_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"length {len(x) / SR:.2f} -> {len(y) / SR:.2f} s ({len(inserts)} pauses lengthened)")
