"""Word times for the first 9 s of our Shorts (faster-whisper base, int8, 2 threads; light)."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
man = [m for m in json.loads(Path("data/manifest.json").read_text()) if m["owner"] == "ours"]
model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=2)
out = {}
for it in man:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-t", "9", "-i", it["path"], "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    segs, _ = model.transcribe(x, language="en", word_timestamps=True, beam_size=5, vad_filter=False)
    lines = []
    for s in segs:
        lines.append({"s": round(s.start, 2), "e": round(s.end, 2), "text": s.text.strip(),
                      "words": [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for w in s.words]})
    out[it["slug"]] = lines
    print("==", it["slug"])
    for l in lines:
        print(f"  {l['s']:5.2f}-{l['e']:5.2f} {l['text']}")
        print("     ", " ".join(f"{w}@{a:.2f}" for w, a, b in l["words"][:8]))
Path("data/ours_first_lines.json").write_text(json.dumps(out, indent=1))
