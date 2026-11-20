"""SCRIPT v3: INSTALL the assembled + accepted v3 voice from _v3/ into sound/pointing/voice/ (the place every other tool
reads). Copies, never moves: _v3/ stays as the build record. The v1 track in _full/ is not touched.
  python pt3_install.py [--dir _v3] [--force]      (refuses when verify / accept did not pass, unless --force)"""
import json
import shutil
import sys

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
D = L.HERE / (sys.argv[sys.argv.index("--dir") + 1] if "--dir" in sys.argv else "_v3")
info = json.loads((D / "voice_info.json").read_text(encoding="utf-8"))
acc = json.loads((D / "accept.json").read_text(encoding="utf-8"))
if not (info["verify"]["passed"] and acc["passed"]) and "--force" not in sys.argv:
    sys.exit(f"NOT INSTALLED: verify passed = {info['verify']['passed']}, accept passed = {acc['passed']} (--force to install anyway)")
FILES = ["voice.wav", "words.json", "words_spoken.json", "phrases.json", "captions.json", "_build.json", "voice_info.json", "accept.json",
         "hook_gate.json", "tone_check.json", "opening_words.json"]
done = []
for f in FILES:
    if (D / f).exists():
        shutil.copy2(D / f, L.HERE / f)
        done.append(f)
for sub in ("stems", "segments"):
    if (D / sub).exists():
        if (L.HERE / sub).exists():
            shutil.rmtree(L.HERE / sub)
        shutil.copytree(D / sub, L.HERE / sub)
        done.append(sub + "/")
(L.HERE / "INSTALLED.json").write_text(json.dumps({"installed": "v3 (SCRIPT_v3, final script)", "from": str(D.relative_to(L.HERE)), "files": done,
                                                    "duration_s": info["duration_s"], "verify_passed": info["verify"]["passed"],
                                                    "accept_passed": acc["passed"], "v1_track": "_full/ (old script, untouched)"}, indent=1), encoding="utf-8")
print("installed into", L.HERE, ":", ", ".join(done))
