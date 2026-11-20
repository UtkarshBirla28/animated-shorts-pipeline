"""Compact casting / take table from the probe files (no whisper re-run).
  python pt_table.py cast_d cast_t cast_t6 cast_k          one row per take
Columns: wrong words / lowest whisper p, span + words/s, f0 median and p10-p90 range (semitones), level range (dB),
vocal-tract length (cm, pt_vtl), MFCC distance to James (mean of his narrator takes) and f0 distance to James (st),
laugh = sound before the first word (ElevenLabs first-word time - first sound), flags (clipped edges, extra sound),
and per sentence: duration, inner '...' silence, end contour (semitones over the last 300 ms)."""
import json
import sys

import numpy as np

import pt_lib as L


def james():
    mf, f0 = [], []
    for c in ("c01", "c02", "c05", "c06", "c07", "c08", "c09"):
        for t in ("t1", "t3"):
            pj = L.TAKES / c / f"{t}.probe.json"
            if pj.exists():
                r = json.loads(pj.read_text(encoding="utf-8"))
                if "timbre" in r:
                    mf.append(r["timbre"]["mfcc"])
                    f0.append(r["express"]["med"])
    return (np.mean(np.array(mf), axis=0), float(np.median(f0))) if mf else (None, None)


def row(folder, mp3, jm, jf):
    r = json.loads(mp3.with_suffix(".probe.json").read_text(encoding="utf-8"))
    al = [w for w in L.align_words(mp3.with_suffix(".json")) if any(ch.isalnum() for ch in w[0])]
    laugh = round(al[0][1] - r["lead_s"], 2) if al and "lead_s" in r else None
    bad = sum(len(o.get("diff", [])) for o in r["sent"])
    mp = min((o.get("min_p", 0) for o in r["sent"]), default=0)
    e = r.get("express", {})
    v = r.get("vtl") or {}
    dj = round(float(np.linalg.norm(np.array(r["timbre"]["mfcc"]) - jm)), 2) if jm is not None and "timbre" in r else None
    fj = round(abs(12 * np.log2(e["med"] / jf)), 1) if jf and e.get("med") else None
    flags = [f for f, c in (("CLIPSTART", r.get("clipped_start")), ("CLIPEND", r.get("clipped_end")), ("PRE+", r.get("pre_extra")),
                            ("TAIL+", (r.get("tail_extra_db") or -99) > -45)) if c]
    sents = "  ".join(f"[{o['text'][:22]} {o['dur']:.2f}s in{o['inner_s']:.2f} end{(o.get('end') or {}).get('rise_st', 0):+.1f} p{o.get('min_p', 0):.2f}]"
                      for o in r["sent"])
    return (f"{folder:8s} {mp3.stem:9s} st{r.get('stability')} wrong {bad} p>={mp:.2f} span {r['span']:.2f}s {r['wps_speaking']:.2f}w/s "
            f"f0 {e.get('med')} r{e.get('range_st')}st lvl {e.get('level_range_db')}dB vtl {v.get('vtl_cm')} (F1-3 {v.get('F1')}/{v.get('F2')}/{v.get('F3')}) "
            f"dJames mfcc {dj} f0 {fj}st laugh {laugh} {' '.join(flags)}\n      {sents}  heard: {r['heard']!r}")


if __name__ == "__main__":
    jm, jf = james()
    print(f"James reference f0 {jf}")
    for folder in sys.argv[1:]:
        for mp3 in sorted((L.TAKES / folder).glob("*.mp3")):
            if mp3.with_suffix(".probe.json").exists():
                print(row(folder, mp3, jm, jf))
