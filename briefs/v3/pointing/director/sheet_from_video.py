# DIRECTOR tool (pointing v3): the storyboard sheet from a rendered film (not stills): 2 frames per shot (at 30 % and
# 75 % of the shot), labelled with shot id, time, frame and the line.
#   tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet_from_video.py <video.mp4> <out.jpg> [tile width 230]
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
# --tl=<timeline json> (v4: briefs/v3/pointing/director/timeline_v4.json); default the v3 clock
TLP = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--tl=")), os.path.join(HERE, "timeline_v3.json"))
TL = json.load(open(TLP, encoding="utf-8"))
pos = [a for a in sys.argv[1:] if not a.startswith("--")]
src, out = pos[0], pos[1]; tw = int(pos[2]) if len(pos) > 2 else 230; th = tw * 16 // 9
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", "scale=%d:%d" % (tw, th), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
A = np.frombuffer(raw, np.uint8).reshape(-1, th, tw, 3)
picks = []
for s in TL["shots"]:
    n = s["to"] - s["from"]
    for q in (0.3, 0.75):
        picks.append((s, min(s["to"] - 1, s["from"] + int(round(n * q)))))
cols, lab = 10, 44
rows = (len(picks) + cols - 1) // cols
im = Image.new("RGB", (cols * (tw + 4) + 4, 40 + rows * (th + lab + 4)), (20, 20, 24)); d = ImageDraw.Draw(im)
fb = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 15); fs = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 11)
d.text((6, 8), "POINTING storyboard from the full preview %s  (%d f = %.2f s, real voice)" % (os.path.basename(src), TL["total"], TL["total"] / 30), fill=(255, 255, 255), font=fb)
for k, (s, f) in enumerate(picks):
    if f >= len(A): continue
    x = 4 + (k % cols) * (tw + 4); y = 40 + (k // cols) * (th + lab + 4)
    im.paste(Image.fromarray(A[f]), (x, y))
    d.text((x + 2, y + th + 2), "%s  %.2f s  f%d" % (s["id"], f / 30, f), fill=(255, 210, 80), font=fb)
    d.text((x + 2, y + th + 21), (s.get("line") or s.get("words") or "")[:44], fill=(200, 200, 205), font=fs)
im.save(out, quality=86); print("sheet", out, len(picks), "frames of", len(A))
