"""Split an assembled voice into the swappable OPENING and the BODY (the lead, 2026-11-19: the hook lab may replace the
first lines). Sample-exact: both segments are slices of the same voice.wav, cut inside the true silence before the
first body line; word / phrase times are re-based to each segment's own start.
  python pt_split.py [voice dir] [first body line id]      default: this folder, n03 ("So he points at the speed.")
-> <dir>/segments/opening/ and <dir>/segments/body/ (voice.wav, words.json, words_spoken.json, phrases.json) + segments/split.json

To swap in a new opening later: build the new opening lines alone (pt_build.py --drop <every body line> --out ...), then
concatenate new_opening.wav (cut 'lead_in_body_s' after its last word) + body/voice.wav; every body time shifts by
(new opening's last word end + the planned gap) - split.json 'body_first_word_in_full_s'. The body audio never changes."""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
D = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("n") else L.HERE
FIRST = next((a for a in sys.argv[1:] if a.startswith(("n", "d", "t", "k")) and len(a) == 3), "n03")
x = L.read(D / "voice.wav", ch=2)
SR = L.SR
phr = json.loads((D / "phrases.json").read_text(encoding="utf-8"))
words = json.loads((D / "words.json").read_text(encoding="utf-8"))
spoken = json.loads((D / "words_spoken.json").read_text(encoding="utf-8"))
k = next(i for i, p in enumerate(phr) if p["id"] == FIRST)
a_end, b_on = phr[k - 1]["e"], phr[k]["s"]
m = x.mean(axis=1)
seg = m[int(a_end * SR):int(b_on * SR)]
# cut at the quietest point in the middle third of the silence (an exact zero if there is one)
lo, hi = len(seg) // 3, 2 * len(seg) // 3
cut = int(a_end * SR) + lo + int(np.argmin(np.abs(seg[lo:hi])))
t_cut = cut / SR
out = D / "segments"


def write(name, y, t0, keep):
    o = out / name
    o.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(o / "voice.wav")],
                   input=y.astype(np.float32).tobytes(), check=True)
    sh = lambda w: {**w, "s": round(w["s"] - t0, 3), "e": round(w["e"] - t0, 3)}
    (o / "words.json").write_text(json.dumps([sh(w) for w in words if keep(w)], ensure_ascii=False, indent=1), encoding="utf-8")
    (o / "words_spoken.json").write_text(json.dumps([sh(w) for w in spoken if keep(w)], ensure_ascii=False, indent=1), encoding="utf-8")
    (o / "phrases.json").write_text(json.dumps([sh(p) for p in phr if keep(p)], ensure_ascii=False, indent=1), encoding="utf-8")
    return o


write("opening", x[:cut], 0.0, lambda w: w["s"] < t_cut)
write("body", x[cut:], t_cut, lambda w: w["s"] >= t_cut)
info = {"source": str(D / "voice.wav"), "cut_s": round(t_cut, 4), "cut_sample": cut, "cut_level": float(abs(m[cut])),
        "opening_lines": [p["id"] for p in phr[:k]], "body_lines": [p["id"] for p in phr[k:]],
        "opening_last_word_end_s": a_end, "body_first_word_in_full_s": b_on, "lead_in_body_s": round(b_on - t_cut, 4),
        "silence_between_s": round(b_on - a_end, 4), "opening_duration_s": round(t_cut, 3), "body_duration_s": round((len(x) - cut) / SR, 3)}
(out / "split.json").write_text(json.dumps(info, indent=1), encoding="utf-8")
print(json.dumps(info, indent=1))
