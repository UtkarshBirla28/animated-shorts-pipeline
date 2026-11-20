# THE MIX TARGETS of v4 (2026-11-20, BENCHMARK_sound.md section 4 "changes in the mix" and section 6 rules). Applied by
# mix.py after the buses are automated and before the master. Each target is measured and reached here, so a new cue
# sheet or bed cannot silently drift back to the v3 numbers:
#   ambience   stem trimmed to AMB_UNDER LU under the voice (clown: 27.9; the rule: >= 28 dB under while talking)
#   effects    stem trimmed to SFX_UNDER LU under the voice (clown 19.5 LU; the rule: >= 25 dB under while talking at the
#              onsets' median), tilted bright (+3 dB at 3.5 kHz, -3 dB under 180 Hz: "light and bright", centroid 2-3 kHz)
#   tones      no steady tone at 0.8-1.5 kHz under the voice: an STFT tone suppressor on effects + ambience, only while words sound
#   room       room tone at ROOM_DB under the voice track, so it never sits in digital silence between units
#   master     a gentle tone match toward the reference channel (120-400 Hz about +4.5, 10-16 kHz about -10, < 120 Hz
#              about -6.5, all relative to 400-2000 Hz), clamped, as low / high shelves: a SUPPLEMENT to fixing the sources
import numpy as np
from scipy import signal
from dsp import SR, ns, dbg, rng, lp, hp, shelf, peq, colored
import mixlib as M

AMB_UNDER = 28.0
SFX_UNDER = 21.0
TONE = dict(lo=800.0, hi=1500.0, prom_db=12.0, cut_db=12.0, nfft=4096)
ROOM_DB = -46.0                  # LU under the voice's loudness (about -60 dBFS in the -14 LUFS film)
MATCH = {"low": (110.0, -6.5, 3.0), "warm": (260.0, 4.5, 4.0), "air": (11000.0, -10.0, 6.0)}   # band: (shelf Hz, target dB vs 400-2k, max |gain|)


def trim_to(x, ref_lufs, under):
    """scale a stem so its integrated loudness sits `under` LU below ref_lufs; returns (x, gain dB)"""
    L = M.lufs(x)
    if not np.isfinite(L):
        return x, 0.0
    g = (ref_lufs - under) - L
    return x * dbg(g), g


def brighten(x):
    return shelf(shelf(x, 3500.0, 3.0, "high"), 180.0, -3.0, "low")


def tone_suppress(x, key, lo=TONE["lo"], hi=TONE["hi"], prom_db=TONE["prom_db"], cut_db=TONE["cut_db"], nfft=TONE["nfft"]):
    """x: (2, n) bed; key: (n,) 0..1 (1 = words are sounding). Bins of lo..hi Hz that stand prom_db over the local spectral
    median in a frame are cut by cut_db * key. Returns (y, seconds of frames where a tone was cut)."""
    hop = nfft // 4
    f, t, Z = signal.stft(x, SR, nperseg=nfft, noverlap=nfft - hop, axis=-1)
    mag = np.abs(Z).mean(0)                                         # (bins, frames)
    sel = (f >= lo) & (f <= hi)
    dbm = 20 * np.log10(mag + 1e-12)
    from scipy.ndimage import median_filter
    base = median_filter(dbm, size=(41, 1), mode="nearest")
    tone = (dbm - base > prom_db) & sel[:, None]
    tone = tone | np.roll(tone, 1, 0) | np.roll(tone, -1, 0)          # the bins beside a peak too
    kf = np.interp(t, np.arange(len(key)) / SR, key)
    gain = np.where(tone, dbg(-cut_db * kf)[None, :], 1.0)
    _, y = signal.istft(Z * gain[None, :, :], SR, nperseg=nfft, noverlap=nfft - hop)
    y = y[:, :x.shape[1]]
    if y.shape[1] < x.shape[1]:
        y = np.pad(y, ((0, 0), (0, x.shape[1] - y.shape[1])))
    secs = float((tone.any(0) & (kf > 0.5)).sum() * hop / SR)
    return y, secs


def room_tone(n, level_lufs, seed=77):
    """a quiet, warm, still room (pink, low-passed): the voice track never falls into digital silence"""
    r = rng(seed)
    c = lp(hp(colored(n, r, 1.0), 60, 1), 5000, 1)
    d = lp(hp(colored(n, r, 1.0), 60, 1), 5000, 1)
    x = np.stack([c + 0.25 * d, c - 0.25 * d])                     # mostly centred: it does not fall away in mono
    L = M.lufs(x)
    return x * dbg(level_lufs - L)


def bands(x):
    """band levels (dB) relative to 400-2000 Hz, like the benchmark's LTAS"""
    m = x.mean(0)
    f, P = signal.welch(m, SR, nperseg=8192)
    b = lambda lo, hi: 10 * np.log10(np.sum(P[(f >= lo) & (f < hi)]) + 1e-20)
    ref = b(400, 2000)
    return {"low": b(30, 120) - ref, "warm": b(120, 400) - ref, "air": b(10000, 16000) - ref}


def match_gains(x):
    """the shelf / bell gains (dB) that move x toward the references' balance (clamped), and its bands before"""
    B0 = bands(x)
    gains = {}
    for k, (fc, tgt, mx) in MATCH.items():
        g = float(np.clip(tgt - B0[k], -mx, mx))
        if k == "low":
            g = float(np.clip(g, -1.0, mx))                          # never thin the body further
        gains[k] = round(g, 2)
    return gains, {k: round(v, 1) for k, v in B0.items()}


def apply_match(x, gains):
    """the same linear filters on any stem (so the stems still add up to the mix)"""
    y = x
    if abs(gains.get("low", 0)) > 0.2:
        y = shelf(y, MATCH["low"][0], gains["low"], "low")
    if abs(gains.get("warm", 0)) > 0.2:
        y = peq(y, 230.0, gains["warm"], 0.8)
    if abs(gains.get("air", 0)) > 0.2:
        y = shelf(y, MATCH["air"][0], gains["air"], "high")
    return y
