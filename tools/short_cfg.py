"""Which short is the pipeline working on? Every shared tool imports this instead of hard-coding a folder name.

Order: env SHORT / COMPFILE  ->  <ROOT>/.short.json {"slug": "...", "comp": "..."} (written by tools/new_short.py)
        ->  the worked example "antitheft" / "AntiTheft".
  SHORT     folder name: studio/src/videos/<SHORT>/ and sound/<SHORT>/
  COMPFILE  component file + export stem: <COMPFILE>.tsx exports <COMPFILE>Short and <COMPFILE upper>_FRAMES
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _cfg():
    p = ROOT / ".short.json"
    d = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    slug = os.environ.get("SHORT") or d.get("slug") or "antitheft"
    comp = os.environ.get("COMPFILE") or d.get("comp") or ("AntiTheft" if slug == "antitheft" else "".join(w.title() for w in slug.split("_")))
    return slug, comp


SHORT, COMPFILE = _cfg()
COMP_ID = f"{COMPFILE}Short"
FRAMES_CONST = f"{COMPFILE.upper()}_FRAMES"
STUDIO = ROOT / "studio"
VIDEO_DIR = STUDIO / "src" / "videos" / SHORT
SOUND = ROOT / "sound" / SHORT
AUDIO_DIR = SOUND / "audio"
VOICE_DIR = SOUND / "voice"
OUT_DIR = STUDIO / "out" / SHORT

if __name__ == "__main__":
    print(json.dumps({"slug": SHORT, "comp": COMPFILE, "comp_id": COMP_ID, "frames_const": FRAMES_CONST,
                      "video_dir": str(VIDEO_DIR), "sound": str(SOUND)}, indent=1))
