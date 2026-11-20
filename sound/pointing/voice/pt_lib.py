"""pointing ("Why Japanese Train Drivers Point at Nothing"): shared voice helpers, ported from sound/clown/voice_p2/v6_lib.py. Nothing is ever played: every number stands in for an ear.
Measurement code is carried over from sound/clown/voice(cut 1)/clown_lib.py + clown_probe.py (true-silence runs,
BS.1770 loudness, autocorrelation f0, spectral bands, faster-whisper word check)."""
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import lfilter, butter, sosfiltfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
TAKES = HERE / "takes"
SR = 48000
JAMES = "QhpsGjDKZmM9qRYdMhBD"
MODEL = "eleven_v4"
THR = -45.0          # true silence: 10 ms RMS windows every 5 ms under -45 dBFS (after gaining a take to -18 LUFS)
H = 0.005

# ---- script v2 of "pointing" (sound/pointing/SCRIPT_v2.md, LOCKED), one entry per LINE in script order:
# (id, speaker, spoken text, caption markup or None). Speakers: N narrator (James), D driver, T tourist, KID.
# Captions: digits on screen ({digits|spoken}), shouted call-outs in CAPS (script v2 "Captions").
LINES = [
    ("d01", "D", "Signal... green!", "{SIGNAL...|Signal...} {GREEN!|green!}"),
    ("t01", "T", "Bro's pointing at nothing!", None),
    ("n01", "N", "Give him a minute. He'll be pointing too.", None),
    ("n02", "N", "And the man he's laughing at? He's got over a thousand people behind him... and one tiny fan.",
     "And the man he's laughing at? He's got over {1,000|a thousand} people behind him... and one tiny fan."),
    ("n03", "N", "So he points at the speed.", None),
    ("d02", "D", "Speed... check!", "{SPEED...|Speed...} {CHECK!|check!}"),
    ("n04", "N", "The doors.", None),
    ("d03", "D", "Doors... closed!", "{DOORS...|Doors...} {CLOSED!|closed!}"),
    ("t02", "T", "Stay. Be right back.", None),
    ("t03", "T", "Nobody does that in New York!", None),
    ("n05", "N", "Actually, New York does.", None),
    ("n06", "N", "Its subway doors kept opening... in tunnels.", None),
    ("n07", "N", "So now, conductors must point at a striped board first.", None),
    ("n08", "N", "No board? No doors.", None),
    ("t04", "T", "Vending machine... check!", "{VENDING|Vending} {MACHINE...|machine...} {CHECK!|check!}"),
    ("t05", "T", "What's a finger gonna do, bro?", None),
    ("n09", "N", "Ever gone back home to check the stove... you'd already checked?", None),
    ("n10", "N", "Japan's railway lab put it to a simple test.", None),
    ("n11", "N", "For every six mistakes people made just looking... they made about one by pointing and saying it out loud.",
     "For every {6|six} mistakes people made just looking... they made about {1|one} by pointing and saying it out loud."),
    ("n12", "N", "You see, your eyes can look right at something... while your mind is somewhere else.", None),
    ("n13", "N", "A finger and a shout drag your mind back to it.", None),
    ("d04", "D", "Doors... closed!", "{DOORS...|Doors...} {CLOSED!|closed!}"),
    ("k01", "KID", "Bag... check!", "{BAG...|Bag...} {CHECK!|check!}"),
    ("t06", "T", "Bag... gone.", None),
]
# ---- script v2 cut order 5.2, applied because the real voice ran 70.1 s (> 66 s): the lines as they are spoken now.
# 1. "Vending machine... check!" (t04) is dropped from the voice (pt_build --drop t04; the picture keeps a silent mock point)
# 2. "...and one tiny fan" cut: n02 ends "...behind him."    3. n10 "Japan's railway lab put it to a simple test." -> "...tested it."
V2_TEXT = {l[0]: l[2] for l in LINES}
CUT = {
    "n02": ("And the man he's laughing at? He's got over a thousand people behind him.",
            "And the man he's laughing at? He's got over {1,000|a thousand} people behind him."),
    "n10": ("Japan's railway lab tested it.", None),
}
CUT_DROP = ["t04"]
LINES = [(i, sp, CUT[i][0], CUT[i][1]) if i in CUT else (i, sp, t, mk) for i, sp, t, mk in LINES]
IDX = {l[0]: k for k, l in enumerate(LINES)}
TEXT = {l[0]: l[2] for l in LINES}
SPEAKER = {l[0]: l[1] for l in LINES}


def sentences(text):
    """split a line into sentences on . ? ! : (keeps '...' inside: 'Sorry... what clown?' is one sentence)"""
    t = text.strip()
    out, cur = [], ""
    toks = t.split()
    for k, w in enumerate(toks):
        cur = (cur + " " + w).strip()
        if re.search(r"(?<!\.\.)[.?!:]$", w) and not w.endswith("..."):
            out.append(cur)
            cur = ""
    if cur:
        out.append(cur)
    return out


def nwords(t):
    return len(t.split())


def read(p, sr=SR, ch=1):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ar", str(sr), "-ac", str(ch), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x if ch == 1 else x.reshape(-1, ch)


def db_frames(m, sr=SR, hop_s=H, win_s=0.010):
    """RMS level (dBFS) of win_s windows every hop_s"""
    hop, win = int(sr * hop_s), int(sr * win_s)
    n = max(0, (len(m) - win) // hop + 1)
    c = np.concatenate([[0.0], np.cumsum(m ** 2)])
    i = np.arange(n) * hop
    return 10 * np.log10((c[i + win] - c[i]) / win + 1e-12)


def runs_below(d, a, b, thr=THR):
    """silent runs (frame index ranges [s, e)) inside frames [a, b)"""
    out, s = [], None
    for j in range(max(0, a), min(len(d), b)):
        if d[j] < thr:
            s = j if s is None else s
        elif s is not None:
            out.append((s, j))
            s = None
    if s is not None:
        out.append((s, min(len(d), b)))
    return out


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


def f0_track(m, sr=SR, fmin=62.0, fmax=420.0):
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
        for jj in range(1, len(ac) - 1):
            if ac[jj] > 0.9 * ac[j] and ac[jj] >= ac[jj - 1] and ac[jj] >= ac[jj + 1]:
                j = jj
                break
        if ac[j] < 0.5 or j < 2 or j > len(ac) - 3:
            F.append(np.nan)
            continue
        den = ac[j - 1] - 2 * ac[j] + ac[j + 1]
        sh = 0.5 * (ac[j - 1] - ac[j + 1]) / den if den else 0.0
        F.append(r / (lo + j + float(np.clip(sh, -1, 1))))
    return np.array(T), np.array(F)


def end_contour(T, F, t0, t1):
    """f0 over the last 300 ms of VOICED sound in [t0, t1]: semitone change (median of its last third vs its first
    third), the end against the sentence median"""
    k = np.where((T >= t0) & (T <= t1) & ~np.isnan(F))[0]
    if len(k) < 8:
        return None
    f = F[k]
    med = float(np.median(f))
    f = f[(f > med / 1.9) & (f < med * 1.9)]
    last = f[-30:]
    n = len(last)
    if n < 6:
        return None
    a, b = np.median(last[:max(3, n // 3)]), np.median(last[-max(3, n // 3):])
    return {"rise_st": round(float(12 * np.log2(b / a)), 2), "end_vs_med_st": round(float(12 * np.log2(b / med)), 2),
            "end_hz": round(float(b), 1), "med_hz": round(med, 1), "voiced_frames": int(n)}


def f0_stats(T, F, t0, t1):
    k = np.where((T >= t0) & (T <= t1) & ~np.isnan(F))[0]
    f = F[k]
    if len(f) < 6:
        return {}
    med = np.median(f)
    f = f[(f > med / 1.9) & (f < med * 1.9)]
    return {"med": round(float(np.median(f)), 1), "p10": round(float(np.percentile(f, 10)), 1), "p90": round(float(np.percentile(f, 90)), 1),
            "range_st": round(float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))), 1),
            "sd_st": round(float(np.std(12 * np.log2(f / med))), 2), "n": int(len(f))}


def bands(m, sr=SR):
    """long-term spectrum of the speech frames: dB of 1-4 kHz and 4-10 kHz against 100-1000 Hz, and the centroid"""
    win, hop = 2048, 1024
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


def mfcc_mean(m, sr=SR, n=13):
    """mean MFCC (2..n) of the speech frames: a crude timbre fingerprint for voice-distance checks"""
    win, hop = 1024, 480
    nf = (len(m) - win) // hop
    if nf < 4:
        return None
    fr = np.stack([m[i * hop:i * hop + win] for i in range(nf)]) * np.hamming(win)
    e = np.sqrt(np.mean(fr ** 2, axis=1))
    fr = fr[e > 0.1 * e.max()]
    P = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(win, 1 / sr)
    mel = lambda x: 2595 * np.log10(1 + x / 700)
    imel = lambda y: 700 * (10 ** (y / 2595) - 1)
    pts = imel(np.linspace(mel(80), mel(8000), 28))
    fb = np.zeros((26, len(f)))
    for k in range(26):
        l, c, r = pts[k], pts[k + 1], pts[k + 2]
        fb[k] = np.clip(np.minimum((f - l) / (c - l), (r - f) / (r - c)), 0, None)
    S = np.log(P @ fb.T + 1e-10)
    from scipy.fft import dct
    C = dct(S, type=2, axis=1, norm="ortho")[:, 1:n]
    return C.mean(axis=0)


_WM = None


def whisper(m24, prompt=None):
    """faster-whisper medium on 24 kHz mono float -> [{w, s, e, p}] (times shifted back by the 0.2 s pad)"""
    global _WM
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly
    if _WM is None:
        # the same faster-whisper "medium" as the clown tools; on the GPU (float16) when CUDA works (the CPU is shared
        # with another session and 4 passes per take took ~4 min there), else the clown setting (CPU int8, 4 threads)
        import os
        dev = os.environ.get("PT_WHISPER_DEVICE", "cuda")
        # CUDA 12 cuBLAS + cuDNN 9 from NVIDIA's PyPI wheels, installed privately (not into the shared tools/.venv):
        # pip install --no-deps --target ~/.cache/pt_cuda12 nvidia-cublas-cu12==12.4.5.8 nvidia-cudnn-cu12==9.1.0.70
        cu = Path(os.path.expanduser("~/.cache/pt_cuda12/nvidia"))
        if cu.exists():
            for b in cu.glob("*/bin"):
                os.environ["PATH"] = str(b) + os.pathsep + os.environ.get("PATH", "")
                try:
                    os.add_dll_directory(str(b))
                except OSError:
                    pass
        try:
            if dev != "cuda":
                raise RuntimeError("cpu asked")
            _WM = WhisperModel("medium", device="cuda", compute_type="float16")
            list(_WM.transcribe(np.zeros(16000, np.float32), language="en")[0])
        except Exception:
            _WM = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    pcm = resample_poly(m24, 2, 3).astype(np.float32)
    pcm = np.concatenate([np.zeros(3200, np.float32), pcm, np.zeros(4800, np.float32)])
    segs, _ = _WM.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                             condition_on_previous_text=False, initial_prompt=prompt)
    out = []
    for sg in segs:
        for w in sg.words or []:
            out.append({"w": w.word.strip(), "s": max(0.0, w.start - 0.2), "e": max(0.0, w.end - 0.2), "p": w.probability})
    return out


NUM = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "100": "a hundred", "1000": "a thousand"}


def norm_text(t):
    """comparison form of a sentence or of a whisper hearing: lower case words, digits spelled out"""
    t = t.lower().replace("’", "'").replace("-", " ")
    t = re.sub(r"(\d),(\d{3})", r"\1\2", t)             # 1,000 -> 1000
    t = re.sub(r"\[[^\]]*\]", " ", t)                    # audio tags are not words
    t = re.sub(r"\$(\d+)", r"\1 dollar", t)
    t = re.sub(r"(\d+)%", r"\1 percent", t)
    t = re.sub(r"[^a-z0-9' ]", " ", t)
    out = " ".join(NUM.get(w, w) for w in t.split())
    for a, b in (("a a hundred", "a hundred"), ("one hundred", "a hundred"), ("did not", "didn't"), ("do not", "don't"),
                 ("here is", "here's"), ("is not", "isn't"), ("he is", "he's"), ("hes ", "he's "), ("a a thousand", "a thousand"), ("one thousand", "a thousand"),
                 ("going to", "gonna"), ("bros ", "bro's "), ("he will", "he'll"), ("you would", "you'd"), ("what is", "what's")):
        out = out.replace(a, b)
    return out.split()


def word_diff(expected, heard):
    """-> list of (op, expected words, heard words) where they differ"""
    from difflib import SequenceMatcher
    a, b = norm_text(expected), norm_text(heard)
    return [(op, " ".join(a[i1:i2]), " ".join(b[j1:j2]))
            for op, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op != "equal"]


def align_words(js):
    """ElevenLabs character alignment -> [[word, s, e]] (tags in [..] dropped)"""
    a = json.load(open(js, encoding="utf-8"))
    al = a.get("alignment") or a.get("normalized_alignment")
    if not al:
        return []
    ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    out, cur, intag = [], None, False
    for c, s, e in zip(ch, st, en):
        if c == "[":
            intag = True
        if intag:
            if c == "]":
                intag = False
            continue
        if c.strip():
            cur = [c, s, e] if cur is None else [cur[0] + c, cur[1], e]
        elif cur:
            out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return out
