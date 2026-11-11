# Final mix of "The Anti-Theft Sign That Made People Steal": the voice (gain only) + the original caper score (ducked
# under speech, per-section level relative to the voice) + the SFX events stem + the ambience beds stem.
# The voice runs through a gentle bus compressor (round 2, A1 P3: ~3-4 dB on loud syllables, so the master limiter only
# touches peaks). Master gain to -14.0 LUFS integrated, own 4x-oversampled look-ahead limiter (ceiling -2.6 dBTP so the
# AAC 256k mux stays <= -2.0 dBTP), exactly
# timeline.json total frames / fps seconds (48 kHz, stereo, 24-bit). No fade at either end: the desert wind is one
# continuous loop, so the last sample runs straight into the first.
# Writes mix.wav + stem_voice/music/sfx/amb.wav (at mix gain, pre-limiter, they sum to the mix), cues.md.
# Round 4 (A3): every run first re-exports timeline.json from the merged story.ts and re-runs the two picture probes
# (studio/scripts/audio_probe.mjs, audio_cast_probe.mjs), so the cues follow the merged picture by themselves
# (`--no-probe` skips that); a +3 dB low shelf at 80 Hz on the music bus; BEAT_DUCKS (frame windows keyed to beats).
# Round 5 (A4, fix round 4): the narration is the ElevenLabs take on a VIDEO clock (timeline.py fr() / sec_to_old() / the warped
# shot_weights()); every cue stays keyed to picture frames, beats or word gaps, so after a voice swap a plain `python mix.py`
# is all that is needed. New here: voice_clean() (join fades + a conservative phrase-tail gate on any take), a 70 Hz voice
# high-pass, the phrase LEVELER before the rides (LRA 3.9 -> ~2.7), a split-band de-esser + presence shelf, 60 Hz high-pass
# on the music / bed buses (the A3 80 Hz shelf is gone), a 1-4 kHz speech-band duck on the SFX / music while words are
# spoken (the climax hits exempt), and the cue sheet prints video + picture frames.
# Round 6 (A5, fix round 5): rides may start on a word ('and@sign1'); new rides on 'and wanted to steal.' (+2.5), 'everybody
# cheats.' (+2), 'And the bait wood?' (+3), 'It gave them permission.' (+2); WORD_DUCKS (music -3 dB on the two punch
# lines); the permission build -6 dB through 'It gave them'; the slam tail -6 dB from 'per-'; band-duck exemptions end at
# the word the hit precedes; an extra -3 dB de-ess on the last line; the music / bed bus filters run circularly (loop seam)
# and the score's last sample is exactly 0.
# Cache: _cache/<name>-<hash>.npy, one hash per stage over exactly the inputs of that stage (music: music.py,
# instruments.py, dsp.py, timeline.py, timeline.json, words.json; sfx: sfx.py, sfx_gen.py, dsp.py, timeline.py,
# timeline.json, words.json, picture_events.json, voice.wav, mix.py), so an edit or a new voice take can never reuse a
# stale render; cache files of older hashes are deleted every run.
import os
import sys
import time
import json
import glob
import hashlib
import subprocess
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, momentary_max, short_term, lra, true_peak, shelf, hp)

# round 4: re-export the picture clock from the merged story.ts BEFORE timeline.py reads it, so a voice / picture re-time
# reaches every BEAT-keyed cue on the next run (`--no-probe` skips this and the two picture probes)
if __name__ == "__main__" and "--no-probe" not in sys.argv:
    _st = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
    try:
        _r = subprocess.run(["node", "scripts/export_timeline.mjs"], cwd=_st, capture_output=True, text=True, timeout=300)
        print(f"[{time.strftime('%H:%M:%S')}] timeline: " + ((_r.stdout.strip().splitlines() or [''])[-1] if _r.returncode == 0 else
              f"export FAILED ({_r.returncode}) {_r.stderr.strip()[-300:]} - keeping the last timeline.json"), flush=True)
    except Exception as _e:  # noqa
        print(f"timeline export FAILED ({_e}) - keeping the last timeline.json", flush=True)
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "_cache")
N = ns(T.DUR)
TARGET_LUFS = -14.0
CEIL_DBTP = -2.9                 # limiter ceiling (spec: true peak <= -2.0 dBTP in the final AAC mux; A2 P3: the AAC of preview2
                                 # overshot -2.6 to -2.0, so 0.3 dB more margin)
# A2 P3: the tightest voice-over-bed margins sat on key words. Dip the RING TAILS under the stressed syllable (the hits
# themselves land before each window and stay): (stem, word, after beat, window start / end relative to the word's start
# (s), dB). 'per-MIS-sion' ~52.95-53.15 (the stamp hits 52.83); 'twice' 61.00-61.25 (the chord + the ding land 60.97);
# 'day...' under the first flip flaps; 'now.' after the comic plonk + sweat plip
# A5 P2: the stamp slam's tail -6 dB from the onset of 'per-' for 200 ms (10 ms ramp, the impact itself stays), then the
# old -2 dB ring dip; the flaps under 'day...' -5 dB (was -1.5). An optional 7th value is the ramp (s).
KEY_DUCKS = [("sfx", "permission", "gave", 0.0, 0.20, -6.0, 0.01), ("sfx", "permission", "gave", 0.10, 0.32, -2.0),
             ("music", "twice", "soSome", 0.03, 0.28, -2.0),
             ("sfx", "twice", "soSome", 0.0, 0.30, -5.0, 0.012), ("sfx", "day", "vandalized", 0.0, 0.22, -5.0),
             ("music", "honest", "but", 0.0, 0.24, -2.0),
             ("music", "now", "whisper", 0.05, 0.3, -1.5), ("sfx", "now", "whisper", 0.06, 0.3, -1.5)]
KEY_RAMP = 0.025
# A3 P3: frame windows keyed to BEATS where the bed came within 2-4 dB of the voice: (stem, from beat, +f, to beat, +f, dB,
# ramp frames). The permission crescendo's marimba tremolo under the tail of 'thieves.' (thieves+4 .. gave, 1556-1568 today).
# (The early split-flap cards under 'day...' are 3 dB softer inside the flip cue itself: sfx.py 'flip_hush_until'.)
# A5 P2: the crescendo held -6 dB from the tail of 'thieves.' through 'It gave them' up to the stop-time cut (permission-2)
BEAT_DUCKS = [("music", "thieves", 4, "permission", -2, -6.0, 3)]
# A5 P2/P3: music dips over whole lines (first word spec, last word, dB), ramped in the word gaps like the voice rides:
# the punch 'everybody cheats.' and 'It sounds like what everyone does.' (the bed was only ~12.5 dB under the voice)
WORD_DUCKS = [("music", "everybody@hears", "cheats", -3.0), ("music", "It@sounds", "=does", -3.0),
              # A5 (measured on the round-6 mix): the two lines still most masked by the score, 'little pieces' (7.8 dB 1-4 kHz
              # margin) and 'of the pieces vanished' (8.6 dB), under the setting tune / the busy results ostinato
              ("music", "little@pocketing", "pieces", -2.5), ("music", "of@pct2", "=vanished", -2.5)]
# A3 P3 (spectral balance): +3 dB low shelf at 80 Hz on the music bus (with the pizz bass's soft sub octave in
# instruments.py, the score gets a real bottom under the voice); the stamp / parcel / flip-lock thumps get +2.5 dB at 70 Hz in sfx.py
MUSIC_LOW_SHELF = None          # A4 P2: the A3 +3 dB at 80 Hz is gone (the sub band ran ~5 dB over the references)
STUDIO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
DUCK_DB = -2.5                   # music dip while the voice speaks (keyed from words.json, not the audio)
CORR_MAX = 4.0                   # per-section level correction is clamped to +-4 dB around the global music gain

# music level per section, LU relative to the voice in that section (bible: bed ~18 LU under the voice)
MUSIC_TARGET = {"hook": -18.5, "setting": -17.5, "quote": -20.5, "whisper": -21.0, "mystery": -19.0, "professor": -17.5,
                "team": -17.0, "signs": -18.0, "results": -16.5, "blueprint": -19.0, "classroom": -18.0, "permission": -17.0,
                "twist": -18.0, "swell": -16.0, "tail": -18.0}
GLOBAL_MUSIC = -18.0             # whole-score level vs the whole voice, before the per-section corrections
# voice gain rides (gain only, ramped inside the word gaps): the references punch the pivot and the twist line
# +2.5-3 dB (CHANNEL_STYLE_BIBLE section 9). (first beat, last word of the line, dB)
# A5: a ride may start on a WORD: "word@beat" = the first `word` at / after that beat (so it ramps in the gap before
# the word, not on a beat frame); "@0" = the first word of the film
VOICE_RIDES = [("youSee", "other", +2.5), ("soSome", "twice", +2.5),
               # round 5 (A4 P2: LRA 3.9 vs 1.7-3.1; the old down-rides sat on a read that is already low): the phrase
               # leveler (LEVEL) evens the take first, then only small story moves stay - the hook +1 (A4 P3: the first line
               # was the quietest but one), the narrated lead-in to the whisper -0.5, the whispered line itself +1.5 (keeps
               # its texture, ~5 LU under the read), the twist question +1.5 (A4 P2: 'And the bait wood?' sat 4.5 dB low),
               # the climax line a touch forward
               ("@0", "steal", +1.0), ("sheRead", "whispered", -0.5), ("whisper", "now", +1.5),
               # A5: the hook's payoff 'and wanted to steal.' +2.5 more (it was the quietest phrase, -16.1 vs -13.9 LUFS);
               # 'everybody cheats.' +2 (the analogy's punch sank); the twist question +3 (was +1.5); the climax line
               # 'It gave them permission.' +2.5 (was +0.5: it sat 1.7 LU under its own setup; +2 left it 0.4 LU under)
               ("and@sign1", "steal", +2.5), ("everybody@hears", "cheats", +2.0), ("and", "wood", +3.0),
               ("It@gave", "permission", +2.5)]
# voice-bus compressor (A1 P3): soft-knee, threshold at the loud-syllable level of this take, fast attack, speech release
VCOMP = dict(ratio=2.0, knee_db=6.0, att=0.005, rel=0.1, thr_pct=60.0)
VPEAK_CREST = 11.5               # voice-bus peak limiter: true peak at most this far above the voice's integrated loudness


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


# ================================================================ cache keyed on the inputs
PE_JSON = os.path.join(HERE, "picture_events.json")
CAST_JSON = os.path.join(HERE, "picture_cast.json")
STAGE_INPUTS = {
    "music": ["music.py", "instruments.py", "dsp.py", "timeline.py", T.TL_PATH, T.WORDS_PATH],
    "sfx": ["sfx.py", "sfx_gen.py", "dsp.py", "timeline.py", T.TL_PATH, T.WORDS_PATH, PE_JSON, os.path.join(HERE, "picture_probe.json"), CAST_JSON,
            T.VOICE_PATH, "mix.py"],
}


def _hash(files):
    h = hashlib.sha1()
    for p in files:
        p = p if os.path.isabs(p) else os.path.join(HERE, p)
        h.update(os.path.basename(p).encode())
        if os.path.exists(p):
            with open(p, "rb") as f:
                h.update(f.read())
        else:
            h.update(b"<missing>")
    return h.hexdigest()[:12]


def input_hash():
    """one key over every input (reported in cues.md / stats)"""
    return _hash(sorted(glob.glob(os.path.join(HERE, "*.py"))) + [T.TL_PATH, T.WORDS_PATH, T.VOICE_PATH, PE_JSON, os.path.join(HERE, "picture_probe.json"), CAST_JSON])


def run_probes():
    """round 4: re-read the merged picture before every mix (no render): the tumbleweed routes through the film camera
    (audio_probe.mjs -> picture_probe.json) and the cast's own frames (audio_cast_probe.mjs -> picture_cast.json). A failed
    probe keeps the last JSON (and says so); `python mix.py --no-probe` skips both."""
    if "--no-probe" in sys.argv:
        log("probes skipped (--no-probe): using the existing picture_probe.json / picture_cast.json")
        return
    for script in ("scripts/audio_probe.mjs", "scripts/audio_cast_probe.mjs"):
        try:
            r = subprocess.run(["node", script], cwd=STUDIO, capture_output=True, text=True, timeout=600)
            tail = (r.stdout.strip().splitlines() or [""])[-1]
            log(f"probe {script}: " + (tail if r.returncode == 0 else f"FAILED ({r.returncode}) {r.stderr.strip()[-300:]} - keeping the last JSON"))
        except Exception as e:  # noqa
            log(f"probe {script}: FAILED ({e}) - keeping the last JSON")


KEY = None
KEYS = {}


def cached(name, fn):
    os.makedirs(CACHE, exist_ok=True)
    stage = "music" if name.startswith("music") else "sfx"
    p = os.path.join(CACHE, f"{name}-{KEYS[stage]}.npy")
    if os.path.exists(p):
        log("cache hit", os.path.basename(p))
        return np.load(p, allow_pickle=False).astype(np.float64)
    x = fn()
    np.save(p, np.asarray(x, np.float32))
    return x


def purge_cache():
    keep = set(KEYS.values()) | {KEY}
    for p in glob.glob(os.path.join(CACHE, "*.npy")) + glob.glob(os.path.join(CACHE, "stats-*.json")):
        if not any(k in os.path.basename(p) for k in keep):
            os.remove(p)


# ================================================================ voice
def load_voice():
    x, sr = read_wav(T.VOICE_PATH)
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    if sr != SR:                                   # e.g. a raw 24 kHz TTS take: resample (polyphase) to 48 kHz
        from math import gcd
        k = gcd(SR, sr)
        v = signal.resample_poly(v, SR // k, sr // k)
        log(f"voice resampled {sr} -> {SR} Hz")
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def line_start(spec):
    """'@0' | 'word@beat' | beat -> start time (s) of the line, or None"""
    if spec == "@0":
        return float(T.WORDS[0]["s"])
    if "@" in spec:
        w, b = spec.split("@", 1)
        if b not in T.BEAT:
            return None
        try:
            return float(T.word(w, T.bt(b) - 0.3)["s"])
        except KeyError:
            return None
    return T.bt(spec) if spec in T.BEAT else None


def line_span(first, last):
    """(a, z, ramp-in (s0, s1), ramp-out (e0, e1)) of a line from its first word / beat to its last word (ramped in the word
    gaps around it; >= 30 ms ramps when the words touch)"""
    a = line_start(first)
    if a is None:
        return None
    try:
        if last.startswith("="):        # exact word (so "=does" skips "doesn't")
            z = float(next(w for w in T.WORDS if float(w["s"]) >= a - 1e-6 and T._clean(w["w"]) == T._clean(last[1:]))["e"])
        else:
            z = float(T.word(last, a)["e"])
    except (KeyError, StopIteration):
        return None
    prev_end = max([float(w["e"]) for w in T.WORDS if float(w["e"]) <= a + 1e-3] or [a - 0.1])
    nxt = [float(w["s"]) for w in T.WORDS if float(w["s"]) >= z - 1e-3]
    next_start = nxt[0] if nxt else T.DUR
    r0 = (min(max(prev_end, a - 0.12), a - 0.04), a - 0.01) if a > 0.15 else (0.0, 0.005)
    r1 = (z + 0.02, min(next_start - 0.01, z + 0.15)) if next_start > z + 0.05 else (z, z + 0.04)
    return a, z, r0, r1


def span_curve(first, last, db):
    t = np.arange(N) / SR
    sp = line_span(first, last)
    if sp is None:
        return None, None
    a, z, r0, r1 = sp
    g = np.interp(t, [r0[0], max(r0[1], r0[0] + 0.005), r1[0], max(r1[1], r1[0] + 0.005)], [0, db, db, 0], left=0, right=0)
    return g, (a, z)


def voice_ride_db():
    """per-sample voice gain (dB): each ride ramps up in the gap before its line and down in the gap after it"""
    out = np.zeros(N)
    rows = []
    for beat, last, db in VOICE_RIDES:
        g, az = span_curve(beat, last, db)
        if g is None:
            continue
        out += g
        rows.append((beat, last, az[0], az[1], db))
    return out, rows


def word_duck_db(stem):
    """per-sample gain (dB) of one stem over the WORD_DUCKS lines; returns (curve, rows)"""
    g = np.zeros(N)
    rows = []
    for st_, first, last, db in WORD_DUCKS:
        if st_ != stem:
            continue
        c, az = span_curve(first, last, db)
        if c is None:
            continue
        g = np.minimum(g, c)
        rows.append((stem, f"{first}..{last}", az[0], az[1], db))
    return g, rows


def voice_comp(v, ratio=2.6, knee_db=6.0, att=0.003, rel=0.09, thr_pct=62.0, ctrl=2000):
    """gentle feed-forward bus compressor on the voice: 2 ms RMS detector at a 2 kHz control rate, soft knee, threshold =
    the thr_pct percentile of the detector level over the spoken words (so it only works on the loud syllables).
    Returns the compressed voice, the gain-reduction curve (dB, >= 0) and the threshold."""
    m = v.mean(0)
    hop = SR // ctrl
    nb = len(m) // hop
    e = (m[: nb * hop] ** 2).reshape(nb, hop).mean(1)
    e = ndimage.uniform_filter1d(e, 4)                          # 2 ms RMS
    lev = 10 * np.log10(e + 1e-12)
    tc = (np.arange(nb) + 0.5) / ctrl
    speak = np.zeros(nb, bool)
    for w in T.WORDS:
        speak |= (tc >= float(w["s"])) & (tc <= float(w["e"]))
    thr = float(np.percentile(lev[speak & (lev > lev[speak].max() - 40)], thr_pct))
    over = lev - thr
    k = knee_db / 2
    gr = np.where(over > k, over * (1 - 1 / ratio), np.where(over > -k, (1 - 1 / ratio) * (over + k) ** 2 / (2 * knee_db), 0.0))
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    sm = np.empty(nb)
    g = 0.0
    for i in range(nb):
        x = gr[i]
        g += (x - g) * (ka if x > g else kr)
        sm[i] = g
    grs = np.interp(np.arange(len(m)) / SR, tc, sm)
    return v * dbg(-grs)[None, :], grs, thr


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


def beat_duck_db(stem):
    """per-sample gain (dB) for one stem over the BEAT_DUCKS frame windows (ramped); returns (curve, rows)"""
    g = np.zeros(N)
    rows = []
    for st_, b0, d0, b1, d1, db, rf in BEAT_DUCKS:
        if st_ != stem or b0 not in T.BEAT or b1 not in T.BEAT:
            continue
        t0, t1, rr = T.bt(b0, d0), T.bt(b1, d1), rf / T.FPS
        if t1 <= t0:
            continue
        i0, i1 = ns(max(0.0, t0 - rr)), min(N, ns(t1 + rr))
        tt_ = np.arange(i0, i1) / SR
        g[i0:i1] = np.minimum(g[i0:i1], np.interp(tt_, [t0 - rr, t0, t1, t1 + rr], [0, db, db, 0]))
        rows.append((stem, f"{b0}{d0:+d}..{b1}{d1:+d}", t0, t1, db))
    return g, rows


def key_duck_db(stem):
    """per-sample gain (dB) for one stem: the KEY_DUCKS windows, 25 ms ramps; returns (curve, rows)"""
    g = np.zeros(N)
    rows = []
    for row in KEY_DUCKS:
        st_, wd, after, a, b, db = row[:6]
        rp = float(row[6]) if len(row) > 6 else KEY_RAMP
        if st_ != stem or after not in T.BEAT:
            continue
        try:
            w = T.word(wd, T.bt(after))
        except KeyError:
            continue
        t0 = float(w["s"]) + a
        t1 = min(float(w["s"]) + b, float(w["e"]) + 0.05)
        i0, i1 = ns(t0 - rp), ns(t1 + rp)
        tt_ = np.arange(i0, i1) / SR
        g[i0:i1] = np.minimum(g[i0:i1], np.interp(tt_, [t0 - rp, t0, t1, t1 + rp], [0, db, db, 0]))
        rows.append((stem, w["w"], t0, t1, db))
    return g, rows


# ================================================================ round 5 (A4): voice clean-up, leveler, de-esser, bus EQ
# A4 P2/P3 (voice joins + breath tails): the per-beat takes are butt-joined (a step to digital zero at every join) and
# phrase ends carry 120-360 ms unvoiced exhale / murmur tails. voice_clean() works on ANY take (no frame literals):
# every digital-zero run gets a 15 ms raised-cosine fade-out before it and a 5 ms fade-in after it; and after the last
# VOICED frame of each phrase it keeps 60 ms (final /s z t ts/: up to 120 ms while the energy above 3.5 kHz dominates),
# then fades to digital silence over 40 ms until the next onset (so every gap is the same clean silence; the beds fill
# it). "Last voiced frame" = the last 10 ms frame within 20 dB of the median speech level (a conservative gate: the
# low exhale / floor after it goes, anything closer to the read stays - the murmur INSIDE a take is the LEAD's re-take).
# The whispered line (unvoiced by design) and the words next to it are never touched.
CLEAN = dict(keep=0.06, hf_keep=0.12, fade=0.04, min_gap=0.16, voiced=0.45, head_pre=0.025, active_db=-20.0)
VOICE_HP = 70.0                  # A4 P2: the ElevenLabs take carries a rumble floor under 70 Hz (sub band +5 dB over the refs)
VOICE_SHELF = (3000.0, 3.0)      # A4 P2: presence (+1.5 at 3.5 kHz asked; the high band still read ~1.7 dB dull, and the de-esser takes the peaks back)
DEESS = dict(lo=5000.0, hi=10000.0, ratio=3.0, max_db=6.0, thr_pct=96.0, att=0.001, rel=0.05)
# A5 P3: the last line carries the hottest sibilants (b12's bright fricatives + the +2.5 ride): a further static cut of
# the 5-10 kHz band over the whole line (first word spec, last word, dB)
DEESS_EXTRA = [("soSome", "twice", -3.0)]
# A4 P2 (LRA 3.9 -> <= 3.1 without squashing the acting): a phrase LEVELER before the rides - each phrase's own gain
# (ramped across the gap before it) moves it part of the way toward the median phrase; inside a phrase nothing changes
LEVEL = dict(dead=1.0, strength=0.55, max_db=2.5, whisper_target=-5.0)
SPEECH_BAND_DUCK = {"sfx": -5.0, "music": -4.0}   # A4 P2: 1-4 kHz dip on the beds only while a word is spoken (A5: music -2.5 -> -4:
                                                   # 'little', 'of the pieces', 'removed', '2%', 'honest' sat 7.5-11 dB over the score)
# windows that keep their full band: (s before the beat, s after the beat | "word:<w>" = until that word's onset + 5 ms).
# The cha-ching's 'ka-CHING' attack; the stamp and the tag ding only up to the onset of the word they precede (A5 P2:
# 'per-' and 'twice.' then get the normal dip under their ring); the hook's glint ding (its own 0.6-4 kHz carve in sfx.py)
BAND_DUCK_EXEMPT = {"pct8": (0.03, 0.12), "permission": (0.03, "word:permission"), "twice": (0.12, "word:twice"), "steal1": (0.03, 0.45)}
MUSIC_HP = 60.0                  # A4 P2: 12 dB/oct high-pass on the music + ambience buses
AMB_HP = 60.0
MUSIC_AIR = (6000.0, 2.0)        # a little air on the score above the consonant band
AMB_SHELF = (4000.0, 4.0)        # the sand / grass / cicada top of the beds


def phrase_list():
    """[(s, e, style)] from voice/phrases.json (written with every take); falls back to the speech spans"""
    p = os.path.join(ROOT, "voice", "phrases.json")
    try:
        P = json.load(open(p, encoding="utf-8"))
        out = sorted((float(x["s"]), float(x["e"]), x.get("style")) for x in P)
        if out:
            return out
    except (OSError, ValueError, KeyError):
        pass
    return [(a, b, None) for a, b in T.speech_spans(0.25)]


def whisper_span():
    for s, e, sty in phrase_list():
        if sty == "whisper":
            return s, e
    if "whisper" in T.BEAT and "nowEnd" in T.BEAT:
        return T.bt("whisper"), T.bt("nowEnd")
    return None


def _frames16(m):
    """10 ms hop / 32 ms window analysis of a mono voice at 16 kHz: level dB, periodicity, HF ratio, frame centres"""
    x = signal.resample_poly(m, 1, 3)
    hop, win = 160, 512
    nfr = max(1, (len(x) - win) // hop + 1)
    idx = np.arange(win)[None, :] + hop * np.arange(nfr)[:, None]
    fr_ = x[idx] * np.hanning(win)[None, :]
    lev = 10 * np.log10(np.mean(fr_ ** 2, axis=1) + 1e-14)
    X = np.fft.rfft(fr_, 1024, axis=1)
    P = np.abs(X) ** 2
    ac = np.fft.irfft(P, 1024, axis=1)
    per = np.max(ac[:, 40:229], axis=1) / (ac[:, 0] + 1e-14)
    f = np.fft.rfftfreq(1024, 1 / 16000)
    hf = P[:, f >= 3500].sum(1) / (P.sum(1) + 1e-14)
    tc = (np.arange(nfr) * hop + win / 2) / 16000
    return lev, per, hf, tc


def voice_clean(v):
    m = v.mean(0)
    n = len(m)
    g = np.ones(n)
    # ---- the joins: digital-zero runs >= 3 ms
    z = np.abs(m) < 1e-9
    d = np.diff(np.concatenate([[0], z.astype(np.int8), [0]]))
    joins = 0
    for a, b in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)):
        if b - a < ns(0.003):
            continue
        L1 = min(ns(0.015), a)
        if L1 > 0:
            g[a - L1:a] = np.minimum(g[a - L1:a], 0.5 + 0.5 * np.cos(np.pi * np.arange(1, L1 + 1) / L1))
        L2 = min(ns(0.005), n - b)
        if L2 > 0:
            g[b:b + L2] = np.minimum(g[b:b + L2], 0.5 - 0.5 * np.cos(np.pi * np.arange(L2) / L2))
        joins += 1
    # ---- the phrase tails
    lev, per, hf, tc = _frames16(m)
    sp = np.zeros(len(tc), bool)
    for w in T.WORDS:
        sp |= (tc >= float(w["s"])) & (tc <= float(w["e"]))
    med = float(np.median(lev[sp & (lev > lev.max() - 50)]))
    voiced = (per > CLEAN["voiced"]) & (lev > med - 30)
    ws = whisper_span()
    inw = (lambda t: ws is not None and ws[0] - 0.05 <= t <= ws[1] + 0.05)
    W = T.WORDS
    rows = []
    for k in range(len(W)):
        s_k = float(W[k]["s"])
        s_next = float(W[k + 1]["s"]) if k + 1 < len(W) else T.DUR
        if inw(s_k) or inw(float(W[k]["e"])) or (k + 1 < len(W) and inw(s_next)):
            continue
        reg = np.flatnonzero((tc >= s_k) & (tc < s_next) & (lev > med + CLEAN["active_db"]))
        if not len(reg):
            continue
        lv_end = float(tc[reg[-1]]) + 0.01
        if s_next - lv_end < CLEAN["min_gap"]:
            continue
        keep_end = lv_end + CLEAN["keep"]
        hfz = np.flatnonzero((tc >= lv_end) & (tc <= lv_end + CLEAN["hf_keep"]) & (hf > 0.4) & (lev > med - 40))
        if len(hfz):
            keep_end = max(keep_end, float(tc[hfz[-1]]) + 0.015)
        loud = np.flatnonzero((tc > keep_end) & (tc < s_next - 0.03) & (lev > med - 8))
        if len(loud):                                         # never cut anything loud (a mis-timed word)
            keep_end = float(tc[loud[-1]]) + 0.02
        head = s_next - 0.04
        on = np.flatnonzero((tc >= keep_end + 0.05) & (tc <= s_next + 0.05) & ((voiced & (lev > med - 30)) | (lev > med + CLEAN["active_db"])))
        if len(on):
            head = min(head, float(tc[on[0]]) - CLEAN["head_pre"])
        fe = keep_end + CLEAN["fade"]
        if head - fe < 0.02:
            continue
        i0, i1, i2 = ns(keep_end), ns(fe), ns(head)
        i3 = min(n, i2 + ns(0.01))
        g[i0:i1] = np.minimum(g[i0:i1], 0.5 + 0.5 * np.cos(np.pi * np.arange(i1 - i0) / max(1, i1 - i0)))
        g[i1:i2] = 0.0
        g[i2:i3] = np.minimum(g[i2:i3], 0.5 - 0.5 * np.cos(np.pi * np.arange(i3 - i2) / max(1, i3 - i2)))
        tail_db = float(10 * np.log10(np.mean(m[ns(lv_end):max(ns(lv_end) + 1, i2)] ** 2) + 1e-14)) - med
        rows.append((W[k]["w"], lv_end, keep_end, head, tail_db))
    return v * g[None, :], dict(joins=joins, tails=rows, med=med)


def voice_level_db(v):
    """per-sample gain (dB) of the phrase leveler, measured on the (compressed) voice before the rides"""
    t = np.arange(N) / SR
    P = phrase_list()
    L = [(s, e, sty, integrated(v[:, ns(s):max(ns(s) + 1, ns(e))])) for s, e, sty in P]
    ok = [l for s, e, sty, l in L if sty != "whisper" and np.isfinite(l) and e - s > 0.5]
    if not ok:
        return np.zeros(N), []
    med = float(np.median(ok))
    xs, ys, rows = [], [], []
    for s, e, sty, l in L:
        if not np.isfinite(l):
            continue
        tgt = med + (LEVEL["whisper_target"] if sty == "whisper" else 0.0)
        dv = l - tgt
        c = -np.sign(dv) * max(0.0, abs(dv) - LEVEL["dead"]) * LEVEL["strength"]
        c = float(np.clip(c, -LEVEL["max_db"], LEVEL["max_db"]))
        xs += [s, e]
        ys += [c, c]
        rows.append((s, e, sty, l - med, c))
    o = np.argsort(np.array(xs), kind="stable")
    curve = np.interp(t, np.array(xs)[o], np.array(ys)[o])
    curve = ndimage.uniform_filter1d(curve, ns(0.03), mode="nearest")
    return curve, rows


def deess(v, ride_db):
    """split-band de-esser (zero-phase 5-10 kHz band, dynamic cut): threshold = the thr_pct percentile of the band level
    over the words, lowered by the ride gain inside the +dB rides (A4 P3: the hottest 's' sat inside the +2.5 dB rides)"""
    sos = signal.butter(2, [DEESS["lo"], DEESS["hi"]], btype="bandpass", fs=SR, output="sos")
    band = signal.sosfiltfilt(sos, v, axis=-1)
    bm = band.mean(0)
    ctrl = 2000
    hop = SR // ctrl
    nb = len(bm) // hop
    e = ndimage.uniform_filter1d((bm[: nb * hop] ** 2).reshape(nb, hop).mean(1), 6)
    lev = 10 * np.log10(e + 1e-14)
    tc = (np.arange(nb) + 0.5) / ctrl
    speak = np.zeros(nb, bool)
    for w in T.WORDS:
        speak |= (tc >= float(w["s"])) & (tc <= float(w["e"]))
    thr = float(np.percentile(lev[speak], DEESS["thr_pct"]))
    rd = np.interp(tc, np.arange(len(ride_db))[:: SR // 100] / SR, ride_db[:: SR // 100])
    over = lev - (thr - np.maximum(rd, 0.0))
    gr = np.clip(over * (1 - 1 / DEESS["ratio"]), 0, DEESS["max_db"])
    ka, kr = 1 - np.exp(-1 / (DEESS["att"] * ctrl)), 1 - np.exp(-1 / (DEESS["rel"] * ctrl))
    sm = np.empty(nb)
    gg = 0.0
    for i in range(nb):
        x = gr[i]
        gg += (x - gg) * (ka if x > gg else kr)
        sm[i] = gg
    grs = np.interp(np.arange(len(bm)) / SR, tc, sm)
    extra = np.zeros(len(bm))
    for first, last, db in DEESS_EXTRA:                 # A5 P3: a static extra cut over a whole line (ramped in its gaps)
        c, _ = span_curve(first, last, -db)
        if c is not None:
            extra = np.maximum(extra, c[: len(bm)])
    grs = grs + extra
    return v - band * (1 - dbg(-grs))[None, :], dict(thr=thr, max=float(grs.max()), pct_over_1=float((grs > 1).mean() * 100),
                                                     extra_max=float(extra.max()))


def band_duck(x, depth_db, exempt=(), lo=1000.0, hi=4000.0, pre=0.03, post=0.05, att=0.015, rel=0.06):
    """dip the 1-4 kHz band of a bed stem by depth_db while a word is spoken (zero-phase band, smoothed key)"""
    sos = signal.butter(2, [lo, hi], btype="bandpass", fs=SR, output="sos")
    band = signal.sosfiltfilt(sos, x, axis=-1)
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for w in T.WORDS:
        va[max(0, int((float(w["s"]) - pre) * ctrl)): int((float(w["e"]) + post) * ctrl)] = 1.0
    for a, b in exempt:
        va[max(0, int(a * ctrl)): int(b * ctrl)] = 0.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        e += (va[i] - e) * (ka if va[i] > e else kr)
        env[i] = e
    g = dbg(depth_db * np.interp(np.arange(x.shape[1]) / SR, np.arange(nc) / ctrl, env))
    return x - band * (1 - g)[None, :]


def circ(fn, x, pad_s=1.0):
    """A5 P3 (loop seam): run a causal filter as if the film were a loop - the last pad_s seconds are fed in before the
    first sample, so the filter state at frame 0 is the state it has at the last frame (the wind beds are sample-
    continuous across the seam instead of restarting the IIR from silence)"""
    P = min(ns(pad_s), x.shape[-1])
    y = fn(np.concatenate([x[..., -P:], x], axis=-1))
    return y[..., P:]


# ================================================================ music level automation (NaN-safe)
def section_db(m_ducked, v, secs):
    """per-section gain (dB) so each section's music sits MUSIC_TARGET LU under that section's voice.
    Sections without speech (or without music) use the whole-voice reference / no correction - never -inf/NaN."""
    Lv_all, Lm_all = integrated(v), integrated(m_ducked)
    g0 = Lv_all + GLOBAL_MUSIC - Lm_all
    gains = {}
    for name, a, b in secs:
        seg = slice(ns(a), ns(b))
        Lm = integrated(m_ducked[:, seg]) if b - a > 0.45 else -np.inf
        Lv = integrated(v[:, seg]) if b - a > 0.45 else -np.inf
        if not np.isfinite(Lm):
            gains[name] = g0
            continue
        ref = Lv if np.isfinite(Lv) else Lv_all
        g = ref + MUSIC_TARGET.get(name, GLOBAL_MUSIC) - Lm
        gains[name] = float(np.clip(g, g0 - CORR_MAX, g0 + CORR_MAX))
    curve = np.zeros(N)
    t = np.arange(N) / SR
    for name, a, b in secs:
        curve[(t >= a) & (t < b)] = gains[name]
    curve[t >= secs[-1][2]] = gains[secs[-1][0]]
    curve = ndimage.uniform_filter1d(curve, ns(0.25), mode="nearest")
    assert np.all(np.isfinite(curve))
    return curve, gains, g0


# ================================================================ limiter
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve"""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


# ================================================================ report helpers
def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def section_table(v, m, s, a_, secs):
    Mv, Mb, Mm = momentary(v), momentary(m + s + a_), momentary(m)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    speak = np.zeros(len(tc), bool)
    for w in T.WORDS:
        speak |= (tc >= float(w["s"]) + 0.03) & (tc <= float(w["e"]) - 0.03)
    speak &= Mv > lufs(v) - 10
    rows = []
    for name, a, b in secs:
        seg = slice(ns(a), ns(b))
        Lv, Lm, Ls, La, Lb = lufs(v[:, seg]), lufs(m[:, seg]), lufs(s[:, seg]), lufs(a_[:, seg]), lufs(m[:, seg] + s[:, seg] + a_[:, seg])
        k = speak & (tc >= a) & (tc < b) & np.isfinite(Mb) & (Mb > -70)
        p10 = float(np.percentile(Mv[k] - Mb[k], 10)) if k.sum() > 5 else float("nan")
        med = float(np.median(Mv[k] - Mb[k])) if k.sum() > 5 else float("nan")
        km = k & (Mm > -70)
        mmed = float(np.median(Mv[km] - Mm[km])) if km.sum() > 5 else float("nan")
        rows.append(dict(name=name, a=a, b=b, v=Lv, m=Lm, s=Ls, amb=La, bed=Lb, m_margin=Lv - Lm if Lm > -98 and Lv > -98 else float("nan"),
                         s_margin=Lv - Ls if Ls > -98 and Lv > -98 else float("nan"), p10=p10, med=med, mmed=mmed))
    return rows


def ffmpeg_ebur(path):
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                           capture_output=True, text=True, timeout=300)
        txt = r.stderr
        i = txt.rfind("Summary:")
        if i < 0:
            return txt[-1500:]
        out = []
        for l in txt[i:].splitlines():
            if l.strip() and not l.startswith("[") and not l.startswith("size="):
                out.append(l.rstrip())
            if l.strip().startswith("Peak:"):
                break
        return "\n".join(out)
    except Exception as e:  # noqa
        return f"ffmpeg check failed: {e}"


def seam_report(y):
    """loop seam: jump from the last sample to the first vs the typical sample-to-sample step at both ends"""
    d = np.abs(y[:, 0] - y[:, -1]).max()
    tail = np.abs(np.diff(y[:, -ns(0.3):], axis=1)).max(0)
    head = np.abs(np.diff(y[:, : ns(0.3)], axis=1)).max(0)
    rms_t = 20 * np.log10(np.sqrt(np.mean(y[:, -ns(0.3):] ** 2)) + 1e-12)
    rms_h = 20 * np.log10(np.sqrt(np.mean(y[:, : ns(0.03)] ** 2)) + 1e-12)
    return dict(jump=float(d), step_p99_tail=float(np.percentile(tail, 99)), step_p99_head=float(np.percentile(head, 99)),
                rms_last_0_3s_dbfs=rms_t, rms_first_30ms_dbfs=rms_h)


# ================================================================ main
def main():
    global KEY
    t_start = time.time()
    run_probes()
    KEY = input_hash()
    KEYS.update({k: _hash(f) for k, f in STAGE_INPUTS.items()})
    purge_cache()
    log(f"inputs hash {KEY} (music {KEYS['music']}, sfx {KEYS['sfx']}); voice take {T.voice_take()}; picture {T.TOTAL} f = {T.DUR:.3f} s -> {N} samples")
    v = load_voice()
    v, vclean = voice_clean(v)                                  # A4: join fades + phrase-tail gate (any take)
    log(f"voice clean: {vclean['joins']} join fades, {len(vclean['tails'])} phrase tails gated (median speech {vclean['med']:.1f} dB): "
        + ", ".join(f"{w} {a:.2f}->{h:.2f}" for w, a, k, h, d in vclean["tails"][:40]))
    v = hp(v, VOICE_HP, 2)                                      # A4 P2: no rumble under the voice
    v_raw_ref = integrated(v)
    v, vgr, vthr = voice_comp(v, **VCOMP)
    v = v * dbg(v_raw_ref - integrated(v))                      # same integrated level as before the compressor
    v_tp0 = true_peak(v)
    lvl_curve, lvl_rows = voice_level_db(v)                     # A4 P2: the phrase leveler (measured on the compressed take)
    for s0, e0, sty, dv, c in lvl_rows:
        log(f"voice level {s0:6.2f}-{e0:6.2f} {'(whisper) ' if sty == 'whisper' else ''}phrase {dv:+.1f} dB vs median -> {c:+.2f} dB")
    ride, ride_rows = voice_ride_db()                           # the line rides come after the compressor (fader moves) ...
    v_mid = integrated(v)
    v = v * dbg(lvl_curve + ride)[None, :]
    v, ds_stats = deess(v, ride)                                # A4 P3: split-band de-esser, then the presence shelf
    log("de-esser", {k: round(x, 2) for k, x in ds_stats.items()})
    if VOICE_SHELF:
        v = shelf(v, VOICE_SHELF[0], VOICE_SHELF[1], "high")
    v, vg = limiter(v, ceil_db=v_mid + VPEAK_CREST, look=0.0015, rel=0.04)   # ... and before the look-ahead voice peak limiter
    vpk = -20 * np.log10(np.maximum(vg, 1e-9))
    sp = np.zeros(N, bool)
    for w in T.WORDS:
        sp[ns(float(w["s"])): ns(float(w["e"]))] = True
    vcomp_stats = dict(thr=vthr, max=float(vgr.max()), p95_speech=float(np.percentile(vgr[sp], 95)), med_speech=float(np.median(vgr[sp])),
                       pct_over_1=float((vgr[sp] > 1.0).mean() * 100), tp_before_peak=float(v_tp0), peak_max=float(vpk.max()),
                       peak_pct_over_1=float((vpk[sp] > 1.0).mean() * 100))
    log("voice comp", {k: round(x, 2) for k, x in vcomp_stats.items()})
    v_ref = integrated(v)
    for row in ride_rows:
        log(f"voice ride {row[4]:+.1f} dB on '{row[0]}' .. '{row[1]}' ({row[2]:.2f}-{row[3]:.2f} s)")
    log(f"voice: {v_ref:.2f} LUFS (as stereo), TP {true_peak(v):.2f} dBTP")

    # ---------------- music
    import music
    b = music.build()
    m_raw = cached("music_raw", lambda: music.render(b, ref=-20.0)[0])
    log("music rendered", f"{lufs(m_raw):.2f} LUFS raw")
    if MUSIC_LOW_SHELF:
        m_raw = shelf(m_raw, MUSIC_LOW_SHELF[0], MUSIC_LOW_SHELF[1], "low")
        log(f"music bus low shelf {MUSIC_LOW_SHELF[1]:+.1f} dB at {MUSIC_LOW_SHELF[0]:.0f} Hz -> {lufs(m_raw):.2f} LUFS raw")
    if MUSIC_HP:
        m_raw = circ(lambda x: hp(x, MUSIC_HP, 2), m_raw)
    if MUSIC_AIR:
        m_raw = circ(lambda x: shelf(x, MUSIC_AIR[0], MUSIC_AIR[1], "high"), m_raw)
    m_raw[:, -ns(0.005):] *= np.linspace(1.0, 0.0, ns(0.005))[None, :] ** 2     # A5 P3: the score's last sample is exactly 0
    log(f"music bus: HP {MUSIC_HP:.0f} Hz 12 dB/oct, air shelf {MUSIC_AIR[1]:+.1f} dB at {MUSIC_AIR[0]:.0f} Hz -> {lufs(m_raw):.2f} LUFS raw")
    dk = duck_db(T.speech_spans())
    m_d = m_raw * dbg(dk)[None, :]
    sec_curve, sec_gains, g0 = section_db(m_d, v, music.SECTIONS)
    m = m_d * dbg(sec_curve)[None, :]

    # ---------------- sfx + beds
    import sfx
    C = sfx.cues()
    sfx.write_used()
    ev = cached("sfx_events", lambda: sfx.render_events(v_ref)[0])
    beds_box = {}

    def _beds():
        x, rows = sfx.render_beds(v_ref)
        beds_box["rows"] = rows
        return x
    amb = cached("sfx_beds", _beds)
    if "rows" not in beds_box:
        _, beds_box["rows"] = None, [(k, sfx.BED_LEVEL[k], [], sfx.BED_DESC[k]) for k in sfx.BED_LEVEL]
    if AMB_HP:
        amb = circ(lambda x: hp(x, AMB_HP, 2), amb)
    if AMB_SHELF:
        amb = circ(lambda x: shelf(x, AMB_SHELF[0], AMB_SHELF[1], "high"), amb)
    for c in C:                                           # measured level of each placed event (deterministic levels)
        c.measured = c.level
    log("sfx rendered", f"events {lufs(ev):.2f} LUFS, beds {lufs(amb):.2f} LUFS")
    # key-word ducks (A2 P3): the ring tails of the stamp / the ding / the final chord dip under the stressed syllables
    kd_rows = []
    for stem in ("music", "sfx"):
        g, rows_ = key_duck_db(stem)
        g2, rows2 = beat_duck_db(stem)
        g3_, rows3 = word_duck_db(stem)
        g = np.minimum(g, 0) + g2 + g3_
        kd_rows += rows_ + rows2 + rows3
        if stem == "music":
            m = m * dbg(g)[None, :]
        else:
            ev = ev * dbg(g)[None, :]
    for row in kd_rows:
        log(f"key duck {row[0]} {row[4]:+.1f} dB under '{row[1]}' {row[2]:.3f}-{row[3]:.3f} s")
    # A4 P2 (masking): the beds' 1-4 kHz band dips while a word is spoken (the climax hits keep their band)
    ex = []
    for b_, (pre_, post_) in BAND_DUCK_EXEMPT.items():
        if b_ not in T.BEAT:
            continue
        t_b = T.bt(b_)
        if isinstance(post_, str) and post_.startswith("word:"):
            try:
                t_e = float(T.word(post_[5:], t_b - 0.3)["s"]) + 0.005
            except KeyError:
                t_e = t_b + 0.05
            t_e = max(t_e, t_b + 0.02)
        else:
            t_e = t_b + float(post_)
        ex.append((t_b - float(pre_), t_e))
    if SPEECH_BAND_DUCK.get("sfx"):
        ev = band_duck(ev, SPEECH_BAND_DUCK["sfx"], ex)
    if SPEECH_BAND_DUCK.get("music"):
        m = band_duck(m, SPEECH_BAND_DUCK["music"], ex)
    log(f"speech-band ducks (1-4 kHz under the words): sfx {SPEECH_BAND_DUCK.get('sfx', 0):+.1f} dB, music {SPEECH_BAND_DUCK.get('music', 0):+.1f} dB "
        f"(exempt: {', '.join(BAND_DUCK_EXEMPT)})")

    # ---------------- master
    mix0 = v + m + ev + amb
    G = TARGET_LUFS - lufs(mix0)
    prev = None
    for it in range(8):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        slope = 1.0
        if prev is not None and abs(G - prev[0]) > 1e-3:          # secant: the limiter eats part of every gain step
            slope = float(np.clip((L - prev[1]) / (G - prev[0]), 0.3, 1.0))
        prev = (G, L)
        G += (TARGET_LUFS - L) / slope
    assert y.shape == (2, N) and np.all(np.isfinite(y))
    gv, gm, gs, ga = v * dbg(G), m * dbg(G), ev * dbg(G), amb * dbg(G)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "stem_voice.wav"), gv)
    write_wav(os.path.join(HERE, "stem_music.wav"), gm)
    write_wav(os.path.join(HERE, "stem_sfx.wav"), gs)
    write_wav(os.path.join(HERE, "stem_amb.wav"), ga)
    log("wrote mix + 4 stems")

    # ---------------- measure
    I, TP, LRA = lufs(y), true_peak(y), lra(y)
    Mmax, Smax = float(np.max(momentary(y))), float(np.max(short_term(y)))
    grdb = -20 * np.log10(g3)
    gr_stats = dict(max=float(grdb.max()), pct_over_0_5=float((grdb > 0.5).mean() * 100), pct_over_0_1=float((grdb > 0.1).mean() * 100))
    rows = section_table(gv, gm, gs, ga, music.SECTIONS)
    eb = ffmpeg_ebur(os.path.join(HERE, "mix.wav"))
    seam = seam_report(y)
    stats = dict(rides=ride_rows, kducks=kd_rows, vcomp=vcomp_stats, I=I, TP=TP, LRA=LRA, Mmax=Mmax, Smax=Smax, G=G, gr=gr_stats, v_ref=v_ref, voice_I=lufs(gv), music_I=lufs(gm),
                 sfx_I=lufs(gs), amb_I=lufs(ga), sec_gains=sec_gains, g0=g0, seam=seam, key=KEY, take=T.voice_take(),
                 samples=int(y.shape[1]))
    log(json.dumps({k: (round(v_, 2) if isinstance(v_, float) else v_) for k, v_ in stats.items() if k not in ("gr", "sec_gains", "seam", "rides", "vcomp", "kducks")}))
    log("GR", gr_stats, "seam", {k: round(x, 5) for k, x in seam.items()})
    for r in rows:
        log(f"{r['name']:<11} voice {r['v']:6.1f}  music {r['m']:6.1f} (-{r['m_margin']:4.1f})  sfx {r['s']:6.1f}  amb {r['amb']:6.1f}  "
            f"bed {r['bed']:6.1f}  speech med {r['med']:5.1f} p10 {r['p10']:5.1f}  music med {r['mmed']:5.1f}")
    print(eb)
    write_cues(C, b, stats, rows, eb, beds_box["rows"])
    json.dump({k: (v_ if not isinstance(v_, np.floating) else float(v_)) for k, v_ in stats.items()},
              open(os.path.join(HERE, "_cache", f"stats-{KEY}.json"), "w"), indent=1, default=float)
    log(f"done in {time.time() - t_start:.0f} s")


def write_cues(C, b, st_, rows, eb, bed_rows):
    import music
    import sfx
    vI = st_["v_ref"] + st_["G"]
    L = []
    w = L.append
    f1 = lambda x: "-" if (x is None or not np.isfinite(x) or x <= -98) else f"{x:.1f}"
    w("# The Anti-Theft Sign That Made People Steal - soundtrack cue sheet")
    w("")
    w(f"Generated by `mix.py` (inputs hash `{st_['key']}`, voice take `{st_['take']}`). All sound is original: synthesized in numpy/scipy by "
      "`instruments.py` / `sfx_gen.py`, placed by `music.py` / `sfx.py`, mixed by `mix.py`. Voice = `voice/voice.wav` (rides + a gentle bus compressor).")
    w("Every SFX is keyed to a named PICTURE EVENT (`sfx.py picture_events()`: BEAT / shot frames + the picture code's own formula, or the "
      "frame the A1 audit asked an owner to animate). The frames used are in `picture_events_used.json`; to move one after a picture change, "
      "put `{\"name\": frame}` (or a list, or null) in `picture_events.json` and re-run `python mix.py`.")
    w("Every time below is read at run time from `timeline.json` + `voice/words.json`: after a new voice take or picture re-cut, "
      "re-export the timeline and run `python mix.py` (the cache is keyed on every input, nothing stale is reused).")
    w("")
    w("## Files")
    w("| file | content |")
    w("|---|---|")
    w(f"| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, {st_['samples']:,} samples = {st_['samples'] / SR:.3f} s = {T.NEW_TOTAL} VIDEO frames @ {T.FPS} fps "
      f"(the picture clock has {T.TOTAL} frames; voicewarp maps them) |")
    w("| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` / `stem_amb.wav` | stems at mix gain (voice, score, SFX events, ambience beds); they sum to the mix before the master limiter |")
    w("")
    w("## Master loudness (own BS.1770-4 meter)")
    w(f"- Integrated **{st_['I']:.1f} LUFS**, true peak **{st_['TP']:.2f} dBTP**, LRA **{st_['LRA']:.1f} LU**, max momentary {st_['Mmax']:.1f}, "
      f"max short-term {st_['Smax']:.1f} LUFS")
    w(f"- Stems (integrated): voice {st_['voice_I']:.1f}, music {st_['music_I']:.1f}, SFX events {st_['sfx_I']:.1f}, beds {st_['amb_I']:.1f} LUFS "
      f"(master gain {st_['G']:+.2f} dB on everything)")
    vc = st_["vcomp"]
    w("- Voice processing: a gentle voice-bus compressor, then fader rides (the references punch the pivot and twist lines; round 2 adds a "
      "macro story shape for an LRA near the references' 1.7-3.1 LU), then a look-ahead voice peak limiter. Rides: " +
      "; ".join(f"{db:+.1f} dB on '{b0}' .. '{l}' ({a:.2f}-{z:.2f} s)" for b0, l, a, z, db in st_["rides"]) + " (ramped in the word gaps). "
      f"Compressor ({VCOMP['ratio']}:1, {VCOMP['knee_db']:.0f} dB soft knee, attack {VCOMP['att'] * 1000:.0f} ms, release "
      f"{VCOMP['rel'] * 1000:.0f} ms, threshold = the {VCOMP['thr_pct']:.0f}th percentile of the speech level): gain reduction median "
      f"{vc['med_speech']:.1f} dB / p95 {vc['p95_speech']:.1f} dB / max {vc['max']:.1f} dB over the words (> 1 dB on {vc['pct_over_1']:.0f} % of speech), "
      f"then a look-ahead voice peak limiter at +{VPEAK_CREST} dB over the voice's integrated level (max {vc['peak_max']:.1f} dB, > 1 dB on "
      f"{vc['peak_pct_over_1']:.1f} % of speech)")
    if st_.get("kducks"):
        w("- Key-word ducks (A2 P3, the hits stay, their ring tails dip under the stressed syllable): " +
          "; ".join(f"{stem} {db:+.1f} dB under '{wd}' {a:.2f}-{z:.2f} s" for stem, wd, a, z, db in st_["kducks"]) + " (25 ms ramps)")
    gr = st_["gr"]
    w(f"- Limiter (4x oversampled look-ahead, ceiling {CEIL_DBTP} dBTP): max GR {gr['max']:.2f} dB, >0.1 dB on {gr['pct_over_0_1']:.2f} % of samples, "
      f">0.5 dB on {gr['pct_over_0_5']:.2f} %")
    s = st_["seam"]
    w(f"- Loop seam (last sample -> first): jump {s['jump']:.5f} vs p99 sample step {s['step_p99_tail']:.5f} (tail) / {s['step_p99_head']:.5f} (head); "
      f"the last 0.3 s is wind only ({s['rms_last_0_3s_dbfs']:.1f} dBFS RMS), no fade at either end")
    w("")
    w("ffmpeg ebur128 cross-check:")
    w("```")
    w(eb)
    w("```")
    w("")
    w("## Voice on top, per section (LUFS integrated per stem, at mix gain)")
    w("music margin = voice - music (integrated over the section); bed = music + SFX + ambience; speech median / p10 = the 400 ms momentary "
      "margin voice - bed over windows centred on spoken words; music-only median = the same against the music alone.")
    w("")
    w("| section | time s | voice | music | music margin LU | SFX | amb | bed | speech median LU | speech p10 LU | music-only median LU |")
    w("|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        w(f"| {r['name']} | {r['a']:.2f}-{r['b']:.2f} | {f1(r['v'])} | {f1(r['m'])} | {f1(r['m_margin'])} | {f1(r['s'])} | {f1(r['amb'])} | {f1(r['bed'])} "
          f"| {f1(r['med'])} | {f1(r['p10'])} | {f1(r['mmed'])} |")
    w("")
    w("## Music map (original caper score, D dorian, ~112 bpm tempo regions anchored to the words)")
    w(f"Whole score at {GLOBAL_MUSIC:+.0f} LU vs the voice, then per section (LU under the section's voice, clamped +-{CORR_MAX:.0f} dB): " +
      ", ".join(f"{k} {v:+.1f}" for k, v in MUSIC_TARGET.items()) + f". Speech duck {DUCK_DB:+.1f} dB keyed from words.json.")
    w("")
    w("| time s (video) | video frame | picture frame | music |")
    w("|---|---|---|---|")
    for t, d in sorted(b.cues):
        w(f"| {t:.2f} | {int(round(t * T.FPS))} | {T.sec_to_old(t):.0f} | {d} |")
    w("")
    w("## Ambience beds (integrated level LU vs the voice stem; crossfade with the picture dissolves, +-4 f; times in VIDEO seconds, i.e. the narration clock)")
    w("| bed | level LU | plays (s) | what |")
    w("|---|---|---|---|")
    for k, lvl, spans, desc in bed_rows:
        w(f"| {k} | {lvl:+.1f} | {', '.join(f'{a:.2f}-{z:.2f}' for a, z in spans)} | {desc} |")
    w("")
    w("Wind gust curve (shared with the picture so sway and gusts agree, periodic over the whole short so the loop is seamless): "
      "`gust(t) = 0.62 + " + " + ".join(f"{a:.2f} sin(2pi {k} t/D + {ph})" for a, k, ph in T.GUST_TERMS) + f"`, D = {T.DUR:.3f} s.")
    w("")
    w("## SFX events (level = the event's max momentary loudness, LU vs the voice stem; mix LUFS = that in the final mix)")
    w("| # | time s (video) | video frame | picture frame | shot | cue | picture event | what | level LU | mix LUFS | pan |")
    w("|---|---|---|---|---|---|---|---|---|---|---|")
    for i, c in enumerate(sorted(C, key=lambda c: (c.t, c.name))):
        w(f"| {i + 1} | {c.t:.3f} | {c.frame:.1f} | {T.sec_to_old(c.t):.1f} | {T.shot_at(c.t)} | {c.name} | `{c.pe or '-'}` | {c.desc} | {c.level:+.0f} | {vI + c.level:.1f} | {c.p:+.2f} |")
    w("")
    w("Round 4 (A3): before every mix, `studio/scripts/audio_cast_probe.mjs` runs the cast's own `stage(id, f)` (cast.ts) and toon.ts "
      "`swapPath` in node (no render) and writes the picture FACTS to `picture_cast.json` (effect-card runs, whistle-note births, every "
      "pick / put / pocket of a hand, squats, walk foot contacts, raven hops and ruffles, the Sign A swap path, the tag swing); "
      "`sfx.py _apply_cast()` moves each cue onto the frame where the picture really does it (nearest fact within a few frames) and DROPS "
      "a cue whose action is gone. `picture_events.json` overrides still win and may be BEAT expressions ('testedIt+9', 'mailed-7', "
      "'S8.a+4'), so a voice re-time moves them too. Projection only: a fact behind another card still counts as on screen.")
    w("")
    w("Rules followed: SFX only on physical actions whose source is ON SCREEN at that frame (round 3 / A2: cues with no visible "
      "action were dropped - the off-frame photographers of shots 2 and 3, the shot-3 footsteps, the shot-9 assistant and reader B), "
      "synced 0-3 f to the picture event they are keyed to; the tumbleweeds come from `picture_probe.json` "
      "(`node studio/scripts/audio_probe.mjs [storyDir] [extDir]`: sets_ext TUMBLE projected through the film camera -> on-screen "
      "window, hop landings, pan, size); no whoosh on any plain dissolve (only the dive into the rock in shot 1, the panel fly-in "
      "in shot 11 and a -30 LU breath of air under the shot-9 camera truck); the stamp is the climax hit (its 0.6-4 kHz band dips "
      "7 dB for 150 ms under 'per-', its ring tail -2 dB under '-MIS-'); the music ends on the last word; nothing but the wind "
      "crosses the loop point.")
    w("")
    w("## Picture event frames used (what every cue is keyed to; override in picture_events.json)")
    w("| event | frame(s) | source |")
    w("|---|---|---|")
    D, SRC = sfx.picture_events()
    for k, v in D.items():
        val = json.dumps(v)
        if len(val) > 120:
            val = val[:117] + "..."
        w(f"| `{k}` | {val} | {SRC[k]} |")
    open(os.path.join(HERE, "cues.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
