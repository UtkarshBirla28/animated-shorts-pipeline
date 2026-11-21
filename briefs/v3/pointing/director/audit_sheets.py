#!/usr/bin/env python3
"""Lead's audit sheets: cut a rendered film into per-shot frame sheets for the bug hunt and the motion audits.

Usage (from the project root):
    tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/audit_sheets.py <audit_dir>
<audit_dir>/frames/f0000.jpg ... must already hold every frame of the film (ffmpeg, 360x640).
Writes <audit_dir>/sheets/*.jpg and <audit_dir>/shots_index.json. Never plays anything.
"""
import io, json, os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(sys.argv[1])
tl = json.load(io.open("briefs/v3/pointing/director/timeline_v4.json", encoding="utf-8"))
shots = tl["shots"]
total = int(tl["total"])
try:
    font = ImageFont.truetype("arialbd.ttf", 20)
    small = ImageFont.truetype("arial.ttf", 16)
except Exception:
    font = small = ImageFont.load_default()
W, H, LAB = 360, 640, 26
(ROOT / "sheets").mkdir(parents=True, exist_ok=True)


def tile(frames, path, title, cols=6):
    rows = (len(frames) + cols - 1) // cols
    img = Image.new("RGB", (cols * W, 34 + rows * (H + LAB)), (20, 20, 24))
    d = ImageDraw.Draw(img)
    d.text((8, 6), title, fill=(255, 220, 90), font=font)
    for i, f in enumerate(frames):
        im = Image.open(ROOT / "frames" / ("f%04d.jpg" % f))
        x = (i % cols) * W
        y = 34 + (i // cols) * (H + LAB)
        img.paste(im, (x, y + LAB))
        d.text((x + 6, y + 3), "f%d  %.2fs" % (f, f / 30), fill=(230, 230, 230), font=small)
    img.save(path, quality=86)


index = []
bounds = []
for k, s in enumerate(shots):
    a = int(s["from"])
    nxt = int(shots[k + 1]["from"]) if k + 1 < len(shots) else total
    b = min(int(s["to"]), nxt - 1, total - 1)
    if b < a:
        b = nxt - 1
    bounds.append((a, b))
    n = b - a + 1
    step = 2 if n <= 48 else 3
    fr = list(range(a, b + 1, step))
    if fr[-1] != b:
        fr.append(b)
    p = ROOT / "sheets" / ("%s_f%d-%d.jpg" % (s["id"], a, b))
    words = s.get("words", "")
    if isinstance(words, list):
        words = " ".join(str(w) for w in words)
    tile(fr, p, "%s  frames %d-%d (%d f, every %d. frame + last)  set=%s owner=%s  words: %s"
         % (s["id"], a, b, n, step, s["set"], s["owner"], str(words)[:90]))
    index.append({"id": s["id"], "from": a, "to": b, "frames": n, "set": s["set"], "owner": s["owner"],
                  "sheet": p.resolve().as_posix(), "place": str(s.get("place", ""))[:200], "words": str(words)[:200]})

tile(list(range(0, 13)), ROOT / "sheets" / "_OPENING_first_13_frames.jpg", "OPENING: frames 0-12, every frame (the first 0.4 s)")
tile(list(range(100, 250)), ROOT / "sheets" / "_OPENING_go_run_red_X_every_frame_f100-249.jpg",
     "OPENING: Go run, red cut, X: EVERY frame f100-f249", cols=10)
tile(list(range(0, total, 15)), ROOT / "sheets" / "_WHOLE_FILM_every_half_second.jpg",
     "WHOLE FILM (draft): one frame every 0.5 s", cols=10)
pairs = []
for (a, b), (c, d2) in zip(bounds, bounds[1:]):
    pairs += [b, c]
tile(pairs, ROOT / "sheets" / "_CUTS_last_frame_then_first_frame.jpg",
     "EVERY CUT: the last frame of a shot, then the first frame of the next (read in pairs, left to right)", cols=8)
tile([total - 3, total - 2, total - 1, 0, 1, 2], ROOT / "sheets" / "_LOOP_last3_then_first3.jpg",
     "THE LOOP: the last 3 frames, then the first 3 frames")
json.dump(index, io.open(ROOT / "shots_index.json", "w", encoding="utf-8"), indent=1)
print(len(index), "shot sheets written;", "shots:", index[0]["id"], index[0]["from"], index[0]["to"], "...",
      index[-1]["id"], index[-1]["from"], index[-1]["to"])
