"""v6b: end-to-end check of the ASSEMBLED narration (the v6 check with the v6b targets: first word 0.33-0.35 s, 0.45 s
after "Five.", 0.50 s before and after the mind-blow line, n11 restored), measured from voice.wav itself; then voice_info.json
and the listening copy (written, never played; --preview <path>, default studio/out/clown/voice_v6_preview.mp3).

  python v6_verify.py [--dir <voice dir>] [--no-whisper] [--preview <mp3 path>]

 1. format (48 kHz stereo 24-bit), duration, first word onset, tail
 2. every gap between sentence units as TRUE silence (10 ms RMS windows every 5 ms under -45 dBFS) and as the
    word-edge gap of words_spoken.json; silent runs >= 0.10 s inside sentences
 3. whisper: the whole file in one pass AND every line cut out alone -> word differences against the script
 4. clipping: sample peak, 4x oversampled peak, samples >= 0.999
 5. loudness: BS.1770 integrated (own + ffmpeg ebur128), per line
 6. pace: narrator words/s over the file and while speaking; the count window; question end contours"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
SR = L.SR
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
V = Path(arg("--dir", str(L.HERE)))
WH = "--no-whisper" not in sys.argv
H = L.H
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels,codec_name,bits_per_raw_sample", "-of", "json",
                                str(V / "voice.wav")], capture_output=True, text=True, check=True).stdout)["streams"][0]
x = L.read(V / "voice.wav", ch=2)
m = x.mean(axis=1)
dur = len(m) / SR
d = L.db_frames(m)
words = json.loads((V / "words_spoken.json").read_text(encoding="utf-8"))
disp = json.loads((V / "words.json").read_text(encoding="utf-8"))
phr = json.loads((V / "phrases.json").read_text(encoding="utf-8"))
build = json.loads((V / "_build.json").read_text(encoding="utf-8"))
ok, issues = True, []


def flag(cond, msg):
    global ok
    if not cond:
        ok = False
        issues.append(msg)
        print("  !! " + msg)


print(f"format {pr}  duration {dur:.3f} s")
flag(int(pr["sample_rate"]) == 48000 and int(pr["channels"]) == 2 and pr["codec_name"] == "pcm_s24le", "not 48 kHz stereo 24-bit")
loud = np.where(d > -45)[0]
first_on, last_off = loud[0] * H + 0.005, loud[-1] * H + 0.005
print(f"first sound {first_on:.3f} s (words {words[0]['s']:.3f}); last sound ends {last_off:.3f} s -> tail {dur - last_off:.3f} s")
flag(0.33 <= first_on <= 0.35, "first word does not start in 0.33-0.35 s")
print(f"duration {dur:.2f} s (the lead accepted about 73-74 s with n11 restored)")

# ---- 2. gaps ----
runs = L.runs_below(d, 0, len(d))
sil = [(a * H + 0.005, (b - 1) * H + 0.005, (b - a) * H) for a, b in runs]
units = build["units"]
LIM = {"normal": (0.12, 0.22), "dialogue": (0.08, 0.15), "count": (2.5, 4.0)}
BEATS = {("n03", "n04"): (0.37, 0.43), ("n04", "n05"): (0.43, 0.47), ("n16", "n17"): (0.48, 0.52), ("n17", "n18"): (0.48, 0.52),
         ("n18", "n19"): (0.32, 0.38), ("s01", "s02"): (0.22, 0.28)}
gaps, used = [], set()
for k, (u, v) in enumerate(zip(units, units[1:])):
    mid = (u["off"] + v["on"]) / 2
    r = [q for q, s in enumerate(sil) if s[0] - 0.012 <= mid <= s[1] + 0.012]
    bg = build["gaps"][k]
    if not r:
        gaps.append({"after": u["line"], "before": v["line"], "kind": bg["kind"], "true_silence_s": 0.0, "between": bg["between"]})
        flag(False, f"no true silence between {u['line']} and {v['line']}")
        continue
    used.add(r[0])
    s = sil[r[0]]
    ws_a = [w for w in words if w["e"] <= mid]
    ws_b = [w for w in words if w["s"] >= mid]
    wg = round(ws_b[0]["s"] - ws_a[-1]["e"], 3) if ws_a and ws_b else None
    resid = float(np.max(d[int(s[0] / H) + 2:max(int(s[0] / H) + 3, int(s[1] / H) - 2)]))
    lo, hi = BEATS.get((u["line"], v["line"]), LIM.get(bg["kind"], (0.12, 0.22)))
    g = {"after": u["line"], "before": v["line"], "kind": bg["kind"] if (u["line"], v["line"]) not in BEATS else "beat", "at_s": round(s[0], 3),
         "true_silence_s": round(s[2], 3), "word_gap_s": wg, "target_s": bg["target_s"], "range": [lo, hi], "floor_db": round(resid, 1), "between": bg["between"]}
    g["ok"] = bool(lo - 1e-6 <= g["true_silence_s"] <= hi + 1e-6)
    gaps.append(g)
    flag(g["ok"], f"gap {u['line']}|{v['line']} ({g['kind']}) = {g['true_silence_s']} outside {lo}-{hi}")
print("\nGAPS  (true silence / word-edge gap, s)")
for g in gaps:
    print(f"  {g['after']}|{g['before']} {g['kind']:8s} {g['true_silence_s']:.3f} / {g.get('word_gap_s')}  [{g['range'][0]:.2f}-{g['range'][1]:.2f}] "
          f"{'ok' if g.get('ok') else 'OUT'}  at {g.get('at_s')}  {g['between']}")
inner = []
for q, s in enumerate(sil):
    if q in used or s[2] < 0.10 or s[0] < 0.05 or s[1] > dur - 0.16:
        continue
    before = [w["w"] for w in words if w["s"] <= (s[0] + s[1]) / 2]
    after = [w["w"] for w in words if w["s"] > (s[0] + s[1]) / 2]
    inner.append({"at_s": round(s[0], 3), "true_silence_s": round(s[2], 3), "between": f"{before[-1] if before else ''} | {after[0] if after else ''}"})
print("silent runs >= 0.10 s INSIDE sentences:", inner or "none")

# count window
P = {p["id"]: p for p in phr}
cw = None
if "n01" in P and "n03" in P:
    cw = round(P["n03"]["s"] - P["n01"]["e"], 3)
    dlc = round(P["n02"]["s"] - P["n01"]["e"], 3) if "n02" in P else None
    # acoustic: end of the n01 sound and the start of the n03 sound
    print(f"\nCOUNT WINDOW: end of 'Count the people on a phone.' {P['n01']['e']:.3f} -> start of 'How many?' {P['n03']['s']:.3f} = {cw:.3f} s; "
          f"'Don't lose count.' starts {dlc} s into it")
    flag(6.7 <= cw <= 7.3, f"count window {cw} outside 7.0 +- 0.3")

# ---- 3. whisper ----
wh = {}
if WH:
    m24 = L.read(V / "voice.wav", sr=24000)
    hw = L.whisper(m24)
    heard = " ".join(w["w"] for w in hw)
    spoken_text = " ".join(w["w"] for w in words)
    df = L.word_diff(spoken_text, heard)
    print("\nWHISPER whole file:", heard)
    print("  differences:", df or "none")
    per_line, bad = [], []
    for p in phr:
        a0, b0 = max(0.0, p["s"] - 0.06), min(dur, p["e"] + 0.06)
        h = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
        ht = " ".join(w["w"] for w in h)
        dd = L.word_diff(L.TEXT[p["id"]], ht)
        per_line.append({"id": p["id"], "speaker": p["speaker"], "heard": ht, "diff": dd, "min_p": round(min((w["p"] for w in h), default=0), 2)})
        print(f"  {p['id']} {p['speaker']:11s} p>={per_line[-1]['min_p']:.2f}  {ht}" + (f"   DIFF {dd}" if dd else ""))
        if dd:
            bad.append((p["id"], dd))
    flag(not bad, f"whisper (line by line) differs: {bad}")
    wh = {"whole_file_heard": heard, "whole_file_differences": df, "line_differences": bad, "per_line": per_line}

# ---- 4. clipping ----
pk = float(np.max(np.abs(x)))
tp = float(np.max(np.abs(resample_poly(m, 4, 1))))
nclip = int(np.sum(np.abs(x) >= 0.999))
print(f"\npeak {pk:.4f} ({20 * np.log10(pk):.2f} dBFS), 4x oversampled {tp:.4f} ({20 * np.log10(tp):.2f} dBTP), samples >= 0.999: {nclip}")
flag(nclip == 0 and pk <= 0.8913, "peak above -1 dBFS or clipping")

# ---- 5. loudness ----
I = L.lufs(x)
eb = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(V / "voice.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"],
                    capture_output=True, text=True).stderr
mI = re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)
mL = re.findall(r"LRA:\s+(-?[\d.]+) LU", eb)
print(f"integrated loudness {I:.2f} LUFS (ffmpeg ebur128: {mI[-1] if mI else '?'} LUFS, LRA {mL[-1] if mL else '?'} LU)")
flag(-18.05 <= I <= -16.95, "integrated loudness outside -17..-18 LUFS")
T, F = L.f0_track(m)
lines = []
for p in phr:
    seg = x[int(p["s"] * SR):int(p["e"] * SR)]
    e = L.end_contour(T, F, p["s"], p["e"])
    lines.append({"id": p["id"], "speaker": p["speaker"], "text": L.TEXT[p["id"]], "s": p["s"], "e": p["e"], "words": L.nwords(L.TEXT[p["id"]]),
                  "wps": round(L.nwords(L.TEXT[p["id"]]) / (p["e"] - p["s"]), 2), "lufs": round(L.lufs(seg), 2), "f0": L.f0_stats(T, F, p["s"], p["e"]), "end": e})
ref = np.median([q["lufs"] for q in lines if q["id"] not in ("n17", "n19")])
print(f"\nLINES (median line loudness {ref:.2f} LUFS; n17 / n19 should sit 1-2 dB above)")
for q in lines:
    dv = q["lufs"] - ref
    note = ""
    if q["id"] in ("n17", "n19"):
        good = 0.5 <= dv <= 2.3
        note = "LIFT ok" if good else "LIFT OUT"
        flag(good, f"{q['id']} is {dv:+.2f} dB from the median (wants +1..+2)")
    else:
        good = abs(dv) <= 1.2
        note = "" if good else "OUT +-1.2"
        flag(good, f"{q['id']} is {dv:+.2f} LU from the median")
    if q["text"].rstrip().endswith("?") and q["end"]:
        note += f"  QUESTION end {q['end']['rise_st']:+.2f} st ({'rises' if q['end']['rise_st'] > 0.5 else 'no rise'})"
    print(f"  {q['id']} {q['speaker']:11s} {q['s']:6.2f}-{q['e']:6.2f}  {q['wps']:4.2f} w/s  {q['lufs']:6.2f} LUFS ({dv:+.2f})  "
          f"f0 {q['f0'].get('med')} Hz r{q['f0'].get('range_st')} st  {note}  {q['text']}")

# ---- 6. pace ----
nar = [p for p in phr if p["speaker"] == "N"]
nar_words = sum(L.nwords(L.TEXT[p["id"]]) for p in nar)
nar_speak = sum(u["off"] - u["on"] for u in units if L.SPEAKER[u["line"]] == "N")
all_words = len(words)
all_speak = sum(u["off"] - u["on"] for u in units)
pace = {"narrator_words": nar_words, "narrator_speaking_s": round(nar_speak, 2), "narrator_wps_while_speaking": round(nar_words / nar_speak, 2),
        "narrator_wps_over_file": round(nar_words / dur, 2), "all_words": all_words, "all_wps_over_file": round(all_words / dur, 2),
        "all_wps_while_speaking": round(all_words / all_speak, 2),
        "all_wps_excluding_count_window": round(all_words / (dur - (cw or 0) + 0.0), 2) if cw else None}
print(f"\nPACE {pace}")

info_p = V / "voice_info.json"
info = json.loads(info_p.read_text(encoding="utf-8")) if info_p.exists() else {}
info.update({
    "duration_s": round(dur, 3),
    "stats": {"duration_s": round(dur, 3), "first_word_s": words[0]["s"], "last_word_end_s": words[-1]["e"], "tail_s": round(dur - last_off, 3),
              "n_spoken_words": all_words, "n_display_tokens": len(disp), "n_lines": len(phr), **pace,
              "peak": round(pk, 4), "peak_dbfs": round(20 * np.log10(pk), 2), "true_peak_4x": round(tp, 4), "clipped_samples": nclip,
              "integrated_lufs": round(I, 2), "ffmpeg_ebur128_lufs": float(mI[-1]) if mI else None, "lra_lu": float(mL[-1]) if mL else None,
              "count_window_s": cw},
    "lines": lines, "gaps": gaps, "silences_inside_sentences": inner,
    "verify": {"passed": ok, "issues": issues, **wh},
})
info_p.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
prev = Path(arg("--preview", str(L.ROOT / "studio" / "out" / "clown" / "voice_v6_preview.mp3")))
prev.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(V / "voice.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(prev)], check=True)
print("\npreview written (not played):", prev)
print("\nVERIFY", "PASSED" if ok else f"FAILED: {issues}")
