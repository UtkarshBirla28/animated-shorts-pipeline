# DIRECTOR tool (pointing v3): assemble the two OPENING hook exports from the per-shot preview chunks + the sound.
#   tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/assemble_opening.py --audio <voice or mix wav/mp3> [--quality preview]
#       [--shots s01,s02,s03,s04,s05,s06] [--tag "voice only" | "voice + SOUND's 0-12 s mix"]
# Hook A = out/pointing/shots/<q>/s01_*.mp4 ..., hook B = out/pointing_hookB/shots/<q>/s01_*.mp4 + the same s02.. chunks.
# Writes studio/out/pointing/opening_v3_A.mp4 / opening_v3_B.mp4 (video stream copied, AAC audio, cut to the shorter of
# picture and sound: NEVER a silent clip) and copies them to pointing_preview/ under the owner-facing names.
# Never plays anything.
import glob, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = os.path.join(ROOT, "studio", "out", "pointing")
arg = lambda k, d=None: (sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d)
q = arg("--quality", "preview")
shots = arg("--shots", "s01,s02,s03,s03b,s04,s05,s06").split(",")
# --rest <dir>: the hook-independent shots (s03..) come from this folder (default: the main cache out/pointing)
REST = arg("--rest")
HOOK_SHOTS = {"s01", "s02"}
audio = arg("--audio")
if not audio or not os.path.exists(audio):
    sys.exit("assemble_opening: --audio <file> is required (the clips are never silent)")

def newest(d, sid):
    fs = [f for f in glob.glob(os.path.join(d, "shots", q, sid + "_*.mp4")) if ".part." not in f]
    if not fs: sys.exit("assemble_opening: no %s chunk for %s in %s" % (q, sid, d))
    return max(fs, key=os.path.getmtime)

def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip())

def has(d, sid):
    return any(".part." not in f for f in glob.glob(os.path.join(d, "shots", q, sid + "_*.mp4")))

def build(name, first_dir, nice):
    # hook B: every shot that was rendered into the hook-B folder comes from there (s01, s02), the rest from the main cache
    if REST:   # round 2+: s01 / s02 from the hook's own folder, everything else from REST (one render, one code state)
        files = [newest(first_dir if s in HOOK_SHOTS else os.path.join(ROOT, REST), s) for s in shots]
    else:
        files = [newest(first_dir if has(first_dir, s) else OUT, s) for s in shots]
    lst = os.path.join(OUT, "_opening_%s.txt" % name)
    open(lst, "w", encoding="utf-8").write("".join("file '%s'\n" % f.replace("\\", "/") for f in files))
    silent = os.path.join(OUT, "_opening_%s_silent.mp4" % name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    t = min(dur(silent), dur(audio))
    out = os.path.join(OUT, "opening_v3_%s.mp4" % name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                    "-t", "%.3f" % t, "-movflags", "+faststart", out], check=True)
    os.remove(silent); os.remove(lst)
    dst = os.path.join(ROOT, "pointing_preview", nice)
    shutil.copyfile(out, dst)
    print("%s: %d shots, picture %.2f s, sound %.2f s -> %.2f s  %s" % (name, len(files), dur(out), dur(audio), t, os.path.relpath(out, ROOT)))
    print("   copy: " + os.path.relpath(dst, ROOT))
    return out, [os.path.basename(f) for f in files]

a, fa = build("A", OUT, "VIDEO_opening_hook_A (one shot).mp4")
b, fb = build("B", os.path.join(ROOT, "studio", "out", "pointing_hookB"), "VIDEO_opening_hook_B (punch-in).mp4")
json.dump({"audio": os.path.relpath(audio, ROOT), "tag": arg("--tag", ""), "quality": q, "A": fa, "B": fb}, open(os.path.join(OUT, "opening_v3.json"), "w"), indent=1)
