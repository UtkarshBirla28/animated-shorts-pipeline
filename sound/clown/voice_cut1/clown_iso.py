"""Whisper on ONE sentence of a take, cut out alone (0.06 s margins): python clown_iso.py <folder/take>:<sentence> [...]
Prints the heard words with their probabilities, the differences against the script, and the take's onset shape
(level of the first 2 / 5 / 10 ms against the sentence peak: a clipped start begins loud)."""
import json
import sys

import numpy as np

import clown_lib as L

sys.stdout.reconfigure(encoding="utf-8")
for a in sys.argv[1:]:
    name, i = a.split(":")
    i = int(i)
    mp3 = L.TAKES / (name + ".mp3")
    pj = json.loads((L.TAKES / (name + ".probe.json")).read_text(encoding="utf-8"))
    s = next(q for q in pj["sent"] if q["i"] == i)
    m24 = L.read(mp3, sr=24000)
    seg = m24[int(max(0, s["on"] - 0.06) * 24000):int((s["off"] + 0.06) * 24000)]
    hw = L.whisper(seg)
    heard = " ".join(w["w"] for w in hw)
    m = L.read(mp3)
    on = int(s["on"] * L.SR)
    pk = np.max(np.abs(m[on:int(s["off"] * L.SR)])) + 1e-9
    st = max(0, on - int(0.03 * L.SR))
    e = [20 * np.log10(np.max(np.abs(m[st:st + int(t * L.SR)])) / pk + 1e-9) for t in (0.002, 0.005, 0.010)]
    print(f"{name} S{i}: {heard!r}  diff {L.word_diff(L.S[i][0], heard) or 'none'}  p {[(w['w'], round(w['p'], 2)) for w in hw]}"
          f"  first 2/5/10 ms of the cut vs peak: {e[0]:.0f}/{e[1]:.0f}/{e[2]:.0f} dB (cut starts {s['on'] - st / L.SR:.3f} s before the onset)")
