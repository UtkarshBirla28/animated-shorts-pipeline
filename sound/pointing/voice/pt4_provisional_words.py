"""PROVISIONAL v4 words.ts: the REAL opening (lines 1-3 + the seven Go onsets, from a built opening voice dir) followed by
the DIRECTOR's PLAN words for every later line (v4/plan_words.ts), shifted so they start right after the real opening.
  python pt4_provisional_words.py [--opening ../voice_v4_opening] [--out ../voice_v4_provisional]
Writes <out>/words.json + phrases.json (the plan part marked "src": "plan"), then runs tools/gen_words_ts.py into
studio/src/videos3/pointing/v4/words.ts and puts a PROVISIONAL banner on top. Replace it with the real install
(gen_words_ts on sound/pointing/voice_v4) when the whole voice is built."""
import json
import re
import subprocess
import sys

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OPEN = L.HERE / arg("--opening", "../voice_v4_opening")
OUT = L.HERE / arg("--out", "../voice_v4_provisional")
V4 = L.ROOT / "studio" / "src" / "videos3" / "pointing" / "v4"
TS = V4 / "words.ts"
LINES = {f"L{l['id']:02d}": l for l in V.jload(L.HERE.parent / "script_v4" / "lines_v4.json")}

ow = V.jload(OPEN / "words.json")
op = V.jload(OPEN / "phrases.json")
real_lines = {q["line"] for q in op} | {l_ for q in op for l_ in q.get("lines", [])}
src = (V4 / "plan_words.ts").read_text(encoding="utf-8")
plan = [{"w": json.loads(m.group(1)), "s": float(m.group(2)), "e": float(m.group(3)), "line": m.group(4)}
        for m in re.finditer(r'\{ w: ("(?:[^"\\]|\\.)*"), s: ([\d.]+), e: ([\d.]+), line: "(L\d+)" \}', src)]
assert plan, "no PLAN_WORDS parsed from plan_words.ts"
last_real = max(real_lines)
pe = max(p["e"] for p in plan if p["line"] == last_real)
shift = ow[-1]["e"] - pe                     # the plan's spacing after the opening, moved onto the real opening's end
later = [dict(p, s=round(p["s"] + shift, 3), e=round(p["e"] + shift, 3)) for p in plan if p["line"] > last_real]
words = [{"w": w["w"], "s": w["s"], "e": w["e"]} for w in ow] + [{"w": p["w"], "s": p["s"], "e": p["e"], "src": "plan"} for p in later]
phr = [dict(q) for q in op]
for lid in sorted({p["line"] for p in later}):
    ws = [p for p in later if p["line"] == lid]
    phr.append({"i": len(phr), "id": lid, "line": lid, "lines": [lid], "speaker": LINES[lid]["speaker"], "s": ws[0]["s"], "e": ws[-1]["e"],
                "text": LINES[lid]["text"], "markup": LINES[lid]["text"], "src": "plan (DIRECTOR plan_words.ts, shifted %+.3f s)" % shift})
OUT.mkdir(parents=True, exist_ok=True)
V.jsave(OUT / "words.json", words)
V.jsave(OUT / "phrases.json", phr)
V.jsave(OUT / "PROVISIONAL.json", {"_doc": "NOT the final voice: lines 1-3 real (from %s), every later line = plan_words.ts shifted" % OPEN.name,
                                   "opening_dir": str(OPEN.relative_to(L.ROOT)), "real_lines": sorted(real_lines), "plan_shift_s": round(shift, 3),
                                   "plan_words_ts_bytes": len(src), "words": len(words), "voice_end_s": words[-1]["e"]})
subprocess.run([sys.executable, "-s", str(L.ROOT / "tools" / "gen_words_ts.py"), str(OUT), str(TS), "--force"], check=True)
body = TS.read_text(encoding="utf-8")
banner = ("// PROVISIONAL (VOICE, 2026-11-20): lines L01-L03 and the seven \"Go\" onsets are the REAL opening voice\n"
          f"//   (sound/pointing/{OPEN.name}/voice.wav); every later line (L04-L22) is the DIRECTOR's plan_words.ts shifted by {shift:+.3f} s\n"
          "//   so it starts right after the real opening. NOT the final voice: VOICE replaces this file when the whole v4 voice is built.\n"
          "//   Made by sound/pointing/voice/pt4_provisional_words.py.\n")
TS.write_text(banner + body, encoding="utf-8", newline="\n")
print(f"PROVISIONAL words.ts: {len(ow)} real words ({sorted(real_lines)}), {len(later)} plan words shifted {shift:+.3f} s, voice end {words[-1]['e']:.3f} s -> {TS}")
