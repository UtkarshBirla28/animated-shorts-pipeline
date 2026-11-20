# THE MIX of "Why Japanese Train Drivers Point at Nothing" (script v3). Nothing is played: everything is measured.
#   voice     <voice>/voice.wav (its stems/dialogue.wav + laughs.wav + phone.wav when the v3 build wrote them) through the
#             clown film's audited voice chain (high-pass, gentle bus compressor, de-esser, tone, line leveller, peak limiter)
#   effects   cues.py (the cue sheet) -> foley.py;  ambience  beds.py;  music  score.py (underscore + our departure melody)
#   timing    tl.py: every sound hangs on a voice line, a word or a shot, so a new voice take re-times the whole mix
#   loop      the mix is built on an EXTENDED time line: shot 1 (0 .. the first cut) is rendered AFTER the film's end, as
#             the continuation of the last shot (one train, one platform bed, one arm snap), then folded back onto the
#             start. The last sample therefore runs into the first one by construction; the limiter works on the loop too.
#   master    -14.0 LUFS integrated, ceiling -2.9 dBTP (<= -2 dBTP after the AAC mux; the brief asks < -1)
# Writes: mix.wav, stem_voice.wav / stem_sfx.wav / stem_amb.wav / stem_music.wav (they sum to the mix before the master
# limiter), hook_0-12s.wav, mix_report.json, CUE_SHEET.md, sound_times.json (every cue in seconds and frames, for the
# picture), LICENSES.md, and a preview mp3 for muxing.
# Usage (from the studio root):
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/pointing/audio/mix.py [--tag name] [--no-cache]
#   PT_VOICE=<folder>  another voice folder (the stand-in before the v3 voice landed);  --tag writes mix_<name>.wav etc.
import hashlib
import json
import os
import subprocess
import sys
import time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, momentary_max, short_term, lra, true_peak, shelf, hp, lp, fades, peq
import tl
import cues as Q
import beds
import score
import foley
import lib
import mixlib as M
import mix_targets as T

V4_TARGETS = "--v3-targets" not in sys.argv      # the benchmark's mix targets (mix_targets.py); --v3-targets = the old rejected balance
if V4_TARGETS:
    M.VCOMP = dict(M.VCOMP, ratio=3.0)            # the narrator: a 3:1 compressor (was 2:1) ahead of the line leveller

_T_IMPORT = time.time()
TARGET_LUFS = -14.0
VOICE_AT = -13.7                 # where the voice stem sits in a full -14 LUFS mix of this film (stand-in runs: -13.6 .. -13.7)
CEIL_DBTP = -2.9
# THE PHONE'S REPLAY (v3_r01, s16b; audit MUST-FIX 2026-11-20): it was 12.4 dB under the narrator and unheard by the
# recogniser. It is lifted REPLAY_LIFT_DB over the build's own level, gets REPLAY_EQ (dB at 1.8 kHz, a wide bell over
# 1-3 kHz) on top of the build's phone band-pass, and the beds step down REPLAY_DUCK_DB under it
REPLAY_LIFT_DB = 4.5
REPLAY_EQ = 3.0
REPLAY_DUCK_DB = -4.0
PHONE = {}
VREF0 = -20.0                    # effects, beds and music are rendered against this voice level and scaled to the real one
VPEAK_CREST = 10.5               # voice peak limiter: true peak at most this far over the voice's loudness (9.5 squashed 'finger' of v3_t03 by 8.6 dB)
LINE = dict(narr_strength=0.5, narr_max=2.5, char_strength=0.9, char_max=5.0, char_lift=0.5, dead=0.5)
LINE_TARGET = {"v3_t07": -2.0,   # 'Bag... gone.': small by pitch, not by level (script: no more than 6 dB under the narrator)
               "v3_k01": 0.5, "v3_r01": None, "v3_x01": None, "v3_x02": None}
LINE_HOLD = {"v3_n10"}           # 'It stays.' is the quietest narrator line on purpose: the leveller may not lift it
DUCK = dict(music_broad=-2.5, music_band=-5.0, sfx_band=-4.5, amb_band=-4.0, amb_broad=-1.0)
# no voice: the world comes up, so a pause never reads as a drop-out on a phone. A short pause (the held beat of a call) gets
# 'short' x the lift, a long one (0.7 s and more) all of it
GAP = dict(min=0.33, full=0.7, short=0.55, edge=0.06, ramp=0.12, amb=5.5, sfx=3.0, music=3.5)
MARGIN_MIN, MARGIN_AIM = 7.0, 8.0
N = tl.TOTAL * (SR // tl.FPS)
WRAP = ns(tl.CUT1)
N_EXT = N + WRAP + ns(0.5)
TAG = ("_" + sys.argv[sys.argv.index("--tag") + 1]) if "--tag" in sys.argv else ""
CACHE = os.path.join(HERE, "_cache")


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


# ================================================================ cache (the slow renders, keyed on code + timeline)
def _key(files):
    h = hashlib.sha1()
    for p in files:
        h.update(open(os.path.join(HERE, p), "rb").read())
    h.update(repr(sorted(tl.SHOT.items())).encode())
    h.update(tl.FILM_KEY.encode())                                   # the film clock (EV + cast beats) the cues read
    h.update(repr(sorted((k, [tuple(round(float(x), 4) if isinstance(x, float) else x for x in w) for w in v]) for k, v in tl.WORDS.items())).encode())
    h.update(repr(sorted((k, (round(a, 4), round(b, 4))) for k, (a, b) in tl.SPAN.items())).encode())
    pe = os.path.join(HERE, "picture_events.json")
    h.update(open(pe, "rb").read() if os.path.exists(pe) else b"-")
    src = os.path.join(HERE, "_lib", "_sources.json")
    h.update(open(src, "rb").read())
    return h.hexdigest()[:12]


STAGE_FILES = {"fx": ["cues.py", "foley.py", "lib.py", "tl.py", "dsp.py", "sfx_gen.py"],
               "beds": ["beds.py", "foley.py", "lib.py", "tl.py", "dsp.py", "sfx_gen.py"],
               "music": ["score.py", "instruments.py", "cues.py", "tl.py", "dsp.py", "foley.py"]}
KEYS = {}


def snapshot_keys():
    """the cache keys are taken ONCE, at the start: a file edited while a mix runs must not label old audio with its new hash"""
    for name, files in STAGE_FILES.items():
        KEYS[name] = _key(files)


def cached(name, files, fn):
    if "--no-cache" in sys.argv:
        return fn()
    os.makedirs(CACHE, exist_ok=True)
    k = KEYS.get(name) or _key(files)
    p = os.path.join(CACHE, f"{name}_{k}.npz")
    if os.path.exists(p):
        z = np.load(p, allow_pickle=True)
        log(f"  {name}: cached ({k})")
        return tuple(z[f"a{i}"] if z[f"a{i}"].dtype != object else z[f"a{i}"].item() for i in range(len(z.files)))
    res = fn()
    for f in os.listdir(CACHE):
        if f.startswith(name + "_"):
            os.remove(os.path.join(CACHE, f))
    def box(r):
        if isinstance(r, np.ndarray):
            return np.asarray(r, dtype=np.float32)
        a = np.empty((), dtype=object)
        a[()] = r
        return a
    np.savez(p, **{f"a{i}": box(r) for i, r in enumerate(res)})
    return res


# ================================================================ voice
def _load(path):
    x, sr = read_wav(path)
    assert sr == SR, f"{path} is {sr} Hz"
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def load_voice():
    """dialogue (the spoken lines), overlays (laugh-only takes + the phone, already at their level under the narrator) or
    the one voice.wav when the build has no stems"""
    if tl.SOURCE != "voice":
        return st(np.zeros(N)), None, "none (plan mode: no voice file)"
    d = os.path.dirname(tl.VOICE_WAV)
    sd = os.path.join(d, "stems")
    if all(os.path.exists(os.path.join(sd, f)) for f in ("dialogue.wav", "laughs.wav", "phone.wav")):
        dlg = _load(os.path.join(sd, "dialogue.wav"))
        PHONE["x"] = _load(os.path.join(sd, "phone.wav"))
        ov = _load(os.path.join(sd, "laughs.wav"))
        whole = _load(tl.VOICE_WAV)
        err = float(np.abs(whole - dlg - ov - PHONE["x"]).max())
        return dlg, ov, f"stems (dialogue + laughs + phone; they sum to voice.wav within {err:.1e})"
    return _load(tl.VOICE_WAV), None, "voice.wav (no stems)"


def lines_in_voice():
    return [dict(id=l["id"], speaker=l["speaker"], s=tl.SPAN[l["id"]][0], e=tl.SPAN[l["id"]][1], text=l["text"]) for l in tl.LINES
            if l["id"] in tl.WORDS and l["id"] in tl.IN_VOICE and not l.get("from_phone")]


def _loud_pair(v, s, e):
    a, z = max(0, ns(s - 0.05)), min(N, ns(e + 0.05))
    seg = np.concatenate([np.zeros((2, ns(0.4))), v[:, a:z], np.zeros((2, ns(0.4)))], axis=1)
    return float(integrated(seg)), float(momentary_max(seg))


def line_louds(v, PH):
    pairs = [_loud_pair(v, p["s"], p["e"]) for p in PH]
    longs = [m - i for p, (i, m) in zip(PH, pairs) if p["e"] - p["s"] >= 1.2 and np.isfinite(i) and np.isfinite(m)]
    k = float(np.median(longs)) if longs else 2.0
    return [i if (p["e"] - p["s"] >= 1.2 and np.isfinite(i)) else m - k for p, (i, m) in zip(PH, pairs)]


def line_level(v, PH):
    """every CHARACTER line lands on the narrator's median loudness (+ a small lift), narrator lines move half-way to the
    median; LINE_TARGET sets a line's own place; LINE_HOLD lines are never lifted. Gain curve (dB per sample), rows, median."""
    Ls = line_louds(v, PH)
    narr = [L for p, L in zip(PH, Ls) if p["speaker"] == "N" and p["e"] - p["s"] > 1.2]
    med = float(np.median(narr)) if narr else float(np.median(Ls))
    pts_t, pts_g, rows = [0.0], [0.0], []
    for p, L in zip(PH, Ls):
        ch = p["speaker"] != "N"
        tgt = LINE_TARGET.get(p["id"], LINE["char_lift"] if ch else 0.0)
        d = (med + tgt) - L if tgt is not None else 0.0
        d = 0.0 if abs(d) < LINE["dead"] else d
        g = float(np.clip(d * (LINE["char_strength"] if ch else LINE["narr_strength"]), -(LINE["char_max"] if ch else LINE["narr_max"]),
                          LINE["char_max"] if ch else LINE["narr_max"]))
        if p["id"] in LINE_HOLD:
            g = min(g, 0.0)
        s, e = p["s"], p["e"]
        t_in = max(s - 0.03, pts_t[-1] + 0.004)
        pts_t += [t_in, max(e + 0.03, t_in + 0.004)]
        pts_g += [g, g]
        rows.append(dict(id=p["id"], speaker=p["speaker"], s=s, e=e, loud=L, vs_median=L - med, gain=g, text=p["text"]))
    pts_t.append(tl.L + 1)
    pts_g.append(pts_g[-1])
    pts_g[0] = pts_g[1] if len(pts_g) > 1 else 0.0
    return np.interp(np.arange(N) / SR, pts_t, pts_g), rows, med


def voice_chain(dlg, ov):
    PH = lines_in_voice()
    words = [(s, e) for lid, w, s, e in tl.all_words() if lid in tl.IN_VOICE and lid != "v3_r01"]
    if not PH or not np.any(dlg):
        return st(np.zeros(N)), [], dict(lufs=VREF0, note="no voice")
    raw = M.lufs(dlg)
    v = hp(dlg, M.VOICE_HP, 2)
    ref0 = M.lufs(v)
    v, vgr, vthr = M.voice_comp(v, words, **M.VCOMP)
    v = v * dbg(ref0 - M.lufs(v))
    vn = shelf(v, M.NARR_PRE_SHELF[0], M.NARR_PRE_SHELF[1], "high")
    vn, ds = M.deess(vn, words)
    vn = shelf(vn, M.NARR_SHELF[0], M.NARR_SHELF[1], "high")
    vn = M.eq_chain(vn, M.VOICE_EQ)
    vc, ds_c = M.deess(v, words)
    vc = M.eq_chain(vc, M.CHAR_EQ)
    t = np.arange(N) / SR
    mk = np.zeros(N)
    for p in PH:
        if p["speaker"] != "N":
            mk = np.maximum(mk, np.clip(np.minimum((t - (p["s"] - 0.05)) / 0.03, (p["e"] + 0.06 - t) / 0.03), 0, 1))
    v = vn * (1 - mk)[None, :] + vc * mk[None, :]
    curve, rows, med = line_level(v, PH)
    v0 = v
    v_mid = M.lufs(v0 * dbg(curve)[None, :])
    v, vg = M.limiter(v0 * dbg(curve)[None, :], ceil_db=v_mid + VPEAK_CREST, look=0.0015, rel=0.04)
    after = line_louds(v, PH)
    for r, L in zip(rows, after):
        r["after"] = L
    info = dict(raw_lufs=raw, lufs=M.lufs(v), tp=float(true_peak(v)), comp_max_gr=float(vgr.max()), deess=ds, deess_chars=ds_c, median_line=med,
                peak_gr_max=float(-20 * np.log10(max(vg.min(), 1e-9))), makeup_db=M.lufs(v) - raw)
    if ov is not None and np.any(ov):                          # the laugh-only takes and the phone: the build's own levels, the dialogue's make-up gain
        o = hp(ov, 110.0, 2) * dbg(info["makeup_db"])
        o, _ = M.limiter(o, ceil_db=v_mid + VPEAK_CREST - 6.0, look=0.0015, rel=0.04)
        v = v + o
        info["overlays_lufs"] = M.lufs(o)
    if PHONE.get("x") is not None and np.any(PHONE["x"]):     # the phone's replay: lifted, a 1-3 kHz bell, its own peak limit
        p = peq(hp(PHONE["x"], 110.0, 2), 1800.0, REPLAY_EQ, 0.55) * dbg(info["makeup_db"] + REPLAY_LIFT_DB)
        p, _ = M.limiter(p, ceil_db=v_mid + VPEAK_CREST - 3.0, look=0.0015, rel=0.04)
        v = v + p
        info["replay_lufs"] = M.lufs(p)
    return v, rows, info


def phone_replay(v, rows):
    """only when the voice track has no replay of its own: the tourist's 'What's a finger gonna do?' again, thin, through the
    phone's speaker, about 8 dB under the narrator, starting 0.30 s before the end of 'phone.' (script 2.3)"""
    if "v3_r01" in tl.IN_VOICE or "v3_t03" not in tl.IN_VOICE:
        return v, None
    a, b = tl.SPAN["v3_t03"]
    seg = v[:, max(0, ns(a - 0.03)):ns(b + 0.08)]
    ph = fades(foley.phone_speaker(seg), 0.01, 0.05)
    med = next((r["after"] - r["vs_median"] - r["gain"] for r in rows if r["speaker"] == "N"), M.lufs(v))
    med = float(np.median([r["after"] for r in rows if r["speaker"] == "N" and r["e"] - r["s"] > 1.2]))
    cur = integrated(np.concatenate([np.zeros((2, ns(0.4))), ph, np.zeros((2, ns(0.4)))], axis=1))
    ph = ph * dbg(med - 8.0 - cur)
    t0 = tl.SPAN["v3_r01"][0] - 0.03
    i = ns(t0)
    m = min(N - i, ph.shape[1])
    out = v.copy()
    out[:, i:i + m] += ph[:, :m]
    return out, dict(start=t0 + 0.03, end=t0 + 0.03 + (b - a), level_vs_narrator=-8.0)


# ================================================================ the buses (extended time)
def duck_spans():
    """word spans in extended time: the hook's words also after the end (the fold brings them back to the start)"""
    sp = []
    for lid, w, s, e in tl.all_words():
        if tl.SOURCE == "voice" and lid not in tl.IN_VOICE and lid != "v3_r01":
            continue
        sp.append((s, e))
        if s < tl.CUT1:
            sp.append((s + tl.L, e + tl.L))
    if "v3_r01" not in tl.WORDS and "v3_t03" in tl.WORDS:     # the replay made here: its words still need the room
        d = tl.SPAN["v3_r01"][0] - tl.SPAN["v3_t03"][0]
        sp += [(s + d, e + d) for w, s, e in tl.WORDS["v3_t03"]]
    return sp


def fold(x):
    """extended time -> the film: what was rendered after the end (shot 1, as the continuation of the last shot) goes back to 0..CUT1"""
    y = x[:, :N + WRAP].copy()
    d = ns(0.012)
    y[:, N + WRAP - d:] *= np.linspace(1, 0, d)[None, :]        # the hard cut to the car at CUT1
    out = y[:, :N].copy()
    out[:, :WRAP] += y[:, N:N + WRAP]
    return out


def curve_spans(n, spans, db, ramp=0.08):
    t = np.arange(n) / SR
    g = np.zeros(n)
    for a, b in spans:
        g = np.minimum(g, db * np.clip(np.minimum((t - a) / ramp, (b - t) / ramp), 0, 1))
    return g


def gap_curve(db):
    """a lift over every stretch without a word that is GAP['min'] long or more (extended time; the stretch round the loop
    seam counts as one); 0 during the designed dead air of the look"""
    sp = sorted(duck_spans())
    t = np.arange(N_EXT) / SR
    g = np.zeros(N_EXT)
    edges = [(tl.CUT1 - 0.2, tl.CUT1 - 0.2)] + sp + [(N_EXT / SR + 1, N_EXT / SR + 1)]
    end = edges[0][1]
    for s_, e_ in edges[1:]:
        if s_ - end >= GAP["min"]:
            a, b = end + GAP["edge"], s_ - GAP["edge"]
            amt = db * (1.0 if s_ - end >= GAP["full"] else GAP["short"])
            g = np.maximum(g, amt * np.clip(np.minimum((t - a) / GAP["ramp"], (b - t) / GAP["ramp"]), 0, 1))
        end = max(end, e_)
    return g


def build_buses():
    cs, grid = Q.all_cues()
    files_fx = ["cues.py", "foley.py", "lib.py", "tl.py", "dsp.py", "sfx_gen.py"]

    def _fx():
        bus, rows = Q.render(cs, N_EXT, VREF0)
        return bus["sfx"], bus["amb"], rows
    sfx, amb_ev, cue_rows = cached("fx", files_fx, _fx)
    log(f"  effects: {len(cue_rows)} cues rendered")

    def _beds():
        a, rows = beds.build(N_EXT, VREF0)
        return a, rows
    amb, bed_rows = cached("beds", ["beds.py", "foley.py", "lib.py", "tl.py", "dsp.py", "sfx_gen.py"], _beds)

    def _music():
        sc, mel, table, dead = score.build(N_EXT, VREF0, grid)
        return sc, mel, table, dead
    sc, mel, mus_table, dead = cached("music", ["score.py", "instruments.py", "cues.py", "tl.py", "dsp.py", "foley.py"], _music)
    return dict(sfx=np.asarray(sfx, float), amb=np.asarray(amb, float) + np.asarray(amb_ev, float), score=np.asarray(sc, float), melody=np.asarray(mel, float)), \
        list(cue_rows), list(bed_rows), list(mus_table), float(dead), grid


def automate(b, vref):
    """scale to the real voice, the ducks, the designed quiet spots; still in extended time"""
    k = dbg(vref - VREF0)
    sp = duck_spans()
    env_w = M.key_env(N_EXT, sp, pre=0.10, post=0.05, att=0.015, rel=0.06)
    env_s = M.key_env(N_EXT, sp, pre=0.08, post=0.12, att=0.07, rel=0.45)
    S = tl.SHOT
    mus = (b["score"] + b["melody"]) * k
    mus = mus * dbg(DUCK["music_broad"] * env_s + gap_curve(GAP["music"]))[None, :]
    mus = M.band_gain(mus, DUCK["music_band"] * env_w)
    mus = hp(mus, 55.0, 2)
    sfx = M.band_gain(b["sfx"] * k * dbg(gap_curve(GAP["sfx"]))[None, :], DUCK["sfx_band"] * env_w)
    amb = b["amb"] * k
    rp = [(tl.SPAN["v3_r01"][0] - 0.06, tl.SPAN["v3_r01"][1] + 0.10)] if "v3_r01" in tl.SPAN else []
    rduck = curve_spans(N_EXT, rp, REPLAY_DUCK_DB, ramp=0.12)                            # the beds step down under the phone's replay
    mus = mus * dbg(rduck)[None, :]
    sfx = sfx * dbg(rduck)[None, :]
    amb = amb * dbg(rduck)[None, :]
    look = [(S["s15"][0] + 0.38, S["s15"][0] + 1.12)]                                    # the 0.7 s look: dead air
    amb = amb * dbg(DUCK["amb_broad"] * env_s + gap_curve(GAP["amb"]) + curve_spans(N_EXT, look, -8.0))[None, :]
    amb = hp(M.band_gain(amb, DUCK["amb_band"] * env_w), 55.0, 2)
    return dict(music=mus, sfx=sfx, amb=amb)


def fix_margins(v, st_, words):
    """words whose 1-4 kHz margin over everything else is under MARGIN_MIN: that band of the three beds dips under the word
    until it reads MARGIN_AIM (30 ms ramps). Returns the stems, the final rows, the fixes."""
    fixes = []
    for it in range(3):
        rows = M.word_margins(v, st_["music"] + st_["sfx"] + st_["amb"], words)
        low = [r for r in rows if r["margin"] < MARGIN_MIN + 0.2]
        if not low:
            break
        t = np.arange(N) / SR
        g = np.zeros(N)
        for r in low:
            need = min(12.0, MARGIN_AIM - r["margin"] + 0.5)
            g = np.minimum(g, -need * np.clip(np.minimum((t - (r["s"] - 0.06)) / 0.03, (r["e"] + 0.05 - t) / 0.03), 0, 1))
            fixes.append(dict(word=r["w"], line=r["line"], s=r["s"], margin=r["margin"], dip=need, pass_=it + 1))
        for kx in st_:
            st_[kx] = M.band_gain(st_[kx], g)
    rows = M.word_margins(v, st_["music"] + st_["sfx"] + st_["amb"], words)
    return st_, rows, fixes


# ================================================================ reports
def shot_table(v, st_):
    rows = []
    for sid in tl.ORDER:
        a, b = tl.SHOT[sid]
        seg = slice(ns(a), min(N, ns(b)))

        def L(x):
            z = x[:, seg]
            if z.shape[1] < ns(0.45):
                return -99.0
            m = momentary(z, hop=0.05)
            return float(10 * np.log10(np.mean(10 ** (m / 10)) + 1e-12))
        rows.append(dict(shot=sid, a=round(a, 3), b=round(b, 3), place=tl.PLACE[sid], voice=L(v), music=L(st_["music"]), sfx=L(st_["sfx"]), amb=L(st_["amb"]),
                         bed=L(st_["music"] + st_["sfx"] + st_["amb"])))
    return rows


def write_cue_sheet(path, cue_rows, bed_rows, mus_table, grid, vinfo, replay, dead):
    Lr = []
    Lr.append("# CUE SHEET: Why Japanese Train Drivers Point at Nothing (script v3)")
    Lr.append("")
    Lr.append(f"Generated by `mix.py` on {time.strftime('%Y-%m-%d %H:%M')}. {tl.summary().splitlines()[0]}")
    Lr.append("")
    Lr.append("Every row hangs on an ANCHOR (a voice line `v3_n03.s`, a word `v3_n03:finger.s`, a shot `s07.a`), never on a clock time. The seconds and "
              "frames below are what those anchors resolve to with the voice and cuts named above; they move by themselves when the voice or the cuts move. "
              "`lv` = the loudest 0.4 s of the sound in LU under the voice. To move one cue after the animation lands, see NOTES.md (picture_events.json).")
    Lr.append("")
    n_ev = len(cue_rows)
    Lr.append(f"**{n_ev} effect events + {len(bed_rows)} ambience beds + {len(mus_table)} music cues + the departure melody (2 passes) = {n_ev + len(bed_rows) + len(mus_table) + 1} cues.**")
    Lr.append("")
    Lr.append("## 1. Ambience beds (one continuous bed per scene, heard through each shot's perspective)")
    Lr.append("| shots | from s | to s | what is heard |")
    Lr.append("|---|---|---|---|")
    for sid, a, b, what in bed_rows:
        Lr.append(f"| {sid} | {float(a) - (tl.L if float(a) >= tl.L else 0):.2f} | {float(b) - (tl.L if float(b) > tl.L + 0.01 else 0):.2f} | {what} |")
    Lr.append("")
    Lr.append("## 2. Effect events, shot by shot")
    for sid in tl.ORDER:
        rs = [r for r in cue_rows if r["shot"] == sid]
        a, b = tl.SHOT[sid]
        Lr.append("")
        Lr.append(f"### {sid}  {a:.2f}-{b:.2f} s  (frames {int(round(a * tl.FPS))}-{int(round(b * tl.FPS))})  place: {tl.PLACE[sid]}")
        if not rs:
            Lr.append("(no single events: the bed, the music and the voice carry this shot; see sections 1 and 3)")
            continue
        Lr.append("| cue | s | frame | anchor | sound | lv | picture action | feeling |")
        Lr.append("|---|---|---|---|---|---|---|---|")
        for r in rs:
            Lr.append(f"| {r['id']}{' (moved)' if r['moved'] else ''} | {r['t']:.3f} | {r['frame']} | `{r['anchor']}` | {r['snd']} | {r['lv']} | {r['what']} | {r['feel']} |")
    Lr.append("")
    Lr.append("## 3. Music: the underscore (each beat its own colour) and the departure melody")
    Lr.append("| cue | from s | to s | feeling | what plays | level (LU under the voice) |")
    Lr.append("|---|---|---|---|---|---|")
    for r in mus_table:
        Lr.append(f"| {r['name']} | {r.get('a', 0):.2f} | {r.get('b', 0):.2f} | {r['feel']} | {r['what']} | {r['lv']} |")
    Lr.append(f"| MELODY | {grid['start']:.2f} | {grid['end']:.2f} | the clock | OUR departure melody (D major, 3/4, a {grid['phrase']:.2f} s phrase played twice, pulse {grid['pulse']:.4f} s) "
              f"from the platform's speakers: it starts on 'Japan's', the second pass starts at {grid['start'] + grid['phrase']:.2f} s, the last note at {grid['end'] - grid['pulse']:.2f} s; "
              f"faint under the jars, loud in the cutaway, stepping back under 'A finger and a shout' | -17 platform / -13 doorway / -26 lab |")
    Lr.append(f"| (stop) | {dead:.2f} | | flat defeat | the music stops DEAD on 'gone.'; only the train runs on through the loop seam | |")
    Lr.append("")
    Lr.append("No music from 0.00 s to the first cut. The six balls and the single ball ride the melody's pulses: " + ", ".join(f"{b:.2f}" for b in grid["balls"]) + f" and {grid['one']:.2f} s.")
    Lr.append("")
    Lr.append("## 4. Voice")
    Lr.append(f"Source: {vinfo.get('source', '?')}. " + ("The phone's replay of 'What's a finger gonna do?' and the laugh / giggle takes come with the voice track (its own stems)."
                                                           if not replay else f"The phone's replay was made in the mix from the v3_t03 take: {replay['start']:.2f}-{replay['end']:.2f} s, 8 dB under the narrator."))
    open(path, "w", encoding="utf-8").write("\n".join(Lr) + "\n")


def write_licenses(path):
    src = lib.sources()
    used = dict(lib.USED)
    Lr = ["# LICENSES: recorded sounds in the pointing film's soundtrack", "",
          "All recordings are Creative Commons 0 1.0 (public-domain dedication, https://creativecommons.org/publicdomain/zero/1.0/), EXCEPT the two rows whose author is",
          "'ElevenLabs (generated)': sound effects generated on the owner's ElevenLabs plan on 2026-11-20 (the prompt is in the source column; every generation and the",
          "credit counter are logged in `_eleven/credits_log.jsonl`).",
          "They were fetched as Freesound HQ previews by `fs_fetch.py`, which opens each sound's own page and refuses anything whose page does not link the CC0 deed",
          "(checked on 2026-11-19), or copied from the studio's sound-effects reference library (CC0 entries only). CC0 needs no credit; this list is the proof of source.",
          "Sources can change their terms: re-open each page before publishing. ElevenLabs sound effects: 275 credits spent (4 train takes, 3 door takes; 2 used).", "",
          "Voice: ElevenLabs text-to-speech through the owner's plan (the voice folder's own notes). Music: no third-party music; the score and the departure melody are",
          "original, written in `score.py` and played by this repo's synthesized instruments. Synthesized in code (no recording): the motor model, rail-joint clicks,",
          "door roll and chime, relay click, platform air and hums, the guide chirp, the wordless PA murmur, the jar's ring, the lamp bip, the bar fill.", "",
          "| file in _lib/ | used in this mix | title | author | source | licence | what it is used for |", "|---|---|---|---|---|---|---|"]
    for name in sorted(src):
        r = src[name]
        Lr.append(f"| {name}.wav | {'yes' if used.get(name) else 'no (kept as an alternate)'} | {str(r.get('title', ''))[:70]} | {r.get('author', '?')} | {r.get('source', '?')} | {r.get('licence', '?')} | {r.get('use', '')} |")
    open(path, "w", encoding="utf-8").write("\n".join(Lr) + "\n")


# ================================================================ main
def main():
    t0 = time.time()
    log(tl.summary())
    log(f"film {tl.L:.3f} s = {tl.TOTAL} f = {N} samples; the first cut at {tl.CUT1:.3f} s; extended time line {N_EXT / SR:.2f} s")
    dlg, ov, vsrc = load_voice()
    v, vrows, vinfo = voice_chain(dlg, ov)
    vinfo["source"] = vsrc
    v, replay = phone_replay(v, vrows) if vrows else (v, None)
    vref = vinfo["lufs"]
    log(f"voice: {vsrc}; {vinfo.get('raw_lufs', 0):.1f} -> {vref:.1f} LUFS; " + (f"comp max {vinfo['comp_max_gr']:.1f} dB, peak limiter max {vinfo['peak_gr_max']:.1f} dB" if vrows else "no voice"))
    b, cue_rows, bed_rows, mus_table, dead, grid = build_buses()
    st_ = automate(b, vref)
    del b
    st_ = {k: fold(x) for k, x in st_.items()}
    words = [(lid, w, s, e) for lid, w, s, e in tl.all_words() if tl.SOURCE == "plan" or lid in tl.IN_VOICE]
    fixes, mrows = [], []
    if vrows:
        st_, mrows, fixes = fix_margins(v, st_, words)
    tgt = {}
    if V4_TARGETS:
        key = M.key_env(N, [(s, e) for lid, w, s, e in words], pre=0.05, post=0.05, att=0.02, rel=0.08)
        st_["amb"], tgt["amb_trim_db"] = T.trim_to(st_["amb"], vref, T.AMB_UNDER)
        st_["sfx"], tgt["sfx_trim_db"] = T.trim_to(T.brighten(st_["sfx"]), vref, T.SFX_UNDER)
        st_["amb"], tgt["amb_tone_cut_s"] = T.tone_suppress(st_["amb"], key)
        st_["sfx"], tgt["sfx_tone_cut_s"] = T.tone_suppress(st_["sfx"], key)
        v = v + T.room_tone(N, vref + T.ROOM_DB)
        pre0 = v + st_["music"] + st_["sfx"] + st_["amb"]
        mg, b0 = T.match_gains(pre0)
        v = T.apply_match(v, mg)
        st_ = {k: T.apply_match(x, mg) for k, x in st_.items()}
        tgt.update(master_match=mg, bands_before=b0)
        log(f"v4 targets: ambience {tgt['amb_trim_db']:+.1f} dB, effects {tgt['sfx_trim_db']:+.1f} dB (brightened), tones cut under words "
            f"{tgt['amb_tone_cut_s']:.1f} / {tgt['sfx_tone_cut_s']:.1f} s, room tone {T.ROOM_DB} LU, master match {mg} (bands before {b0})")
    pre = v + st_["music"] + st_["sfx"] + st_["amb"]
    if tl.PARTIAL or not vrows:
        # only part of the voice exists (the opening build) or none: the film's own loudness cannot be measured yet, so the
        # master gain puts the VOICE where it sits in a full mix (VOICE_AT); every balance is then the final one
        g = VOICE_AT - vref
        y, gr = M.limiter(pre * dbg(g), CEIL_DBTP, loop=True)
        log(f"PARTIAL VOICE: master gain set from the voice ({vref:.1f} -> {VOICE_AT} LUFS); the integrated loudness of this file is NOT the film's")
    else:
        g = TARGET_LUFS - M.lufs(pre)
        for _ in range(4):
            y, gr = M.limiter(pre * dbg(g), CEIL_DBTP, loop=True)
            err = TARGET_LUFS - M.lufs(y)
            if abs(err) < 0.03:
                break
            g += err
    stems = {"voice": v * dbg(g), "music": st_["music"] * dbg(g), "sfx": st_["sfx"] * dbg(g), "amb": st_["amb"] * dbg(g)}
    I_, TP = M.lufs(y), float(true_peak(y))
    LRA = float(lra(y))
    grdb = -20 * np.log10(np.maximum(gr, 1e-9))
    log(f"master: gain {g:+.2f} dB -> {I_:.2f} LUFS, true peak {TP:.2f} dBTP, LRA {LRA:.1f} LU; limiter max {grdb.max():.2f} dB, > 0.5 dB on {(grdb > 0.5).mean() * 100:.2f} % of samples")
    # ---------------------------------------------------------------- files
    out = lambda nm: os.path.join(HERE, nm)
    write_wav(out(f"mix{TAG}.wav"), y)
    for k, x in stems.items():
        write_wav(out(f"stem_{k}{TAG}.wav"), x)
    hook_n = ns(12.0)
    hook = fades(y[:, :hook_n], 0.0, 0.03)
    write_wav(out(f"hook_0-12s{TAG}.wav"), hook)
    me = (stems["music"] + stems["sfx"] + stems["amb"])[:, :hook_n]          # the same 12 s without the voice (music + effects + ambience)
    write_wav(out(f"hook_0-12s_ME{TAG}.wav"), fades(me, 0.0, 0.03))
    try:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out(f"mix{TAG}.wav"), "-c:a", "libmp3lame", "-b:a", "256k", out(f"mix{TAG}_preview.mp3")], check=True)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", out(f"hook_0-12s{TAG}.wav"), "-c:a", "libmp3lame", "-b:a", "256k", out(f"hook_0-12s{TAG}.mp3")], check=True)
    except Exception as ex:  # noqa
        log("mp3 previews not written:", ex)
    # ---------------------------------------------------------------- measurements
    eb = M.ffmpeg_ebur(out(f"mix{TAG}.wav"))
    seam = M.seam_report(y, stems)
    sh = shot_table(stems["voice"], stems)
    mono = y.mean(0)
    mono_loss = M.lufs(y) - M.lufs(st(mono))
    ph = hp(y, 400.0, 2)
    hookL = M.lufs(np.concatenate([hook, hook], axis=1))
    marg = sorted(mrows, key=lambda r: r["margin"])[:12]
    mm = [r["margin"] for r in mrows]
    sec = []
    for r in mus_table:
        a_, b_ = float(r.get("a", 0)), float(r.get("b", 0))
        if b_ - a_ > 0.5:
            seg = slice(ns(a_), min(N, ns(b_)))
            mz = stems["music"][:, seg]
            vz = stems["voice"][:, seg]
            f3 = lambda z: M.lufs(np.concatenate([z] * max(1, int(np.ceil(1.3 / max(0.1, z.shape[1] / SR)))), axis=1))
            sec.append(dict(name=r["name"], a=a_, b=b_, feel=r["feel"], music=f3(mz), voice=f3(vz)))
    emp = lambda a, b: float(M.lufs(np.concatenate([(stems["music"] + stems["sfx"] + stems["amb"])[:, ns(a):ns(b)]] * 3, axis=1)))
    rep = dict(made=time.strftime("%Y-%m-%d %H:%M:%S"), tag=TAG, timeline=dict(source=tl.SOURCE, voice_dir=tl.VOICE_DIR if tl.SOURCE == "voice" else None, shots=tl.SHOT_SRC,
                                                                                L=tl.L, frames=tl.TOTAL, cut1=tl.CUT1, words_missing=tl.MISSING, lines_absent=tl.ABSENT),
               master=dict(integrated_lufs=I_, true_peak_dbtp=TP, lra=LRA, momentary_max=float(momentary_max(y)), short_term_max=float(np.nanmax(short_term(y))),
                           gain_db=g, limiter_max_db=float(grdb.max()), limiter_pct_over_0_5=float((grdb > 0.5).mean() * 100), ffmpeg_ebur128=eb, ceiling=CEIL_DBTP),
               stems_lufs={k: M.lufs(x) for k, x in stems.items()}, stems_sum_error=float(np.abs(sum(stems.values()) - pre * dbg(g)).max()),
               voice=dict(info={k: v_ for k, v_ in vinfo.items() if not isinstance(v_, np.ndarray)}, lines=vrows, replay=replay),
               margins=dict(min=float(min(mm)) if mm else None, p10=float(np.percentile(mm, 10)) if mm else None, median=float(np.median(mm)) if mm else None,
                            under_7=[r for r in mrows if r["margin"] < MARGIN_MIN], lowest=marg, fixes=fixes),
               hook=dict(seconds=12.0, lufs=hookL, first_0_5s_dbfs=float(20 * np.log10(np.sqrt(np.mean(y[:, :ns(0.5)] ** 2)) + 1e-12)),
                         s0_5_to_3_dbfs=float(20 * np.log10(np.sqrt(np.mean(y[:, ns(0.5):ns(3.0)] ** 2)) + 1e-12)),
                         bed_0_3s_lufs=emp(0.0, tl.CUT1), music_before_cut1_dbfs=float(20 * np.log10(np.abs(stems["music"][:, :ns(tl.CUT1 - 0.02)]).max() + 1e-12))),
               loop_seam=seam, shots=sh, music_sections=sec, melody=grid, music_dead_stop=dead,
               mono_fold_loss_lu=float(mono_loss), phone_speaker_400hz_hp_lufs=M.lufs(ph),
               cues=dict(events=len(cue_rows), beds=len(bed_rows), music=len(mus_table) + 1, total=len(cue_rows) + len(bed_rows) + len(mus_table) + 1),
               library_files_used=dict(lib.USED), seconds=time.time() - t0)
    json.dump(rep, open(out(f"mix_report{TAG}.json"), "w", encoding="utf-8"), indent=1, default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o))
    write_cue_sheet(out(f"CUE_SHEET{TAG}.md"), cue_rows, bed_rows, mus_table, grid, vinfo, replay, dead)
    json.dump(dict(made=rep["made"], timeline=rep["timeline"], fps=tl.FPS, shots={k: dict(a=a, b=b, fa=int(round(a * tl.FPS)), fb=int(round(b * tl.FPS))) for k, (a, b) in tl.SHOT.items()},
                   lines={k: dict(s=a, e=b) for k, (a, b) in tl.SPAN.items()}, melody=grid, music_dead_stop=dead,
                   doors=dict(plant_start=tl.ev(Q.DOORS_A), plant_meet=tl.ev(Q.DOORS_A) + Q.DOOR_T, plant_lamps=tl.ev(Q.DOORS_A) + 1.55, plant_glide=tl.ev(Q.GLIDE_A),
                              payoff_start=tl.ev(Q.DOORS_B), payoff_meet=tl.ev(Q.DOORS_B) + Q.DOOR_T, payoff_lamps=tl.ev(Q.DOORS_B) + 1.60, payoff_glide=tl.ev(Q.GLIDE_B)),
                   cues=[dict(id=r["id"], t=r["t"], frame=r["frame"], anchor=r["anchor"], sound=r["snd"], what=r["what"]) for r in cue_rows]),
              open(out(f"sound_times{TAG}.json"), "w", encoding="utf-8"), indent=1, default=float)
    write_licenses(out("LICENSES.md"))
    # ---------------------------------------------------------------- the short report on screen
    log(f"ffmpeg ebur128: {eb}")
    log(f"stems (LUFS): " + ", ".join(f"{k} {M.lufs(x):.1f}" for k, x in stems.items()) + f"; stems sum to the pre-limiter mix within {rep['stems_sum_error']:.1e}")
    if mm:
        log(f"word margins (voice over everything else, 1-4 kHz): min {min(mm):.1f}, p10 {np.percentile(mm, 10):.1f}, median {np.median(mm):.1f} dB; {len(rep['margins']['under_7'])} words under 7 dB; {len(fixes)} dips applied")
    log(f"hook 0-12 s: {hookL:.1f} LUFS; 0-0.5 s {rep['hook']['first_0_5s_dbfs']:.1f} dBFS RMS, 0.5-3 s {rep['hook']['s0_5_to_3_dbfs']:.1f} dBFS RMS; music before cut 1: {rep['hook']['music_before_cut1_dbfs']:.0f} dBFS peak")
    log(f"loop seam: jump {seam['jump']:.5f} vs p99 sample step {seam['step_p99_tail']:.5f} (tail) / {seam['step_p99_head']:.5f} (head); last 150 ms {seam['rms_last_150ms']:.1f} dBFS, first 150 ms {seam['rms_first_150ms']:.1f} dBFS")
    for k in ("sfx", "amb", "music", "voice"):
        s_ = seam[k]
        log(f"   {k:5s}: 40 ms before {s_['rms_before_40ms']:.1f} / after {s_['rms_after_40ms']:.1f} dBFS; 150 ms before {s_['rms_before']:.1f} / after {s_['rms_after']:.1f} dBFS, jump {s_['jump']:.5f}, bands before {[round(x) for x in s_['band_db_before']]} after {[round(x) for x in s_['band_db_after']]}")
    quiet = [r for r in sh if r["bed"] < -45]
    log("shots (LUFS mean of momentary): " + " | ".join(f"{r['shot']} v{r['voice']:.0f} m{r['music']:.0f} s{r['sfx']:.0f} a{r['amb']:.0f}" for r in sh))
    if quiet:
        log("  shots whose non-voice sound is under -45 LUFS: " + ", ".join(r["shot"] for r in quiet))
    log(f"mono fold loses {mono_loss:.2f} LU; through a 400 Hz high-pass (a phone speaker) the mix reads {M.lufs(ph):.1f} LUFS")
    log(f"cues: {rep['cues']}; done in {time.time() - t0:.0f} s -> mix{TAG}.wav")


if __name__ == "__main__":
    snapshot_keys()
    main()
