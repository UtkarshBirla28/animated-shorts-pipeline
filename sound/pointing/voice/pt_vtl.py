"""Vocal-tract measurements (nobody listens: numbers stand in for the ear). For the KID role this is the test that
separates a real child from an adult doing a high voice: a raised f0 is easy to fake, a short vocal tract is not.

  python pt_vtl.py <mp3 or wav> [...]            prints f0 median, formant medians F1-F3 and the vocal-tract length

Method: 16 kHz copy, voiced frames only (the autocorrelation f0 track of pt_lib), 30 ms Hamming frames every 10 ms,
pre-emphasis 0.97, LPC order 18 (autocorrelation method), roots -> formant candidates 200-5000 Hz with bandwidth
< 500 Hz, the lowest three per frame. Vocal-tract length from the uniform-tube model F_n = (2n - 1) c / 4L
(c = 35000 cm/s), the median over frames of the least-squares L on F1-F3. Reference values (adult speech
literature): adult male ~17 cm, adult female ~14.5 cm, a child of 5-7 years ~11-12.5 cm; f0 adult male ~85-180 Hz,
female ~165-255 Hz, child of 6 ~250-330 Hz."""
import sys

import numpy as np
from scipy.signal import lfilter, resample_poly
from scipy.linalg import solve_toeplitz

import pt_lib as L

C = 35000.0


def lpc(x, order):
    r = np.correlate(x, x, "full")[len(x) - 1:len(x) + order]
    if r[0] <= 0:
        return None
    try:
        a = solve_toeplitz(r[:order], -r[1:order + 1])
    except Exception:
        return None
    return np.concatenate([[1.0], a])


def formants(m48, f0_T=None, f0_F=None):
    x = resample_poly(m48, 1, 3)               # 16 kHz
    sr = 16000
    if f0_T is None:
        f0_T, f0_F = L.f0_track(m48)
    win, hop = int(0.03 * sr), int(0.01 * sr)
    out = []
    pk = np.sqrt(np.mean(x ** 2)) + 1e-9
    for i in range(0, len(x) - win, hop):
        t = (i + win / 2) / sr
        k = np.argmin(np.abs(f0_T - t)) if len(f0_T) else None
        if k is None or np.isnan(f0_F[k]) or abs(f0_T[k] - t) > 0.02:
            continue
        fr = x[i:i + win]
        if np.sqrt(np.mean(fr ** 2)) < 0.15 * pk:
            continue
        fr = lfilter([1, -0.97], [1], fr) * np.hamming(win)
        a = lpc(fr, 18)
        if a is None:
            continue
        rts = np.roots(a)
        rts = rts[np.imag(rts) > 0]
        ang = np.angle(rts)
        fq = ang * sr / (2 * np.pi)
        bw = -0.5 * sr / np.pi * np.log(np.abs(rts) + 1e-12)
        sel = np.sort(fq[(fq > 200) & (fq < 5000) & (bw < 500)])
        if len(sel) >= 3:
            out.append(sel[:3])
    if len(out) < 10:
        return None
    F = np.array(out)
    n = np.array([1, 3, 5])                      # (2n - 1)
    # least squares L per frame: F_n = n_k * C / (4 L)  ->  1/L = 4 * sum(F n) / (C sum(n^2))
    Ls = C * np.sum(n ** 2) / (4 * F @ n)
    return {"F1": round(float(np.median(F[:, 0]))), "F2": round(float(np.median(F[:, 1]))), "F3": round(float(np.median(F[:, 2]))),
            "vtl_cm": round(float(np.median(Ls)), 1), "frames": int(len(F))}


def measure(path, t0=None, t1=None):
    m = L.read(path)
    if t0 is not None:
        m = m[int(t0 * L.SR):int(t1 * L.SR)]
    T, F = L.f0_track(m)
    f = F[~np.isnan(F)]
    fm = formants(m, T, F)
    return {"f0_med": round(float(np.median(f)), 1) if len(f) else None,
            "f0_p10": round(float(np.percentile(f, 10)), 1) if len(f) else None,
            "f0_p90": round(float(np.percentile(f, 90)), 1) if len(f) else None, **(fm or {})}


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(p, measure(p), flush=True)
