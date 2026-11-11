"""Narration for "The Anti-Theft Sign That Made People Steal": Kokoro (local TTS), one phrase at a time, joined with
tight channel-style gaps (0.10-0.28 s; a little longer only on the script's "..." beats), the whispered line pitched
+4 semitones and softened. Word times come from faster-whisper per phrase, mapped onto the DISPLAY tokens (digits,
punctuation) that the captions use.

Phrase markup: display text with {display|spoken} overrides, e.g. "{200|two hundred} million".
Usage (run with the studio venv: PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s ...):
  voice_build.py test <voice> [<voice> ...] [--speed=1.0]    test phrases -> takes/test_<voice>_<speed>.wav + stats
  voice_build.py full <voice> [--speed=1.1] [--final] [--drop=1,2]   full take -> takes/full_<voice>_<speed>.wav + stats;
      --final also writes voice.wav (48 kHz 24-bit) + words.json + phrases.json; --drop = cut-list items (1, 2, 3)
A voice may be a blend: "am_puck:0.6+am_michael:0.4".
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from difflib import SequenceMatcher

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MODEL = os.path.join(STUDIO, "studio", "_downloads", "kokoro")
TAKES = os.path.join(HERE, "takes")
SR = 24000
START = 0.03  # first word at ~frame 1 (reference: first word at 0.00, full level by frame ~2)

# (markup, gap after in s, beat, style)  style "whisper" = +4 st, softer
P = [
    ("She'd never even kept a borrowed paperclip.", 0.14, 1, None),
    ("Then she read one sign...", 0.26, 1, None),
    ("and wanted to steal.", 0.24, 1, None),
    ("Arizona's Petrified Forest.", 0.12, 2, None),
    ("Trees over {200|two hundred} million years old, turned into rainbow-colored stone.", 0.12, 2, None),  # cut 1
    ("Visitors kept pocketing little pieces.", 0.12, 2, None),
    ("So the park put up a warning:", 0.2, 2, None),
    ("\"Your heritage is being vandalized every day...", 0.24, 3, None),
    ("{14|fourteen} tons a year, mostly a small piece at a time.\"", 0.22, 3, None),
    ("She read it, leaned over to her {fiancé,|fee-ahn-say,} and whispered:", 0.16, 4, None),
    ("\"We'd better get ours now.\"", 0.26, 4, "whisper"),
    ("But why would a warning make an honest person want to steal?", 0.26, 5, None),
    ("Her {fiancé's|fee-ahn-say's} professor, psychologist Robert {Cialdini,|Chal-dee-nee,} tested it.", 0.12, 6, None),
    ("His team hid marked wood along the trails, and kept swapping the signs.", 0.18, 6, None),
    ("One said: \"Please don't remove the petrified wood.\"", 0.14, 7, None),
    ("Another said: \"Many past visitors have removed the petrified wood.\"", 0.18, 7, None),
    ("With \"please don't,\" fewer than {2%|two percent} of the pieces vanished.", 0.14, 8, None),
    ("With \"many past visitors\"...", 0.26, 8, None),
    ("almost {8%.|eight percent.}", 0.12, 8, None),
    ("Nearly five times more.", 0.2, 8, None),  # cut 2
    ("You see, we don't copy rules.", 0.1, 9, None),
    ("We copy each other.", 0.16, 9, None),
    ("\"Many people steal\" doesn't sound like a warning.", 0.1, 9, None),
    ("It sounds like what everyone does.", 0.2, 9, None),
    ("It's like a teacher announcing, \"Half this class cheated.\"", 0.12, 10, None),  # cut 3 -> SHORT_ANALOGY
    ("The other half hears: everybody cheats.", 0.2, 10, None),
    ("The sign didn't stop thieves.", 0.1, 11, None),
    ("It gave them permission.", 0.26, 11, None),
    ("And the bait wood?", 0.16, 12, None),
    ("It came from the park's \"conscience pile\":", 0.12, 12, None),
    ("pieces people stole, then mailed back with apology letters.", 0.16, 12, None),
    ("So some of it got stolen twice.", 0.0, 12, None),
]
SHORT_ANALOGY = "Like a teacher saying, \"Half this class cheated.\""
WHISPER_SPEED = 1.05
# phrases whose first word Kokoro swallows when generated cold ("The", "It", "So", "pieces", "She'd"): generate them
# right after the previous phrase (or a primer) and keep only the part after the pause, so the onset is natural.
CTX = {26, 27, 30, 31}
PRIMER = "Okay."
GAP_SCALE = 0.78  # tighter sentence gaps (reference 0.10-0.28 s)

# ---- v2 prosody (study/CHANNEL_STYLE_BIBLE.md section 9): duration-neutral expression ----
# The 62 s ceiling leaves no room to slow lines down, so expression comes from register (pitch) and level, plus two
# real pauses (bible: 1-3 pauses of 0.30-0.34 s before the punch and before the last sentence).
# Pitch arc like the references: calm, lower hook; higher, livelier setting and escalation; questions and the result
# rise; a drop for "You see," and the explanation; deadpan low punch; a settled, low last line.
GLOBAL_ST = 0.0   # v2 tried +1.5: rubberband shifting (any setting, even +1 st) blurred consonants ("fourteen" ->
                  # "working", "She read it" -> "Jiridit"; shift_test.py), so v3 keeps the clean voice unshifted
PITCH_ST = {}     # v2 per-line shifts, superseded by EXPR (v3)
# v3 expression: per-line Kokoro style blend (a playful voice for excited lines, a calmer one for deadpan lines) plus a
# small pitch nudge; every expressive variant is Whisper-checked against the plain line and DROPPED if it is less clear.
PLAY, CALM = "am_puck", "am_michael"
EXPR = {  # idx: (blend voice, weight, semitones)
    2: (PLAY, 0.3, 0.5),    # "and wanted to steal." mischief
    11: (PLAY, 0.3, 1.0),   # the mystery question rises
    18: (PLAY, 0.3, 1.0),   # "almost 8%." excited result
    25: (PLAY, 0.25, 0.5),  # "everybody cheats." playful
    28: (PLAY, 0.3, 1.0),   # "And the bait wood?" curious
    7: (CALM, 0.25, -0.5),  # reading the sign, a little ominous
    20: (CALM, 0.25, -0.5), # "You see," the pivot drops
    26: (CALM, 0.3, -0.5),  # deadpan punch
    27: (CALM, 0.3, -1.0),  # "It gave them permission." low and firm
    31: (CALM, 0.25, -0.5), # settled last line
}
GAIN_DB = {11: 1.0, 18: 1.5, 27: 2.5, 31: 1.0}
GAP_OVERRIDE = {1: 0.385, 30: 0.385, 18: 0.46, 26: 0.43}  # 26: "thieves." -> "It gave them permission." ~0.33 s (A5 VOICE P2: the deadpan needs its beat)  # 18: "almost 8%." -> "You see," >= 0.35 s (AUDIO A4: the cha-ching rings alone)  # x GAP_SCALE -> 0.30 s: before "and wanted to steal", before the last sentence
VERSION = "v3"
TEST = [0, 1, 2, 4, 12]

TOK = re.compile(r"\{([^|}]*)\|([^}]*)\}|(\S+)")


def parse(markup):
    """-> display tokens [(display, [spoken words])], spoken text"""
    toks = []
    for m in TOK.finditer(markup):
        if m.group(3) is not None:
            toks.append((m.group(3), [m.group(3)]))
        else:
            toks.append((m.group(1), m.group(2).split()))
    spoken = " ".join(" ".join(s) for _, s in toks).replace('"', "")
    return toks, spoken


def norm(w):
    w = w.lower().replace("’", "'")
    w = re.sub(r"[^a-z0-9'%-]", "", w)
    return w.strip("'-")


def kokoro():
    from kokoro_onnx import Kokoro
    return Kokoro(os.path.join(MODEL, "kokoro-v1.0.onnx"), os.path.join(MODEL, "voices-v1.0.bin"))


def style(k, voice):
    if "+" not in voice and ":" not in voice:
        return voice
    acc = None
    for part in voice.split("+"):
        name, w = (part.split(":") + ["1"])[:2]
        v = k.get_voice_style(name) * float(w)
        acc = v if acc is None else acc + v
    return acc


def trim(s):
    """cut leading/trailing silence without clipping soft onsets ("The", "It", "p"): low threshold + 35 ms pre-roll,
    then a 6 ms fade-in so the cut never clicks"""
    a = np.convolve(np.abs(s), np.ones(64) / 64, "same")
    idx = np.where(a > 0.006 * a.max())[0]
    out = s[max(0, idx[0] - int(0.035 * SR)): idx[-1] + int(0.03 * SR)].copy()
    n = int(0.006 * SR)
    out[:n] *= np.linspace(0, 1, n)
    out[-n:] *= np.linspace(1, 0, n)
    return out


def shift(s, st):
    """pitch shift by st semitones, duration kept (rubberband, formants preserved)"""
    if abs(st) < 1e-3:
        return s
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, "a.wav"), os.path.join(td, "b.wav")
        wavfile.write(a, SR, (np.clip(s, -1, 1) * 32767).astype(np.int16))
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af",
                            f"rubberband=pitch={2 ** (st / 12):.5f}:formant=preserved:pitchq=quality", b],
                           capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(r.stderr)
        _, y = wavfile.read(b)
    return y.astype(np.float32) / 32768.0


def whisperize(s, base_st=0.0):
    """+4 semitones over the narrator's register (rubberband, formants preserved), softer: -5 dB, gentle top cut, a
    breath layer under it"""
    y = shift(s, 4.0 + base_st)
    y = sosfilt(butter(2, 6500, "low", fs=SR, output="sos"), y)
    env = np.convolve(np.abs(y), np.ones(int(0.02 * SR)) / int(0.02 * SR), "same")
    noise = sosfilt(butter(2, [1800, 7000], "band", fs=SR, output="sos"), np.random.default_rng(7).standard_normal(len(y)))
    breath = noise / (np.abs(noise).max() + 1e-9) * env * 0.35
    return (y + breath) * 10 ** (-5 / 20)


def f0_stats(x, sr):
    fr, hop, f0 = int(0.04 * sr), int(0.01 * sr), []
    for i in range(0, len(x) - fr, hop):
        w = x[i:i + fr] * np.hanning(fr)
        if np.sqrt(np.mean(w ** 2)) < 0.02:
            continue
        ac = np.correlate(w, w, "full")[fr - 1:]
        lo, hi = int(sr / 400), int(sr / 60)
        j = lo + np.argmax(ac[lo:hi])
        if ac[j] > 0.45 * ac[0]:
            f0.append(sr / j)
    if not f0:
        return {}
    f = np.array(f0)
    return {"f0_med": round(float(np.median(f)), 1), "f0_p10": round(float(np.percentile(f, 10)), 1),
            "f0_p90": round(float(np.percentile(f, 90)), 1),
            "range_st": round(float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))), 1)}


_WM = None


def whisper(seg):
    global _WM
    from faster_whisper import WhisperModel
    if _WM is None:
        _WM = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    pcm = resample_poly(seg, 2, 3).astype(np.float32)
    pcm = np.concatenate([np.zeros(3200, np.float32), pcm, np.zeros(4800, np.float32)])  # 0.2 s lead-in, 0.3 s tail
    segs, _ = _WM.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                             condition_on_previous_text=False)
    out = []
    for sg in segs:
        for w in sg.words or []:
            out.append({"w": w.word.strip(), "s": max(0.0, w.start - 0.2), "e": max(0.0, w.end - 0.2), "p": w.probability})
    return out


def key(w):
    """comparison form: accents stripped, lower case, letters/digits/% only"""
    import unicodedata
    w = unicodedata.normalize("NFKD", w).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9%]", "", w)


def sim(a, b):
    return 1.0 if a == b else SequenceMatcher(None, a, b).ratio()


def align(toks, spoken, ww, dur):
    """display tokens -> (s, e) inside the phrase. DP alignment of display tokens to whisper words; a display token
    may also match two consecutive whisper words ("rainbow -colored", "two hundred"). Aliases: display form, spoken
    respelling joined. Unmatched tokens are interpolated between matched neighbours by letter count."""
    D = [(key(d), {key(d), key("".join(ws)), key(d).replace("%", "percent")}) for d, ws in toks]
    H = [key(w["w"]) for w in ww]
    n, m = len(D), len(H)
    INF = 1e9
    cost = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    for i in range(n + 1):
        for j in range(m + 1):
            c = cost[i][j]
            if c >= INF:
                continue
            if i < n and cost[i + 1][j] > c + 1:                          # display token not heard
                cost[i + 1][j], back[i + 1][j] = c + 1, (i, j, "skipD")
            if j < m and cost[i][j + 1] > c + 1:                          # extra whisper word
                cost[i][j + 1], back[i][j + 1] = c + 1, (i, j, "skipH")
            if i < n and j < m:
                s = max(sim(a, H[j]) for a in D[i][1])
                cc = c + (0 if s >= 0.75 else 1.6 - s)
                if cost[i + 1][j + 1] > cc:
                    cost[i + 1][j + 1], back[i + 1][j + 1] = cc, (i, j, "match" if s >= 0.75 else "sub")
            if i < n and j + 1 < m:
                s = max(sim(a, H[j] + H[j + 1]) for a in D[i][1])
                if s >= 0.75 and cost[i + 1][j + 2] > c + 0.1:
                    cost[i + 1][j + 2], back[i + 1][j + 2] = c + 0.1, (i, j, "merge")
    times = [None] * n
    i, j = n, m
    while (i, j) != (0, 0):
        pi, pj, op = back[i][j]
        if op in ("match", "sub", "merge"):
            times[pi] = (ww[pj]["s"], ww[j - 1]["e"]) if op != "sub" else None
            if op == "sub":
                times[pi] = ("sub", ww[pj]["s"], ww[pj]["e"])
        i, j = pi, pj
    unmatched = [toks[k][0] for k in range(n) if times[k] is None or times[k][0] == "sub"]
    times = [None if (t is None or t[0] == "sub") else t for t in times]
    k = 0
    while k < n:
        if times[k] is not None:
            k += 1
            continue
        e = k
        while e < n and times[e] is None:
            e += 1
        a = times[k - 1][1] if k > 0 else 0.0
        b = times[e][0] if e < n else dur
        L = [max(1, len(D[q][0])) for q in range(k, e)]
        tot, acc = sum(L), 0
        for q in range(k, e):
            s0 = a + (b - a) * acc / tot
            acc += L[q - k]
            times[q] = (s0, a + (b - a) * acc / tot)
        k = e
    out = []
    for q, (disp, _) in enumerate(toks):
        s, e = times[q]
        s = max(s, out[q - 1][2] if q else 0.0)
        out.append((disp, s, max(e, s + 0.04)))
    return out, unmatched


EXPR_USED, EXPR_DROPPED = [], []


def clarity(toks, y):
    """number of display tokens Whisper does not hear clearly (best similarity < 0.9) — lower is clearer"""
    H = [key(w["w"]) for w in whisper(y)]
    bad = 0
    for d, ws in toks:
        al = {key(d), key("".join(ws)), key(d).replace("%", "percent")}
        best = max([sim(a, h) for a in al for h in H] + [max([sim(a, H[j] + H[j + 1]) for a in al for j in range(len(H) - 1)] or [0])])
        bad += best < 0.9
    return bad


def tail_after_pause(y, lead_s):
    """the audio after the pause that ends the context phrase (expected near lead_s seconds)"""
    hop = int(0.01 * SR)
    env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    thr = 0.02 * env.max()
    quiet = env < thr
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if j - i >= 5:
                runs.append((i, j))
            i = j
        else:
            i += 1
    if not runs:
        return y
    exp = lead_s / 0.01
    a, b = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - exp))
    return y[max(0, b * hop - int(0.03 * SR)):]


def build(voice, speed, phrases):
    k = kokoro()
    st = style(k, voice)
    pieces, cur, info = [np.zeros(int(START * SR), np.float32)], START, []
    prev_spoken = None
    for idx, (markup, gap, beat, sty) in phrases:
        toks, spoken = parse(markup)
        sp_ = WHISPER_SPEED if sty == "whisper" else speed  # the whisper is a touch slower, conspiratorial

        def gen(vs):
            """trimmed phrase audio for voice style vs (with the previous phrase as run-in for the CTX lines)"""
            if idx in CTX:
                ctx = prev_spoken or PRIMER
                c, _ = k.create(ctx, voice=vs, speed=sp_, lang="en-us")
                y, _ = k.create(ctx + " " + spoken, voice=vs, speed=sp_, lang="en-us")
                y = tail_after_pause(y.astype(np.float32), len(trim(c.astype(np.float32))) / SR)
            else:
                y, _ = k.create(spoken, voice=vs, speed=sp_, lang="en-us")
            return trim(y.astype(np.float32))

        s = gen(st)
        gap = GAP_OVERRIDE.get(idx, gap) * GAP_SCALE
        if sty == "whisper":
            s = whisperize(s, GLOBAL_ST)
        elif idx in EXPR and isinstance(st, str):
            bv, wgt, st_ = EXPR[idx]
            y = shift(gen(k.get_voice_style(st) * (1 - wgt) + k.get_voice_style(bv) * wgt), st_)
            if clarity(toks, y) <= clarity(toks, s):
                s = y
                EXPR_USED.append(idx)
            else:
                EXPR_DROPPED.append(idx)
        prev_spoken = spoken
        s = s * 10 ** (GAIN_DB.get(idx, 0.0) / 20)
        info.append({"i": idx, "markup": markup, "spoken": spoken, "beat": beat, "style": sty, "s": round(cur, 3),
                     "e": round(cur + len(s) / SR, 3), "audio": s})
        pieces += [s, np.zeros(int(gap * SR), np.float32)]
        cur += len(s) / SR + gap
    v = np.concatenate(pieces + [np.zeros(int(0.12 * SR), np.float32)])
    return v, info


def phrase_list(drop=()):
    out = []
    for i, (m, g, b, s) in enumerate(P):
        if "1" in drop and i == 4:
            continue
        if "2" in drop and i == 19:
            continue
        if "3" in drop and i == 24:
            m = SHORT_ANALOGY
        out.append((i, (m, g, b, s)))
    return out


def stats(v, info, words):
    n = len(words)
    first, last = words[0]["s"], words[-1]["e"]
    st = {"duration_s": round(len(v) / SR, 2), "last_word_end_s": round(float(last), 2), "n_words": n,
          "words_per_s": round(float(n / (last - first)), 2), "est_full_217_s": round(float(217 * (last - first) / n), 1),
          **f0_stats(v, SR)}
    return st


def finalize(tag):
    """promote an existing take (takes/<tag>.wav + .json) to voice.wav (48 kHz 24-bit) + words.json + phrases.json"""
    sys.path.insert(0, os.path.join(HERE, "..", "audio"))
    from dsp import write_wav
    sr, x = wavfile.read(os.path.join(TAKES, tag + ".wav"))
    assert sr == SR
    d = json.load(open(os.path.join(TAKES, tag + ".json"), encoding="utf-8"))
    v48 = resample_poly(x.astype(np.float64) / 32768.0, 2, 1)
    write_wav(os.path.join(HERE, "voice.wav"), v48, bits=24)
    json.dump(d["words"], open(os.path.join(HERE, "words.json"), "w", encoding="utf-8"), indent=0)
    phr = []
    short = any(w["w"].startswith("saying") for w in d["words"])  # cut 3 was applied to this take
    for r in d["phrases"]:
        m = SHORT_ANALOGY if (r["i"] == 24 and short) else P[r["i"]][0]
        phr.append({"i": r["i"], "beat": r["beat"], "s": r["s"], "e": r["e"], "markup": m, "style": P[r["i"]][3]})
    json.dump(phr, open(os.path.join(HERE, "phrases.json"), "w", encoding="utf-8"), indent=1)
    json.dump({"take": VERSION + ":" + tag, "stats": d["stats"]}, open(os.path.join(HERE, "voice_info.json"), "w", encoding="utf-8"), indent=1)
    print(f"finalized {tag}: {d['stats']}")


def main():
    if sys.argv[1] == "finalize":
        return finalize(sys.argv[2])
    mode, args = sys.argv[1], [a for a in sys.argv[2:] if not a.startswith("--")]
    speed = float(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--speed=")), "1.0"))
    drop = tuple(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--drop=")), "").split(",")) if any(
        a.startswith("--drop=") for a in sys.argv) else ()
    os.makedirs(TAKES, exist_ok=True)
    for voice in args:
        phrases = [(i, P[i]) for i in TEST] if mode == "test" else phrase_list(drop)
        v, info = build(voice, speed, phrases)
        words, report = [], []
        for ph in info:
            toks, spoken = parse(ph["markup"])
            ww = whisper(ph["audio"])
            al, miss = align(toks, spoken, ww, ph["e"] - ph["s"])
            for d, s, e in al:
                words.append({"w": d, "s": round(ph["s"] + s, 3), "e": round(ph["s"] + e, 3)})
            heard = " ".join(w["w"] for w in ww)
            report.append({"i": ph["i"], "beat": ph["beat"], "s": ph["s"], "e": ph["e"],
                           "w_per_s": round(len(toks) / max(0.01, ph["e"] - ph["s"]), 2), "heard": heard, "missing": miss})
        tag = f"{mode}_{voice.replace(':', '').replace('+', '_')}_{speed:.2f}_{VERSION}"
        wavfile.write(os.path.join(TAKES, tag + ".wav"), SR, (np.clip(v, -1, 1) * 32767).astype(np.int16))
        st = stats(v, info, words)
        json.dump({"stats": st, "phrases": report, "words": words}, open(os.path.join(TAKES, tag + ".json"), "w", encoding="utf-8"), indent=1)
        print(f"== {tag}: {st}")
        print(f"   expressive lines kept: {EXPR_USED}  dropped (less clear): {EXPR_DROPPED}")
        for r in report:
            flag = "  <-- CHECK " + str(r["missing"]) if r["missing"] else ""
            print(f"  [{r['i']:2}] {r['s']:6.2f}-{r['e']:6.2f} {r['w_per_s']:4.1f} w/s | {r['heard']}{flag}")
        if "--final" in sys.argv and mode == "full":
            sys.path.insert(0, os.path.join(HERE, "..", "audio"))
            from dsp import write_wav
            v48 = resample_poly(v.astype(np.float64), 2, 1)
            write_wav(os.path.join(HERE, "voice.wav"), v48, bits=24)
            json.dump(words, open(os.path.join(HERE, "words.json"), "w", encoding="utf-8"), indent=0)
            json.dump([{k2: r[k2] for k2 in ("i", "beat", "s", "e")} | {"markup": P[r["i"]][0], "style": P[r["i"]][3]}
                       for r in report], open(os.path.join(HERE, "phrases.json"), "w", encoding="utf-8"), indent=1)
            print("wrote voice.wav (48 kHz 24-bit), words.json, phrases.json")


if __name__ == "__main__":
    main()
