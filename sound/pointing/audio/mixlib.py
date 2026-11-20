# The mix engine parts carried over from the clown film's audited chain (sound/clown/audio/mix_cut1.py + mix.py, the
# narration and sound the owner liked), freed from that film's timeline: the voice bus compressor, the split-band
# de-esser, the EQ chain, the speech-band dip of the beds, the word-margin meter, the look-ahead true-peak limiter and
# the measuring helpers. Nothing here knows the story.
import subprocess
import numpy as np
from scipy import ndimage, signal
from dsp import SR, ns, dbg, st, shelf, peq, integrated, momentary, true_peak

VOICE_HP = 90.0
VCOMP = dict(ratio=2.0, knee_db=6.0, att=0.005, rel=0.1, thr_pct=60.0)
VOICE_EQ = [("bell", 3200.0, 2.4, 0.7), ("high", 7000.0, 1.5, 0.7), ("low", 240.0, 2.5, 0.7), ("bell", 1400.0, -1.6, 0.7), ("high", 8000.0, -2.5, 0.7),
            ("low", 130.0, -4.5, 0.7), ("high", 10000.0, -3.0, 0.7)]
NARR_PRE_SHELF = (4000.0, 1.5)
NARR_SHELF = (3000.0, 1.5)
CHAR_EQ = [("low", 240.0, 1.5, 0.7), ("low", 110.0, -3.0, 0.7)]
DEESS = dict(lo=5000.0, hi=14000.0, ratio=3.0, max_db=6.0, thr_pct=96.0, att=0.001, rel=0.05, thr_off=-2.6)


def lufs(x):
    v = integrated(x)
    return float(v) if np.isfinite(v) else -99.0


def _speak(tc, words):
    k = np.zeros(len(tc), bool)
    for s, e in words:
        k |= (tc >= s) & (tc <= e)
    return k


def _smooth(gr, ctrl, att, rel):
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    sm = np.empty(len(gr))
    g = 0.0
    for i in range(len(gr)):
        x = gr[i]
        g += (x - g) * (ka if x > g else kr)
        sm[i] = g
    return sm


def voice_comp(v, words, ratio=2.0, knee_db=6.0, att=0.005, rel=0.1, thr_pct=60.0, ctrl=2000):
    """gentle feed-forward bus compressor: 2 ms RMS detector, soft knee, threshold = a percentile of the level over the words"""
    m = v.mean(0)
    hop = SR // ctrl
    nb = len(m) // hop
    e = ndimage.uniform_filter1d((m[: nb * hop] ** 2).reshape(nb, hop).mean(1), 4)
    lev = 10 * np.log10(e + 1e-12)
    tc = (np.arange(nb) + 0.5) / ctrl
    sp = _speak(tc, words)
    if not sp.any():
        return v, np.zeros(len(m)), 0.0
    thr = float(np.percentile(lev[sp & (lev > lev[sp].max() - 40)], thr_pct))
    over = lev - thr
    k = knee_db / 2
    gr = np.where(over > k, over * (1 - 1 / ratio), np.where(over > -k, (1 - 1 / ratio) * (over + k) ** 2 / (2 * knee_db), 0.0))
    grs = np.interp(np.arange(len(m)) / SR, tc, _smooth(gr, ctrl, att, rel))
    return v * dbg(-grs)[None, :], grs, thr


def deess(v, words):
    """split-band de-esser (zero-phase 5-14 kHz band, dynamic cut), threshold = a percentile of the band level over the words"""
    sos = signal.butter(2, [DEESS["lo"], DEESS["hi"]], btype="bandpass", fs=SR, output="sos")
    band = signal.sosfiltfilt(sos, v, axis=-1)
    bm = band.mean(0)
    ctrl = 2000
    hop = SR // ctrl
    nb = len(bm) // hop
    e = ndimage.uniform_filter1d((bm[: nb * hop] ** 2).reshape(nb, hop).mean(1), 6)
    lev = 10 * np.log10(e + 1e-14)
    tc = (np.arange(nb) + 0.5) / ctrl
    sp = _speak(tc, words)
    if not sp.any():
        return v, dict(max=0.0)
    thr = float(np.percentile(lev[sp], DEESS["thr_pct"])) + DEESS["thr_off"]
    gr = np.clip((lev - thr) * (1 - 1 / DEESS["ratio"]), 0, DEESS["max_db"])
    grs = np.interp(np.arange(len(bm)) / SR, tc, _smooth(gr, ctrl, DEESS["att"], DEESS["rel"]))
    return v - band * (1 - dbg(-grs))[None, :], dict(thr=thr, max=float(grs.max()), pct_over_1=float((grs > 1).mean() * 100))


def eq_chain(x, chain):
    for kind, f0, db, q in chain:
        x = shelf(x, f0, db, kind, q) if kind in ("high", "low") else peq(x, f0, db, q)
    return x


def key_env(n, spans, pre=0.10, post=0.05, att=0.015, rel=0.06, ctrl=1000):
    """0..1 envelope that is up while any span (s, e) is on: opens `pre` before, closes `post` after, smoothed"""
    nc = int(n / SR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): max(0, int((e + post) * ctrl))] = 1.0
    env = _smooth(va, ctrl, att, rel)
    return np.interp(np.arange(n) / SR, np.arange(nc) / ctrl, env)


_SOS14 = signal.butter(2, [1000.0, 4000.0], btype="bandpass", fs=SR, output="sos")


def band_gain(x, curve_db, lo=1000.0, hi=4000.0):
    """move the lo..hi band of x by a per-sample dB curve (zero-phase band split: the rest of the spectrum is untouched)"""
    if not np.any(np.abs(curve_db) > 0.01):
        return x
    sos = _SOS14 if (lo, hi) == (1000.0, 4000.0) else signal.butter(2, [lo, hi], btype="bandpass", fs=SR, output="sos")
    band = signal.sosfiltfilt(sos, x, axis=-1)
    return x - band * (1 - dbg(curve_db))[None, :]


def limiter(x, ceil_db, look=0.003, rel=0.08, loop=False):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve.
    loop=True: the gain is worked out on the signal wrapped round its own ends, so the last sample and the first get
    the same gain (a film that loops)."""
    n0 = x.shape[1]
    padn = ns(0.6) if loop else 0
    if loop:
        x = np.concatenate([x[:, -padn:], x, x[:, :padn]], axis=1)
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
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    y = x * g3[None, :]
    if loop:
        return y[:, padn:padn + n0], g3[padn:padn + n0]
    return y, g3


_SOSM = signal.butter(4, [1000.0, 4000.0], btype="bandpass", fs=SR, output="sos")


def word_margins(v, bed, words, min_len=0.06):
    """for every word: the voice's 1-4 kHz level minus the bed's (music + effects + ambience) over the word, dB"""
    vb = signal.sosfilt(_SOSM, v.mean(0)) ** 2
    bb = signal.sosfilt(_SOSM, bed.mean(0)) ** 2
    cv = np.concatenate([[0.0], np.cumsum(vb)])
    cb = np.concatenate([[0.0], np.cumsum(bb)])
    rows = []
    for lid, w, s, e in words:
        a, b = ns(s), min(len(vb), ns(max(e, s + min_len)))
        if b <= a:
            continue
        pv = (cv[b] - cv[a]) / (b - a)
        pb = (cb[b] - cb[a]) / (b - a)
        rows.append(dict(line=lid, w=w, s=s, e=e, margin=float(10 * np.log10(pv + 1e-14) - 10 * np.log10(pb + 1e-14)), v=float(10 * np.log10(pv + 1e-14))))
    return rows


def ffmpeg_ebur(path):
    try:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, timeout=300)
        txt = r.stderr
        i = txt.rfind("Summary:")
        out = {}
        for l in txt[i:].splitlines():
            l = l.strip()
            if l.startswith("I:"):
                out["I"] = float(l.split()[1])
            elif l.startswith("LRA:"):
                out["LRA"] = float(l.split()[1])
            elif l.startswith("Peak:"):
                out["TP"] = float(l.split()[1])
        return out
    except Exception as ex:  # noqa
        return {"error": str(ex)}


def seam_report(y, stems=None):
    """the loop seam: the jump from the last sample to the first against the ordinary sample steps on both sides, and the
    level / spectrum of the 150 ms before the seam against the 150 ms after it"""
    w = ns(0.15)
    d = float(np.abs(y[:, 0] - y[:, -1]).max())
    tail = np.abs(np.diff(y[:, -ns(0.3):], axis=1)).max(0)
    head = np.abs(np.diff(y[:, : ns(0.3)], axis=1)).max(0)
    db = lambda z: float(20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12))
    out = dict(jump=d, step_p99_tail=float(np.percentile(tail, 99)), step_p99_head=float(np.percentile(head, 99)), step_max_tail=float(tail.max()),
               rms_last_150ms=db(y[:, -w:]), rms_first_150ms=db(y[:, :w]))
    if stems:
        for k, z in stems.items():
            a, b = z[:, -w:].mean(0), z[:, :w].mean(0)
            f = np.fft.rfftfreq(w, 1 / SR)
            A, B = np.abs(np.fft.rfft(a * np.hanning(w))) ** 2, np.abs(np.fft.rfft(b * np.hanning(w))) ** 2
            bands = [(100, 400), (400, 1500), (1500, 5000), (5000, 12000)]
            w4 = ns(0.04)
            out[k] = dict(rms_before=db(z[:, -w:]), rms_after=db(z[:, :w]), rms_before_40ms=db(z[:, -w4:]), rms_after_40ms=db(z[:, :w4]), jump=float(np.abs(z[:, 0] - z[:, -1]).max()),
                          step_p99=float(np.percentile(np.abs(np.diff(np.concatenate([z[:, -w:], z[:, :w]], axis=1), axis=1)).max(0), 99)),
                          band_db_before=[float(10 * np.log10(A[(f >= lo) & (f < hi)].sum() + 1e-20)) for lo, hi in bands],
                          band_db_after=[float(10 * np.log10(B[(f >= lo) & (f < hi)].sum() + 1e-20)) for lo, hi in bands])
    return out
