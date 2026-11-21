# THE v4 MIX of "the trap" (pointing v4; 2026-11-20, new PC). Nothing is played: everything is measured.
# ONE COMMAND re-times everything: every sound hangs on clock_v4.Clock (the DIRECTOR's clock: shots + words, with the
# VOICE's real word times laid over it). Run it again when the voice or the clock changes.
#   music     score_v4.film_score: the hook (hook_v4: groove from frame 0, six green beeps, the RED hit, the held beat, the
#             sting) + one tempo per section on the story (lab / why / today / steam / new york / loop), the loop tail
#             folded onto frame 0
#   effects   hook_v4's events + cues_v4.sheet() (an effect on every [cue] of the shot table) ; ambience: cues_v4 beds +
#             the hook's room (cut dead for the held beat)
#   voice     the clown chain (high-pass, 3:1 compressor, de-esser, tone, a light line leveller, a peak limiter); the
#             shouts (L12 D, L14 H, L16 C) get the character EQ
#   rules     mix_targets (ambience 28 LU under, effects brightened and capped 21 LU under, the 0.8-1.5 kHz tone
#             suppressor under words, room tone, the master tone match); the PAYOFF (lines 20-22) gets the cleanest
#             mix: every bed 6 dB down under its words (BENCHMARK_sound rule 7)
#   master    a full voice: -14.0 LUFS integrated, ceiling -2.9 dBTP, the limiter works round the loop; a partial voice
#             (the opening only) or none: the voice is put where it sits in a full mix (-13.7 LUFS) so every balance is final
# usage (from the studio root):
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/pointing/audio/mix_v4.py
#       [--opening | --until=v06]  the film's first shots only (default for --opening: to the end of v05 = lines 1-3, the
#                                  opening voice's length) -> mix_opening_v4.wav
#       [--voice=<wav> --words=<json>]  the voice file and its word times (default: sound/pointing/voice_v4/voice.wav +
#                                  words.json when they exist; else no voice, plan words)
#       [--clock=<json> | --probe] [--plan-grid] [--tag name] [--no-mp3] [--preview "<name>"] (an mp3 in pointing_preview/)
import json
import os
import subprocess
import sys
import time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, momentary_max, lra, true_peak, shelf, hp, fades, make_ir, convolve_st, bp, lp
import mixlib as M
import mix_targets as T
import clock_v4
import score_v4 as S4
import hook_v4 as HK
import cues_v4 as Q

TARGET_LUFS = -14.0
VOICE_AT = -13.7
CEIL_DBTP = -2.9
VREF0 = -13.7                    # music / effects / beds are rendered against this voice level and scaled to the real one
VPEAK_CREST = 10.5
LINE = dict(narr_strength=0.5, narr_max=2.5, char_strength=0.9, char_max=6.0, char_lift=2.6, dead=0.5)   # audit r1: shouts +2 dB OVER the narrator (was +0.5)
# audit r1: a short CAB ROOM on the shouts (early reflections, no long tail): D = today's driver in his cab (the audit's ask),
# H / C = the steam cab (a lighter touch)
CAB_ROOM = dict(D=0.30, H=0.16, C=0.16)
# audit r1: the last sentence ("This time, point, and say it.") +1.5 dB over "Now try again." (the loop's instruction ends full)
WORD_LIFT = [("this#2", "it#5", 2.3)]
# audit r1: the music steps back under line 11a ("Pointing and saying it makes your hand wait."; 'wait.' was 10.5 dB over the bed)
MUSIC_DUCK_WORDS = [("pointing#1", "wait#1", -2.5)]
# audit r1: whisper "heard" a word in two short narrator pauses (54.4 s 'Suddenly' / 'In addition'; 60.0 s before '"Point'):
# the music steps back in those gaps (end of the first word .. start of the second)
# audit r2: the tiptoe's first bar steps back 3 dB under the engine's entrance (shot, from s, to s, dB)
MUSIC_DUCK_SHOTS = [("v22", 0.0, 2.45, -3.0)]
# audit r2: every SEEN action must be HEARD. These cues (and the hook's press clicks) are measured the auditor's way:
# effects 1-8 kHz against voice + music + ambience 1-8 kHz in the 80 ms from the cue; under HEARD_DB the music and
# ambience are carved in 1-8 kHz under the cue (up to CARVE_MAX) and the cue is lifted (up to LIFT_MAX). The VOICE is
# never touched. Report: mix_report hook... "heard".
HEARD = ("go.press", "red.press", "lab.press", "lab.x", "lab.flip", "lab.tap", "lab.switch", "lab.ctr", "lab.card", "lab.board0",
         "lab.clip", "lab.tick", "lab.her_point", "kit.door", "kit.cereal", "kit.cat", "cab.glove", "car.kid", "steam.whistle",
         "steam.shovel", "steam.pencil", "ny.point", "ny.chime", "ny.doors", "ny.sign", "loop.point")
HEARD_DB, CARVE_MAX, LIFT_MAX, HEARD_WIN = -5.0, 8.0, 22.0, 0.08
SENT_MIN = 12.6                         # dB: a sentence over the beds after the lifts (gate rule 12)
HEARD_PEAK_UNDER = 3.0                  # a lifted cue's peak stays this far under the voice's peak in its window (no limiter hit)
MUSIC_DUCK_GAPS = [("pointing#2", "subway#1", -4.0), ("sign#1", "point#4", -3.0)]
GO7_DB = -2.0                            # the 7th "Go!" -1 dB (audit r1 allowed -2): the boom under it pushed the master limiter to 1.9 dB
SHOUT_GAIN = dict(D=2.0, H=1.0, C=0.6)   # dB after the leveller (its LUFS reads a bright shout as loud): each shout ~2 dB RMS over its neighbours
DUCK = dict(music_broad=-2.5, music_band=-5.0, sfx_band=-4.5, amb_band=-4.0, amb_broad=-1.0, payoff=-6.0)
PAYOFF = ("L20", "L21", "L22")
LINE_LIFT = {"L22": 2.0}                 # dB on top of the leveller: the last line ends the film at full level (references -16 dBFS)
MARGIN_MIN, MARGIN_AIM = 10.0, 12.5      # per word, voice over the beds in 1-4 kHz (the gate's line rule: 12 dB in 0.5-4 kHz)
NO_MARGIN_FIX = ("L02",)                # the Go run: the beep IS the design (1760 Hz, measured against the word separately)
GENTLE = ("L02",)                       # lines that keep the gentle compressor
T.MATCH = dict(T.MATCH, air=(11000.0, -8.5, 7.0))   # v4: the references' air is -8 to -9 dB (10-16 kHz vs 400-2k)
RUN_LIFT, RUN_LIFT_DB = ("L02",), 0.0      # the groove under the Go run: not ducked (+3 dB put the music 15 dB under: too loud)
VOICE_DIR = os.path.join(ROOT, "sound", "pointing", "voice_v4")
# the narrator's tone for v4: the v4 takes measure dull (raw 10-16 kHz -29 dB, 2-5 kHz -15 dB against the mix's 400-2k; clown's
# James -16 / -8): presence and air are LIFTED here (the clown chain cut 8-10 kHz), the de-esser holds the sibilants
VOICE_EQ_V4 = [("low", 130.0, -4.5, 0.7), ("bell", 240.0, 1.0, 0.7), ("bell", 1400.0, -1.6, 0.7), ("high", 3000.0, 1.5, 0.7),
               ("bell", 5000.0, 1.0, 0.8), ("high", 9000.0, 8.5, 0.7)]
# the shouts (D, H, C) measure 8-15 dB duller than the narrator at 10-16 kHz (VOICE, 2026-11-20): presence + air for them
CHAR_EQ_V4 = list(M.CHAR_EQ) + [("high", 4000.0, 3.0, 0.7), ("high", 9000.0, 6.0, 0.7)]
VCOMP_V4 = dict(M.VCOMP, ratio=6.0, thr_pct=33.0, att=0.003, rel=0.06)          # a denser voice (the references' in-speech floor is -7 to -9 dB)


def arg(k, d=None):
    return next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


# ================================================================ voice
def load_voice(path, n):
    x, sr = read_wav(path)
    assert sr == SR, f"{path} is {sr} Hz (48 kHz expected)"
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(n)
    out[: min(n, len(v))] = v[:n]
    return st(out)


def voice_chain(dlg, C, lines_in):
    n = dlg.shape[1]
    words = [(t["s"], t["e"]) for t in C.toks if t["line"] in lines_in]
    PH = [dict(id=l, speaker=clock_v4.SPEAKER.get(l, "N"), s=C.lines[l][0], e=C.lines[l][1]) for l in lines_in]
    if not words or not np.any(dlg):
        return dlg, [], dict(lufs=VREF0, note="no voice")
    raw = M.lufs(dlg)
    v = hp(dlg, M.VOICE_HP, 2)
    ref0 = M.lufs(v)
    v6, vgr, _ = M.voice_comp(v, words, **VCOMP_V4)
    v3, _, _ = M.voice_comp(v, words, **dict(M.VCOMP, ratio=3.0))         # the Go run keeps the gentle 3:1: a hard squeeze lifts
    v6, v3 = v6 * dbg(ref0 - M.lufs(v6)), v3 * dbg(ref0 - M.lufs(v3))      # the grid-cut tails of the Gos (go_check.py)
    t_ = np.arange(n) / SR
    gm = np.zeros(n)
    for lid in [l for l in lines_in if l in GENTLE]:
        a_, b_ = C.lines[lid]
        gm = np.maximum(gm, np.clip(np.minimum((t_ - (a_ - 0.08)) / 0.05, (b_ + 0.08 - t_) / 0.05), 0, 1))
    v = v6 * (1 - gm)[None, :] + v3 * gm[None, :]
    vn = shelf(v, M.NARR_PRE_SHELF[0], M.NARR_PRE_SHELF[1], "high")
    vn, ds = M.deess(vn, words)
    vn = shelf(vn, M.NARR_SHELF[0], M.NARR_SHELF[1], "high")
    vn = M.eq_chain(vn, VOICE_EQ_V4)
    vc, _ = M.deess(v, words)
    vc = M.eq_chain(vc, CHAR_EQ_V4)
    t = np.arange(n) / SR
    mk = np.zeros(n)
    room_w = np.zeros(n)
    for p in PH:
        if p["speaker"] != "N":
            w_ = np.clip(np.minimum((t - (p["s"] - 0.05)) / 0.03, (p["e"] + 0.06 - t) / 0.03), 0, 1)
            mk = np.maximum(mk, w_)
            room_w = np.maximum(room_w, CAB_ROOM.get(p["speaker"], 0.0) * np.clip(np.minimum((t - (p["s"] - 0.05)) / 0.03, (p["e"] + 0.20 - t) / 0.08), 0, 1))
    if room_w.any():
        ir = make_ir(0.22, 917, hf=0.45, early=((0.0031, 0.55, -0.35), (0.0053, 0.45, 0.4), (0.0082, 0.35, -0.1), (0.0124, 0.25, 0.25)))
        wet = convolve_st((vc * mk[None, :]).mean(0), ir)[:, :n]
        vc = vc + wet * room_w[None, :]
    v = vn * (1 - mk)[None, :] + vc * mk[None, :]
    # a light line leveller (characters to the narrator's median + 0.5 dB, narrator lines half-way to it)
    def loud(s, e):
        seg = np.concatenate([np.zeros((2, ns(0.4))), v[:, max(0, ns(s - 0.05)):min(n, ns(e + 0.05))], np.zeros((2, ns(0.4)))], axis=1)
        return M.lufs(seg)
    Ls = [loud(p["s"], p["e"]) for p in PH]
    narr = [L_ for p, L_ in zip(PH, Ls) if p["speaker"] == "N" and p["e"] - p["s"] > 1.2 and L_ > -90]
    med = float(np.median(narr)) if narr else float(np.median(Ls))
    pts_t, pts_g, rows = [0.0], [0.0], []
    for p, L_ in sorted(zip(PH, Ls), key=lambda q: q[0]["s"]):
        ch = p["speaker"] != "N"
        d = (med + (LINE["char_lift"] if ch else 0.0)) - L_
        d = 0.0 if abs(d) < LINE["dead"] or L_ < -90 else d
        d += LINE_LIFT.get(p["id"], 0.0) / (LINE["char_strength"] if ch else LINE["narr_strength"])
        g = float(np.clip(d * (LINE["char_strength"] if ch else LINE["narr_strength"]), -(LINE["char_max"] if ch else LINE["narr_max"]), LINE["char_max"] if ch else LINE["narr_max"]))
        a = max(p["s"] - 0.03, pts_t[-1] + 0.004)
        pts_t += [a, max(p["e"] + 0.03, a + 0.004)]
        pts_g += [g, g]
        rows.append(dict(id=p["id"], speaker=p["speaker"], s=round(p["s"], 3), e=round(p["e"], 3), loud=round(L_, 2), gain=round(g, 2)))
    pts_t.append(n / SR + 1)
    pts_g.append(pts_g[-1])
    pts_g[0] = pts_g[1] if len(pts_g) > 1 else 0.0
    curve = np.interp(np.arange(n) / SR, pts_t, pts_g)
    for k0, k1, gdb in WORD_LIFT:                                    # a lift on a run of words (inside a line)
        a_, b_ = C.w(k0), C.w(k1, "e")
        if a_ is not None and b_ is not None:
            curve = curve + gdb * np.clip(np.minimum((t - (a_ - 0.06)) / 0.04, (b_ + 0.08 - t) / 0.04), 0, 1)
            rows.append(dict(id=f"{k0}..{k1}", speaker="N", s=round(a_, 3), e=round(b_, 3), loud=None, gain=gdb))
    for p in PH:
        if SHOUT_GAIN.get(p["speaker"]):
            curve = curve + SHOUT_GAIN[p["speaker"]] * np.clip(np.minimum((t - (p["s"] - 0.04)) / 0.02, (p["e"] + 0.08 - t) / 0.03), 0, 1)
    if GO7_DB and C.w("go#7") is not None:
        a_, b_ = C.w("go#7"), C.w("go#7", "e")
        curve = curve + GO7_DB * np.clip(np.minimum((t - (a_ - 0.02)) / 0.01, (b_ + 0.03 - t) / 0.01), 0, 1)
    v0 = v * dbg(curve)[None, :]
    v_mid = M.lufs(v0)
    v, vg = M.limiter(v0, ceil_db=v_mid + VPEAK_CREST, look=0.0015, rel=0.04)
    info = dict(raw_lufs=raw, lufs=M.lufs(v), tp=float(true_peak(v)), comp_max_gr=float(vgr.max()), deess_max=ds.get("max"), median_line=med,
                peak_gr_max=float(-20 * np.log10(max(vg.min(), 1e-9))))
    return v, rows, info


# ================================================================ the buses
def build_buses(C, L, vref):
    lines, words = C.v4_lines(), C.v4_words()
    hT = C.hook_times()
    mus, fx_h, table, rep, hk = S4.film_score(lines, words, L, vref, hook_T=hT)
    n = ns(L)
    bus, rows, dropped = Q.render(C, L, vref, n)
    amb_h = hk["amb"]
    # the hook's room hands over to the lab bed just after "She did."
    t = np.arange(n) / SR
    a0 = hT["l3_end"] + 0.05
    xo = np.clip(1 - (t - a0) / 0.25, 0, 1)
    amb = bus["amb"] + amb_h * xo[None, :]
    sfx = bus["sfx"] + fx_h
    hev = [dict(id=nm, t=round(tt_, 3), frame=int(round(tt_ * 30)), snd="hook_v4", lv="", bus="hook", what=wh, anchor="hook_times") for tt_, nm, wh in hk["events"]]
    return dict(music=mus, sfx=sfx, amb=amb), table, rep, sorted(rows + hev, key=lambda r: r["t"]), dropped, hT


def automate(b, C, spans, L):
    n = b["music"].shape[1]
    env_w = M.key_env(n, spans, pre=0.10, post=0.05, att=0.015, rel=0.06)
    env_s = M.key_env(n, spans, pre=0.08, post=0.12, att=0.07, rel=0.45)
    pay = [(t["s"], t["e"]) for t in C.toks if t["line"] in PAYOFF]
    env_p = M.key_env(n, pay, pre=0.15, post=0.15, att=0.05, rel=0.3) if pay else np.zeros(n)
    last = [(t["s"], t["e"]) for t in C.toks if t["line"] == PAYOFF[-1]]
    if last:                                                         # the last line (the loop's instruction): half the duck, so the
        env_p = env_p * (1 - 0.5 * M.key_env(n, last, pre=0.15, post=0.3, att=0.05, rel=0.3))   # ending stays full (last 2 s >= -18 dBFS)
    # the LOOP TAIL (after the last word, 2026-11-21: 0.49 s): every duck lets go fast, so the groove hands frame 0 its downbeat
    # at full level (audit r1: a dip before the downbeat)
    t_last = max(t["e"] for t in C.toks)
    tail = np.clip((np.arange(n) / SR - (t_last + 0.03)) / 0.12, 0, 1)
    env_s, env_w, env_p = env_s * (1 - tail), env_w * (1 - tail), env_p * (1 - tail)
    md = np.zeros(n)
    for k0, k1, gdb in MUSIC_DUCK_WORDS:
        a_, b_ = C.w(k0), C.w(k1, "e")
        if a_ is not None and b_ is not None:
            md = np.minimum(md, gdb * M.key_env(n, [(a_, b_)], pre=0.15, post=0.15, att=0.08, rel=0.25))
    for k0, k1, gdb in MUSIC_DUCK_GAPS:
        a_, b_ = C.w(k0, "e"), C.w(k1)
        if a_ is not None and b_ is not None and b_ > a_:
            md = np.minimum(md, gdb * M.key_env(n, [(a_, b_)], pre=0.02, post=0.0, att=0.04, rel=0.08))
    for sid, a0, a1, gdb in MUSIC_DUCK_SHOTS:
        s0 = C.shot(sid)
        if s0 is not None:
            md = np.minimum(md, gdb * M.key_env(n, [(s0 + a0, s0 + a1)], pre=0.0, post=0.0, att=0.01, rel=0.4))
    run = [C.lines[l] for l in RUN_LIFT if l in C.lines]
    env_r = M.key_env(n, [(a_ - 0.05, b_) for a_, b_ in run], pre=0.0, post=0.0, att=0.03, rel=0.03) if run else np.zeros(n)
    # the Go run: the groove the Gos ride is NOT ducked and comes up RUN_LIFT dB (it fills the gaps between the Gos)
    mus = b["music"] * dbg(DUCK["music_broad"] * env_s * (1 - env_r) + RUN_LIFT_DB * env_r + DUCK["payoff"] * env_p + md)[None, :]
    mus = hp(M.band_gain(mus, DUCK["music_band"] * env_w), 55.0, 2)
    sfx = M.band_gain(b["sfx"] * dbg(DUCK["payoff"] * env_p)[None, :], DUCK["sfx_band"] * env_w)
    amb = b["amb"] * dbg(DUCK["amb_broad"] * env_s + DUCK["payoff"] * env_p)[None, :]
    amb = hp(M.band_gain(amb, DUCK["amb_band"] * env_w), 55.0, 2)
    return dict(music=mus, sfx=sfx, amb=amb)


def fix_margins(v, st_, words):
    fixes = []
    n = v.shape[1]
    for it in range(3):
        rows = M.word_margins(v, st_["music"] + st_["sfx"] + st_["amb"], words)
        low = [r for r in rows if r["margin"] < MARGIN_MIN + 0.2 and r["line"] not in NO_MARGIN_FIX]
        if not low:
            break
        t = np.arange(n) / SR
        g = np.zeros(n)
        for r in low:
            need = min(12.0, MARGIN_AIM - r["margin"] + 0.5)
            g = np.minimum(g, -need * np.clip(np.minimum((t - (r["s"] - 0.06)) / 0.03, (r["e"] + 0.05 - t) / 0.03), 0, 1))
            fixes.append(dict(word=r["w"], line=r["line"], s=round(r["s"], 3), margin=round(r["margin"], 1), dip=round(need, 1), pass_=it + 1))
        for k in st_:
            st_[k] = M.band_gain(st_[k], g)
    return st_, M.word_margins(v, st_["music"] + st_["sfx"] + st_["amb"], words), fixes


def make_heard(v, st_, cue_rows, n):
    """AUDIT r2: carve + lift so each seen action is heard (see HEARD); returns the stems and a per-cue table"""
    from scipy import signal as sg
    sos = sg.butter(4, [1000.0, 8000.0], btype="bandpass", fs=SR, output="sos")
    rows = [r for r in cue_rows if str(r["id"]).startswith(HEARD) and r["t"] < n / SR - 0.1]
    dbw = lambda z: float(20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12))
    vb = sg.sosfiltfilt(sos, v.mean(0))
    t = np.arange(n) / SR

    def margins():
        sb = sg.sosfiltfilt(sos, st_["sfx"].mean(0))
        rb = vb + sg.sosfiltfilt(sos, (st_["music"] + st_["amb"]).mean(0))
        out = []
        for r in rows:
            a, b = ns(r["t"]), ns(r["t"] + HEARD_WIN)
            out.append(dbw(sb[a:b]) - dbw(rb[a:b]))
        return out
    before = margins()
    carve, lift, gs = np.zeros(n), np.zeros(n), {}
    for r, m in zip(rows, before):
        if m >= HEARD_DB:
            continue
        need = HEARD_DB - m
        w = np.clip(np.minimum((t - (r["t"] - 0.03)) / 0.015, (r["t"] + HEARD_WIN + 0.06 - t) / 0.03), 0, 1)
        c = min(CARVE_MAX, need)
        carve = np.minimum(carve, -c * w)
    for k in ("music", "amb"):
        st_[k] = M.band_gain(st_[k], carve, lo=1000.0, hi=8000.0)
    mid = margins()
    for r, m in zip(rows, mid):
        if m >= HEARD_DB:
            continue
        g = min(LIFT_MAX, HEARD_DB - m + 0.5)
        a, b = ns(r["t"] - 0.01), ns(r["t"] + HEARD_WIN + 0.05)
        pk_s = 20 * np.log10(np.abs(st_["sfx"][:, a:b]).max() + 1e-12)
        pk_v = 20 * np.log10(np.abs(v[:, a:b]).max() + 1e-12)
        if pk_v > -60:
            g = max(0.0, min(g, pk_v - HEARD_PEAK_UNDER - pk_s))
        gs[r["id"]] = g
    # the words stay first: no SENTENCE may drop under SENT_MIN dB over the beds (0.5-4 kHz, the gate's rule is 12): the
    # lifts of the cues inside a sentence that would fall under it are pulled back until it holds
    import json as _j
    P = _j.load(open(os.path.join(VOICE_DIR, "phrases.json"), encoding="utf-8"))
    sos2 = sg.butter(4, [500.0, 4000.0], btype="bandpass", fs=SR, output="sos")
    vb2 = sg.sosfiltfilt(sos2, v.mean(0))
    base = st_["sfx"].copy()
    for it in range(6):
        lift = np.zeros(n)
        for r in rows:
            g = gs.get(r["id"], 0.0)
            if g > 0:
                w = np.clip(np.minimum((t - (r["t"] - 0.012)) / 0.006, (r["t"] + HEARD_WIN + 0.05 - t) / 0.03), 0, 1)
                lift = np.maximum(lift, g * w)
        st_["sfx"] = base * dbg(lift)[None, :]
        bb2 = sg.sosfiltfilt(sos2, (st_["music"] + st_["sfx"] + st_["amb"]).mean(0))
        bad = 0
        for p in P:
            if p["e"] > n / SR:
                continue
            a, b = ns(p["s"]), ns(p["e"])
            m = dbw(vb2[a:b]) - dbw(bb2[a:b])
            if m < SENT_MIN:
                for r in rows:
                    if p["s"] - 0.1 <= r["t"] <= p["e"] and gs.get(r["id"], 0) > 0:
                        gs[r["id"]] = max(0.0, gs[r["id"]] - (SENT_MIN - m + 0.7))
                        bad += 1
        if not bad:
            break
    after = margins()
    tab = [dict(id=r["id"], t=r["t"], frame=r["frame"], before=round(b0, 1), after=round(a0, 1), lift_db=round(float(lift[ns(r["t"]) + ns(0.02)]), 1),
                carve_db=round(float(carve[ns(r["t"]) + ns(0.02)]), 1)) for r, b0, a0 in zip(rows, before, after)]
    log(f"heard: {len(rows)} seen actions; under {HEARD_DB:.0f} dB before {sum(m < HEARD_DB for m in before)}, after {sum(m < HEARD_DB - 0.5 for m in after)}; "
        f"median {np.median(before):.1f} -> {np.median(after):.1f} dB")
    return st_, tab


def cap_to(x, ref, under):
    """trim a stem DOWN to `under` LU below ref if it is louder; never raise it (the cue levels are designed)"""
    L_ = M.lufs(x)
    g = min(0.0, (ref - under) - L_) if L_ > -90 else 0.0
    return x * dbg(g), g


# ================================================================ main
def main():
    t0 = time.time()
    opening = "--opening" in sys.argv or arg("--until") is not None
    tag = arg("--tag") or ("opening_v4" if opening else "v4")
    TAG = "_" + tag
    vpath = arg("--voice") or (os.path.join(VOICE_DIR, "voice.wav") if os.path.exists(os.path.join(VOICE_DIR, "voice.wav")) else None)
    wpath = arg("--words") or (os.path.join(VOICE_DIR, "words.json") if vpath and os.path.exists(os.path.join(VOICE_DIR, "words.json")) else None)
    if vpath and not wpath:
        sys.exit("mix_v4: a voice needs its word times (--words=<json>)")
    C = clock_v4.Clock(arg("--clock"), wpath, plan_grid="--plan-grid" in sys.argv, do_probe="--probe" in sys.argv)
    log(C.summary())
    L = C.L
    N = ns(L)
    spoken = C.spoken_lines()
    dlg = load_voice(vpath, N) if vpath else st(np.zeros(N))
    v, vrows, vinfo = voice_chain(dlg, C, spoken)
    vinfo["source"] = os.path.relpath(vpath, ROOT) if vpath else "none (plan words; no voice file)"
    vref = vinfo["lufs"] if spoken else VREF0
    log(f"voice: {vinfo['source']}; lines in the voice: {len(spoken)} ({', '.join(spoken[:6])}{'...' if len(spoken) > 6 else ''}); {vref:.1f} LUFS")
    b, mtable, hrep, cue_rows, dropped, hT = build_buses(C, L, VREF0)
    k = dbg(vref - VREF0)
    b = {kk: x * k for kk, x in b.items()}
    all_spans = [(t["s"], t["e"]) for t in C.toks]                    # duck under every word of the clock (the plan too: the balance is final)
    st_ = automate(b, C, all_spans, L)
    del b
    Lc = L                                                           # the opening: cut here (the score was rendered on the whole film for its loop)
    if opening:
        Lc = C.shot(arg("--until", "v05"), "b") or 8.2
    Nc = ns(Lc)
    N = Nc
    cut = lambda x: x[:, :Nc]
    v, st_ = cut(v), {kk: cut(x) for kk, x in st_.items()}
    words = [(t["line"], t["w"], t["s"], t["e"]) for t in C.toks if t["line"] in spoken]
    fixes, mrows = [], []
    if spoken:
        st_, mrows, fixes = fix_margins(v, st_, words)
    all_spans = [(a_, b_) for a_, b_ in all_spans if a_ < Lc]
    key = M.key_env(N, all_spans, pre=0.05, post=0.05, att=0.02, rel=0.08)
    tgt = {}
    st_["amb"], tgt["amb_trim_db"] = cap_to(st_["amb"], vref, T.AMB_UNDER)
    st_["sfx"], tgt["sfx_trim_db"] = cap_to(T.brighten(st_["sfx"]), vref, T.SFX_UNDER)
    st_["amb"], tgt["amb_tone_cut_s"] = T.tone_suppress(st_["amb"], key)
    st_["sfx"], tgt["sfx_tone_cut_s"] = T.tone_suppress(st_["sfx"], key)
    st_, heard = make_heard(v, st_, cue_rows, N)
    v = v + T.room_tone(N, vref + T.ROOM_DB)
    mg, b0 = T.match_gains(v + st_["music"] + st_["sfx"] + st_["amb"])
    v = T.apply_match(v, mg)
    st_ = {kk: T.apply_match(x, mg) for kk, x in st_.items()}
    tgt.update(master_match=mg, bands_before=b0)
    log(f"targets: ambience {tgt['amb_trim_db']:+.1f} dB, effects {tgt['sfx_trim_db']:+.1f} dB (brightened, capped), tones cut under words "
        f"{tgt['amb_tone_cut_s']:.1f} / {tgt['sfx_tone_cut_s']:.1f} s, master match {mg}")
    # the master
    vref_m = M.lufs(v) if spoken else vref                           # the voice after the tone match (it moves it too)
    pre = v + st_["music"] + st_["sfx"] + st_["amb"]
    full = bool(spoken) and len(spoken) >= len(C.lines) - 1 and not opening
    if not full:
        g = VOICE_AT - vref_m
        y, gr = M.limiter(pre * dbg(g), CEIL_DBTP, loop=False)
        log(f"PARTIAL / NO VOICE: master gain from the voice ({vref_m:.1f} -> {VOICE_AT} LUFS); this file's integrated loudness is not the film's")
    else:
        g = TARGET_LUFS - M.lufs(pre)
        for _ in range(4):
            y, gr = M.limiter(pre * dbg(g), CEIL_DBTP, loop=True)
            err = TARGET_LUFS - M.lufs(y)
            if abs(err) < 0.03:
                break
            g += err
    if opening:
        y = fades(y, 0.0, 0.03)
    stems = {"voice": v * dbg(g), "music": st_["music"] * dbg(g), "sfx": st_["sfx"] * dbg(g), "amb": st_["amb"] * dbg(g)}
    grdb = -20 * np.log10(np.maximum(gr, 1e-9))
    out = lambda nm: os.path.join(HERE, nm)
    write_wav(out(f"mix{TAG}.wav"), y)
    if TAG in ("_opening_v4",):                                     # the DIRECTOR's render commands read this name
        write_wav(out("opening_v4_mix.wav"), y)
    for kk, x in stems.items():
        write_wav(out(f"stem_{kk}{TAG}.wav"), x)
    # the music stem's own sheet, for sound_gate.py --music stem_music<tag>.wav (sections, the voice's level, the designed stops)
    json.dump(dict(sections=[r for r in mtable if r["t0"] < Lc], vref=M.lufs(stems["voice"]) if spoken else VOICE_AT, L=Lc,
                   designed_silences=[list(hrep["beat"]), [hrep["red"], hrep["sting"]]] + [list(z) for z in hrep.get("dry", [])]),
              open(out(f"stem_music{TAG}.json"), "w"), indent=1, default=float)
    texts = {}
    try:
        for l in json.load(open(os.path.join(ROOT, "sound", "pointing", "script_v4", "lines_v4.json"), encoding="utf-8")):
            texts["L%02d" % int(l["id"])] = l.get("text", "")
    except Exception:  # noqa
        pass
    ph = [dict(id=lid, speaker=clock_v4.SPEAKER.get(lid, "N"), s=round(C.lines[lid][0], 3), e=round(C.lines[lid][1], 3), text=texts.get(lid, ""))
          for lid in sorted(spoken or C.lines, key=lambda q: C.lines[q][0]) if C.lines[lid][0] < Lc]
    json.dump(ph, open(out(f"phrases{TAG}.json"), "w", encoding="utf-8"), indent=1)
    if "--no-mp3" not in sys.argv:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out(f"mix{TAG}.wav"), "-c:a", "libmp3lame", "-b:a", "256k", out(f"mix{TAG}_preview.mp3")], check=False)
        pv = arg("--preview")
        if pv:
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out(f"mix{TAG}.wav"), "-c:a", "libmp3lame", "-b:a", "256k",
                            os.path.join(ROOT, "pointing_preview", pv + ".mp3")], check=False)
    # ---------------------------------------------------------------- measurements
    eb = M.ffmpeg_ebur(out(f"mix{TAG}.wav"))
    mm = [r["margin"] for r in mrows]
    db = lambda z: float(20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12))
    hb0, hb1 = hrep["beat"]
    hook = dict(go=hrep["go"], red=hrep["red"], beat=hrep["beat"], beat_s=hrep["beat_s"], sting=hrep["sting"], groove_back=hrep["groove_back"],
                beds_in_beat_dbfs=db((stems["music"] + stems["sfx"] + stems["amb"])[:, ns(hb0 + 0.02):ns(hb1 - 0.01)]),
                mix_in_beat_dbfs=db(y[:, ns(hb0 + 0.02):ns(hb1 - 0.01)]), music_first_0_3s_dbfs=db(stems["music"][:, :ns(0.3)]),
                first_0_3s_dbfs=db(y[:, :ns(0.3)]))
    # the seven beeps: level and pitch identical (no limiter on them), measured on the mix
    bl = []
    for tg in hT["go"]:
        seg = stems["sfx"][:, ns(tg):ns(tg + 0.08)].mean(0)
        f = np.fft.rfftfreq(len(seg), 1 / SR)
        S_ = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        sel = (f > 1200) & (f < 2500)
        bl.append(dict(t=round(tg, 3), dbfs=round(db(seg[None, :]), 1), peak_hz=round(float(f[sel][np.argmax(S_[sel])]), 0),
                       limiter_db=round(float(grdb[ns(tg):ns(tg + 0.08)].max()), 2)))
    hook["beeps"] = bl
    # the clicks against the DIRECTOR's press events (onset of each click in the effects stem, from the expected time)
    def onset(x, t0, w=0.04):
        z = hp(x[:, ns(t0 - w):ns(t0 + w)].mean(0), 3000.0, 4)
        e = np.abs(z)
        return t0 - w + float(np.argmax(e > 0.3 * e.max())) / SR
    hook["clicks"] = [dict(event=round(p_, 4), onset=round(onset(stems["sfx"], p_), 4), off_frames=round((onset(stems["sfx"], p_) - p_) * 30, 2))
                      for p_ in (hT.get("press") or []) + ([hT["red_press"]] if hT.get("red_press") is not None else [])]
    # AUDIT r1 measures: the RED against the six green Gos (music + effects, 200 ms after each onset: broadband and < 150 Hz),
    # its band levels (30-150 Hz, 2.5-6 kHz), and the loudest non-voice 200 ms anywhere else in the film
    bed = stems["music"] + stems["sfx"] + stems["amb"]
    def win(x, a, b, lo=None, hi=None):
        z = x[:, ns(a):ns(b)].mean(0)
        if lo and hi:
            z = bp(z, lo, hi, 4)
        elif hi:
            z = lp(z, hi, 4)
        return db(z[None, :])
    gos = hT["go_all"]
    hook["red_hit"] = dict(
        green_200ms=[round(win(bed, g, g + 0.2), 1) for g in gos[:6]], red_200ms=round(win(bed, gos[6], gos[6] + 0.2), 1),
        green_lt150=[round(win(bed, g, g + 0.2, hi=150), 1) for g in gos[:6]], red_lt150=round(win(bed, gos[6], gos[6] + 0.2, hi=150), 1),
        red_30_150_dbfs=round(win(bed, gos[6] + 0.02, gos[6] + 0.22, 30, 150), 1), red_2k5_6k_dbfs=round(win(bed, gos[6], gos[6] + 0.1, 2500, 6000), 1),
        voice_go7_peak_dbfs=round(float(20 * np.log10(np.abs(stems["voice"][:, ns(gos[6]):ns(gos[6] + 0.4)]).max() + 1e-12)), 1))
    hook["red_hit"].update(mix_250ms_green=[round(db(y[:, ns(g):ns(g + 0.25)]), 1) for g in gos[:6]], mix_250ms_red=round(db(y[:, ns(gos[6]):ns(gos[6] + 0.25)]), 1))
    w2 = ns(0.2)
    m2 = bed.mean(0) ** 2
    e2 = 10 * np.log10(np.convolve(m2, np.ones(w2) / w2, "valid") + 1e-20)
    kr = ns(gos[6])
    e2o = e2.copy()
    e2o[max(0, kr - w2):kr + w2] = -200
    hook["red_hit"].update(loudest_other_200ms_dbfs=round(float(e2o.max()), 1), loudest_other_at_s=round(float(np.argmax(e2o) / SR), 2),
                           red_is_loudest=bool(e2[max(0, kr - w2 // 2):kr + w2].max() >= e2o.max()))
    # the LOOP JOIN: the last samples into the first (the film loops): sample step, 50 ms levels either side, per stem
    J = dict(sample_step=round(float(np.abs(y[:, -1] - y[:, 0]).max()), 5), last_50ms=round(db(y[:, -ns(0.05):]), 1), first_50ms=round(db(y[:, :ns(0.05)]), 1))
    for kk in ("music", "amb", "voice"):
        J[kk] = [round(db(stems[kk][:, -ns(0.05):]), 1), round(db(stems[kk][:, :ns(0.05)]), 1)]
    J["min_50ms_last_0_5s"] = round(min(db(y[:, -ns(0.5) + i:-ns(0.5) + i + ns(0.05)]) for i in range(0, ns(0.45), ns(0.01))), 1)
    J["digital_zero_samples_last_1s"] = int(np.sum(np.all(np.abs(y[:, -SR:]) < 1e-7, axis=0)))
    hook["loop_join"] = J
    rep = dict(made=time.strftime("%Y-%m-%d %H:%M:%S"), tag=TAG, clock=C.summary(), drift=C.drift[:20], length_s=Lc, film_length_s=L,
               master=dict(gain_db=g, limiter_max_db=float(grdb.max()), ffmpeg_ebur128=eb, true_peak=float(true_peak(y)), lra=float(lra(y)) if Lc > 3 else None),
               stems_lufs={kk: M.lufs(x) for kk, x in stems.items()}, voice=dict(info=vinfo, lines=vrows), targets=tgt,
               margins=dict(min=min(mm) if mm else None, median=float(np.median(mm)) if mm else None, fixes=fixes,
                            lowest=sorted(mrows, key=lambda r: r["margin"])[:10]),
               hook=hook, heard=heard, music_sections=mtable, cues=dict(rows=len(cue_rows), dropped=dropped), seconds=round(time.time() - t0, 1))
    json.dump(rep, open(out(f"mix_report{TAG}.json"), "w", encoding="utf-8"), indent=1, default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o))
    rows_c = [r for r in cue_rows if r["t"] < Lc + 0.01]
    json.dump(dict(made=rep["made"], fps=30, clock=C.summary(), hook=hook, music=mtable,
                   cues=[dict(id=r["id"], t=r["t"], frame=r["frame"], what=r["what"], anchor=r.get("anchor")) for r in rows_c]),
              open(out(f"sound_times{TAG}.json"), "w", encoding="utf-8"), indent=1, default=float)
    write_sheet(out(f"CUE_SHEET{TAG}.md"), C, rows_c, mtable, hook, Lc, vinfo, dropped)
    log(f"master: gain {g:+.2f} dB; ffmpeg {eb}; limiter max {grdb.max():.2f} dB")
    log("stems (LUFS): " + ", ".join(f"{kk} {M.lufs(x):.1f}" for kk, x in stems.items()))
    log(f"hook: Go {hook['go']}; red {hook['red']}; held beat {hb0:.3f}-{hb1:.3f} s ({hook['beat_s']:.2f} s), beds in it {hook['beds_in_beat_dbfs']:.1f} dBFS, "
        f"mix {hook['mix_in_beat_dbfs']:.1f} dBFS; music 0-0.3 s {hook['music_first_0_3s_dbfs']:.1f} dBFS")
    log("beeps: " + "; ".join(f"{x['t']:.2f}s {x['dbfs']:.1f} dBFS {x['peak_hz']:.0f} Hz lim {x['limiter_db']}" for x in bl))
    if mm:
        log(f"word margins 1-4 kHz: min {min(mm):.1f}, median {np.median(mm):.1f} dB; {len(fixes)} dips")
    log(f"-> {os.path.relpath(out(f'mix{TAG}.wav'), ROOT)} ({Lc:.2f} s); {len(rows_c)} cues; done in {time.time() - t0:.0f} s")


def write_sheet(path, C, rows, mtable, hook, Lc, vinfo, dropped):
    R = [f"# CUE SHEET v4 ({os.path.basename(path)}): the trap", "",
         f"Generated by `mix_v4.py` on {time.strftime('%Y-%m-%d %H:%M')}. {C.summary()}", f"Voice: {vinfo.get('source')}. Length {Lc:.2f} s.", "",
         "Every row hangs on the CLOCK (a shot's cut, a line, a word key): the seconds and frames move by themselves when the voice or the cuts move.",
         "", "## Music (one tempo per section, from frame 0)", "| section | from s | to s | BPM | style | chords | LU under the voice |", "|---|---|---|---|---|---|---|"]
    for r in mtable:
        if r["t0"] < Lc:
            R.append(f"| {r['name']} | {r['t0']:.2f} | {min(r['t1'], Lc):.2f} | {r.get('bpm')} | {r.get('style')} | {r.get('prog')} | {r.get('lu')} |")
    R += ["", f"The hook: Go onsets {hook['go']}; the red hit {hook['red']} s; the held beat {hook['beat'][0]:.3f}-{hook['beat'][1]:.3f} s "
          f"({hook['beat_s']:.2f} s, everything but the voice's room tone at zero); the sting {hook['sting']} s; the groove back {hook['groove_back']} s.", "",
          "## Effects and beds", "| s | frame | cue | bus | what | anchor |", "|---|---|---|---|---|---|"]
    for r in rows:
        R.append(f"| {r['t']:.3f} | {r['frame']} | {r['id']} | {r['bus']} | {r['what']} | `{r.get('anchor', '')}` |")
    if dropped:
        R += ["", "Dropped (anchor not on the clock): " + ", ".join(dropped)]
    open(path, "w", encoding="utf-8").write("\n".join(R) + "\n")


if __name__ == "__main__":
    main()
