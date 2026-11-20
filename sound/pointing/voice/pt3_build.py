"""Assemble the "pointing" voice, SCRIPT v3 -> <out>/voice.wav (48 kHz stereo 24-bit), words.json (caption tokens),
words_spoken.json (one entry per spoken word), phrases.json (one entry per voiced row, v3 line ids), captions.json (the
script's own 1-3 word caption chunks with their times), _build.json, stems/ (dialogue / laughs / phone, sample-aligned).
The method is pt_build.py's (the clown v6 method): gains only, every cut inside true silence, no stretch, no pitch
shift, no dynamics processing. New in v3:
 - lines come from script_v3/voice_lines_v3.json (ids v3_*), takes from takes/picks_v3.json. A REUSED v1 take is loaded
   by its path and cut span, and the transcript of that cut is compared with `expected_words` before it is used
   (cast_d/masaki1 holds three calls: only the first can ever play).
 - pauses come from pt_timing_v3.json (SCRIPT_v3 4.2). A pause inside a line can be SET (cut down, or true silence
   added in its middle): the held beat of a call, the 1.00 s cutaway after "looking...", "Doors... / ...closed!".
 - a laugh before the first word of a tourist line is kept as a pre-roll (it may sit under the tail of the line
   before); the pause is measured to his first WORD.
 - overlays, mixed after the word times are taken on the dialogue alone: the laugh-only take under the narrator
   (cut 1 to cut 2), the phone's thin replay of v3_t03 and its thin giggle bed, the giggle in the cutaway and payoff.
 - the build rule: over 66.0 s apply the script's cut order step by step; over 70.0 s refuse.

  python pt3_build.py [--out _v3] [--lines all|opening|alt] [--picks takes/picks_v3.json] [--cuts auto|0..5]
                      [--target -17.5] [--set v3_n01=v3_hook/t3,...] [--no-overlays] [--breath]"""
import json
import re
import subprocess
import sys
from difflib import SequenceMatcher

import numpy as np
from scipy.signal import butter, resample_poly, sosfiltfilt

import pt_lib as L
import pt3_lib as V

sys.stdout.reconfigure(encoding="utf-8")
SR, H = L.SR, L.H
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
TARGET_ST = float(arg("--target", -17.5))
OUT = L.HERE / arg("--out", "_v3")
SEG = arg("--lines", "all")
CUTS = arg("--cuts", "auto")
OVERLAYS = "--no-overlays" not in sys.argv
PEAK_MAX = 0.885                     # -1.06 dBFS
BASE = json.loads((L.HERE / "pt_timing_v3.json").read_text(encoding="utf-8"))
PICKS = json.loads((L.HERE / arg("--picks", "takes/picks_v3.json")).read_text(encoding="utf-8"))
for kv in [v for v in arg("--set", "").split(",") if v]:
    k, v = kv.split("=")
    PICKS["lines"][k] = v
PRE, POST, FADE = 0.030, 0.050, 0.008
INNER_MAX, INNER_TO = 0.20, 0.16
FPS = 30

ORDER0 = {"all": V.SPOKEN, "opening": ["v3_n01", "v3_n02", "v3_n03", "v3_d01", "v3_t01"],
          "alt": ["v3_a01", "v3_a02", "v3_d01", "v3_t01"]}.get(SEG) or SEG.split(",")


def pick_of(lid):
    """-> {"take": "folder/take", "span": [on, off] or None, "expected": words or None, "reused": bool}"""
    p = PICKS["lines"].get(lid)
    l = V.BY[lid]
    if p is None and l.get("reuse_v1_take"):
        rel = l["v1_take"].split("/takes/")[1][:-4]
        return {"take": rel, "span": l["v1_build_take_on_off_s"], "expected": l["expected_words"], "reused": True}
    assert p is not None, f"no pick for {lid}"
    if isinstance(p, str):
        return {"take": p, "span": None, "expected": None, "reused": False}
    return {"take": p["take"], "span": p.get("span"), "expected": p.get("expected"), "reused": bool(p.get("reused"))}


_cache = {}


def take(src):
    if src in _cache:
        return _cache[src]
    mp3 = L.TAKES / (src + ".mp3")
    pr = json.loads(mp3.with_suffix(".probe.json").read_text(encoding="utf-8"))
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    m = L.read(mp3)
    al = [w for w in L.align_words(mp3.with_suffix(".json")) if re.search(r"[A-Za-z0-9]", w[0])]     # "..." alone is not a word
    if len(al) != sum(L.nwords(s["text"]) for s in pr["sent"]):
        al = None
    _cache[src] = {"src": src, "mp3": mp3, "m": m, "probe": pr, "meta": meta, "al": al}
    return _cache[src]


def take_whisper(src):
    """whisper words of the whole take (at the probe gain), cached beside the take"""
    tk = take(src)
    f = tk["mp3"].with_suffix(".whisper.json")
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    m24 = L.read(tk["mp3"], sr=24000) * 10 ** (tk["probe"]["gain_db"] / 20)
    hw = [{"w": w["w"], "s": round(w["s"], 3), "e": round(w["e"], 3), "p": round(float(w["p"]), 3)} for w in L.whisper(m24)]
    f.write_text(json.dumps(hw, ensure_ascii=False), encoding="utf-8")
    return hw


def cut_heard(src, on, off):
    """whisper of the cut [on, off] of a take, alone (0.06 s margins) -> heard text (cached)"""
    tk = take(src)
    f = tk["mp3"].with_suffix(".cuts.json")
    c = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    key = f"{on:.3f}-{off:.3f}"
    if key not in c:
        m24 = L.read(tk["mp3"], sr=24000) * 10 ** (tk["probe"]["gain_db"] / 20)
        hw = L.whisper(m24[int(max(0, on - 0.06) * 24000):int((off + 0.06) * 24000)])
        c[key] = {"heard": " ".join(w["w"] for w in hw), "p": [[w["w"], round(float(w["p"]), 3)] for w in hw]}
        f.write_text(json.dumps(c, ensure_ascii=False), encoding="utf-8")
    return c[key]


def first_word_onset(tk, on, off, k0, word):
    """a tourist line that starts with a laugh: the onset of its first WORD in the take (the earlier of whisper's and
    ElevenLabs' start, both run late, snapped to the energy dip before it). -> take time, or `on` when no laugh leads"""
    hw = take_whisper(tk["src"])
    want = (L.norm_text(word)[:1] or ["?"])[0]
    cand = [h["s"] for h in hw if (L.norm_text(h["w"])[:1] or [""])[0] == want and on - 0.05 <= h["s"] <= off]
    el = tk["al"][k0][1] if tk["al"] else None
    v = [x for x in (cand[0] if cand else None, el) if x is not None]
    if not v:
        return on, "no word time"
    c = min(v)
    if c - on < 0.15:
        return on, "no laugh before the word"
    g = 10 ** (tk["probe"]["gain_db"] / 20)
    env = np.sqrt(np.convolve((tk["m"] * g) ** 2, np.ones(480) / 480, "same"))[::480]      # 10 ms RMS
    j = int(round(c / 0.01))
    a, b = max(int(round((on + 0.08) / 0.01)), j - 12), min(len(env) - 1, j + 3)
    if b <= a:
        return c, "no window"
    k = a + int(np.argmin(env[a:b + 1]))
    sil = 10 ** (-45 / 20)
    if env[k] < sil:
        while k + 1 < len(env) and env[k + 1] < sil and (k + 1) * 0.01 < c + 0.25:
            k += 1
        k += 1
    return k * 0.01, f"whisper {cand[0] if cand else None}, elevenlabs {el}, dip at {k * 0.01:.2f}"


def make_units(cfg, order):
    inner_set, inner_keep = cfg.get("inner_set", {}), set(cfg.get("inner_keep", []))
    pre_keep = cfg.get("pre_keep_s", {})
    units, notes = [], []
    for lid in order:
        pk = pick_of(lid)
        tk = take(pk["take"])
        pr, m = tk["probe"], tk["m"]
        g_probe = 10 ** (pr["gain_db"] / 20)
        d = L.db_frames(m * g_probe)
        sents = pr["sent"]
        k0, sw, sk0 = 0, [], []
        for s in sents:
            n = L.nwords(s["text"])
            sw.append(tk["al"][k0:k0 + n] if tk["al"] else None)
            sk0.append(k0)
            k0 += n
        if pk["span"]:
            mine = [q for q, s in enumerate(sents) if s["on"] >= pk["span"][0] - 0.03 and s["off"] <= pk["span"][1] + 0.03]
        else:
            mine = [q for q, s in enumerate(sents) if s["line"] == lid]
        assert mine, (lid, pk)
        if pk["expected"]:                         # a reused v1 take: the cut must say exactly the expected words
            h = cut_heard(pk["take"], sents[mine[0]]["on"], sents[mine[-1]]["off"])
            dd = L.word_diff(pk["expected"], h["heard"])
            notes.append({"line": lid, "take": pk["take"], "span": [sents[mine[0]]["on"], sents[mine[-1]]["off"]], "expected": pk["expected"],
                          "heard": h["heard"], "diff": dd})
            heard_w, exp_w = set(L.norm_text(h["heard"])), set(L.norm_text(pk["expected"]))
            # a word of ANOTHER line in the cut (masaki1: "speed", "check") stops the build; a mis-hearing is reported and fails the verify gate
            assert not ({"speed", "check"} & (heard_w - exp_w)), f"REUSED TAKE {pk['take']} cut says {h['heard']!r}, expected {pk['expected']!r}"
            if dd:
                print(f"!! reused take {pk['take']} cut {sents[mine[0]]['on']}-{sents[mine[-1]]['off']}: whisper heard {h['heard']!r}, expected {pk['expected']!r}")
        want_words = V.TEXT[lid].split()
        assert sum(L.nwords(sents[q]["text"]) for q in mine) == len(want_words), (lid, [sents[q]["text"] for q in mine])
        groups = [[mine[0]]]
        for q in mine[1:]:
            if (sents[q - 1]["gap_after"] or 0) < 0.03:
                groups[-1].append(q)
            else:
                groups.append([q])
        wi = 0
        for gi, grp in enumerate(groups):
            on, off = sents[grp[0]]["on"], sents[grp[-1]]["off"]
            qa, qb = grp[0], grp[-1]
            on_first_sound = on
            pre_roll = 0.0
            why_on = None
            if lid in pre_keep and gi == 0:
                if qa == 0:
                    on_first_sound = min(on, pr["lead_s"] + 0.005)
                w_on, why_on = first_word_onset(tk, on_first_sound, off, sk0[qa], want_words[0])
                if w_on - on_first_sound >= 0.10:              # a laugh leads: the unit is anchored on the word
                    pre_roll = min(pre_keep[lid], w_on - on_first_sound)
                    on = w_on
                else:
                    on = max(on, on_first_sound) if not pr.get("pre_extra") else on
            sil_before = (on - sents[qa - 1]["off"]) if qa > 0 else on
            sil_after = (sents[qb + 1]["on"] - off) if qb + 1 < len(sents) else len(m) / SR - off
            if pre_roll:
                pre = pre_roll
            else:
                pre = max(0.0, min(PRE, sil_before / 2 if qa > 0 else sil_before))
            post = max(0.0, min(POST, sil_after / 2 if qb + 1 < len(sents) else sil_after))
            a, b = int(round((on - pre) * SR)), int(round((off + post) * SR))
            x = m[a:b].copy()
            ws = []
            for q in grp:
                toks = want_words[wi:wi + L.nwords(sents[q]["text"])]
                wi += len(toks)
                if sw[q] is not None:
                    ws += [[t, s_ - on, e_ - on, q] for t, (_, s_, e_) in zip(toks, sw[q])]
                else:     # no usable alignment: spread the words over the sentence by character count
                    tot = sum(len(t) for t in toks)
                    t0, t1 = max(0.0, sents[q]["on"] - on), sents[q]["off"] - on
                    acc = 0
                    for t in toks:
                        ws.append([t, t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + len(t)) / tot, q])
                        acc += len(t)
            pins = {q: (max(0.0, sents[q]["on"] - on), sents[q]["off"] - on) for q in grp}
            # ---- inner silences ----
            fa, fb = int(on / H) + 4, int(off / H) - 4
            sil_runs = L.runs_below(d, fa, fb)
            rules = {}
            for rule in inner_set.get(lid, []):
                kk = [k for k, w in enumerate(ws) if w[0] == rule["after"]]
                if not kk or kk[0] + 1 >= len(ws):
                    continue
                k = kk[0]
                lo = (ws[k][1] + ws[k][2]) / 2 + on
                hi = ws[k + 1][1] + on + 0.15
                cand = [r for r in sil_runs if r[1] * H > lo and r[0] * H < hi and (r[1] - r[0]) >= 4]
                if tk["al"] is None or not cand:          # no word times to place it by: the longest silence of the unit
                    cand = [r for r in sil_runs if (r[1] - r[0]) >= 4]
                if cand:
                    rules[max(cand, key=lambda r: r[1] - r[0])] = rule
                else:
                    notes.append({"line": lid, "inner": rule, "result": "no true silence there: nothing to set"})
            cut_log = []
            for r in reversed(sil_runs):
                r0, r1 = r
                s_len = (r1 - r0) * H
                rule = rules.get(r)
                if rule:
                    tgt = rule["to"]
                    if rule.get("mode") == "min" and s_len >= tgt:
                        tgt = None
                    if rule.get("mode") == "max" and s_len <= tgt:
                        tgt = None
                elif lid not in inner_keep and s_len > INNER_MAX + 1e-9:
                    tgt = INNER_TO
                else:
                    tgt = None
                if tgt is None or abs(tgt - s_len) < 0.004:
                    if rule:
                        cut_log.append({"at_take_s": round(r0 * H, 3), "was_s": round(s_len, 3), "now_s": round(s_len, 3), "rule": rule})
                    continue
                mid = (r0 * H + r1 * H + 0.010) / 2 - (on - pre)
                tcut = mid - pre
                if tgt < s_len:
                    rm = s_len - tgt
                    c0, c1 = int(round((mid - rm / 2) * SR)), int(round((mid + rm / 2) * SR))
                    fl = int(0.010 * SR)
                    rr = np.linspace(0, 1, fl)
                    head, tail = x[:c0].copy(), x[c1:].copy()
                    head[-fl:] = head[-fl:] * (1 - rr) + x[c1 - fl:c1] * rr
                    x = np.concatenate([head, tail])
                    delta = -rm
                else:
                    add = tgt - s_len
                    c = int(round(mid * SR))
                    fl = int(0.005 * SR)
                    rr = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fl))
                    head, tail = x[:c].copy(), x[c:].copy()
                    head[-fl:] *= rr[::-1]
                    tail[:fl] *= rr
                    x = np.concatenate([head, np.zeros(int(round(add * SR))), tail])
                    delta = add
                for w in ws:
                    if w[1] >= tcut:
                        w[1] += delta
                    if w[2] >= tcut:
                        w[2] += delta
                for q in pins:
                    p0, p1 = pins[q]
                    pins[q] = (p0 + delta if p0 >= tcut else p0, p1 + delta if p1 >= tcut else p1)
                off += delta
                cut_log.append({"at_take_s": round(r0 * H, 3), "was_s": round(s_len, 3), "now_s": round(tgt, 3), **({"rule": rule} if rule else {})})
            dx = L.db_frames(x * g_probe)
            runs_x = [(r0 * H + 0.005 - pre, (r1 - 1) * H + 0.005 - pre) for r0, r1 in L.runs_below(dx, 0, len(dx)) if (r1 - r0) >= 4]
            ln = off - on
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
                el_first[q] = qw[0][1]
                qw[0][1], qw[-1][2] = pins[q][0], pins[q][1]
            for k in range(len(ws)):
                ws[k][1] = min(max(0.0, ws[k][1], ws[k - 1][1] + 0.03 if k else 0.0), ln - 0.03)
                if k + 1 < len(ws):
                    ws[k][2] = min(ws[k][2], ws[k + 1][1]) if ws[k + 1][3] == ws[k][3] else ws[k][2]
                ws[k][2] = min(ln, max(ws[k][2], ws[k][1] + 0.03))
            fl = int((0.060 if pre_roll and pre_roll < (on - on_first_sound) - 0.01 else FADE) * SR)
            rr = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fl))
            x[:fl] *= rr
            fl2 = int(FADE * SR)
            rr2 = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fl2))
            x[-fl2:] *= rr2[::-1]
            units.append({"line": lid, "sent_idx": grp, "texts": [" ".join(w[0] for w in ws if w[3] == q) for q in grp], "x": x, "pre": pre,
                          "len": ln, "ws": ws, "src": pk["take"], "reused": pk["reused"], "take_on": round(on, 3), "take_off": round(sents[qb]["off"], 3),
                          "native_gap": sents[qb]["gap_after"] if qb + 1 < len(sents) else None, "inner_cuts": cut_log[::-1],
                          "first_of_line": gi == 0, "last_of_line": gi == len(groups) - 1, "el_first": el_first,
                          "pre_roll": round(pre_roll, 3), "laugh_before_word_s": round(on - on_first_sound, 3) if lid in pre_keep and gi == 0 else 0.0,
                          "first_word_onset": why_on, "g_probe": g_probe})
    return units, notes


def gap_for(cfg, u, v):
    a, b = u["line"], v["line"]
    if a == b:
        g = cfg["sentence_gaps"].get(a)
        if g is None:
            g = float(np.clip(0.5 * (u["native_gap"] or 0.28), 0.13, 0.19))
        return g
    key = f"{a}|{b}"
    assert key in cfg["gaps"], f"no planned pause for {key}"
    return cfg["gaps"][key]


TRIM_MAX, DIP_MAX = 0.9, 3.0


def burst_dips(y, limit):
    hop = int(0.005 * SR)
    over = [k for k in range(0, len(y) - hop, hop) if np.max(np.abs(y[k:k + hop])) > limit]
    if not over:
        return y, []
    if len(over) * 0.005 > 0.040:          # v3: up to 40 ms (v1: 20 ms): "BAD suitcase." has a 30 ms peak 2 dB over
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
        dips.append({"at_unit_s": round(k / SR, 4), "dip_db": round(dd, 2), "window_ms": 5, "ramps_ms": 4})
    return y * env, dips


def assemble(cfg, units, target, gap_override=None):
    """target = MONO loudness of every unit. -> (gaps, mono canvas, total s)"""
    lift = cfg.get("lift_db", {})
    for u in units:
        x = u["x"]
        core = x[int(u["pre"] * SR):int((u["pre"] + u["len"]) * SR)]
        lu = L.lufs(core)
        g = target + lift.get(u["line"], 0.0) - lu
        y = x * 10 ** (g / 20)
        u["trim_db"], u["dips"] = 0.0, []
        pk = float(np.max(np.abs(y)))
        if pk > PEAK_MAX:
            need = 20 * np.log10(pk / PEAK_MAX) + 0.02
            if u["line"] not in lift and need <= TRIM_MAX:
                g -= need
                u["trim_db"] = round(-need, 2)
                y = x * 10 ** (g / 20)
            else:
                yd, dips = burst_dips(y, PEAK_MAX)
                if yd is not None:
                    y, u["dips"] = yd, dips
                else:                      # v3: this unit alone comes down (recorded; pt3_verify flags a line more than 1.5 LU off), never the whole file
                    g -= need
                    u["trim_db"] = round(-need, 2)
                    y = x * 10 ** (g / 20)
        u["gain_db"], u["lufs_raw"], u["peak"], u["y"] = round(g, 2), round(lu, 2), round(float(np.max(np.abs(y))), 4), y
        dy = L.db_frames(y)
        loud = np.where(dy > L.THR)[0]
        off2 = loud[-1] * H + 0.005
        on2 = u["pre"] if u["pre_roll"] else loud[0] * H + 0.005          # a laugh pre-roll: the anchor is the first word
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
    t = cfg["lead_s"]
    gaps = []
    for k, u in enumerate(units):
        u["on"], u["off"] = t, t + u["len_f"]
        if k + 1 < len(units):
            v = units[k + 1]
            key = f"{u['line']}|{v['line']}"
            g = (gap_override or {}).get(key, gap_for(cfg, u, v))
            g = round(g / 0.005) * 0.005
            gaps.append({"after": u["line"], "before": v["line"], "kind": "beat" if g >= 0.3 else "normal", "target_s": round(g, 3),
                         "native_s": u["native_gap"], "between": f"{u['texts'][-1].split()[-1]} | {' '.join(v['texts'][0].split()[:2])}"})
            t = u["off"] + g
    total = units[-1]["off"] + cfg["tail_s"]
    N = int(round(total * SR))
    y = np.zeros(N)
    for u in units:
        a = int(round((u["on"] - u["pre_f"]) * SR))
        seg = u["y"]
        if a < 0:
            seg, a = seg[-a:], 0
        seg = seg[:max(0, N - a)]
        y[a:a + len(seg)] += seg
    return gaps, y, total


def settle(cfg, units, gap_override=None):
    """units on the target; one more gain so the whole dialogue reads TARGET_ST; the target drops if the peak passes -1 dBFS"""
    tgt_st = TARGET_ST
    target = tgt_st - 3.01
    for attempt in range(6):
        gaps, y, total = assemble(cfg, units, target, gap_override)
        I = L.lufs(np.stack([y, y], axis=1))
        if abs(I - tgt_st) > 0.05:
            target += tgt_st - I
            gaps, y, total = assemble(cfg, units, target, gap_override)
            I = L.lufs(np.stack([y, y], axis=1))
        pk = float(np.max(np.abs(y)))
        if pk <= PEAK_MAX + 1e-4:
            break
        tgt_st -= 20 * np.log10(pk / PEAK_MAX) + 0.03
        target = tgt_st - 3.01
    return gaps, y, total, target, I, pk, tgt_st


def cfg_with_cuts(n):
    cfg = json.loads(json.dumps(BASE))
    drop, drop_replay, applied = [], False, []
    for st in BASE["cut_order"][:n]:
        cfg["gaps"].update(st.get("gaps", {}))
        cfg["sentence_gaps"].update(st.get("sentence_gaps", {}))
        cfg["inner_set"].update(st.get("inner_set", {}))
        drop += st.get("drop", [])
        drop_replay = drop_replay or st.get("drop_replay", False)
        applied.append(f"{st['step']}: {st['what']}")
    return cfg, drop, drop_replay, applied


# ================================================================ 1. the dialogue chain (with the build rule)
LIM = BASE["limits"]
tried = []
for ncut in (range(0, len(BASE["cut_order"]) + 1) if CUTS == "auto" else [int(CUTS)]):
    cfg, DROP, DROP_REPLAY, APPLIED = cfg_with_cuts(ncut)
    order = [i for i in ORDER0 if i not in DROP]
    units, reuse_notes = make_units(cfg, order)
    GO = {}
    if SEG == "all" and not DROP_REPLAY:       # the pause after "phone." holds the replay: (replay length - overlap) + 0.08 s
        t3 = [u for u in units if u["line"] == "v3_t03"]
        rp = cfg["replay"]
        GO["v3_n11|v3_n12"] = max(0.3, sum(u["len"] for u in t3) - rp["overlap_s"] + rp["then_s"])
    gaps, dlg, total, target, I, pk, tgt_st = settle(cfg, units, GO)
    tried.append({"cut_steps": ncut, "duration_s": round(total, 3)})
    print(f"cut steps {ncut}: duration {total:.3f} s")
    if SEG != "all" or total <= LIM["apply_cut_order_over_s"]:
        break
if SEG == "all" and total > LIM["refuse_over_s"]:
    sys.exit(f"REFUSED: the assembly is {total:.2f} s (> {LIM['refuse_over_s']} s) even with the cut order")
if SEG == "all" and total > LIM["apply_cut_order_over_s"]:
    print(f"!! still {total:.2f} s after {ncut} cut steps")

# ================================================================ 2. word times on the dialogue alone
env = np.sqrt(np.convolve(dlg ** 2, np.ones(480) / 480, "same"))[::480]          # 10 ms RMS envelope
FL = 0.01
SIL = 10 ** (-45 / 20)


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


def word_times(units, dlg):
    flat = []                                     # [word, s, e, (unit, sentence), first?, last?]
    for ui, u in enumerate(units):
        wsf = u["ws_f"]
        for k, (w, a, b, q) in enumerate(wsf):
            flat.append([w, u["on"] + a, u["on"] + b, (ui, q), k == 0 or wsf[k - 1][3] != q, k == len(wsf) - 1 or wsf[k + 1][3] != q])
    el_start = [f[1] for f in flat]
    y24 = resample_poly(dlg, 1, 2)
    wstart = [None] * len(flat)
    wprob = [None] * len(flat)
    fi0 = 0
    cf = L.TAKES / "_unit_whisper_cache.json"
    WC = json.loads(cf.read_text(encoding="utf-8")) if cf.exists() else {}
    for ui, u in enumerate(units):
        n_u = len(u["ws_f"])
        a0 = max(0.0, u["on"] - 0.06)
        # the unit cut out alone: the same audio every build (only its gain moves), so the pass is cached by the cut it came from
        key = "|".join([u["src"], str(u["take_on"]), str(u["take_off"]), json.dumps(u["inner_cuts"], sort_keys=True), str(u["pre_roll"]), u["line"]])
        if key not in WC:
            hw = L.whisper(y24[int(a0 * 24000):int((u["off"] + 0.06) * 24000)])
            WC[key] = [[h["w"], round(float(h["s"] + a0 - u["on"]), 4), round(float(h["p"]), 4)] for h in hw]
            cf.write_text(json.dumps(WC, ensure_ascii=False), encoding="utf-8")
        exp_t = [(L.norm_text(f[0])[:1] or ["?"])[0] for f in flat[fi0:fi0 + n_u]]
        heard = [(t, s_ + u["on"], p_) for w_, s_, p_ in WC[key] for t in L.norm_text(w_)[:1]]
        for blk in SequenceMatcher(None, exp_t, [h[0] for h in heard], autojunk=False).get_matching_blocks():
            for k in range(blk.size):
                wstart[fi0 + blk.a + k] = heard[blk.b + k][1]
                wprob[fi0 + blk.a + k] = round(float(heard[blk.b + k][2]), 3)
        fi0 += n_u
    moved = []
    d_pin = L.db_frames(dlg)
    for i, f in enumerate(flat):
        if f[4]:                                   # first word of a sentence: the acoustic on (or the word anchor after a laugh)
            continue
        c = min(wstart[i], f[1]) if wstart[i] is not None else f[1]
        # HANDOVER FIX (2026-11-20, written but NOT yet run): the first word after a true silence >= 0.10 s inside a line starts
        # where that silence ends (the held beat of a call: whisper and ElevenLabs both put "green!" 0.1-0.26 s late, at 6.53 /
        # 6.68 s, while the sound starts at 6.42 s). Same result as before for every other call ("closed!", "check!", "gone.").
        # (2026-11-20 fix of the fix: the search window must run PAST the estimate, or a silence that is still going on at the
        # estimate is cut at the window's edge and the word lands inside the silence: "closed!" 58.505 s for a sound at 58.68 s)
        pin = [r for r in L.runs_below(d_pin, int((flat[i - 1][1] + 0.03) / H), int((c + 0.40) / H))
               if (r[1] - r[0]) * H >= 0.10 and r[0] * H <= c + 0.03]
        if pin and flat[i - 1][3][0] == f[3][0]:
            ns = pin[-1][1] * H + 0.005
            if abs(ns - f[1]) > 0.06:
                moved.append((f[0], round(f[1], 3), round(ns, 3), "end of the true silence before it"))
            f[1] = ns
            continue
        ns = snap(c, flat[i - 1][1] + 0.08, max(f[2], c + 0.25))
        if abs(ns - f[1]) > 0.06:
            moved.append((f[0], round(f[1], 3), round(ns, 3), "whisper+energy" if wstart[i] is not None else "energy"))
        f[1] = ns
    # 2026-11-20: hand-measured onsets inside connected speech (pt_timing_v3.json "word_onsets_measured"; see its _doc)
    WOM = cfg.get("word_onsets_measured", {})
    k_in_line, seen_line = {}, {}
    for i, f in enumerate(flat):
        ui = f[3][0]
        lid = units[ui]["line"]
        first_ui = seen_line.setdefault(lid, ui)
        k = k_in_line.get(lid, 0)
        k_in_line[lid] = k + 1
        off = WOM.get(lid, {}).get(str(k))
        if off is None:                # (2026-11-20 body pass: any unit of the line; k == 0 allowed after a laugh pre-roll)
            continue
        ns = units[ui]["on"] + off
        if abs(ns - f[1]) <= 0.25:
            moved.append((f[0], round(f[1], 3), round(ns, 3), "measured onset (pt_timing_v3 word_onsets_measured)"))
            f[1] = ns
        else:
            print(f"!! measured onset of {lid} word {k} '{f[0]}' ({ns:.3f}) is {ns - f[1]:+.3f} s from the build's {f[1]:.3f}: NOT applied (takes changed?)")
    d_fin = L.db_frames(dlg)
    for i, f in enumerate(flat):                   # ends: the next start, or the start of the true silence before it
        if f[5]:
            continue
        nxt = flat[i + 1][1]
        # v1 bug fixed: a 40 ms stop closure inside a word ended it ("Speed" at its /p/). A word now ends at a silence
        # only if that silence is >= 0.10 s, or it runs right up to the next word (>= 40 ms)
        rr = [r for r in L.runs_below(d_fin, int((f[1] + 0.03) / H), int(nxt / H) + 2)
              if (r[1] - r[0]) * H >= 0.10 or ((r[1] - r[0]) >= 8 and r[1] * H >= nxt - 0.02)]
        f[2] = (rr[-1][0] * H + 0.005) if rr else nxt
    for i, f in enumerate(flat):
        if i:
            f[1] = max(f[1], flat[i - 1][1] + 0.03, flat[i - 1][2] if flat[i - 1][3] != f[3] else 0.0)
        f[2] = max(f[2], f[1] + 0.03)
        if i + 1 < len(flat) and flat[i + 1][3] == f[3]:
            f[2] = min(f[2], max(f[1] + 0.03, flat[i + 1][1]))
    dev = [abs(f[1] - e) for f, e in zip(flat, el_start)]
    wt = {"method": "whisper (finished dialogue) word starts snapped to the 10 ms energy onset; sentence-first / last words pinned to the "
                    "acoustic on / off; the first word after a laugh pre-roll = the energy dip before whisper's / ElevenLabs' start in the take",
          "moved_over_60ms": len(moved), "n_words": len(flat), "whisper_matched": sum(1 for v in wstart if v is not None),
          "vs_elevenlabs_times": {"median_abs_s": round(float(np.median(dev)), 3), "over_0.2s": int(sum(1 for v in dev if v > 0.2))}, "moves": moved}
    return flat, wt, wprob


flat, WORD_TIMING, wprob = word_times(units, dlg)


def shift_from(ui0, delta):
    """move every unit from index ui0 on by delta seconds (silence added / removed in a planned pause) and re-lay the canvas"""
    global dlg, total
    for ui, u in enumerate(units):
        if ui >= ui0:
            u["on"] += delta
            u["off"] += delta
    for f in flat:
        if f[3][0] >= ui0:
            f[1] += delta
            f[2] += delta
    gaps[ui0 - 1]["target_s"] = round(gaps[ui0 - 1]["target_s"] + delta, 3)
    gaps[ui0 - 1]["kind"] = "beat" if gaps[ui0 - 1]["target_s"] >= 0.3 else "normal"
    total = units[-1]["off"] + cfg["tail_s"]
    N = int(round(total * SR))
    y = np.zeros(N)
    for u in units:
        a = int(round((u["on"] - u["pre_f"]) * SR))
        seg = u["y"]
        if a < 0:
            seg, a = seg[-a:], 0
        seg = seg[:max(0, N - a)]
        y[a:a + len(seg)] += seg
    dlg = y


def word(lid, w, nth=0):
    ui = [k for k, u in enumerate(units) if u["line"] == lid]
    c = [f for f in flat if f[3][0] in ui and f[0] == w]
    return c[nth] if len(c) > nth else None


# ---- the deadpan's breath: the pause before "He is not." may be 0.20 s when "not" still starts by 2.60 s (script 1.2)
BREATH = None
if "v3_n02" in order and cfg.get("n01_breath"):
    nb = cfg["n01_breath"]
    w_not, w_fin = word("v3_n02", "not."), word("v3_n03", "finger.")
    add = nb["to"] - cfg["gaps"]["v3_n01|v3_n02"]
    if w_not and w_fin and add > 0 and w_not[1] + add <= nb["if_not_starts_by"] and w_fin[1] + add <= nb["and_finger_starts_by"] and "--breath" in sys.argv:
        shift_from(next(k for k, u in enumerate(units) if u["line"] == "v3_n02"), add)
        BREATH = {"applied": True, "pause_s": nb["to"], "not_starts_s": round(w_not[1], 3), "finger_starts_s": round(w_fin[1], 3)}
    else:
        BREATH = {"applied": False, "pause_s": cfg["gaps"]["v3_n01|v3_n02"], "not_would_start_s": round(w_not[1] + add, 3) if w_not else None,
                  "finger_would_start_s": round(w_fin[1] + add, 3) if w_fin else None,
                  "note": "the lead's gate is measured with the pauses at 0.15 s, and the film ships that way; the script's optional 0.20 s "
                          "breath before 'He is not.' is one flag away (--breath) when both 'would start' times are inside its limits"}

# ---- the phone's replay: only its first word may sit under "phone." (script 2.3)
REPLAY = None
if SEG == "all" and not DROP_REPLAY:
    rp = cfg["replay"]
    ui_t3 = [k for k, u in enumerate(units) if u["line"] == "v3_t03"]
    t3w = [f for f in flat if f[3][0] in ui_t3]
    t3_on, t3_off = units[ui_t3[0]]["on"], units[ui_t3[-1]]["off"]
    first_len = t3w[1][1] - t3w[0][1]                         # "What's" up to the start of "a"
    ov = min(rp["overlap_s"], first_len)
    ui_n12 = next(k for k, u in enumerate(units) if u["line"] == "v3_n12")
    n11_off = units[ui_n12 - 1]["off"]
    want_gap = (t3_off - t3_on) - ov + rp["then_s"]
    have = units[ui_n12]["on"] - n11_off
    if abs(want_gap - have) > 0.004:
        shift_from(ui_n12, round((want_gap - have) / 0.005) * 0.005)
    r_on = n11_off - ov
    REPLAY = {"on": r_on, "off": r_on + (t3_off - t3_on), "overlap_with_phone_s": round(ov, 3), "first_word_len_s": round(first_len, 3),
              "words": [[f[0], r_on + f[1] - t3w[0][1], r_on + f[2] - t3w[0][1]] for f in t3w]}

if SEG == "all" and total > LIM["apply_cut_order_over_s"] + 1e-6 and CUTS == "auto":
    print(f"!! {total:.3f} s after the pause adjustments: over {LIM['apply_cut_order_over_s']} s (re-run with --cuts {ncut + 1})")

# ================================================================ 3. overlays (laugh-only takes, the phone)
N = len(dlg)
lau, pho = np.zeros(N), np.zeros(N)
EXTRAS = []


def bandpass(x, lo, hi):
    return sosfiltfilt(butter(4, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def laugh_piece(name):
    p = PICKS.get(name)
    if not p:
        return None, None
    m = L.read(L.TAKES / (p["take"] + ".mp3"))
    a, b = p.get("span", [0.0, len(m) / SR])
    return m[int(a * SR):int(b * SR)].copy(), p


def lay(dst, piece, t0, t1, level_mono, fade_in=0.03, fade_out=0.03, loop_gap=0.25, band=None, offset=0.0):
    """lay `piece` (tiled with loop_gap of silence when it is shorter) on dst over [t0, t1] at the mono loudness `level_mono`"""
    if piece is None or t1 - t0 < 0.08:
        return None
    src = bandpass(piece, *band) if band else piece
    g = 10 ** ((level_mono - L.lufs(src)) / 20)
    n = int(round((t1 - t0) * SR))
    buf = np.zeros(n)
    k, first = 0, True
    start = int(offset * SR)
    while k < n:
        seg = src[start:] if first else src
        seg = seg[:n - k].copy()
        if not first or start:                       # a tiled copy comes in softly
            fl = min(len(seg), int(0.04 * SR))
            seg[:fl] *= np.linspace(0, 1, fl)
        if len(seg) < n - k:                         # the piece ends inside the window: soft end
            fl = min(len(seg), int(0.04 * SR))
            seg[-fl:] *= np.linspace(1, 0, fl)
        buf[k:k + len(seg)] = seg
        k += len(seg) + int(loop_gap * SR)
        first = False
    fi, fo = min(n, int(fade_in * SR)), min(n, int(fade_out * SR))
    buf[:fi] *= np.linspace(0, 1, fi)
    buf[-fo:] *= np.linspace(1, 0, fo)
    a = int(round(t0 * SR))
    buf = buf[:max(0, len(dst) - a)]
    dst[a:a + len(buf)] += buf * g
    return {"s": round(t0, 3), "e": round(t1, 3), "gain_db": round(20 * np.log10(g), 2), "level_mono_lufs": round(level_mono, 2)}


if OVERLAYS and SEG in ("all", "opening"):
    lz = cfg["laughs"]
    x01, p01 = laugh_piece("x01")
    x02, p02 = laugh_piece("x02")
    if x02 is None:
        x02, p02 = x01, p01
    w_not, w_fin = word("v3_n02", "not."), word("v3_n03", "finger.")
    if x01 is not None and w_not and w_fin:
        cut1 = w_not[2] + 0.08
        cut2 = w_fin[1] - 1 / FPS
        r = lay(lau, x01, cut1, cut2, target + lz["hook"]["under_narrator_db"], fade_in=0.02, fade_out=0.02)
        if r:
            EXTRAS.append({"id": "v3_x01", "use": "hook: his laugh under the narrator, cut 1 to cut 2", "speaker": "T", "take": p01["take"], **r,
                           "cut1_s": round(cut1, 3), "cut2_s": round(cut2, 3), "under_narrator_db": lz["hook"]["under_narrator_db"]})
    if SEG == "all":
        n11 = [u for u in units if u["line"] == "v3_n11"]
        if x01 is not None and n11:
            t0 = n11[0]["on"] - 0.20
            t1 = REPLAY["on"] if REPLAY else n11[-1]["off"]
            pb = lz["phone_bed"]
            r = lay(pho, x01, t0, t1, target + pb["under_narrator_db"], fade_in=0.05, fade_out=0.08, band=pb["band_hz"])
            if r:
                EXTRAS.append({"id": "v3_x01", "use": "his phone's speaker under v3_n11: a wordless laugh, thin", "speaker": "T (phone)", "take": p01["take"], **r,
                               "under_narrator_db": pb["under_narrator_db"], "band_hz": pb["band_hz"]})
        w_look, w_when = word("v3_n13", "looking..."), word("v3_n13", "when")
        if x02 is not None and w_look and w_when:
            cw = lz["cutaway"]
            r = lay(lau, x02, w_look[2] + cw["margin_s"], w_when[1] - cw["margin_s"], target + cw["under_narrator_db"], fade_in=0.03, fade_out=0.06)
            if r:
                EXTRAS.append({"id": "v3_x02", "use": "the cutaway v3_p02 (the pause after 'looking...'): his giggle", "speaker": "T", "take": p02["take"], **r,
                               "under_narrator_db": cw["under_narrator_db"]})
        d3, w_chk = [u for u in units if u["line"] == "v3_d03"], word("v3_k01", "check!")
        if x02 is not None and d3 and w_chk:
            pw = lz["payoff"]
            r = lay(lau, x02, d3[0]["on"] - 0.15, w_chk[1], target + pw["under_narrator_db"], fade_in=0.05, fade_out=0.12, loop_gap=0.35)
            if r:
                EXTRAS.append({"id": "v3_x02", "use": "the payoff shot: he giggles at his phone, back to the train, until the kid's 'check!'", "speaker": "T",
                               "take": p02["take"], **r, "under_narrator_db": pw["under_narrator_db"]})
    if REPLAY:
        rp = cfg["replay"]
        ui_t3 = [k for k, u in enumerate(units) if u["line"] == "v3_t03"]
        a = int(round(units[ui_t3[0]]["on"] * SR))
        b = int(round((units[ui_t3[-1]]["off"] + 0.05) * SR))
        src = dlg[a:b].copy()
        fl = int(0.012 * SR)
        src[:fl] *= np.linspace(0, 1, fl)
        src[-fl:] *= np.linspace(1, 0, fl)
        thin = bandpass(src, *rp["band_hz"])
        g = 10 ** ((target + rp["under_narrator_db"] - L.lufs(thin)) / 20)
        a2 = int(round(REPLAY["on"] * SR))
        thin = thin[:max(0, N - a2)]
        pho[a2:a2 + len(thin)] += thin * g
        REPLAY.update({"gain_db": round(20 * np.log10(g), 2), "under_narrator_db": rp["under_narrator_db"], "band_hz": rp["band_hz"],
                       "source": "the v3_t03 unit of this build, band-passed"})

mix = dlg + lau + pho
pk_mix = float(np.max(np.abs(mix)))
if pk_mix > PEAK_MAX:                         # an overlay pushed a peak over: the overlays come down, never the dialogue
    for _ in range(12):
        lau *= 0.89
        pho *= 0.89
        mix = dlg + lau + pho
        if float(np.max(np.abs(mix))) <= PEAK_MAX:
            break
    pk_mix = float(np.max(np.abs(mix)))
I_mix = L.lufs(np.stack([mix, mix], axis=1))
print(f"dialogue: peak {pk:.3f}  stereo lufs {I:.2f}   with overlays: peak {pk_mix:.3f} ({20 * np.log10(pk_mix):.2f} dBFS)  lufs {I_mix:.2f}   duration {total:.3f}")

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "stems").mkdir(exist_ok=True)


def wav(path, y):
    st = np.stack([y, y], axis=1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(path)],
                   input=st.astype(np.float32).tobytes(), check=True)


wav(OUT / "voice.wav", mix)
wav(OUT / "stems" / "dialogue.wav", dlg)
wav(OUT / "stems" / "laughs.wav", lau)
wav(OUT / "stems" / "phone.wav", pho)

# ================================================================ 4. words, phrases, captions
spoken, disp, phrases, caps = [], [], [], []
rows = []                 # (line id, [word dicts])
for lid in order:
    ui = [k for k, u in enumerate(units) if u["line"] == lid]
    ws = [{"w": f[0], "s": round(f[1], 3), "e": round(f[2], 3)} for f in flat if f[3][0] in ui]
    toks = V.TEXT[lid].split()
    assert [w["w"] for w in ws] == toks, (lid, [w["w"] for w in ws], toks)
    rows.append((lid, ws, False))
    if lid == "v3_n11" and REPLAY:
        rows.append(("v3_r01", [{"w": w, "s": round(s, 3), "e": round(e, 3)} for w, s, e in REPLAY["words"]], True))
for a, b in zip(flat, flat[1:]):
    assert b[1] >= a[2] - 1e-6 and a[2] > a[1], (a, b)
prev_end = 0.0
for i, (lid, ws, phone) in enumerate(rows):
    markup, chunks = V.caption_markup(lid)
    hidden = set(V.hidden_words(lid))
    for k, w in enumerate(ws):
        spoken.append({**w, "id": lid, **({"from_phone": True} if phone else {})})
    # caption tokens: never before the caption token in front has ended (the replay's first word sits under "phone.")
    cw = [dict(w) for w in ws]
    if phone:                                  # the replay's first word sits under "phone.": its caption waits for that caption to end
        t_free = prev_end + 0.03               # 0.03 s clear of "phone.": gen_words_ts.py files a word by its middle
        for w in cw:
            w["s"] = round(max(w["s"], t_free), 3)
            w["e"] = round(max(w["e"], w["s"] + 0.04), 3)
            t_free = w["e"]
    k = 0
    for mm in re.finditer(r"\{([^|}]*)\|([^}]*)\}|(\S+)", markup):
        if mm.group(3) is not None:
            disp.append({"w": cw[k]["w"], "s": cw[k]["s"], "e": cw[k]["e"]})
            k += 1
        else:
            n = len(mm.group(2).split())
            disp.append({"w": mm.group(1), "s": cw[k]["s"], "e": cw[k + n - 1]["e"]})
            k += n
    assert k == len(ws), lid
    prev_end = disp[-1]["e"]
    phrases.append({"i": i, "id": lid, "speaker": V.SPEAKER[lid], "beat": V.SECTION[lid], "s": ws[0]["s"], "e": ws[-1]["e"], "markup": markup,
                    "style": "phone" if phone else ("small" if lid == "v3_t07" else None), "text": V.TEXT[lid],
                    **({"from_phone": True, "caption_s": cw[0]["s"]} if phone else {})})
    for text, idx in chunks:
        if idx:
            caps.append({"text": text, "s": cw[idx[0]]["s"], "e": cw[idx[-1]]["e"], "f": round(cw[idx[0]]["s"] * FPS), "fe": round(cw[idx[-1]]["e"] * FPS),
                         "id": lid, "speaker": V.SPEAKER[lid], "caps": V.SPEAKER[lid] != "N" and lid != "v3_t07",
                         **({"phone_pictogram": True, "size": 0.8} if phone else {}), **({"size": 0.7} if lid == "v3_t07" else {})})
    if hidden:
        caps[-1 if not chunks else -len([c for c in chunks if c[1]])]["hidden_words"] = [ws[h]["w"] for h in sorted(hidden)]
for a, b in zip(disp, disp[1:]):
    assert b["s"] >= a["e"] - 1e-6, ("caption tokens overlap", a, b)

W = lambda name, obj: (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
W("words.json", disp)
W("words_spoken.json", spoken)
W("phrases.json", phrases)
W("captions.json", {"_doc": "the script's own caption chunks (SCRIPT_v3 5.5 / voice_lines_v3.json `caption`) with their times from this voice: "
                            "1-3 words, CAPS for character lines, sentence case for the narrator, 'bag... gone.' small. `hidden_words` = spoken "
                            "words the caption does not show (the 'is' of the first sentence: it IS a token of words.json, for the lip-sync and "
                            "the beats).", "fps": FPS, "chunks": caps})
total = round(total, 3)
W("_build.json", {
    "script": "sound/pointing/SCRIPT_v3.md (LOCKED 2026-11-19)", "lines_json": "sound/pointing/script_v3/voice_lines_v3.json", "segment": SEG,
    "target_stereo_lufs": round(tgt_st, 2), "dialogue_stereo_lufs": round(I, 2), "stereo_lufs": round(I_mix, 2), "peak": round(pk_mix, 4),
    "dialogue_peak": round(pk, 4), "unit_target_mono_lufs": round(target, 2), "duration_s": total, "lead_s": cfg["lead_s"], "tail_s": cfg["tail_s"],
    "build_rule": {"tried": tried, "cut_steps_applied": APPLIED, "dropped_lines": DROP, "replay_dropped": DROP_REPLAY, **LIM},
    "timing_plan": cfg, "lift_db": cfg.get("lift_db", {}), "inner_rule": {"max_s": INNER_MAX, "cut_to_s": INNER_TO},
    "deadpan_breath": BREATH,
    "reused_take_checks": reuse_notes,
    "units": [{"line": u["line"], "sentences": u["texts"], "take": u["src"], "reused_v1_take": u["reused"], "take_on": u["take_on"], "take_off": u["take_off"],
               "on": round(u["on"], 3), "off": round(u["off"], 3), "gain_db": u["gain_db"], "lufs_before_gain_mono": u["lufs_raw"],
               "peak_trim_db": u["trim_db"], "plosive_dips": u["dips"], "peak": u["peak"], "inner_cuts": u["inner_cuts"],
               "laugh_pre_roll_s": u["pre_roll"], "laugh_before_word_in_take_s": u["laugh_before_word_s"], "first_word_onset": u["first_word_onset"]}
              for u in units],
    "gaps": gaps, "extras": EXTRAS,
    "replay": ({k: (round(v, 3) if isinstance(v, float) else v) for k, v in REPLAY.items() if k != "words"} if REPLAY else None),
    "stems": {"dialogue": "stems/dialogue.wav (the spoken lines only: word times, gaps and gates are measured on it)",
              "laughs": "stems/laughs.wav (the laugh-only takes, at their mix level)", "phone": "stems/phone.wav (the thin replay + the thin laugh bed)",
              "sum": "voice.wav = dialogue + laughs + phone, sample for sample"},
    "word_timing": WORD_TIMING, "word_p_whisper": [[f[0], p] for f, p in zip(flat, wprob)]})
print(f"{len(spoken)} spoken words, {len(disp)} caption tokens, {len(phrases)} phrases, {len(caps)} caption chunks; first word {spoken[0]['s']:.3f}, "
      f"last word end {max(w['e'] for w in spoken):.3f}; total {total:.3f} s; cut steps {APPLIED or 'none'}")
for g in gaps:
    print(f"  {g['after']}|{g['before']} {g['kind']:8s} {g['target_s']:.3f}  ({g['between']})")
for u in units:
    if u["trim_db"] or u["dips"] or u["inner_cuts"] or u["pre_roll"]:
        print(f"  {u['line']} {u['src']}: trim {u['trim_db']} dB, dips {len(u['dips'])}, inner {u['inner_cuts']}, laugh pre-roll {u['pre_roll']} s "
              f"(of {u['laugh_before_word_s']} s) {u['first_word_onset'] or ''}")
for e in EXTRAS:
    print(f"  EXTRA {e['id']} {e['s']}-{e['e']} {e['use']} ({e['take']}, {e['gain_db']} dB)")
if REPLAY:
    print(f"  REPLAY {REPLAY['on']:.3f}-{REPLAY['off']:.3f} overlap with 'phone.' {REPLAY['overlap_with_phone_s']} s")
if BREATH:
    print(f"  deadpan breath: {BREATH}")
