# A STAND-IN voice track for level checks before the v3 voice lands (never for the film): the v3 lines at their PLANNED
# times (script_v3/voice_lines_v3.json), each filled with a piece of the v1 track (voice/_full/voice.wav) spoken by the same
# speaker, so the ducks, the margins and the loudness can be measured against real James / driver / tourist / kid audio.
# The WORDS are not the v3 words (except the reused lines); only levels and timing are meaningful.
# Writes _standin_voice/voice.wav + words.json + phrases.json. Use it with PT_VOICE=<that folder>.
import json
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.pop("PT_VOICE", None)
import tl                                                    # plan mode (the real v3 voice must not be there yet)
from dsp import SR, ns, read_wav, write_wav, fades

OUT = os.path.join(HERE, "_standin_voice")
V1 = os.path.join(tl.ROOT, "voice", "_full")


def main():
    assert tl.SOURCE == "plan", "the v3 voice is already installed: no stand-in needed"
    x, sr = read_wav(os.path.join(V1, "voice.wav"))
    assert sr == SR
    v1 = x.mean(0)
    phr = json.load(open(os.path.join(V1, "phrases.json"), encoding="utf-8"))
    by = {}
    for p in phr:
        by.setdefault(p["speaker"], []).append((float(p["s"]), float(p["e"])))
    n = ns(tl.L)
    out = np.zeros(n)
    used = {k: 0 for k in by}
    rows = []
    for l in tl.SPOKEN:
        if l["id"] == "v3_r01":
            continue
        a, b = tl.SPAN[l["id"]]
        need = ns(b - a)
        spk = l["speaker"]
        pool = by.get(spk) or by["N"]
        buf = np.zeros(0)
        while len(buf) < need:                                # glue same-speaker phrases until the line is full
            s, e = pool[used[spk] % len(pool)]
            used[spk] += 1
            buf = np.concatenate([buf, fades(v1[ns(s):ns(e)], 0.005, 0.01)])
        seg = fades(buf[:need], 0.005, 0.03)
        # respect the planned inner pauses: silence between the planned words
        ws = tl.WORDS[l["id"]]
        mask = np.zeros(need)
        for w, s, e in ws:
            mask[max(0, ns(s - a)):min(need, ns(e - a))] = 1.0
        k = ns(0.02)
        mask = np.convolve(mask, np.ones(k) / k, "same")
        i = ns(a)
        m = min(n - i, need)
        out[i:i + m] += (seg * mask)[:m]
        rows.append(dict(id=l["id"], speaker=spk, s=a, e=b, markup=l["text"]))
    os.makedirs(OUT, exist_ok=True)
    write_wav(os.path.join(OUT, "voice.wav"), np.stack([out, out]))
    words = [dict(w=w, s=s, e=e) for lid, w, s, e in tl.all_words() if lid != "v3_r01"]
    json.dump(words, open(os.path.join(OUT, "words.json"), "w", encoding="utf-8"), indent=0)
    json.dump(rows, open(os.path.join(OUT, "phrases.json"), "w", encoding="utf-8"), indent=0)
    print(f"stand-in voice: {n / SR:.3f} s, {len(rows)} lines, {len(words)} words -> {OUT}")


if __name__ == "__main__":
    main()
