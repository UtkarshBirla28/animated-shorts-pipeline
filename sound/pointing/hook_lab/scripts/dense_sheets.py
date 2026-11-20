"""Cut-check sheets: 0-5 s every 0.2 s (26 frames, 2 rows of 13) for each video, 3 videos stacked per image.
Writes strips/dense/dense_<k>.jpg. Light: ffmpeg 1 thread, 150x267 tiles, silent."""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TW, TH = 150, 267
man = json.loads(Path("data/manifest.json").read_text())
man.sort(key=lambda m: (m["owner"] != "his", -m["views"]))
f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 16)
fb = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 20)


def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-threads", "1", "-an", "-t", "5.2", "-i", path, "-vf",
                          f"select=not(mod(n\\,6)),scale={TW}:{TH}", "-fps_mode", "passthrough", "-pix_fmt", "rgb24",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(raw) // (TW * TH * 3)
    return np.frombuffer(raw[:n * TW * TH * 3], np.uint8).reshape(n, TH, TW, 3)[:26]


def sheet(item):
    fr = frames(item["path"])
    W = 13 * (TW + 2)
    img = Image.new("RGB", (W, 28 + 2 * (TH + 2)), (15, 15, 15))
    d = ImageDraw.Draw(img)
    d.text((6, 3), f"{item['slug']}  {item['views']:,}", fill=(255, 255, 255), font=fb)
    for k, a in enumerate(fr):
        x = (k % 13) * (TW + 2)
        y = 28 + (k // 13) * (TH + 2)
        img.paste(Image.fromarray(a), (x, y))
        d.rectangle([x, y, x + 40, y + 18], fill=(0, 0, 0))
        d.text((x + 3, y + 1), f"{k * 0.2:.1f}", fill=(255, 220, 0), font=f)
    return img


out = Path("strips/dense")
out.mkdir(parents=True, exist_ok=True)
for g in range(0, len(man), 3):
    imgs = [sheet(m) for m in man[g:g + 3]]
    H = sum(i.height for i in imgs) + 6 * (len(imgs) - 1)
    S = Image.new("RGB", (imgs[0].width, H), (60, 60, 60))
    y = 0
    for i in imgs:
        S.paste(i, (0, y))
        y += i.height + 6
    S.save(out / f"dense_{g // 3 + 1:02d}.jpg", quality=84)
    print("ok", g // 3 + 1, [m["slug"] for m in man[g:g + 3]], flush=True)
