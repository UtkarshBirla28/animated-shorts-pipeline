# DIRECTOR tool (pointing v3): measure the two rendered OPENING clips against SCRIPT_v3 section 1 and PLAYBOOK 3.1.
#   tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/audit_opening.py
# Reads studio/out/pointing/opening_v3_A.mp4 / _B.mp4 (real frames), sound/pointing/voice/_v3/opening_words.json (the
# real voice) and briefs/v3/pointing/director/timeline_v3.json (the cuts). Writes
#   studio/out/pointing/audit/opening_A_frames.jpg, opening_B_frames.jpg   (labelled frame sheets to LOOK at)
#   studio/out/pointing/audit/flash_A.jpg                                   (frame 0 alone at phone size, for the 0.25 s flash test)
#   studio/out/pointing/audit/opening_audit.json                            (the numbers)
# Never plays anything: frames are decoded with ffmpeg, the sound is only probed for its length and level.
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = os.path.join(ROOT, "studio", "out", "pointing")
AUD = os.path.join(OUT, "audit"); os.makedirs(AUD, exist_ok=True)
TL = json.load(open(os.path.join(HERE, "timeline_v3.json"), encoding="utf-8"))
OW = os.path.join(ROOT, "sound", "pointing", "voice", "_v3", "opening_words.json")
words = json.load(open(OW, encoding="utf-8"))["words"] if os.path.exists(OW) else [t for t in TL["toks"]]
cut = {s["id"]: s["from"] for s in TL["shots"]}

def frames_of(path, n=None):
    """decode the clip to RGB frames at 270 x 480 (enough for motion numbers) + return (frames, fps, w, h)"""
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames", "-of", "json", path], capture_output=True, text=True)
    st = json.loads(pr.stdout)["streams"][0]
    w, h = 270, 480
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", "scale=%d:%d" % (w, h), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    return arr, st

def grab(path, f, out, width=540):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", "select=eq(n\\,%d),scale=%d:-1" % (f, width), "-frames:v", "1", "-q:v", "2", out], check=True)

def font(sz, bold=True):
    try: return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf", sz)
    except Exception: return ImageFont.load_default()

def sheet(path, frames, labels, out, tw=300, cols=6):
    th = tw * 16 // 9; lab = 40; pad = 6
    rows = (len(frames) + cols - 1) // cols
    im = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (22, 22, 26)); dr = ImageDraw.Draw(im)
    for k, (f, lb) in enumerate(zip(frames, labels)):
        tmp = os.path.join(AUD, "_f.jpg"); grab(path, f, tmp, tw)
        x = pad + (k % cols) * (tw + pad); y = pad + (k // cols) * (th + lab + pad)
        im.paste(Image.open(tmp).convert("RGB").resize((tw, th)), (x, y))
        dr.text((x + 2, y + th + 3), "f%d  %.2f s" % (f, f / 30.0), fill=(255, 214, 80), font=font(15))
        dr.text((x + 2, y + th + 21), lb, fill=(205, 205, 210), font=font(12, False))
    try: os.remove(os.path.join(AUD, "_f.jpg"))
    except OSError: pass
    im.save(out, quality=88); return out

res = {"words_source": os.path.relpath(OW, ROOT) if os.path.exists(OW) else "plan"}
ws = [w for w in words if w.get("line", w.get("id", "")) != "v3_r01"]
res["first_word_s"] = ws[0]["s"]
res["words_started_by_3s"] = sum(1 for w in ws if w["s"] < 3.0)
res["words_started_by_5s"] = sum(1 for w in ws if w["s"] < 5.0)
gaps = [(ws[i + 1]["s"] - ws[i]["e"], ws[i]["w"], ws[i + 1]["w"]) for i in range(len(ws) - 1) if ws[i + 1]["s"] < 5.0]
g = max(gaps); res["longest_gap_0_5s"] = {"s": round(g[0], 3), "between": [g[1], g[2]]}
res["first_sentence_ends_s"] = next(w["e"] for w in ws if w["w"].rstrip().endswith("."))
res["cut1_s"] = cut["s02"] / 30.0; res["cut2_s"] = cut["s03"] / 30.0
res["hookB_punch_s"] = TL["ev"]["punchIn"]
res["cuts_in_first_4s"] = {"A": sum(1 for k in ("s02", "s03", "s04") if cut[k] / 30.0 < 4.0), "B": 1 + sum(1 for k in ("s02", "s03", "s04") if cut[k] / 30.0 < 4.0)}

for name in ("A", "B"):
    p = os.path.join(OUT, "opening_v3_%s.mp4" % name)
    if not os.path.exists(p):
        res[name] = "missing"; continue
    arr, st = frames_of(p)
    n = len(arr)
    d = np.abs(arr[1:].astype(np.int16) - arr[:-1].astype(np.int16)).mean(axis=(1, 2, 3))   # mean abs RGB change per frame
    first3 = d[: min(n - 1, 90)]
    # cuts show as spikes; "still" = a frame pair that changes less than 0.25 levels
    res[name] = {
        "file": os.path.relpath(p, ROOT), "frames": int(n), "size": "%sx%s" % (st["width"], st["height"]), "fps": st["r_frame_rate"],
        "change_f0_to_f1": round(float(d[0]), 3), "min_change_first_3s": round(float(first3.min()), 3), "median_change_first_3s": round(float(np.median(first3)), 3),
        "still_pairs_first_3s": int((first3 < 0.25).sum()),
        "biggest_jumps_first_5s": [[int(i + 1), round(float(d[i]), 1)] for i in np.argsort(-d[:150])[:4]],
    }
    a = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip()
    res[name]["audio"] = a or "NONE (a silent clip is not allowed)"
    vol = subprocess.run(["ffmpeg", "-v", "info", "-i", p, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    res[name]["audio_mean_max_db"] = [l.split(":")[-1].strip() for l in vol.splitlines() if "mean_volume" in l or "max_volume" in l]
    c1, c2, pb = cut["s02"], cut["s03"], int(round(TL["ev"]["punchIn"] * 30))
    fl = [0, 1, 2, 7, 15, 30, 42, pb - 1, pb, pb + 12, c1 - 1, c1, c1 + 10, c1 + 22, c1 + 40, c2 - 1, c2, c2 + 21, cut["s04"] - 8, cut["s04"] + 6, cut["s04"] + 30, cut["s05"] + 30, cut["s05"] + 75]
    lb = ["FRAME 0", "frame 1", "the arm lands", "0.25 s", "0.5 s", "1.0 s", "1.4 s: bag gone", "before 'He'", "'He' (B: punch-in)", "'is not.'", "last frame of s01", "CUT 1", "face held 10 f", "suitcase in frame?", "move done", "last frame of s02", "CUT 2: the glove", "arm straight: lamp", "snap on 'green!'", "s04: the laugh", "'at nothing!'", "s05: the glide", "s05: the foot hook"]
    keep = [(f, l) for f, l in zip(fl, lb) if 0 <= f < n]
    sheet(p, [k[0] for k in keep], [k[1] for k in keep], os.path.join(AUD, "opening_%s_frames.jpg" % name))
    if name == "A":
        grab(p, 0, os.path.join(AUD, "flash_A.jpg"), 540)
json.dump(res, open(os.path.join(AUD, "opening_audit.json"), "w"), indent=1)
print(json.dumps(res, indent=1))

# ---- the lead's strip: A over B at 0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5 s (phone-ish size), one image
STRIP_T = [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5]
tw, th, lab = 200, 356, 22
rows = [n for n in ("A", "B") if os.path.exists(os.path.join(OUT, "opening_v3_%s.mp4" % n))]
if rows:
    im = Image.new("RGB", (len(STRIP_T) * (tw + 4) + 4 + 30, len(rows) * (th + lab + 4) + 4), (22, 22, 26)); dr = ImageDraw.Draw(im)
    for r, n in enumerate(rows):
        p = os.path.join(OUT, "opening_v3_%s.mp4" % n)
        dr.text((6, 4 + r * (th + lab + 4) + th // 2), n, fill=(255, 214, 80), font=font(22))
        for k, t in enumerate(STRIP_T):
            tmp = os.path.join(AUD, "_s.jpg"); grab(p, int(round(t * 30)), tmp, tw)
            x = 30 + 4 + k * (tw + 4); y = 4 + r * (th + lab + 4)
            im.paste(Image.open(tmp).convert("RGB").resize((tw, th)), (x, y))
            dr.text((x + 2, y + th + 3), "%s  %.2f s  f%d" % (n, t, int(round(t * 30))), fill=(230, 230, 235), font=font(13))
    try: os.remove(os.path.join(AUD, "_s.jpg"))
    except OSError: pass
    im.save(os.path.join(AUD, "opening_strip_AB.jpg"), quality=90)
    print("strip: " + os.path.relpath(os.path.join(AUD, "opening_strip_AB.jpg"), ROOT))
