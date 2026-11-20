# DIRECTOR tool (pointing, script v3): the PLANNED word timeline of the locked script, for the time before the real
# voice (studio/src/videos3/pointing/words.ts, written by VOICE alone) lands.
#   python briefs/v3/pointing/director/make_plan.py [--opening sound/pointing/voice/_v3/opening_words.json]
# writes  studio/src/videos3/pointing/plan_words.ts   (PLAN_WORDS: what timeline.ts uses while WORDS is empty)
#         briefs/v3/pointing/director/plan_words.json  ([{w, s, e}]: feed it to cast/voice_sync.py so the cast acts the plan)
# Times: sound/pointing/script_v3/voice_lines_v3.json (planned_start_s / planned_end_s per line), the hook's word times
# from SCRIPT_v3.md section 1.2, the reused takes' own rhythm from the v1 track (sound/pointing/voice/_full/words.json).
# --opening: REAL word times of the opening (VOICE's first delivery): those words replace the plan, and every later
# planned line is shifted by the difference at the join (the pause plan after the join is kept).
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
LINES = json.load(open(os.path.join(ROOT, "sound/pointing/script_v3/voice_lines_v3.json"), encoding="utf-8"))
OUT_TS = os.path.join(ROOT, "studio/src/videos3/pointing/plan_words.ts")
OUT_JSON = os.path.join(HERE, "plan_words.json")

# explicit word times: the script's own hook table (absolute) + the measured rhythm of the reused takes (line-relative)
ABS = {
    "v3_n01": [("His", 0.07, 0.30), ("bag", 0.33, 0.60), ("is", 0.62, 0.82), ("on", 0.84, 1.08), ("that", 1.10, 1.36), ("train.", 1.38, 1.72)],
    "v3_n02": [("He", 1.87, 2.10), ("is", 2.12, 2.40), ("not.", 2.42, 2.97)],
    "v3_n03": [("All", 3.12, 3.35), ("he", 3.37, 3.56), ("did", 3.58, 3.82), ("was", 3.84, 4.08), ("laugh...", 4.10, 4.37), ("at", 4.52, 4.70), ("a", 4.72, 4.90), ("finger.", 4.92, 5.47)],
}
REL = {
    "v3_d01": [("Signal...", 0.0, 0.53), ("green!", 0.91, 1.455)],                       # beat 0.38 s
    "v3_d02": [("Doors...", 0.0, 0.45), ("closed!", 0.895, 1.425)],
    "v3_t03": [("What's", 0.0, 0.40), ("a", 0.40, 0.655), ("finger", 0.76, 1.10), ("gonna", 1.10, 1.41), ("do?", 1.41, 1.67)],
    "v3_r01": [("What's", 0.0, 0.40), ("a", 0.40, 0.655), ("finger", 0.76, 1.10), ("gonna", 1.10, 1.41), ("do?", 1.41, 1.67)],
    "v3_t04": [("Stay.", 0.0, 0.47), ("Be", 0.77, 0.82), ("right", 0.87, 1.23), ("back.", 1.27, 1.555)],
    "v3_t05": [("Vending", 0.0, 0.42), ("machine...", 0.44, 1.02), ("check!", 1.26, 1.86)],  # beat 0.24 s (measured)
    "v3_n12": [("Japan's", 0.0, 0.645), ("railway", 0.645, 1.035), ("lab", 1.035, 1.365), ("tested", 1.365, 1.715), ("it.", 1.715, 2.03)],
    "v3_n14": [("A", 0.0, 0.195), ("finger", 0.195, 0.625), ("and", 0.745, 0.845), ("a", 0.845, 1.005), ("shout", 1.005, 1.51), ("drag", 1.635, 2.025), ("your", 2.025, 2.145), ("mind", 2.145, 2.525), ("back.", 2.565, 2.97)],
    "v3_d03": [("Doors...", 0.0, 0.645), ("closed!", 1.65, 2.225)],
    "v3_k01": [("Bag...", 0.0, 0.52), ("check!", 0.87, 1.305)],
    "v3_t07": [("Bag...", 0.0, 0.62), ("gone.", 1.08, 1.515)],
}
# two lines in pieces, with the script's own times (absolute)
N13 = [(47.40, 50.09, "For every six mistakes people made just looking..."), (51.09, 53.09, "when they pointed and said it out loud:"), (53.39, 54.19, "about one.")]
N11 = [(39.59, 40.07, "You see,"), (40.27, 41.87, "his eyes looked right at it."), (42.07, 43.77, "His mind was on his phone.")]


def syl(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    n = len(re.findall(r"[aeiouy]+", w))
    if re.search(r"[^aeiou]e$", w) and len(w) > 3:
        n -= 1
    return max(1, n)


def spread(text, s, e):
    """the words of `text` over [s, e]: weight 0.10 + 0.13 per syllable, the last word 1.6x (landed), 0.02 s between words"""
    ws = text.split()
    wt = [0.10 + 0.13 * syl(w) for w in ws]
    wt[-1] *= 1.6
    gaps = 0.02 * (len(ws) - 1)
    k = (e - s - gaps) / sum(wt)
    out, t = [], s
    for w, x in zip(ws, wt):
        out.append((w, t, t + x * k))
        t += x * k + 0.02
    return out


def norm(w):
    k = re.sub(r"[^a-z0-9']", "", w.lower())
    return {"1000": "thousand", "1": "one", "6": "six"}.get(k, k)


plan = []   # {w, s, e, who, line, real}
for L in LINES:
    if not L.get("in_film") or L.get("wordless"):
        continue
    lid, who, s0, e0 = L["id"], L["speaker"], L["planned_start_s"], L["planned_end_s"]
    if lid in ABS:
        rows = ABS[lid]
    elif lid in REL:
        rows = [(w, s0 + a, s0 + b) for w, a, b in REL[lid]]
    elif lid == "v3_n13":
        rows = [r for a, b, tx in N13 for r in spread(tx, a, b)]
    elif lid == "v3_n11":
        rows = [r for a, b, tx in N11 for r in spread(tx, a, b)]
    else:
        rows = spread(L["text"].lstrip(".").strip(), s0, e0)
    for w, a, b in rows:
        plan.append({"w": w, "s": round(a, 3), "e": round(b, 3), "who": who, "line": lid, "real": False})

# ---- the opening's REAL words (when VOICE has delivered them)
src = "plan (SCRIPT_v3 planned times)"
if "--opening" in sys.argv:
    p = sys.argv[sys.argv.index("--opening") + 1]
    op = json.load(open(p if os.path.isabs(p) else os.path.join(ROOT, p), encoding="utf-8"))
    if isinstance(op, dict):
        op = op.get("words", op.get("WORDS", []))
    op = [w for w in op if str(w.get("w", "")).strip() and isinstance(w.get("s"), (int, float))]
    seq = [r for r in plan if r["line"] != "v3_r01"]
    j, last, n_hit = 0, -1, 0
    for i, r in enumerate(seq):
        for look in range(j, min(len(op), j + 4)):
            if norm(op[look]["w"]) == norm(r["w"]):
                r["s"], r["e"], r["real"] = round(float(op[look]["s"]), 3), round(float(op[look]["e"]), 3), True
                j, last, n_hit = look + 1, i, n_hit + 1
                break
        if j >= len(op):
            break
    if last >= 0:
        # later lines keep their planned gaps after the join: shift = real end of the last real word - its planned end
        lid_last = seq[last]["line"]
        planned = {L["id"]: L for L in LINES}
        full = [r for r in seq if r["line"] == lid_last]
        if all(r["real"] for r in full):
            d = full[-1]["e"] - planned[lid_last]["planned_end_s"]
        else:
            prev = [r for r in seq[: last + 1] if r["real"] and r["line"] != lid_last]
            d = (prev[-1]["e"] - planned[prev[-1]["line"]]["planned_end_s"]) if prev else 0.0
        for r in plan:
            if not r["real"]:
                r["s"], r["e"] = round(r["s"] + d, 3), round(r["e"] + d, 3)
        src = "REAL opening words (%d of %d words, through %s) + the plan shifted by %+.3f s" % (n_hit, len(op), lid_last, d)

order = {L["id"]: i for i, L in enumerate(LINES)}
plan.sort(key=lambda r: (order[r["line"]], r["s"]))   # script order (the replay's first word sits under "phone.")
end = max(r["e"] for r in plan)
ts = ["// GENERATED by briefs/v3/pointing/director/make_plan.py (DIRECTOR). Do not edit by hand.",
      "// The PLANNED word timeline of script v3: what timeline.ts runs on while words.ts (VOICE) is still empty.",
      "// source: " + src,
      'export type PlanWord = { w: string; s: number; e: number; who: "N" | "D" | "T" | "KID"; line: string; real: boolean };',
      "export const PLAN_SOURCE = " + json.dumps(src) + ";",
      "export const PLAN_WORDS: PlanWord[] = ["]
for r in plan:
    ts.append("  { w: %s, s: %.3f, e: %.3f, who: %s, line: %s, real: %s }," % (json.dumps(r["w"]), r["s"], r["e"], json.dumps(r["who"]), json.dumps(r["line"]), "true" if r["real"] else "false"))
ts.append("];")
open(OUT_TS, "w", encoding="utf-8", newline="\n").write("\n".join(ts) + "\n")
# for cast/voice_sync.py: time order (it refuses unordered words); the replay's "What's" starts under "phone."
vs = sorted(plan, key=lambda r: r["s"])
json.dump([{"w": r["w"], "s": r["s"], "e": r["e"]} for r in vs], open(OUT_JSON, "w", encoding="utf-8"), indent=0)
print("make_plan: %d words, last word ends %.3f s -> %s" % (len(plan), end, os.path.relpath(OUT_TS, ROOT)))
print("  source: " + src)
print("  words started by 3.0 s: %d, by 5.0 s: %d" % (sum(1 for r in plan if r["s"] < 3.0), sum(1 for r in plan if r["s"] < 5.0)))
