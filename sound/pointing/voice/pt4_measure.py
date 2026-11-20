"""Measure the NARRATOR of a finished voice folder sentence by sentence (the v4 target row / the v4 gate on a build).
  python pt4_measure.py <voice dir> [<voice dir> ...] [--json out.json] [--speakers N]
Reads <dir>/voice.wav (or stems/dialogue.wav if present), words_spoken.json (else words.json) and phrases.json (speaker
field; none = all narrator). Prints every sentence (f0 median, pace, loudness, gap to the next) and the summary + gates."""
import sys
from pathlib import Path

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SPK = tuple(arg("--speakers", "N").split(","))
dirs = [Path(a) for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] not in ("--json", "--speakers")]
res = {}
for D in dirs:
    wav = D / "stems" / "dialogue.wav" if (D / "stems" / "dialogue.wav").exists() else D / "voice.wav"
    words = V.jload(D / "words_spoken.json") if (D / "words_spoken.json").exists() else V.jload(D / "words.json")
    phr = V.jload(D / "phrases.json") if (D / "phrases.json").exists() else None
    m = L.read(wav)
    tr = V.Track(m)
    S = []
    for s in V.sentences_from_words(words, phr, SPK):
        x = tr.sentence(s["s"], s["e"], s["nw"])
        x["text"] = s["text"]
        x["tail_s"] = tr.tail(s["e"])
        S.append(x)
    sm = V.summary(S)
    sm["file_s"] = round(len(m) / L.SR, 2)
    sm["narrator_share"] = round(sm["speaking_s"] / sm["file_s"], 3)
    ck = V.check(sm)
    res[str(D)] = {"summary": sm, "check": {k: [bool(a), b] for k, (a, b) in ck.items()}, "sentences": S}
    print(f"\n== {D}  ({wav.name}, {sm['file_s']} s)")
    for k, x in enumerate(S):
        g = S[k + 1]["s"] - x["e"] if k + 1 < len(S) else None
        stp = f"{V.st(S[k - 1]['f0'], x['f0']):+5.1f}" if k and x["f0"] and S[k - 1]["f0"] else "     "
        print(f"  {x['s']:6.2f}-{x['e']:6.2f} f0 {x['f0'] or 0:5.0f} {stp} st  {x['wps']:4.2f} w/s  {x['lufs'] if x['lufs'] is not None else '':>6} LUFS  "
              f"end {((x['end'] or {}).get('rise_st') or 0):+5.1f}  tail {x['tail_s']:.2f}  gap {'' if g is None else f'{g:.2f}':>5}  {x['text'][:70]}")
    print("  SUMMARY", {k: v for k, v in sm.items() if k != "steps"})
    print("  GATES  ", "  ".join(f"{k}: {'ok' if a else 'NO'} ({b})" for k, (a, b) in ck.items()))
if "--json" in sys.argv:
    V.jsave(arg("--json", "measure.json"), res)
