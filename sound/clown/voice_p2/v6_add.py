"""Add shared-library voices to My Voices (the API cannot use a library voice otherwise; LESSONS 4). Never prints the key.
  python v6_add.py            adds every CANDIDATES entry that is not in My Voices yet
  python v6_add.py --remove <voice_id> ...   removes voices this script added"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
# (search term, library voice_id, name in My Voices)
CANDIDATES = [
    ("Erby", "n27L8GNoVt7SPUboEQb7", "CL Student Erby"),
    ("Sheldon Quirky", "uWNz6TbvrJHW6G4bBMPw", "CL Student Sheldon"),
    ("Nathan High-Pitched Nerd", "g2W4HAjKvdW93AmsjsOx", "CL Student Nathan"),
    ("Irene Friendly", "w9xM4Spfmuw28ZXAirWK", "CL Interviewer Irene"),
    ("Nikki Friendly", "yhFUAoS32gPDJFQHbH68", "CL Interviewer Nikki"),
    ("Kymmiee", "KHDywVwjZ97ShJLe4NCr", "CL Friend Kymmiee"),
    ("Jerry B", "rHWSYoq8UlV0YIBKMryp", "CL Headphones JerryB"),
    ("Brandon", "QzclONYwRWvec152I3wf", "CL Headphones Brandon"),
    ("Jeremy Casual Guy Next Door", "5gaEGrWSk4v20HMfIhgC", "CL Phone Jeremy"),
    ("Trevor Natural Conversational", "69SAlwj2jajrSXUGnYAA", "CL Phone Trevor"),
]
LOG = HERE / "voices_added.json"

if "--remove" in sys.argv:
    for vid in sys.argv[sys.argv.index("--remove") + 1:]:
        print(vid, json.dumps(el_api.req("DELETE", f"/voices/{vid}"))[:200])
    sys.exit()
mine = {v["voice_id"] for v in el_api.req("GET", "/voices").get("voices", [])}
added = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else {}
for q, vid, name in CANDIDATES:
    if vid in mine:
        print("already in My Voices:", name, vid)
        continue
    d = el_api.req("GET", "/shared-voices", params={"search": q, "page_size": 30, "language": "en"})
    hit = next((v for v in d.get("voices", []) if v["voice_id"] == vid), None)
    if not hit:
        print("NOT FOUND in library search:", q, vid)
        continue
    r = el_api.req("POST", f"/voices/add/{hit['public_owner_id']}/{vid}", {"new_name": name})
    print(name, vid, json.dumps(r)[:200])
    if "voice_id" in r:
        added[name] = {"voice_id": r["voice_id"], "library_voice_id": vid, "library_name": hit["name"]}
LOG.write_text(json.dumps(added, indent=1), encoding="utf-8")
