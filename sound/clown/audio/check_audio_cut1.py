# Measures the clown mix (read-only: mix.wav + the four stems + timeline / words; nothing is played):
#   - length, stems, the voice-to-rest margin in the speech band (1-4 kHz) on EVERY word, worst words listed
#   - every SFX cue: its peak in the SFX stem (50 ms RMS) against the voice around it
#   - the two holes (music OUT before "Just 1 in 4"; everything but the bed OUT before "Did you see the money?")
#   - the key lines' level against the median sentence
#   - THE HARD RULE in the audio itself: the SFX stem and the L/R balance around the two duck frames of the count
#   - the unicycle's near / far level, the loop seam, the mix's band tilt
# Usage: PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/clown/audio/check_audio.py [label]
import os
import sys
import json
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, read_wav, integrated  # noqa: E402
import timeline as T  # noqa: E402
import plan as PL  # noqa: E402

FPS = T.FPS
B = T.BEAT


def load(name):
    return read_wav(os.path.join(HERE, name))[0]


MIX, V, M, S, A = (load(n) for n in ("mix.wav", "stem_voice.wav", "stem_music.wav", "stem_sfx.wav", "stem_amb.wav"))
STEM = {"mix": MIX, "voice": V, "music": M, "sfx": S, "amb": A}
mono = lambda x: x.mean(0)
db = lambda p: 10 * np.log10(p + 1e-14)


def rms(x, f0, f1):
    a, b = max(0, int(f0 / FPS * SR)), min(x.shape[-1], int(f1 / FPS * SR))
    seg = x[..., a:b]
    return float(db(np.mean(seg ** 2))) if b > a else float("nan")


def rms_track(x, win=0.05, hop=0.01):
    m = mono(x)
    w, h = int(win * SR), int(hop * SR)
    n = 1 + max(0, (len(m) - w) // h)
    c = np.cumsum(np.concatenate([[0.0], m ** 2]))
    i = np.arange(n) * h
    return db((c[i + w] - c[i]) / w), (i + w / 2) / SR


TRK = {k: rms_track(x) for k, x in STEM.items()}


def peak(stem, f0, f1):
    lv, tc = TRK[stem]
    k = (tc >= f0 / FPS) & (tc <= f1 / FPS)
    return float(lv[k].max()) if k.any() else float("nan")


def band(x, lo, hi):
    return signal.sosfiltfilt(signal.butter(4, [lo, hi], btype="bandpass", fs=SR, output="sos"), mono(x))


lab = sys.argv[1] if len(sys.argv) > 1 else ""
print(f"== check_audio {lab}: {MIX.shape[1]} samples = {MIX.shape[1] / SR:.4f} s = {MIX.shape[1] / SR * FPS:.2f} frames (timeline {T.TOTAL}); "
      f"{MIX.shape[0]} ch, {SR} Hz")
print("stems (integrated LUFS): " + ", ".join(f"{k} {integrated(x):.1f}" for k, x in STEM.items()))
print(f"sum of stems vs mix (limiter only): max |diff| {np.abs(V + M + S + A - MIX).max():.4f}")

# ---------------- speech-band margin on every word
VB, RB = band(V, 1000, 4000), band(M + S + A, 1000, 4000)
MB, SB, AB = band(M, 1000, 4000), band(S, 1000, 4000), band(A, 1000, 4000)
rows = []
for i, w in enumerate(T.WORDS_JSON):
    a, b = int(float(w["s"]) * SR), int(float(w["e"]) * SR)
    if b - a < 0.03 * SR:
        continue
    ev, er = db(np.mean(VB[a:b] ** 2)), db(np.mean(RB[a:b] ** 2))
    rows.append((ev - er, i, w["w"], float(w["s"]) * FPS, ev, db(np.mean(MB[a:b] ** 2)), db(np.mean(SB[a:b] ** 2)), db(np.mean(AB[a:b] ** 2))))
mg = np.array([r[0] for r in rows])
print(f"\nspeech band (1-4 kHz), voice vs music + sfx + bed, per word ({len(rows)} words): median {np.median(mg):.1f} dB, p10 {np.percentile(mg, 10):.1f}, "
      f"p5 {np.percentile(mg, 5):.1f}, min {mg.min():.1f}; words under 12 dB: {(mg < 12).sum()}, under 9 dB: {(mg < 9).sum()}")
print("  the 14 lowest (margin dB | word @frame | voice band dB | music / sfx / bed band dB):")
for r in sorted(rows)[:14]:
    print(f"   {r[0]:5.1f} | {r[2]:<12} @{r[3]:6.0f} | {r[4]:6.1f} | {r[5]:6.1f} / {r[6]:6.1f} / {r[7]:6.1f}")
full = db(np.array([np.mean(mono(V)[int(float(w['s']) * SR): int(float(w['e']) * SR)] ** 2) for w in T.WORDS_JSON]))
rest = db(np.array([np.mean(mono(M + S + A)[int(float(w['s']) * SR): int(float(w['e']) * SR)] ** 2) for w in T.WORDS_JSON]))
print(f"broadband, voice vs the rest per word: median {np.median(full - rest):.1f} dB, p10 {np.percentile(full - rest, 10):.1f}, min {(full - rest).min():.1f}")

# ---------------- sections: music under voice
import music as MU  # noqa: E402
print("\nper section: voice / music integrated LUFS, music under voice (LU), music-only RMS under the words vs the voice's (dB)")
for name, a, z in MU.SECTIONS:
    sl = slice(int(a * SR), int(z * SR))
    lv, lm = integrated(V[:, sl]), integrated(M[:, sl])
    ws = [w for w in T.WORDS_JSON if a <= float(w["s"]) < z]
    if ws:
        dv = np.mean([db(np.mean(mono(V)[int(float(w['s']) * SR): int(float(w['e']) * SR)] ** 2)) - db(np.mean(mono(M)[int(float(w['s']) * SR): int(float(w['e']) * SR)] ** 2)) for w in ws])
    else:
        dv = float("nan")
    print(f"  {name:<8} {a:6.2f}-{z:6.2f} s  voice {lv:6.1f}  music {lm:6.1f}  under {lv - lm:5.1f} LU   on words {dv:5.1f} dB")

# ---------------- every cue of the SFX stem
try:
    used = json.load(open(os.path.join(HERE, "picture_events_used.json"), encoding="utf-8"))
except OSError:
    used = {}
import sfx as SX  # noqa: E402
C = SX.cues()
print(f"\nSFX cues ({len(C)}): peak of the SFX stem (50 ms RMS, dBFS) in the cue's window, the voice's peak around it, the difference")
for c in sorted(C, key=lambda c: c.t):
    f0 = c.frame - 1
    f1 = c.frame + (c.dur_f if c.dur_f else 12)
    p, vp = peak("sfx", f0, f1), peak("voice", f0 - 15, f1 + 15)
    print(f"  f {c.frame:7.1f} {c.pe:<20} {c.name:<12} level {c.level:+5.1f}  sfx {p:6.1f}  voice {vp:6.1f}  rel {p - vp:6.1f}  pan {c.p:+.2f}")

# ---------------- the two holes
h1 = (B["callEnd"] + 2, B["one19"] - 2)
h2 = (B["clown32End"] + 2, B["didYou"] - 1)
print(f"\nhole 1 (music OUT, f {h1[0]}-{h1[1]}, before 'Just 1 in 4'): music {rms(M, *h1):.1f} dBFS, sfx {rms(S, *h1):.1f}, bed {rms(A, *h1):.1f}, voice {rms(V, *h1):.1f}; "
      f"music just before (f {B['callEnd'] - 20}-{B['callEnd']}) {rms(M, B['callEnd'] - 20, B['callEnd']):.1f}; the sting on '1' (f {B['one19']}-{B['one19'] + 15}) {rms(M, B['one19'], B['one19'] + 15):.1f} "
      f"vs the voice there {rms(V, B['one19'], B['one19'] + 15):.1f}")
print(f"hole 2 (all but the bed OUT, f {h2[0]}-{h2[1]}, before 'Did you see the money?'): music {rms(M, *h2):.1f}, sfx {rms(S, *h2):.1f}, bed {rms(A, *h2):.1f}, "
      f"voice {rms(V, *h2):.1f}; music under 'You saw the clown.' {rms(M, B['youSawThe'], B['clown32End']):.1f}, under 'Did you see the money?' "
      f"{rms(M, B['didYou'], B['end']):.1f}, tail to the cut {rms(M, B['end'], T.TOTAL):.1f}")

# ---------------- key lines
P = json.load(open(os.path.join(T.ROOT, "voice", "phrases.json"), encoding="utf-8"))
L = [(p["markup"], integrated(V[:, int(p["s"] * SR): int(p["e"] * SR)])) for p in P]
med = np.median([l for mk, l in L if np.isfinite(l)])
print(f"\nvoice sentences: median {med:.1f} LUFS; key lines: " + "; ".join(f"'{mk}' {l - med:+.1f} LU" for mk, l in L if mk.startswith(("Just", "Did you see the money"))))
print("  all sentences vs the median: " + " ".join(f"{l - med:+.1f}" for mk, l in L))

# ---------------- THE HARD RULE in the audio
s1 = (0, T.SHOTS[1]["b"])
print(f"\nTHE HARD RULE (shot 1 = f {s1[0]}-{s1[1]}, duck frames {PL.DUCK_F}):")
cnt = (PL.COUNT_A, PL.COUNT_B)
lv, tc = TRK["sfx"]
kk = (tc >= cnt[0] / FPS) & (tc <= cnt[1] / FPS)
print(f"  SFX stem over the count (f {cnt[0]}-{cnt[1]}): median {np.median(lv[kk]):.1f} dBFS, p90 {np.percentile(lv[kk], 90):.1f}")
for d in PL.DUCK_F:
    w_ = (d - 12, d + 12)
    k2 = (tc >= w_[0] / FPS) & (tc <= w_[1] / FPS)
    seg = np.diff(lv[k2])
    bal = lambda x: (np.mean(x[1, int(w_[0] / FPS * SR): int(w_[1] / FPS * SR)] ** 2) - np.mean(x[0, int(w_[0] / FPS * SR): int(w_[1] / FPS * SR)] ** 2)) / (
        np.mean(x[1, int(w_[0] / FPS * SR): int(w_[1] / FPS * SR)] ** 2) + np.mean(x[0, int(w_[0] / FPS * SR): int(w_[1] / FPS * SR)] ** 2) + 1e-20)
    print(f"  duck f {d}: SFX stem f {w_[0]}-{w_[1]}: max {lv[k2].max():.1f} dBFS, mean {np.mean(lv[k2]):.1f}, largest 10 ms rise {seg.max():+.1f} dB; "
          f"music {peak('music', *w_):.1f}; balance (R-L)/(R+L): sfx {bal(S):+.2f}, bed {bal(A):+.2f}, music {bal(M):+.2f} (negative = left)")
a_, b_ = int(s1[0] / FPS * SR), int(s1[1] / FPS * SR)
for nm, x in (("sfx", S), ("bed", A), ("music", M)):
    l_, r_ = np.mean(x[0, a_:b_] ** 2), np.mean(x[1, a_:b_] ** 2)
    print(f"  shot 1 {nm}: L {db(l_):.1f} dBFS, R {db(r_):.1f} dBFS, balance {(r_ - l_) / (r_ + l_ + 1e-20):+.2f}")
hf = band(S, 2500, 9000)
lvh = db(np.convolve(hf ** 2, np.ones(int(0.05 * SR)) / int(0.05 * SR), "same"))
for d in PL.DUCK_F:
    a2, b2 = int((d - 12) / FPS * SR), int((d + 12) / FPS * SR)
    print(f"  duck f {d}: SFX stem 2.5-9 kHz (paper / leaf band) max {lvh[a2:b2].max():.1f} dBFS (shot 7's ducks: {lvh[int(B['nearly'] / FPS * SR): int(B['duckedEnd'] / FPS * SR)].max():.1f})")

# ---------------- the unicycle + the seam + tilt
print(f"\nbed stem: f 0-60 {rms(A, 0, 60):.1f} dBFS (unicycle near), f 200-500 {rms(A, 200, 500):.1f} (far lap), shot 7 {rms(A, T.SHOTS[7]['a'], T.SHOTS[7]['b']):.1f}, "
      f"shot 8 {rms(A, T.SHOTS[8]['a'], T.SHOTS[8]['b']):.1f}, f {T.TOTAL - 60}-{T.TOTAL} {rms(A, T.TOTAL - 60, T.TOTAL):.1f}")
n50 = int(0.05 * SR)
for nm, x in STEM.items():
    print(f"  seam {nm:<5}: last 50 ms {db(np.mean(x[:, -n50:] ** 2)):6.1f} dBFS, first 50 ms {db(np.mean(x[:, :n50] ** 2)):6.1f}, last sample {np.abs(x[:, -1]).max():.5f}, "
          f"first {np.abs(x[:, 0]).max():.5f}, jump {np.abs(x[:, 0] - x[:, -1]).max():.5f}")
print(f"  the honk: SFX stem peaks {peak('sfx', 0, 9):.1f} dBFS in f 0-9 (first sample over -50 dBFS at "
      f"{np.argmax(np.abs(mono(S)) > 10 ** (-50 / 20)) / SR * 1000:.1f} ms); voice starts at {float(T.WORDS_JSON[0]['s']) * 1000:.0f} ms")


def tilt(x):
    f, Pw = signal.welch(mono(x), SR, nperseg=8192)
    b = lambda lo, hi: db(Pw[(f >= lo) & (f < hi)].mean())
    ref = b(120, 500)
    return {k: round(b(lo, hi) - ref, 1) for k, (lo, hi) in {"20-120": (20, 120), "500-3k": (500, 3000), "3-8k": (3000, 8000), "8-11k": (8000, 11000)}.items()}


print("\nband tilt re 120-500 Hz: mix", tilt(MIX), " voice", tilt(V), " music", tilt(M), " sfx", tilt(S), " bed", tilt(A))
