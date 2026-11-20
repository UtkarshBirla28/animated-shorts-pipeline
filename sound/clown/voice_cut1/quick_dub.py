"""QUICK PREVIEW ONLY: lay the ElevenLabs Liam beat takes over the CURRENT picture timeline (no re-timing).
Each phrase of the new read is cut out of its beat take (Whisper + voice_build.align), its inner pauses > 0.12 s
shortened to 0.09 s, then placed at the OLD phrase's start (phrases.json, Kokoro timeline); if it is longer than the
old slot it is sped up with ffmpeg atempo (pitch kept, capped at 1.35x). Output: studio/out/antitheft/voicetest/
voice_liam_on_old_timeline.wav + mix_liam.wav (new voice + the current music/SFX/ambience stems, -14 LUFS).
Never touches voice.wav / words.json / the mix."""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import voice_build as vb  # noqa: E402
from eleven_build import BEATS, markup, load  # noqa: E402

SR = 48000
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(ROOT, "studio", "out", os.path.basename(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "voicetest")
AUD = os.path.join(HERE, "..", "audio")
os.makedirs(OUT, exist_ok=True)


def atempo(x, r):
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, "a.wav"), os.path.join(td, "b.wav")
        wavfile.write(a, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", f"atempo={r:.4f}", b], check=True)
        return load(b, SR)


def fade(x, n=int(0.01 * SR)):
    x = x.copy()
    n = min(n, len(x) // 2)
    r = np.linspace(0, 1, n)
    x[:n] *= r
    x[-n:] *= r[::-1]
    return x


old = {p["i"]: p for p in json.load(open(os.path.join(HERE, "phrases.json"), encoding="utf-8"))}
order = sorted(old)
total = 1858 / 30
track = np.zeros(int(total * SR) + SR)
report = []
prev_end = 0.0
R_MIN = float(next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--rmin=')), '1.10'))
R_MAX = 1.30
for bn, idxs in BEATS:
    x = load(os.path.join(HERE, "takes", "eleven", f"b{bn:02d}.mp3"), SR)
    ww = vb.whisper(resample_poly(x, 1, 2).astype(np.float32))
    toks, owner = [], []
    for i in idxs:
        t, _ = vb.parse(markup(i))
        toks += t
        owner += [i] * len(t)
    al, _ = vb.align(toks, " ".join(" ".join(s) for _, s in toks), ww, len(x) / SR)
    for i in idxs:
        ks = [k for k in range(len(al)) if owner[k] == i]
        # phrase audio: words with inner gaps > 0.12 s cut to 0.09 s
        segs = []
        for q, k in enumerate(ks):
            s = al[k][1] - (0.04 if q == 0 else 0.0)
            e = al[ks[q + 1]][1] if q + 1 < len(ks) else al[k][2] + 0.06
            gap_start = al[k][2]
            if q + 1 < len(ks) and e - gap_start > 0.12:
                segs.append(x[int(max(0, s) * SR):int((gap_start + 0.045) * SR)])
                segs.append(x[int((e - 0.045) * SR):int(e * SR)] * 0)  # placeholder (silence) keeps the cut clean
            else:
                segs.append(x[int(max(0, s) * SR):int(e * SR)])
        y = fade(np.concatenate([fade(s) if len(s) > 2 * int(0.01 * SR) else s for s in segs]))
        j = order.index(i)
        t0 = old[i]["s"]
        slot = (old[order[j + 1]]["s"] if j + 1 < len(order) else total - 0.25) - t0 - 0.06
        d = len(y) / SR
        r = min(R_MAX, max(R_MIN, d / max(0.3, slot)))
        y = atempo(y, r)
        t0 = max(t0, prev_end + 0.06)           # never overlap the previous line (drift recovers in slack slots)
        prev_end = t0 + len(y) / SR
        a = int(t0 * SR)
        track[a:a + len(y)] += y[:len(track) - a]
        report.append((i, round(d, 2), round(slot, 2), round(r, 2), round(t0 - old[i]["s"], 2), round(prev_end, 2)))
track = track[:int(total * SR)]
for i, d, sl, r, late, end in report:
    print(f"  P{i:2d} new {d:5.2f}s slot {sl:5.2f}s  tempo x{r:.2f}  starts {late:+.2f}s vs old  ends {end:6.2f}")
# level-match the old voice stem, then mix with the current music / sfx / ambience stems
sr0, ov = wavfile.read(os.path.join(AUD, "stem_voice.wav"))
ov = ov.astype(np.float64) / (2 ** 31 if ov.dtype == np.int32 else 32768)
ov = ov.mean(axis=1) if ov.ndim > 1 else ov
g = np.sqrt(np.mean(ov[np.abs(ov) > 0.01] ** 2)) / max(1e-9, np.sqrt(np.mean(track[np.abs(track) > 0.01] ** 2)))
track *= g
vpath = os.path.join(OUT, "voice_liam_on_old_timeline.wav")
wavfile.write(vpath, SR, (np.clip(track, -1, 1) * 32767).astype(np.int16))
mix = os.path.join(OUT, "mix_liam.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vpath, "-i", os.path.join(AUD, "stem_music.wav"), "-i", os.path.join(AUD, "stem_sfx.wav"),
                "-i", os.path.join(AUD, "stem_amb.wav"), "-filter_complex",
                "[0:a]aformat=channel_layouts=stereo[v];[v][1:a][2:a][3:a]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-2:LRA=7[o]",
                "-map", "[o]", "-ar", "48000", mix], check=True)
print("wrote", vpath, "and", mix)
