# DIRECTOR tool (pointing v4): THE FULL PREVIEW in one command: render every shot (cached, resumable), mux the film mix,
# then every audit. Never plays anything. From the project root, in Git Bash:
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/film_v4.py
#       [--audio=<film mix wav, default sound/pointing/audio/mix_v4.wav>] [--quality=preview|draft|final]
#       [--no-render (only mux + audits from the chunks already there)] [--clip=<a finished film mp4>: only the audits]
#       [--cast=<CAST's per-frame log json; default: extracted from this render's own logs>]
#       [--words=<voice words.json, default sound/pointing/voice_v4/words.json>] [--no-copy]
#       [--shots=v01,v02 (limit the render)] [--batch-frames=240 (frames per kit_render call; 1 = one shot per call)]
#       [--gap=70 (seconds between calls, so other owners can take the RAM token)] [--fresh-logs (archive older console logs first)]
# 16 GB laptop (2026-11-20): the render runs SHOT BY SHOT in short kit_render calls, never one long --shots all run.
# If some shots have no current chunk, a PARTIAL film is built (black frames for those shots, same length) ->
# pointing_v4_<q>_PARTIAL_mix.mp4, so the audits still run on what renders; the black shots fail their gates (expected).
# The render passes --props '{"castlog":1}' --keep-browser-logs; its console goes to studio/out/pointing_v4/render_logs/,
# castlog_extract.py turns it into studio/out/pointing_v4/castlog_v4_<quality>.json, which gates_v4 reads.
# 1) tsc + the clock (probe_v4.mjs json); 2) kit_render --shots all --conc 1 (finished shot chunks in
#    studio/out/pointing_v4/shots/<quality>/ are REUSED: a killed run is simply started again);
# 3) mux -> studio/out/pointing_v4/pointing_v4_<quality>_mix.mp4 (+ pointing_preview/VIDEO_v4_full_<quality>.mp4);
# 4) audits -> studio/out/pointing_v4/film_audit/: gates_v4/, qa_gates/ (needs --words), compare/ (vs anti-theft,
#    clown, 3 reference Shorts), storyboard.jpg (2 frames per shot).
import glob, json, os, re, shutil, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
ST = os.path.join(ROOT, "studio"); OUT = os.path.join(ST, "out", "pointing_v4"); AUD = os.path.join(OUT, "film_audit")
PY = sys.executable
LOGS = os.path.join(OUT, "render_logs"); os.makedirs(LOGS, exist_ok=True)
CASTX = os.path.join(ST, "src", "videos3", "pointing", "cast", "bench", "castlog_extract.py")
arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
CASTLOG = arg("--cast")
Q = arg("--quality", "preview"); CLIP = arg("--clip"); TAG = Q; MISSING = []; T0 = time.time()
AUDIO = arg("--audio", os.path.join(ROOT, "sound", "pointing", "audio", "mix_v4.wav"))
if not CLIP and not os.path.exists(AUDIO): sys.exit("film_v4: the film mix %s is missing: pass --audio=<mix wav> (the film is never silent)" % AUDIO)
os.makedirs(AUD, exist_ok=True)
env = dict(os.environ, PYTHONNOUSERSITE="1", PYTHONIOENCODING="utf-8", RAM_ME=os.environ.get("RAM_ME", "director"))
run = lambda cmd, **k: subprocess.run(cmd, check=True, env=env, **k)
TLJ = os.path.join(HERE, "timeline_v4.json")
if not CLIP:
    print("[film] tsc + clock"); run("npx tsc --noEmit -p src/videos3/pointing/tsconfig.json", cwd=ST, shell=True)
    run(["node", os.path.join(HERE, "probe_v4.mjs"), "json", TLJ], cwd=ST)
    if "--fresh-logs" in sys.argv:   # a clean pass: older console logs of this quality go to render_logs/old_<time>/
        old = [p for p in glob.glob(os.path.join(LOGS, "render_%s_*" % Q))]
        if old:
            arch = os.path.join(LOGS, "old_" + time.strftime("%Y%m%d_%H%M%S")); os.makedirs(arch, exist_ok=True)
            for p in old: shutil.move(p, arch)
            print("[film] --fresh-logs: %d old logs -> %s" % (len(old), os.path.relpath(arch, ROOT)))
    if "--no-render" not in sys.argv:
        # SHOT BY SHOT (16 GB laptop, several owners share the RAM token): one kit_render call per group of consecutive
        # shots of at most --batch-frames frames (default 240 = 8 s; 1 = one shot per call); kit_render holds the token
        # only for its own call, and after every call that rendered something we wait --gap seconds (default 70 >
        # ram_take's 60 s poll) so a waiting owner can take the token. --shots=v01,v02 limits the pass. Each call writes
        # its own console log (the cast log merge below takes the newest row per frame).
        TLS = json.load(open(TLJ, encoding="utf-8"))["shots"]
        only = arg("--shots"); only = set(only.split(",")) if only else None
        BF = int(arg("--batch-frames", "240")); GAP = float(arg("--gap", "70"))
        groups, cur = [], []
        for s in TLS:
            if only and s["id"] not in only: continue
            if cur and (BF <= 1 or sum(x["to"] - x["from"] for x in cur) + s["to"] - s["from"] > BF): groups.append(cur); cur = []
            cur.append(s)
        if cur: groups.append(cur)
        print("[film] render", Q, "%d shots in %d calls (--batch-frames=%d, --conc 1, finished chunks are reused)" % (sum(map(len, groups)), len(groups), BF))
        failed = []
        for k, grp in enumerate(groups):
            ids = ",".join(s["id"] for s in grp)
            rlog = os.path.join(LOGS, "render_%s_%s_%02d.log" % (Q, time.strftime("%Y%m%d_%H%M%S"), k))
            print("[film] call %d/%d: %s" % (k + 1, len(groups), ids), flush=True)
            rendered = False
            with open(rlog, "w", encoding="utf-8", errors="replace") as fh:
                # CAST's per-frame log from the SAME render: --props castlog + --keep-browser-logs
                p = subprocess.Popen(["node", "scripts/kit_render.mjs", "--entry", "src/videos3/pointing/v4/index.ts", "--comp", "PointingV4Kit", "--quality", Q,
                                      "--shots", ids, "--conc", "1", "--props", '{"castlog":1}', "--keep-browser-logs", "--out", "out/pointing_v4/"],
                                     cwd=ST, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
                for ln in p.stdout:
                    fh.write(ln)
                    if " s/frame wall" in ln: rendered = True
                    m = re.search(r"not concatenating: \d+ shot\(s\) not rendered at \w+ yet \(([^)]*)\)", ln)
                    if m: MISSING[:] = [x.strip() for x in m.group(1).split(",") if x.strip()]
                    elif "film -> " in ln: MISSING[:] = []
                    if "CASTLOG" not in ln and "[page]" not in ln: print(ln, end="", flush=True)
                if p.wait(): failed.append(ids); print("[film] kit_render FAILED for %s (see %s)" % (ids, rlog))
            if rendered and k + 1 < len(groups) and GAP > 0: print("[film] gap %.0f s (the token is free for other owners)" % GAP, flush=True); time.sleep(GAP)
        if failed: print("[film] FAILED calls: %s" % "; ".join(failed))
        print("[film] shots without a current %s chunk: %s" % (Q, ", ".join(MISSING) or "none"))
    # the cast log: castlog_extract.py on every render log of this quality; a frame comes from the NEWEST log that has it
    # (a re-rendered shot replaces its old rows; a cached shot keeps the rows of the run that rendered it)
    logs = sorted(glob.glob(os.path.join(LOGS, "render_%s_*.log" % Q)), reverse=True)
    if logs and not arg("--cast"):
        merged, have = [], set()
        for lg in logs:
            tmp = lg[:-4] + "_cast.json"
            subprocess.run([PY, "-s", CASTX, lg, tmp], env=env, check=True)
            rows = json.load(open(tmp, encoding="utf-8")); fr = {r["f"] for r in rows} - have
            merged += [r for r in rows if r["f"] in fr]; have |= fr
        CASTLOG = os.path.join(OUT, "castlog_v4_%s.json" % Q)
        json.dump(sorted(merged, key=lambda r: (r["f"], r["who"])), open(CASTLOG, "w", encoding="utf-8"))
        print("[film] cast log %s: %d rows, %d frames logged of the film" % (os.path.relpath(CASTLOG, ROOT), len(merged), len(have)))
    silent = os.path.join(OUT, "pointing_v4_%s.mp4" % Q)
    if MISSING or not os.path.exists(silent):
        # a PARTIAL film for the bug hunt: the newest chunk of every shot that has a current one (or one rendered by this
        # run), BLACK frames (same length) for the shots that have neither, so the clock, the mix and the gates still line up. Never shown to the owner.
        TLS = json.load(open(TLJ, encoding="utf-8"))["shots"]
        have = {s["id"]: max([f for f in glob.glob(os.path.join(OUT, "shots", Q, s["id"] + "_*.mp4")) if ".part" not in f], key=os.path.getmtime, default=None) for s in TLS}
        STALE = [s["id"] for s in TLS if s["id"] in MISSING and have[s["id"]] and os.path.getmtime(have[s["id"]]) >= T0]
        for s in TLS:   # no current chunk: keep the one THIS run rendered (an owner edited the set after it), else black
            if s["id"] in MISSING and s["id"] not in STALE: have[s["id"]] = None
        if STALE: print("[film] rendered in this run but out of date since (an owner changed the code after): %s" % ", ".join(STALE))
        ref = next((f for f in have.values() if f), None)
        if not ref: sys.exit("film_v4: no %s shot chunk exists yet" % Q)
        wh = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", ref], capture_output=True, text=True).stdout.strip().split(",")
        tmpd = os.path.join(OUT, "_partial"); os.makedirs(tmpd, exist_ok=True); lst = os.path.join(tmpd, "list.txt"); rows = []
        for s in TLS:
            f = have[s["id"]]
            if not f:
                f = os.path.join(tmpd, "black_%s.mp4" % s["id"])
                run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=%sx%s:r=30" % (wh[0], wh[1]), "-frames:v", str(s["to"] - s["from"]), "-c:v", "libx264", "-pix_fmt", "yuv420p", f])
            rows.append("file '%s'\n" % f.replace("\\", "/"))
        open(lst, "w").write("".join(rows))
        silent = os.path.join(OUT, "pointing_v4_%s_PARTIAL.mp4" % Q)
        run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-r", "30", "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p", silent])
        shutil.rmtree(tmpd, ignore_errors=True)
        print("[film] PARTIAL film (black for: %s) -> %s" % (", ".join(s["id"] for s in TLS if not have[s["id"]]) or "none", os.path.relpath(silent, ROOT)))
        TAG = Q + "_PARTIAL"
    clip = os.path.join(OUT, "pointing_v4_%s_mix.mp4" % TAG)
    run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", AUDIO, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", "apad", "-shortest", "-c:a", "aac", "-b:a", "384k", "-movflags", "+faststart", clip])   # apad: a mix shorter than the picture (the loop tail before SOUND re-mixes) is padded with silence
    if "--no-copy" not in sys.argv: shutil.copyfile(clip, os.path.join(ROOT, "pointing_preview", "VIDEO_v4_full_%s.mp4" % TAG))
    print("[film] muxed", os.path.relpath(clip, ROOT))
else:
    clip = os.path.abspath(CLIP)
print("[film] audits ->", os.path.relpath(AUD, ROOT))
CAMJ = os.path.join(AUD, "cams_v4.json")
subprocess.run(["node", os.path.join(HERE, "probe_cams_v4.mjs"), "json", CAMJ], cwd=ST, env=env)
CAPJ = os.path.join(AUD, "caption_boxes.json")
subprocess.run(["node", os.path.join(HERE, "probe_captions_v4.mjs"), "--json=" + CAPJ], cwd=ST, env=env)
g = [PY, "-s", os.path.join(ROOT, "tools", "v3", "gates_v4.py"), clip, "--shots=" + TLJ, "--out=" + os.path.join(AUD, "gates_v4")] + (["--cams=" + CAMJ] if os.path.exists(CAMJ) else []) + (["--caps=" + CAPJ] if os.path.exists(CAPJ) else [])
CASTLOG = arg("--cast") or CASTLOG
if not CASTLOG and os.path.exists(os.path.join(OUT, "castlog_v4_%s.json" % Q)): CASTLOG = os.path.join(OUT, "castlog_v4_%s.json" % Q)
if CASTLOG: g.append("--cast=" + CASTLOG)
else: print("[film] no cast log: the four card gates say NO DATA")
subprocess.run(g, env=env)
WORDS = arg("--words", os.path.join(ROOT, "sound", "pointing", "voice_v4", "words.json"))
if os.path.exists(WORDS):
    subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "v3", "qa_gates.py"), clip, "--shots=" + TLJ, "--words=" + WORDS, "--out=" + os.path.join(AUD, "qa_gates"), "--v4"], env=env)
else: print("[film] qa_gates skipped (no voice words.json: pass --words=)")
subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "v3", "compare_films.py"), clip, "--out=" + os.path.join(AUD, "compare"), "--label=pointing v4"], env=env)
subprocess.run([PY, "-s", os.path.join(HERE, "sheet_from_video.py"), clip, os.path.join(AUD, "storyboard.jpg"), "--tl=" + TLJ], env=env)
print("[film] done:", os.path.relpath(clip, ROOT), "+", os.path.relpath(AUD, ROOT))
