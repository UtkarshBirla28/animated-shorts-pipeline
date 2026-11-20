"""Split the v1 cancel-beat takes ('They press cancel. Nothing. Again. Nothing.') into the new beat files:
b09 = 'They press cancel.' and b16 = 'Again.' (each cut in the middle of the true silence around it; 320k mp3).
Usage: python -s split_b09.py <src set> <dst set>"""
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import voice_build as vb  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
SR = 44100
src, dst = HERE / "takes" / sys.argv[1], HERE / "takes" / sys.argv[2]


def load(p, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def quiet_mid(x, a, b):
    """middle of the longest -45 dBFS run in [a, b] s"""
    hop = SR // 100
    seg = x[int(a * SR):int(b * SR)]
    n = len(seg) // hop
    db = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].astype(np.float64).reshape(n, hop) ** 2, axis=1)) + 1e-9)
    best, run, end = 0, 0, 0
    for j, q in enumerate(db < -45):
        run = run + 1 if q else 0
        if run > best:
            best, end = run, j
    return a + (end - best / 2 + 0.5) * 0.01, best * 0.01


def save(y, p):
    p.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame",
                    "-b:a", "320k", str(p)], input=y.astype(np.float32).tobytes(), check=True)


toks, _ = vb.parse("They press cancel. Nothing. Again. Nothing.")
for s in ("t1", "t2", "t3", "t4"):
    p = (src if s == "t1" else src / s) / "b09.mp3"
    x = load(p)
    ww = vb.whisper(load(p, 24000))   # vb.whisper expects 24 kHz
    al, miss = vb.align(toks, "", ww, len(x) / SR)
    c1, q1 = quiet_mid(x, al[2][2] - 0.05, al[3][1] + 0.05)   # cancel. | Nothing.
    c2, q2 = quiet_mid(x, al[3][2] - 0.05, al[4][1] + 0.05)   # Nothing. | Again.
    c3, q3 = quiet_mid(x, al[4][2] - 0.05, al[5][1] + 0.05)   # Again. | Nothing.
    o = dst if s == "t1" else dst / s
    save(x[:int(c1 * SR)], o / "b09.mp3")
    save(x[int(c2 * SR):int(c3 * SR)], o / "b16.mp3")
    print(f"{s}: cut b09 at {c1:.2f} (quiet {q1:.2f}), b16 {c2:.2f}-{c3:.2f} (quiet {q2:.2f}/{q3:.2f}) miss {miss}")
