"""Assemble the v6 clown narration from the picked takes -> voice.wav (48 kHz stereo 24-bit), words.json (caption
tokens), words_spoken.json (one entry per spoken word), phrases.json (one entry per script line + speaker),
_build.json. voice_info.json is written by v6_verify.py.

  python v6_build.py [--target -17.5] [--drop n11,n02]        reads takes/picks.json {"sent": {line id: "folder/take"}}

Method (no stretch, no pitch shift, no dynamics processing: gains only, every cut inside true silence):
 - every SENTENCE of every used line is lifted out of its take (acoustic span from v6_probe: 10 ms RMS windows every
   5 ms over -45 dBFS) with up to 30 ms before / 50 ms after (never more than half the silence there), 8 ms
   raised-cosine fades at both ends (the ends sit in silence); sentences with no true silence between them in the
   take stay joined as one unit;
 - a silence INSIDE a sentence longer than INNER_MAX (0.20 s; per-line exceptions below) is cut to INNER_TO (0.16 s)
   in its middle (10 ms crossfade, all inside silence);
 - every unit is gained to the target (BS.1770, MONO = stereo - 3.01) with LIFT_DB on the mind-blow line and the last
   question; a final single gain puts the whole file on --target; if the peak passes -1 dBFS the target drops;
 - units are laid on a silent canvas: first word at LEAD, gaps by kind (true silence between units):
     normal (narrator)      clip(0.5 x the take's own gap, 0.13, 0.19); 0.16 across two takes (0.14 after ? or :)
     dialogue (the four answers + inside them)   0.11 (0.10-0.13)
     beats: after "How many?" 0.40; before "Their bodies dodged it." 0.30; before "Did you see the money?" 0.35;
            "...and a clown suit." 0.25 after "I own a unicycle."
     THE COUNT: "How many?" starts COUNT_S after "Count the people on a phone." ends; "Don't lose count." starts
            DLC_S into that silence.
Word times: whisper's word starts on the FINISHED file, snapped to the 10 ms energy onset (look back while the level is
over 25 % of the word's peak; out of silence forward), ends at the next start or the start of a true silence; the
first / last word of each sentence pinned to the acoustic on / off (a first word after a laugh keeps its own start).
The take's ElevenLabs character times (v4: a 40 ms grid, seen up to 0.4 s off) are the fallback where whisper misses
a word, and the reference the report compares against."""
import json
import re
import subprocess
import sys

import numpy as np

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
SR = L.SR
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
TARGET_ST = float(arg("--target", -17.5))
DROP = [v for v in arg("--drop", "").split(",") if v]
OUT = L.HERE if "--out" not in sys.argv else L.HERE / arg("--out", "")
PEAK_MAX = 0.885                     # -1.06 dBFS
LEAD, TAILEND = 0.070, 0.150
PRE, POST, FADE = 0.030, 0.050, 0.008
INNER_MAX, INNER_TO = 0.20, 0.16
INNER_EXC = {"p01": (0.40, 0.34), "n19": (0.36, 0.30), "s02": (0.30, 0.25)}   # line: (max, cut to) for deliberate pauses
LIFT_DB = {"n17": 1.5, "n19": 1.5}
COUNT_S, DLC_S = 7.0, 3.0
DIALOGUE = ["i01", "f01", "h01", "p01"]
BEAT_AFTER = {"n03": 0.40, "s01": 0.25}            # silence after this line
BEAT_BEFORE = {"n17": 0.30, "n19": 0.35}           # silence before this line
SECTION = {"n01": 1, "n02": 1, "n03": 1, "n04": 1, "n05": 1, "n06": 2, "n07": 3, "s01": 3, "s02": 3, "n08": 3, "n09": 4,
           "i01": 4, "f01": 4, "h01": 4, "p01": 4, "n10": 5, "n11": 5, "n12": 6, "n13": 6, "n14": 7, "n15": 7, "n16": 7,
           "n17": 8, "n18": 9, "n19": 9}

picks = json.loads((L.TAKES / "picks.json").read_text(encoding="utf-8"))["sent"]
order = [l[0] for l in L.LINES if l[0] not in DROP]


def load_take(src):
    folder, take = src.split("/")
    mp3 = L.TAKES / folder / f"{take}.mp3"
    pr = json.loads(mp3.with_suffix(".probe.json").read_text(encoding="utf-8"))
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    m = L.read(mp3)
    al = [w for w in L.align_words(mp3.with_suffix(".json")) if re.search(r"[A-Za-z0-9]", w[0])]     # an em dash is not a word
    nexp =sum(L.nwords(s["text"]) for s in pr["sent"])
    if len(al) != nexp:
        al = None
    return {"mp3": mp3, "m": m, "probe": pr, "meta": meta, "al": al, "raw_lufs": L.lufs(m)}


cache = {}
for lid in order:
    if picks[lid] not in cache:
        cache[picks[lid]] = load_take(picks[lid])

# ---- units: the sentences of every line, cut from their takes ----
units = []
for lid in order:
    tk = cache[picks[lid]]
    pr, m = tk["probe"], tk["m"]
    g_probe = 10 ** (pr["gain_db"] / 20)          # the probe measured the take at -18 LUFS: spans are at that gain
    d = L.db_frames(m * g_probe)
    sents = pr["sent"]
    # word list for the whole take, per sentence
    k0 = 0
    sw = []
    for s in sents:
        n = L.nwords(s["text"])
        sw.append(tk["al"][k0:k0 + n] if tk["al"] else None)
        k0 += n
    mine = [q for q, s in enumerate(sents) if s["line"] == lid]
    assert mine, (lid, picks[lid])
    # join sentences with no true silence between them
    groups = [[mine[0]]]
    for q in mine[1:]:
        if (sents[q - 1]["gap_after"] or 0) < 0.03:
            groups[-1].append(q)
        else:
            groups.append([q])
    for gi, grp in enumerate(groups):
        on, off = sents[grp[0]]["on"], sents[grp[-1]]["off"]
        qa, qb = grp[0], grp[-1]
        sil_before = (on - sents[qa - 1]["off"]) if qa > 0 else on
        sil_after = (sents[qb + 1]["on"] - off) if qb + 1 < len(sents) else len(m) / SR - off
        pre = max(0.0, min(PRE, sil_before / 2 if qa > 0 else sil_before))
        post = max(0.0, min(POST, sil_after / 2 if qb + 1 < len(sents) else sil_after))
        a, b = int(round((on - pre) * SR)), int(round((off + post) * SR))
        x = m[a:b].copy()
        # words relative to `on`
        ws = []
        for q in grp:
            if sw[q] is not None:
                ws += [[w, s_ - on, e_ - on, q] for w, s_, e_ in sw[q]]
            else:     # no usable alignment: spread the words over the sentence by character count
                toks = sents[q]["text"].split()
                tot = sum(len(t) for t in toks)
                t0, t1 = sents[q]["on"] - on, sents[q]["off"] - on
                acc = 0
                for t in toks:
                    ws.append([t, t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + len(t)) / tot, q])
                    acc += len(t)
        # sentence on/off inside the group (relative to on), to pin first / last words
        pins = {q: (sents[q]["on"] - on, sents[q]["off"] - on) for q in grp}
        # inner silences: cut long ones
        imax, ito = INNER_EXC.get(lid, (INNER_MAX, INNER_TO))
        fa, fb = int(on / L.H) + 4, int(off / L.H) - 4
        sil_runs = L.runs_below(d, fa, fb)
        inner_cuts = []
        cut_log = []
        for r0, r1 in reversed(sil_runs):
            s_len = (r1 - r0) * L.H
            # a silence between two sentences of one group never exists (they are joined only when there is none)
            if s_len > imax + 1e-9:
                rm = s_len - ito
                mid = (r0 * L.H + r1 * L.H + 0.010) / 2 - (on - pre)
                c0, c1 = int(round((mid - rm / 2) * SR)), int(round((mid + rm / 2) * SR))
                fl = int(0.010 * SR)
                r = np.linspace(0, 1, fl)
                head, tail = x[:c0].copy(), x[c1:].copy()
                head[-fl:] = head[-fl:] * (1 - r) + x[c1 - fl:c1] * r
                x = np.concatenate([head, tail])
                tcut = mid - pre
                for w in ws:
                    if w[1] >= tcut:
                        w[1] -= rm
                    if w[2] >= tcut:
                        w[2] -= rm
                for q in pins:
                    p0, p1 = pins[q]
                    pins[q] = (p0 - rm if p0 >= tcut else p0, p1 - rm if p1 >= tcut else p1)
                off -= rm
                cut_log.append({"at_take_s": round(r0 * L.H, 3), "was_s": round(s_len, 3), "now_s": ito})
        # silence map of x (for word snapping), at the probe gain
        dx = L.db_frames(x * g_probe)
        runs_x = [(r0 * L.H + 0.005 - pre, (r1 - 1) * L.H + 0.005 - pre) for r0, r1 in L.runs_below(dx, 0, len(dx)) if (r1 - r0) >= 4]
        ln = off - on
        # snap words: starts out of silence, ends at the next silence / next start, pins
        for k, w in enumerate(ws):
            for s0, s1 in runs_x:
                if s0 <= w[1] < s1:
                    w[1] = s1
            for s0, s1 in runs_x:
                if w[1] < s0 < w[2]:
                    w[2] = s0
        el_first = {}
        for q in grp:
            qw = [w for w in ws if w[3] == q]
            el_first[q] = qw[0][1]                       # the ElevenLabs start of the first word, before the pin
            qw[0][1], qw[-1][2] = pins[q][0], pins[q][1]
        for k in range(len(ws)):
            ws[k][1] = min(max(0.0, ws[k][1], ws[k - 1][1] + 0.03 if k else 0.0), ln - 0.03)
            if k + 1 < len(ws):
                ws[k][2] = min(ws[k][2], ws[k + 1][1]) if ws[k + 1][3] == ws[k][3] else ws[k][2]
            ws[k][2] = min(ln, max(ws[k][2], ws[k][1] + 0.03))
        fl = int(FADE * SR)
        rr = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fl))
        x[:fl] *= rr
        x[-fl:] *= rr[::-1]
        nxt_in_take = sents[qb + 1]["line"] if qb + 1 < len(sents) else None
        units.append({"line": lid, "sent_idx": grp, "texts": [sents[q]["text"] for q in grp], "x": x, "pre": pre, "len": ln,
                      "ws": ws, "src": picks[lid], "take_on": round(on, 3), "take_off": round(sents[qb]["off"], 3),
                      "native_gap": sents[qb]["gap_after"] if qb + 1 < len(sents) else None, "next_in_take": nxt_in_take,
                      "next_sent_in_take": qb + 1 if qb + 1 < len(sents) else None, "inner_cuts": cut_log,
                      "first_of_line": gi == 0, "last_of_line": gi == len(groups) - 1, "el_first": el_first})


def gap_for(u, v):
    """silence between unit u and the next unit v -> (seconds, kind)"""
    a, b = u["line"], v["line"]
    if a == b:              # two sentences of one line
        if a in DIALOGUE:
            return float(np.clip(0.6 * (u["native_gap"] or 0.15), 0.10, 0.13)), "dialogue"
        return float(np.clip(0.5 * (u["native_gap"] or 0.28), 0.13, 0.19)), "normal"
    if (a, b) in (("n01", "n02"), ("n02", "n03"), ("n01", "n03")):
        return None, "count"
    if a in BEAT_AFTER:
        return BEAT_AFTER[a], "beat"
    if b in BEAT_BEFORE:
        return BEAT_BEFORE[b], "beat"
    if a in DIALOGUE and b in DIALOGUE:
        return 0.11, "dialogue"
    same_take = u["src"] == v["src"] and u["next_in_take"] == b and u["native_gap"] is not None
    if same_take:
        return float(np.clip(0.5 * u["native_gap"], 0.13, 0.19)), "normal"
    last = u["texts"][-1].rstrip()
    return (0.14 if last.endswith(("?", ":")) else 0.16), "normal"


TRIM_MAX = 0.9          # dB a unit may be turned down to keep its peak under PEAK_MAX (inside the +-1.2 LU rule)
DIP_MAX = 3.0           # dB a single plosive burst may be dipped (clip gain), only where the overshoot is <= 20 ms


def burst_dips(y, limit):
    """clip gain on short bursts over `limit`: every 5 ms window over the limit gets a raised-cosine dip (4 ms ramps)
    just deep enough; refused (None) when the overshoot is longer than 20 ms or needs more than DIP_MAX"""
    hop = int(0.005 * SR)
    over = [k for k in range(0, len(y) - hop, hop) if np.max(np.abs(y[k:k + hop])) > limit]
    if not over:
        return y, []
    if len(over) * 0.005 > 0.020:
        return None, []
    need = 20 * np.log10(max(np.max(np.abs(y[k:k + hop])) for k in over) / limit) + 0.05
    if need > DIP_MAX:
        return None, []
    env = np.ones(len(y))
    ramp = int(0.004 * SR)
    n = np.arange(len(y))
    dips = []
    for k in over:
        pk = np.max(np.abs(y[k:k + hop]))
        dd = 20 * np.log10(pk / limit) + 0.05
        gmin = 10 ** (-dd / 20)
        shape = np.zeros(len(y))                     # 0 outside, 1 on the burst window, raised-cosine ramps
        shape[k:k + hop] = 1.0
        a = n[max(0, k - ramp):k]
        shape[a] = 0.5 - 0.5 * np.cos(np.pi * (a - (k - ramp)) / ramp)
        b = n[k + hop:min(len(y), k + hop + ramp)]
        shape[b] = 0.5 + 0.5 * np.cos(np.pi * (b - (k + hop)) / ramp)
        env = np.minimum(env, 1 - (1 - gmin) * shape)
        dips.append({"at_unit_s": round(k / SR, 4), "dip_db": round(dd, 2), "window_ms": 5, "ramps_ms": 4})
    return y * env, dips


def assemble(target):
    """target = MONO loudness of every unit"""
    for u in units:
        x = u["x"]
        core = x[int(u["pre"] * SR):int((u["pre"] + u["len"]) * SR)]
        lu = L.lufs(core)
        g = target + LIFT_DB.get(u["line"], 0.0) - lu
        y = x * 10 ** (g / 20)
        u["trim_db"], u["dips"] = 0.0, []
        pk = float(np.max(np.abs(y)))
        if pk > PEAK_MAX:
            need = 20 * np.log10(pk / PEAK_MAX) + 0.02
            if u["line"] not in LIFT_DB and need <= TRIM_MAX:
                g -= need
                u["trim_db"] = round(-need, 2)
                y = x * 10 ** (g / 20)
            else:
                yd, dips = burst_dips(y, PEAK_MAX)
                if yd is not None:
                    y, u["dips"] = yd, dips
                elif need <= TRIM_MAX:
                    g -= need
                    u["trim_db"] = round(-need, 2)
                    y = x * 10 ** (g / 20)
        u["gain_db"] = round(g, 2)
        u["lufs_raw"] = round(lu, 2)
        u["peak"] = round(float(np.max(np.abs(y))), 4)
        u["y"] = y
        # the acoustic span AT THE FINAL GAIN (the -45 dBFS threshold moves with the gain): units are placed by it,
        # so every gap is the target as true silence in the finished file; words move with it
        dy = L.db_frames(y)
        loud = np.where(dy > L.THR)[0]
        on2, off2 = loud[0] * L.H + 0.005, loud[-1] * L.H + 0.005
        shift = on2 - u["pre"]
        u["pre_f"], u["len_f"] = on2, off2 - on2
        ws = [[w, a - shift, b - shift, q] for w, a, b, q in u["ws"]]
        ln2 = u["len_f"]
        ws[0][1] = 0.0
        ws[-1][2] = ln2
        for k in range(len(ws)):
            ws[k][1] = min(max(0.0, ws[k][1], ws[k - 1][1] + 0.03 if k else 0.0), ln2 - 0.03)
            ws[k][2] = min(ln2, max(ws[k][2], ws[k][1] + 0.03))
        # sentence starts / ends inside a joined unit stay where they were
        u["ws_f"] = ws
    t = LEAD
    gaps = []
    n01_end = None
    for k, u in enumerate(units):
        u["on"], u["off"] = t, t + u["len_f"]
        if u["line"] == "n01" and u["last_of_line"]:
            n01_end = u["off"]
        if k + 1 < len(units):
            v = units[k + 1]
            g, kind = gap_for(u, v)
            if kind == "count":
                t_next = n01_end + (DLC_S if v["line"] == "n02" else COUNT_S)
            else:
                g = round(g / 0.005) * 0.005
                t_next = u["off"] + g
            gaps.append({"after": u["line"], "before": v["line"], "kind": kind, "target_s": round(t_next - u["off"], 3),
                         "native_s": u["native_gap"], "between": f"{u['texts'][-1].split()[-1]} | {' '.join(v['texts'][0].split()[:2])}"})
            t = t_next
    total = units[-1]["off"] + TAILEND
    N = int(round(total * SR))
    y = np.zeros(N)
    for u in units:
        a = int(round((u["on"] - u["pre_f"]) * SR))
        seg = u["y"][:max(0, N - a)]
        y[a:a + len(seg)] += seg
    return gaps, y, total


target = TARGET_ST - 3.01
for attempt in range(6):
    gaps, y, total = assemble(target)
    st = np.stack([y, y], axis=1)
    I = L.lufs(st)
    if abs(I - TARGET_ST) > 0.05:          # the units are on target; the whole file reads a little off (gating): settle
        target += TARGET_ST - I
        gaps, y, total = assemble(target)
        st = np.stack([y, y], axis=1)
        I = L.lufs(st)
    pk = float(np.max(np.abs(y)))
    if pk <= PEAK_MAX + 1e-4:
        break
    print(f"  peak {pk:.3f} at stereo {I:.2f} LUFS: lowering the target by {20 * np.log10(pk / PEAK_MAX) + 0.03:.2f} dB")
    TARGET_ST -= 20 * np.log10(pk / PEAK_MAX) + 0.03
    target = TARGET_ST - 3.01
print(f"peak {pk:.3f} ({20 * np.log10(pk):.2f} dBFS)  stereo lufs {I:.2f}  duration {total:.3f}")
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(OUT / "voice.wav")],
               input=st.astype(np.float32).tobytes(), check=True)

# ---- word times: whisper on the FINISHED file, snapped to the energy (eleven_v4's character times sit on a 40 ms
# grid and were measured up to 0.4 s off, e.g. 'branch,'); first / last word of every sentence pinned to the acoustic
# on / off, except a first word that both whisper and the ElevenLabs times put >= 0.15 s after the on (a laugh first)
from difflib import SequenceMatcher
from scipy.signal import resample_poly

ymono = y
env = np.sqrt(np.convolve(ymono ** 2, np.ones(480) / 480, "same"))[::480]          # 10 ms RMS envelope
FL = 0.01
flat = []                                     # every spoken word: [word, s, e, sentence key, first?, last?]
for ui, u in enumerate(units):
    wsf = u["ws_f"]
    for k, (w, a, b, q) in enumerate(wsf):
        first = k == 0 or wsf[k - 1][3] != q
        last = k == len(wsf) - 1 or wsf[k + 1][3] != q
        flat.append([w, u["on"] + a, u["on"] + b, (ui, q), first, last])
el_start = [f[1] for f in flat]
y24 = resample_poly(ymono, 1, 2)
wstart = [None] * len(flat)
fi0 = 0
for ui, u in enumerate(units):          # whisper per unit (a sentence or two cut out alone, 0.06 s margins): tighter times
    n_u = len(u["ws_f"])
    a0 = max(0.0, u["on"] - 0.06)
    hw = L.whisper(y24[int(a0 * 24000):int((u["off"] + 0.06) * 24000)])
    exp_t = [(L.norm_text(f[0])[:1] or ["?"])[0] for f in flat[fi0:fi0 + n_u]]
    heard = [(t, h["s"] + a0) for h in hw for t in L.norm_text(h["w"])[:1]]
    for blk in SequenceMatcher(None, exp_t, [h[0] for h in heard], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            wstart[fi0 + blk.a + k] = heard[blk.b + k][1]
    fi0 += n_u


SIL = 10 ** (-45 / 20)


def snap(c, lo, hi_word):
    """word onset near c (c = the EARLIER of whisper's and ElevenLabs' start: both run late): the inter-word energy dip
    in [c - 0.12, c + 0.03] (never before lo); if the dip is true silence, the first speech frame after it"""
    j = int(round(c / FL))
    a = max(int(round(lo / FL)), j - 12)
    b = min(len(env) - 1, j + 3)
    if b <= a:
        return c
    k = a + int(np.argmin(env[a:b + 1]))
    if env[k] < SIL:                               # a silence (or a stop closure): the onset is where it ends
        while k + 1 < len(env) and env[k + 1] < SIL and (k + 1) * FL < hi_word:
            k += 1
        k += 1
    return k * FL


moved = []
for i, f in enumerate(flat):
    if f[4]:                                   # first word of a sentence: the acoustic on, unless a laugh comes first
        uu = units[f[3][0]]
        el_on = uu["on"] + uu["el_first"][f[3][1]] - (uu["pre_f"] - uu["pre"])
        laugh_tag = cache[uu["src"]]["meta"]["text"].lstrip().lower().startswith(("[laughing]", "[laughs]"))
        if laugh_tag and uu["first_of_line"] and f[3][1] == uu["sent_idx"][0] and el_on - f[1] >= 0.15:
            ns = snap(el_on, f[1] + 0.08, f[2])
            moved.append((f[0], round(f[1], 3), round(ns, 3), "first word after a non-word sound"))
            f[1] = ns
        continue
    c = min(wstart[i], f[1]) if wstart[i] is not None else f[1]
    ns = snap(c, flat[i - 1][1] + 0.08, max(f[2], c + 0.25))
    if abs(ns - f[1]) > 0.06:
        moved.append((f[0], round(f[1], 3), round(ns, 3), "whisper+energy" if wstart[i] is not None else "energy"))
    f[1] = ns
d_fin = L.db_frames(ymono)
for i, f in enumerate(flat):                   # ends: the next start, or the start of a true silence before it
    if f[5]:
        continue
    nxt = flat[i + 1][1]
    rr = [r for r in L.runs_below(d_fin, int((f[1] + 0.03) / L.H), int(nxt / L.H)) if r[1] - r[0] >= 8]
    f[2] = (rr[0][0] * L.H + 0.005) if rr else nxt
for i, f in enumerate(flat):
    if i:
        f[1] = max(f[1], flat[i - 1][1] + 0.03, flat[i - 1][2] if flat[i - 1][3] != f[3] else 0.0)
    f[2] = max(f[2], f[1] + 0.03)
    if i + 1 < len(flat) and flat[i + 1][3] == f[3]:
        f[2] = min(f[2], max(f[1] + 0.03, flat[i + 1][1]))
print(f"word starts moved by whisper + energy (> 60 ms): {len(moved)}")
for m_ in moved:
    print(f"   {m_[0]:<14} {m_[1]:7.3f} -> {m_[2]:7.3f}  {m_[3]}")
dev = [abs(f[1] - e) for f, e in zip(flat, el_start)]
WORD_TIMING = {"method": "whisper (finished file) word starts snapped to the 10 ms energy onset; sentence-first / last words pinned to the acoustic on / off",
               "moved_over_60ms": len(moved), "n_words": len(flat), "whisper_matched": sum(1 for v in wstart if v is not None),
               "vs_elevenlabs_times": {"median_abs_s": round(float(np.median(dev)), 3), "over_0.2s": int(sum(1 for v in dev if v > 0.2))},
               "moves": moved}

spoken, disp, phrases = [], [], []
fi = 0
for lid in order:
    us = [u for u in units if u["line"] == lid]
    n = sum(len(u["ws_f"]) for u in us)
    ws = [{"w": f[0], "s": round(f[1], 3), "e": round(f[2], 3)} for f in flat[fi:fi + n]]
    fi += n
    toks = L.TEXT[lid].split()
    assert len(ws) == len(toks), (lid, [w["w"] for w in ws], toks)
    for w, tok in zip(ws, toks):
        w["w"] = tok                     # the script's words stand (a take may use other punctuation / tags)
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
W = lambda name, obj: (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
W("words.json", disp)
W("words_spoken.json", spoken)
W("phrases.json", phrases)
W("_build.json", {"target_stereo_lufs": round(TARGET_ST, 2), "stereo_lufs": round(I, 2), "peak": round(pk, 4), "duration_s": round(total, 3),
                  "dropped_lines": DROP, "lead_s": LEAD, "tail_s": TAILEND, "count_s": COUNT_S, "dont_lose_count_at_s": DLC_S,
                  "lift_db": LIFT_DB, "inner_rule": {"max_s": INNER_MAX, "cut_to_s": INNER_TO, "exceptions": INNER_EXC},
                  "units": [{"line": u["line"], "sentences": u["texts"], "take": u["src"], "take_on": u["take_on"], "take_off": u["take_off"],
                             "on": round(u["on"], 3), "off": round(u["off"], 3), "gain_db": u["gain_db"], "lufs_before_gain_mono": u["lufs_raw"],
                             "peak_trim_db": u["trim_db"], "plosive_dips": u["dips"], "peak": u["peak"],
                             "inner_cuts": u["inner_cuts"]} for u in units],
                  "gaps": gaps, "word_timing": WORD_TIMING})
print(f"{len(spoken)} spoken words, {len(disp)} caption tokens, {len(phrases)} phrases; first word {spoken[0]['s']:.3f}, last word end {spoken[-1]['e']:.3f}")
for g in gaps:
    print(f"  {g['after']}|{g['before']} {g['kind']:8s} {g['target_s']:.3f}  ({g['between']})")
for u in units:
    if u["trim_db"] or u["dips"]:
        print(f"  PEAK FIX {u['line']} {u['src']}: trim {u['trim_db']} dB, dips {u['dips']}, peak now {u['peak']}")
