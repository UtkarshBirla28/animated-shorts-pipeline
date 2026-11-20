"""Per-LINE comparison table of every probed take (reads <take>.probe.json only).
  python v6_table.py [line ids ...]"""
import json
import sys
from collections import defaultdict

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
want = sys.argv[1:]
rows = defaultdict(list)
for pj in sorted(L.TAKES.glob("*/*.probe.json")):
    if pj.parent.name == "test":
        continue
    r = json.loads(pj.read_text(encoding="utf-8"))
    if "sent" not in r:
        continue
    flags = [f for f, c in (("CLIPSTART", r.get("clipped_start")), ("CLIPEND", r.get("clipped_end")), ("PRE+", r.get("pre_extra")),
                            ("TAIL+", (r.get("tail_extra_db") or -99) > -45)) if c]
    by = defaultdict(list)
    for o in r["sent"]:
        by[o["line"]].append(o)
    for lid, os_ in by.items():
        on, off = os_[0]["on"], os_[-1]["off"]
        n = L.nwords(L.TEXT[lid])
        rows[lid].append((f"{pj.parent.name}/{pj.stem.split('.')[0]}", r, os_, round(off - on, 2), round(n / (off - on), 2), flags))
for lid in [l[0] for l in L.LINES]:
    if want and lid not in want:
        continue
    if lid not in rows:
        continue
    print(f"\n{lid} [{L.SPEAKER[lid]}] {L.TEXT[lid]}")
    for src, r, os_, dur, wps, flags in rows[lid]:
        parts = []
        for o in os_:
            e = o["end"] or {}
            f = o["f0"] or {}
            parts.append(f"[{o['dur']:.2f}s f0 {f.get('med', 0):5.1f} r{f.get('range_st', 0):4.1f} end{e.get('rise_st', 0):+5.1f} "
                         f"lu {o['lufs'] if o['lufs'] is not None else 0:6.2f} in{o['inner_s']:.2f} gap {o['gap_after']} p{o.get('min_p', 0):.2f}"
                         + (f" DIFF {o['diff']}" if o.get("diff") else "") + "]")
        tag = r.get("tag_text", "")[:18]
        print(f"  {src:22s} {dur:5.2f}s {wps:4.2f}w/s st{r.get('stability')}  {' '.join(flags):10s} {tag:18s} " + " ".join(parts))
