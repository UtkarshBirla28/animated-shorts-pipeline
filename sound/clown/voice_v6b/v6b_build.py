"""v6b: a SPLICE EDIT of the installed (preview 2) clown voice. Everything that does not change is copied sample for
sample from the previous voice.wav (whole runs of units, shifted by whole samples); only these change:

  1. lead-in        0.27 s of silence added before "Quick test." (first word 0.07 -> 0.34 s)
  2. after "Five."  the silence before "And the clown?" 0.125 -> 0.45 s
  3. n05            "And the clown? You saw him, right?": see N05 (retake / tag lift)
  4. n11 restored   "Many spun around to look." after "...had seen him." (0.15 s before, 0.16 s after)
  5. mind-blow      0.50 s of silence before "Their bodies dodged it." and 0.50 s after "...never saw it."
  6. n18, n19       re-takes; the 0.35 s beat before "Did you see the money?" stays; tail 0.15 s

  python v6b_build.py          reads takes/picks_v6b.json, writes voice.wav, words.json, words_spoken.json, phrases.json, _build.json

New units are cut and gained with the v6 method (v6b_lib): inside true silence, 8 ms fades, gain to the installed
voice's unit target (-20.18 LUFS mono; +1.5 dB on the last question), plosive dips only if the peak asks for it.
Old runs are cut at the quietest sample of the silence between two units (an exact zero wherever there is one)."""
import json
import re
import subprocess
import sys

import numpy as np

import v6_lib as L
import v6b_lib as B

sys.stdout.reconfigure(encoding="utf-8")
SR = L.SR
V0 = B.PREV
TARGET = -20.18
LIFT = {"n19": 1.5}
LEAD_ADD = 0.27
TAIL = 0.150
Q = 0.005                # a gap of g between acoustic off and on reads g - 0.005 as true silence (10 ms windows, 5 ms hop)
GAP = {("n04", "n05"): 0.45 + Q, ("n10", "n11"): 0.15 + Q, ("n11", "n12"): 0.16 + Q, ("n16", "n17"): 0.50 + Q,
       ("n17", "n18"): 0.50 + Q, ("n18", "n19"): 0.35}
SECTION = {"n01": 1, "n02": 1, "n03": 1, "n04": 1, "n05": 1, "n06": 2, "n07": 3, "s01": 3, "s02": 3, "n08": 3, "n09": 4,
           "i01": 4, "f01": 4, "h01": 4, "p01": 4, "n10": 5, "n11": 5, "n12": 6, "n13": 6, "n14": 7, "n15": 7, "n16": 7,
           "n17": 8, "n18": 9, "n19": 9}
picks = json.loads((L.TAKES / "picks_v6b.json").read_text(encoding="utf-8"))
N05 = picks["n05"]       # {"mode": "keep" | "full" | "second" | "lift", "src": "r05/t1", "lift_db": 2.5}

ob = json.loads((V0 / "_build.json").read_text(encoding="utf-8"))
ou = ob["units"]
old = L.read(V0 / "voice.wav", ch=2)
assert np.all(old[:, 0] == old[:, 1])
old = old[:, 0].copy()
owords = json.loads((V0 / "words_spoken.json").read_text(encoding="utf-8"))
k = 0
for u in ou:                                   # the old words of every old unit
    n = sum(L.nwords(t) for t in u["sentences"])
    u["words"] = owords[k:k + n]
    k += n
assert k == len(owords)
S = lambda t: int(round(t * SR))


def cut_after(i):
    """sample index of the cut between old unit i and i + 1: the middle of the longest run of exact zeros in the
    silence between them, else its quietest sample"""
    a, b = S(ou[i]["off"]), S(ou[i + 1]["on"])
    seg = old[a:b]
    z = np.concatenate([[0], (seg == 0).astype(int), [0]])
    dz = np.diff(z)
    st, en = np.where(dz == 1)[0], np.where(dz == -1)[0]
    if len(st):
        j = int(np.argmax(en - st))
        return a + (st[j] + en[j]) // 2, 0.0
    j = int(np.argmin(np.abs(seg)))
    return a + j, float(abs(seg[j]))


def idx(lid):
    return [i for i, u in enumerate(ou) if u["line"] == lid]


def new_units(lid, src, only_sent=None):
    tk = B.load_take(src)
    us = B.units_from_take(tk, lid, only_sent)
    for u in us:
        B.finish_unit(u, TARGET, LIFT.get(lid, 0.0))
        u["words_rel"] = B.time_words(u)
    return us


# ---- the pieces, in order ----
pieces = []           # ("old", [unit indices]) | ("new", unit)
first = lambda lid: idx(lid)[0]
last = lambda lid: idx(lid)[-1]
pieces.append(("old", list(range(0, last("n04") + 1))))
n5 = idx("n05")
if N05["mode"] in ("keep", "lift"):
    pieces.append(("old", n5))
elif N05["mode"] == "full":
    for u in new_units("n05", N05["src"]):
        pieces.append(("new", u))
elif N05["mode"] == "second":            # "And the clown?" stays, "You saw him, right?" comes from the retake
    pieces.append(("old", n5[:1]))
    us = [u for u in new_units("n05", N05["src"]) if "right?" in " ".join(u["texts"])]
    assert len(us) == 1 and len(us[0]["texts"]) == 1, "the retake does not separate the two sentences"
    pieces.append(("new", us[0]))
pieces.append(("old", list(range(first("n06"), last("n10") + 1))))
for u in new_units("n11", picks["n11"]):
    pieces.append(("new", u))
pieces.append(("old", list(range(first("n12"), last("n16") + 1))))
pieces.append(("old", idx("n17")))
for u in new_units("n18", picks["n18"]):
    pieces.append(("new", u))
for u in new_units("n19", picks["n19"]):
    pieces.append(("new", u))


def p_first_line(p):
    return ou[p[1][0]]["line"] if p[0] == "old" else p[1]["line"]


def p_last_line(p):
    return ou[p[1][-1]]["line"] if p[0] == "old" else p[1]["line"]


def gap_between(pa, pb):
    """silence (s, acoustic off -> on) between two pieces"""
    a, b = p_last_line(pa), p_first_line(pb)
    if (a, b) in GAP:
        return GAP[(a, b)], "beat" if GAP[(a, b)] >= 0.3 else "normal"
    if pa[0] == "old" and pb[0] == "old" and pb[1][0] == pa[1][-1] + 1:      # neighbours in the old file: the old gap
        return round(ou[pb[1][0]]["on"] - ou[pa[1][-1]]["off"], 3), None
    if a == b:                                                                # two sentences of one line
        if pa[0] == "new" and pa[1]["native_gap"] is not None and pb[0] == "new" and pb[1]["src"] == pa[1]["src"]:
            return float(np.clip(0.5 * pa[1]["native_gap"], 0.13, 0.19)), "normal"
        return 0.13, "normal"
    if pa[0] == "old" and pb[0] == "old":
        raise SystemExit(f"no gap rule for {a}|{b}")
    # a new unit next to an old run with no explicit rule: the old gap between those two lines
    ia, ib = last(a), first(b)
    if ib == ia + 1:
        return round(ou[ib]["on"] - ou[ia]["off"], 3), None
    raise SystemExit(f"no gap rule for {a}|{b}")


# ---- lay the pieces out (sample-exact) ----
canvas = np.zeros(S(90.0))
units_out, words_out, shifts, cuts_used = [], [], [], []
cursor_off = None
for pi, p in enumerate(pieces):
    if p[0] == "old":
        i0, i1 = p[1][0], p[1][-1]
        left = 0 if i0 == 0 else cut_after(i0 - 1)[0]
        if i1 + 1 < len(ou):
            right, resid = cut_after(i1)
        else:
            right, resid = len(old), 0.0
        if i0 > 0:
            cuts_used.append({"between": f"{ou[i0 - 1]['line']}|{ou[i0]['line']}", "old_s": round(left / SR, 4), "level_at_cut": float(abs(old[left]))})
        if cursor_off is None:
            new_on = S(ou[i0]["on"] + LEAD_ADD)
            g, kind = None, None
        else:
            g, kind = gap_between(pieces[pi - 1], p)
            new_on = cursor_off + S(g)
        sh = new_on - S(ou[i0]["on"])
        canvas[left + sh:right + sh] += old[left:right]
        for i in p[1]:
            u = ou[i]
            units_out.append({"line": u["line"], "sentences": u["sentences"], "take": u["take"], "take_on": u["take_on"], "take_off": u["take_off"],
                              "on": round(u["on"] + sh / SR, 3), "off": round(u["off"] + sh / SR, 3), "gain_db": u["gain_db"],
                              "lufs_before_gain_mono": u["lufs_before_gain_mono"], "peak_trim_db": u["peak_trim_db"], "plosive_dips": u["plosive_dips"],
                              "peak": u["peak"], "inner_cuts": u["inner_cuts"], "source": "p2 (sample-identical)", "old_on": u["on"],
                              "shift_s": round(sh / SR, 4), "shift_samples": int(sh), "_gap_kind": kind if i == i0 else "old", "_old_index": i})
            words_out.append([{"w": w["w"], "s": round(w["s"] + sh / SR, 3), "e": round(w["e"] + sh / SR, 3)} for w in u["words"]])
        shifts.append({"lines": f"{ou[i0]['line']}..{ou[i1]['line']}", "old_from_s": ou[i0]["on"], "old_to_s": ou[i1]["off"], "shift_s": round(sh / SR, 4),
                       "old_cut_from_s": round(left / SR, 4), "old_cut_to_s": round(right / SR, 4)})
        cursor_off = S(ou[i1]["off"]) + sh
        pieces[pi] = (p[0], p[1], (left, right, sh))          # kept for the sample-identity proof
    else:
        u = p[1]
        g, kind = gap_between(pieces[pi - 1], p)
        new_on = cursor_off + S(g)
        a = new_on - S(u["pre_f"])
        canvas[a:a + len(u["y"])] += u["y"]
        on_s = new_on / SR
        units_out.append({"line": u["line"], "sentences": u["texts"], "take": u["src"], "take_on": u["take_on"], "take_off": u["take_off"],
                          "on": round(on_s, 3), "off": round(on_s + u["len_f"], 3), "gain_db": u["gain_db"], "lufs_before_gain_mono": u["lufs_raw"],
                          "peak_trim_db": u["trim_db"], "plosive_dips": u["dips"], "peak": u["peak"], "inner_cuts": u["inner_cuts"],
                          "source": "v6b (new)", "tag_text": u["tag_text"], "_gap_kind": kind})
        words_out.append([{"w": w, "s": round(on_s + s, 3), "e": round(on_s + e, 3)} for w, s, e, _ in u["words_rel"]])
        cursor_off = new_on + S(u["len_f"])

# ---- n05 "lift" mode: the tag "right?" raised by gain only ----
tag_lift = None
if N05["mode"] == "lift":
    ui = next(i for i, u in enumerate(units_out) if u["line"] == "n05" and "right?" in " ".join(u["sentences"]))
    wr = words_out[ui][-1]
    assert wr["w"].startswith("right"), wr
    g = 10 ** (N05["lift_db"] / 20)
    a = S(wr["s"])
    b = S(units_out[ui]["off"]) + S(0.06)
    ramp = S(0.020)
    env = np.ones(b - (a - ramp))
    env[:ramp] = 1 + (g - 1) * (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, ramp)))
    env[ramp:] = g
    canvas[a - ramp:b] *= env
    tag_lift = {"word": "right?", "from_s": round((a - ramp) / SR, 3), "to_s": round(b / SR, 3), "gain_db": N05["lift_db"], "ramp_ms": 20}

total_n = cursor_off + S(TAIL)
y = canvas[:total_n]
pk = float(np.max(np.abs(y)))
st = np.stack([y, y], axis=1)
I = L.lufs(st)
print(f"peak {pk:.4f} ({20 * np.log10(pk):.2f} dBFS)  stereo lufs {I:.2f}  duration {total_n / SR:.3f}")
assert pk <= 0.8913, "peak over -1 dBFS"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(L.HERE / "voice.wav")],
               input=st.astype(np.float32).tobytes(), check=True)

# ---- proof: every old run is in the new file sample for sample ----
proof = []
for p in pieces:
    if p[0] != "old":
        continue
    left, right, sh = p[2]
    a_on, b_off = S(ou[p[1][0]]["on"]) - S(0.02), S(ou[p[1][-1]]["off"]) + S(0.02)
    a_on = max(a_on, left)
    b_off = min(b_off, right)
    if N05["mode"] == "lift" and ou[p[1][0]]["line"] == "n05":       # identical up to where the tag's gain ramp starts
        b_off = S(tag_lift["from_s"]) - sh
    same = bool(np.array_equal(old[a_on:b_off], y[a_on + sh:b_off + sh]))
    proof.append({"lines": f"{ou[p[1][0]]['line']}..{ou[p[1][-1]]['line']}", "old_s": [round(a_on / SR, 3), round(b_off / SR, 3)], "shift_s": round(sh / SR, 4),
                  "sample_identical": same})
    print(f"  old run {proof[-1]['lines']:10s} {proof[-1]['old_s']}  shift {sh / SR:+.4f} s  identical: {same}")

# ---- words, captions, phrases ----
spoken, disp, phrases = [], [], []
order = []
for u in units_out:
    if u["line"] not in order:
        order.append(u["line"])
for lid in order:
    ws = []
    for u, w in zip(units_out, words_out):
        if u["line"] == lid:
            ws += [dict(x) for x in w]
    toks = L.TEXT[lid].split()
    assert len(ws) == len(toks), (lid, [w["w"] for w in ws], toks)
    for w, tok in zip(ws, toks):
        w["w"] = tok
    spoken += ws
    markup = next(l[3] for l in L.LINES if l[0] == lid) or L.TEXT[lid]
    k = 0
    for mm in re.finditer(r"\{([^|}]*)\|([^}]*)\}|(\S+)", markup):
        if mm.group(3) is not None:
            disp.append(dict(ws[k]))
            k += 1
        else:
            n = len(mm.group(2).split())
            disp.append({"w": mm.group(1), "s": ws[k]["s"], "e": ws[k + n - 1]["e"]})
            k += n
    assert k == len(ws), lid
    phrases.append({"i": L.IDX[lid], "id": lid, "speaker": L.SPEAKER[lid], "beat": SECTION[lid], "s": ws[0]["s"], "e": ws[-1]["e"],
                    "markup": markup, "style": None})
for a, b in zip(spoken, spoken[1:]):
    assert b["s"] >= a["e"] - 1e-6 and a["e"] > a["s"], (a, b)

# ---- gaps (old kinds kept for the unchanged ones) ----
okind = {(g["after"], g["before"], g["between"]): g["kind"] for g in ob["gaps"]}
gaps = []
for u, v in zip(units_out, units_out[1:]):
    between = f"{u['sentences'][-1].split()[-1]} | {' '.join(v['sentences'][0].split()[:2])}"
    kind = v.get("_gap_kind")
    if kind in (None, "old"):
        kind = okind.get((u["line"], v["line"], between), "normal")
    gaps.append({"after": u["line"], "before": v["line"], "kind": kind, "target_s": round(v["on"] - u["off"], 3), "between": between,
                 "changed": bool(v.get("_gap_kind") not in (None, "old")) or (u["line"], v["line"]) in GAP})
for u in units_out:
    u.pop("_gap_kind", None)
    u.pop("_old_index", None)
W = lambda name, obj: (L.HERE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
W("words.json", disp)
W("words_spoken.json", spoken)
W("phrases.json", phrases)
W("_build.json", {"method": "splice edit of the preview-2 voice (sound/clown/voice_p2): old runs copied sample for sample, new units by the v6 method",
                  "previous_voice": str(V0.name), "unit_target_mono_lufs": TARGET, "lift_db": LIFT, "stereo_lufs": round(I, 2), "peak": round(pk, 4),
                  "duration_s": round(total_n / SR, 3), "lead_added_s": LEAD_ADD, "tail_s": TAIL, "picks": picks, "n05": N05, "tag_lift": tag_lift,
                  "dropped_lines": ["n09"], "units": units_out, "gaps": gaps, "old_runs": shifts, "cuts_in_old_file": cuts_used, "sample_identity_proof": proof})
print(f"{len(spoken)} spoken words, {len(disp)} caption tokens, {len(phrases)} phrases; first word {spoken[0]['s']:.3f}, last word end {spoken[-1]['e']:.3f}")
for g in gaps:
    print(f"  {g['after']}|{g['before']} {g['kind']:8s} {g['target_s']:.3f} {'CHANGED' if g['changed'] else ''}  ({g['between']})")
for u in units_out:
    if u["source"].startswith("v6b"):
        print(f"  NEW {u['line']} {u['take']} {u['on']:.3f}-{u['off']:.3f} gain {u['gain_db']:+.2f} trim {u['peak_trim_db']} dips {u['plosive_dips']} peak {u['peak']}")
