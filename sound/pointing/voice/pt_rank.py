"""Every probed take that contains a line, per line, ranked by a simple measured score (the pick is then made by hand,
with the reason logged in takes/picks.json "why"):
  score = 10 x lowest whisper p of the sentence(s)  - 100 per wrong word  - 3 per edge flag (clipped start / end,
          extra sound before / after)  + the line's acting check (INTENT)  - pace over 3.4 words/s
  python pt_rank.py [line ...]"""
import json
import sys

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
# acting intent per line: ("rise", sentence index) the end must rise; ("fall", k) a firm fall; ("flat",) a small
# pitch range; ("pause", k, lo, hi) the '...' silence inside sentence k in [lo, hi] s
INTENT = {
    "d01": [("pause", 0, 0.18, 0.50)], "d02": [("pause", 0, 0.18, 0.50)], "d03": [("pause", 0, 0.18, 0.50)], "d04": [("pause", 0, 0.18, 0.50)],
    "k01": [("pause", 0, 0.18, 0.50)], "t04": [("pause", 0, 0.15, 0.50)], "t06": [("pause", 0, 0.25, 0.70), ("flat",)],
    "n02": [("rise", 0), ("pause", 1, 0.15, 0.45)], "n06": [("pause", 0, 0.15, 0.45)], "n08": [("rise", 0)],
    "t05": [("rise", 0)], "n09": [("rise", 0), ("pause", 0, 0.15, 0.45)], "n11": [("pause", 0, 0.15, 0.45)],
    "n12": [("pause", 0, 0.15, 0.45)],
}


def cands(lid):
    out = []
    for pj in sorted(L.TAKES.glob("*/*.probe.json")):
        r = json.loads(pj.read_text(encoding="utf-8"))
        ss = [o for o in r.get("sent", []) if o["line"] == lid]
        if ss:
            out.append((f"{pj.parent.name}/{pj.name.split('.')[0]}", r, ss))
    return out


def score(lid, r, ss):
    notes = []
    sc = 10 * min(o.get("min_p", 0) for o in ss)
    wrong = sum(len(o.get("diff", [])) for o in ss)
    sc -= 100 * wrong
    for f, c in (("CLIPSTART", r.get("clipped_start") and ss[0]["k"] == 0), ("CLIPEND", r.get("clipped_end") and ss[-1]["k"] == len(r["sent"]) - 1),
                 ("PRE+", r.get("pre_extra") and ss[0]["k"] == 0), ("TAIL+", (r.get("tail_extra_db") or -99) > -45 and ss[-1]["k"] == len(r["sent"]) - 1)):
        if c:
            sc -= 3
            notes.append(f)
    nw = sum(L.nwords(o["text"]) for o in ss)
    wps = nw / sum(o["dur"] for o in ss)
    if wps > 3.4:
        sc -= 2 * (wps - 3.4)
        notes.append(f"fast {wps:.2f}")
    for it in INTENT.get(lid, []):
        if it[0] == "rise" and it[1] < len(ss):
            e = (ss[it[1]].get("end") or {}).get("rise_st", 0)
            sc += 1 if e > 1.0 else -1
            notes.append(f"end{e:+.1f}")
        if it[0] == "pause" and it[1] < len(ss):
            p = ss[it[1]]["inner_s"]
            ok = it[2] <= p <= it[3]
            sc += 0.5 if ok else -1
            notes.append(f"pause {p:.2f}{'' if ok else '!'}")
        if it[0] == "flat":
            rg = (ss[0].get("f0") or {}).get("range_st", 99)
            sc += 1 if rg < 4 else (0 if rg < 7 else -1)
            notes.append(f"range {rg}st")
    return round(sc, 2), wrong, notes, wps


if __name__ == "__main__":
    want = sys.argv[1:] or [l[0] for l in L.LINES]
    for lid in want:
        rows = []
        for src, r, ss in cands(lid):
            sc, wrong, notes, wps = score(lid, r, ss)
            f0 = (ss[0].get("f0") or {}).get("med")
            rows.append((sc, src, r, ss, wrong, notes, wps, f0))
        rows.sort(key=lambda t: -t[0])
        print(f"\n== {lid} {L.SPEAKER[lid]}: {L.TEXT[lid]}")
        for sc, src, r, ss, wrong, notes, wps, f0 in rows[:8]:
            heard = " | ".join(o.get("heard", "") for o in ss)
            print(f"  {sc:6.2f} {src:16s} p>={min(o.get('min_p', 0) for o in ss):.2f} {sum(o['dur'] for o in ss):.2f}s {wps:.2f}w/s f0 {f0} "
                  f"{' '.join(notes)}  tag {r.get('tag_text', '')[:40]!r}  heard {heard!r}")
