"""Collect every video-breakdown agent's structured result from the workflow journals into one JSON file.

Usage: python collect_breakdowns.py <out.json> <journal.jsonl> [journal.jsonl ...]
"""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
rows = {}
for j in sys.argv[2:]:
    for line in Path(j).read_text(encoding="utf-8").splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        if d.get("type") != "result":
            continue
        v = d.get("result") or d.get("value")
        if isinstance(v, dict) and "report_path" in v:
            rows[v["report_path"]] = v
out.write_text(json.dumps(sorted(rows.values(), key=lambda r: r["title"]), indent=1), encoding="utf-8")
print(f"{len(rows)} breakdowns -> {out}")
for r in sorted(rows.values(), key=lambda r: r["title"]):
    print(f"- {r['title']}: {r['duration_s']}s, {r['shots_verified']} shots, {r['words_per_s']} w/s, {r['lufs']} LUFS")
