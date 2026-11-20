"""Proof that a gap edit changed nothing else: compares voice.wav / words / phrases with the backup in _prev_gap/.

  python clown_gapdiff.py

 - audio: every sample before the lengthened gap is identical; every sample after it is identical, moved later by the
   added length; the inserted stretch is digital silence (as in every other gap of this file)
 - words.json, words_spoken.json, phrases.json: same entries; times before the gap unchanged, times after it + the shift"""
import json
import sys

import numpy as np

import clown_lib as L

sys.stdout.reconfigure(encoding="utf-8")
V, B = L.HERE, L.HERE / "_prev_gap"
new, old = L.read(V / "voice.wav", ch=2), L.read(B / "voice.wav", ch=2)
bn = json.loads((V / "_build.json").read_text(encoding="utf-8"))
bo = json.loads((B / "_build.json").read_text(encoding="utf-8"))
ok = True
for i0, tgt in L.GAP_OVERRIDE.items():
    so = {s["i"]: s for s in bo["sentences"]}
    sn = {s["i"]: s for s in bn["sentences"]}
    shift = round((sn[i0 + 1]["on"] - sn[i0]["off"]) - (so[i0 + 1]["on"] - so[i0]["off"]), 6)
    n = int(round(shift * L.SR))
    cut = int(round((so[i0]["off"] + (so[i0 + 1]["on"] - so[i0]["off"]) / 2) * L.SR))      # middle of the old gap
    head = float(np.max(np.abs(new[:cut] - old[:cut])))
    tail = float(np.max(np.abs(new[cut + n:] - old[cut:])))
    ins = float(np.max(np.abs(new[cut:cut + n])))
    print(f"gap after S{i0}: old {so[i0 + 1]['on'] - so[i0]['off']:.3f} s -> new {sn[i0 + 1]['on'] - sn[i0]['off']:.3f} s, shift {shift:.3f} s = {n} samples")
    print(f"  samples {len(old)} -> {len(new)} (difference {len(new) - len(old)})")
    print(f"  audio before the gap: max |new - old| = {head:.2e}; after the gap (moved {n} samples): {tail:.2e}; inserted stretch peak = {ins:.2e}")
    ok &= head == 0 and tail == 0 and ins == 0 and len(new) - len(old) == n
    t_gap = so[i0]["off"]
    for name in ("words.json", "words_spoken.json", "phrases.json"):
        a, b = json.loads((B / name).read_text(encoding="utf-8")), json.loads((V / name).read_text(encoding="utf-8"))
        key = "w" if "words" in name else "markup"
        same = len(a) == len(b) and all(x[key] == y[key] for x, y in zip(a, b))
        dmax = 0.0
        for x, y in zip(a, b):
            for k in ("s", "e"):
                exp = x[k] + (shift if x[k] > t_gap + 1e-6 else 0.0)
                dmax = max(dmax, abs(y[k] - exp))
        moved = sum(1 for x in a if x["s"] > t_gap + 1e-6)
        print(f"  {name}: {len(b)} entries, same text {same}, {moved} entries moved by +{shift:.3f} s, largest deviation from that {dmax:.4f} s")
        ok &= same and dmax <= 0.0011
    go, gn = {(g["after"], g["before"]): g for g in bo["gaps"]}, {(g["after"], g["before"]): g for g in bn["gaps"]}
    other = [k for k in go if k != (i0, i0 + 1) and go[k]["target_s"] != gn[k]["target_s"]]
    gains = [s["i"] for s in bo["sentences"] if (s["portion_gain_db"], s["sentence_gain_db"], s["take"]) != (sn[s["i"]]["portion_gain_db"], sn[s["i"]]["sentence_gain_db"], sn[s["i"]]["take"])]
    print(f"  other gaps changed: {other or 'none'}; sentences with another take or gain: {gains or 'none'}")
    ok &= not other and not gains
print("GAPDIFF", "PASSED" if ok else "FAILED")
