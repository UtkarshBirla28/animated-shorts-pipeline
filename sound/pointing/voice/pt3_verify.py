"""pointing, SCRIPT v3: VERIFY + ACCEPT of an assembled voice (pt_verify.py + pt_accept.py adapted to the v3 lines), all
measured from the files themselves; nothing is played.

  python pt3_verify.py [--dir _v3] [--preview <mp3>] [--no-whisper]      -> <dir>/voice_info.json (verify part), <dir>/accept.json

VERIFY
 1. format (48 kHz stereo 24-bit), duration (the build rule: <= 66.0 s; never over 70.0 s), first word at the lead, tail
 2. every planned pause as TRUE silence on the DIALOGUE stem (10 ms RMS windows every 5 ms under -45 dBFS); a pause that
    holds a laugh pre-roll (the tourist's own laugh before his words) is checked by its word edges instead
 3. sum check: voice.wav = dialogue + laughs + phone (sample for sample)
 4. clipping (sample peak, 4x oversampled peak), loudness (BS.1770 + ffmpeg ebur128), per-line loudness, pace
ACCEPT (the gates)
 A. every FLAGGED line (all call-outs, the two-word narrator lines, "He is not.", "He's pointing at nothing!", the two new
    tourist idioms): Whisper, on the line cut out alone from the DIALOGUE stem, hears every word with p >= 0.6
 B. every other line: Whisper hears every word (p < 0.6 listed as a warning; "six" is confirmed by its length >= 0.25 s:
    Whisper writes the digit and scores it low)
 C. the same lines cut from the FULL mix (with the laugh under the narrator, the phone bed, the giggles): no script word
    may be lost. Extra "ha ha" heard inside a planned laugh is intentional, not an error
 D. the phone's replay v3_r01 (thin, -8 dB): intentional; its five words are tested alone on the phone stem and reported
 E. breaths: audible 10 ms frames (> -50 dBFS) in the pause middles of the DIALOGUE stem (> 0.18 s from both neighbouring
    words) = 0.0 s. The intentional laugh pre-rolls are left out of the count and listed
 F. the hook gate (pt3_gate.py), the build rule, the reused-take transcript checks, the call rhythm (fact guard 5: no call
    under 1.3 s, beat >= 0.35 s), the replay rule (only its first word under "phone."), "Bag... gone." level
 G. the whole file in one pass (20 s windows) against the script: reported"""
import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

import pt_lib as L
import pt3_lib as V
import pt3_gate

sys.stdout.reconfigure(encoding="utf-8")
SR, H = L.SR, L.H
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
D = Path(arg("--dir", str(L.HERE / "_v3")))
if not D.is_absolute():
    D = L.HERE / D
WH = "--no-whisper" not in sys.argv
FLAG = ["v3_n02", "v3_d01", "v3_t01", "v3_n06", "v3_t02", "v3_d02", "v3_n09", "v3_t04", "v3_n10", "v3_t05", "v3_t06", "v3_d03", "v3_k01", "v3_t07"]
CALLS = {"v3_d01": 0.35, "v3_d02": 0.35, "v3_t05": 0.35, "v3_d03": 0.35, "v3_k01": 0.35, "v3_t07": 0.35}

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels,codec_name", "-of", "json", str(D / "voice.wav")],
                               capture_output=True, text=True, check=True).stdout)["streams"][0]
x = L.read(D / "voice.wav", ch=2)
mix = x.mean(axis=1)
dlg = L.read(D / "stems" / "dialogue.wav", ch=2).mean(axis=1)
lau = L.read(D / "stems" / "laughs.wav", ch=2).mean(axis=1)
pho = L.read(D / "stems" / "phone.wav", ch=2).mean(axis=1)
dur = len(mix) / SR
d = L.db_frames(dlg)
words = json.loads((D / "words_spoken.json").read_text(encoding="utf-8"))
disp = json.loads((D / "words.json").read_text(encoding="utf-8"))
phr = json.loads((D / "phrases.json").read_text(encoding="utf-8"))
build = json.loads((D / "_build.json").read_text(encoding="utf-8"))
CFG = build["timing_plan"]
units = build["units"]
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
flag(CFG["lead_s"] - 0.04 <= first_on <= CFG["lead_s"] + 0.03, f"first word does not start near {CFG['lead_s']} s")
flag(abs((dur - last_off) - CFG["tail_s"]) <= 0.04, f"tail {dur - last_off:.3f} s is not the planned {CFG['tail_s']} s")
flag(dur <= 66.0 + 1e-6, f"duration {dur:.2f} s is over 66.0 s (the build rule)")
flag(dur >= 62.0, f"duration {dur:.2f} s is under 62 s (lengthen the picture holds, script 4.3)")
sumerr = float(np.max(np.abs(mix - (dlg + lau + pho))))
print(f"stems: |voice - (dialogue + laughs + phone)| max = {sumerr:.2e}")
flag(sumerr < 1e-4, "voice.wav is not the sum of its stems")

# ---- 2. pauses ----
runs = L.runs_below(d, 0, len(d))
sil = [(a * H + 0.005, (b - 1) * H + 0.005, (b - a) * H) for a, b in runs]
dw = [w for w in words if not w.get("from_phone")]
gaps, used = [], set()
for k, (u, v) in enumerate(zip(units, units[1:])):
    bg = build["gaps"][k]
    pre = v.get("laugh_pre_roll_s") or 0.0
    lo, hi = bg["target_s"] - 0.035, bg["target_s"] + 0.02
    g = {"after": u["line"], "before": v["line"], "kind": bg["kind"], "target_s": bg["target_s"], "range": [round(lo, 3), round(hi, 3)], "between": bg["between"]}
    wg = round(v["on"] - u["off"], 3)
    g["word_gap_s"] = wg
    if pre > 0.02:                       # his own laugh sits in this pause (and may run under the line before)
        g.update({"laugh_pre_roll_s": pre, "true_silence_s": None, "ok": bool(lo - 1e-6 <= wg <= hi + 0.01)})
        flag(g["ok"], f"pause {u['line']}|{v['line']} (word edges, a laugh leads) = {wg} outside {lo:.3f}-{hi:.3f}")
    else:
        mid = (u["off"] + v["on"]) / 2
        r = [q for q, s in enumerate(sil) if s[0] - 0.012 <= mid <= s[1] + 0.012]
        if not r:
            g.update({"true_silence_s": 0.0, "ok": False})
            flag(False, f"no true silence between {u['line']} and {v['line']}")
        else:
            used.add(r[0])
            s = sil[r[0]]
            g.update({"at_s": round(s[0], 3), "true_silence_s": round(s[2], 3), "ok": bool(lo - 1e-6 <= s[2] <= hi + 1e-6)})
            flag(g["ok"], f"pause {u['line']}|{v['line']} = {g['true_silence_s']} outside {lo:.3f}-{hi:.3f}")
    gaps.append(g)
print("\nPAUSES between lines (true silence on the dialogue stem / word-edge gap, s)")
for g in gaps:
    print(f"  {g['after']}|{g['before']} {g['kind']:7s} {g['true_silence_s']} / {g['word_gap_s']}  target {g['target_s']:.3f} "
          f"{'ok' if g.get('ok') else 'OUT'}{'  (laugh pre-roll ' + str(g['laugh_pre_roll_s']) + ' s)' if g.get('laugh_pre_roll_s') else ''}  {g['between']}")
inner = []
for q, s in enumerate(sil):
    if q in used or s[2] < 0.10 or s[0] < 0.05 or s[1] > dur - 0.12:
        continue
    before = [w for w in dw if w["s"] <= (s[0] + s[1]) / 2]
    after = [w for w in dw if w["s"] > (s[0] + s[1]) / 2]
    inner.append({"at_s": round(s[0], 3), "true_silence_s": round(s[2], 3), "line": before[-1]["id"] if before else None,
                  "between": f"{before[-1]['w'] if before else ''} | {after[0]['w'] if after else ''}"})
print("silent runs >= 0.10 s INSIDE lines:")
for q in inner:
    print(f"  {q['line']} {q['true_silence_s']:.3f} s at {q['at_s']:.2f}  ({q['between']})")
# planned inner pauses
plan_inner = []
for lid, rules in CFG.get("inner_set", {}).items():
    for rule in rules:
        hit = [q for q in inner if q["line"] == lid and q["between"].startswith(rule["after"] + " |")]
        got = hit[0]["true_silence_s"] if hit else 0.0
        mode = rule.get("mode", "set")
        if lid not in [u["line"] for u in units]:
            continue
        good = (abs(got - rule["to"]) <= 0.03) if mode == "set" else (got >= rule["to"] - 0.03) if mode == "min" else (got <= rule["to"] + 0.03)
        if mode == "set" and got == 0.0 and lid == "v3_n03":       # no true silence after "laugh..." in the take: nothing to set, the gap rule still holds
            good = True
        plan_inner.append({"line": lid, "after": rule["after"], "mode": mode, "plan_s": rule["to"], "true_silence_s": got, "ok": bool(good)})
        flag(good, f"inner pause {lid} after {rule['after']!r} = {got} (plan {mode} {rule['to']})")
sg = []
for lid, tgt in CFG.get("sentence_gaps", {}).items():
    us = [u for u in units if u["line"] == lid]
    for a, b in zip(us, us[1:]):
        got = round(b["on"] - a["off"], 3)
        sg.append({"line": lid, "plan_s": tgt, "got_s": got})

# ---- 4. clipping, loudness ----
pk = float(np.max(np.abs(x)))
tp = float(np.max(np.abs(resample_poly(mix, 4, 1))))
nclip = int(np.sum(np.abs(x) >= 0.999))
print(f"\npeak {pk:.4f} ({20 * np.log10(pk):.2f} dBFS), 4x oversampled {tp:.4f} ({20 * np.log10(tp):.2f} dBTP), samples >= 0.999: {nclip}")
flag(nclip == 0 and pk <= 0.8913, "peak above -1 dBFS or clipping")
I = L.lufs(x)
I_d = L.lufs(np.stack([dlg, dlg], axis=1))
eb = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(D / "voice.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"],
                    capture_output=True, text=True).stderr
mI = re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)
mL = re.findall(r"LRA:\s+(-?[\d.]+) LU", eb)
print(f"integrated loudness {I:.2f} LUFS (dialogue alone {I_d:.2f}; ffmpeg ebur128: {mI[-1] if mI else '?'} LUFS, LRA {mL[-1] if mL else '?'} LU)")
flag(-18.05 <= I_d <= -16.95, "dialogue loudness outside -17..-18 LUFS")
flag(-18.05 <= I <= -16.75, "full-mix loudness outside -16.75..-18 LUFS")
T, F = L.f0_track(dlg)
st2 = np.stack([dlg, dlg], axis=1)
lines = []
for p in phr:
    if p.get("from_phone"):
        continue
    seg = st2[int(p["s"] * SR):int(p["e"] * SR)]
    n = L.nwords(V.TEXT[p["id"]])
    lines.append({"id": p["id"], "speaker": p["speaker"], "text": V.TEXT[p["id"]], "s": p["s"], "e": p["e"], "dur": round(p["e"] - p["s"], 3), "words": n,
                  "wps": round(n / (p["e"] - p["s"]), 2), "lufs": round(L.lufs(seg), 2), "f0": L.f0_stats(T, F, p["s"], p["e"]), "end": L.end_contour(T, F, p["s"], p["e"])})
LIFT = CFG.get("lift_db", {})
ref = float(np.median([q["lufs"] for q in lines if q["id"] not in LIFT]))
nar_ref = float(np.median([q["lufs"] for q in lines if q["speaker"] == "N" and q["id"] not in LIFT]))
print(f"\nLINES (median line loudness {ref:.2f} LUFS; narrator median {nar_ref:.2f}; lifted lines {LIFT})")
for q in lines:
    dv = q["lufs"] - ref
    if q["id"] in LIFT:
        good = abs(dv - LIFT[q["id"]]) <= 1.2
        note = "LIFT ok" if good else "LIFT OUT"
        flag(good, f"{q['id']} is {dv:+.2f} dB from the median (wants {LIFT[q['id']]:+.1f})")
    else:
        good = abs(dv) <= 1.5
        note = "" if good else "OUT +-1.5"
        flag(good, f"{q['id']} is {dv:+.2f} LU from the median")
    q["lu_from_median"] = round(dv, 2)
    e = q["end"] or {}
    print(f"  {q['id']} {q['speaker']:3s} {q['s']:6.2f}-{q['e']:6.2f} {q['dur']:5.2f}s {q['wps']:4.2f} w/s {q['lufs']:6.2f} LUFS ({dv:+.2f}) "
          f"f0 {q['f0'].get('med')} Hz r{q['f0'].get('range_st')} sd{q['f0'].get('sd_st')} end {e.get('rise_st')}  {note}  {q['text']}")
nar = [q for q in lines if q["speaker"] == "N"]
nar_words = sum(q["words"] for q in nar)
nar_speak = sum(u["off"] - u["on"] for u in units if V.SPEAKER[u["line"]] == "N")
all_speak = sum(u["off"] - u["on"] for u in units)
pace = {"narrator_words": nar_words, "narrator_speaking_s": round(nar_speak, 2), "narrator_wps_while_speaking": round(nar_words / nar_speak, 2),
        "all_words": len(dw), "all_speaking_s": round(all_speak, 2), "all_wps_over_file": round(len(dw) / dur, 2), "silence_and_picture_only_s": round(dur - all_speak, 2)}
print(f"\nPACE {pace}")

# ================================================================ ACCEPT
acc = {"lines": [], "flag_fail": [], "line_fail": [], "mix_lost": [], "low_p_warn": [], "notes": []}


NUMW = {"1": ["one"], "6": ["six"], "1000": ["a", "thousand"]}


def nw(t):
    """word-by-word comparison form (pt_lib.norm_text joins contractions over the whole sentence: 'he is not' became 'he'sn't')"""
    out = []
    for w in t.lower().replace("’", "'").replace("-", " ").split():
        w = re.sub(r"[^a-z0-9']", "", w.replace(",", ""))
        if w:
            out += NUMW.get(w, [w])
    return out


def heard_p(expected, hw):
    exp = nw(expected)
    toks = [(t, h["p"]) for h in hw for t in nw(h["w"])]
    out = [None] * len(exp)
    for blk in SequenceMatcher(None, exp, [t for t, _ in toks], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            out[blk.a + k] = toks[blk.b + k][1]
    return list(zip(exp, out))


if WH:
    d24, m24, p24 = resample_poly(dlg, 1, 2), resample_poly(mix, 1, 2), resample_poly(pho, 1, 2)
    over = lau + pho
    do = L.db_frames(over)
    print("\nLINES, each cut out alone (dialogue stem; then the full mix where an overlay sounds under the line)")
    for p in phr:
        a0, b0 = max(0.0, p["s"] - 0.06), min(dur, p["e"] + 0.06)
        text = V.TEXT[p["id"]]
        if p.get("from_phone"):                # the thin replay: tested alone on the phone stem, gained up (a listener's ear adapts; reported, not a gate)
            seg = p24[int(a0 * 24000):int(b0 * 24000)]
            seg = seg * (10 ** (-23 / 20) / (np.sqrt(np.mean(seg ** 2)) + 1e-9))
            hw = L.whisper(seg)
            hw2 = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
            wp = heard_p(text, hw)
            acc["replay"] = {"id": p["id"], "text": text, "heard_phone_stem": " ".join(w["w"] for w in hw), "word_p": [(w, None if q is None else round(float(q), 2)) for w, q in wp],
                             "diff_phone_stem": L.word_diff(text, " ".join(w["w"] for w in hw)), "heard_in_mix": " ".join(w["w"] for w in hw2),
                             "all_five_words_heard": all(q is not None for _, q in wp)}
            print(f"  PHONE {p['id']} (thin, intentional)  stem: {acc['replay']['heard_phone_stem']!r} " + " ".join(f"{w}({'-' if q is None else f'{q:.2f}'})" for w, q in wp)
                  + f"   in the mix: {acc['replay']['heard_in_mix']!r}", flush=True)
            continue
        hw = L.whisper(d24[int(a0 * 24000):int(b0 * 24000)])
        ht = " ".join(w["w"] for w in hw)
        wp = heard_p(text, hw)
        diff = L.word_diff(text, ht)
        flagged = p["id"] in FLAG
        bad = [(w, None if q is None else round(float(q), 2)) for w, q in wp if q is None or q < 0.6]
        good = (not bad) if flagged else (not diff)
        rec = {"id": p["id"], "speaker": p["speaker"], "text": text, "heard": ht, "diff": diff, "flagged": flagged,
               "word_p": [(w, None if q is None else round(float(q), 3)) for w, q in wp], "ok": bool(good)}
        has_over = bool(np.max(do[int(a0 / H):max(int(a0 / H) + 1, int(b0 / H))]) > -60)
        if has_over:
            hw2 = L.whisper(m24[int(a0 * 24000):int(b0 * 24000)])
            ht2 = " ".join(w["w"] for w in hw2)
            wp2 = heard_p(text, hw2)
            lost = [w for w, q in wp2 if q is None]
            rec.update({"heard_in_mix": ht2, "mix_word_p": [(w, None if q is None else round(float(q), 3)) for w, q in wp2], "mix_lost_words": lost})
            if lost:
                acc["mix_lost"].append({"id": p["id"], "lost": lost, "heard": ht2})
        acc["lines"].append(rec)
        if flagged and bad:
            acc["flag_fail"].append({"id": p["id"], "bad": bad})
        if diff:
            acc["line_fail"].append({"id": p["id"], "diff": diff})
        if not flagged and any(q is not None and q < 0.6 for _, q in wp):
            acc["low_p_warn"].append({"id": p["id"], "low": [(w, round(float(q), 2)) for w, q in wp if q is not None and q < 0.6]})
        print(f"  {'FLAG ' if flagged else '     '}{p['id']} {p['speaker']:3s} {'ok ' if good else 'BAD'}  {ht!r:58s} "
              + " ".join(f"{w}({'-' if q is None else f'{q:.2f}'})" for w, q in wp) + (f"  DIFF {diff}" if diff else "")
              + (f"\n        in the mix: {rec['heard_in_mix']!r}" + (f"  LOST {rec['mix_lost_words']}" if rec["mix_lost_words"] else "") if has_over else ""), flush=True)
    # "six": Whisper writes the digit and scores it low; confirm the word by its length
    six = next((w for w in words if w["id"] == "v3_n13" and w["w"] == "six"), None)
    if six:
        acc["six"] = {"len_s": round(six["e"] - six["s"], 3), "ok": bool(six["e"] - six["s"] >= 0.25)}
        print(f"  'six' is {acc['six']['len_s']} s long (>= 0.25 s: {acc['six']['ok']})")
    # whole file, 20 s windows
    heard = []
    for a in range(0, len(m24), 24000 * 20):
        for w in L.whisper(m24[a:a + 24000 * 20 + 24000 // 2]):
            w["s"] += a / 24000
            w["e"] += a / 24000
            if not heard or w["s"] > heard[-1]["s"] + 0.05:
                heard.append(w)
    whole = " ".join(w["w"] for w in heard)
    acc["whole_file_heard"] = whole
    acc["whole_file_diff"] = L.word_diff(" ".join(w["w"] for w in words), whole)
    acc["whole_file_low_p"] = [(w["w"], round(float(w["p"]), 2), round(w["s"], 2)) for w in heard if w["p"] < 0.6]
    print("\nWHOLE FILE (full mix):", whole)
    print("  differences (laughs heard as 'ha ha' and the thin replay are intentional):", acc["whole_file_diff"] or "none")

# ---- E. breaths in the pause middles of the dialogue stem ----
hop = 240
d24b = resample_poly(dlg, 1, 2)
br, where, skipped = 0.0, [], []
pre_spans = [(u["on"] - (u.get("laugh_pre_roll_s") or 0.0) - 0.01, u["on"]) for u in units if (u.get("laugh_pre_roll_s") or 0.0) > 0.02]
for i in range(len(dw) - 1):
    a, b = dw[i]["e"] + 0.18, dw[i + 1]["s"] - 0.18
    if b - a < 0.03:
        continue
    seg = d24b[int(a * 24000):int(b * 24000)]
    n = len(seg) // hop
    if not n:
        continue
    e = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    tt = a + (np.arange(n) + 0.5) * 0.01
    inpre = np.array([any(p0 <= t <= p1 for p0, p1 in pre_spans) for t in tt])
    k = float(((e > -50) & ~inpre).sum()) * 0.01
    ks = float(((e > -50) & inpre).sum()) * 0.01
    if k:
        where.append({"after": dw[i]["w"], "id": dw[i]["id"], "at_s": round(a, 2), "audible_s": round(k, 2)})
    if ks:
        skipped.append({"before": dw[i + 1]["w"], "id": dw[i + 1]["id"], "laugh_pre_roll_audible_s": round(ks, 2)})
    br += k
acc["breath_audible_s"], acc["breath_where"], acc["intentional_laugh_pre_roll"] = round(br, 3), where, skipped
print(f"\naudible (> -50 dBFS) inside pause middles of the dialogue: {br:.2f} s {where if where else ''}  (gate 0.00)   intentional laugh pre-rolls: {skipped}")

# ---- F. the v3 gates ----
G = {}
if any(w["id"] == "v3_n01" for w in words):
    hg = pt3_gate.gate(D)
    G["hook_gate"] = {"passed": hg["passed"], **hg["gate"], **hg.get("prefer", {}), "not_starts_s": hg["not_starts_s"], "laugh_starts_s": hg["laugh_starts_s"],
                      "finger_starts_s": hg["finger_starts_s"], "words_started_by_3s": hg["words_started_by_3s"], "words_started_by_5s": hg["words_started_by_5s"],
                      "longest_true_silence_s": hg["longest_true_silence_s"], "he_is_not": hg["he_is_not"]}
br_ = build["build_rule"]
G["length"] = {"duration_s": round(dur, 3), "plan_s": 65.3, "over_66": bool(dur > 66.0), "over_70": bool(dur > 70.0), "cut_steps_applied": br_["cut_steps_applied"],
               "ok": bool(dur <= 66.0)}
G["reused_takes"] = {"n": len(build["reused_take_checks"]), "all_say_the_expected_words": all(not c["diff"] for c in build["reused_take_checks"]),
                     "checks": build["reused_take_checks"]}
calls = []
for lid, floor in CALLS.items():
    q = next((l for l in lines if l["id"] == lid), None)
    if not q:
        continue
    beat = max([r["true_silence_s"] for r in inner if r["line"] == lid] or [0.0])
    calls.append({"id": lid, "len_s": q["dur"], "beat_s": beat, "ok": bool(q["dur"] >= 1.3 - 0.005 and beat >= floor - 0.012)})
G["call_rhythm"] = {"rule": "fact guard 5: no call under 1.3 s; the held beat >= 0.35 s", "calls": calls, "ok": all(c["ok"] for c in calls)}
rp = build.get("replay")
if rp:
    rw = [w for w in words if w.get("from_phone")]
    n11e = max(w["e"] for w in words if w["id"] == "v3_n11")
    n12s = min(w["s"] for w in words if w["id"] == "v3_n12")
    G["replay"] = {"starts_before_end_of_phone_s": round(n11e - rw[0]["s"], 3), "second_word_starts_after_phone_s": round(rw[1]["s"] - n11e, 3),
                   "ends_before_japans_s": round(n12s - rw[-1]["e"], 3), "under_narrator_db": rp["under_narrator_db"],
                   "ok": bool(rw[1]["s"] >= n11e - 0.01 and n11e - rw[0]["s"] <= 0.305 and 0.04 <= n12s - rw[-1]["e"] <= 0.12)}
t7 = next((l for l in lines if l["id"] == "v3_t07"), None)
if t7:
    G["bag_gone_level"] = {"lufs": t7["lufs"], "narrator_median_lufs": round(nar_ref, 2), "db_under_narrator": round(nar_ref - t7["lufs"], 2), "f0_range_st": t7["f0"].get("range_st"),
                           "ok": bool(nar_ref - t7["lufs"] <= 6.0)}
acc["v3_gates"] = G
print("\nV3 GATES")
for k, v in G.items():
    print(f"  {k}: {json.dumps({a: b for a, b in v.items() if a not in ('checks', 'he_is_not')}, ensure_ascii=False)}")
gate_ok = all(v.get("ok", v.get("passed", True)) for v in G.values()) and G["reused_takes"]["all_say_the_expected_words"]
acc["passed"] = bool(WH and not acc["flag_fail"] and not acc["line_fail"] and not acc["mix_lost"] and br == 0.0 and gate_ok and acc.get("six", {"ok": True})["ok"])
(D / "accept.json").write_text(json.dumps(acc, ensure_ascii=False, indent=1), encoding="utf-8")

info_p = D / "voice_info.json"
info = json.loads(info_p.read_text(encoding="utf-8")) if info_p.exists() else {}
info.update({
    "duration_s": round(dur, 3),
    "stats": {"duration_s": round(dur, 3), "first_word_s": words[0]["s"], "last_word_end_s": max(w["e"] for w in words), "tail_s": round(dur - last_off, 3),
              "n_spoken_words": len(dw), "n_replay_words": len(words) - len(dw), "n_display_tokens": len(disp), "n_phrases": len(phr), **pace,
              "peak": round(pk, 4), "peak_dbfs": round(20 * np.log10(pk), 2), "true_peak_4x": round(tp, 4), "clipped_samples": nclip,
              "integrated_lufs": round(I, 2), "dialogue_lufs": round(I_d, 2), "ffmpeg_ebur128_lufs": float(mI[-1]) if mI else None, "lra_lu": float(mL[-1]) if mL else None},
    "lines": lines, "gaps": gaps, "silences_inside_lines": inner, "planned_inner_pauses": plan_inner, "sentence_gaps": sg,
    "verify": {"passed": ok, "issues": issues},
    "accept": {"passed": acc["passed"], "flag_fail": acc["flag_fail"], "line_fail": acc["line_fail"], "mix_lost": acc["mix_lost"], "breath_audible_s": acc["breath_audible_s"],
               "v3_gates": {k: v.get("ok", v.get("passed")) for k, v in G.items()}},
})
info_p.write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
if "--preview" in sys.argv:
    prev = Path(arg("--preview", ""))
    prev.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(D / "voice.wav"), "-c:a", "libmp3lame", "-b:a", "192k", str(prev)], check=True)
    print("\npreview written (not played):", prev)
print("\nVERIFY", "PASSED" if ok else f"FAILED: {issues}")
print("ACCEPT", "PASSED" if acc["passed"] else f"FAILED: flagged {acc['flag_fail']} lines {acc['line_fail']} mix-lost {acc['mix_lost']} breath {br:.2f} s gates "
      f"{ {k: v.get('ok', v.get('passed')) for k, v in G.items()} }")
