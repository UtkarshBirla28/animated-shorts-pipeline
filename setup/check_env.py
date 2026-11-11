"""Check that this machine can run the pipeline (no audio is played, no credits are used)."""
import importlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ok = True


def check(name, cond, hint=""):
    global ok
    print(f"  [{'OK' if cond else 'MISSING'}] {name}" + ("" if cond else f"  -> {hint}"))
    ok &= bool(cond)


print("tools")
for t in ("node", "ffmpeg", "ffprobe", "git"):
    check(t, shutil.which(t), "install it and add it to PATH")
chrome = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
check("Chrome (" + chrome + ")", Path(chrome).exists(), "install Chrome or set env CHROME to its path")
print("python packages")
for m in ("numpy", "scipy", "matplotlib", "PIL", "cv2", "soundfile", "faster_whisper"):
    try:
        importlib.import_module(m)
        check(m, True)
    except Exception as e:  # noqa: BLE001
        check(m, False, f"pip install -r setup/requirements.txt ({e.__class__.__name__})")
print("studio")
check("studio/node_modules", (ROOT / "studio/node_modules/remotion").exists(), "cd studio && npm ci")
if (ROOT / "studio/node_modules/three/package.json").exists():
    v = json.loads((ROOT / "studio/node_modules/three/package.json").read_text())["version"]
    check(f"three {v} (pinned 0.175.0)", v == "0.175.0", "npm ci (never upgrade)")
print("ElevenLabs key (value never shown)")
k = bool(os.environ.get("ELEVENLABS_API_KEY"))
cfg = Path.home() / ".claude.json"
if not k and cfg.exists():
    try:
        d = json.loads(cfg.read_text(encoding="utf-8"))
        k = bool(d.get("mcpServers", {}).get("elevenlabs", {}).get("env", {}).get("ELEVENLABS_API_KEY"))
        k = k or any(p.get("mcpServers", {}).get("elevenlabs", {}).get("env", {}).get("ELEVENLABS_API_KEY")
                     for p in d.get("projects", {}).values())
    except Exception:  # noqa: BLE001
        pass
check("key present (env ELEVENLABS_API_KEY or elevenlabs MCP in ~/.claude.json)", k, "see SETUP.md, ElevenLabs")
try:
    out = subprocess.run(["node", "scripts/short.mjs", "--sh"], cwd=ROOT / "studio", capture_output=True, text=True).stdout.strip()
    print("current short:", out)
except Exception:  # noqa: BLE001
    pass
print("ALL GOOD" if ok else "fix the MISSING items above")
sys.exit(0 if ok else 1)
