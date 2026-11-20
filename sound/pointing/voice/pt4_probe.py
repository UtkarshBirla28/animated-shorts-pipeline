"""SCRIPT v4: measure every PARAGRAPH take sentence by sentence -> takes/v4_<p>/<t>.p4.json (nothing is played).
  python pt4_probe.py [v4_p1 v4_p2 ... | all] [--force] [--no-whisper]
Per take (gained to -18 LUFS, the true-silence scale of pt_lib):
  - sentence spans: ElevenLabs word times -> each boundary moved to the longest quiet run between the two sentences (true
    silence, else the quietest 60 ms); the first / last sentence edges = the take's acoustic on / off;
  - per sentence: f0 median, f0 range, words/s, loudness, end contour, the natural tail after its last word, the take's own
    pause before the next sentence, and Whisper (GPU) on the sentence cut out alone: heard text, wrong words, lowest p;
  - the take: inner pitch steps, pace, clipped start / end, an extra sound after the last word.
The chain search (pt4_chain.py) reads these files."""
import sys

import numpy as np

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
SR, H = L.SR, L.H
WH = "--no-whisper" not in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
folders = sorted(p for p in L.TAKES.glob("v4_p*") if p.is_dir()) if not args or args == ["all"] else [L.TAKES / a for a in args]


def boundary(d, a, b):
    """the quiet run that separates two sentences inside [a, b] s -> (start, end) s"""
    runs = [r for r in L.runs_below(d, int(a / H), int(b / H)) if r[1] - r[0] >= 8]
    if runs:
        r = max(runs, key=lambda r: r[1] - r[0])
        return r[0] * H + 0.005, r[1] * H + 0.005, True
    ia, ib = int(a / H), max(int(a / H) + 13, int(b / H))
    sm = np.convolve(d[ia:ib], np.ones(12) / 12, "valid")
    k = ia + int(np.argmin(sm))
    return k * H, (k + 12) * H, False


def probe(mp3, meta):
    m = L.read(mp3)
    g = 10 ** ((-18 - L.lufs(m)) / 20)
    m = m * g
    d = L.db_frames(m)
    tr = V.Track(m)
    loud = np.where(d > L.THR)[0]
    on0, off0 = loud[0] * H, loud[-1] * H + 0.01
    words = L.align_words(mp3.with_suffix(".json"))
    sents = V.split_sentences(meta["text"])
    counts = [len(s.split()) for s in sents]
    if sum(counts) != len(words):
        print(f"   !! {mp3.name}: {len(words)} aligned words, the text has {sum(counts)}: sentence spans from the share of words")
    idx = np.cumsum([0] + counts)
    S = []
    for k, s in enumerate(sents):
        a = words[min(idx[k], len(words) - 1)][1] if words else on0
        b = words[min(idx[k + 1] - 1, len(words) - 1)][2] if words else off0
        S.append({"text": s, "nw": counts[k], "el": (a, b)})
    S[0]["on"], S[-1]["off"] = on0, off0
    for k in range(len(S) - 1):
        lo = max(S[k]["el"][1] - 0.20, (S[k]["el"][0] + S[k]["el"][1]) / 2)
        hi = min(S[k + 1]["el"][0] + 0.20, (S[k + 1]["el"][0] + S[k + 1]["el"][1]) / 2)
        a, b, true = boundary(d, lo, max(hi, lo + 0.07))
        S[k]["off"], S[k + 1]["on"], S[k]["pause_true_silence"] = a, b, true
    m24 = None
    out = []
    for k, s in enumerate(S):
        x = tr.sentence(s["on"], s["off"], s["nw"])
        x.update({"text": s["text"], "tail_s": tr.tail(s["off"]), "pause_after_s": round(S[k + 1]["on"] - s["off"], 3) if k + 1 < len(S) else None,
                  "pause_true_silence": s.get("pause_true_silence")})
        if WH:
            if m24 is None:
                from scipy.signal import resample_poly
                m24 = resample_poly(m, 1, 2)
            a0 = max(0.0, s["on"] - 0.06)
            hw = L.whisper(m24[int(a0 * 24000):int((s["off"] + 0.06) * 24000)])
            x["heard"] = " ".join(w["w"] for w in hw)
            x["wrong"] = L.word_diff(s["text"], x["heard"])
            x["min_p"] = round(min((w["p"] for w in hw), default=0.0), 2)
        out.append(x)
    sm = V.summary(out)
    res = {"file": mp3.name, "text": meta["text"], "stability": meta.get("stability"), "seed": meta.get("seed"), "dur": round(len(m) / SR, 3),
           "raw_gain_db": round(20 * np.log10(g), 2), "on": round(on0, 3), "off": round(off0, 3),
           "clipped_start": bool(on0 < 0.02), "clipped_end": bool(len(m) / SR - off0 < 0.03),
           "sentences": out, "summary": sm, "wrong_words": sum(len(x.get("wrong") or []) for x in out)}
    return res


for F in folders:
    for mp3 in sorted(F.glob("t*.mp3"), key=lambda p: int(p.stem[1:]) if p.stem[1:].isdigit() else 0):
        pj = mp3.with_suffix(".p4.json")
        if pj.exists() and "--force" not in sys.argv:
            r = V.jload(pj)
            for x in r["sentences"]:                     # re-compare the stored hearing (the number words may have changed)
                if "heard" in x:
                    x["wrong"] = L.word_diff(x["text"], x["heard"])
            r["wrong_words"] = sum(len(x.get("wrong") or []) for x in r["sentences"])
            V.jsave(pj, r)
        else:
            r = probe(mp3, V.jload(mp3.with_suffix(".meta.json")))
            V.jsave(pj, r)
        sm = r["summary"]
        print(f"[{F.name}/{mp3.stem}] stab {r['stability']} {r['dur']:.2f}s  centre {sm['centre_hz']} Hz  steps med {sm['step_median_st']} max {sm['step_max_st']}  "
              f"pace {sm['wps_median']} sd {sm['wps_sd']}  wrong {r['wrong_words']}  {'CLIPSTART ' if r['clipped_start'] else ''}{'CLIPEND' if r['clipped_end'] else ''}", flush=True)
        for x in r["sentences"]:
            print(f"     f0 {x['f0'] or 0:5.0f}  {x['wps']:4.2f} w/s  end {((x['end'] or {}).get('rise_st') or 0):+5.1f}  tail {x['tail_s']:.2f}  pause {x['pause_after_s'] if x['pause_after_s'] is not None else '-':>5}"
                  f"  p {x.get('min_p', '-')}  {x['text'][:60]}" + (f"  WRONG {x['wrong']}" if x.get("wrong") else ""))
