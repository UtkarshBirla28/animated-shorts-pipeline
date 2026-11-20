"""Per-word Whisper probability of every sentence of every take in the given folders (each sentence cut out alone, 0.06 s
margins, the take at -18 LUFS: the accept gate's own test) + word starts inside the take.
  python pt3_wordp.py <takes subfolder | folder/take> [more ...]      -> prints, writes <take>.wordp.json"""
import json
import sys
from difflib import SequenceMatcher

import pt_lib as L
import pt3_lib  # noqa: F401

sys.stdout.reconfigure(encoding="utf-8")


def heard_p(expected, hw):
    exp = L.norm_text(expected)
    toks = [(t, h["p"], h["s"]) for h in hw for t in L.norm_text(h["w"])]
    out = [(None, None)] * len(exp)
    for blk in SequenceMatcher(None, exp, [t[0] for t in toks], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            out[blk.a + k] = (toks[blk.b + k][1], toks[blk.b + k][2])
    return [(w, None if p is None else round(float(p), 2), None if s is None else round(float(s), 3)) for w, (p, s) in zip(exp, out)]


for sub in [a for a in sys.argv[1:] if not a.startswith("--")]:
    only = None
    if "/" in sub:                    # one take: folder/take
        sub, only = sub.split("/")
    for mp3 in sorted((L.TAKES / sub).glob("*.mp3")):
        if only and mp3.stem != only:
            continue
        pj = mp3.with_suffix(".probe.json")
        if not pj.exists():
            continue
        pr = json.loads(pj.read_text(encoding="utf-8"))
        wj = mp3.with_suffix(".wordp.json")
        if wj.exists() and "--force" not in sys.argv:
            res = json.loads(wj.read_text(encoding="utf-8"))
        else:
            m24 = L.read(mp3, sr=24000) * 10 ** (pr["gain_db"] / 20)
            res = []
            for s in pr["sent"]:
                a0 = max(0.0, s["on"] - 0.06)
                hw = L.whisper(m24[int(a0 * 24000):int((s["off"] + 0.06) * 24000)])
                res.append({"line": s["line"], "text": s["text"], "heard": " ".join(w["w"] for w in hw),
                            "words": [(w, p, None if t is None else round(t + a0, 3)) for w, p, t in heard_p(s["text"], hw)]})
            wj.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
        print(f"[{sub}/{mp3.stem}] " + " | ".join(" ".join(f"{w}({'-' if p is None else p})" for w, p, _ in r["words"]) for r in res), flush=True)
