"""Assemble an ElevenLabs narration from 12 per-beat takes (takes/<dir>/bNN.mp3) into the film's voice files.

For each beat: decode -> Whisper words -> DP-align onto the DISPLAY tokens of that beat's phrases (voice_build.align).
Then every gap between two consecutive words is examined: inside the window [end_k - 0.12, start_k+1 + 0.04] the
longest stretch whose 10 ms level is below THR x the beat's p98 (breaths count as silence: the reference narrators
have none) is shrunk to the target pause (inside a phrase <= MAX_IN s; between phrases the script's gap x GAP_SCALE,
GAP_OVERRIDE on the "..." beats), keeping 20 ms of each edge, with 12 ms crossfades. Leading/trailing silence of each
beat is removed. Optional uniform tempo (ffmpeg atempo, pitch kept) -> voice.wav (48 kHz 24-bit) + words.json +
phrases.json + voice_info.json. The previous voice files are backed up once to voice/_kokoro_v3/.
Usage: python -s eleven_build.py --takes=james_v4 [--tag=...] [--thr=0.10] [--tempo=1.0] [--final]
"""
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import voice_build as vb  # noqa: E402


def arg(name, default):
    return next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{name}=")), default)


SR = 48000
TAKES = os.path.join(HERE, "takes", arg("takes", "eleven"))
TAG = arg("tag", "eleven:" + arg("takes", "eleven"))
THR = float(arg("thr", "0.10"))
MAX_IN = float(arg("maxin", "0.08"))   # longest pause kept inside a phrase (s)
XF = 0.012
EDGE = 0.02
START = 0.03
# deliberate beats INSIDE a phrase (phrase index, key of the word before the beat) -> pause (s) (A5 VOICE P2)
INNER = {(0, "anything"): 0.30, (7, "said"): 0.35, (20, "see"): 0.30, (25, "hears"): 0.30, (31, "stolen"): 0.30, (2, "to"): 0.26, (21, "copy"): 0.15}  # A6 VOICE: beats before the punch words
# beat file -> phrase indices (cut list items 1 and 2 applied: P4 and P19 out; P24 uses SHORT_ANALOGY)
BEATS = [(1, [0, 1, 2]), (2, [3, 5, 6]), (3, [7, 8]), (4, [9, 10]), (5, [11]), (6, [12, 13]), (7, [14, 15]),
         (8, [16, 17, 18]), (9, [20, 21, 22, 23]), (10, [24, 25]), (11, [26, 27]), (12, [28, 29, 30, 31])]


def markup(i):
    return vb.SHORT_ANALOGY if i == 24 else vb.P[i][0]


def load(path, sr):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def env10(x):
    hop = int(0.01 * SR)
    n = len(x) // hop
    return np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)


def quiet_stretch(q, a, b):
    """longest run of True in q[a:b] -> (i0, i1) in 10 ms frames, or None"""
    best, i = None, a
    while i < b:
        if q[i]:
            j = i
            while j < b and q[j]:
                j += 1
            if best is None or j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    return best


def beat_take(bn, idxs):
    x = load(os.path.join(TAKES, f"b{bn:02d}.mp3"), SR)
    ww = vb.whisper(resample_poly(x, 1, 2).astype(np.float32))
    toks, owner = [], []
    for i in idxs:
        t, _ = vb.parse(markup(i))
        toks += t
        owner += [i] * len(t)
    al, miss = vb.align(toks, "", ww, len(x) / SR)
    heard = " ".join(w["w"] for w in ww)
    e = env10(x)
    q = e < THR * np.percentile(e, 98)
    nfr = len(e)
    cuts = []
    # leading / trailing silence
    lead = quiet_stretch(q, 0, min(nfr, int((al[0][1] + 0.05) / 0.01)))
    if lead and lead[0] == 0:
        cuts.append((0.0, max(0.0, lead[1] * 0.01 - EDGE)))
    tail = quiet_stretch(q, max(0, int((al[-1][2] - 0.15) / 0.01)), nfr)
    if tail and tail[1] >= nfr - 1:
        cuts.append((tail[0] * 0.01 + 0.05, nfr * 0.01))
    BREATH = "--breath" in sys.argv
    gates = []  # original-time pause regions to silence (breaths / murmurs between words)

    def wpk(k):
        i0, i1 = int(al[k][1] / 0.01), max(int(al[k][1] / 0.01) + 1, int(al[k][2] / 0.01))
        return float(e[min(i0, nfr - 1):min(i1, nfr)].max()) if i0 < nfr else 1e-9

    # A5 VOICE P1: weak onset / coda consonants (f s t p h I) must never be gated: edges walk out to 3 % (-30 dB) of
    # the word's peak, look back up to 0.35 s / forward up to 0.30 s, and frames that are audible (> -45 dBFS) or
    # carry fricative energy (> 3 kHz above -50 dBFS) always count as speech.
    hop_ = int(0.01 * SR)
    nf_ = len(x) // hop_
    from scipy.signal import butter, sosfilt
    hi_ = sosfilt(butter(4, 3000, "highpass", fs=SR, output="sos"), x)
    env_hi = np.sqrt(np.mean(hi_[:nf_ * hop_].reshape(nf_, hop_) ** 2, axis=1) + 1e-12)
    audible = env_hi > 10 ** (-40 / 20)   # strong fricative energy (s / sh / f / t burst) above 3 kHz; breaths stay below

    def speech(j, k, near):
        """near (<= 0.18 s from the Whisper edge): weak consonants count (> 3 % of peak, or audible / fricative energy);
        farther out only real speech counts (> 12 % of the word's peak), so breaths and murmurs stay gateable"""
        if near:   # weak consonants sit ~10-25 dB under the word's peak, breaths ~30-40 dB under it
            return e[j] > 0.06 * wpk(k) or audible[min(j, nf_ - 1)]
        return e[j] > 0.12 * wpk(k)

    CLOSURE = 10   # frames (0.10 s): a silent stop closure inside a word ('four|t|een', 'psy|ch|ologist', 'tes|t|ed')

    def ref_on(k):    # back from the Whisper start while it is still speech (<= 0.35 s, never before the previous word);
        # a short silent gap is crossed when speech resumes behind it (stop closures), a real pause is not
        lo = int(max(al[k - 1][2] if k else 0.0, al[k][1] - 0.35) / 0.01)
        j0 = j = min(nfr - 1, int(al[k][1] / 0.01))
        while j - 1 >= lo:
            if speech(j - 1, k, j0 - (j - 1) <= 18):
                j -= 1
                continue
            back = next((q for q in range(j - 2, max(lo - 1, j - 2 - CLOSURE), -1) if speech(q, k, j0 - q <= 18)), None)
            if back is None:
                break
            j = back
        return j * 0.01

    def ref_end(k):   # forward from the Whisper end while it is still speech (<= 0.30 s, never past the next word)
        hi = min(nfr, int(min(al[k + 1][1] if k + 1 < len(al) else len(x) / SR, al[k][2] + 0.30) / 0.01))
        j0 = j = min(nfr - 1, int(al[k][2] / 0.01))
        while j + 1 < hi:
            if speech(j + 1, k, (j + 1) - j0 <= 18):
                j += 1
                continue
            fwd = next((q for q in range(j + 2, min(hi, j + 2 + CLOSURE)) if speech(q, k, q - j0 <= 18)), None)
            if fwd is None:
                break
            j = fwd
        return (j + 1) * 0.01

    if BREATH:
        cuts = []
        on0, endN = ref_on(0), ref_end(len(al) - 1)
        if on0 - 0.04 > 0.01:
            cuts.append((0.0, on0 - 0.04))
        if len(x) / SR - (endN + 0.06) > 0.01:
            cuts.append((endN + 0.06, len(x) / SR)); gates.append((endN + 0.02, endN + 0.06))
    # every word gap
    for k in range(len(al) - 1):
        if BREATH:
            g0, g1 = ref_end(k) + 0.05, ref_on(k + 1) - 0.04
            if owner[k] == owner[k + 1] and (owner[k], vb.key(al[k][0])) in INNER:   # a deliberate beat inside a phrase
                tgt_in = INNER[(owner[k], vb.key(al[k][0]))]
            else:
                tgt_in = None
            if g1 - g0 <= 0.03:
                continue
            if owner[k] != owner[k + 1]:
                tgt = vb.GAP_OVERRIDE.get(owner[k], vb.P[owner[k]][1]) * vb.GAP_SCALE
            else:
                tgt = tgt_in if tgt_in is not None else MAX_IN
            if g1 - g0 > tgt:
                cuts.append((g0 + tgt / 2, g1 - tgt / 2))
            gates.append((g0, g1))
            continue
        a = max(0, int((al[k][2] - 0.12) / 0.01))
        b = min(nfr, int((al[k + 1][1] + 0.04) / 0.01) + 1)
        st = quiet_stretch(q, a, b)
        if not st:
            continue
        s0, s1 = st[0] * 0.01, st[1] * 0.01
        if owner[k] != owner[k + 1]:
            pi = owner[k]
            tgt = vb.GAP_OVERRIDE.get(pi, vb.P[pi][1]) * vb.GAP_SCALE
        else:
            tgt = MAX_IN
        if s1 - s0 > tgt + 2 * EDGE:
            keep_l = max(EDGE, tgt / 2)
            keep_r = max(EDGE, tgt - keep_l)
            cuts.append((s0 + keep_l, s1 - keep_r))
    cuts.sort()
    if os.environ.get("DEBUG_BEAT") == str(bn):
        print("DEBUG beat", bn)
        for k in range(len(al)):
            print(f"  {al[k][0]:14} whisper {al[k][1]:6.2f}-{al[k][2]:6.2f}" + (f"  ref_on {ref_on(k):6.2f} ref_end {ref_end(k):6.2f}" if BREATH else ""))
        print("  cuts", [(round(a_, 2), round(b_, 2)) for a_, b_ in cuts])
        print("  gates", [(round(a_, 2), round(b_, 2)) for a_, b_ in gates])
        print("  raw whisper", [(w["w"], round(w["s"], 2), round(w["e"], 2)) for w in ww])
    merged = []
    for c in cuts:
        if c[1] - c[0] <= 0.005:
            continue
        if merged and c[0] <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], c[1]))
        else:
            merged.append(c)
    # keep segments + time map
    keep, pos = [], 0.0
    for a, b in merged:
        if a > pos:
            keep.append((pos, a))
        pos = max(pos, b)
    if pos < len(x) / SR:
        keep.append((pos, len(x) / SR))
    y, tmap, new = np.zeros(0), [], 0.0
    for j, (a, b) in enumerate(keep):
        seg = x[int(a * SR):int(b * SR)]
        n = min(int(XF * SR), len(y), len(seg)) if j else 0
        if n:
            r = np.linspace(0, 1, n)
            y = np.concatenate([y[:-n], y[-n:] * (1 - r) + seg[:n] * r, seg[n:]])
            new -= n / SR
        else:
            y = np.concatenate([y, seg])
        tmap.append((a, b, new))
        new += len(seg) / SR

    def m(t):
        for a, b, ns in tmap:
            if a <= t <= b:
                return ns + (t - a)
        # inside a cut: snap to the nearest kept edge
        prev = [r for r in tmap if r[1] <= t]
        return (prev[-1][2] + prev[-1][1] - prev[-1][0]) if prev else 0.0

    for g0, g1 in gates:   # silence the (already shortened) pauses: 12 ms fades at both ends
        a_, b_ = int(m(g0) * SR), int(m(g1) * SR)
        n = int(0.012 * SR)
        if b_ - a_ > 2 * n:
            env_ = np.ones(b_ - a_)
            env_[:n] = np.linspace(1, 0, n); env_[n:-n] = 0.0; env_[-n:] = np.linspace(0, 1, n)
            y[a_:b_] *= env_[:max(0, min(len(y), b_) - a_)]
    nI, nO = int(0.005 * SR), int(0.015 * SR)   # raised-cosine edges on every beat (AUDIO A4): 5 ms in, 15 ms out
    if len(y) > nI + nO:
        y[:nI] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, nI))
        y[-nO:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nO))
    words = [{"w": d, "s": m(s), "e": max(m(s) + 0.04, m(e)), "i": owner[k]} for k, (d, s, e) in enumerate(al)]
    return y, words, miss, heard


def main():
    tempo = float(arg("tempo", "1.0"))
    pieces, words, phr, cur, report = [np.zeros(int(START * SR))], [], [], START, []
    for bn, idxs in BEATS:
        y, ww, miss, heard = beat_take(bn, idxs)
        for w in ww:
            words.append({"w": w["w"], "s": round(cur + w["s"], 3), "e": round(cur + w["e"], 3), "i": w["i"]})
        for i in idxs:
            pw = [w for w in words if w["i"] == i]
            phr.append({"i": i, "beat": vb.P[i][2], "s": pw[0]["s"], "e": pw[-1]["e"], "markup": markup(i), "style": vb.P[i][3]})
        last = idxs[-1]
        gap = vb.GAP_OVERRIDE.get(last, vb.P[last][1]) * vb.GAP_SCALE if bn < 12 else 0.0
        pieces += [y, np.zeros(int(gap * SR))]
        report.append((bn, round(len(y) / SR, 2), miss, heard))
        cur += len(y) / SR + gap
    v = np.concatenate(pieces + [np.zeros(int(0.10 * SR))])
    if abs(tempo - 1.0) > 1e-3:
        import tempfile
        from scipy.io import wavfile
        with tempfile.TemporaryDirectory() as td:
            a, b = os.path.join(td, "a.wav"), os.path.join(td, "b.wav")
            wavfile.write(a, SR, (np.clip(v, -1, 1) * 32767).astype(np.int16))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", f"atempo={tempo}", b], check=True)
            v = load(b, SR)
        for w in words + phr:
            w["s"], w["e"] = round(START + (w["s"] - START) / tempo, 3), round(START + (w["e"] - START) / tempo, 3)
    n = len(words)
    st = {"duration_s": round(len(v) / SR, 2), "last_word_end_s": float(words[-1]["e"]), "n_words": n,
          "words_per_s": round(n / (words[-1]["e"] - words[0]["s"]), 2), "tempo": tempo, "thr": THR}
    for bn, d, miss, heard in report:
        print(f"  b{bn:02d} {d:5.2f}s  heard: {heard}" + (f"   <-- CHECK {miss}" if miss else ""))
    print("STATS", st)
    out_dir = HERE if "--final" in sys.argv else os.path.join(TAKES, "_assembled")
    os.makedirs(out_dir, exist_ok=True)
    if "--final" in sys.argv:
        bak = os.path.join(HERE, "_kokoro_v3")
        if not os.path.exists(bak):
            os.makedirs(bak)
            for f in ("voice.wav", "words.json", "words_whisper.json", "phrases.json", "voice_info.json"):
                if os.path.exists(os.path.join(HERE, f)):
                    shutil.copy(os.path.join(HERE, f), bak)
    sys.path.insert(0, os.path.join(HERE, "..", "audio"))
    from dsp import write_wav
    write_wav(os.path.join(out_dir, "voice.wav"), v, bits=24)
    wj = [{"w": w["w"], "s": w["s"], "e": w["e"]} for w in words]
    json.dump(wj, open(os.path.join(out_dir, "words.json"), "w", encoding="utf-8"), indent=0)
    json.dump(wj, open(os.path.join(out_dir, "words_whisper.json"), "w", encoding="utf-8"), indent=0)
    json.dump(phr, open(os.path.join(out_dir, "phrases.json"), "w", encoding="utf-8"), indent=1)
    json.dump({"take": f"{TAG}:tempo{tempo}", "stats": st}, open(os.path.join(out_dir, "voice_info.json"), "w", encoding="utf-8"), indent=1)
    print("wrote", out_dir)


if __name__ == "__main__":
    main()
