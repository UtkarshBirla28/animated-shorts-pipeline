# CAST LOG -> the JSON list tools/v3/gates_v4.py reads with --cast=... (owner CAST, 2026-11-20).
# The cards print one "CASTLOG {json}" line per drawn card per film frame when the render passes inputProps.kit.castlog:
#   node scripts/kit_render.mjs ... --props '{"castlog":1}' --keep-browser-logs > render.log 2>&1
#   python studio/src/videos3/pointing/cast/bench/castlog_extract.py render.log [more.log ...] out_cast_log.json
# Rows: {"f", "who", "op", "head": [x0, y0, x1, y1], "hands": [[x, y], ...], "armOut"} in 0..1 of the frame (y down).
import json, sys

if len(sys.argv) < 3:
    sys.exit("usage: castlog_extract.py <render.log> [...] <out.json>")
rows, seen = [], set()
for path in sys.argv[1:-1]:
    for line in open(path, encoding="utf-8", errors="replace"):
        i = line.find("CASTLOG ")
        if i < 0:
            continue
        try:
            r = json.loads(line[i + 8:].strip().rstrip("'\""))
        except json.JSONDecodeError:
            continue
        key = (r["f"], r["who"], tuple(r["head"]))
        if key in seen:
            continue
        seen.add(key)
        rows.append(r)
rows.sort(key=lambda r: (r["f"], r["who"]))
json.dump(rows, open(sys.argv[-1], "w", encoding="utf-8"))
print(f"castlog: {len(rows)} rows, frames {rows[0]['f'] if rows else '-'}..{rows[-1]['f'] if rows else '-'} -> {sys.argv[-1]}")
