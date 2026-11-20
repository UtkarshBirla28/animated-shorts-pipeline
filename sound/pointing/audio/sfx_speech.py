# whisper over generated / downloaded sound files: is there any speech, an announcement or a chime-like melody? (nothing is played)
# usage: python -s sfx_speech.py file.wav [...]
import sys, os, numpy as np
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import read_wav
from speech_check import HALLU


def main():
    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    for p in sys.argv[1:]:
        x, sr = read_wav(p)
        y = resample_poly(x.mean(0), 1, 3).astype(np.float32)
        y = y / (np.abs(y).max() + 1e-9) * 0.7
        rows = []
        for lang in ("ja", "en"):
            segs, _ = model.transcribe(y, language=lang, beam_size=1, vad_filter=False, condition_on_previous_text=False, temperature=0.0,
                                       compression_ratio_threshold=None, log_prob_threshold=None)
            for s in segs:
                t = s.text.strip()
                conf = bool(s.no_speech_prob < 0.5 and s.avg_logprob > -0.8 and any(c.isalpha() for c in t) and not any(h in t for h in HALLU))
                rows.append(f"[{lang}] {s.start:5.2f}-{s.end:5.2f} no_speech {s.no_speech_prob:.2f} logprob {s.avg_logprob:.2f} {'SPEECH ' if conf else ''}{t[:80]}")
        bad = any("SPEECH " in r for r in rows)
        print(f"{os.path.basename(p):18s} -> {'SPEECH?' if bad else 'no confident speech'}")
        for r in rows:
            print("    " + r)


if __name__ == "__main__":
    main()
