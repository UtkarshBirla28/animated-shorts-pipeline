"""Narration for "The Oil Tanks That Were Mostly Water" (script table P; the ElevenLabs takes are assembled by eleven_build.py).
Originally: narration for "The Anti-Theft Sign That Made People Steal": Kokoro (local TTS), one phrase at a time, joined with
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
    ("By {1963,|nineteen sixty-three,} a man had borrowed over {$150 million...|a hundred and fifty million dollars...}", 0.3, 1, None),  # 0
    ("against tanks that were mostly water.", 0.3, 1, None),  # 1
    ("Meet Tino {De Angelis,|Dee An-jeh-lis,} New Jersey's salad oil king.", 0.16, 2, None),  # 2
    ("His giant tanks were full of cooking oil.", 0.26, 2, None),  # 3
    ("Or so everyone thought.", 0.3, 2, None),  # 4
    ("Banks lent him money against it.", 0.12, 3, None),  # 5
    ("American Express sent inspectors to check.", 0.24, 3, None),  # 6  (fact fix 2026-11-14)
    ("But Tino's own men would climb up, drop a tape inside, and shout down:", 0.24, 4, None),  # 7  (TIME 1965: Tino's men climbed, the inspector stayed on the ground)
    ("{\"90%|Ninety percent} full!\"", 0.3, 4, "shout"),  # 8
    ("So the banks lent more.", 0.1, 5, None),  # 9
    ("And more.", 0.2, 5, None),  # 10
    ("Soon, his papers showed more of that oil than the entire United States had.", 0.28, 5, None),  # 11
    ("Somehow, the money kept coming.", 0.3, 5, None),  # 12
    ("But what if someone did look inside?", 0.34, 6, None),  # 13  (fact fix 2026-11-14)
    ("Then, in November {1963,|nineteen sixty-three,} his big bet on oil prices crashed.", 0.14, 7, None),  # 14
    ("His company went bust.", 0.14, 7, None),  # 15
    ("Lenders finally checked the tanks.", 0.34, 7, None),  # 16
    ("Inside...", 0.45, 8, None),  # 17
    ("was mostly water.", 0.4, 8, None),  # 18
    ("You see, oil floats on water.", 0.16, 9, None),  # 19
    ("Ever left salad dressing out?", 0.16, 9, None),  # 20
    ("The oil always rises to the top.", 0.26, 9, None),  # 21
    ("Fill a tank with water, add a thin layer of oil,", 0.12, 10, None),  # 22
    ("and from the hatch, it looks full.", 0.3, 10, None),  # 23
    ("And the real oil?", 0.18, 11, None),  # 24
    ("He pumped it through pipes, tank to tank,", 0.1, 11, None),  # 25
    ("so the same oil got counted again and again.", 0.3, 11, None),  # 26
    ("The hardest-working oil in America.", 0.34, 11, None),  # 27
    ("When it came out, American Express shares crashed."  , 0.3, 12, None),  # 28
    ("But one young investor bought those shares cheap.", 0.12, 13, None),  # 29
    ("He bet people still trusted the brand.", 0.26, 13, None),  # 30
    ("His name?", 0.34, 13, None),  # 31
    ("Warren Buffett.", 0.36, 13, None),  # 32
    ("The oil was fake.", 0.3, 14, None),  # 33
    ("The trust was real.", 0.0, 14, None),  # 34
    ("And the inspector, on the ground... believed them.", 0.32, 5, None),  # 35  NEW 2026-11-14: spoken FIRST in beat 5 (between P8 and P9)
]
SHORT_ANALOGY = None  # saladoil: no analogy swap
WHISPER_SPEED = 1.05
# phrases whose first word Kokoro swallows when generated cold ("The", "It", "So", "pieces", "She'd"): generate them
# right after the previous phrase (or a primer) and keep only the part after the pause, so the onset is natural.
CTX = set()
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
EXPR = {}  # Kokoro-only expression blends (unused with ElevenLabs)
GAP_OVERRIDE = {}  # saladoil: per-phrase gaps live in P (x GAP_SCALE); tune after the first assembly
VERSION = "v3"
TEST = [0, 1, 8, 13, 17]

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
