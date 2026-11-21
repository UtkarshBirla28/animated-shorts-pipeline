"""RETAKE pass (2026-11-15): splice the winning retakes into the INSTALLED voice and tighten the loose sentence gaps.

  python -s retake_splice.py hook=t2 question=t4 ...        (lines not named keep the installed read)

Always works FROM voice/_prev_retake/ (made once from the installed files), so it is re-runnable.
 a. per replaced line: the old sound span (end of the true silence before it .. start of the true silence after it,
    -45 dBFS 10 ms frames) is replaced by the take's speech span (-40 dBFS onset .. offset + decay tail). Both cuts sit
    20 ms inside the silences, with 10 ms crossfades there; the silences before / after keep their exact length.
    Loudness: the take is gained so its BS.1770 loudness = the mean of the neighbouring phrases (within 0.5 LU).
    A sentence gap inside a take > MAXGAP of true silence is cut to TARGET first (never the '...' beat).
    Word times: Whisper + voice_build.align on the take, first / last word pinned to the take's onset / offset, word
    edges next to a true-silence pause (>= 0.12 s) snapped to the pause; every later word shifts by the length change.
 b. tighten: every phrase boundary with > MAXGAP s of true silence that is not deliberate (the cancel-beat silences
    round both 'Nothing.' lines, the 0.5 s after the mystery question) is cut to TARGET s (cut in the middle of the
    silence, 10 ms crossfade, never a stretch).
Writes voice.wav / words.json / words_whisper.json / phrases.json / voice_info.json."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import voice_build as vb  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
ROOT = HERE.parent.parent.parent
BAK = HERE / "_prev_retake"
FILES = ("voice.wav", "words.json", "phrases.json", "voice_info.json", "words_whisper.json")
EXTRA = [ROOT / "studio/src/videos/typo/words.ts", ROOT / "studio/src/videos/typo/voicewarp.ts",
         ROOT / "sound/typo/audio/timeline.json", ROOT / "sound/typo/audio/warp.json"]
if not BAK.exists():
    BAK.mkdir()
    for f in FILES:
        shutil.copy2(HERE / f, BAK / f)
    for f in EXTRA:
        if f.exists():
            shutil.copy2(f, BAK / f.name)
SR = 48000
# line -> (takes folder, phrases spoken in the take, phrases USED from it: all, or a prefix)
LINES = {"hook": ("hook", [0, 1], [0, 1]), "hook1": ("hook", [0, 1], [0]), "question": ("question", [11], [11]),
         "easy": ("easy", [9], [9]), "cancelbtn": ("cancelbtn", [22, 23], [22, 23]), "last": ("last", [28, 29], [28, 29])}
ELLIPSIS_AFTER = {"shares..."}        # inside the hook take: the deliberate beat, never tightened
DELIBERATE = {11, 13, 14, 15, 16}      # phrase i: the gap AFTER it is deliberate (question 0.5 s; the cancel beat)
MAXGAP, TARGET = 0.38, 0.28
PICK = dict(a.split("=") for a in sys.argv[1:] if "=" in a)
NOTIGHT = "--no-tighten" in sys.argv
# --beat=0.45: the true silence of the hook beat "shares... | that" is LENGTHENED to this (digital silence inserted in
# the middle of the pause, LESSONS 37; P1 already did this for the three ellipses). 0 = leave it.
BEAT = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--beat=")), 0))


def read(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def db10(x):
    m = x.mean(axis=1)
    hop = SR // 100
    n = len(m) // hop
    return 20 * np.log10(np.sqrt(np.mean(m[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)


def silent_run(d, t0, t1, thr=-45):
    """the longest run of silent 10 ms frames in [t0, t1] -> (start s, end s)"""
    a, b = max(0, int(round(t0 * 100))), min(len(d), int(round(t1 * 100)))
    best, run, end = 0, 0, a
    for j in range(a, b):
        run = run + 1 if d[j] < thr else 0
        if run > best:
            best, end = run, j
    return (end - best + 1) / 100, (end + 1) / 100


def lufs(x):
    """BS.1770-4 integrated loudness of a stereo 48 kHz block (K-weighting, 400 ms / 75 % blocks, -70 abs / -10 rel gates)"""
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], y, axis=0)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(y) < blk:
        z = np.array([np.sum(np.mean(y ** 2, axis=0))])
    else:
        z = np.array([np.sum(np.mean(y[i:i + blk] ** 2, axis=0)) for i in range(0, len(y) - blk + 1, hop)])
    L = -0.691 + 10 * np.log10(z + 1e-12)
    z = z[L > -70]
    if not len(z):
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(z)) - 10
    z2 = z[(-0.691 + 10 * np.log10(z + 1e-12)) > rel]
    return float(-0.691 + 10 * np.log10(np.mean(z2 if len(z2) else z)))


def xcut(x, c0, c1):
    """remove samples [c0, c1) with a 10 ms crossfade (both sides are silence)"""
    fl = int(0.010 * SR)
    r = np.linspace(0, 1, fl)[:, None]
    head, tail = x[:c0].copy(), x[c1:].copy()
    head[-fl:] = head[-fl:] * (1 - r) + x[c1 - fl:c1] * r
    return np.concatenate([head, tail])


x = read(BAK / "voice.wav")
words = json.loads((BAK / "words.json").read_text(encoding="utf-8"))
ww0 = json.loads((BAK / "words_whisper.json").read_text(encoding="utf-8"))
phr = json.loads((BAK / "phrases.json").read_text(encoding="utf-8"))
info = json.loads((BAK / "voice_info.json").read_text(encoding="utf-8"))
assert len(words) == len(ww0) and all(a["w"] == b["w"] for a, b in zip(words, ww0))
OLD_DUR = len(x) / SR
order = [p["i"] for p in phr]
report = {"replaced": {}, "tightened": []}


def shift_all(t_from, dl):
    for L in (words, ww0, phr):
        for w in L:
            if w["s"] >= t_from - 1e-6:
                w["s"], w["e"] = round(w["s"] + dl, 3), round(w["e"] + dl, 3)


def word_idx(i0, i1):
    P = {p["i"]: p for p in phr}
    a, b = P[i0]["s"] - 0.02, P[i1]["e"] + 0.02
    return [k for k, w in enumerate(words) if a <= w["s"] <= b]


for line, (tdir, take_idxs, idxs) in LINES.items():
    if line not in PICK:
        continue
    P = {p["i"]: p for p in phr}
    d = db10(x)
    k0, k1 = order.index(idxs[0]), order.index(idxs[-1])
    prev_p = phr[k0 - 1] if k0 > 0 else None
    next_p = phr[k1 + 1] if k1 + 1 < len(phr) else None
    pre = silent_run(d, (prev_p["e"] - 0.05) if prev_p else 0.0, P[idxs[0]]["s"] + 0.1)
    post = silent_run(d, P[idxs[-1]]["e"] - 0.1, (next_p["s"] + 0.05) if next_p else len(x) / SR)
    j0, j1 = pre[1], post[0]
    # neighbours' loudness (speech only)
    # (the boss's shout is another voice at its own level: the next NARRATOR phrase stands in for it)
    nbp = [next((q for q in reversed(phr[:k0]) if q["style"] != "shout"), None), next((q for q in phr[k1 + 1:] if q["style"] != "shout"), None)]
    nb = [lufs(x[int(q["s"] * SR):int(q["e"] * SR)]) for q in nbp if q]
    old_l = lufs(x[int(j0 * SR):int(j1 * SR)])
    tgt = float(np.mean(nb))
    # ---- the take ----
    mp3 = HERE / "takes" / "james_retake" / tdir / f"{PICK[line]}.mp3"
    t = read(mp3)
    td = db10(t)
    on = np.where(td > -40)[0]
    b0, b1 = on[0] / 100, (on[-1] + 1) / 100
    tail = 0
    while int(round(b1 * 100)) + tail < len(td) and td[int(round(b1 * 100)) + tail] > -48 and tail < 6:
        tail += 1
    b1 += tail / 100
    # words of the take (24 kHz mono for Whisper)
    m24 = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-ar", "24000", "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    m24 = np.frombuffer(m24, np.float32)
    toks = []
    for i in take_idxs:
        toks += vb.parse(vb.P[i][0])[0]
    n_use = sum(len(vb.parse(vb.P[i][0])[0]) for i in idxs)
    hw = vb.whisper(m24)
    al, miss = vb.align(toks, "", hw, len(m24) / 24000)
    assert not miss, (line, miss)
    al = [[dsp, s, e] for dsp, s, e in al]
    if n_use < len(al):   # only a prefix of the take is used: it ends where the pause after its last word starts
        q = silent_run(td, al[n_use - 1][2] - 0.2, al[n_use][1] + 0.15)
        assert q[1] - q[0] >= 0.15, q
        b1, tail = q[0], 0
        while int(round(b1 * 100)) + tail < len(td) and td[int(round(b1 * 100)) + tail] > -48 and tail < 6:
            tail += 1
        b1 += tail / 100
        al = al[:n_use]
    al[0][1], al[-1][2] = b0, b1 - tail / 100
    for k in range(len(al) - 1):   # snap the edges round a real pause
        q = silent_run(td, al[k][2] - 0.15, al[k + 1][1] + 0.15)
        qa, qb = int(round(q[0] * 100)), int(round(q[1] * 100))
        while qa > 0 and td[qa - 1] < -45:      # the whole pause, also outside the search window
            qa -= 1
        while qb < len(td) and td[qb] < -45:
            qb += 1
        q = (qa / 100, qb / 100)
        if q[1] - q[0] >= 0.09 and q[0] + 0.02 - al[k][1] >= 0.08 and al[k + 1][2] - (q[1] - 0.02) >= 0.08:
            al[k][2], al[k + 1][1] = q[0] + 0.02, q[1] - 0.02
    for k in range(1, len(al)):
        al[k][1] = max(al[k][1], al[k - 1][2])
        al[k][2] = max(al[k][2], al[k][1] + 0.04)
    # sentence gaps inside the take
    inner = []
    cum = 0
    for k in range(len(al) - 1):
        if al[k][0][-1] in ".?!" and al[k][0] not in ELLIPSIS_AFTER and not al[k][0].endswith("..."):
            q = silent_run(td, al[k][2] - 0.1, al[k + 1][1] + 0.1)
            g = q[1] - q[0]
            if g > MAXGAP:
                rm = g - TARGET
                mid = (q[0] + q[1]) / 2
                inner.append((mid - rm / 2, mid + rm / 2, al[k][0], al[k + 1][0], g))
    for c0, c1, wa, wb, g in reversed(inner):
        t = xcut(t, int(round(c0 * SR)), int(round(c1 * SR)))
        for w in al:
            if w[1] >= c1 - 1e-6:
                w[1], w[2] = w[1] - (c1 - c0), w[2] - (c1 - c0)
        b1 -= c1 - c0
    PAD = 0.02
    s0 = max(0.0, b0 - PAD)
    seg = t[int(round(s0 * SR)):int(round((b1 + PAD) * SR))].copy()
    sp = seg[int((b0 - s0) * SR):int((b1 - s0) * SR)]
    gain = tgt - lufs(sp)
    seg *= 10 ** (gain / 20)
    pk = float(np.max(np.abs(seg)))
    if pk > 0.89:
        seg *= 0.89 / pk
    new_l = lufs(seg[int((b0 - s0) * SR):int((b1 - s0) * SR)])
    # ---- splice: old [A, B) -> seg, 10 ms crossfades inside the silences ----
    A = max(0, int(round((j0 - (b0 - s0)) * SR)))
    B = min(len(x), int(round((j1 + PAD) * SR)))
    fl = int(0.010 * SR)
    r = np.linspace(0, 1, fl)[:, None]
    if A >= fl:
        seg[:fl] = seg[:fl] * r + x[A:A + fl] * (1 - r)
    else:
        seg[:fl] *= r
    if B + fl <= len(x):
        seg[-fl:] = seg[-fl:] * (1 - r) + x[B - fl:B] * r
    else:
        seg[-fl:] *= 1 - r
    DL = len(seg) / SR - (B - A) / SR
    off = A / SR - s0                      # take time -> voice time
    ks = word_idx(idxs[0], idxs[-1])
    assert [words[k]["w"] for k in ks] == [a[0] for a in al], ([words[k]["w"] for k in ks], [a[0] for a in al])
    old_span = (words[ks[0]]["s"], words[ks[-1]]["e"])
    shift_all(words[ks[-1]]["e"] + 0.01, DL)
    for k, (dsp, s, e) in zip(ks, al):
        for L in (words, ww0):
            L[k]["s"], L[k]["e"] = round(s + off, 3), round(e + off, 3)
    # phrase edges follow their words
    pos = 0
    for i in idxs:
        n = len(vb.parse(vb.P[i][0])[0])
        P[i]["s"], P[i]["e"] = words[ks[pos]]["s"], words[ks[pos + n - 1]]["e"]
        pos += n
    x = np.concatenate([x[:A], seg, x[B:]])
    d = db10(x)
    P = {p["i"]: p for p in phr}
    a2 = silent_run(d, (prev_p["e"] - 0.05) if prev_p else 0.0, P[idxs[0]]["s"] + 0.1)
    b2 = silent_run(d, P[idxs[-1]]["e"] - 0.1, (next_p["s"] + 0.05) if next_p else len(x) / SR)
    report["replaced"][line] = {
        "take": PICK[line], "old_sound_s": round(j1 - j0, 3), "new_sound_s": round(b1 - b0, 3), "shift_s": round(DL, 3),
        "at_s": round(j0, 3), "lufs_old_line": round(old_l, 2), "lufs_neighbours": [round(v, 2) for v in nb],
        "lufs_target": round(tgt, 2), "lufs_new": round(new_l, 2), "gain_db": round(gain, 2), "peak": round(float(np.max(np.abs(seg))), 3),
        "silence_before": [round(pre[1] - pre[0], 2), round(a2[1] - a2[0], 2)], "silence_after": [round(post[1] - post[0], 2), round(b2[1] - b2[0], 2)],
        "inner_tightened": [{"between": f"{wa} | {wb}", "was_s": round(g, 2), "now_s": TARGET} for _, _, wa, wb, g in inner],
        "min_whisper_p": round(min(w["p"] for w in hw), 2), "heard": " ".join(w["w"] for w in hw)}
    print(line, json.dumps(report["replaced"][line], ensure_ascii=False))

# ---- the hook beat: shares... | that ----
if BEAT:
    ks = word_idx(1, 1)
    ka = next(k for k in ks if words[k]["w"] == "shares...")
    d = db10(x)
    s = silent_run(d, words[ka]["e"] - 0.15, words[ka + 1]["s"] + 0.15)
    g = s[1] - s[0]
    if g < BEAT - 0.005:
        add = int(round((BEAT - g) * SR))
        mid = int(round((s[0] + s[1]) / 2 * SR))
        x = np.concatenate([x[:mid], np.zeros((add, 2)), x[mid:]])
        shift_all(words[ka + 1]["s"], add / SR)
        for q in phr:
            if q["i"] == 1:
                q["s"] = words[ks[0]]["s"]      # shift_all moved the phrase start too if it sat after the pause: restore
                q["e"] = words[ks[-1]]["e"]
        report["hook_beat"] = {"between": "shares... | that", "at_s": round(mid / SR, 3), "was_s": round(g, 2), "now_s": round(g + add / SR, 2)}
        print("beat", report["hook_beat"])

# ---- b. tighten the loose sentence gaps ----
if not NOTIGHT:
    for k in range(len(phr) - 1):
        p, q = phr[k], phr[k + 1]
        if p["i"] in DELIBERATE:
            continue
        d = db10(x)
        s = silent_run(d, p["e"] - 0.1, q["s"] + 0.1)
        g = s[1] - s[0]
        if g > MAXGAP + 1e-6:
            rm = g - TARGET
            mid = (s[0] + s[1]) / 2
            c0, c1 = int(round((mid - rm / 2) * SR)), int(round((mid + rm / 2) * SR))
            x = xcut(x, c0, c1)
            shift_all(q["s"], -(c1 - c0) / SR)
            report["tightened"].append({"between": f"{p['markup'][-18:]} | {q['markup'][:14]}", "at_s": round(mid, 3), "was_s": round(g, 2), "now_s": TARGET})
            print("tighten", report["tightened"][-1])

pk = float(np.max(np.abs(x)))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(HERE / "voice.wav")],
               input=x.astype(np.float32).tobytes(), check=True)
for w in words + ww0:
    assert w["e"] > w["s"], w
for a, b in zip(words, words[1:]):
    assert b["s"] >= a["e"] - 1e-6, (a, b)
(HERE / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
(HERE / "words_whisper.json").write_text(json.dumps(ww0, ensure_ascii=False, indent=1), encoding="utf-8")
(HERE / "phrases.json").write_text(json.dumps(phr, ensure_ascii=False, indent=1), encoding="utf-8")
info["retake"] = {"date": "2026-11-15", "voice": "James (QhpsGjDKZmM9qRYdMhBD) eleven_v4", "takes_dir": "takes/james_retake",
                  "backup": "_prev_retake", "duration_before_s": round(OLD_DUR, 3), **report}
info["duration_s"] = round(len(x) / SR, 3)
info.setdefault("stats", {})["duration_s"] = info["duration_s"]
info["stats"]["first_word_s"] = words[0]["s"]
info["stats"]["last_word_end_s"] = words[-1]["e"]
info["stats"]["n_display_tokens"] = len(words)
(HERE / "voice_info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"duration {OLD_DUR:.3f} -> {len(x) / SR:.3f} s, last word end {words[-1]['e']:.3f}, peak {pk:.3f}, {len(words)} words, {len(phr)} phrases")
