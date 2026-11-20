"""Search the shared voice library (compact listing; never prints the key).
  python v6_search.py "<search>" [gender] [age] [n] [sort]"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
q = sys.argv[1]
params = {"search": q, "page_size": int(sys.argv[4]) if len(sys.argv) > 4 else 15, "language": "en"}
if len(sys.argv) > 2 and sys.argv[2] != "-":
    params["gender"] = sys.argv[2]
if len(sys.argv) > 3 and sys.argv[3] != "-":
    params["age"] = sys.argv[3]
if len(sys.argv) > 5:
    params["sort"] = sys.argv[5]
d = el_api.req("GET", "/shared-voices", params=params)
if "voices" not in d:
    print(json.dumps(d)[:500])
    sys.exit(1)
for v in d["voices"]:
    print(f"{v['voice_id']} {v.get('public_owner_id', '')[:12]}.. | {v['name'][:48]:48s} | {v.get('gender')}/{v.get('age')}/{v.get('accent')} | "
          f"{v.get('use_case')}/{v.get('descriptive')} | clones {v.get('cloned_by_count')} usage1y {v.get('usage_character_count_1y')} | "
          f"free {v.get('free_users_allowed')} | {(v.get('description') or '')[:110]!r}")
