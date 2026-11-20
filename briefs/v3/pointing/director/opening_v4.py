# DIRECTOR tool (pointing v4): THE OPENING (lines 1-3, the hook) rendered, assembled WITH SOUND, audited on real frames,
# and compared with the reference openings and our own. Never plays anything.
#   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/opening_v4.py --audio=<opening mix wav>
#       [--quality=preview|draft|final] [--shots=v01,v02,v03,v04,v05,v06] [--no-render] [--no-copy (a test: nothing to pointing_preview)]
# 1) tsc; 2) the clock (probe_v4.mjs json); 3) kit_render the opening shots (--conc 1, the RAM token is kit_render's);
# 4) concat the newest chunk of each shot, mux the audio cut to the picture (never a silent clip) ->
#    studio/out/pointing_v4/opening_v4.mp4 (+ a copy in pointing_preview/VIDEO_v4_opening.mp4);
# 5) the audit -> studio/out/pointing_v4/opening_audit/: strip_0-8s.jpg (0, .25, .5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8 s),
#    the Go run frame by frame (every Go word +-1 f), opening_audit.json (hook numbers from the clock + measured cuts),
#    gates_v4 on the opening, and compare/ (tools/v3/compare_films.py at 0.5 s steps over the first 8 s vs anti-theft,
#    clown and 3 reference Shorts + the frame-0 sheet).
import glob, json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
ST = os.path.join(ROOT, "studio"); OUT = os.path.join(ST, "out", "pointing_v4"); AUD = os.path.join(OUT, "opening_audit")
PY = os.path.join(ROOT, "tools", ".venv", "Scripts", "python.exe")
arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
Q = arg("--quality", "preview"); SHOTS = arg("--shots", "v01,v02,v03,v04,v05,v06").split(","); AUDIO = arg("--audio")
if not AUDIO or not os.path.exists(AUDIO): sys.exit("opening_v4: --audio=<the opening mix> is required (the clip is never silent)")
os.makedirs(AUD, exist_ok=True)
run = lambda cmd, **k: subprocess.run(cmd, check=True, **k)

if "--no-render" not in sys.argv:
    print("[opening] tsc"); run("npx tsc --noEmit -p src/videos3/pointing/tsconfig.json", cwd=ST, shell=True)
    run(["node", os.path.join(HERE, "probe_v4.mjs"), "json", os.path.join(HERE, "timeline_v4.json")])
    print("[opening] render", Q, ",".join(SHOTS))
    run(["node", "scripts/kit_render.mjs", "--entry", "src/videos3/pointing/v4/index.ts", "--comp", "PointingV4Kit", "--quality", Q,
         "--shots", ",".join(SHOTS), "--conc", "1", "--out", "out/pointing_v4/"], cwd=ST)
TL = json.load(open(os.path.join(HERE, "timeline_v4.json"), encoding="utf-8"))
shots = [s for s in TL["shots"] if s["id"] in SHOTS]

# ---- assemble (the newest chunk of each shot, in order) + the sound
files = []
for s in shots:
    fs = [f for f in glob.glob(os.path.join(OUT, "shots", Q, s["id"] + "_*.mp4")) if ".part" not in f]
    if not fs: sys.exit("opening_v4: no %s chunk for %s" % (Q, s["id"]))
    files.append(max(fs, key=os.path.getmtime))
lst = os.path.join(OUT, "_opening.txt"); open(lst, "w").write("".join("file '%s'\n" % f.replace("\\", "/") for f in files))
silent = os.path.join(OUT, "_opening_silent.mp4")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent])
dur = lambda p: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip())
t = min(dur(silent), dur(AUDIO)); clip = os.path.join(OUT, "opening_v4.mp4")
run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", AUDIO, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-t", "%.3f" % t, "-movflags", "+faststart", clip])
os.remove(silent); os.remove(lst)
if "--no-copy" not in sys.argv: shutil.copyfile(clip, os.path.join(ROOT, "pointing_preview", "VIDEO_v4_opening.mp4"))
print("[opening] %s: %.2f s (picture %d shots, sound %.2f s)" % (os.path.relpath(clip, ROOT), t, len(files), dur(AUDIO)))

# ---- the audit: hook numbers from the clock
toks = [x for x in TL["toks"]]
go = [x for x in toks if x["key"].startswith("go#")]
gaps = []
for a, b in zip(toks, toks[1:]):
    if b["s"] < 10.0: gaps.append((round(b["s"] - a["e"], 3), a["w"], b["w"]))
beat = max(gaps, key=lambda g: g[0]) if gaps else None
over = [g for g in gaps if g[0] > 0.5 and not (g[1].lower().startswith("go"))]
res = {"words_source": TL["source"], "first_word_s": toks[0]["s"], "words_by_3s": sum(1 for x in toks if x["s"] < 3), "words_by_5s": sum(1 for x in toks if x["s"] < 5),
       "go_onsets_s": [x["s"] for x in go], "go_gaps_s": [round(b["s"] - a["s"], 3) for a, b in zip(go, go[1:])],
       "held_beat_after_last_go_s": round(next((b["s"] for a, b in zip(toks, toks[1:]) if a["key"] == "go#7"), 0) - (go[-1]["e"] if go else 0), 3),
       "longest_gap_0_10s": beat, "gaps_over_0.5s_outside_the_beat": over,
       "cuts_s": [round(s["from"] / 30, 2) for s in shots[1:]], "first_picture_change_s": round(shots[1]["from"] / 30, 2) if len(shots) > 1 else None}
# measured cuts on the real frames (motion.py's detector)
import numpy as np
W, H = 108, 192
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", clip, "-vf", f"fps=30,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
d = np.abs(np.diff(a, axis=0)); mad = d.mean(axis=(1, 2))
hs = np.array([np.histogram(f, bins=32, range=(0, 256))[0] for f in a], float); hs /= hs.sum(1, keepdims=True); hd = 0.5 * np.abs(np.diff(hs, axis=0)).sum(1)
res["measured_cuts_s"] = [round((i + 1) / 30, 2) for i in np.where(((mad > 18) & (hd > 0.18)) | (mad > 32))[0]]
res["frame0_to_1_change"] = round(float(mad[0]), 2) if len(mad) else None
json.dump(res, open(os.path.join(AUD, "opening_audit.json"), "w"), indent=1); print(json.dumps(res, indent=1))

# ---- the strips (real frames)
from PIL import Image, ImageDraw, ImageFont
def fnt(sz):
    try: return ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", sz)
    except Exception: return ImageFont.load_default()
def grab(t, w):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.3f" % t, "-i", clip, "-frames:v", "1", "-vf", f"scale={w}:{w * 16 // 9}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    h = w * 16 // 9; return Image.frombytes("RGB", (w, h), r[: w * h * 3]) if len(r) >= w * h * 3 else Image.new("RGB", (w, h))
def strip(times, name, w=200, labels=None):
    im = Image.new("RGB", (len(times) * (w + 4) + 4, w * 16 // 9 + 30), (22, 22, 26)); dr = ImageDraw.Draw(im)
    for k, tt in enumerate(times):
        im.paste(grab(tt, w), (4 + k * (w + 4), 4)); dr.text((6 + k * (w + 4), w * 16 // 9 + 8), (labels[k] if labels else "%.2f s" % tt), fill=(255, 214, 80), font=fnt(13))
    im.save(os.path.join(AUD, name), quality=88)
strip([0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8], "strip_0-8s.jpg")
if go: strip([x["s"] + 0.04 for x in go] + [go[-1]["s"] + 0.35, go[-1]["s"] + 0.7], "go_run.jpg", 160, [x["key"] for x in go] + ["beat", "after"])
# ---- gates_v4 on the opening + the comparison with the reference openings and ours
sj = os.path.join(AUD, "shots_opening.json")
json.dump([{"id": s["id"], "from": s["from"], "to": min(s["to"], int(t * 30)), "closeUp": s.get("closeUp", False)} for s in shots], open(sj, "w"))
env = dict(os.environ, PYTHONNOUSERSITE="1", PYTHONIOENCODING="utf-8")
subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "v3", "gates_v4.py"), clip, "--shots=" + sj, "--out=" + AUD], env=env)
subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "v3", "compare_films.py"), clip, "--out=" + os.path.join(AUD, "compare"), "--step=0.5", "--max=8", "--label=OPENING v4"], env=env)
print("[opening] audit in", os.path.relpath(AUD, ROOT))
