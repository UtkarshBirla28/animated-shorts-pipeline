"""Print the structured builder reports of a workflow journal (files, still-wrong, lead requests, best stills).
Usage: python reports.py <journal.jsonl> [save.json]"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
rows = []
for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    d = json.loads(line)
    if d.get("type") != "result":
        continue
    v = d.get("result") or d.get("value")
    if isinstance(v, dict) and "files_changed" in v:
        rows.append(v)
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(json.dumps(rows, indent=1), encoding="utf-8")
for v in rows:
    print("=== FILES", [Path(f).name for f in v["files_changed"]][:14])
    print("  STILL WRONG:")
    for x in v["still_wrong"]:
        print("   -", x[:420])
    print("  LEAD REQUESTS:")
    for x in v["lead_requests"]:
        print("   -", x[:650])
    print("  BEST:", [Path(p).name for p in v["best_stills"][:6]])
