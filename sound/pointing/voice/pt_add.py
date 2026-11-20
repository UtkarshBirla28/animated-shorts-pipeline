"""Add shared-library voices to My Voices (the API cannot use a library voice otherwise; LESSONS 4). Never prints the key.
  python pt_add.py [role ...]          adds every CANDIDATES entry of those roles (default: all) not in My Voices yet
  python pt_add.py --previews          downloads each candidate's free library preview to takes/previews/ (no credits)
  python pt_add.py --remove <voice_id> ...   removes voices this script added (never anything else)"""
import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
# role, candidate, library voice_id, search term (to find its public owner), name in My Voices
CANDIDATES = [
    ("N", "james", "QhpsGjDKZmM9qRYdMhBD", "James Conversational Energetic Punchy", "PT Narrator James"),
    ("D", "hideo", "FMgBdHe1YV2Xi0B9anXW", "Hideo", "PT Driver Hideo"),
    ("D", "masaki", "2Jg786yPJ6zSdiI0EAAH", "Masaki", "PT Driver Masaki"),
    ("D", "kei", "qjx83Y0UcERgVPICvVpl", "Kei Calm Raspy Youthful", "PT Driver Kei"),
    ("D", "taro", "UznIBkKIQe3ZG2tGydre", "Taro", "PT Driver Taro"),
    ("T", "gus", "wGkprrTXgBM5EC3Znt6U", "Gus Natural Goofy", "PT Tourist Gus"),
    ("T", "jerryb", "rHWSYoq8UlV0YIBKMryp", "Jerry B California Surfer", "PT Tourist JerryB"),
    ("T", "hal", "aLyZxRoKf8CwWlGthFYB", "Hal Animated Social Media", "PT Tourist Hal"),
    ("T", "peter", "zfpxqh60b0TrMkJHDLsR", "Peter Neutral Calm Clipped", "PT Tourist Peter"),
    ("T", "flackoo", "3lqN2QjRfNc5KxYJLLOR", "Flackoo", "PT Tourist Flackoo"),
    ("KID", "teddy", "XjGYkUkzth8BPs29fmcV", "Teddy Twinkle", "PT Kid Teddy"),
    ("KID", "valf", "loY1uopAz31XyhAEhNSa", "Valf Young Playful", "PT Kid Valf"),
    ("KID", "austin", "Xb3zeLrTi6F4ziIcXdwk", "Austin Timid and Casual", "PT Kid Austin"),
    ("KID", "ryan", "tJHJUEHzOkMoPmJJ5jo2", "Ryan Quin", "PT Kid Ryan"),
    # round 2 (the preview screen put every round-1 kid in the adult range; pt_vtl.py)
    ("KID", "piku", "EeQEodFZVtBkjtgK3HBc", "Piku Expressive Kid Character", "PT Kid Piku"),
    ("KID", "kiran", "o80picuztV1xYiPeIrpa", "Kiran Very Young Adorable", "PT Kid Kiran"),
    ("KID", "kavya", "bA58y3FqVI6b6gTNh0oT", "Kavya Cute Engaging Character", "PT Kid Kavya"),
    ("KID", "munni", "VOGEEZj2Kly5dP9LrQy8", "Munni Animated Kid Character", "PT Kid Munni"),
    ("KID", "chutki", "Jr72SE8p9OcJmr8hyX0D", "Chutki Cute Kids Cartoon", "PT Kid Chutki"),
]
LOG = HERE / "voices_added.json"


def find(q, vid):
    for qq in (q, q.split()[0]):
        d = el_api.req("GET", "/shared-voices", params={"search": qq, "page_size": 40, "language": "en"})
        hit = next((v for v in d.get("voices", []) if v["voice_id"] == vid), None)
        if hit:
            return hit
    return None


if "--remove" in sys.argv:
    added = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else {}
    ours = {v["voice_id"] for v in added.values()}
    for vid in sys.argv[sys.argv.index("--remove") + 1:]:
        if vid not in ours:
            print("refused (not added by this script):", vid)
            continue
        r = el_api.req("DELETE", f"/voices/{vid}")
        print(vid, json.dumps(r)[:200])
        for k, v in list(added.items()):
            if v["voice_id"] == vid:
                v["removed"] = True
    LOG.write_text(json.dumps(added, indent=1), encoding="utf-8")
    sys.exit()

if "--previews" in sys.argv:
    out = HERE / "takes" / "previews"
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for role, cand, vid, q, name in CANDIDATES:
        hit = find(q, vid)
        if not hit or not hit.get("preview_url"):
            print("no preview:", cand)
            continue
        f = out / f"{role}_{cand}.mp3"
        if not f.exists():
            with urllib.request.urlopen(hit["preview_url"], timeout=60) as r:
                f.write_bytes(r.read())
        meta[f"{role}_{cand}"] = {k: hit.get(k) for k in ("voice_id", "name", "gender", "age", "accent", "use_case", "descriptive", "description")}
        print("preview", f.name, f.stat().st_size, "bytes")
    (out / "previews_meta.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")
    sys.exit()

roles = [a for a in sys.argv[1:] if not a.startswith("--")]
mine = {v["voice_id"] for v in el_api.req("GET", "/voices").get("voices", [])}
added = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else {}
for role, cand, vid, q, name in CANDIDATES:
    if roles and role not in roles:
        continue
    if vid in mine:
        print("already in My Voices:", name, vid)
        continue
    hit = find(q, vid)
    if not hit:
        print("NOT FOUND in library search:", q, vid)
        continue
    r = el_api.req("POST", f"/voices/add/{hit['public_owner_id']}/{vid}", {"new_name": name})
    print(name, vid, json.dumps(r)[:300])
    if "voice_id" in r:
        added[name] = {"voice_id": r["voice_id"], "library_voice_id": vid, "library_name": hit["name"], "role": role, "candidate": cand}
    LOG.write_text(json.dumps(added, indent=1), encoding="utf-8")
