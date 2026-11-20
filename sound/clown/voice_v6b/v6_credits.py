"""Print the ElevenLabs account counter (character_count / character_limit) and log it. The API key is read by
tools/el_api.py at run time and is never printed or stored.
  python v6_credits.py <label>"""
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import el_api  # noqa: E402

d = el_api.req("GET", "/user/subscription")
rec = {"label": sys.argv[1] if len(sys.argv) > 1 else "", "time": time.strftime("%Y-%m-%d %H:%M:%S"),
       "character_count": d.get("character_count"), "character_limit": d.get("character_limit"), "tier": d.get("tier"),
       "next_reset_unix": d.get("next_character_count_reset_unix")}
if "error" in d:
    rec["error"] = d.get("error")
print(json.dumps(rec))
with open(HERE / "credits_log.jsonl", "a", encoding="utf-8") as f:
    f.write(json.dumps(rec) + "\n")
