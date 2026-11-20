# COMPARE FILMS (DIRECTOR, pointing v4, 2026-11-20): the owner's order "when you render, check other people's videos and
# the videos we have made before". One command: our preview next to our best films and the reference channel, at
# matched times (every 2.5 s), plus one table of motion and colour numbers. Never plays sound or video.
#   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/compare_films.py <our.mp4> [--out=<dir>] [--step=2.5]
#       [--refs=<n of reference Shorts, default 3>] [--label=<name of ours>]
# Writes <out>/compare_sheet_<k>.jpg (rows = times, columns = ours | anti-theft | clown | reference 1..n),
# <out>/compare_table.md + compare.json (per film: length, cuts, average shot, moving area, hold %, whole-frame %,
# one-thing %, chroma, shadow chroma, L*, saturation), and <out>/compare_frame0.jpg (frame 0 of every film).
# Motion numbers = the benchmark's motion.py (108x192 grey, top 58 %, > 14 levels, 24 cells).
import glob, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
OURS = sys.argv[1]
OUT = arg("--out", os.path.join(os.path.dirname(os.path.abspath(OURS)), "compare"))
STEP = float(arg("--step", "2.5")); NREF = int(arg("--refs", "3"))
MAX = float(arg("--max", "0"))          # > 0: only the first MAX seconds of every film (the opening comparison)
LIM = ["-t", "%.2f" % MAX] if MAX > 0 else []
os.makedirs(OUT, exist_ok=True)
REFDIR = "C:/Users/utkar/Desktop/yt short videos"
# the reference Shorts in the benchmark order of preference (the channel's new look first), then anything else there
PREF = ["Why Perfect Railroads Don't Work", "The Ancient Jar That Warned an Empire", "The Job Nobody Wants in Japan", "How One Cart Stopped an Entire Army", "Why Sailors Carried Storm Oil"]
refs = []
for name in PREF:
    hit = glob.glob(os.path.join(REFDIR, name + "*.mp4")) + glob.glob(os.path.join(REFDIR, "new_2026-11-19", name + "*.mp4"))
    hit = [h for h in hit if ".part" not in h]
    if hit: refs.append(("REF " + name[:28], hit[0]))
FILMS = [(arg("--label", "OURS"), OURS),
         ("anti-theft (our best)", os.path.join(ROOT, "studio/out/antitheft/antitheft_FINAL_1080x1920.mp4")),
         ("clown (sound yardstick)", os.path.join(ROOT, "studio/out/clown/upload/clown_FINAL_1080x1920.mp4"))] + refs[:NREF]
FILMS = [(n, p) for n, p in FILMS if os.path.exists(p)]

def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)

def motion(p):
    W, H = 108, 192
    raw = subprocess.run(["ffmpeg", "-v", "error", *LIM, "-i", p, "-vf", f"fps=30,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16); top = int(H * 0.58)
    d = np.abs(np.diff(a, axis=0)); pic = d[:, :top, :] > 14; area = pic.mean(axis=(1, 2)); mad = d.mean(axis=(1, 2))
    cells = np.zeros(len(d)); ch, cw = top // 6, W // 4
    for i in range(6):
        for j in range(4): cells += pic[:, i * ch:(i + 1) * ch, j * cw:(j + 1) * cw].mean(axis=(1, 2)) > 0.04
    hs = np.array([np.histogram(f, bins=32, range=(0, 256))[0] for f in a], float); hs /= hs.sum(1, keepdims=True)
    hd = 0.5 * np.abs(np.diff(hs, axis=0)).sum(1)
    cl = []
    for c in np.where(((mad > 18) & (hd > 0.18)) | (mad > 32))[0]:
        if not cl or c - cl[-1] > 4: cl.append(int(c))
    keep = np.ones(len(d), bool)
    for c in cl: keep[max(0, c - 1):c + 2] = False
    ap, ce = area[keep], cells[keep]
    return {"frames": int(len(a)), "cuts": len(cl), "avg_shot_s": round(len(a) / 30 / (len(cl) + 1), 2),
            "moving_area_pct": round(float(ap.mean()) * 100, 1), "hold_pct": round(float((ap < 0.01).mean()) * 100, 1),
            "whole_frame_pct": round(float((ce >= 12).mean()) * 100, 1), "one_thing_pct": round(float(((ap >= 0.01) & (ce <= 3)).mean()) * 100, 1)}

def srgb2lab(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def colour(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", *LIM, "-i", p, "-vf", "fps=2,scale=90:160", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 160, 90, 3)[:, :int(160 * 0.62)].astype(np.float64)
    lab = srgb2lab(a.reshape(-1, 3)); L, C = lab[:, 0], np.hypot(lab[:, 1], lab[:, 2])
    mx, mn = a.reshape(-1, 3).max(1), a.reshape(-1, 3).min(1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    sh = L < np.percentile(L, 25)
    return {"L_mean": round(float(L.mean()), 1), "chroma_mean": round(float(C.mean()), 1), "shadow_chroma": round(float(C[sh].mean()), 1), "saturation_pct": round(float(sat.mean()) * 100, 1)}

def frame_at(p, t, w):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", p, "-frames:v", "1", "-vf", f"scale={w}:{w * 16 // 9}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    h = w * 16 // 9
    return Image.frombytes("RGB", (w, h), r[: w * h * 3]) if len(r) >= w * h * 3 else Image.new("RGB", (w, h), (40, 40, 44))

def font(sz, bold=True):
    try: return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", sz)
    except Exception: return ImageFont.load_default()

# ---- the numbers
stats = {}
for n, p in FILMS:
    stats[n] = {"file": p.replace(ROOT, "").lstrip("\\/"), "length_s": round(min(dur(p), MAX) if MAX > 0 else dur(p), 2), **motion(p), **colour(p)}
    print(n, {k: v for k, v in stats[n].items() if k != "file"}, flush=True)
json.dump(stats, open(os.path.join(OUT, "compare.json"), "w", encoding="utf-8"), indent=1)
cols = ["length_s", "cuts", "avg_shot_s", "moving_area_pct", "hold_pct", "whole_frame_pct", "one_thing_pct", "L_mean", "chroma_mean", "shadow_chroma", "saturation_pct"]
md = ["# Comparison: " + os.path.basename(OURS), "", "Targets for v4 (benchmark): hold 8-20 %, whole-frame motion < 60 %, average shot ~2-2.5 s, vivid colour (chroma near the references).", "",
      "| film | " + " | ".join(cols) + " |", "|---|" + "---|" * len(cols)]
md += ["| " + n + " | " + " | ".join(str(stats[n][c]) for c in cols) + " |" for n, _ in FILMS]
md += ["", "Sheets: compare_sheet_*.jpg (rows every %.1f s; columns as in this table), compare_frame0.jpg." % STEP]
open(os.path.join(OUT, "compare_table.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("\n".join(md))

# ---- the sheets: rows = times on OUR clock; each film at the same time (or its last frame if shorter)
TW, LAB = 170, 40; TH = TW * 16 // 9
times = [round(k * STEP, 2) for k in range(int(stats[FILMS[0][0]]["length_s"] // STEP) + 1)]
per = 8
for k in range(0, len(times), per):
    ts = times[k:k + per]
    im = Image.new("RGB", (60 + len(FILMS) * (TW + 6), LAB + len(ts) * (TH + 6)), (22, 22, 26)); d = ImageDraw.Draw(im)
    for j, (n, p) in enumerate(FILMS): d.text((60 + j * (TW + 6), 6), n[:24], fill=(255, 214, 80) if j == 0 else (220, 220, 225), font=font(13))
    for i, t in enumerate(ts):
        y = LAB + i * (TH + 6); d.text((6, y + TH // 2 - 8), f"{t:.1f}s", fill=(255, 255, 255), font=font(15))
        for j, (n, p) in enumerate(FILMS):
            tt = min(t, max(0, stats[n]["length_s"] - 0.1)); im.paste(frame_at(p, tt, TW), (60 + j * (TW + 6), y))
    out = os.path.join(OUT, f"compare_sheet_{k // per + 1}.jpg"); im.save(out, quality=86); print("sheet", out)
f0 = Image.new("RGB", (len(FILMS) * (TW * 2 + 6), TH * 2 + LAB), (22, 22, 26)); d = ImageDraw.Draw(f0)
for j, (n, p) in enumerate(FILMS):
    f0.paste(frame_at(p, 0, TW * 2), (j * (TW * 2 + 6), LAB)); d.text((j * (TW * 2 + 6) + 4, 8), n[:30], fill=(255, 214, 80) if j == 0 else (220, 220, 225), font=font(15))
f0.save(os.path.join(OUT, "compare_frame0.jpg"), quality=86); print("frame 0 sheet", os.path.join(OUT, "compare_frame0.jpg"))
