# THE SOUND GATE (2026-11-20, from the benchmark's rules: studio/out/pointing/benchmark/BENCHMARK_sound.md section 6).
# Measures a finished mix the SAME way the benchmark measured clown and the reference channel (its own analyze.py is
# imported, so the numbers are comparable), puts them next to clown + two references, and FAILS unless each one is
# inside the rule. Loudness, true peak and sync are NOT enough (they passed on the film the owner called "shit").
# Nothing is played.
#   python -s sound_gate.py                       the film: mix.wav + stems + voice/phrases.json (runs whisper medium on CPU: minutes)
#   python -s sound_gate.py --tag v4              mix_v4.wav / stem_*_v4.wav
#   python -s sound_gate.py --tag opening_v4 --opening   an OPENING mix next to the same first seconds of clown + 2 refs
#   python -s sound_gate.py --music file.wav      a SCORE alone, against clown's music stem (beat, continuity, level jumps, warmth)
#   --model small                                 a faster recogniser (the references were measured with medium)
#   --refs R_railroads,R_jobjapan                 which two references to show (data/<key>.metrics.json of the benchmark)
# Exit code 0 = PASS, 1 = FAIL. Writes sound_gate<tag>.json next to the mix.
import argparse
import json
import os
import shutil
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BENCH = os.path.join(STUDIO, "studio", "out", "pointing", "benchmark", "sound")
sys.path.insert(0, os.path.join(BENCH, "scripts"))
import analyze as A                                   # the benchmark's own measuring code (same windows, same thresholds)
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfiltfilt

SR = 48000
BEAT_CONF = 0.30                                      # a six-second window "has a clear beat" at this autocorrelation (clown 20 of 23)


def rd(p):
    x, sr = sf.read(p, dtype="float64")
    assert sr == SR, (p, sr)
    return x


def db(x):
    return 10 * np.log10(np.mean(np.asarray(x, float) ** 2) + 1e-20)


def bandpass(x, lo, hi):
    return sosfiltfilt(butter(4, [lo, hi], "bandpass", fs=SR, output="sos"), x)


# ---------------------------------------------------------------- the music measures (a stem, or a score alone)
def music_measures(x, voice_lufs=None):
    x = x if x.ndim == 2 else np.stack([x, x], 1)
    dur = len(x) / SR
    tm, Lm = A.mom_loud(x)
    R = {"dur": round(dur, 2), "lufs": round(A.ffmpeg_like_I(x), 1)}
    if voice_lufs is not None:
        R["under_voice_lu"] = round(voice_lufs - R["lufs"], 1)
    pres = Lm > -50
    runs, i = [], 0
    while i < len(pres):
        if not pres[i]:
            j = i
            while j < len(pres) and not pres[j]:
                j += 1
            if (j - i) * 0.1 >= 0.5:
                runs.append((round(tm[i] - 0.2, 1), round(tm[j - 1] + 0.2, 1)))
            i = j
        else:
            i += 1
    R["silent_runs"] = runs
    R["silent_s"] = round(sum(b - a for a, b in runs), 1)
    R["first_sound_s"] = round(float(tm[np.argmax(pres)] - 0.2), 2) if pres.any() else None
    L1 = np.array([np.mean(Lm[(tm >= s) & (tm < s + 1)]) for s in range(int(dur))])
    R["level_jumps_per_min"] = round(60 * float((np.abs(np.diff(L1)) > 6).sum()) / dur, 1)
    t, fl, M, fr = A.onset_env(x)
    W = []
    for s0 in np.arange(0, dur - 6 + 1e-9, 3):
        sel = (t >= s0) & (t < s0 + 6)
        if np.mean(Lm[(tm >= s0) & (tm < s0 + 6)] > -50) < 0.5:
            W.append((round(float(s0), 0), None, 0.0))
            continue
        b, c = A.tempo(fl[sel], 100)
        W.append((round(float(s0), 0), round(b, 0) if b else None, round(c, 2)))
    R["tempo_windows"] = W
    R["beat_share"] = round(float(np.mean([c >= BEAT_CONF for _, _, c in W])), 2) if W else 0.0
    lev = 10 * np.log10((M ** 2).sum(1) + 1e-20)
    R["centroid"] = round(float(np.median(((M ** 2 * fr).sum(1) / ((M ** 2).sum(1) + 1e-20))[lev > lev.max() - 40])), 0)
    ref = A.band_db(M, fr, 400, 2000)
    R["warmth_120_400"] = round(A.band_db(M, fr, 120, 400) - ref, 1)
    R["air_10_16k"] = round(A.band_db(M, fr, 10000, 16000) - ref, 1)
    return R


def gate_music(path, tag):
    clown = rd(os.path.join(STUDIO, "sound", "clown", "audio", "stem_music.wav"))
    clv = A.ffmpeg_like_I(rd(os.path.join(STUDIO, "sound", "clown", "audio", "stem_voice.wav")))
    ours = rd(path)
    meta = path.replace(".wav", ".json")
    vref = json.load(open(meta)).get("vref", -13.7) if os.path.exists(meta) else -13.7
    O, C = music_measures(ours, vref), music_measures(clown, clv)
    sections = json.load(open(meta)).get("sections", []) if os.path.exists(meta) else []
    designed = json.load(open(meta)).get("designed_silences", []) if os.path.exists(meta) else []
    # silence the DIRECTION asked for (a stop on a story beat) is not counted; anything else is
    ov = lambda a, b: sum(max(0.0, min(b, d1 + 0.25) - max(a, d0 - 0.25)) for d0, d1 in designed)
    O["silent_s_undesigned"] = round(sum(max(0.0, (b - a) - ov(a, b)) for a, b in O["silent_runs"]), 1)
    lens = [s["t1"] - s["t0"] for s in sections]
    rules = [
        ("music from frame 0 (first sound s)", O["first_sound_s"], C["first_sound_s"], lambda v: v is not None and v <= 0.1),
        ("silent runs > 0.5 s outside the designed stops (s)", O["silent_s_undesigned"], C["silent_s"], lambda v: v <= 0.8),
        ("clear beat in 6 s windows (share)", O["beat_share"], C["beat_share"], lambda v: v >= 0.70),
        ("level jumps > 6 dB per minute", O["level_jumps_per_min"], C["level_jumps_per_min"], lambda v: v <= 8.0),
        ("LU under the voice", O.get("under_voice_lu"), C.get("under_voice_lu"), lambda v: v is not None and 15.0 <= v <= 19.5),
        ("centroid Hz (clown 406; no honk)", O["centroid"], C["centroid"], lambda v: 250 <= v <= 700),
        ("warmth 120-400 vs 400-2k dB", O["warmth_120_400"], C["warmth_120_400"], lambda v: v >= 0.0),
        ("sections (5-8; median >= 6 s; a hook / loop reprise may be shorter)", f"{len(lens)} (median {np.median(lens):.1f} s, {min(lens):.1f}-{max(lens):.1f})" if lens else "?", "14 (clown)",
         lambda v: 5 <= len(lens) <= 8 and float(np.median(lens)) >= 6.0),
    ]
    return report("MUSIC", path, rules, {"ours": O, "clown": C}, tag)


# ---------------------------------------------------------------- the film measures
def asr(wav, out, model="medium"):
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(wav):
        return
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=3)
    x = rd(wav)
    x = resample_poly(x.mean(1) if x.ndim > 1 else x, 1, 3).astype(np.float32)
    segs, _ = m.transcribe(x, language="en", word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
    S = [{"s": s.start, "e": s.end, "text": s.text, "nsp": s.no_speech_prob, "words": [{"w": w.word, "s": w.start, "e": w.end, "p": w.probability} for w in (s.words or [])]}
         for s in segs]
    json.dump({"dev": "cpu", "model": model, "segments": S}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)


def film_extra(tag, stem_dir=None, phrases=None, dur=None, stems_tag=None):
    """measures the benchmark took from our stems (ours.py / pointing_checks.py): steady tone, narrator share and pitch steps,
    per-line margin over the bed. stem_dir / phrases / dur: another film's stems (clown) or a cut of the first dur s"""
    d = stem_dir or HERE
    st_tag = tag if stems_tag is None else stems_tag
    stems = {k: rd(os.path.join(d, f"stem_{k}{st_tag}.wav")).mean(1) for k in ("voice", "music", "sfx", "amb")}
    if dur:
        stems = {k: x[:int(dur * SR)] for k, x in stems.items()}
    dur = len(stems["voice"]) / SR
    R = {}
    fx = stems["amb"] + stems["sfx"]
    n, H, cov, freqs = 8192, int(0.25 * SR), 0, []
    for i in range(0, len(fx) - n, H):
        S = 20 * np.log10(np.abs(np.fft.rfft(fx[i:i + n] * np.hanning(n))) + 1e-9)
        f = np.fft.rfftfreq(n, 1 / SR)
        sel = (f > 800) & (f < 6000)
        j = np.argmax(S[sel])
        if S[sel][j] - np.median(S[sel]) > 25 and S[sel][j] - 20 * np.log10(n / 4) > -55:
            cov += 1
            freqs.append(f[sel][j])
    R["steady_tone_s"] = round(cov * 0.25, 1)
    R["steady_tone_hz"] = round(float(np.median(freqs)), 0) if freqs else None
    if phrases is None:
        own = os.path.join(HERE, f"phrases{tag}.json")
        sent = os.path.join(os.path.dirname(HERE), "voice_v4", "phrases.json")
        # (audit r1, 2026-11-21) the v4 FILM is measured per SENTENCE (voice_v4/phrases.json, 28 sentences + 3 shouts), not
        # per line: a whole-line window hid "She did." (11.4 dB) inside "Did you tap? She did."
        if tag.startswith("_v4") and "opening" not in tag and os.path.exists(sent):
            phrases = sent
        else:
            phrases = own if os.path.exists(own) else os.path.join(os.path.dirname(d), "voice", "phrases.json")
    ph = [p for p in json.load(open(phrases, encoding="utf-8")) if p["s"] < dur - 0.05]
    v16 = resample_poly(stems["voice"], 1, 3)
    tf, f0, ap, en = A.yin(v16)
    nar, secs = [], 0.0
    bed = stems["music"] + stems["sfx"] + stems["amb"]
    vb, bb = bandpass(stems["voice"], 500, 4000), bandpass(bed, 500, 4000)
    margins = []
    for p in ph:
        a, b = p["s"], min(p["e"], dur)
        if str(p.get("speaker", "N")) in ("N", "narrator"):
            secs += b - a
            m = (tf >= a) & (tf <= b) & ~np.isnan(f0) & (ap < 0.15)
            if m.sum() >= 8:
                nar.append(float(np.median(f0[m])))
        seg = slice(int(a * SR), int(b * SR))
        margins.append((p.get("id", p.get("i")), round(db(vb[seg]) - db(bb[seg]), 1)))
    R["narrator_share"] = round(secs / dur, 2)
    R["narrator_pitch_step_st"] = round(float(np.median(np.abs(np.diff(12 * np.log2(np.array(nar)))))), 1) if len(nar) > 1 else None
    R["line_margin_worst"] = min(margins, key=lambda q: q[1]) if margins else None
    R["line_margins"] = margins
    return R


def _crop_film(key, dur, work, stems_from=None):
    """the first dur s of a benchmark film (its wav, its whisper words, its stems when we have them) into work/"""
    x = rd(os.path.join(BENCH, "wav", key + ".wav"))[:int(dur * SR)]
    sf.write(os.path.join(work, "wav", key + ".wav"), x, SR, subtype="PCM_24")
    a = json.load(open(os.path.join(BENCH, "data", key + ".asr.json"), encoding="utf-8"))
    segs = []
    for sg in a["segments"]:
        ws = [w for w in sg["words"] if w["e"] <= dur]
        if ws:
            segs.append(dict(sg, words=ws))
    json.dump(dict(a, segments=segs), open(os.path.join(work, "data", key + ".asr.json"), "w", encoding="utf-8"))
    if stems_from:
        sd = os.path.join(work, "sound", key, "audio")
        os.makedirs(sd, exist_ok=True)
        for k in ("voice", "music", "sfx", "amb"):
            sf.write(os.path.join(sd, f"stem_{k}.wav"), rd(os.path.join(stems_from, f"stem_{k}.wav"))[:int(dur * SR)], SR, subtype="PCM_24")


def gate_opening(tag, model, refs, dur=None):
    """THE OPENING GATE: our opening mix next to the SAME first seconds of clown and two references, measured the same way
    (the benchmark's analyze.py on the cut). The film rules that make sense on a few seconds; counts are rates."""
    wav = os.path.join(HERE, f"mix{tag}.wav")
    dur = dur or len(rd(wav)) / SR
    work = os.path.join(HERE, "_gate_open")
    for sub in ("wav", "data"):
        os.makedirs(os.path.join(work, sub), exist_ok=True)
    key = "pointing"
    shutil.copyfile(wav, os.path.join(work, "wav", key + ".wav"))
    asr(os.path.join(work, "wav", key + ".wav"), os.path.join(work, "data", key + ".asr.json"), model)
    sd = os.path.join(work, "sound", key, "audio")
    os.makedirs(sd, exist_ok=True)
    for k in ("voice", "music", "sfx", "amb"):
        shutil.copyfile(os.path.join(HERE, f"stem_{k}{tag}.wav"), os.path.join(sd, f"stem_{k}.wav"))
    _crop_film("clown", dur, work, os.path.join(STUDIO, "sound", "clown", "audio"))
    for r in refs:
        _crop_film(r, dur, work)
    A.B, A.STUDIO = work, work
    O = A.analyze(key)
    REF = {k: A.analyze(k) for k in ["clown"] + refs}
    X = film_extra(tag)
    XC = film_extra("", stem_dir=os.path.join(work, "sound", "clown", "audio"), phrases=os.path.join(STUDIO, "sound", "clown", "voice", "phrases.json"), dur=dur)

    def beat(d):
        w = d.get("stems", {}).get("music_tempo_windows")
        return round(float(np.mean([c >= BEAT_CONF for _, _, c in w])), 2) if w else None
    hk = {}
    try:
        hk = json.load(open(os.path.join(HERE, f"mix_report{tag}.json"), encoding="utf-8"))["hook"]
    except Exception:  # noqa
        pass
    gl = [g for g in O["longest_gaps"] if not (hk and abs(g[1] - hk["beat"][0]) < 0.35)]       # the designed held beat is not a hole
    lg = lambda d: d["longest_gaps"][0][0] if d.get("longest_gaps") else 0.0
    rows = [
        ("words heard (whisper)", O["n_words"], lambda d: d["n_words"], lambda v: v >= 17),
        ("words / s over the opening", round(O["wps_film"], 2), lambda d: d["wps_film"], lambda v: v >= 2.4),
        ("first word s", round(O["first_word"], 2), lambda d: d["first_word"], lambda v: v <= 0.4),
        ("longest voice gap outside the held beat s", gl[0][0] if gl else 0.0, lg, lambda v: v <= 0.8),
        ("the held beat s (designed: 0.4-0.6)", hk.get("beat_s"), None, lambda v: v is not None and 0.38 <= v <= 0.62),
        ("beds inside the held beat dBFS (real silence)", round(hk["beds_in_beat_dbfs"], 1) if hk else None, None, lambda v: v is not None and v <= -70),
        ("music 0-0.3 s dBFS (music from frame 0)", O["stems"]["open_0_0.3_dbfs"]["music"], lambda d: _get(d, "stems.open_0_0.3_dbfs.music"), lambda v: v >= -40),
        ("narrator share", X["narrator_share"], lambda d: XC["narrator_share"] if d is REF["clown"] else None, lambda v: v >= 0.6),
        ("narrator pitch step line to line st (median)", X["narrator_pitch_step_st"], lambda d: XC["narrator_pitch_step_st"] if d is REF["clown"] else None, lambda v: v is not None and v <= 3.5),
        ("music under the voice while talking dB", O["stems"]["music_under_voice_median_db"], lambda d: _get(d, "stems.music_under_voice_median_db"), lambda v: v is not None and -19.5 <= v <= -16.0),
        ("music: clear beat in 6 s windows (share)", beat(O), lambda d: beat(d) if "stems" in d else None, lambda v: v is not None and v >= 0.5),
        ("ambience under the voice dB", O["stems"]["amb_under_voice_median_db"], lambda d: _get(d, "stems.amb_under_voice_median_db"), lambda v: v is None or v <= -28.0),
        ("steady tone in effects + ambience s", X["steady_tone_s"], lambda d: XC["steady_tone_s"] if d is REF["clown"] else None, lambda v: v <= 1.5),
        ("effect onsets per 10 s", O["stems"]["sfx_onsets_per10s"], lambda d: _get(d, "stems.sfx_onsets_per10s"), lambda v: 12.0 <= v <= 25.0),
        ("effects under the voice dB", O["stems"]["sfx_under_voice_median_db"], lambda d: _get(d, "stems.sfx_under_voice_median_db"), lambda v: v is not None and v <= -25.0),
        ("effect onset centroid Hz", O["stems"]["sfx_onset_centroid_median"], lambda d: _get(d, "stems.sfx_onset_centroid_median"), lambda v: v is not None and 1800 <= v <= 3200),
        ("in-speech floor (p10 vs p75) dB", O["est_floor_p10_vs_speech"], lambda d: d.get("est_floor_p10_vs_speech"), lambda v: v >= -12.0),
        ("mix centroid Hz", O["centroid_median"], lambda d: d.get("centroid_median"), lambda v: 600 <= v <= 700),
        ("120-400 Hz vs 400-2k dB", O["ltas_rel"]["120-400"], lambda d: d["ltas_rel"]["120-400"], lambda v: v >= 3.0),
        ("10-16 kHz vs 400-2k dB", O["ltas_rel"]["10-16k"], lambda d: d["ltas_rel"]["10-16k"], lambda v: v >= -12.0),
        ("every line over the bed, 0.5-4 kHz, worst dB", X["line_margin_worst"][1] if X["line_margin_worst"] else None,
         lambda d: (XC["line_margin_worst"][1] if XC["line_margin_worst"] else None) if d is REF["clown"] else None, lambda v: v is not None and v >= 12.0),
        ("first 0.3 s dBFS RMS (no dry open)", O["open"]["rms_0_0.3"], lambda d: d["open"]["rms_0_0.3"], lambda v: v >= -30.0),
        ("true peak dBTP", O["r128"]["TP"], lambda d: d["r128"]["TP"], lambda v: v <= -1.0),
    ]

    def refcol(fn):
        if fn is None:
            return "-"
        out = []
        for k in REF:
            try:
                v = fn(REF[k])
            except Exception:  # noqa
                v = None
            out.append(_fmt(v) if v is not None else "-")
        return " / ".join(out)
    rules = [(name, v, refcol(fn), ok) for name, v, fn, ok in rows]
    return report(f"OPENING 0-{dur:.1f} s", wav, rules, {"ours": O, "extra": X, "refs": REF, "clown_extra": XC}, tag, cols="clown / " + " / ".join(refs))


def gate_film(tag, model, refs):
    wav = os.path.join(HERE, f"mix{tag}.wav")
    work = os.path.join(HERE, "_gate")
    os.makedirs(os.path.join(work, "wav"), exist_ok=True)
    os.makedirs(os.path.join(work, "data"), exist_ok=True)
    key = "pointing"                                    # analyze() reads our stems from sound/<key>/audio (untagged)
    shutil.copyfile(wav, os.path.join(work, "wav", key + ".wav"))
    asr(os.path.join(work, "wav", key + ".wav"), os.path.join(work, "data", key + ".asr.json"), model)
    sd = os.path.join(work, "sound", key, "audio")                 # analyze() reads <STUDIO>/sound/<key>/audio/stem_*.wav: give it THIS mix's stems
    os.makedirs(sd, exist_ok=True)
    for k in ("voice", "music", "sfx", "amb"):
        shutil.copyfile(os.path.join(HERE, f"stem_{k}{tag}.wav"), os.path.join(sd, f"stem_{k}.wav"))
    A.B, A.STUDIO = work, work
    O = A.analyze(key)
    X = film_extra(tag)
    REF = {k: json.load(open(os.path.join(BENCH, "data", k + ".metrics.json"), encoding="utf-8")) for k in ["clown"] + refs}
    g = lambda d, p: (lambda x: x)(_get(d, p))
    rows = [
        ("words / s over the film", O["wps_film"], "wps_film", lambda v: v >= 3.2),
        ("longest voice gap s", O["longest_gaps"][0][0] if O["longest_gaps"] else 0.0, None, lambda v: v <= 0.8),
        ("narrator share", X["narrator_share"], None, lambda v: v >= 0.75),
        ("narrator pitch step line to line st (median)", X["narrator_pitch_step_st"], None, lambda v: v is not None and v <= 3.5),
        ("music under the voice while talking dB", O["stems"]["music_under_voice_median_db"], "stems.music_under_voice_median_db", lambda v: v is not None and -19.5 <= v <= -16.0),
        ("music level jumps > 6 dB per minute", O["stems"]["music_level_jumps_over_6db_per_min"], "stems.music_level_jumps_over_6db_per_min", lambda v: v <= 8.0),
        ("music: six-second windows with a clear beat (share)", round(float(np.mean([c >= BEAT_CONF for _, _, c in O["stems"]["music_tempo_windows"]])), 2), None, lambda v: v >= 0.70),
        ("ambience under the voice dB", O["stems"]["amb_under_voice_median_db"], "stems.amb_under_voice_median_db", lambda v: v is not None and v <= -28.0),
        ("ambience stem LUFS", O["stems"]["amb_lufs"], "stems.amb_lufs", lambda v: v <= -40.0),
        ("steady tone in effects + ambience s", X["steady_tone_s"], None, lambda v: v <= 8.0),
        ("effect onsets per 10 s", O["stems"]["sfx_onsets_per10s"], "stems.sfx_onsets_per10s", lambda v: 12.0 <= v <= 25.0),
        ("effects under the voice dB", O["stems"]["sfx_under_voice_median_db"], "stems.sfx_under_voice_median_db", lambda v: v is not None and v <= -25.0),
        ("effect onset centroid Hz", O["stems"]["sfx_onset_centroid_median"], "stems.sfx_onset_centroid_median", lambda v: v is not None and 1800 <= v <= 3200),
        ("in-speech floor (p10 vs p75) dB", O["est_floor_p10_vs_speech"], "est_floor_p10_vs_speech", lambda v: v >= -12.0),
        ("mix centroid Hz", O["centroid_median"], "centroid_median", lambda v: 600 <= v <= 700),
        ("120-400 Hz vs 400-2k dB", O["ltas_rel"]["120-400"], "ltas_rel.120-400", lambda v: v >= 3.0),
        ("10-16 kHz vs 400-2k dB", O["ltas_rel"]["10-16k"], "ltas_rel.10-16k", lambda v: v >= -12.0),
        ("every line over the bed, 0.5-4 kHz, worst dB", X["line_margin_worst"][1] if X["line_margin_worst"] else None, None, lambda v: v is not None and v >= 12.0),
        ("last 2 s dBFS RMS", O["close"]["rms_last2"], "close.rms_last2", lambda v: v >= -18.0),
        ("loudness LUFS", O["r128"]["I"], "r128.I", lambda v: -14.5 <= v <= -13.5),
        ("loudness range LU", O["r128"]["LRA"], "r128.LRA", lambda v: v <= 3.2),
        ("true peak dBTP", O["r128"]["TP"], "r128.TP", lambda v: v <= -1.0),
    ]
    rules = [(name, v, " / ".join(_fmt(_get(REF[k], p)) for k in REF) if p else "-", ok) for name, v, p, ok in rows]
    return report("FILM", wav, rules, {"ours": O, "extra": X}, tag, cols="clown / " + " / ".join(refs))


def _get(d, path):
    x = d
    for p in path.split("."):
        if not isinstance(x, dict):
            return None
        x = x.get(p)
    return x


def _fmt(v):
    return f"{v:.2f}" if isinstance(v, float) and abs(v) < 10 else (f"{v:.1f}" if isinstance(v, float) else str(v))


def report(kind, path, rules, data, tag, cols="clown"):
    print(f"SOUND GATE ({kind}): {path}")
    print(f"| measure | ours | {cols} | pass |")
    print("|---|---|---|---|")
    fails = 0
    out = []
    for name, v, ref, ok in rules:
        try:
            p = bool(ok(v))
        except Exception:
            p = False
        fails += not p
        out.append(dict(measure=name, ours=v, ref=ref, ok=p))
        print(f"| {name} | {_fmt(v)} | {_fmt(ref)} | {'PASS' if p else '**FAIL**'} |")
    print(f"{'PASS' if not fails else 'FAIL'}: {len(rules) - fails} of {len(rules)} inside the rules")
    json.dump(dict(kind=kind, path=path, rules=out, data=data), open(os.path.join(HERE, f"sound_gate{'_music' if kind == 'MUSIC' else ''}{tag}.json"), "w", encoding="utf-8"),
              indent=1, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o))
    return 0 if not fails else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", default="")
    ap.add_argument("--music", default=None)
    ap.add_argument("--model", default="medium")
    ap.add_argument("--refs", default="R_railroads,R_jobjapan")
    ap.add_argument("--opening", action="store_true", help="gate an opening mix next to the same first seconds of clown + 2 references")
    a = ap.parse_args()
    tag = ("_" + a.tag) if a.tag else ""
    if a.music:
        sys.exit(gate_music(a.music, tag))
    if a.opening:
        sys.exit(gate_opening(tag, a.model, a.refs.split(",")))
    sys.exit(gate_film(tag, a.model, a.refs.split(",")))
