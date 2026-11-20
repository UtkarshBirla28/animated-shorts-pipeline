# The departure melody on paper and in sound (nothing is played):
#   - prints the tune as note names with its beats (so anyone can check it against real station melodies)
#   - renders one dry pass and reads back the loudest pitch at every note start (the notes that sound are the notes written)
#   - writes departure_melody.wav (the two passes, dry, -18 LUFS) for the record
# usage: python -s melody_check.py
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, rng, write_wav, st, integrated, dbg
import score

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def name(m):
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def main():
    pulse = 5.5 / 12
    print("OUR departure melody: D major, 3/4, 4 bars = 12 beats; one beat = %.4f s at the planned 5.5 s phrase" % pulse)
    print("melody (beat: note, length in beats):")
    print("   " + "  ".join(f"{b:g}: {name(score.deg(d, o))} ({ln:g})" for b, d, o, ln in score.MELODY))
    print("bass (beat: note): " + "  ".join(f"{b:g}: {name(score.deg(d, 0))}" for b, d in score.MEL_BASS))
    print("inner voices (beat: notes): " + "  ".join(f"{b:g}: {name(score.deg(d1, 0))}+{name(score.deg(d2, 0))}" for b, (d1, d2) in score.MEL_OFF))
    iv = [score.deg(d, o) for b, d, o, ln in score.MELODY]
    print("melody intervals in semitones: " + " ".join(f"{b - a:+d}" for a, b in zip(iv, iv[1:])))
    r = rng(1)
    y = score.melody_dry(pulse, False, r)
    ok = 0
    for b, d, o, ln in score.MELODY:
        a = ns(b * pulse + 0.012)
        seg = y[a:a + ns(0.16)]
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 1 << 16))
        fr = np.fft.rfftfreq(1 << 16, 1 / SR)
        want = 440.0 * 2 ** ((score.deg(d, o) - 69) / 12)
        k = (fr > want * 0.94) & (fr < want * 1.06)
        loud = fr[k][np.argmax(S[k])]
        top = S[(fr > 300) & (fr < 3000)].max()
        hit = S[k].max() > 0.25 * top
        ok += hit
        print(f"   beat {b:4g}: written {name(score.deg(d, o))} {want:7.1f} Hz, found {loud:7.1f} Hz {'ok' if hit else 'WEAK'}")
    print(f"{ok} of {len(score.MELODY)} melody notes sound at their written pitch")
    two = np.concatenate([y[: ns(12 * pulse)], score.melody_dry(pulse, True, r)])
    two = st(two)
    two = two * dbg(-18.0 - integrated(two))
    write_wav(os.path.join(HERE, "departure_melody.wav"), two)
    print("departure_melody.wav written (two passes, dry, %.2f s)" % (two.shape[1] / SR))


if __name__ == "__main__":
    main()
