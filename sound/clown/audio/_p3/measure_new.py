# p3: measure the new ElevenLabs takes (read-only, nothing is played): per file length, sample peak, clipped samples,
# share of near-silence, how many separate events it holds, band shares, top edge, centroid; per logical sound the takes
# samples.py cuts out of it.  usage: ... -s sound/clown/audio/_p3/measure_new.py
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import samples as SM  # noqa: E402
from dsp import SR, read_wav  # noqa: E402
from probe_samples import bands  # noqa: E402

FILES = ["pigeon_b_1", "pigeon_b_2", "pigeon_b_3", "pigeon_settle_1", "sneaker_steps_1", "heel_scuff_1", "confetti_1", "confetti_2",
         "juggle_1", "paper_crumple_1", "idea_ping_1"]
for f in FILES:
    x, sr = read_wav(os.path.join(os.path.dirname(HERE), "_el", f + ".wav"))
    m = x.mean(0)
    pk = float(np.max(np.abs(m)))
    clip = int(np.sum(np.abs(x) >= 0.999))
    e = SM.env(m, 0.01)
    sil = float(np.mean(e < pk * 10 ** (-40 / 20)))
    ev = SM.events(m / (pk + 1e-12), thr_db=-20.0, min_gap=0.07)
    lo, mid, sc, top, cen = bands(m)
    print(f"{f:<18} {len(m) / sr:4.2f} s  peak {20 * np.log10(pk + 1e-12):6.1f} dBFS  clipped {clip}  silent {sil * 100:4.0f} %  events {len(ev):2d}  "
          f"<90 Hz {lo:6.1f}  0.5-6k {mid:5.1f}  2-5k {sc:6.1f} dB  top {top:6.0f} Hz  centroid {cen:5.0f} Hz")
print()
for snd in ("pigeon_b", "pigeon_settle", "sneaker", "scuff", "confetti", "juggle_pat", "paper_crumple", "idea_ping"):
    tk = SM.takes(snd)
    print(f"{snd:<14} {len(tk)} takes: " + " ".join(f"{len(x) / SR:.2f}" for _, x in tk))
