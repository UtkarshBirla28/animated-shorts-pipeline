"""Numbered storyboard / contact sheet: each frame with its shot id, beat and line underneath (v3 storyboard + gate sheets).

Usage: PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/sheet_v3.py <items.json> <out.jpg> [cols=6] [cell_w=270]
  items.json = [{"img": "<path>", "title": "s01  Hook  2.3 s", "text": "Schools mailed kids an award...", "status": "PASS|WARN|FAIL|"}]
A missing image becomes a grey "not rendered" cell (so a partial render still gives a sheet). Font: studio/public/fonts/Montserrat.ttf.
"""
import json
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "studio" / "public" / "fonts" / "Montserrat.ttf"
COL = {"PASS": (60, 170, 90), "WARN": (230, 170, 40), "FAIL": (220, 60, 50)}


def font(sz):
    try:
        return ImageFont.truetype(str(FONT), sz)
    except Exception:
        return ImageFont.load_default()


def make(items, out, cols=6, cw=270):
    ch = int(cw * 16 / 9)
    th = 92
    rows = (len(items) + cols - 1) // cols
    W, H = cols * cw + (cols + 1) * 8, rows * (ch + th) + (rows + 1) * 8
    S = Image.new("RGB", (W, H), (24, 24, 28))
    d = ImageDraw.Draw(S)
    f1, f2 = font(17), font(13)
    for k, it in enumerate(items):
        x = 8 + (k % cols) * (cw + 8)
        y = 8 + (k // cols) * (ch + th + 8)
        p = Path(it.get("img", ""))
        if p.exists():
            im = Image.open(p).convert("RGB")
            im = im.resize((cw, ch), Image.LANCZOS)
            S.paste(im, (x, y))
        else:
            d.rectangle([x, y, x + cw, y + ch], fill=(70, 70, 76))
            d.text((x + 10, y + ch // 2 - 10), "not rendered", font=f1, fill=(200, 200, 200))
        st = it.get("status", "")
        if st in COL:
            d.rectangle([x, y, x + cw, y + 6], fill=COL[st])
        d.rectangle([x, y + ch, x + cw, y + ch + th], fill=(36, 36, 42))
        d.text((x + 6, y + ch + 4), f"{k + 1}. {it.get('title', '')}"[:40], font=f1, fill=(255, 220, 120))
        for j, ln in enumerate(textwrap.wrap(it.get("text", ""), 38)[:4]):
            d.text((x + 6, y + ch + 26 + j * 16), ln, font=f2, fill=(225, 225, 225))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    S.save(out, quality=88)
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    items = json.loads(Path(a[0]).read_text(encoding="utf-8"))
    print(make(items, a[1], int(a[2]) if len(a) > 2 else 6, int(a[3]) if len(a) > 3 else 270))
