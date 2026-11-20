"""Measure the v6b retake candidates against the installed (preview 2) takes: the numbers the sound audit asked for.
  python v6b_measure.py [n18] [n19] [n05] [n11]      -> takes/measure_<line>.json + printed tables

Every candidate is cut and gained exactly as the build would (v6b_lib), then:
  unit     duration, words/s, f0 median / start (first 250 ms voiced) / end (last 250 ms voiced), range
  words    per word: duration, level against the unit's loudness (RMS and loudest 100 ms), f0 median / max / first / last third
  checks   whisper (from the probe: wrong words, lowest word p), clipped edges, extra sound"""
import json
import sys

import numpy as np

import v6_lib as L
import v6b_lib as B

sys.stdout.reconfigure(encoding="utf-8")
TARGET = -20.18          # the unit target of the installed voice (mono LUFS; gain_db + lufs_before_gain of its units)
LIFT = {"n17": 1.5, "n19": 1.5}
CAND = {
    "n18": [f"r18/t{k}" for k in range(1, 7)] + ["r18c/t1", "r18c/t2"] + [f"c13/t{k}" for k in range(1, 5)] + ["r1819/t1", "r1819/t2"],
    "n19": [f"r19/t{k}" for k in range(1, 8)] + [f"c14/t{k}" for k in range(1, 5)] + [f"c13/t{k}" for k in range(1, 5)]
           + [f"r19b/t{k}" for k in range(1, 7)] + ["r1819/t1", "r1819/t2"],
    "n05": [f"r05/t{k}" for k in range(1, 5)] + [f"c03/t{k}" for k in range(1, 5)],
    "n11": [f"c07/t{k}" for k in range(1, 5)],
    "n17": ["c12/t2"], "n04": ["c03/t2"], "n06": ["c04/t1"], "n10": ["c07/t2"], "n12": ["c08/t1"], "n16": ["c11/t2"],
}
INSTALLED = {"n18": "c13/t2", "n19": "c14/t2", "n05": "c03/t2", "n11": None}


def measure(lid, src):
    tk = B.load_take(src)
    pr = tk["probe"]
    res = {"src": src, "tag_text": tk["meta"]["text"], "stability": tk["meta"].get("stability"),
           "flags": [f for f, c in (("CLIPSTART", pr.get("clipped_start")), ("CLIPEND", pr.get("clipped_end")), ("PRE+", pr.get("pre_extra")),
                                    ("TAIL+", (pr.get("tail_extra_db") or -99) > -45)) if c],
           "wrong": [o["diff"] for o in pr["sent"] if o["line"] == lid and o.get("diff")],
           "min_p": min((o.get("min_p", 0) for o in pr["sent"] if o["line"] == lid), default=None),
           "heard": " | ".join(o.get("heard", "") for o in pr["sent"] if o["line"] == lid), "units": []}
    for u in B.units_from_take(tk, lid):
        B.finish_unit(u, TARGET, LIFT.get(lid, 0.0))
        words = B.time_words(u)
        res["units"].append({"texts": u["texts"], "dur": round(u["len_f"], 3), "wps": round(len(words) / u["len_f"], 2),
                             "gain_db": u["gain_db"], "peak": u["peak"], "trim_db": u["trim_db"], "dips": u["dips"],
                             "native_gap": u["native_gap"], "inner_cuts": u["inner_cuts"], "edge": B.edge_pitch(u),
                             "words": B.word_stats(u, words)})
    return res


def main():
    want = [a for a in sys.argv[1:] if not a.startswith("--")] or ["n18", "n19", "n05", "n11"]
    for lid in want:
        out = L.TAKES / f"measure_{lid}.json"
        done = json.loads(out.read_text(encoding="utf-8")) if out.exists() and "--force" not in sys.argv else {}
        for src in CAND[lid]:
            if src not in done:
                try:
                    done[src] = measure(lid, src)
                except Exception as e:      # a take that cannot be cut (alignment / probe trouble) is reported, not hidden
                    done[src] = {"src": src, "error": repr(e)}
                out.write_text(json.dumps(done, ensure_ascii=False, indent=1), encoding="utf-8")      # save after every take
        print(f"\n=== {lid}  {L.TEXT[lid]}   (installed: {INSTALLED.get(lid)})")
        for src, r in done.items():
            if "error" in r:
                print(f"  {src:9s} ERROR {r['error']}")
                continue
            print(f"  {src:9s} st{r['stability']} {r['tag_text'][:44]:44s} p>={r['min_p']} {' '.join(r['flags'])} {'WRONG ' + str(r['wrong']) if r['wrong'] else ''}")
            for un in r["units"]:
                e = un["edge"] or {}
                print(f"       [{' '.join(un['texts'])}] {un['dur']:.2f}s {un['wps']:.2f}w/s  f0 med {e.get('med_hz')} start {e.get('start_hz')} end {e.get('end_hz')} "
                      f"p90 {e.get('p90_hz')} r{e.get('range_st')}st  gap>{un['native_gap']}  gain {un['gain_db']:+.1f} pk {un['peak']} {'DIPS' if un['dips'] else ''}{' TRIM' if un['trim_db'] else ''}")
                print("         " + "  ".join(f"{w['w']}({w['dur']:.2f}s {w['loud100_vs_unit']:+.1f}dB f0 {w['f0_med']}/{w['f0_max']} {w['f0_first']}>{w['f0_last']})" for w in un["words"]))


if __name__ == "__main__":
    main()
