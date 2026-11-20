"""Per-sentence comparison of every measured take: python clown_table.py <folder> [...]  (reads *.probe.json)"""
import json
import sys

import clown_lib as L

sys.stdout.reconfigure(encoding="utf-8")
rows = {}
for sub in sys.argv[1:]:
    for pj in sorted((L.TAKES / sub).glob("*.probe.json")):
        r = json.loads(pj.read_text(encoding="utf-8"))
        if "error" in r:
            print(sub, pj.name, "ERROR", r["error"])
            continue
        name = f"{sub}/{pj.name.split('.')[0]}"
        if r.get("take_diff"):
            print(f"{name}: TAKE DIFF {r['take_diff']}")
        print(f"{name:22s} speak {r['wps_speaking']:.2f} w/s  raw {r['raw_lufs']:.1f} LUFS pk {r['raw_peak']:.2f}  f0 {r['f0_med']:.0f} Hz/{r['f0_range_st']:.1f} st  mid {r['bands']['mid_db']:.1f} hi {r['bands']['hi_db']:.1f}  spread {r['lufs_spread']:.1f}"
              f"{'  CLIPSTART' if r['clipped_start'] else ''}")
        for s in r["sent"]:
            rows.setdefault(s["i"], []).append((name, s, r))
for i in sorted(rows):
    print(f"\nS{i} {L.S[i][0]}   [{L.S[i][3]}]")
    for name, s, r in rows[i]:
        e = s["end"] or {}
        print(f"   {name:22s} {s['dur']:5.2f}s {s['wps']:4.2f}w/s  lufs {s['lufs']:6.1f}  f0 {s['f0'].get('med', 0):5.0f}/{s['f0'].get('range_st', 0):4.1f}  end {e.get('rise_st', 0):+5.1f} vsmed {e.get('end_vs_med_st', 0):+5.1f}"
              f"  inner {s['inner_s']:.2f} {(s['inner_at'] or '')[:18]:18s} gap {s['gap_after'] if s['gap_after'] is not None else '-'}  p {s.get('min_p', 0):.2f}  mid {s['bands'].get('mid_db', 0):6.1f}  {s.get('heard', '')}")
