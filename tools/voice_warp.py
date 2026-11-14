"""Re-time the current short (tools/short_cfg.py) to a NEW narration without touching the picture code.

The picture keeps its own clock (old voice timeline: words.ts / BEAT / every hard-coded frame). A smooth, monotone
time-map WARP[new_frame] -> old_frame (float) is built from the two voices' word onsets and ends (same 205 display
tokens in the same order), slope-smoothed (Gaussian, sigma 4 f) and clamped to 0.55..1.6, pinned so new frame 0 = old 0
and the last new frame = the last old frame (the loop seam stays exact). AntiTheft.tsx renders the scene at WARP[f];
Captions.tsx uses VOICE_WORDS (new frames) on the real frame.

Outputs:
  studio/src/videos/antitheft/voicewarp.ts   VOICE_TOTAL, WARP, VOICE_WORDS, VOICE_PHRASES (generated)
  sound/antitheft/audio/warp.json            {old_total, new_total, warp, inv}
  --audio: also rewrites sound/antitheft/audio/timeline.json in NEW frames (beats/shots through the inverse map; the old
           one is kept as timeline_old.json), maps EVERY cue in picture_events_used.json (old frames, from an old-unit
           mix run) into picture_events.json (new frames; old file kept as picture_events_old.json), and maps
           picture_probe.json (tumbleweed windows / contacts / paths).
Usage: python -s voice_warp.py <old words.json> <new voice dir (voice.wav, words.json, phrases.json)> [--audio]
"""
import json
import os
import shutil
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
STUDIO = ROOT / "studio"
sys.path.insert(0, str(ROOT / "tools")); from short_cfg import SHORT  # noqa: E402
AUD = ROOT / "sound" / SHORT / "audio"
FPS, TAIL = 30, 20  # = story.ts TAIL (picture tail after the last word, 1:1 speed)

old_w = json.load(open(sys.argv[1], encoding="utf-8"))
nd = Path(sys.argv[2])
new_w = json.load(open(nd / "words.json", encoding="utf-8"))
new_p = json.load(open(nd / "phrases.json", encoding="utf-8"))
# --- word pairing old -> new (v3, 2026-11-12: the script may change words) ---------------------------------------
# Same token list: index i <-> i (the original behaviour). Otherwise: difflib match on normalised tokens, plus
# beat-edge pairs (first/last word of every beat, from both phrase lists), plus manual pairs from
# sound/<short>/audio/warp_anchors.json [[old_idx, new_idx], ...]; non-monotone pairs are dropped.
import re as _re
from difflib import SequenceMatcher as _SM
_key = lambda w: _re.sub(r"[^a-z0-9%']", "", w.lower())
old_p = json.load(open(Path(sys.argv[1]).parent / "phrases.json", encoding="utf-8"))
def _beats(ws, ps):
    out = []
    for w in ws:
        m = (w["s"] + w["e"]) / 2
        b = next((q["beat"] for q in ps if q["s"] - 0.05 <= m <= q["e"] + 0.05), None)
        if b is None:
            b = min(ps, key=lambda q: min(abs(m - q["s"]), abs(m - q["e"])))["beat"]
        out.append(b)
    return out
if len(old_w) == len(new_w) and all(_key(a["w"]) == _key(b["w"]) for a, b in zip(old_w, new_w)):
    PAIR = {i: i for i in range(len(old_w))}
else:
    PAIR = {}
    sm = _SM(None, [_key(w["w"]) for w in old_w], [_key(w["w"]) for w in new_w], autojunk=False)
    for a0, b0, n in sm.get_matching_blocks():
        for t in range(n):
            PAIR[a0 + t] = b0 + t
    ob, nb = _beats(old_w, old_p), _beats(new_w, new_p)
    for bt in sorted(set(ob) & set(nb)):
        oi = [i for i, b in enumerate(ob) if b == bt]; ni = [j for j, b in enumerate(nb) if b == bt]
        PAIR[oi[0]] = ni[0]; PAIR[oi[-1]] = ni[-1]
    man = AUD / "warp_anchors.json"
    if man.exists():
        for o, n in json.load(open(man, encoding="utf-8")):
            PAIR[int(o)] = int(n)
    mono, last = {}, -1
    for o in sorted(PAIR):
        if PAIR[o] > last:
            mono[o] = PAIR[o]; last = PAIR[o]
    PAIR = mono
    print(f"word pairing: {len(PAIR)} of {len(old_w)} old words paired to {len(new_w)} new words (text changed)")
INV = {v: k for k, v in PAIR.items()}
old_total = json.load(open(AUD / "timeline.json", encoding="utf-8"))["total"]  # the live picture clock (export_timeline.mjs)
new_end = round(new_w[-1]["e"] * FPS)
new_total = new_end + 2 + TAIL
IDENT = "--identity" in sys.argv   # NEW short: the picture is built on the FINAL voice -> WARP = identity
if IDENT:
    new_total = old_total

# anchors (new frame, old frame), v2 (A4): only where the picture must sync -- every story BEAT word (timeline.json beats
# matched to the old words) plus every phrase's first and last word and the two ends. Value-smoothed (Gaussian sigma
# 2 f) and made monotone, then pinned at both ends. Beats land within ~0.2 f; the picture never runs slower than ~0.4x.
tl_beats = json.load(open(AUD / "timeline.json", encoding="utf-8"))["beat"]
of = [round(w["s"] * FPS) for w in old_w]
use = set()
for b in tl_beats.values():
    k = min(range(len(of)), key=lambda q: abs(of[q] - b["f"]))
    if abs(of[k] - b["f"]) <= 1:
        if k in PAIR:
            use.add(k)
        else:
            print(f"  beat {next(n for n, v in tl_beats.items() if v is b)!r} (old word {old_w[k]['w']!r}) has no new word: interpolated")
for p in new_p:
    ks = [q for q, w in enumerate(new_w) if p["s"] - 0.02 <= w["s"] <= p["e"] + 0.02]
    for j in (ks[:1] + ks[-1:]):
        if j in INV:
            use.add(INV[j])
use |= {o for o in PAIR if o not in use and PAIR[o] in (0, len(new_w) - 1)}
A = [(0.0, 0.0)] + [(new_w[PAIR[q]]["s"] * FPS, old_w[q]["s"] * FPS) for q in sorted(use)]
A += [(new_w[-1]["e"] * FPS, old_w[-1]["e"] * FPS), (new_total - 1.0, old_total - 1.0)]
A.sort()
xs, ys = [A[0][0]], [A[0][1]]
for x, y in A[1:]:
    if x > xs[-1] + 1e-6 and y >= ys[-1]:
        xs.append(x); ys.append(y)
fr = np.arange(new_total, dtype=float)
raw = np.interp(fr, xs, ys)
k = np.exp(-0.5 * (np.arange(-14, 15) / 2.0) ** 2); k /= k.sum()
w = np.convolve(np.pad(raw, 14, mode="edge"), k, mode="valid")
w[0], w[-1] = 0.0, old_total - 1.0
w = np.maximum.accumulate(w)
if IDENT:
    w = np.arange(new_total, dtype=float)
sm = np.diff(w, prepend=0.0)
err = [abs(np.interp(new_w[PAIR[q]]["s"] * FPS, fr, w) - old_w[q]["s"] * FPS) for q in sorted(use)]
inv = np.interp(np.arange(old_total, dtype=float), w, fr)   # old frame -> new frame
print(f"old {old_total} f -> new {new_total} f ({new_total / FPS:.2f} s); {len(use)} anchor words; slope p1 {np.percentile(sm[1:], 1):.2f} .. p99 {np.percentile(sm[1:], 99):.2f}, "
      f"anchor error median {np.median(err):.2f} f, max {max(err):.2f} f")

# voicewarp.ts
def phrase_of(t):
    for p in new_p:
        if p["s"] - 0.05 <= t <= p["e"] + 0.05:
            return p["i"]
    return min(new_p, key=lambda p: min(abs(t - p["s"]), abs(t - p["e"])))["i"]

L = ["// GENERATED by tools/voice_warp.py (new narration -> picture time-map). Do not edit by hand.",
     "// The scene renders at WARP[frame] (old-voice clock); captions use VOICE_WORDS on the real frame.",
     "import type { Word } from \"./words\";",
     f"export const VOICE_TOTAL = {new_total};",
     "export const WARP: number[] = [" + ",".join(f"{v:.3f}" for v in w) + "];",
     "export const VOICE_WORDS: Word[] = ["]
for x in new_w:
    L.append(f"  {{ w: {json.dumps(x['w'])}, s: {x['s']:.3f}, e: {x['e']:.3f}, f: {round(x['s'] * FPS)}, fe: {round(x['e'] * FPS)}, p: {phrase_of((x['s'] + x['e']) / 2)} }},")
L.append("];")
L.append("/** old picture frame -> new video frame (inverse of WARP, monotone binary search) */")
L.append("export const toNew = (fo: number): number => { const n = WARP.length - 1; if (fo <= WARP[0]) return 0; if (fo >= WARP[n]) return n; "
         "let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (WARP[m] <= fo) lo = m; else hi = m; } "
         "return lo + (fo - WARP[lo]) / Math.max(1e-6, WARP[hi] - WARP[lo]); };")
L.append("export const VOICE_PHRASES = " + json.dumps([{k: p[k] for k in ("i", "beat", "s", "e")} for p in new_p]) + ";")
(STUDIO / "src" / "videos" / SHORT / "voicewarp.ts").write_text("\n".join(L) + "\n", encoding="utf-8")
json.dump({"old_total": old_total, "new_total": new_total, "warp": [round(v, 3) for v in w], "inv": [round(v, 3) for v in inv]},
          open(AUD / "warp.json", "w", encoding="utf-8"))
print("wrote voicewarp.ts + warp.json")

if "--audio" in sys.argv:
    I = lambda f: float(np.interp(float(f), np.arange(old_total), inv))
    # timeline in NEW frames
    tl_path = AUD / "timeline.json"
    if not (AUD / "timeline_old.json").exists():
        shutil.copy(tl_path, AUD / "timeline_old.json")
    tl = json.load(open(AUD / "timeline_old.json", encoding="utf-8"))
    for s in tl["shots"]:
        s["a"], s["b"] = round(I(s["a"])), round(I(s["b"]))
        s["t0"], s["t1"] = round(s["a"] / FPS, 3), round(s["b"] / FPS, 3)
        for r in s.get("relight", []):
            r["f"] = round(I(r["f"]))
    for k2, b in tl["beat"].items():
        b["f"] = round(I(b["f"])); b["t"] = round(b["f"] / FPS, 3)
    tl["total"], tl["duration_s"] = new_total, round(new_total / FPS, 3)
    json.dump(tl, open(tl_path, "w", encoding="utf-8"), indent=1)
    # every cue the old-unit mix used -> exact new frames
    used = json.load(open(AUD / "picture_events_used.json", encoding="utf-8"))
    if not (AUD / "picture_events_old.json").exists() and (AUD / "picture_events.json").exists():
        shutil.copy(AUD / "picture_events.json", AUD / "picture_events_old.json")
    tons_old = json.load(open(AUD / "timeline_old.json", encoding="utf-8"))["beat"]["tons14"]["f"]

    def mapv(key, v):
        if v is None or isinstance(v, (str, bool)):
            return v
        if key == "flip_seqs":
            return [[t, round(I(tons_old + off) - I(tons_old))] for t, off in v]
        if isinstance(v, (int, float)):
            return round(I(v), 2)
        if isinstance(v, list):
            return [mapv(key, u) for u in v]
        if isinstance(v, dict):
            out = {}
            for kk, u in v.items():
                if kk in ("f0", "f", "land", "start", "until") or kk in ("on", "contacts", "live_on"):
                    out[kk] = mapv(key, u)
                elif kk == "dur" and "f0" in v:
                    out[kk] = round(I(v["f0"] + u) - I(v["f0"]), 2)
                else:
                    out[kk] = u
            return out
        return v
    pe = {"_doc": "GENERATED by tools/voice_warp.py: every cue of the old-voice mix mapped onto the new narration's frames"}
    for kk, rec in used.items():
        if kk.startswith("_"):
            continue
        v = rec["value"] if isinstance(rec, dict) and "value" in rec else rec
        pe[kk] = mapv(kk, v)
    json.dump(pe, open(AUD / "picture_events.json", "w", encoding="utf-8"), indent=1)
    # tumbleweeds
    pp = json.load(open(AUD / "picture_probe.json", encoding="utf-8"))
    if not (AUD / "picture_probe_old.json").exists():
        shutil.copy(AUD / "picture_probe.json", AUD / "picture_probe_old.json")
    for t in pp.get("tumbles", []):
        f0 = t["f0"]
        for kk in ("contacts", "on", "live_on", "contacts_on"):
            if kk in t and t[kk] is not None:
                t[kk] = [round(I(u), 2) for u in t[kk]]
        if isinstance(t.get("nearest"), dict) and "f" in t["nearest"]:
            t["nearest"]["f"] = round(I(t["nearest"]["f"]), 2)
        if "path" in t:
            t["path"] = [[round(I(p[0]), 2)] + p[1:] for p in t["path"]]
        t["dur"] = round(I(f0 + t["dur"]) - I(f0), 2)
        t["f0"] = round(I(f0), 2)
    json.dump(pp, open(AUD / "picture_probe.json", "w", encoding="utf-8"), indent=1)
    print(f"audio: timeline.json -> new frames ({new_total}), {len(pe) - 1} cues mapped into picture_events.json, "
          f"{len(pp.get('tumbles', []))} tumbleweeds mapped")
