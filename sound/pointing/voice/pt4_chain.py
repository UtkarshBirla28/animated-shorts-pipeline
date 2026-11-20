"""SCRIPT v4: pick the CHAIN of paragraph takes that sits best next to its neighbours (never a per-paragraph winner).
  python pt4_chain.py [--script ../script_v4/voice_v4.json] [--beam 400] [--no-splice] [--top 5] [--fix p3=t2,...]
Options for each paragraph: every whole take, and (unless --no-splice) every ONE-cut splice: sentences 1..i from take A,
i+1..n from take B, cut at a sentence end. Hard rejects: a sentence Whisper did not hear word for word, a clipped edge that
would be used. Cost of a chain (beam search over the paragraphs, then re-scored exactly on the whole chain):
  pitch steps between every two neighbouring sentences (inside takes, at splices and at paragraph joins): |step| + a heavy
  penalty over 6 st; the chain's median step over 3.5 st; sentence medians outside 175-200 Hz (soft) or over 240 Hz (hard);
  pace: each sentence outside 3.4-3.7 w/s, pace steps between neighbours, the chain's pace sd over 0.6; low Whisper p;
  +0.5 per splice (a whole take keeps its own breath and room).
-> takes/v4_chain.json (the winner + the next best, with every number) and a printed table."""
import itertools
import sys

import numpy as np

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SC = V.jload(arg("--script", str(L.HERE.parent / "script_v4" / "voice_v4.json")))
T = V.TARGET
BEAM, TOP = int(arg("--beam", "400")), int(arg("--top", "5"))
FIX = dict(x.split("=") for x in arg("--fix", "").split(",") if "=" in x)


def sent_cost(x):
    c = 0.0
    f = x.get("f0")
    if f:
        lo, hi = T["centre_hz"]
        if f > T["line_median_hz_max"]:
            c += 40
        c += 0.6 * max(0.0, abs(V.st(min(max(f, lo), hi), f)) - 1.0)      # semitones outside the centre band (1 st free)
    if x["nw"] >= 3:
        lo, hi = T["wps_inside"]
        c += 3.0 * max(0.0, lo - x["wps"], x["wps"] - hi)
    p = x.get("min_p")
    if p is not None and p < 0.6:
        c += 4 * (0.6 - p) * 10
    return c


def step_cost(a, b):
    if not (a.get("f0") and b.get("f0")):
        return 0.0
    s = abs(V.st(a["f0"], b["f0"]))
    c = s + (30 + 10 * (s - 6) if s > 6 else 0)
    if a["nw"] >= 3 and b["nw"] >= 3:
        c += 1.5 * abs(a["wps"] - b["wps"])
    return c


def options(pid):
    takes = []
    for pj in sorted((L.TAKES / f"v4_{pid}").glob("t*.p4.json"), key=lambda p: int(p.name.split(".")[0][1:])):
        r = V.jload(pj)
        if r.get("wrong_words"):
            ok_s = [not x.get("wrong") for x in r["sentences"]]
        else:
            ok_s = [True] * len(r["sentences"])
        takes.append((pj.name.split(".")[0], r, ok_s))
    if pid in FIX:
        takes = [t for t in takes if t[0] == FIX[pid]]
    out = []
    for name, r, ok in takes:
        S = r["sentences"]
        if all(ok) and not r["clipped_start"] and not r["clipped_end"]:
            out.append({"segs": [(name, 0, len(S))], "S": [dict(x, take=name, k=k) for k, x in enumerate(S)], "splices": 0})
    if "--no-splice" not in sys.argv and pid not in FIX:
        for (na, ra, oka), (nb, rb, okb) in itertools.permutations(takes, 2):
            if L.norm_text(ra["text"]) != L.norm_text(rb["text"]) or len(ra["sentences"]) != len(rb["sentences"]) or                     [x["nw"] for x in ra["sentences"]] != [x["nw"] for x in rb["sentences"]]:
                continue                                   # splice only two reads of the same sentences
            n = len(ra["sentences"])
            for i in range(1, n):
                if not (all(oka[:i]) and all(okb[i:]) and not ra["clipped_start"] and not rb["clipped_end"]):
                    continue
                S = [dict(x, take=na, k=k) for k, x in enumerate(ra["sentences"][:i])] + [dict(x, take=nb, k=k + i) for k, x in enumerate(rb["sentences"][i:])]
                out.append({"segs": [(na, 0, i), (nb, i, len(rb["sentences"]))], "S": S, "splices": 1})
    for o in out:
        o["cost"] = sum(sent_cost(x) for x in o["S"]) + sum(step_cost(a, b) for a, b in zip(o["S"], o["S"][1:])) + 0.5 * o["splices"]
    return out


def exact(chain):
    S = [x for o in chain for x in o["S"]]
    sm = V.summary(S)
    c = sum(o["cost"] for o in chain) + sum(step_cost(a["S"][-1], b["S"][0]) for a, b in zip(chain, chain[1:]))
    c += 8 * max(0.0, (sm["step_median_st"] or 0) - T["step_median_st_max"]) + 8 * max(0.0, (sm["wps_sd"] or 0) - T["wps_sd_max"])
    lo, hi = T["centre_hz"]
    if sm["centre_hz"]:
        c += 2 * max(0.0, abs(V.st(min(max(sm["centre_hz"], lo), hi), sm["centre_hz"])))
    return c, sm


P = [p["id"] for p in SC["paragraphs"]]
OPT = {}
for pid in P:
    OPT[pid] = options(pid)
    print(f"{pid}: {len(OPT[pid])} options ({sum(1 for o in OPT[pid] if not o['splices'])} whole takes)")
    if not OPT[pid]:
        sys.exit(f"NO usable take for {pid} (every take has a wrong word or a clipped edge where it is needed): record more")
beam = [([o], o["cost"]) for o in OPT[P[0]]]
for pid in P[1:]:
    nb = [(ch + [o], c + o["cost"] + step_cost(ch[-1]["S"][-1], o["S"][0])) for ch, c in beam for o in OPT[pid]]
    nb.sort(key=lambda t: t[1])
    beam = nb[:BEAM]
scored = sorted(((exact(ch), ch) for ch, _ in beam), key=lambda t: t[0][0])
res = []
for (c, sm), ch in scored[:TOP]:
    ck = V.check(sm)
    res.append({"cost": round(c, 2), "chain": [{"para": pid, "segs": o["segs"]} for pid, o in zip(P, ch)], "summary": sm,
                "check": {k: [bool(a), b] for k, (a, b) in ck.items()}, "passed": all(a for a, _ in ck.values()),
                "sentences": [{k: x.get(k) for k in ("take", "k", "f0", "wps", "lufs", "min_p", "text")} for o in ch for x in o["S"]]})
V.jsave(L.TAKES / "v4_chain.json", {"script": str(arg("--script", "script_v4/voice_v4.json")), "best": res[0] if res else None, "next": res[1:]})
for n, r in enumerate(res):
    print(f"\n#{n + 1} cost {r['cost']}  {'PASS' if r['passed'] else 'fails: ' + ', '.join(k for k, (a, _) in r['check'].items() if not a)}")
    print("   " + "  |  ".join(f"{c['para']}: " + " + ".join(f"{t}[{a + 1}-{b}]" for t, a, b in c["segs"]) for c in r["chain"]))
    sm = r["summary"]
    print(f"   centre {sm['centre_hz']} Hz (lines {sm['line_median_min_hz']}-{sm['line_median_max_hz']}), step median {sm['step_median_st']} max {sm['step_max_st']}, "
          f"pace {sm['wps_median']} sd {sm['wps_sd']}, {sm['words']} words in {sm['speaking_s']} s of speech")
    if n == 0:
        prev = None
        for x in r["sentences"]:
            stp = f"{V.st(prev, x['f0']):+5.1f}" if prev and x["f0"] else "     "
            prev = x["f0"] or prev
            print(f"     {x['take']:4s} s{x['k'] + 1}  f0 {x['f0'] or 0:5.0f} {stp} st  {x['wps']:4.2f} w/s  p {x['min_p']}  {x['text'][:64]}")
