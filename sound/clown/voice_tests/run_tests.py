"""Pace test: one text through several voice x model x speed combos; prints words/s and pauses. Never prints the key."""
import json, subprocess, sys, os, re
PY = sys.executable
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
EL = os.path.join(ROOT, "tools", "el_api.py")
txt = sys.argv[1]
combos = [c.split(":") for c in sys.argv[2:]]          # name:voice_prefix:model:speed[:stability]
voices = json.loads(subprocess.run([PY, "-s", EL, "voices"], capture_output=True, text=True, encoding="utf-8").stdout)
voices = voices.get("voices", voices) if isinstance(voices, dict) else voices
text = open(txt, encoding="utf-8").read().strip()
nw = len(text.split())
for c in combos:
    name, vp, model, speed = c[:4]
    stab = c[4] if len(c) > 4 else "0.5"
    vid = next(v["voice_id"] for v in voices if v["voice_id"].startswith(vp))
    out = os.path.join(HERE, f"{name}.mp3")
    r = subprocess.run([PY, "-s", EL, "tts", vid, model, out, txt, stab, speed], capture_output=True, text=True, encoding="utf-8")
    if not os.path.exists(out) or r.returncode != 0:
        print(f"{name:28s} FAILED: {(r.stderr or r.stdout)[-160:].strip()}"); continue
    j = out[:-4] + ".json"
    gaps, dur = [], None
    try:
        a = json.load(open(j, encoding="utf-8")); al = a.get("alignment") or a.get("normalized_alignment") or a
        ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        words, cur = [], None
        for k, x in enumerate(ch):
            if x.strip():
                cur = [st[k], en[k]] if cur is None else [cur[0], en[k]]
            elif cur: words.append(cur); cur = None
        if cur: words.append(cur)
        dur = words[-1][1] - words[0][0]
        gaps = [round(b[0] - a_[1], 2) for a_, b in zip(words, words[1:])]
    except Exception as e:
        pass
    if dur is None:
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout)
    big = sorted([g for g in gaps if g >= 0.25], reverse=True)
    print(f"{name:28s} {dur:5.1f}s  {nw / dur:4.2f} w/s  gaps>=0.25s: {len(big)} {big[:6]}  sum {sum(big):.1f}s")
