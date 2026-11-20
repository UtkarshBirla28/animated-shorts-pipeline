# Does a voice line still READ in the finished mix? Runs faster-whisper (small, CPU) over one line's window of mix.wav
# and of stem_voice.wav and prints what it hears next to the script's text. Nothing is played.
# usage: python -s line_check.py v3_t07 [v3_k01 ...] [--tag name] [--pad 0.25]     (never run it next to mix.py)
import os
import sys
import numpy as np
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tl
from dsp import SR, read_wav

TAG = ("_" + sys.argv[sys.argv.index("--tag") + 1]) if "--tag" in sys.argv else ""
PAD = float(sys.argv[sys.argv.index("--pad") + 1]) if "--pad" in sys.argv else 0.25
ids = [a for a in sys.argv[1:] if a.startswith("v3_")]


def main():
    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    for name in (f"mix{TAG}.wav", f"stem_voice{TAG}.wav"):
        x, _ = read_wav(os.path.join(HERE, name))
        m = x.mean(0)
        for lid in ids:
            a, b = tl.SPAN[lid]
            seg = m[max(0, int((a - PAD) * SR)):int((b + PAD) * SR)]
            y = resample_poly(seg, 1, 3).astype(np.float32)
            y = y / (np.abs(y).max() + 1e-9) * 0.7
            segs, _ = model.transcribe(y, language="en", beam_size=5, vad_filter=False, condition_on_previous_text=False, temperature=0.0)
            txt = " ".join(s.text.strip() for s in segs)
            print(f"{name:18s} {lid}  {a:6.2f}-{b:6.2f}  script: {tl.BYID[lid]['text']!r:32s} heard: {txt!r}")


if __name__ == "__main__":
    main()
