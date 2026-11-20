"""Clown short narration: shared helpers (script, chunks, audio measurements). No audio is ever played.
Everything here is measurement: true-silence runs, BS.1770 loudness, autocorrelation f0, spectral bands, whisper."""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import lfilter, butter, sosfiltfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
TAKES = HERE / "takes"
SR = 48000
VOICE = "QhpsGjDKZmM9qRYdMhBD"
MODEL = "eleven_multilingual_v2"

# ---- script v4 (FINAL), one entry per sentence: (spoken text, caption markup, beat, kind) ----
S = [
    ("A clown rode a unicycle around this square, and half the people never saw him.", None, 1, ""),
    ("Your turn.", None, 1, ""),
    ("Count the people on a phone.", None, 1, ""),
    ("A psychology professor needed something nobody could miss.", None, 2, ""),
    ("A student of his owned a unicycle.", None, 2, ""),
    ("And a clown suit.", None, 2, ""),
    ("You don't waste a student like that.", None, 2, ""),
    ("So for an hour, he rode laps around the sculpture.", None, 2, ""),
    ("How many phones?", None, 3, "rapid q"),
    ("Five.", None, 3, "rapid"),
    ("And the clown?", None, 3, "rapid q"),
    ("You saw him.", None, 3, "rapid"),
    ("Easy.", None, 3, "rapid"),
    ("So who didn't?", None, 4, "q"),
    ("The team stopped people leaving: did you see the clown?", None, 4, ""),
    ("People in pairs mostly said yes.", None, 4, ""),
    ("So did people with music.", None, 4, ""),
    ("But to one group, a purple and yellow clown was invisible.", None, 5, ""),
    ("The ones you counted: people on a phone call.", None, 5, ""),
    ("Just one in four saw the clown.", "Just {1|one} in {4|four} saw the clown.", 6, "key beat"),
    ("Many spun around to look.", None, 6, ""),
    ("Your eyes stay on the path.", None, 7, ""),
    ("Your mind takes the call.", None, 7, ""),
    ("So the professor tried again, with money.", None, 8, ""),
    ("Three dollar bills on a branch, at head height, over a path.", None, 8, ""),
    ("Nearly everyone ducked.", None, 8, ""),
    ("Few stopped for the cash.", None, 8, ""),
    ("On a phone?", None, 9, "rapid q"),
    ("Six in a hundred.", "{6|Six} in {100.|a hundred.}", 9, "rapid"),
    ("They ducked under the money and kept walking.", None, 9, ""),
    ("That branch has hung over this video since the first second.", None, 10, ""),
    ("Two people ducked under it while you counted.", None, 10, ""),
    ("You saw the clown.", None, 10, ""),
    ("Did you see the money?", None, 11, "key beat q"),
]
# chunk -> (sentences spoken in the take, sentences USED from it, speed)
CHUNKS = {
    "c01": ([0, 1, 2], [0, 1, 2], 1.2),
    "c02": ([3, 4, 5, 6, 7], [3, 4, 5, 6, 7], 1.2),
    "c03": ([8, 9, 10, 11, 12], [8, 9, 10, 11, 12], 1.2),
    "c04": ([13, 14], [13, 14], 1.2),
    "c05": ([15, 16, 17, 18], [15, 16, 17, 18], 1.2),
    "k06": ([18, 19], [19], 1.0),          # key line in context, slower setting; only the key line is used
    "c07": ([20, 21, 22], [20, 21, 22], 1.2),
    "c08": ([23, 24, 25, 26], [23, 24, 25, 26], 1.2),
    "c09": ([27, 28, 29], [27, 28, 29], 1.2),
    "c10": ([30, 31, 32], [30, 31, 32], 1.2),
    "k11": ([32, 33], [33], 1.0),          # last question in context, slower setting; only the question is used
}
GAP_AFTER_RAPID = {8, 9, 10, 11, 27}       # sentence i: the gap AFTER it is inside a rapid-fire run (0.10-0.16)
BEAT_BEFORE = {19: 0.365, 33: 0.335}       # longer beats (true silence) before these sentences
# edit audit 2026-11-17: the answer beat was rushed. The silence AFTER sentence i is set to this length (word-edge gap;
# it was 0.130 s after "How many phones?"). Nothing else moves: every later time shifts by the difference.
GAP_OVERRIDE = {8: 0.450}


def text_of(idxs):
    return " ".join(S[i][0] for i in idxs)


def nwords(i):
    return len(S[i][0].split())


def read(p, sr=SR, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ar", str(sr), "-ac", str(ch), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x if ch == 1 else x.reshape(-1, ch)


def db_frames(m, sr=SR, hop_s=0.005, win_s=0.010):
    """RMS level (dBFS) of win_s windows every hop_s"""
    hop, win = int(sr * hop_s), int(sr * win_s)
    n = max(0, (len(m) - win) // hop + 1)
    c = np.concatenate([[0.0], np.cumsum(m ** 2)])
    i = np.arange(n) * hop
    return 10 * np.log10((c[i + win] - c[i]) / win + 1e-12)


def lufs(x, sr=SR):
    """BS.1770-4 integrated loudness (mono or stereo array)"""
    if x.ndim == 1:
        x = x[:, None]
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], y, axis=0)
    blk, hop = int(0.4 * sr), int(0.1 * sr)
    if len(y) < blk:
        z = np.array([np.sum(np.mean(y ** 2, axis=0))])
    else:
        z = np.array([np.sum(np.mean(y[i:i + blk] ** 2, axis=0)) for i in range(0, len(y) - blk + 1, hop)])
    L = -0.691 + 10 * np.log10(z + 1e-12)
    z = z[L > -70]
    if not len(z):
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(z)) - 10
    z2 = z[(-0.691 + 10 * np.log10(z + 1e-12)) > rel]
    return float(-0.691 + 10 * np.log10(np.mean(z2 if len(z2) else z)))


def f0_track(m, sr=SR, fmin=62.0, fmax=360.0):
    """normalised-autocorrelation f0 every 10 ms (40 ms window) on a low-passed, decimated copy -> (times, f0 or nan)"""
    dec = 4
    sos = butter(4, 1000, "low", fs=sr, output="sos")
    y = sosfiltfilt(sos, m)[::dec]
    r = sr // dec
    win, hop = int(0.04 * r), int(0.01 * r)
    lo, hi = int(r / fmax), int(r / fmin)
    pk = np.sqrt(np.mean(y ** 2)) + 1e-9
    T, F = [], []
    for i in range(0, len(y) - win - hi, hop):
        w = y[i:i + win + hi]
        a = w[:win] - w[:win].mean()
        e0 = np.sum(a * a)
        T.append((i + win / 2) / r)
        if np.sqrt(e0 / win) < 0.06 * pk:
            F.append(np.nan)
            continue
        ac = np.empty(hi - lo + 1)
        for t in range(lo, hi + 1):
            b = w[t:t + win] - w[t:t + win].mean()
            ac[t - lo] = np.sum(a * b) / np.sqrt(e0 * np.sum(b * b) + 1e-12)
        j = int(np.argmax(ac))
        # prefer the shortest lag within 0.9 of the best peak (octave-down guard)
        for jj in range(1, len(ac) - 1):
            if ac[jj] > 0.9 * ac[j] and ac[jj] >= ac[jj - 1] and ac[jj] >= ac[jj + 1]:
                j = jj
                break
        if ac[j] < 0.5 or j < 2 or j > len(ac) - 3:      # weak, or a pick on the edge of the search range (noise)
            F.append(np.nan)
            continue
        if 0 < j < len(ac) - 1:
            den = ac[j - 1] - 2 * ac[j] + ac[j + 1]
            sh = 0.5 * (ac[j - 1] - ac[j + 1]) / den if den else 0.0
        else:
            sh = 0.0
        F.append(r / (lo + j + float(np.clip(sh, -1, 1))))
    return np.array(T), np.array(F)


def end_contour(T, F, t0, t1):
    """f0 over the last 300 ms of VOICED sound in [t0, t1]: semitone change (median of its last third vs the median of
    its first third), and the level of the end against the sentence median / the window minimum"""
    k = np.where((T >= t0) & (T <= t1) & ~np.isnan(F))[0]
    if len(k) < 8:
        return None
    f = F[k]
    med = float(np.median(f))
    f = f[(f > med / 1.9) & (f < med * 1.9)]            # octave slips out
    last = f[-30:]
    n = len(last)
    a, b = np.median(last[:max(3, n // 3)]), np.median(last[-max(3, n // 3):])
    mn = float(np.min(last))
    return {"rise_st": round(float(12 * np.log2(b / a)), 2), "end_vs_med_st": round(float(12 * np.log2(b / med)), 2),
            "end_vs_min_st": round(float(12 * np.log2(b / mn)), 2), "end_hz": round(float(b), 1), "med_hz": round(med, 1),
            "voiced_frames": int(n)}


def bands(m, sr=SR):
    """long-term spectrum of the speech frames: dB of 1-4 kHz and 4-10 kHz against 100-1000 Hz, and the centroid"""
    win = 2048
    hop = 1024
    n = (len(m) - win) // hop
    if n < 2:
        return {}
    fr = np.stack([m[i * hop:i * hop + win] for i in range(n)]) * np.hanning(win)
    e = np.sqrt(np.mean(fr ** 2, axis=1))
    fr = fr[e > 0.1 * e.max()]
    P = np.mean(np.abs(np.fft.rfft(fr, axis=1)) ** 2, axis=0)
    f = np.fft.rfftfreq(win, 1 / sr)
    b = lambda lo, hi: 10 * np.log10(np.sum(P[(f >= lo) & (f < hi)]) + 1e-20)
    return {"mid_db": round(b(1000, 4000) - b(100, 1000), 2), "hi_db": round(b(4000, 10000) - b(100, 1000), 2),
            "centroid_hz": round(float(np.sum(f[f < 10000] * P[f < 10000]) / np.sum(P[f < 10000])), 0)}


def align_words(js):
    """ElevenLabs character alignment -> [[word, s, e]] (whitespace-separated tokens with their punctuation)"""
    a = json.load(open(js, encoding="utf-8"))
    al = a.get("alignment") or a.get("normalized_alignment")
    ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    out, cur = [], None
    for c, s, e in zip(ch, st, en):
        if c.strip():
            cur = [c, s, e] if cur is None else [cur[0] + c, cur[1], e]
        elif cur:
            out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return out


_WM = None


def whisper(m24):
    """faster-whisper medium on 24 kHz mono float -> [{w, s, e, p}]"""
    global _WM
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly
    if _WM is None:
        _WM = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    pcm = resample_poly(m24, 2, 3).astype(np.float32)
    pcm = np.concatenate([np.zeros(3200, np.float32), pcm, np.zeros(4800, np.float32)])
    segs, _ = _WM.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                             condition_on_previous_text=False)
    out = []
    for sg in segs:
        for w in sg.words or []:
            out.append({"w": w.word.strip(), "s": max(0.0, w.start - 0.2), "e": max(0.0, w.end - 0.2), "p": w.probability})
    return out


NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six"}


def norm_text(t):
    """comparison form of a sentence or of a whisper hearing: lower case words, digits spelled out"""
    t = t.lower().replace("\u2019", "'").replace("-", " ")
    t = re.sub(r"\$(\d+)", r"\1 dollar", t)             # whisper writes "three dollar bills" as "$3 bills"
    t = re.sub(r"\bcache\b", "cash", t)                  # homophone: the same sound
    t = re.sub(r"\b100\b", "a hundred", t)
    t = re.sub(r"[^a-z0-9' ]", " ", t)
    out = " ".join(NUM.get(w, w) for w in t.split())
    for a, b in (("a a hundred", "a hundred"), ("one hundred", "a hundred"), ("did not", "didn't"), ("do not", "don't")):
        out = out.replace(a, b)
    return out.split()


def word_diff(expected, heard):
    """-> list of (op, expected words, heard words) where they differ"""
    from difflib import SequenceMatcher
    a, b = norm_text(expected), norm_text(heard)
    return [(op, " ".join(a[i1:i2]), " ".join(b[j1:j2]))
            for op, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op != "equal"]
