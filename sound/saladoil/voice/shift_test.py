"""Which pitch-shift settings keep Kokoro speech intelligible? Whisper-checks the 4 lines v2 damaged under several
rubberband option sets and shift sizes. Usage: python -s shift_test.py"""
import os
import sys
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice_build as V  # noqa: E402

LINES = [8, 9, 22, 28]
OPTS = {
    "fmt_pres_q": "formant=preserved:pitchq=quality",
    "fmt_shift_q": "formant=shifted:pitchq=quality",
    "fmt_pres_crisp": "formant=preserved:pitchq=quality:transients=crisp:detector=compound:window=short",
    "fmt_shift_short": "formant=shifted:pitchq=consistency:window=short:transients=crisp",
}
SHIFTS = [1.0, 2.0, 3.5]


def rb(s, st, opt):
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, "a.wav"), os.path.join(td, "b.wav")
        wavfile.write(a, V.SR, (np.clip(s, -1, 1) * 32767).astype(np.int16))
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", f"rubberband=pitch={2 ** (st / 12):.5f}:{opt}", b],
                           capture_output=True, text=True)
        if r.returncode:
            return None
        _, y = wavfile.read(b)
    return y.astype(np.float32) / 32768.0


k = V.kokoro()
st = V.style(k, "am_fenrir")
score = {}
for i in LINES:
    toks, spoken = V.parse(V.P[i][0])
    s, _ = k.create(spoken, voice=st, speed=1.2, lang="en-us")
    s = V.trim(s.astype(np.float32))
    base = " ".join(w["w"] for w in V.whisper(s))
    print(f"[{i}] original: {base}")
    for name, opt in OPTS.items():
        for sh in SHIFTS:
            y = rb(s, sh, opt)
            if y is None:
                print(f"   {name:16} {sh:+.1f}: (option error)")
                continue
            heard = " ".join(w["w"] for w in V.whisper(y))
            al, miss = V.align(toks, spoken, V.whisper(y), len(y) / V.SR)
            score.setdefault((name, sh), 0)
            score[(name, sh)] += len(miss)
            print(f"   {name:16} {sh:+.1f}: {'OK ' if not miss else 'BAD'} {heard}")
print("\nmissed words per setting (lower is better):")
for kk, v in sorted(score.items(), key=lambda x: x[1]):
    print(f"  {kk[0]:16} {kk[1]:+.1f}: {v}")
