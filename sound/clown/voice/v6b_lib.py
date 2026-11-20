"""v6b helpers: the v6_build.py unit method ported unchanged (cut a sentence out of its take inside silence, inner
pause rule, 8 ms fades, gain to the unit target, plosive dips / trim, the span at the final gain) + word timing
(whisper on the unit, starts snapped to the energy dip) + per-word pitch / level measurements. Nothing is played."""
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

import v6_lib as L

SR = L.SR
PEAK_MAX = 0.885                     # -1.06 dBFS
PRE, POST, FADE = 0.030, 0.050, 0.008
INNER_MAX, INNER_TO = 0.20, 0.16
INNER_EXC = {"p01": (0.40, 0.34), "n19": (0.36, 0.30), "s02": (0.30, 0.25)}
TRIM_MAX, DIP_MAX = 0.9, 3.0
SIL = 10 ** (-45 / 20)
FL = 0.01
# the previous (preview 2) voice: sound/clown/voice until the promotion, sound/clown/voice_p2 after it
PREV = L.HERE.parent / ("voice" if L.HERE.name == "voice_v6b" else "voice_p2")


def take_path(src):
    """folder/take -> mp3 (a v6b retake in this folder's takes/, else a v6 take in the previous voice's takes/)"""
    p = L.TAKES / f"{src}.mp3"
    return p if p.exists() else PREV / "takes" / f"{src}.mp3"


def load_take(src):
    mp3 = take_path(src)
    pr = json.loads(mp3.with_suffix(".probe.json").read_text(encoding="utf-8"))
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    m = L.read(mp3)
    al = [w for w in L.align_words(mp3.with_suffix(".json")) if re.search(r"[A-Za-z0-9]", w[0])]
    nexp = sum(L.nwords(s["text"]) for s in pr["sent"])
    if len(al) != nexp:
        al = None
    return {"mp3": mp3, "m": m, "probe": pr, "meta": meta, "al": al, "src": src}


def units_from_take(tk, lid, only_sent=None):
    """the sentences of line `lid` in take tk -> units (v6_build.py, unchanged). only_sent: sentence indices (within
    the take) to keep"""
    pr, m = tk["probe"], tk["m"]
    g_probe = 10 ** (pr["gain_db"] / 20)
    d = L.db_frames(m * g_probe)
    sents = pr["sent"]
    k0, sw = 0, []
    for s in sents:
        n = L.nwords(s["text"])
        sw.append(tk["al"][k0:k0 + n] if tk["al"] else None)
        k0 += n
    mine = [q for q, s in enumerate(sents) if s["line"] == lid]
    assert mine, (lid, tk["src"])
    groups = [[mine[0]]]
    for q in mine[1:]:
        if (sents[q - 1]["gap_after"] or 0) < 0.03:
            groups[-1].append(q)
        else:
            groups.append([q])
    units = []
    for gi, grp in enumerate(groups):
        if only_sent is not None and not set(grp) & set(only_sent):
            continue
        on, off = sents[grp[0]]["on"], sents[grp[-1]]["off"]
        qa, qb = grp[0], grp[-1]
        sil_before = (on - sents[qa - 1]["off"]) if qa > 0 else on
        sil_after = (sents[qb + 1]["on"] - off) if qb + 1 < len(sents) else len(m) / SR - off
        pre = max(0.0, min(PRE, sil_before / 2 if qa > 0 else sil_before))
        post = max(0.0, min(POST, sil_after / 2 if qb + 1 < len(sents) else sil_after))
        a, b = int(round((on - pre) * SR)), int(round((off + post) * SR))
        x = m[a:b].copy()
        ws = []
        for q in grp:
            if sw[q] is not None:
                ws += [[w, s_ - on, e_ - on, q] for w, s_, e_ in sw[q]]
            else:
                toks = sents[q]["text"].split()
                tot = sum(len(t) for t in toks)
                t0, t1 = sents[q]["on"] - on, sents[q]["off"] - on
                acc = 0
                for t in toks:
                    ws.append([t, t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + len(t)) / tot, q])
                    acc += len(t)
        pins = {q: (sents[q]["on"] - on, sents[q]["off"] - on) for q in grp}
        imax, ito = INNER_EXC.get(lid, (INNER_MAX, INNER_TO))
        fa, fb = int(on / L.H) + 4, int(off / L.H) - 4
        cut_log = []
        for r0, r1 in reversed(L.runs_below(d, fa, fb)):
            s_len = (r1 - r0) * L.H
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
        dx = L.db_frames(x * g_probe)
        runs_x = [(r0 * L.H + 0.005 - pre, (r1 - 1) * L.H + 0.005 - pre) for r0, r1 in L.runs_below(dx, 0, len(dx)) if (r1 - r0) >= 4]
        ln = off - on
        for w in ws:
            for s0, s1 in runs_x:
                if s0 <= w[1] < s1:
                    w[1] = s1
            for s0, s1 in runs_x:
                if w[1] < s0 < w[2]:
                    w[2] = s0
        el_first = {}
        for q in grp:
            qw = [w for w in ws if w[3] == q]
            el_first[q] = qw[0][1]
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
        units.append({"line": lid, "sent_idx": grp, "texts": [sents[q]["text"] for q in grp], "x": x, "pre": pre, "len": ln,
                      "ws": ws, "src": tk["src"], "take_on": round(on, 3), "take_off": round(sents[qb]["off"], 3),
                      "native_gap": sents[qb]["gap_after"] if qb + 1 < len(sents) else None,
                      "next_in_take": sents[qb + 1]["line"] if qb + 1 < len(sents) else None, "inner_cuts": cut_log,
                      "first_of_line": gi == 0, "last_of_line": gi == len(groups) - 1, "el_first": el_first,
                      "tag_text": tk["meta"]["text"]})
    return units


def burst_dips(y, limit):
    """clip gain on short bursts over `limit` (v6_build.py): 5 ms windows, 4 ms raised-cosine ramps; refused (None)
    when the overshoot is longer than 20 ms or needs more than DIP_MAX"""
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
        shape = np.zeros(len(y))
        shape[k:k + hop] = 1.0
        a = n[max(0, k - ramp):k]
        shape[a] = 0.5 - 0.5 * np.cos(np.pi * (a - (k - ramp)) / ramp)
        b = n[k + hop:min(len(y), k + hop + ramp)]
        shape[b] = 0.5 + 0.5 * np.cos(np.pi * (b - (k + hop)) / ramp)
        env = np.minimum(env, 1 - (1 - gmin) * shape)
        dips.append({"at_unit_s": round(k / SR, 4), "dip_db": round(float(dd), 2), "window_ms": 5, "ramps_ms": 4})
    return y * env, dips


def finish_unit(u, target, lift=0.0):
    """gain the unit to target (+ lift) mono LUFS, keep its peak under PEAK_MAX (v6_build.py), and find its acoustic
    span at the final gain -> u['y'], pre_f, len_f, ws_f"""
    x = u["x"]
    core = x[int(u["pre"] * SR):int((u["pre"] + u["len"]) * SR)]
    lu = L.lufs(core)
    g = target + lift - lu
    y = x * 10 ** (g / 20)
    u["trim_db"], u["dips"] = 0.0, []
    pk = float(np.max(np.abs(y)))
    if pk > PEAK_MAX:
        need = 20 * np.log10(pk / PEAK_MAX) + 0.02
        if not lift and need <= TRIM_MAX:
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
    u["gain_db"], u["lufs_raw"] = round(g, 2), round(lu, 2)
    u["peak"] = round(float(np.max(np.abs(y))), 4)
    u["y"] = y
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
    u["ws_f"] = ws
    return u


def time_words(u):
    """word times of a finished unit, relative to its acoustic on (the v6_build.py method on the unit alone: whisper
    word starts snapped to the energy dip, ends at the next start or the start of a true silence; first / last word
    of every sentence on the acoustic on / off) -> [[word, s, e, sentence]]"""
    PAD = 0.30
    y = np.concatenate([np.zeros(int(PAD * SR)), u["y"], np.zeros(int(PAD * SR))])
    on = PAD + u["pre_f"]
    off = on + u["len_f"]
    env = np.sqrt(np.convolve(y ** 2, np.ones(480) / 480, "same"))[::480]
    wsf = u["ws_f"]
    flat = []
    for k, (w, a, b, q) in enumerate(wsf):
        flat.append([w, on + a, on + b, q, k == 0 or wsf[k - 1][3] != q, k == len(wsf) - 1 or wsf[k + 1][3] != q])
    a0 = on - 0.06
    hw = L.whisper(resample_poly(y, 1, 2)[int(a0 * 24000):int((off + 0.06) * 24000)])
    exp_t = [(L.norm_text(f[0])[:1] or ["?"])[0] for f in flat]
    heard = [(t, h["s"] + a0) for h in hw for t in L.norm_text(h["w"])[:1]]
    wstart = [None] * len(flat)
    for blk in SequenceMatcher(None, exp_t, [h[0] for h in heard], autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            wstart[blk.a + k] = heard[blk.b + k][1]

    def snap(c, lo, hi_word):
        j = int(round(c / FL))
        a = max(int(round(lo / FL)), j - 12)
        b = min(len(env) - 1, j + 3)
        if b <= a:
            return c
        k = a + int(np.argmin(env[a:b + 1]))
        if env[k] < SIL:
            while k + 1 < len(env) and env[k + 1] < SIL and (k + 1) * FL < hi_word:
                k += 1
            k += 1
        return k * FL

    for i, f in enumerate(flat):
        if f[4]:
            continue
        c = min(wstart[i], f[1]) if wstart[i] is not None else f[1]
        f[1] = snap(c, flat[i - 1][1] + 0.08, max(f[2], c + 0.25))
    d_fin = L.db_frames(y)
    for i, f in enumerate(flat):
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
    u["whisper_matched"] = sum(1 for v in wstart if v is not None)
    return [[f[0], round(f[1] - on, 4), round(f[2] - on, 4), f[3]] for f in flat]


def word_stats(u, words):
    """per word of a finished unit: duration, level (dB RMS and the loudest 100 ms, both against the unit's own
    loudness), f0 median / max, and the f0 of its first and last third"""
    y = u["y"]
    on = u["pre_f"]
    T, F = L.f0_track(y)
    lu = L.lufs(y[int(on * SR):int((on + u["len_f"]) * SR)])
    out = []
    for w, s, e, q in words:
        seg = y[int((on + s) * SR):int((on + e) * SR)]
        rms = 10 * np.log10(np.mean(seg ** 2) + 1e-12)
        win = int(0.1 * SR)
        if len(seg) > win:
            c = np.concatenate([[0.0], np.cumsum(seg ** 2)])
            st = 10 * np.log10(np.max((c[win:] - c[:-win]) / win) + 1e-12)
        else:
            st = rms
        k = np.where((T >= on + s) & (T <= on + e) & ~np.isnan(F))[0]
        f = F[k]
        if len(f) >= 3:
            med = float(np.median(f))
            f = f[(f > med / 1.9) & (f < med * 1.9)]
            n3 = max(1, len(f) // 3)
            fs = {"f0_med": round(float(np.median(f)), 1), "f0_max": round(float(np.percentile(f, 95)), 1),
                  "f0_first": round(float(np.median(f[:n3])), 1), "f0_last": round(float(np.median(f[-n3:])), 1)}
        else:
            fs = {"f0_med": None, "f0_max": None, "f0_first": None, "f0_last": None}
        out.append({"w": w, "s": round(s, 3), "e": round(e, 3), "dur": round(e - s, 3), "rms_db": round(float(rms), 1),
                    "rms_vs_unit": round(float(rms - lu), 1), "loud100_vs_unit": round(float(st - lu), 1), **fs})
    return out


def edge_pitch(u):
    """median f0 of the first and the last 250 ms of VOICED sound in the unit, and the unit median"""
    y = u["y"]
    T, F = L.f0_track(y)
    k = np.where((T >= u["pre_f"]) & (T <= u["pre_f"] + u["len_f"]) & ~np.isnan(F))[0]
    f = F[k]
    if len(f) < 10:
        return None
    med = float(np.median(f))
    f = f[(f > med / 1.9) & (f < med * 1.9)]
    return {"start_hz": round(float(np.median(f[:25])), 1), "end_hz": round(float(np.median(f[-25:])), 1), "med_hz": round(med, 1),
            "p90_hz": round(float(np.percentile(f, 90)), 1), "range_st": round(float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))), 1)}


def st(a, b):
    """semitones from a to b"""
    return round(float(12 * np.log2(b / a)), 1)
