# SOUND v2 (phase B): the full mix of the REBUILT film "The Clown Nobody Saw" (script v6).
#   length  = the v6 timeline (audio/timeline.json: 2117 f), exact to the sample
#   voice   = sound/award/voice/voice.wav (narrator + five character voices), levelled line by line so every character
#             line is as loud as the narrator, a gentle bus compressor, presence, a de-esser, a peak limiter
#   score   = music_v2.wav with ONE master gain (it is already levelled section by section against this voice; the old
#             per-section music levelling of cut 1 is gone)
#   effects = sfx.py (v2): the animators' three cue files -> real sounds, the film's own moments, the living bed
#   master  = -14 LUFS, ceiling -2.9 dBTP (<= -2 dBTP after the AAC mux)
# Then it MEASURES what it wrote (nothing is played): length, loudness, true peak, the speech margin on every word (no
# word under 7 dB), the character lines against the narrator, the sync direction of every cue, mono loss, the phone
# speaker (400 Hz high-pass), the loop seam, and THE QUIZ HARD RULE in the stems; and writes SOUND_EVENTS_V2.md,
# mix_report.json and studio/out/award/mix_p3_preview.mp3 (p3: PREVIEW_MP3; the count lift COUNT_LIFT).
# Usage (from the studio root): PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/award/audio/mix.py
#        [--no-mp3]   SYNC_CHECK=warn in the environment turns the sync-direction stop into a warning.
import hashlib
import json
import os
import subprocess
import sys
import time
import numpy as np
from scipy import ndimage, signal
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, momentary_max, short_term, lra, true_peak, shelf, hp, lp
import timeline as T
import mix_cut1 as M1          # the engine parts that carry over: voice_comp, deess, band_duck, limiter, seam / ebur reports

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "_cache")
STUDIO_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "studio", "out", "award"))
N = ns(T.DUR)
FPS = T.FPS
TARGET_LUFS = -14.0
CEIL_DBTP = -2.9
MUSIC_TRIM_DB = 0.0              # THE one master gain of the score (on top of following the voice chain's own level change)
MUSIC_BAND_DUCK = -5.0           # 1-4 kHz of the score dips while a word is spoken (the score stays alive in the gaps)
AMB_BAND_DUCK = -4.0
AMB_HP = 55.0
MARGIN_MIN = 7.0                 # dB: the voice over everything else in 1-4 kHz, on every word
MARGIN_AIM = 8.0                 # a failing word's bed is dipped until it reads this
SFX_REF = -20.0                  # the effects render at this voice reference and scale to the real one
VCOMP = dict(ratio=2.0, knee_db=6.0, att=0.005, rel=0.1, thr_pct=60.0)
# TONE. The narrator (James) gets cut 1's audited chain with 1 dB less presence: the v6 take is ~1 dB brighter at 3-8 kHz
# than cut 1's raw take (LTAS re 120-500 Hz: 3-8 kHz -15.2 vs -16.4), and cut 1's finished voice (-12.4) is the target.
# The five CHARACTER voices are much brighter and thinner already (raw 2-4 kHz -7.4 dB re 120-500 Hz against the
# narrator's -17.5): no presence boost for them, only the de-esser and a little warmth.
NARR_PRE_SHELF = (4000.0, 1.5)
NARR_SHELF = (3000.0, 1.5)
CHAR_EQ = [("low", 240.0, 1.5, 0.7), ("low", 110.0, -3.0, 0.7)]
VPEAK_CREST = 11.5
LINE = dict(narr_strength=0.5, narr_max=2.5, char_strength=0.9, char_max=5.0, char_lift=0.5, dead=0.5)
RIDES = {"n19": 2.0, "n04": 1.0}  # line id -> dB: "Did you see the money?" and "Five." sit over the read
PHR = json.load(open(os.path.join(ROOT, "voice", "phrases.json"), encoding="utf-8"))
# p3 (audit B1, FIX2 D11): THE COUNT has no narration for ~3 s twice; it read -29 LUFS (a sound drop-out on a phone). The score
# +6 dB and the effects +4 dB, FLAT over each narration-free stretch of the count (150 ms ramps at its four edges only, in the
# voice's own gaps): both duck windows sit in the middle of a flat stretch, so neither duck is accented
COUNT_LIFT = dict(music=6.0, sfx=4.0)
COUNT_RAMP = 0.15
PREVIEW_MP3 = "mix_p4_preview.mp3"   # p4 (p3: mix_p3_preview.mp3)


def count_spans():
    """THE COUNT, from the end of "...on a phone." to "How many?": ONE flat stretch (p3, second run: the first run lifted only
    the two narration-free stretches, and their ramps under "Don't lose count." sat 0.34 s from duck 2's window; FIX2 D11
    asks for the lift flat across the count). "Don't lose count." keeps its clarity through the word dips and the margin check."""
    q1 = next(s for s in T.SHOTS.values() if s["key"] == "Q1")
    z1 = T.fr(q1["b"])
    sil = [(a, b) for a, b in T.SILENCES if b - a > 2.0 and a > 0.5 and b <= z1 + 0.5]
    return [(sil[0][0] + 0.02, sil[-1][1] - 0.05)] if sil else []


def count_curve(db):
    t = np.arange(N) / SR
    g = np.zeros(N)
    for a, z in count_spans():
        g = np.maximum(g, db * np.clip(np.minimum((t - a) / COUNT_RAMP, (z - t) / COUNT_RAMP), 0, 1))
    return g


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def lufs(x):
    v = integrated(x)
    return float(v) if np.isfinite(v) else -99.0


# ================================================================ cache (events / beds keyed on their inputs)
def _dir_sig(d):
    try:
        return "|".join(f"{f}:{os.path.getsize(os.path.join(d, f))}" for f in sorted(os.listdir(d)) if f.endswith(".wav"))
    except OSError:
        return ""


def stage_key():
    import sfx
    files = ["sfx.py", "sfx_cut1.py", "samples.py", "samples_reject.json", "sfx_gen.py", "sfx_clown.py", "instruments.py", "dsp.py", "timeline.py",
             T.TL_PATH, T.WORDS_PATH, T.VOICE_PATH, os.path.join(ROOT, "voice", "phrases.json")] + [p for _, p in sfx.CUE_FILES]
    h = hashlib.sha1()
    for p in files:
        p = p if os.path.isabs(p) else os.path.join(HERE, p)
        h.update(os.path.basename(p).encode())
        h.update(open(p, "rb").read() if os.path.exists(p) else b"<missing>")
    h.update(_dir_sig(os.path.join(HERE, "_el")).encode())
    h.update(_dir_sig(os.path.join(HERE, "_lib")).encode())
    return h.hexdigest()[:12]


# ================================================================ voice
def load_voice():
    x, sr = read_wav(T.VOICE_PATH)
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    assert sr == SR, f"voice is {sr} Hz"
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def _loud_pair(v, p):
    a, z = max(0, ns(float(p["s"]) - 0.05)), min(N, ns(float(p["e"]) + 0.05))
    seg = np.concatenate([np.zeros((2, ns(0.4))), v[:, a:z], np.zeros((2, ns(0.4)))], axis=1)
    return float(integrated(seg)), float(momentary_max(seg))


def line_louds(v):
    """loudness of every line in one unit: the integrated loudness of the line; for a line shorter than 1.2 s (\"Five.\",
    \"How many?\") its loudest 0.4 s minus the usual gap between the two measures (the median over the long narrator lines)"""
    pairs = [_loud_pair(v, p) for p in PHR]
    longs = [m - i for p, (i, m) in zip(PHR, pairs) if float(p["e"]) - float(p["s"]) >= 1.2 and np.isfinite(i) and np.isfinite(m)]
    k = float(np.median(longs)) if longs else 2.0
    return [i if (float(p["e"]) - float(p["s"]) >= 1.2 and np.isfinite(i)) else m - k for p, (i, m) in zip(PHR, pairs)]


def line_level(v):
    """the line leveller, on the voice AFTER its tone chain: every CHARACTER line lands on the narrator's median loudness
    (+ a small lift), narrator lines move half-way to the median; the rides (RIDES) on top. Returns the gain curve (dB per
    sample: constant over a line, ramped across the silence between lines), the rows for the report and the median."""
    Ls = line_louds(v)
    narr = [L for p, L in zip(PHR, Ls) if p.get("speaker") == "N" and float(p["e"]) - float(p["s"]) > 1.2]
    med = float(np.median(narr))
    pts_t, pts_g, rows = [0.0], [0.0], []
    for p, L in zip(PHR, Ls):
        ch = p.get("speaker") != "N"
        d = (med + (LINE["char_lift"] if ch else 0.0)) - L
        d = 0.0 if abs(d) < LINE["dead"] else d
        g = float(np.clip(d * (LINE["char_strength"] if ch else LINE["narr_strength"]), -(LINE["char_max"] if ch else LINE["narr_max"]),
                          LINE["char_max"] if ch else LINE["narr_max"]))
        g += RIDES.get(p["id"], 0.0)
        s, e = float(p["s"]), float(p["e"])
        if s - 0.01 > pts_t[-1]:
            pts_t += [s - 0.01, e + 0.02]
        else:
            pts_t += [pts_t[-1] + 0.005, e + 0.02]
        pts_g += [g, g]
        rows.append(dict(id=p["id"], speaker=p.get("speaker"), s=s, e=e, loud=L, vs_median=L - med, gain=g, text=p.get("markup", "")))
    pts_t.append(T.DUR + 1)
    pts_g.append(pts_g[-1])
    pts_g[0] = pts_g[1]
    return np.interp(np.arange(N) / SR, pts_t, pts_g), rows, med


def char_mask():
    """1 inside the character lines, 0 in the narrator's, 30 ms ramps in the silence round each line"""
    t = np.arange(N) / SR
    m = np.zeros(N)
    for p in PHR:
        if p.get("speaker") != "N":
            m = np.maximum(m, np.clip(np.minimum((t - (float(p["s"]) - 0.05)) / 0.03, (float(p["e"]) + 0.06 - t) / 0.03), 0, 1))
    return m


def phase_rotate(v, freqs=(120.0, 200.0, 320.0, 500.0)):
    """a chain of first-order all-pass filters (the broadcast 'phase rotator'): the spectrum is untouched, but a voice
    whose waveform peaks to one side becomes symmetric, which lowers its crest factor"""
    for fc in freqs:
        k = np.tan(np.pi * fc / SR)
        a = (k - 1) / (k + 1)
        v = signal.lfilter([a, 1.0], [1.0, a], v, axis=-1)
    return v


def voice_chain():
    v = load_voice()
    raw_ref = lufs(v)
    ltas_raw = M1.voice_ltas(v)
    v = hp(v, M1.VOICE_HP, 2)
    crest0 = float(true_peak(v)) - lufs(v)
    crest1 = crest0                          # (a phase rotator was tried: it RAISED the crest on this voice, 17.5 -> 18.3 dB; not used)
    ref0 = lufs(v)
    v, vgr, vthr = M1.voice_comp(v, **VCOMP)
    v = v * dbg(ref0 - lufs(v))
    # the narrator's tone
    vn = shelf(v, NARR_PRE_SHELF[0], NARR_PRE_SHELF[1], "high")
    vn, ds = M1.deess(vn, np.zeros(N))
    vn = shelf(vn, NARR_SHELF[0], NARR_SHELF[1], "high")
    vn = M1.eq_chain(vn, M1.VOICE_EQ)
    # the characters' tone
    vc, ds_c = M1.deess(v, np.zeros(N))
    vc = M1.eq_chain(vc, CHAR_EQ)
    mk = char_mask()
    v = vn * (1 - mk)[None, :] + vc * mk[None, :]
    del vn, vc
    curve, rows, med = line_level(v)
    v0 = v
    v_mid = lufs(v0 * dbg(curve)[None, :])
    v, vg = M1.limiter(v0 * dbg(curve)[None, :], ceil_db=v_mid + VPEAK_CREST, look=0.0015, rel=0.04)
    # second pass: the peak limiter takes back part of a lift on a peaky line ("Five.", "Sorry... what clown?"): the gain
    # each line still misses is added once (at most 2 dB more), and the limiter runs again on the corrected voice
    after = line_louds(v)
    extra_t, extra_g = [0.0], [0.0]
    for r, L in zip(rows, after):
        want = r["loud"] + r["gain"]
        miss = float(np.clip(want - L, 0.0, 2.0)) if (r["gain"] > 0.2 and want - L > 0.4) else 0.0
        r["second_pass"] = miss
        extra_t += [max(extra_t[-1] + 0.005, r["s"] - 0.01), r["e"] + 0.02]
        extra_g += [miss, miss]
    extra_t.append(T.DUR + 1)
    extra_g.append(0.0)
    curve2 = curve + np.interp(np.arange(N) / SR, extra_t, extra_g)
    v, vg = M1.limiter(v0 * dbg(curve2)[None, :], ceil_db=v_mid + VPEAK_CREST, look=0.0015, rel=0.04)
    del v0
    after = line_louds(v)
    for r, L in zip(rows, after):
        r["after"] = L
    nar = np.concatenate([v[:, ns(float(p["s"])): ns(float(p["e"]))] for p in PHR if p.get("speaker") == "N"], axis=1)
    chs = np.concatenate([v[:, ns(float(p["s"])): ns(float(p["e"]))] for p in PHR if p.get("speaker") != "N"], axis=1)
    grdb = -20 * np.log10(np.maximum(vg, 1e-9))
    for r in rows:                             # how hard the peak limiter worked on each line (mean dB while it speaks)
        r["peak_gr"] = float(np.mean(grdb[ns(r["s"]): ns(r["e"])]))
    info = dict(raw_lufs=raw_ref, lufs=lufs(v), tp=float(true_peak(v)), comp_max_gr=float(vgr.max()), deess=ds, deess_chars=ds_c, median_line=med,
                crest_before_rotator=crest0, crest_after_rotator=crest1,
                peak_gr_max=float(-20 * np.log10(max(vg.min(), 1e-9))), ltas_raw=ltas_raw, ltas=M1.voice_ltas(v), ltas_narrator=M1.voice_ltas(nar),
                ltas_chars=M1.voice_ltas(chs))
    return v, rows, info


# ================================================================ the speech margin (1-4 kHz, every word)
_SOS = signal.butter(4, [1000.0, 4000.0], btype="bandpass", fs=SR, output="sos")


def band_ms(x):
    """mean square of the 1-4 kHz band of x per sample (cumulative sum, for fast window means)"""
    b = signal.sosfiltfilt(_SOS, x.mean(0))
    return np.concatenate([[0.0], np.cumsum(b ** 2)])


def word_margins(v, rest):
    cv, cr = band_ms(v), band_ms(rest)
    rows = []
    for w in T.WORDS:
        s, e = float(w["s"]), float(w["e"])
        if e - s < 0.08:
            e = s + 0.08
        a, z = ns(s), min(N, ns(e))
        pv, pr = (cv[z] - cv[a]) / max(1, z - a), (cr[z] - cr[a]) / max(1, z - a)
        rows.append(dict(w=w["w"], s=s, e=e, voice=10 * np.log10(pv + 1e-14), rest=10 * np.log10(pr + 1e-14),
                         margin=10 * np.log10((pv + 1e-14) / (pr + 1e-14))))
    return rows


def margin_fix(v, stems):
    """words under MARGIN_MIN: the 1-4 kHz band of the score / effects / bed dips under that word (30 ms ramps) until it
    reads MARGIN_AIM. Returns the stems, the final per-word rows and the list of fixes."""
    fixes = []
    for it in range(4):
        rows = word_margins(v, sum(stems))
        low = [r for r in rows if r["margin"] < MARGIN_MIN + 0.3]
        if not low:
            break
        curve = np.zeros(N)
        for r in low:
            need = min(12.0, MARGIN_AIM - r["margin"] + 0.5)
            a, z = max(0, ns(r["s"] - 0.03)), min(N, ns(r["e"] + 0.03))
            curve[a:z] = np.minimum(curve[a:z], -need)
            if it == 0:
                fixes.append((r["w"], r["s"], r["margin"], need))
        curve = ndimage.uniform_filter1d(curve, ns(0.03), mode="nearest")
        stems = [M1.band_curve(x, curve, 1000.0, 4000.0) for x in stems]
    return stems, word_margins(v, sum(stems)), fixes


# ================================================================ master
def master(mix0):
    G = TARGET_LUFS - lufs(mix0)
    prev = None
    for it in range(8):
        y, g3 = M1.limiter(mix0 * dbg(G), ceil_db=CEIL_DBTP)
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        slope = 1.0
        if prev is not None and abs(G - prev[0]) > 1e-3:
            slope = float(np.clip((L - prev[1]) / (G - prev[0]), 0.3, 1.0))
        prev = (G, L)
        G += (TARGET_LUFS - L) / slope
    return y, G, g3


# ================================================================ measurements
def rms_db(x, a, z):
    seg = x[..., max(0, a):min(x.shape[-1], z)]
    return float(10 * np.log10(np.mean(seg ** 2) + 1e-14)) if seg.size else float("nan")


def onset_rise(x, a, z, win=0.01):
    """the largest rise of the 10 ms RMS level over 30 ms inside samples a..z (dB): an onset shows as a big rise"""
    m = x.mean(0)[max(0, a - ns(0.04)):z]
    w = ns(win)
    e = 10 * np.log10(ndimage.uniform_filter1d(m ** 2, w, mode="nearest") + 1e-14)
    k = ns(0.03)
    d = e[k:] - e[:-k]
    return float(d.max()) if len(d) else 0.0


def balance_db(x, a, z):
    """left minus right level (dB): negative = the sound leans right"""
    L, R = np.mean(x[0, a:z] ** 2) + 1e-14, np.mean(x[1, a:z] ** 2) + 1e-14
    return float(10 * np.log10(L / R))


def _q1_stats(stem, qa, qz, win, hop=0.05):
    """one stem over Q1: K-weighted level of every `win`-sample window (hop 50 ms) and the largest rise of the 30 ms level
    over 60 ms inside each of those windows. Returns (levels dB, rises dB, window start samples, level fn(a, z), rise fn(a, z))."""
    from dsp import kfilt
    k = kfilt(stem[:, qa:qz])
    c = np.concatenate([[0.0], np.cumsum(np.mean(k ** 2, axis=0))])
    e = 10 * np.log10(ndimage.uniform_filter1d(stem[:, qa:qz].mean(0) ** 2, ns(0.03), mode="nearest") + 1e-14)
    kk = ns(0.06)
    d = np.zeros(len(e))
    d[kk:] = e[kk:] - e[:-kk]
    level = lambda a, z: float(10 * np.log10((c[z - qa] - c[a - qa]) / max(1, z - a) + 1e-14))
    rise = lambda a, z: float(d[a - qa:z - qa].max())
    idx = np.arange(0, max(1, (qz - qa) - win), ns(hop)) + qa
    return np.array([level(i, i + win) for i in idx]), np.array([rise(i, i + win) for i in idx]), idx, level, rise


def quiz_proof(gs, ga, gm, m_plain, buses=()):
    """THE QUIZ HARD RULE measured in the written stems, per duck window (duck frame +- HARD_PAD_F):
    - the effects stem: must be digital silence;
    - the bed: its K-weighted level and its largest level rise in the window, each read against every other window of the
      same length in Q1 (50 % = an ordinary moment), and its left / right balance;
    - the score: the same level reading, on the score BEFORE the dips under the words (those dips lower the narrated
      stretches and would make the unspoken count look loud); and the same slice of the groove two beats earlier and
      later (the pulse is periodic: the three numbers should agree), and its balance."""
    import sfx
    q1 = sfx.SK["Q1"]
    qa, qz = ns(T.fr(q1["a"])), ns(T.fr(q1["b"]))
    try:
        mp = json.load(open(os.path.join(HERE, "music_v2_map.json"), encoding="utf-8"))
        two_beats = ns(2.0 * [z_ - a_ for n_, a_, z_ in mp["sections"] if n_ == "quiz"][0] / 16.0)
    except Exception:  # noqa
        two_beats = None
    out = []
    win = None
    stats = {}
    for d, (wa, wz) in zip(sfx.DUCK_F, sfx.q1_windows()):
        a, z = ns(T.fr(wa)), ns(T.fr(wz))
        if win is None:
            win = z - a
            stats = {"bed": _q1_stats(ga, qa, qz, win), "music": _q1_stats(m_plain, qa, qz, win)}
        bus = next((b_ for b_ in buses if b_["duck"] == d), {})
        row = dict(duck=d, window=[wa, wz], sfx_peak=float(np.max(np.abs(gs[:, a:z]))), rest_peak=bus.get("rest_peak"), ok_cues=bus.get("cues", []),
                   ok_balance=bus.get("ok_balance"), ok_level_re_voice=bus.get("ok_level_re_voice"),
                   sfx_balance=(balance_db(gs, a, z) if float(np.max(np.abs(gs[:, a:z]))) > 1e-7 else None),
                   bed_balance=balance_db(ga, a, z), bed_balance_q1=balance_db(ga, qa, qz),
                   music_balance=balance_db(gm, a, z), music_balance_q1=balance_db(gm, qa, qz), ranks={})
        for nm_ in ("bed", "music"):
            lv, rs, idx, level, rise = stats[nm_]
            other = (idx + win <= a) | (idx >= z)                 # every window of Q1 that does not touch this one
            L_, R_ = level(a, z), rise(a, z)
            row["ranks"][nm_] = dict(k_level=L_, q1_p10=float(np.percentile(lv[other], 10)), q1_median=float(np.median(lv[other])),
                                     q1_p90=float(np.percentile(lv[other], 90)), pct=float((lv[other] < L_).mean() * 100),
                                     rise=R_, rise_q1_median=float(np.median(rs[other])), rise_pct=float((rs[other] < R_).mean() * 100))
            if nm_ == "music" and two_beats:
                nb = {}
                for k_, name in ((-1, "two_beats_before"), (1, "two_beats_after")):
                    a2, z2 = a + k_ * two_beats, z + k_ * two_beats
                    nb[name] = level(a2, z2) if a2 >= qa and z2 <= qz else None
                row["ranks"][nm_].update(nb)
        out.append(row)
    return out


def seam(y, name):
    k = ns(0.3)
    return dict(stem=name, jump=float(np.abs(y[:, 0] - y[:, -1]).max()), last_0_3s=rms_db(y, y.shape[1] - k, y.shape[1]), first_0_3s=rms_db(y, 0, k),
                last_10ms_peak=float(np.max(np.abs(y[:, -ns(0.01):]))), first_10ms_peak=float(np.max(np.abs(y[:, : ns(0.01)]))),
                step_p99_tail=float(np.percentile(np.abs(np.diff(y[:, -k:], axis=1)), 99)),
                step_p99_head=float(np.percentile(np.abs(np.diff(y[:, :k], axis=1)), 99)))


def cue_rows(C, v_ref_scale=0.0):
    out = []
    for c in C:
        out.append(dict(frame=round(float(c.f0), 2), t=round(float(c.t), 3), shot=c.shot, name=c.name, cls=c.cls, kind=c.kind, sound=c.desc,
                        files=c.label, level=round(float(c.level), 1), measured=None if c.measured is None else round(float(c.measured), 1),
                        pan=round(float(c.p), 2), sync_mode=c.sync_mode, sync_err=None if c.sync_err is None else round(float(c.sync_err), 2),
                        action=c.expects, key=c.key, own=bool(getattr(c, "own", False)), walker=getattr(c, "walker", None),
                        shoe=getattr(c, "shoe", None), dur_f=round(float(c.dur_f or 0), 1), space=c.space, prio=getattr(c, "prio", 0),
                        win_ok=bool(getattr(c, "win_ok", False)), len_f=round(float(getattr(c, "len_f", 0.0)), 1)))
    return out


# ================================================================ main
def main():
    t0 = time.time()
    import sfx
    os.makedirs(CACHE, exist_ok=True)
    key = stage_key()
    log(f"film {T.TOTAL} f = {T.DUR:.3f} s -> {N} samples; voice take {T.voice_take()}; effects key {key}")
    assert T.TOTAL == int(round(N / SR * FPS)), "timeline / sample count mismatch"

    # ---------------- voice
    v, line_rows, vinfo = voice_chain()
    v_ref = vinfo["lufs"]
    log(f"voice: raw {vinfo['raw_lufs']:.2f} -> {v_ref:.2f} LUFS, TP {vinfo['tp']:.2f} dBTP; comp max GR {vinfo['comp_max_gr']:.1f} dB; "
        f"de-esser max {vinfo['deess']['max']:.1f} dB; crest {vinfo['crest_before_rotator']:.1f} dB; "
        f"peak limiter max {vinfo['peak_gr_max']:.1f} dB")
    for k_ in ("ltas_raw", "ltas", "ltas_narrator", "ltas_chars"):
        log(f"  {k_:<14} re 120-500 Hz: " + ", ".join(f"{k} {x:+.1f}" for k, x in vinfo[k_].items()))
    for r in line_rows:
        log(f"  line {r['id']} {r['speaker']:<11} {r['s']:6.2f}-{r['e']:6.2f}  {r['loud']:6.1f} ({r['vs_median']:+.1f} vs narrator median) "
            f"gain {r['gain']:+.1f} -> {r['after']:6.1f} LUFS (peak limiter {r['peak_gr']:.2f} dB)  {r['text'][:40]}")

    # ---------------- score: music_v2.wav, ONE gain
    m, sr = read_wav(os.path.join(HERE, "music_v2.wav"))
    assert sr == SR and m.shape == (2, N), f"music_v2.wav is {m.shape} at {sr} Hz, the film needs (2, {N}): run `python -s music.py`"
    g_music = (v_ref - vinfo["raw_lufs"]) + MUSIC_TRIM_DB
    m = m * dbg(g_music)
    m = m * dbg(count_curve(COUNT_LIFT["music"]))[None, :]
    log("count lift: score +%.0f dB, effects +%.0f dB over %s" % (COUNT_LIFT["music"], COUNT_LIFT["sfx"],
                                                               ", ".join(f"{a:.2f}-{z:.2f} s" for a, z in count_spans())))
    m_plain = m.copy()                         # the score before any dip under the words (for the quiz proof only)
    m = M1.band_duck(m, MUSIC_BAND_DUCK)
    log(f"score: music_v2.wav, one gain {g_music:+.2f} dB (follows the voice chain {v_ref - vinfo['raw_lufs']:+.2f} dB, trim {MUSIC_TRIM_DB:+.1f}); "
        f"1-4 kHz {MUSIC_BAND_DUCK:+.0f} dB under the words -> {lufs(m):.2f} LUFS ({lufs(m) - v_ref:+.1f} LU vs the voice)")

    # ---------------- effects + bed (cached on their inputs)
    p_ev, p_bed, p_js = (os.path.join(CACHE, f"v2_{n}_{key}.{e}") for n, e in (("events", "npy"), ("beds", "npy"), ("cues", "json")))
    if os.path.exists(p_ev) and os.path.exists(p_bed) and os.path.exists(p_js):
        log("cache hit: events + beds", key)
        ev = np.load(p_ev).astype(np.float64)
        amb = np.load(p_bed).astype(np.float64)
        J = json.load(open(p_js, encoding="utf-8"))
        sfx.E.sync_check(J["sync"])
    else:
        ev, C, rows, problems = sfx.render_events(SFX_REF)
        amb, bed_rows = sfx.render_beds(SFX_REF)
        J = dict(cues=cue_rows(C), beds=[list(b) for b in bed_rows], report=json.load(open(sfx.REPORT, encoding="utf-8")),
                 sync=json.load(open(sfx.E.SYNC_REPORT, encoding="utf-8"))["rows"], used=dict(sfx.SM.USED), quiz_buses=sfx.QUIZ_BUS)
        for f in os.listdir(CACHE):
            if f.startswith("v2_") and key not in f:
                os.remove(os.path.join(CACHE, f))
        np.save(p_ev, ev.astype(np.float32))
        np.save(p_bed, amb.astype(np.float32))
        json.dump(J, open(p_js, "w", encoding="utf-8"), indent=1)
    ev = ev * dbg(v_ref - SFX_REF)
    ev = ev * dbg(count_curve(COUNT_LIFT["sfx"]))[None, :]
    amb = amb * dbg(v_ref - SFX_REF)
    amb = M1.circ(lambda x: hp(x, AMB_HP, 2), amb)
    amb = M1.band_duck(amb, AMB_BAND_DUCK)
    log(f"effects {lufs(ev):.2f} LUFS ({lufs(ev) - v_ref:+.1f} LU vs the voice), bed {lufs(amb):.2f} LUFS ({lufs(amb) - v_ref:+.1f} LU)")
    rep = J["report"]
    if rep["unmapped"]:
        log("UNMAPPED cue names (not sounded, listed in SOUND_EVENTS_V2.md):", ", ".join(rep["unmapped"]))
    for pr in rep["problems"]:
        log("CUE FILE PROBLEM:", pr)

    # ---------------- the speech margin on every word
    (m, ev, amb), wrows, fixes = margin_fix(v, [m, ev, amb])
    for w_, s_, mg, need in fixes:
        log(f"margin fix: '{w_}' @ {s_:.2f} s read {mg:.1f} dB -> the beds' 1-4 kHz dips {need:.1f} dB under it")

    # ---------------- master
    y, G, g3 = master(v + m + ev + amb)
    assert y.shape == (2, N) and np.all(np.isfinite(y))
    for x in (v, m, ev, amb):                # (in place: the four stems at the master gain)
        x *= dbg(G)
    gv, gm, gs, ga = v, m, ev, amb
    write_wav(os.path.join(HERE, "mix.wav"), y)
    for nme, x in (("stem_voice", gv), ("stem_music", gm), ("stem_sfx", gs), ("stem_amb", ga)):
        write_wav(os.path.join(HERE, nme + ".wav"), x)
    log("wrote mix.wav + 4 stems")
    if "--no-mp3" not in sys.argv:
        try:
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", os.path.join(HERE, "mix.wav"), "-c:a", "libmp3lame", "-b:a", "192k",
                            os.path.join(STUDIO_OUT, PREVIEW_MP3)], check=True, timeout=300)
            log("wrote studio/out/award/" + PREVIEW_MP3)
        except Exception as e:  # noqa
            log("mp3 preview FAILED:", e)

    # ---------------- measure
    R = dict(key=key, frames=T.TOTAL, samples=int(y.shape[1]), seconds=y.shape[1] / SR, I=lufs(y), TP=float(true_peak(y)), LRA=float(lra(y)),
             Mmax=float(np.max(momentary(y))), Smax=float(np.max(short_term(y))), G=G, limiter_max_gr=float(-20 * np.log10(g3.min())),
             limiter_pct_over_0_5=float((-20 * np.log10(g3) > 0.5).mean() * 100),
             voice=lufs(gv), music=lufs(gm), sfx=lufs(gs), amb=lufs(ga), music_gain=g_music, voice_info=vinfo, lines=line_rows)
    mono = y.mean(0)
    R["mono_loss"] = R["I"] - lufs(st(mono))
    R["phone_loss"] = R["I"] - lufs(hp(y, 400.0, 2))
    R["phone_loss_stems"] = {n: lufs(x) - lufs(hp(x, 400.0, 2)) for n, x in (("voice", gv), ("music", gm), ("sfx", gs), ("amb", ga))}
    R["side_re_mid"] = float(10 * np.log10(np.mean((0.5 * (y[0] - y[1])) ** 2) / (np.mean(mono ** 2) + 1e-14) + 1e-14))
    R["ebur"] = M1.ffmpeg_ebur(os.path.join(HERE, "mix.wav"))
    R["seam"] = [seam(x, n) for n, x in (("mix", y), ("voice", gv), ("music", gm), ("sfx", gs), ("amb", ga))]
    wrows = word_margins(gv, gm + gs + ga)
    # the same margin through a phone speaker (400 Hz high-pass on everything)
    R["words"] = wrows
    R["margin_min"] = min(r["margin"] for r in wrows)
    R["margin_fixes"] = [dict(w=w_, s=s_, before=mg, dip=need) for w_, s_, mg, need in fixes]
    ch = [(float(p["s"]), float(p["e"])) for p in PHR if p.get("speaker") != "N"]
    is_ch = lambda r: any(a - 0.01 <= r["s"] < z for a, z in ch)
    mc, mn = [r["margin"] for r in wrows if is_ch(r)], [r["margin"] for r in wrows if not is_ch(r)]
    R["margin_char"] = dict(min=min(mc), median=float(np.median(mc)), n=len(mc))
    R["margin_narr"] = dict(min=min(mn), median=float(np.median(mn)), n=len(mn))
    m_plain *= dbg(G)
    R["quiz"] = quiz_proof(gs, ga, gm, m_plain, J.get("quiz_buses", []))
    del m_plain
    R["sync"] = J["sync"]
    bad = [r for r in J["sync"] if not r["ok"]]
    errs = [r["err"] for r in J["sync"] if r["kind"] == "sync" and r["err"] is not None]
    R["sync_summary"] = dict(n=len(errs), min=min(errs), max=max(errs), bad=len(bad))
    json.dump(R, open(os.path.join(HERE, "mix_report.json"), "w", encoding="utf-8"), indent=1, default=float)
    log(f"MIX: {R['samples']} samples = {R['frames']} f; {R['I']:.2f} LUFS, TP {R['TP']:.2f} dBTP, LRA {R['LRA']:.1f}; voice {R['voice']:.1f}, "
        f"score {R['music']:.1f}, effects {R['sfx']:.1f}, bed {R['amb']:.1f} LUFS; mono loss {R['mono_loss']:.2f} LU; phone (400 Hz HP) loss "
        f"{R['phone_loss']:.2f} LU")
    log(f"speech margin: min {R['margin_min']:.1f} dB (narrator median {R['margin_narr']['median']:.1f}, characters median "
        f"{R['margin_char']['median']:.1f}, min {R['margin_char']['min']:.1f}); sync: {len(errs)} cues {min(errs):+.2f} .. {max(errs):+.2f} f, {len(bad)} outside")
    for q in R["quiz"]:
        b_, m_ = q["ranks"]["bed"], q["ranks"]["music"]
        nb = ", ".join(f"{k.replace('_', ' ')} {m_[k]:.1f}" for k in ("two_beats_before", "two_beats_after") if m_.get(k) is not None)
        okc = ", ".join(f"{c_['name']} f {c_['frame']:.0f} pan {c_['pan']:+.2f}" for c_ in q["ok_cues"]) or "none"
        log(f"QUIZ duck f {q['duck']}: everything but the clown / pigeons / dog: peak {q['rest_peak']:.7f}; allowed sounds in the window: {okc}"
            + ("" if q["ok_balance"] is None else f" (L-R {q['ok_balance']:+.1f} dB, {q['ok_level_re_voice']:+.1f} dB re the voice)") + f"; bed level {b_['k_level']:.1f} dB (Q1 p10 {b_['q1_p10']:.1f} / median "
            f"{b_['q1_median']:.1f} / p90 {b_['q1_p90']:.1f}; louder than {b_['pct']:.0f} %), rise {b_['rise']:.1f} dB (above {b_['rise_pct']:.0f} % of Q1 "
            f"windows), L-R {q['bed_balance']:+.2f} (Q1 {q['bed_balance_q1']:+.2f}); score level {m_['k_level']:.1f} dB (p10 {m_['q1_p10']:.1f} / median "
            f"{m_['q1_median']:.1f} / p90 {m_['q1_p90']:.1f}; louder than {m_['pct']:.0f} %; {nb}), L-R {q['music_balance']:+.2f} (Q1 {q['music_balance_q1']:+.2f})")
    print(R["ebur"])
    import events_doc
    events_doc.write(J, R)
    log(f"done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
