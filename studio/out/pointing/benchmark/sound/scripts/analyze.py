"""Sound benchmark: measure every film the same way. Nothing is played. Writes data/<key>.metrics.json"""
import sys, os, json, re, subprocess
import numpy as np, soundfile as sf
from scipy.signal import lfilter, resample_poly, butter, sosfiltfilt, find_peaks

B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIO = os.path.abspath(os.path.join(B, "..", "..", "..", "..", ".."))
SR = 48000
OURS = {"pointing", "clown", "antitheft", "saladoil", "typo"}


def kw(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]; a1 = [1, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]; a2 = [1, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def mom_loud(x, win=0.4, hop=0.1):
    """x: (n,2) or (n,) ; returns times(center), LUFS array"""
    y = kw(x)
    p = (y ** 2) if y.ndim == 1 else (y ** 2).sum(1)
    c = np.concatenate([[0], np.cumsum(p)])
    W = int(win * SR); H = int(hop * SR)
    st = np.arange(0, len(p) - W + 1, H)
    ms = (c[st + W] - c[st]) / W
    L = -0.691 + 10 * np.log10(ms + 1e-20)
    return (st + W / 2) / SR, L


def ffmpeg_r128(path):
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, errors="replace")
    t = r.stderr[r.stderr.rfind("Summary:"):]
    g = lambda k: float(re.search(k + r":\s+(-?[\d.]+)", t).group(1))
    return {"I": g("I"), "LRA": g("LRA"), "TP": g("Peak")}


def rms_db(x):
    return 10 * np.log10(np.mean(np.asarray(x, float) ** 2) + 1e-20)


# ---------- YIN ----------
def yin(x16, fmin=70, fmax=450, hop=160, W=640, th=0.15):
    n = (len(x16) - 2 * W) // hop
    tmin, tmax = int(16000 / fmax), int(16000 / fmin)
    f0 = np.full(n, np.nan); ap = np.ones(n); en = np.zeros(n)
    N = 2 * W
    for i in range(n):
        fr = x16[i * hop: i * hop + N]
        e = np.mean(fr[:W] ** 2); en[i] = e
        if e < 1e-7: continue
        F = np.fft.rfft(fr, 2 * N)
        ac = np.fft.irfft(F * np.conj(np.fft.rfft(fr[:W], 2 * N)))[:W]
        cs = np.concatenate([[0], np.cumsum(fr ** 2)])
        e0 = cs[W]
        et = cs[np.arange(W) + W] - cs[np.arange(W)]
        d = e0 + et - 2 * ac
        d[0] = 0
        cm = d[1:] * np.arange(1, W) / (np.cumsum(d[1:]) + 1e-12)
        cm = np.concatenate([[1], cm])
        seg = cm[tmin:tmax]
        below = np.where(seg < th)[0]
        if len(below):
            k = below[0]
            while k + 1 < len(seg) and seg[k + 1] < seg[k]: k += 1
        else:
            continue
        t = k + tmin
        if 1 <= t < W - 1:
            a, b_, c = cm[t - 1], cm[t], cm[t + 1]
            den = a - 2 * b_ + c
            t = t + (0.5 * (a - c) / den if den != 0 else 0)
        f0[i] = 16000 / t; ap[i] = seg[k]
    times = (np.arange(n) * hop + W / 2) / 16000
    return times, f0, ap, en


def st(f, ref):
    return 12 * np.log2(f / ref)


def words_from_asr(key):
    a = json.load(open(os.path.join(B, "data", key + ".asr.json"), encoding="utf-8"))
    W = []
    for s in a["segments"]:
        for w in s["words"]:
            if w["e"] > w["s"]:
                W.append(dict(w=w["w"].strip(), s=w["s"], e=w["e"], p=w["p"]))
    return W, a


def sentences(W):
    S, cur = [], []
    for w in W:
        cur.append(w)
        if re.search(r"[.?!]$", w["w"]) or (len(cur) > 1 and False):
            S.append(cur); cur = []
    if cur: S.append(cur)
    return S


def onset_env(x, sr=SR, hop=480, n_fft=2048, band=None):
    xm = x if x.ndim == 1 else x.mean(1)
    n = (len(xm) - n_fft) // hop
    win = np.hanning(n_fft)
    idx = np.arange(n_fft)[None, :] + hop * np.arange(n)[:, None]
    M = np.abs(np.fft.rfft(xm[idx] * win, axis=1))
    fr = np.fft.rfftfreq(n_fft, 1 / sr)
    if band: M = M[:, (fr >= band[0]) & (fr < band[1])]
    L = np.log1p(1000 * M)
    fl = np.maximum(0, np.diff(L, axis=0)).sum(1)
    fl = np.concatenate([[0], fl])
    t = (np.arange(n) * hop + n_fft / 2) / sr
    return t, fl, M, fr


def pick_onsets(t, fl, lev_db, floor_db=-50, k=4.0, min_gap=0.1):
    med = np.median(fl); mad = np.median(np.abs(fl - med)) + 1e-9
    th = med + k * mad * 1.4826
    pk, _ = find_peaks(fl, height=th, distance=max(1, int(min_gap / (t[1] - t[0]))))
    pk = [p for p in pk if lev_db[p] > floor_db]
    return np.array(pk, int)


def tempo(fl, fps, lo=60, hi=180):
    f = fl - np.mean(fl)
    if np.allclose(f, 0): return None, 0.0
    ac = np.correlate(f, f, "full")[len(f) - 1:]
    ac = ac / (ac[0] + 1e-12)
    lags = np.arange(len(ac))
    ok = (lags >= fps * 60 / hi) & (lags <= fps * 60 / lo)
    if not ok.any(): return None, 0
    l = lags[ok][np.argmax(ac[ok])]
    return 60 * fps / l, float(ac[l])


def band_db(M, fr, lo, hi):
    s = (fr >= lo) & (fr < hi)
    return 10 * np.log10(np.mean(M[:, s] ** 2) * s.sum() + 1e-20)


def tonal_frac(M, fr, rows):
    """share of frames with >=3 spectral peaks standing >12 dB over the local median in 100-3000 Hz"""
    from scipy.ndimage import median_filter
    s = (fr >= 100) & (fr < 3000)
    out = []
    for r in rows:
        d = 20 * np.log10(M[r, s] + 1e-9)
        base = median_filter(d, 31)
        pk, _ = find_peaks(d - base, height=12, distance=3)
        out.append(len(pk) >= 3 and d.max() > -60 + 20 * np.log10(1024))
    return float(np.mean(out)) if out else float("nan")


def analyze(key):
    x, sr = sf.read(os.path.join(B, "wav", key + ".wav"), dtype="float64")
    assert sr == SR
    dur = len(x) / SR
    xm = x.mean(1)
    R = {"key": key, "dur": dur}
    R["r128"] = ffmpeg_r128(os.path.join(B, "wav", key + ".wav"))
    W, asr = words_from_asr(key)
    R["asr_text"] = " ".join(w["w"] for w in W)
    R["n_words"] = len(W)
    R["mean_p"] = float(np.mean([w["p"] for w in W])) if W else 0
    R["low_p_words"] = [(round(w["s"], 2), w["w"], round(w["p"], 2)) for w in W if w["p"] < 0.5]
    first, last = W[0]["s"], W[-1]["e"]
    R["first_word"] = first; R["last_word_end"] = last
    R["wps_film"] = len(W) / dur
    R["wps_span"] = len(W) / (last - first)
    gaps = [(W[i]["e"], W[i + 1]["s"]) for i in range(len(W) - 1) if W[i + 1]["s"] - W[i]["e"] > 0.05]
    gl = np.array([b - a for a, b in gaps]) if gaps else np.zeros(0)
    R["gaps_over_0_3"] = int((gl > 0.3).sum()); R["gaps_over_0_6"] = int((gl > 0.6).sum()); R["gaps_over_1_0"] = int((gl > 1.0).sum())
    R["gap_time_over_0_3"] = float(gl[gl > 0.3].sum())
    R["longest_gaps"] = sorted([(round(b - a, 2), round(a, 2), round(b, 2)) for a, b in gaps], reverse=True)[:6]
    R["speech_time"] = float(sum(w["e"] - w["s"] for w in W))
    # articulation: words per second inside sentences (gaps<0.3 counted)
    # ---- loudness timelines
    tm, Lmix = mom_loud(x)
    inword = np.zeros(len(tm), bool)
    for w in W:
        inword |= (tm >= w["s"]) & (tm <= w["e"])
    # dead air: 0.4s momentary windows with no word, loudness < I-12
    I = R["r128"]["I"]
    noword = np.ones(len(tm), bool)
    for w in W:
        noword &= ~((tm + 0.2 > w["s"] - 0.05) & (tm - 0.2 < w["e"] + 0.05))
    R["no_voice_s"] = float(noword.sum() * 0.1)
    R["dead_air_s"] = float((noword & (Lmix < I - 12)).sum() * 0.1)
    R["very_dead_s"] = float((noword & (Lmix < I - 20)).sum() * 0.1)
    # runs of no voice > 1.0 s
    runs = []; i = 0
    while i < len(tm):
        if noword[i]:
            j = i
            while j < len(tm) and noword[j]: j += 1
            if (j - i) * 0.1 >= 1.0: runs.append((round(tm[i] - 0.2, 1), round(tm[j - 1] + 0.2, 1), round(float(np.median(Lmix[i:j])), 1)))
            i = j
        else: i += 1
    R["no_voice_runs"] = runs
    # ---- first 3 s and last 2 s
    def seg_db(a, b): return round(rms_db(xm[int(a * SR):int(b * SR)]), 1)
    R["open"] = {"rms_0_0.05": seg_db(0, 0.05), "rms_0_0.3": seg_db(0, 0.3), "rms_0.3_1": seg_db(0.3, 1.0), "rms_1_3": seg_db(1, 3),
                 "peak_0_0.3": round(20 * np.log10(np.abs(xm[:int(0.3 * SR)]).max() + 1e-12), 1)}
    R["close"] = {"rms_last2": seg_db(dur - 2, dur), "rms_last0.3": seg_db(dur - 0.3, dur), "tail_after_last_word": round(dur - last, 2)}
    # ---- stereo
    M_ = (x[:, 0] + x[:, 1]) / 2; S_ = (x[:, 0] - x[:, 1]) / 2
    R["side_minus_mid_db"] = round(rms_db(S_) - rms_db(M_), 1)
    R["lr_corr"] = round(float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]), 3)
    # ---- spectrum (LTAS, mix) relative to 400-2k
    t_o, fl, Mag, fr = onset_env(x)
    bands = {"<120": (30, 120), "120-400": (120, 400), "400-2k": (400, 2000), "2-5k": (2000, 5000), "5-10k": (5000, 10000), "10-16k": (10000, 16000)}
    ref = band_db(Mag, fr, 400, 2000)
    R["ltas_rel"] = {k: round(band_db(Mag, fr, *v) - ref, 1) for k, v in bands.items()}
    cen = (Mag ** 2 * fr).sum(1) / ((Mag ** 2).sum(1) + 1e-20)
    R["centroid_median"] = round(float(np.median(cen[Mag.sum(1) > np.percentile(Mag.sum(1), 20)])), 0)
    # 2-5 kHz timeline (1 s) relative to film median
    s25 = (fr >= 2000) & (fr < 5000)
    e25 = 10 * np.log10((Mag[:, s25] ** 2).sum(1) + 1e-20)
    secs = np.floor(t_o).astype(int)
    e25s = np.array([10 * np.log10(np.mean(10 ** (e25[secs == s] / 10))) for s in range(int(dur))])
    R["presence_2_5k_per_s_rel_median"] = [round(float(v - np.median(e25s)), 1) for v in e25s]
    # ---- voice source for pitch
    has_stems = key in OURS
    if has_stems:
        sd = os.path.join(STUDIO, "sound", key, "audio")
        stems = {k: sf.read(os.path.join(sd, "stem_%s.wav" % k), dtype="float64")[0] for k in ["voice", "music", "sfx", "amb"]}
        tot = sum(stems.values()).mean(1)
        n = min(len(tot), len(xm))
        R["stems_vs_final_corr"] = round(float(np.corrcoef(tot[:n], xm[:n])[0, 1]), 4)
        vsig = stems["voice"].mean(1)
    else:
        vsig = xm
    v16 = resample_poly(vsig, 1, 3)
    tf, f0, ap, en = yin(v16)
    # sentence prosody
    sents = sentences(W)
    SP = []
    for sw in sents:
        a, b = sw[0]["s"], sw[-1]["e"]
        msk = (tf >= a) & (tf <= b) & ~np.isnan(f0) & (ap < 0.15)
        if msk.sum() < 8: continue
        fs = f0[msk]
        med = np.median(fs)
        lw = sw[-1]
        m2 = (tf >= lw["s"]) & (tf <= lw["e"]) & ~np.isnan(f0) & (ap < 0.15)
        endmv = None
        if m2.sum() >= 4:
            fe = f0[m2]
            k = max(2, len(fe) // 3)
            endmv = float(st(np.median(fe[-k:]), np.median(fe[:k])))
        # per word energy
        wdb = []
        for w in sw:
            seg = vsig[int(w["s"] * SR):int(w["e"] * SR)]
            if len(seg) > 200: wdb.append(rms_db(seg))
        SP.append({"s": round(a, 2), "e": round(b, 2), "text": " ".join(w["w"] for w in sw),
                   "f0_med": round(float(med), 0), "range_st": round(float(st(np.percentile(fs, 90), np.percentile(fs, 10))), 1),
                   "sd_st": round(float(np.std(st(fs, med))), 2),
                   "end_move_st": None if endmv is None else round(endmv, 1),
                   "word_db_sd": round(float(np.std(wdb)), 1) if len(wdb) > 1 else None,
                   "wps": round(len(sw) / (b - a), 2), "db": round(rms_db(vsig[int(a * SR):int(b * SR)]), 1)})
    R["sentences"] = SP
    if SP:
        meds = np.array([s["f0_med"] for s in SP])
        R["f0_median_all"] = float(np.median(meds))
        allm = ~np.isnan(f0) & (ap < 0.15)
        inw = np.zeros(len(tf), bool)
        for w in W: inw |= (tf >= w["s"]) & (tf <= w["e"])
        fv = f0[allm & inw]
        R["f0_range_st_p5_p95"] = round(float(st(np.percentile(fv, 95), np.percentile(fv, 5))), 1)
        R["f0_sd_within_sentence_median"] = round(float(np.median([s["sd_st"] for s in SP])), 2)
        R["f0_range_within_sentence_median"] = round(float(np.median([s["range_st"] for s in SP])), 1)
        R["jump_between_sentences_st_median"] = round(float(np.median(np.abs(np.diff(st(meds, 1.0))))), 1) if len(meds) > 1 else None
        R["jump_between_sentences_over_5st"] = int((np.abs(np.diff(st(meds, 1.0))) > 5).sum())
        ends = [s["end_move_st"] for s in SP if s["end_move_st"] is not None]
        R["ends"] = {"rise": sum(e > 1.5 for e in ends), "fall": sum(e < -1.5 for e in ends), "flat": sum(abs(e) <= 1.5 for e in ends)}
        R["sentence_db_sd"] = round(float(np.std([s["db"] for s in SP])), 1)
        R["word_db_sd_median"] = round(float(np.median([s["word_db_sd"] for s in SP if s["word_db_sd"] is not None])), 1)
        R["sentence_wps_median"] = round(float(np.median([s["wps"] for s in SP])), 2)
        R["sentence_wps_sd"] = round(float(np.std([s["wps"] for s in SP])), 2)
        R["n_sentences"] = len(SP)
        R["sentences_over_5st_from_median"] = int((np.abs(st(meds, np.median(meds))) > 5).sum())
    # ---- voice level reference: 100 ms rms of voice during words (p50)
    def frames_db(sig, hop=0.05, win=0.1):
        Wn = int(win * SR); H = int(hop * SR)
        c = np.concatenate([[0], np.cumsum(sig ** 2)])
        s0 = np.arange(0, len(sig) - Wn, H)
        return (s0 + Wn / 2) / SR, 10 * np.log10((c[s0 + Wn] - c[s0]) / Wn + 1e-20)
    tfr, dbmix = frames_db(xm)
    inwf = np.zeros(len(tfr), bool)
    for w in W: inwf |= (tfr >= w["s"]) & (tfr <= w["e"])
    gapf = np.ones(len(tfr), bool)
    for w in W: gapf &= ~((tfr > w["s"] - 0.08) & (tfr < w["e"] + 0.08))
    speech_lvl = np.percentile(dbmix[inwf], 75)
    R["est_bed_in_gaps_db_vs_speech"] = round(float(np.median(dbmix[gapf]) - speech_lvl), 1) if gapf.any() else None
    R["est_floor_p10_vs_speech"] = round(float(np.percentile(dbmix[inwf], 10) - speech_lvl), 1)
    # tonality in gaps (music presence proxy)
    gap_rows = [i for i in range(len(t_o)) if any(a + 0.08 < t_o[i] < b - 0.08 for a, b in gaps)]
    R["tonal_frac_gaps"] = round(tonal_frac(Mag, fr, gap_rows[::2]), 2) if gap_rows else None
    # bed-only onsets (in voice gaps), per 10 s of gap time
    lev = 10 * np.log10((Mag ** 2).sum(1) + 1e-20); lev = lev - lev.max()
    ons = pick_onsets(t_o, fl, lev, floor_db=-45)
    gmask = np.array([any(a + 0.05 < t_o[p] < b - 0.05 for a, b in gaps) for p in ons]) if len(ons) else np.zeros(0, bool)
    gap_time = sum(max(0, b - a - 0.1) for a, b in gaps) + max(0, first - 0.05) + max(0, dur - last - 0.05)
    R["mix_onsets_in_gaps_per10s_gap"] = round(10 * gmask.sum() / max(gap_time, 1e-3), 1)
    R["gap_time"] = round(gap_time, 1)
    # mix tempo (low band) whole film
    t_lb, fl_lb, _, _ = onset_env(x, band=(40, 250))
    bpm, conf = tempo(fl_lb, 100)
    R["mix_lowband_tempo"] = (round(bpm, 0) if bpm else None, round(conf, 2))
    # ---- ours: stem truth
    if has_stems:
        Lv = mom_loud(stems["voice"])[1]
        ST = {}
        for k in ["music", "sfx", "amb"]:
            Lk = mom_loud(stems[k])[1]
            ST[k + "_lufs"] = round(ffmpeg_like_I(stems[k]), 1)
            ST[k + "_present_pct_film"] = round(100 * float(np.mean(Lk > -50)), 0)
            ST[k + "_present_pct_speech"] = round(100 * float(np.mean(Lk[inword] > -50)), 0)
            dd = (Lk - Lv)[inword & (Lk > -60)]
            ST[k + "_under_voice_median_db"] = round(float(np.median(dd)), 1) if len(dd) else None
        ST["voice_lufs"] = round(ffmpeg_like_I(stems["voice"]), 1)
        # music presence runs
        Lm = mom_loud(stems["music"])[1]
        pres = Lm > -50
        gapsM = []; i = 0
        while i < len(pres):
            if not pres[i]:
                j = i
                while j < len(pres) and not pres[j]: j += 1
                if (j - i) * 0.1 >= 0.5: gapsM.append((round(tm[i] - 0.2, 1), round(tm[j - 1] + 0.2, 1)))
                i = j
            else: i += 1
        ST["music_silent_runs_over_0_5s"] = gapsM
        ST["music_silent_total_s"] = round(sum(b - a for a, b in gapsM), 1)
        # music level changes: count of 1-s steps where music short-term level changes by >6 dB
        Lm1 = np.array([np.mean(Lm[(tm >= s) & (tm < s + 1)]) for s in range(int(dur))])
        ST["music_level_per_s"] = [round(float(v), 0) for v in Lm1]
        jumps = np.abs(np.diff(Lm1))
        ST["music_level_jumps_over_6db_per_min"] = round(60 * float((jumps > 6).sum()) / dur, 1)
        # music tempo per 6 s window
        tmu, flm, Mm, frm = onset_env(stems["music"])
        temps = []
        for s0 in np.arange(0, dur - 6 + 1e-9, 3):
            sel = (tmu >= s0) & (tmu < s0 + 6)
            if np.mean(Lm[(tm >= s0) & (tm < s0 + 6)] > -50) < 0.5:
                temps.append((round(s0, 0), None, 0)); continue
            b_, c_ = tempo(flm[sel], 100)
            temps.append((round(s0, 0), round(b_, 0) if b_ else None, round(c_, 2)))
        ST["music_tempo_windows"] = temps
        levm = 10 * np.log10((Mm ** 2).sum(1) + 1e-20)
        ST["music_centroid_median"] = round(float(np.median(((Mm ** 2 * frm).sum(1) / ((Mm ** 2).sum(1) + 1e-20))[levm > levm.max() - 40])), 0)
        # sfx onsets
        tsx, fls, Ms, frs = onset_env(stems["sfx"])
        levs = 10 * np.log10((Ms ** 2).sum(1) + 1e-20)
        levs_abs = levs - 10 * np.log10(np.sum(np.hanning(2048) ** 2) * 2048 / 2)  # rough dBFS
        ons_s = pick_onsets(tsx, fls, levs - levs.max(), floor_db=-40, k=5.0)
        ST["sfx_onsets"] = len(ons_s)
        ST["sfx_onsets_per10s"] = round(10 * len(ons_s) / dur, 1)
        # loudness of each sfx onset (150 ms window) vs voice word level
        vfr_t, vdb = frames_db(stems["voice"].mean(1))
        vin = np.zeros(len(vfr_t), bool)
        for w in W: vin |= (vfr_t >= w["s"]) & (vfr_t <= w["e"])
        vref = np.percentile(vdb[vin], 75)
        sm = stems["sfx"].mean(1)
        rel = []; cents = []
        for p in ons_s:
            a = int(tsx[p] * SR); seg = sm[a:a + int(0.15 * SR)]
            rel.append(rms_db(seg) - vref)
            sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; ff = np.fft.rfftfreq(len(seg), 1 / SR)
            cents.append((sp * ff).sum() / (sp.sum() + 1e-20))
        ST["sfx_onset_db_vs_voice_median"] = round(float(np.median(rel)), 1) if rel else None
        ST["sfx_onset_db_vs_voice_p90"] = round(float(np.percentile(rel, 90)), 1) if rel else None
        ST["sfx_onset_centroid_median"] = round(float(np.median(cents)), 0) if cents else None
        ST["sfx_onset_times"] = [round(float(tsx[p]), 2) for p in ons_s]
        # stereo of stems
        for k in ["voice", "music", "sfx", "amb"]:
            s_ = stems[k]
            ST[k + "_side_minus_mid_db"] = round(rms_db((s_[:, 0] - s_[:, 1]) / 2) - rms_db((s_[:, 0] + s_[:, 1]) / 2), 1)
        # what plays at 0-0.3 s
        ST["open_0_0.3_dbfs"] = {k: round(rms_db(stems[k][:int(0.3 * SR)].mean(1)), 1) for k in stems}
        ST["close_last2_dbfs"] = {k: round(rms_db(stems[k][-2 * SR:].mean(1)), 1) for k in stems}
        # voice LTAS
        _, _, Mv, frv = onset_env(stems["voice"])
        refv = band_db(Mv, frv, 400, 2000)
        ST["voice_ltas_rel"] = {k: round(band_db(Mv, frv, *v) - refv, 1) for k, v in bands.items()}
        R["stems"] = ST
    return R


def ffmpeg_like_I(x):
    t, L = mom_loud(x)
    p = 10 ** ((L + 0.691) / 10)
    g = L > -70
    if not g.any(): return -99.0
    I0 = -0.691 + 10 * np.log10(np.mean(p[g]))
    g2 = g & (L > I0 - 10)
    return float(-0.691 + 10 * np.log10(np.mean(p[g2])))


if __name__ == "__main__":
    keys = sys.argv[1:]
    for k in keys:
        out = os.path.join(B, "data", k + ".metrics.json")
        R = analyze(k)
        json.dump(R, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=float)
        print("done", k, flush=True)
