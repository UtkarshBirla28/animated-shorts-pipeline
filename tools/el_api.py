"""Tiny ElevenLabs REST helper for what the ElevenLabs MCP server cannot do (list premade voices with previews, read
shared-voice owner ids, add a shared library voice to My Voices, remove it again, TTS with timestamps).
The API key is read at run time from the user's Claude Code config (~/.claude.json -> mcpServers.elevenlabs.env) and is
NEVER printed, logged or written anywhere.
Usage:
  python -s el_api.py voices                      # my voices (premade + added) with labels + preview_url  -> JSON
  python -s el_api.py shared "<search>" [n]       # shared library voices incl. public_owner_id            -> JSON
  python -s el_api.py add <public_owner_id> <voice_id> "<new name>"
  python -s el_api.py remove <voice_id>
  python -s el_api.py tts <voice_id> <model_id> <out.mp3> <text_file> [stability] [speed]   (with-timestamps -> out.json)
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
API = "https://api.elevenlabs.io/v1"


def key():
    cfg = json.load(open(os.path.expanduser("~/.claude.json"), encoding="utf-8"))
    k = cfg.get("mcpServers", {}).get("elevenlabs", {}).get("env", {}).get("ELEVENLABS_API_KEY")
    if not k:
        for proj in cfg.get("projects", {}).values():
            k = proj.get("mcpServers", {}).get("elevenlabs", {}).get("env", {}).get("ELEVENLABS_API_KEY") or k
    if not k:
        sys.exit("no ElevenLabs key in ~/.claude.json")
    return k


def req(method, path, body=None, params=None):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method,
                               headers={"xi-api-key": key(), "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=120) as f:
            return json.loads(f.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:600]}


def main():
    cmd = sys.argv[1]
    if cmd == "voices":
        d = req("GET", "/voices")
        out = [{"voice_id": v["voice_id"], "name": v["name"], "category": v.get("category"), "labels": v.get("labels"),
                "description": (v.get("description") or "")[:200], "preview_url": v.get("preview_url")} for v in d.get("voices", [])]
        print(json.dumps(out, indent=1))
    elif cmd == "shared":
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 30
        d = req("GET", "/shared-voices", params={"search": sys.argv[2], "page_size": n, "language": "en"})
        out = [{k: v.get(k) for k in ("voice_id", "public_owner_id", "name", "gender", "age", "accent", "use_case", "category",
                                     "descriptive", "cloned_by_count", "usage_character_count_1y", "free_users_allowed",
                                     "live_moderation_enabled", "notice_period", "preview_url")} for v in d.get("voices", [])]
        print(json.dumps(out if out else d, indent=1))
    elif cmd == "add":
        print(json.dumps(req("POST", f"/voices/add/{sys.argv[2]}/{sys.argv[3]}", {"new_name": sys.argv[4]})))
    elif cmd == "remove":
        print(json.dumps(req("DELETE", f"/voices/{sys.argv[2]}")))
    elif cmd == "tts":
        vid, model, out, tf = sys.argv[2:6]
        stab = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
        speed = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
        style = float(sys.argv[8]) if len(sys.argv) > 8 else 0.0
        text = open(tf, encoding="utf-8").read().strip()
        body = {"text": text, "model_id": model, "voice_settings": {"stability": stab, "similarity_boost": 0.75, "speed": speed, "style": style}}
        d = req("POST", f"/text-to-speech/{vid}/with-timestamps", body, params={"output_format": "mp3_44100_128"})
        if "audio_base64" not in d:
            print(json.dumps(d)[:800]); sys.exit(1)
        open(out, "wb").write(base64.b64decode(d["audio_base64"]))
        json.dump({k: d.get(k) for k in ("alignment", "normalized_alignment")}, open(out[:-4] + ".json", "w", encoding="utf-8"))
        print("ok", out)


if __name__ == "__main__":
    main()
