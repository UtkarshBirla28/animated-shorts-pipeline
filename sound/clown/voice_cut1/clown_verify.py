"""End-to-end check of the ASSEMBLED clown narration, measured from voice.wav itself (not from the build's own numbers),
then voice_info.json and the listening copy studio/out/clown/voice_preview.mp3.

  python clown_verify.py [--no-whisper]

 1. format (48 kHz stereo), duration, first word onset, silence after the last word
 2. every gap between sentences as TRUE silence (10 ms RMS windows every 5 ms under -45 dBFS) and as the word-edge gap of
    words.json; every other silent run >= 0.10 s in the file (inside a sentence)
 3. whisper: the whole file in one pass AND each sentence cut out alone -> word differences against the script
 4. word times of words_spoken.json against whisper's word starts
 5. clipping: sample peak, 4x oversampled peak, samples >= 0.999
 6. loudness: BS.1770 integrated (own filter + ffmpeg ebur128), per used take portion and per sentence
 7. pace: words/s overall and per sentence; key lines; questions' end contour (f0 over the last 300 ms voiced)"""
import json
import re
import subprocess
import sys

import numpy as np
from scipy.signal import resample_poly

import clown_lib as L
import clown_probe as P

sys.stdout.reconfigure(encoding="utf-8")
SR = L.SR
WH = "--no-whisper" not in sys.argv
V = L.HERE
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels,codec_name", "-of", "json", str(V / "voice.wav")],
                               capture_output=True, text=True, check=True).stdout)["streams"][0]
x = L.read(V / "voice.wav", ch=2)
m = x.mean(axis=1)
dur = len(m) / SR
d = L.db_frames(m)
H = 0.005
words = json.loads((V / "words_spoken.json").read_text(encoding="utf-8"))
disp = json.loads((V / "words.json").read_text(encoding="utf-8"))
phr = json.loads((V / "phrases.json").read_text(encoding="utf-8"))
build = json.loads((V / "_build.json").read_text(encoding="utf-8"))
ok = True
issues = []


def flag(cond, msg):
    global ok
    if not cond:
        ok = False
        issues.append(msg)
        print("  !! " + msg)


print(f"format {pr}  duration {dur:.3f} s")
flag(int(pr["sample_rate"]) == 48000 and int(pr["channels"]) == 2, "not 48 kHz stereo")
loud = np.where(d > -45)[0]
first_on, last_off = loud[0] * H + 0.005, loud[-1] * H + 0.005
print(f"first sound {first_on:.3f} s (words.json {disp[0]['s']:.3f}); last sound ends {last_off:.3f} s -> tail {dur - last_off:.3f} s (words.json {dur - disp[-1]['e']:.3f})")
flag(0.09 <= first_on <= 0.12, "first word does not start in 0.09-0.12 s")
flag(0.14 <= dur - last_off <= 0.165, "tail after the last word is not 0.15 s")
flag(60.0 <= dur <= 64.0, f"duration {dur:.2f} outside 60-64 s")

# ---- 2. gaps ----
runs = P.runs_below(d, 0, len(d))
sil = [(a * H + 0.005, (b - 1) * H + 0.005, (b - a) * H) for a, b in runs]      # (start, end, length) of true silence
gaps = []
used = set()
for a, b in zip(phr, phr[1:]):
    mid = (a["e"] + b["s"]) / 2
    r = [k for k, s in enumerate(sil) if s[0] - 0.01 <= mid <= s[1] + 0.01]
    assert r, (a["markup"], b["markup"])
    used.add(r[0])
    s = sil[r[0]]
    kind = "beat" if b["i"] in L.BEAT_BEFORE else ("rapid" if (a["i"] in L.GAP_AFTER_RAPID and b["i"] == a["i"] + 1) else "normal")
    if any(q["after"] == a["i"] and q["before"] == b["i"] and q["kind"] == "answer" for q in build["gaps"]):
        kind = "answer"                 # edit audit 2026-11-17: the lengthened answer beat (clown_lib.GAP_OVERRIDE)
    resid = float(np.max(d[int(s[0] / H) + 2:max(int(s[0] / H) + 3, int(s[1] / H) - 2)]))
    gaps.append({"after": a["i"], "before": b["i"], "kind": kind, "at_s": round(s[0], 3), "true_silence_s": round(s[2], 3),
                 "word_gap_s": round(b["s"] - a["e"], 3), "loudest_in_gap_db": round(resid, 1),
                 "between": f"{a['markup'].split()[-1]} | {' '.join(b['markup'].split()[:2])}"})
lim = {"normal": (0.12, 0.20), "rapid": (0.10, 0.16)}
print("\nGAPS  (true silence / word-edge gap, s)")
for g in gaps:
    if g["kind"] == "beat":
        lo, hi = (0.33, 0.38) if g["before"] == 19 else (0.30, 0.35)
    elif g["kind"] == "answer":
        lo, hi = L.GAP_OVERRIDE[g["after"]] - 0.02, L.GAP_OVERRIDE[g["after"]] + 0.01
    else:
        lo, hi = lim[g["kind"]]
    good = lo - 1e-6 <= g["true_silence_s"] <= hi + 1e-6
    print(f"  S{g['after']:<2}|S{g['before']:<2} {g['kind']:6s} {g['true_silence_s']:.3f} / {g['word_gap_s']:.3f}  [{lo:.2f}-{hi:.2f}] {'ok' if good else 'OUT'}  floor {g['loudest_in_gap_db']:6.1f} dB  {g['between']}")
    flag(good, f"gap S{g['after']}|S{g['before']} = {g['true_silence_s']} outside {lo}-{hi}")
    flag(abs(g["true_silence_s"] - g["word_gap_s"]) <= 0.012, f"gap S{g['after']}|S{g['before']}: words.json gap differs from the true silence")
inner = [{"at_s": round(s[0], 3), "true_silence_s": round(s[2], 3),
          "between": " | ".join([([w["w"] for w in words if w["s"] <= (s[0] + s[1]) / 2] or [""])[-1], ([w["w"] for w in words if w["s"] > (s[0] + s[1]) / 2] or [""])[0]])}
         for k, s in enumerate(sil) if k not in used and s[2] >= 0.10 and 0.05 < s[0] and s[1] < dur - 0.16]
print("silent runs >= 0.10 s INSIDE sentences:", inner or "none")
for q in inner:
    flag(q["true_silence_s"] <= 0.25, f"pause inside a sentence {q}")
tv = np.array([g["true_silence_s"] for g in gaps if g["kind"] not in ("beat", "answer")])
beats = [g for g in gaps if g["kind"] == "beat"]
answer = [g for g in gaps if g["kind"] == "answer"]
n_over = [g for g in gaps if g["true_silence_s"] > 0.25 and g["kind"] not in ("beat", "answer")]
flag(len(beats) == 2 and len(answer) == len(L.GAP_OVERRIDE) and not n_over,
     "the only gaps over 0.25 s must be the two beats and the lengthened answer beat")
print(f"ordinary gaps: n {len(tv)}, median {np.median(tv):.3f}, min {tv.min():.3f}, max {tv.max():.3f}; beats {[g['true_silence_s'] for g in beats]}; "
      f"answer beat {[(g['between'], g['true_silence_s'], g['word_gap_s']) for g in answer]}")

# ---- 3 / 4. whisper ----
script = " ".join(p_["markup"] for p_ in phr)
script_spoken = " ".join(w["w"] for w in words)
wh = {}
if WH:
    m24 = L.read(V / "voice.wav", sr=24000)
    hw = L.whisper(m24)
    heard = " ".join(w["w"] for w in hw)
    df = L.word_diff(script_spoken, heard)
    print("\nWHISPER whole file:", heard)
    print("  differences:", df or "none")
    flag(not df, f"whisper (whole file) differs: {df}")
    # word starts: script words vs heard words, in order
    from difflib import SequenceMatcher
    a = L.norm_text(script_spoken)
    hw_n = []
    for w in hw:
        for t in L.norm_text(w["w"]):
            hw_n.append((t, w["s"], w["e"], w["p"]))
    dts, lowp = [], []
    if len(a) == len(words):
        sm = SequenceMatcher(None, a, [t[0] for t in hw_n], autojunk=False)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                dts.append(hw_n[blk.b + k][1] - words[blk.a + k]["s"])
                if hw_n[blk.b + k][3] < 0.5:
                    lowp.append((words[blk.a + k]["w"], round(hw_n[blk.b + k][3], 2), round(words[blk.a + k]["s"], 2)))
    dts = np.array(dts)
    print(f"  word starts, whisper minus words.json: n {len(dts)}, median {np.median(dts):+.3f}, p10 {np.percentile(dts, 10):+.3f}, p90 {np.percentile(dts, 90):+.3f}, max |d| {np.max(np.abs(dts)):.3f}")
    print("  words with whisper p < 0.5:", lowp or "none")
    # the join(s) of a lengthened gap: both sentences cut out together, transcribed alone
    join_checks = []
    P0 = {p_["i"]: p_ for p_ in phr}
    for i0 in L.GAP_OVERRIDE:
        a0, b0 = max(0.0, P0[i0]["s"] - 0.06), min(dur, P0[i0 + 1]["e"] + 0.06)
        h = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
        ht = " ".join(w["w"] for w in h)
        dd = L.word_diff(L.S[i0][0] + " " + L.S[i0 + 1][0], ht)
        join_checks.append({"sentences": [i0, i0 + 1], "heard": ht, "diff": dd, "word_p": [(w["w"], round(float(w["p"]), 2)) for w in h]})
        print(f"  JOIN S{i0}|S{i0 + 1}: {ht!r}  diff {dd or 'none'}  p {join_checks[-1]['word_p']}")
        flag(not dd, f"whisper on the join S{i0}|S{i0 + 1} differs: {dd}")
    sent_bad = []
    per_sent = []
    for p_ in phr:
        a0, b0 = max(0.0, p_["s"] - 0.06), min(dur, p_["e"] + 0.06)
        h = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
        ht = " ".join(w["w"] for w in h)
        dd = L.word_diff(L.S[p_["i"]][0], ht)
        per_sent.append({"i": p_["i"], "heard": ht, "diff": dd, "min_p": round(min((w["p"] for w in h), default=0), 2)})
        print(f"  S{p_['i']:<2} p>={per_sent[-1]['min_p']:.2f}  {ht}" + (f"   DIFF {dd}" if dd else ""))
        if dd:
            sent_bad.append((p_["i"], dd))
    flag(not sent_bad, f"whisper (sentence by sentence) differs: {sent_bad}")
    wh = {"whole_file_heard": heard, "whole_file_differences": df, "sentence_differences": sent_bad,
          "word_start_whisper_minus_words_s": {"median": round(float(np.median(dts)), 3), "p10": round(float(np.percentile(dts, 10)), 3),
                                               "p90": round(float(np.percentile(dts, 90)), 3), "max_abs": round(float(np.max(np.abs(dts))), 3)},
          "low_p_words": lowp, "per_sentence": per_sent, "join_checks": join_checks}

# ---- 5. clipping ----
pk = float(np.max(np.abs(x)))
tp = float(np.max(np.abs(resample_poly(m, 4, 1))))
nclip = int(np.sum(np.abs(x) >= 0.999))
print(f"\npeak {pk:.4f} ({20 * np.log10(pk):.2f} dBFS), 4x oversampled {tp:.4f} ({20 * np.log10(tp):.2f} dBTP), samples >= 0.999: {nclip}")
flag(nclip == 0 and tp < 0.99, "clipping")

# ---- 6. loudness ----
I = L.lufs(x)
eb = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(V / "voice.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
mI = re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)
mL = re.findall(r"LRA:\s+(-?[\d.]+) LU", eb)
print(f"integrated loudness {I:.2f} LUFS (ffmpeg ebur128: {mI[-1] if mI else '?'} LUFS, LRA {mL[-1] if mL else '?'} LU)")
flag(-19.05 <= I <= -16.0, "integrated loudness outside -19..-16 LUFS")
P_ = {p_["i"]: p_ for p_ in phr}
port = []
for po in build["portions"]:
    a, b = P_[po["sentences"][0]]["s"], P_[po["sentences"][-1]]["e"]
    seg = m[int(a * SR):int(b * SR)]
    port.append({"take": po["take"], "sentences": po["sentences"], "lufs": round(L.lufs(seg), 2), "gain_db": po["gain_db"], **L.bands(seg)})
print("PORTIONS (take, sentences, LUFS, 1-4 kHz and 4-10 kHz vs 100-1000 Hz, centroid)")
for k, po in enumerate(port):
    nb = [port[j]["lufs"] for j in (k - 1, k + 1) if 0 <= j < len(port)]
    dv = max(abs(po["lufs"] - v) for v in nb)
    print(f"  {po['take']:8s} S{po['sentences'][0]}-{po['sentences'][-1]:<2}  {po['lufs']:6.2f} LUFS (max diff to neighbours {dv:.2f} LU)  mid {po['mid_db']:6.2f}  hi {po['hi_db']:6.2f}  centroid {po['centroid_hz']:.0f} Hz  gain {po['gain_db']:+.2f} dB")
    flag(dv <= 1.0, f"portion {po['take']} is {dv:.2f} LU from a neighbour")

# ---- 7. pace, key lines, questions ----
T, F = L.f0_track(m)
nsp = len(words)
speak = sum(p_["e"] - p_["s"] for p_ in phr)
overall = nsp / dur
print(f"\nPACE {nsp} spoken words: {overall:.2f} w/s over the file, {nsp / (words[-1]['e'] - words[0]['s']):.2f} first word to last, {nsp / speak:.2f} while speaking")
flag(3.3 <= overall <= 3.6, f"overall pace {overall:.2f} outside 3.3-3.6")
sent = []
for p_ in phr:
    i = p_["i"]
    n = L.nwords(i)
    seg = m[int(p_["s"] * SR):int(p_["e"] * SR)]
    k = np.where((T >= p_["s"]) & (T <= p_["e"]) & ~np.isnan(F))[0]
    f = F[k]
    e = L.end_contour(T, F, p_["s"], p_["e"])
    s = {"i": i, "text": L.S[i][0], "s": p_["s"], "e": p_["e"], "words": n, "wps": round(n / (p_["e"] - p_["s"]), 2),
         "lufs": round(L.lufs(seg), 2), "f0_med_hz": round(float(np.median(f)), 1) if len(f) else None,
         "f0_range_st": round(float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))), 1) if len(f) > 5 else None, "end": e,
         "take": next(b_["take"] for b_ in build["sentences"] if b_["i"] == i)}
    sent.append(s)
    tag = L.S[i][3]
    note = ""
    if "key" in tag:
        note = "  KEY " + ("ok" if 2.6 <= s["wps"] <= 3.2 else "OUT of 2.6-3.2")
    if "q" in tag.split():
        note += f"  QUESTION end {e['rise_st']:+.2f} st over the last 300 ms voiced, end vs sentence median {e['end_vs_med_st']:+.2f} st " + ("RISES" if e["rise_st"] > 0.5 else "does NOT rise")
    print(f"  S{i:<2} {s['wps']:4.2f} w/s  {s['lufs']:6.2f} LUFS  f0 {s['f0_med_hz']} Hz / {s['f0_range_st']} st  {s['take']:8s} {L.S[i][0]}{note}")
flat = [s for s in sent if s["words"] >= 4 and s["f0_range_st"] is not None and s["f0_range_st"] < 4.0]
print("sentences of 4+ words with an f0 range under 4 st (flat):", [(s["i"], s["f0_range_st"]) for s in flat] or "none")

info = json.loads((V / "voice_info.json").read_text(encoding="utf-8")) if (V / "voice_info.json").exists() else {}
info.update({
    "duration_s": round(dur, 3),
    "stats": {"duration_s": round(dur, 3), "first_word_s": disp[0]["s"], "last_word_end_s": disp[-1]["e"], "tail_s": round(dur - last_off, 3),
              "n_spoken_words": nsp, "n_display_tokens": len(disp), "n_sentences": len(phr),
              "words_per_s_overall": round(overall, 2), "words_per_s_while_speaking": round(nsp / speak, 2),
              "peak": round(pk, 4), "true_peak_4x": round(tp, 4), "clipped_samples": nclip,
              "integrated_lufs": round(I, 2), "ffmpeg_ebur128_lufs": float(mI[-1]) if mI else None,
              "gap_median_s": round(float(np.median(tv)), 3), "gap_min_s": round(float(tv.min()), 3), "gap_max_s": round(float(tv.max()), 3),
              "beats_s": {f"before S{g['before']}": g["true_silence_s"] for g in beats},
              "answer_beat_s": {f"after S{g['after']}": {"true_silence_s": g["true_silence_s"], "word_gap_s": g["word_gap_s"]} for g in answer}},
    "sentences": sent, "gaps": gaps, "silences_inside_sentences": inner, "portions": port,
    "verify": {"passed": ok, "issues": issues, **wh},
})
(V / "voice_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
out = L.ROOT / "studio" / "out" / "clown"
out.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(V / "voice.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(out / "voice_preview.mp3")], check=True)
print("\nVERIFY", "PASSED" if ok else f"FAILED: {issues}")
