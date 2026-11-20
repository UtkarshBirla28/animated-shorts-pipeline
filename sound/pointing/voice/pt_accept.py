"""ACCEPT gates of an assembled pointing voice (tools/voice_accept.py's gates, on this film's lines and pt_lib's whisper):
  python pt_accept.py [voice dir]          (default: this folder)  -> prints the table, writes <dir>/accept.json

 1. every flagged line: Whisper (the line cut out alone, 0.06 s margins) hears every word of it, each with p >= 0.6
 2. every other line: Whisper hears every word (differences listed; p < 0.6 listed as warnings)
 3. breaths: audible 10 ms frames (> -50 dBFS) in the pause middles (> 0.18 s from both neighbouring words) = 0.0 s
 4. the whole file in one pass (20 s windows, as tools/voice_accept.py) against the script"""
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
D = Path(sys.argv[1]) if len(sys.argv) > 1 else L.HERE
FLAG = {"d01": "Signal... green!", "t01": "Bro's pointing at nothing!", "n08": "No board? No doors.", "k01": "Bag... check!",
        "t06": "Bag... gone.", "d03": "Doors... closed!", "d04": "Doors... closed!", "d02": "Speed... check!"}
m24 = L.read(D / "voice.wav", sr=24000)
phr = json.loads((D / "phrases.json").read_text(encoding="utf-8"))
spoken = json.loads((D / "words_spoken.json").read_text(encoding="utf-8"))


def heard_p(expected, hw):
    """expected words -> [(word, p or None)] by aligning normalised tokens"""
    exp = L.norm_text(expected)
    toks = []
    for h in hw:
        for t in L.norm_text(h["w"]):
            toks.append((t, h["p"]))
    out = [None] * len(exp)
    for blk in SequenceMatcher(None, exp, [t for t, _ in toks], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            out[blk.a + k] = toks[blk.b + k][1]
    return list(zip(exp, out))


res = {"lines": [], "flag_fail": [], "line_fail": [], "low_p_warn": []}
print("LINES (each cut out alone)")
for p in phr:
    a0, b0 = max(0.0, p["s"] - 0.06), min(len(m24) / 24000, p["e"] + 0.06)
    hw = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
    ht = " ".join(w["w"] for w in hw)
    text = L.TEXT[p["id"]]
    wp = heard_p(text, hw)
    diff = L.word_diff(text, ht)
    flagged = p["id"] in FLAG
    bad = [(w, None if q is None else round(q, 2)) for w, q in wp if q is None or q < 0.6]
    ok = not bad if flagged else not diff
    res["lines"].append({"id": p["id"], "speaker": p["speaker"], "text": text, "heard": ht, "diff": diff, "flagged": flagged,
                         "word_p": [(w, None if q is None else round(q, 3)) for w, q in wp], "ok": ok})
    if flagged and bad:
        res["flag_fail"].append({"id": p["id"], "bad": bad})
    if diff:
        res["line_fail"].append({"id": p["id"], "diff": diff})
    if not flagged and any(q is not None and q < 0.6 for _, q in wp):
        res["low_p_warn"].append({"id": p["id"], "low": [(w, round(q, 2)) for w, q in wp if q is not None and q < 0.6]})
    print(f"  {'FLAG ' if flagged else '     '}{p['id']} {p['speaker']:3s} {'ok ' if ok else 'BAD'}  {ht!r:60s} "
          + " ".join(f"{w}({'-' if q is None else f'{q:.2f}'})" for w, q in wp) + (f"  DIFF {diff}" if diff else ""), flush=True)

# breaths in pause middles (words_spoken: one entry per spoken word)
SR, hop = 24000, 240
br, where = 0.0, []
for i in range(len(spoken) - 1):
    a, b = spoken[i]["e"] + 0.18, spoken[i + 1]["s"] - 0.18
    if b - a < 0.03:
        continue
    seg = m24[int(a * SR):int(b * SR)]
    n = len(seg) // hop
    if n:
        e = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
        k = float((e > -50).sum()) * 0.01
        if k:
            where.append({"after": spoken[i]["w"], "at_s": round(a, 2), "audible_s": round(k, 2)})
        br += k
res["breath_audible_s"] = round(br, 3)
res["breath_where"] = where
print(f"\naudible (> -50 dBFS) inside pause middles: {br:.2f} s {where if where else ''}  (gate: 0.00)")

# whole file in 20 s windows
heard = []
for a in range(0, len(m24), 24000 * 20):
    for w in L.whisper(m24[a:a + 24000 * 20 + 24000 // 2]):
        w["s"] += a / 24000
        w["e"] += a / 24000
        if not heard or w["s"] > heard[-1]["s"] + 0.05:
            heard.append(w)
whole = " ".join(w["w"] for w in heard)
res["whole_file_heard"] = whole
res["whole_file_diff"] = L.word_diff(" ".join(w["w"] for w in spoken), whole)
res["whole_file_low_p"] = [(w["w"], round(w["p"], 2), round(w["s"], 2)) for w in heard if w["p"] < 0.6]
print("\nWHOLE FILE:", whole)
print("  differences:", res["whole_file_diff"] or "none")
print("  p < 0.6:", res["whole_file_low_p"] or "none")
res["passed"] = not res["flag_fail"] and not res["line_fail"] and br == 0.0
(D / "accept.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
print("\nACCEPT", "PASSED" if res["passed"] else f"FAILED: flagged {res['flag_fail']} lines {res['line_fail']} breath {br:.2f} s")
