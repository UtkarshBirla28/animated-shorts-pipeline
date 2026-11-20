"""Per-word whisper probabilities of chosen sentences (each sentence cut out alone, 0.06 s margins).
  python v6_words.py <folder/take>:<line> ...   e.g. c06/t1:n08"""
import json
import sys

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
for a in sys.argv[1:]:
    src, lid = a.split(":")
    mp3 = L.TAKES / f"{src}.mp3"
    r = json.loads(mp3.with_suffix(".probe.json").read_text(encoding="utf-8"))
    m24 = L.read(mp3, sr=24000)
    for o in r["sent"]:
        if o["line"] != lid:
            continue
        h = L.whisper(m24[int(max(0, o["on"] - 0.06) * 24000):int((o["off"] + 0.06) * 24000)])
        print(f"{src}:{lid}  " + " ".join(f"{w['w']}({w['p']:.2f})" for w in h), flush=True)
