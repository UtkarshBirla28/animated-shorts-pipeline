"""BIBLE MERGE (v3): merge the parallel DETAIL agents' part files into the bible, deterministically (no agent edits the bible
at the same time as another). A part = {"shots": [{"id": "s03", <fields to set>}], "sets": [{"id": "kitchen", <fields>}],
"cast": [...]} at briefs/v3/<slug>/parts/<group>.json. Fields in a part REPLACE the bible's fields of that shot / set / cast
member (lists are replaced whole); ids not in the bible are refused (the LEAD adds shots). Writes a CHANGES entry.

Usage: PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/bible_merge.py briefs/v3/<slug>/bible.json <part.json> [...] [--when="2026-11-20 10:00"]
"""
import json
import sys
from pathlib import Path


def main(argv):
    opts = {a.split("=", 1)[0][2:]: a.split("=", 1)[1] for a in argv if a.startswith("--") and "=" in a}
    files = [a for a in argv if not a.startswith("--")]
    if len(files) < 2:
        sys.exit(__doc__)
    bp = Path(files[0])
    bible = json.loads(bp.read_text(encoding="utf-8"))
    idx = {k: {x["id"]: x for x in bible.get(k, [])} for k in ("shots", "sets", "cast")}
    log, refused = [], []
    for pf in files[1:]:
        part = json.loads(Path(pf).read_text(encoding="utf-8"))
        for k in ("shots", "sets", "cast"):
            for item in part.get(k, []):
                tgt = idx[k].get(item.get("id"))
                if tgt is None:
                    refused.append(f"{Path(pf).name}: {k} id {item.get('id')!r} not in the bible")
                    continue
                keys = [x for x in item if x != "id"]
                tgt.update({x: item[x] for x in keys})
                log.append(f"{k}:{item['id']}({','.join(keys)})")
    bible.setdefault("CHANGES", []).append({"when": opts.get("when", ""), "who": "bible_merge",
                                            "what": f"merged {len(files) - 1} part file(s): " + "; ".join(log)[:900]})
    bp.write_text(json.dumps(bible, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"merged {len(log)} items from {len(files) - 1} part(s) into {bp}")
    for r in refused:
        print("REFUSED", r)
    return 1 if refused else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
