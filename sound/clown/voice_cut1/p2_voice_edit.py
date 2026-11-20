"""P2 voice touch-ups (coordinator decisions 2026-11-15), on the INSTALLED voice (sound/typo/voice):
  a. CUT phrase 5 "Each one costs around 600,000 yen." from the assembly: the cut sits inside the two true silences round
     it, so "shares." | "At" keeps ~0.30 s of true silence; every later word / phrase moves earlier (no stretch).
  b. The boss's "Cancel it!" (phrase 12) becomes its OWN voice: the chosen boss take (Mister Gruff, eleven_v4, shouted)
     replaces James's shout sound-for-sound: the silences before and after it stay exactly as they were; the take's speech
     span (onset .. offset, -40 dBFS 10 ms frames, 8 ms fades) goes in, level-matched to James's shout RMS; every later
     word / phrase shifts by the length difference.
Backs up the P1 install to voice/_p1_installed/ (once) and always works FROM that backup, so it is re-runnable.
Usage: python -s p2_voice_edit.py <boss mp3>"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
D = Path(__file__).resolve().parent
BAK = D / "_p1_installed"
FILES = ("voice.wav", "words.json", "phrases.json", "voice_info.json", "words_whisper.json")
if not BAK.exists():
    BAK.mkdir()
    for f in FILES:
        shutil.copy(D / f, BAK / f)
SR = 48000


def read(p, ch=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ar", str(SR), "-ac", str(ch), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()


def db10(x):
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = SR // 100
    n = len(m) // hop
    return 20 * np.log10(np.sqrt(np.mean(m[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)


x = read(BAK / "voice.wav")
words = json.loads((BAK / "words.json").read_text(encoding="utf-8"))
ww = json.loads((BAK / "words_whisper.json").read_text(encoding="utf-8"))
phr = json.loads((BAK / "phrases.json").read_text(encoding="utf-8"))
info = json.loads((BAK / "voice_info.json").read_text(encoding="utf-8"))
P = {p["i"]: p for p in phr}
dB = db10(x)
sil = dB < -45


def silent_run(t0, t1):
    """the longest run of silent 10 ms frames in [t0, t1] -> (start s, end s)"""
    a, b = int(t0 * 100), int(t1 * 100)
    best, run, end = 0, 0, a
    for j in range(a, b):
        run = run + 1 if sil[j] else 0
        if run > best:
            best, end = run, j
    return (end - best + 1) / 100, (end + 1) / 100


# ---- a. the cut: true silence after "shares." (P4 end) .. true silence before "At" (P6 start) ----
s4e, s5s, s5e, s6s = P[4]["e"], P[5]["s"], P[5]["e"], P[6]["s"]
gA = silent_run(s4e - 0.05, s5s + 0.05)       # the pause shares. | Each
gB = silent_run(s5e - 0.05, s6s + 0.05)       # the pause yen. | At
KEEP = 0.15
cut0, cut1 = gA[0] + KEEP, gB[1] - KEEP
assert cut0 <= gA[1] and cut1 >= gB[0], (gA, gB)
print(f"cut: silences {gA[0]:.2f}-{gA[1]:.2f} and {gB[0]:.2f}-{gB[1]:.2f}; removing {cut0:.2f}-{cut1:.2f} ({cut1 - cut0:.2f} s)")
CUTLEN = cut1 - cut0
c0, c1 = int(round(cut0 * SR)), int(round(cut1 * SR))
x = np.concatenate([x[:c0], x[c1:]])
sh_a = lambda t: t if t < cut0 else t - CUTLEN
words = [w for w in words if not (s5s - 0.02 <= w["s"] <= s5e + 0.02)]
ww = [w for w in ww if not (s5s - 0.02 <= w["s"] <= s5e + 0.02)]
phr = [p for p in phr if p["i"] != 5]
for L in (words, ww, phr):
    for w in L:
        w["s"], w["e"] = round(sh_a(w["s"]), 3), round(sh_a(w["e"]), 3)
P = {p["i"]: p for p in phr}
dB = db10(x)
sil = dB < -45
gap_after = silent_run(P[4]["e"] - 0.05, P[6]["s"] + 0.05)
print(f"shares. | At true silence now {gap_after[1] - gap_after[0]:.2f} s")

# ---- b. the boss splice ----
p12 = P[12]
# James's shout sound span: from the end of the silence before it to the start of the silence after it
pre = silent_run(P[11]["e"] - 0.05, p12["s"] + 0.1)
post = silent_run(p12["e"] - 0.1, P[13]["s"] + 0.05)
j0, j1 = pre[1], post[0]
print(f"James shout sound {j0:.2f}-{j1:.2f} ({j1 - j0:.2f} s); silence before {pre[1] - pre[0]:.2f} s, after {post[1] - post[0]:.2f} s")
jam = x[int(j0 * SR):int(j1 * SR)]
boss = read(Path(sys.argv[1]))
bdb = db10(boss)
on = np.where(bdb > -40)[0]
b0, b1 = on[0] / 100, (on[-1] + 1) / 100
# a short tail past the -40 dB offset so the shout's decay is not cut (it must stay above the -45 silence floor only
# where it really sounds; the rest of the gap is the original true silence)
tail = 0
while int(b1 * 100) + tail < len(bdb) and bdb[int(b1 * 100) + tail] > -48 and tail < 6:
    tail += 1
b1 += tail / 100
seg = boss[int(b0 * SR):int(b1 * SR)].copy()
rms = lambda a: np.sqrt(np.mean(a ** 2)) + 1e-12
seg *= rms(jam) / rms(seg)
fl = int(0.008 * SR)
ramp = np.linspace(0, 1, fl, dtype=np.float32)[:, None]
seg[:fl] *= ramp
seg[-fl:] *= ramp[::-1]
pk = np.max(np.abs(seg))
if pk > 0.89:
    seg *= 0.89 / pk
print(f"boss take span {b0:.2f}-{b1:.2f} ({b1 - b0:.2f} s), gain {20 * np.log10(rms(jam) / rms(boss[int(b0 * SR):int(b1 * SR)])):+.1f} dB, peak {20 * np.log10(np.max(np.abs(seg))):.1f} dBFS")
DL = (b1 - b0) - (j1 - j0)
x = np.concatenate([x[:int(j0 * SR)], seg, x[int(j1 * SR):]])
# the boss's own character alignment (ElevenLabs) for Cancel / it!
al = json.loads(Path(sys.argv[1]).with_suffix(".json").read_text(encoding="utf-8"))["alignment"]
ch, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
txt = "".join(ch)
iC, iI = txt.index("Cancel"), txt.index("it!")
cW = (max(b0, cs[iC]) - b0 + j0, ce[iC + 5] - b0 + j0)
iW = (cs[iI] - b0 + j0, b1 - b0 + j0)
sh_b = lambda t: t if t < j0 else t + DL
for L in (words, ww):
    for w in L:
        if j0 - 0.05 <= w["s"] <= j1 + 0.02:
            k = w["w"].strip('"').lower()
            w["s"], w["e"] = (round(cW[0], 3), round(cW[1], 3)) if k.startswith("cancel") else (round(iW[0], 3), round(iW[1], 3))
        else:
            w["s"], w["e"] = round(sh_b(w["s"]), 3), round(sh_b(w["e"]), 3)
for p in phr:
    if p["i"] == 12:
        p["s"], p["e"] = round(cW[0], 3), round(iW[1], 3)
    else:
        p["s"], p["e"] = round(sh_b(p["s"]), 3), round(sh_b(p["e"]), 3)
P = {p["i"]: p for p in phr}
dB = db10(x)
sil = dB < -45
a = silent_run(P[11]["e"] - 0.05, P[12]["s"] + 0.1)
b = silent_run(P[12]["e"] - 0.1, P[13]["s"] + 0.05)
print(f"after splice: exist? | Cancel {a[1] - a[0]:.2f} s, it! | They {b[1] - b[0]:.2f} s (shift {DL:+.3f} s)")

subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(D / "voice.wav")], input=x.tobytes(), check=True)
(D / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
(D / "words_whisper.json").write_text(json.dumps(ww, ensure_ascii=False, indent=1), encoding="utf-8")
(D / "phrases.json").write_text(json.dumps(phr, ensure_ascii=False, indent=1), encoding="utf-8")
info["p2_edits"] = {"cut_phrase5": {"at_s": round(cut0, 3), "removed_s": round(CUTLEN, 3)},
                    "boss": {"voice": "Mister Gruff (mSOmKHC6GZcZbSTGlqHO) eleven_v4", "take": Path(sys.argv[1]).name, "at_s": round(j0, 3), "shift_s": round(DL, 3)}}
info["duration_s"] = round(len(x) / SR, 3)
info.setdefault("stats", {})["duration_s"] = info["duration_s"]
info["stats"]["last_word_end_s"] = words[-1]["e"]
info["stats"]["n_display_tokens"] = len(words)
(D / "voice_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"duration {len(x) / SR:.2f} s, last word end {words[-1]['e']:.2f} s, {len(words)} words, {len(phr)} phrases")
