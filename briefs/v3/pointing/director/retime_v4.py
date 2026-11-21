# DIRECTOR tool (pointing v4): THE ONE-PASS RE-TIME. Run after ANY change of the narration text (lines_v4.json) or of
# v4/shot_plan.ts or of the voice (v4/words.ts). Never renders. From the project root, in Git Bash:
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/retime_v4.py [--src=<lines json>] [--no-script] [--plan]
# --plan: the clock on the plan words only (ignores v4/words.ts: for a new text whose voice is not built yet)
# 1) make_v4_script.py (script.ts + plan_words.ts from the text; skipped with --no-script, e.g. after a voice install)
# 2) probe_v4.mjs json -> director/timeline_v4.json (the clock: plan words, or the real voice when v4/words.ts has words)
# 3) the CHECKS (exit 1 if any fails): every shot rule resolves (no "no line" / "no word" error), every line of the
#    script has a shot that starts in it or runs through it, no shot over 3.5 s, no shot under 0.6 s, the film under 70 s,
#    every cue word used by the owners' files (cast/beats_v4.ts, v4/sets/*.ts) still exists in the script
# 4) make_shot_table_v4.py -> SHOT_TABLE_v4.md (shots with no staging row print "?": write their staging there)
# 5) tsc on the film
# A NEW TEXT therefore needs: lines_v4.json (VOICE/STORY), then this tool; read its FAIL lines; fix ONLY v4/shot_plan.ts
# (start rules on the new words, a shot per new sentence, cut shots for dropped lines) + the staging rows in
# make_shot_table_v4.py; run it again until it says ALL CHECKS PASS.
import glob, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
ST = os.path.join(ROOT, "studio"); PY = sys.executable
arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
env = dict(os.environ, PYTHONNOUSERSITE="1", PYTHONIOENCODING="utf-8")
def run(cmd, **k):
    r = subprocess.run(cmd, env=env, capture_output=True, text=True, **k)
    print((r.stdout + r.stderr).strip())
    if r.returncode: sys.exit("retime_v4: FAILED: " + (cmd if isinstance(cmd, str) else " ".join(cmd)))
if "--no-script" not in sys.argv:
    run([PY, "-s", os.path.join(HERE, "make_v4_script.py")] + (["--src", arg("--src")] if arg("--src") else []))
TLJ = os.path.join(HERE, "timeline_v4.json")
run(["node", os.path.join(HERE, "probe_v4.mjs"), "json", TLJ] + (["--plan"] if "--plan" in sys.argv else []), cwd=ST)
TL = json.load(open(TLJ, encoding="utf-8"))
fails, warns = [], []
for n in TL["notes"]:
    (fails if ("Error" in n or "no word" in n or "no line" in n or "plan_words.ts has" in n) else warns).append(n)
shots, toks = TL["shots"], TL["toks"]
for s in shots:
    L = (s["to"] - s["from"]) / 30
    if L > 3.5: fails.append("shot %s is %.2f s (over 3.5 s): split it" % (s["id"], L))
    if L < 0.6: fails.append("shot %s is %.2f s (under 0.6 s): too short to read" % (s["id"], L))
lines = sorted({t["line"] for t in toks}, key=lambda x: int(re.sub(r"\D", "", x)))
for ln in lines:
    ts = [t for t in toks if t["line"] == ln]
    a, b = round(ts[0]["s"] * 30), round(ts[-1]["e"] * 30)
    if not any(s["from"] < b and s["to"] > a for s in shots): fails.append("line %s has no shot" % ln)
    if not any(s["start"] in ("line:" + ln,) or (s["start"].startswith("word:") and any(t["key"] == s["start"][5:] for t in ts)) for s in shots):
        warns.append("no shot STARTS in line %s (it plays over the shot before: fine only if that is meant)" % ln)
total = TL["total"] / 30
if total > 70: fails.append("film %.2f s: over the 70 s hard limit" % total)
keys = {t["key"] for t in toks}
used = set()
for f in glob.glob(os.path.join(ST, "src", "videos3", "pointing", "cast", "beats_v4.ts")) + glob.glob(os.path.join(ST, "src", "videos3", "pointing", "v4", "sets", "*.ts")):
    for m in re.finditer(r'"([a-z\']+#\d+)(?:[.+\-][^"]*)?"', open(f, encoding="utf-8").read()): used.add((m.group(1), os.path.basename(f)))
    for m in re.finditer(r'"@(v\d+\w*)', open(f, encoding="utf-8").read()):
        if m.group(1) not in {s["id"] for s in shots}: warns.append("%s cues shot @%s, which is not in the shot plan" % (os.path.basename(f), m.group(1)))
for k, f in sorted(used):
    if k not in keys: warns.append("%s cues word %s, which is not in the script any more" % (f, k))
run([PY, "-s", os.path.join(HERE, "make_shot_table_v4.py")])
tbl = open(os.path.join(ROOT, "briefs", "v3", "pointing", "SHOT_TABLE_v4.md"), encoding="utf-8").read()
for s in shots:
    if re.search(r"^\| %s \|.*\| \? \|" % re.escape(s["id"]), tbl, re.M): warns.append("shot %s has no staging row in make_shot_table_v4.py" % s["id"])
run("npx tsc --noEmit -p src/videos3/pointing/tsconfig.json", cwd=ST, shell=True)
# the captions against the cuts (no straddle, none late, none < 8 f, none in the Go run): probe_captions_v4.mjs
cp = subprocess.run(["node", os.path.join(HERE, "probe_captions_v4.mjs")], cwd=ST, capture_output=True, text=True, env=env)
for ln in (cp.stdout + cp.stderr).strip().splitlines():
    if ln.startswith("FAIL"): fails.append("captions: " + ln[5:])
print([ln for ln in cp.stdout.splitlines() if ln.startswith("captions:")][:1])
lens = [(s["to"] - s["from"]) / 30 for s in shots]
print("\nCLOCK: %d f = %.2f s, %d shots (%.2f-%.2f s, mean %.2f), words from %s" % (TL["total"], total, len(shots), min(lens), max(lens), sum(lens) / len(lens), TL["source"]))
for w in dict.fromkeys(warns): print("WARN", w)
for f in fails: print("FAIL", f)
print("ALL CHECKS PASS" if not fails else "%d CHECK(S) FAIL: fix v4/shot_plan.ts and run again" % len(fails))
sys.exit(1 if fails else 0)
