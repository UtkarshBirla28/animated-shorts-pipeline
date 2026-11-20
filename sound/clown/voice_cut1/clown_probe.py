"""Measure takes of the clown narration (nobody hears them: every number here stands in for an ear).

  python clown_probe.py <takes subfolder> [more ...] [--no-whisper]

Per take -> <take>.probe.json and one printed line. Per SENTENCE of the take:
  on / off      acoustic speech span (10 ms RMS windows every 5 ms over -45 dBFS, after gaining the take to -18 LUFS),
                searched round the ElevenLabs character times
  wps           words / (off - on)
  inner         longest run of true silence inside the sentence (s) and where
  gap_after     true silence between this sentence and the next
  lufs, peak, bands (1-4 kHz and 4-10 kHz against 100-1000 Hz)
  f0            median, p10-p90 range in semitones, and the contour of the last 300 ms of voiced sound
  whisper       the sentence cut out alone (0.06 s margins) and transcribed: word differences, lowest word probability
Take level: clipped start (speech over -45 dBFS inside the first 10 ms), loudness spread between its sentences."""
import json
import sys
from pathlib import Path

import numpy as np

import clown_lib as L

sys.stdout.reconfigure(encoding="utf-8")
TGT = -18.0
FAST = "--fast" in sys.argv      # one whisper pass per take instead of one per sentence
THR = -45.0


def runs_below(d, a, b, thr=THR):
    """silent runs (frame index ranges) inside frames [a, b)"""
    out, s = [], None
    for j in range(a, b):
        if d[j] < thr:
            s = j if s is None else s
        elif s is not None:
            out.append((s, j))
            s = None
    if s is not None:
        out.append((s, b))
    return out


def sentence_spans(text_idxs, words, d, dur):
    """acoustic on/off of every sentence. words: [[w, s, e]] from the alignment; d: 5 ms-hop dB frames.
    Frame j covers [j*5 ms, j*5 ms + 10 ms]."""
    H = 0.005
    spans, k = [], 0
    for i in text_idxs:
        n = L.nwords(i)
        ws = words[k:k + n]
        k += n
        spans.append([i, ws[0][1], ws[-1][2], ws])
    out = []
    for q, (i, a, b, ws) in enumerate(spans):
        lo = spans[q - 1][2] if q else 0.0
        hi = spans[q + 1][1] if q + 1 < len(spans) else dur
        # the true-silence run before the sentence: the longest one between the middle of the previous sentence's
        # last word and this sentence's first word end
        if q:
            p_last = spans[q - 1][3][-1]
            r = runs_below(d, int(((p_last[1] + p_last[2]) / 2) / H), int(min(ws[0][2], (ws[0][1] + ws[0][2]) / 2 + 0.05) / H))
            r = max(r, key=lambda t: t[1] - t[0]) if r else None
            on = (r[1] * H + 0.005) if r else a
        else:
            sp = np.where(d[:int(ws[0][2] / H) + 1] > THR)[0]
            on = (sp[0] * H + 0.005) if len(sp) else a
        out.append({"i": i, "on": on, "al_s": a, "al_e": b, "ws": ws})
    for q, o in enumerate(out):
        if q + 1 < len(out):
            nxt = out[q + 1]
            p_last = o["ws"][-1]
            r = runs_below(d, int(((p_last[1] + p_last[2]) / 2) / H), int(min(nxt["ws"][0][2], (nxt["ws"][0][1] + nxt["ws"][0][2]) / 2 + 0.05) / H))
            r = max(r, key=lambda t: t[1] - t[0]) if r else None
            o["off"] = (r[0] * H + 0.005) if r else nxt["on"]
            o["gap_after"] = round(nxt["on"] - o["off"], 3) if r else 0.0
        else:
            # the last sentence ends at the first true silence of >= 0.15 s after its last word has begun (a take made
            # with next_text can end with the first 20-60 ms of a sound that is not ours: it stays outside the span)
            a0 = int((o["ws"][-1][1] + 0.08) / H)
            rr = [r for r in runs_below(d, a0, len(d)) if (r[1] - r[0]) * H >= 0.15 or r[1] >= len(d)]
            if rr:
                o["off"] = rr[0][0] * H + 0.005
                o["tail_blip"] = bool(np.max(d[rr[0][1]:]) > THR) if rr[0][1] < len(d) else False
            else:
                sp = np.where(d > THR)[0]
                o["off"] = min(dur, sp[-1] * H + 0.005)
            o["gap_after"] = None
    return out


def probe(mp3, text_idxs, do_whisper=True):
    m = L.read(mp3)
    dur = len(m) / L.SR
    raw_l = L.lufs(m)
    g = 10 ** ((TGT - raw_l) / 20)
    m = m * g
    d = L.db_frames(m)
    words = L.align_words(mp3.with_suffix(".json"))
    nexp = sum(L.nwords(i) for i in text_idxs)
    res = {"file": mp3.name, "dur": round(dur, 3), "raw_lufs": round(raw_l, 2), "gain_db": round(TGT - raw_l, 2),
           "raw_peak": round(float(np.max(np.abs(m)) / g), 3), "n_align_words": len(words), "n_expected": nexp, "sent": []}
    if len(words) != nexp:
        res["error"] = "alignment word count differs"
        return res
    res["clipped_start"] = bool(np.max(d[:2]) > THR)
    res["lead_s"] = round(float(np.argmax(d > THR)) * 0.005, 3)
    T, F = L.f0_track(m)
    m24 = L.read(mp3, sr=24000) if do_whisper else None
    spans = sentence_spans(text_idxs, words, d, dur)
    take_hw = None
    if do_whisper and FAST:
        take_hw = L.whisper(m24)
        res["heard"] = " ".join(w["w"] for w in take_hw)
        res["take_diff"] = L.word_diff(L.text_of(text_idxs), res["heard"])
    for o in spans:
        i, on, off = o["i"], o["on"], o["off"]
        seg = m[int(on * L.SR):int(off * L.SR)]
        a, b = int(on / 0.005) + 4, int(off / 0.005) - 4
        rr = runs_below(d, a, b)
        # 10 ms windows: a run of n frames = (n-1)*5 + 10 ms of silence
        inner = max(rr, key=lambda t: t[1] - t[0]) if rr else None
        inner_s = ((inner[1] - inner[0] - 1) * 0.005 + 0.010) if inner else 0.0
        inner_at = None
        if inner:
            tmid = (inner[0] + inner[1]) / 2 * 0.005
            wa = [w for w in o["ws"] if w[1] <= tmid]
            wb = [w for w in o["ws"] if w[1] > tmid]
            inner_at = f"{wa[-1][0] if wa else ''}|{wb[0][0] if wb else ''}"
        k = np.where((T >= on) & (T <= off) & ~np.isnan(F))[0]
        f = F[k]
        f0 = {}
        if len(f) > 5:
            f0 = {"med": round(float(np.median(f)), 1), "range_st": round(float(12 * np.log2(np.percentile(f, 90) / np.percentile(f, 10))), 1)}
        s = {"i": i, "text": L.S[i][0], "on": round(on, 3), "off": round(off, 3), "dur": round(off - on, 3),
             "wps": round(L.nwords(i) / (off - on), 2), "inner_s": round(inner_s, 3), "inner_at": inner_at,
             "gap_after": o["gap_after"], "lufs": round(L.lufs(seg), 2), "peak": round(float(np.max(np.abs(seg))), 3),
             "bands": L.bands(seg), "f0": f0, "end": L.end_contour(T, F, on, off)}
        if do_whisper and take_hw is not None:      # one whisper pass per take: words given to sentences by time
            hw = [w for w in take_hw if on - 0.12 <= (w["s"] + w["e"]) / 2 <= off + 0.12]
            s["heard"] = " ".join(w["w"] for w in hw)
            s["diff"] = []
            s["min_p"] = round(min((w["p"] for w in hw), default=0.0), 2)
            s["mean_p"] = round(float(np.mean([w["p"] for w in hw])) if hw else 0.0, 2)
        elif do_whisper:
            hw = L.whisper(m24[int(max(0, on - 0.06) * 24000):int(min(dur, off + 0.06) * 24000)])
            heard = " ".join(w["w"] for w in hw)
            s["heard"] = heard
            s["diff"] = L.word_diff(L.S[i][0], heard)
            s["min_p"] = round(min((w["p"] for w in hw), default=0.0), 2)
            s["mean_p"] = round(float(np.mean([w["p"] for w in hw])) if hw else 0.0, 2)
        res["sent"].append(s)
    ls = [s["lufs"] for s in res["sent"] if L.nwords(s["i"]) >= 3]
    res["lufs_spread"] = round(max(ls) - min(ls), 2) if ls else 0.0
    nw = sum(L.nwords(s["i"]) for s in res["sent"])
    res["wps_speaking"] = round(nw / sum(s["dur"] for s in res["sent"]), 2)
    res["wps_overall"] = round(nw / (res["sent"][-1]["off"] - res["sent"][0]["on"]), 2)
    allf = F[~np.isnan(F)]
    res["f0_med"] = round(float(np.median(allf)), 1)
    res["f0_range_st"] = round(float(12 * np.log2(np.percentile(allf, 90) / np.percentile(allf, 10))), 1)
    res["bands"] = L.bands(m)
    return res


def line(res):
    if "error" in res:
        return f"{res['file']:14s} ERROR {res['error']} ({res['n_align_words']} vs {res['n_expected']})"
    bad = sum(len(s.get("diff", [])) for s in res["sent"]) + len(res.get("take_diff", []))
    out = (f"{res['file']:14s} {res['dur']:5.2f}s  speak {res['wps_speaking']:4.2f} all {res['wps_overall']:4.2f} w/s  "
           f"lufs {res['raw_lufs']:6.2f} spread {res['lufs_spread']:4.2f} pk {res['raw_peak']:.2f}  f0 {res['f0_med']:5.1f} Hz range {res['f0_range_st']:4.1f} st  "
           f"mid {res['bands']['mid_db']:6.2f} hi {res['bands']['hi_db']:6.2f}  lead {res['lead_s']:.3f}{' CLIPSTART' if res['clipped_start'] else ''}  wrong {bad}")
    for s in res["sent"]:
        e = s["end"] or {}
        out += (f"\n     S{s['i']:<2} {s['dur']:5.2f}s {s['wps']:4.2f} w/s  inner {s['inner_s']:.2f} {s['inner_at'] or '':22s} gap {s['gap_after'] if s['gap_after'] is not None else '  -  '}"
                f"  lufs {s['lufs']:6.2f}  f0 {s['f0'].get('med', 0):5.1f}/{s['f0'].get('range_st', 0):4.1f}st  end rise {e.get('rise_st', 0):+5.2f} vsmed {e.get('end_vs_med_st', 0):+5.2f}"
                + (f"  p {s['min_p']:.2f}/{s['mean_p']:.2f}  {s['heard']}" + (f"  DIFF {s['diff']}" if s['diff'] else "") if "heard" in s else ""))
    if res.get("take_diff"):
        out += f"\n     TAKE DIFF {res['take_diff']}  heard: {res['heard']}"
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dw = "--no-whisper" not in sys.argv
    for sub in args:
        folder = L.TAKES / sub
        log = {}
        lg = L.TAKES / "gen_log.jsonl"
        for ln in lg.read_text(encoding="utf-8").splitlines():
            r = json.loads(ln)
            log[r["file"]] = r
        for mp3 in sorted(folder.glob("*.mp3")):
            pj = mp3.with_suffix(".probe.json")
            if pj.exists() and "--force" not in sys.argv:
                res = json.loads(pj.read_text(encoding="utf-8"))
            else:
                text = mp3.with_suffix(".txt").read_text(encoding="utf-8")
                base = [k for k in range(len(L.S))]
                idxs = None
                mj = mp3.with_suffix(".meta.json")
                if mj.exists():
                    idxs = json.loads(mj.read_text(encoding="utf-8")).get("sentences")
                if idxs is None:
                    for c, (spoken, _, _) in L.CHUNKS.items():
                        if L.text_of(spoken) == text:
                            idxs = spoken
                if idxs is None:   # any run of consecutive sentences
                    for a in base:
                        for b in range(a + 1, len(L.S) + 1):
                            if L.text_of(range(a, b)) == text:
                                idxs = list(range(a, b))
                assert idxs is not None, mp3
                res = probe(mp3, idxs, dw)
                pj.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"[{sub}] " + line(res))


if __name__ == "__main__":
    main()
