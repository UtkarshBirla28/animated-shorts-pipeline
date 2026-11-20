# DIRECTOR tool (pointing v4): the v4 script -> the film's script module + its planned word times.
#   python briefs/v3/pointing/director/make_v4_script.py [--src <lines_v4.json | SCRIPT_v4*.md>]
# Default source: sound/pointing/script_v4/lines_v4.json if it exists, else sound/pointing/SCRIPT_v4.md, else the draft
# sound/pointing/script_v4/SCRIPT_v4_draft.md (section B table: | # | spk | exact words | words | running | planned s | ...).
# lines_v4.json: [{"id": "L01", "who": "N", "text": "...", "planned_start_s": 0.1, "planned_end_s": 4.6}, ...]
#   (keys "speaker" / "start" / "end" are accepted too). Writes
#   studio/src/videos3/pointing/v4/script.ts       LINES: id, who, text, style, caption chunks (1-3 words, CAPS for shouts)
#   studio/src/videos3/pointing/v4/plan_words.ts   PLAN_WORDS: every word spread over its line's planned time
# Line ids are the script's own ids (stable across rewrites); the shot table names shots by line id, never by number.
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
V4 = os.path.join(ROOT, "studio", "src", "videos3", "pointing", "v4")
arg = lambda k, d=None: (sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d)
cands = [arg("--src"), "sound/pointing/script_v4/lines_v4.json", "sound/pointing/SCRIPT_v4.md", "sound/pointing/script_v4/SCRIPT_v4_draft.md"]
src = next(os.path.join(ROOT, c) if not os.path.isabs(c) else c for c in cands if c and os.path.exists(os.path.join(ROOT, c) if not os.path.isabs(c) else c))

def from_md(path):
    """the FIRST narration table of the file: the draft's section B (| # | spk | exact words | words | running | planned s |)
    or revision 2's (| # | who | words | picture |); a header cell named "words" / "exact words" is the text"""
    rows, cols = [], None
    for ln in open(path, encoding="utf-8"):
        if not ln.startswith("|"):
            if rows: break                  # the first table only
            cols = None if not ln.strip() == "" else cols
            continue
        c = [x.strip() for x in ln.strip().strip("|").split("|")]
        if c and c[0] == "#":
            low = [x.lower() for x in c]
            tc = next((i for i, x in enumerate(low) if x in ("exact words", "words")), 2)
            pc = next((i for i, x in enumerate(low) if x.startswith("planned")), None)
            cols = (tc, pc); continue
        if cols is None or not c[0].isdigit(): continue
        tc, pc = cols
        m = re.match(r"([\d.]+)\s*-\s*([\d.]+)", c[pc]) if pc is not None and pc < len(c) else None
        rows.append({"id": "L%02d" % int(c[0]), "who": c[1], "text": c[tc], "picture": c[3] if len(c) > 3 and pc is None else "",
                     "planned_start_s": float(m.group(1)) if m else None, "planned_end_s": float(m.group(2)) if m else None})
    return rows

rows = json.load(open(src, encoding="utf-8")) if src.endswith(".json") else from_md(src)
if isinstance(rows, dict): rows = rows.get("lines", [])
# planned times: given, else WPS words/s (default 3.25: the lead's length rule) with 0.15 s joins.
# THE GO GRID (a line made only of "Go" words, the locked line 2): seven onsets whose gaps shrink from 0.46 s to 0.26 s,
# each word 0.20 s, then a HELD BEAT of 0.5 s of silence after the last one (the red lamp lands in it).
WPS = float(arg("--wps", "3.25"))
GRID0, GRID1, GO_LEN, BEAT = 0.46, 0.26, 0.20, 0.50
is_go = lambda txt: all(re.sub(r"[^a-z]", "", w.lower()) == "go" for w in txt.split()) and len(txt.split()) > 2
t = 0.05                                     # the narrator starts at 0.05 s (hook rule)
for r in rows:
    r["who"] = r.get("who") or r.get("speaker") or "N"
    r["id"] = ("L%02d" % r["id"]) if isinstance(r.get("id"), int) or str(r.get("id", "")).isdigit() else str(r["id"])
    s0, s1 = r.get("planned_start_s", r.get("start")), r.get("planned_end_s", r.get("end"))
    n = len(r["text"].split())
    if s0 is None: s0 = t
    if is_go(r["text"]):
        gaps = [GRID0 + (GRID1 - GRID0) * k / max(1, n - 2) for k in range(n - 1)]
        r["grid"] = [round(s0 + sum(gaps[:k]), 3) for k in range(n)]
        s1 = r["grid"][-1] + GO_LEN
        r["s0"], r["s1"] = float(s0), float(s1); t = s1 + BEAT; continue
    if s1 is None: s1 = s0 + max(0.6, n / WPS)
    r["s0"], r["s1"] = float(s0), float(s1); t = r["s1"] + 0.15

def syl(w):
    w = re.sub(r"[^a-z]", "", w.lower()); n = len(re.findall(r"[aeiouy]+", w))
    if re.search(r"[^aeiou]e$", w) and len(w) > 3: n -= 1
    return max(1, n)

def chunks(text, shout):
    """1-3 words per caption chunk: the line is cut into phrases at punctuation, each phrase into balanced chunks of at
    most 3 words (4 -> 2+2, 5 -> 3+2, 7 -> 3+2+2); a shout is one chunk in CAPS"""
    ws = text.split()
    if shout: return [{"text": text.upper(), "n": len(ws)}]
    # names stay whole on one caption ("New York", "New Yorkers"): glue them for the split, count their real words
    glued = text.replace("New York", "New_York").split()   # "_" = the glue (no "_" in the script)
    phrases, cur = [], []
    for w in glued:
        cur.append(w)
        if re.search(r"[.,!?;:…]$", w): phrases.append(cur); cur = []
    if cur: phrases.append(cur)
    out = []
    for ph in phrases:
        k = -(-len(ph) // 3); base, extra = divmod(len(ph), k); i = 0
        for j in range(k):
            n = base + (1 if j < extra else 0); out.append(ph[i:i + n]); i += n
    return [{"text": " ".join(c).replace("_", " "), "n": sum(len(w.split("_")) for w in c)} for c in out]

lines, words = [], []
for r in rows:
    shout = r["who"] != "N"
    ws = r["text"].split()
    go = "grid" in r
    # the Go run gets NO caption words (the lamp is the caption)
    lines.append({"id": r["id"], "who": r["who"], "text": r["text"], "style": "c" if shout else "n", "caps": [] if go else chunks(r["text"], shout)})
    if go:
        for w, s0 in zip(ws, r["grid"]): words.append({"w": w, "s": s0, "e": round(s0 + GO_LEN, 3), "line": r["id"]})
        continue
    wt = [0.10 + 0.13 * syl(w) for w in ws]; wt[-1] *= 1.5
    k = (r["s1"] - r["s0"] - 0.02 * (len(ws) - 1)) / sum(wt); tt = r["s0"]
    for w, x in zip(ws, wt):
        words.append({"w": w, "s": round(tt, 3), "e": round(tt + x * k, 3), "line": r["id"]}); tt += x * k + 0.02

rel = os.path.relpath(src, ROOT).replace("\\", "/")
open(os.path.join(V4, "script.ts"), "w", encoding="utf-8", newline="\n").write(
    "// GENERATED by briefs/v3/pointing/director/make_v4_script.py (DIRECTOR) from " + rel + ". Do not edit by hand.\n"
    "export type CapStyle = \"n\" | \"c\" | \"small\";\n"
    "export type V4Line = { id: string; who: string; text: string; style: CapStyle; caps: { text: string; n: number }[] };\n"
    "export const SCRIPT_SOURCE = " + json.dumps(rel) + ";\n"
    "export const LINES: V4Line[] = [\n" + "".join("  " + json.dumps(l, ensure_ascii=False) + ",\n" for l in lines) + "];\n")
open(os.path.join(V4, "plan_words.ts"), "w", encoding="utf-8", newline="\n").write(
    "// GENERATED by briefs/v3/pointing/director/make_v4_script.py (DIRECTOR): planned word times (the voice replaces them).\n"
    "export type PlanWord = { w: string; s: number; e: number; line: string };\n"
    "export const PLAN_WORDS: PlanWord[] = [\n" + "".join("  { w: %s, s: %.3f, e: %.3f, line: %s },\n" % (json.dumps(w["w"], ensure_ascii=False), w["s"], w["e"], json.dumps(w["line"])) for w in words) + "];\n")
print("make_v4_script: %d lines, %d words, last word ends %.2f s (at %.2f w/s), from %s" % (len(lines), len(words), max(w["e"] for w in words), WPS, rel))
