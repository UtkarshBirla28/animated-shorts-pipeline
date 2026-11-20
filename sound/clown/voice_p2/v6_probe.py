"""Measure takes (nobody hears them: every number stands in for an ear).

  python v6_probe.py <takes subfolder> [more ...] [--force]

Per take -> <take>.probe.json + printed lines. The take is gained to -18 LUFS, then:
  speech        10 ms RMS windows every 5 ms over -45 dBFS (true silence below)
  sentences     the script sentences of the take's lines; whisper (whole take) gives rough word times, and every
                boundary is the LONGEST true-silence run between the middle of a sentence's last word and the next
                sentence's first word (whisper starts run 0.1-0.2 s late: the window reaches 0.15 s past it)
Per sentence: on / off, dur, words/s, longest inner silence, gap after, LUFS, peak, f0 (median, p10-p90 range,
sd), end contour (last 300 ms voiced), bands, whisper of the sentence cut out alone (0.06 s margins): differences
against the script and the lowest word probability.
Take level: clipped start / end (speech inside the first 10 ms / last 20 ms), lead, extra sound outside the
sentences (a leaked tag, a laugh, a breath burst)."""
import json
import sys
from difflib import SequenceMatcher

import numpy as np

import v6_lib as L

sys.stdout.reconfigure(encoding="utf-8")
TGT = -18.0


def take_sentences(lines):
    out = []
    for lid in lines:
        for s in L.sentences(L.TEXT[lid]):
            out.append({"line": lid, "text": s})
    return out


def map_words(sents, hw):
    """expected words (sentence by sentence) -> whisper times (interpolated where whisper missed a word)"""
    exp = []
    for k, s in enumerate(sents):
        for w in s["text"].split():
            for t in L.norm_text(w) or [w.lower()]:
                exp.append([k, t, None, None])
    heard = []
    for w in hw:
        for t in L.norm_text(w["w"]):
            heard.append((t, w["s"], w["e"]))
    sm = SequenceMatcher(None, [e[1] for e in exp], [h[0] for h in heard], autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for q in range(i2 - i1):
                exp[i1 + q][2], exp[i1 + q][3] = heard[j1 + q][1], heard[j1 + q][2]
    # interpolate the gaps
    known = [q for q, e in enumerate(exp) if e[2] is not None]
    for q, e in enumerate(exp):
        if e[2] is None:
            a = max([k for k in known if k < q], default=None)
            b = min([k for k in known if k > q], default=None)
            ta = exp[a][3] if a is not None else 0.0
            tb = exp[b][2] if b is not None else (hw[-1]["e"] if hw else ta + 0.3)
            e[2], e[3] = ta, max(ta + 0.02, tb)
    return exp


def probe(mp3, lines, do_whisper=True):
    m = L.read(mp3)
    dur = len(m) / L.SR
    raw_l = L.lufs(m)
    g = 10 ** ((TGT - raw_l) / 20)
    m = m * g
    d = L.db_frames(m)
    nfr = len(d)
    sents = take_sentences(lines)
    m24 = L.read(mp3, sr=24000) * g
    hw = L.whisper(m24)
    heard_all = " ".join(w["w"] for w in hw)
    exp = map_words(sents, hw)
    loud = np.where(d > L.THR)[0]
    res = {"file": mp3.name, "dur": round(dur, 3), "raw_lufs": round(raw_l, 2), "gain_db": round(TGT - raw_l, 2),
           "raw_peak": round(float(np.max(np.abs(m)) / g), 3), "lines": lines, "heard": heard_all,
           "take_diff": L.word_diff(" ".join(s["text"] for s in sents), heard_all), "sent": []}
    if not len(loud):
        res["error"] = "silent"
        return res
    res["clipped_start"] = bool(np.max(d[:2]) > L.THR)
    res["clipped_end"] = bool(np.max(d[-4:]) > L.THR)
    res["lead_s"] = round(float(loud[0]) * L.H, 3)
    # boundaries
    first_on = loud[0] * L.H + 0.005
    ons, offs, gaps = [first_on], [], []
    for k in range(len(sents) - 1):
        lastw = [e for e in exp if e[0] == k][-1]
        firstw = [e for e in exp if e[0] == k + 1][0]
        a = int(((lastw[2] + lastw[3]) / 2) / L.H)
        b = int((firstw[2] + 0.15) / L.H)
        rr = [r for r in L.runs_below(d, a, b) if r[1] - r[0] >= 4]
        if rr:
            r = max(rr, key=lambda t: t[1] - t[0])
            offs.append(r[0] * L.H + 0.005)
            ons.append(r[1] * L.H + 0.005)
            gaps.append(round((r[1] - r[0]) * L.H, 3))
        else:     # no true silence: the quietest 10 ms in the window
            j = a + int(np.argmin(d[a:max(a + 1, b)]))
            offs.append(j * L.H + 0.005)
            ons.append(j * L.H + 0.005)
            gaps.append(0.0)
    # end: the last speech frame (a take may end in a breath: anything after a >= 0.15 s silence that follows the
    # last word's middle is "extra")
    lastw = [e for e in exp if e[0] == len(sents) - 1][-1]
    a0 = int(((lastw[2] + lastw[3]) / 2) / L.H)
    rr = [r for r in L.runs_below(d, a0, nfr) if (r[1] - r[0]) * L.H >= 0.15 or r[1] >= nfr]
    if rr:
        offs.append(rr[0][0] * L.H + 0.005)
        tail_extra = float(np.max(d[rr[0][1]:])) if rr[0][1] < nfr else -99.0
    else:
        offs.append(loud[-1] * L.H + 0.01)
        tail_extra = -99.0
    res["tail_extra_db"] = round(tail_extra, 1)
    # sound before the first sentence that is separated by silence (a leaked tag / breath)
    pre_runs = [r for r in L.runs_below(d, loud[0], int((exp[0][2] + 0.05) / L.H)) if (r[1] - r[0]) * L.H >= 0.12]
    res["pre_extra"] = bool(pre_runs)
    if pre_runs:      # the first sentence starts after the last long silence before its first word
        ons[0] = pre_runs[-1][1] * L.H + 0.005
    T, F = L.f0_track(m)
    for k, s in enumerate(sents):
        on, off = ons[k], offs[k]
        seg = m[int(on * L.SR):int(off * L.SR)]
        a, b = int(on / L.H) + 4, int(off / L.H) - 4
        rr = L.runs_below(d, a, b)
        inner = max(rr, key=lambda t: t[1] - t[0]) if rr else None
        inner_s = ((inner[1] - inner[0] - 1) * L.H + 0.010) if inner else 0.0
        n = L.nwords(s["text"])
        o = {"k": k, "line": s["line"], "text": s["text"], "on": round(on, 3), "off": round(off, 3), "dur": round(off - on, 3),
             "wps": round(n / max(0.05, off - on), 2), "inner_s": round(inner_s, 3), "gap_after": gaps[k] if k < len(gaps) else None,
             "lufs": round(L.lufs(seg), 2) if len(seg) > 0.05 * L.SR else None, "peak": round(float(np.max(np.abs(seg))), 3) if len(seg) else None,
             "bands": L.bands(seg), "f0": L.f0_stats(T, F, on, off), "end": L.end_contour(T, F, on, off)}
        # energy contour: level of the last word against the sentence (does the last word land?)
        if do_whisper:
            h = L.whisper(m24[int(max(0, on - 0.06) * 24000):int(min(dur, off + 0.06) * 24000)])
            o["heard"] = " ".join(w["w"] for w in h)
            o["diff"] = L.word_diff(s["text"], o["heard"])
            o["min_p"] = round(min((w["p"] for w in h), default=0.0), 2)
            o["mean_p"] = round(float(np.mean([w["p"] for w in h])) if h else 0.0, 2)
        res["sent"].append(o)
    nw = sum(L.nwords(s["text"]) for s in sents)
    res["wps_speaking"] = round(nw / sum(o["dur"] for o in res["sent"]), 2)
    res["span"] = round(offs[-1] - ons[0], 3)
    allf = F[~np.isnan(F)]
    res["f0_med"] = round(float(np.median(allf)), 1) if len(allf) else None
    res["bands"] = L.bands(m)
    ls = [o["lufs"] for o in res["sent"] if o["lufs"] is not None and L.nwords(o["text"]) >= 3]
    res["lufs_spread"] = round(max(ls) - min(ls), 2) if len(ls) > 1 else 0.0
    return res


def line(res):
    if "error" in res:
        return f"{res['file']} ERROR {res['error']}"
    bad = sum(len(o.get("diff", [])) for o in res["sent"])
    out = (f"{res['file']:8s} span {res['span']:5.2f}s  {res['wps_speaking']:4.2f} w/s  lufs {res['raw_lufs']:6.2f} pk {res['raw_peak']:.2f}  "
           f"f0 {res['f0_med']} Hz  lead {res['lead_s']:.3f}{' CLIPSTART' if res['clipped_start'] else ''}{' CLIPEND' if res['clipped_end'] else ''}"
           f"{' PRE-EXTRA' if res['pre_extra'] else ''}  tail+ {res['tail_extra_db']}  wrong {bad}  take_diff {res['take_diff'] or '-'}")
    for o in res["sent"]:
        e = o["end"] or {}
        f = o["f0"] or {}
        out += (f"\n    {o['line']} {o['dur']:5.2f}s {o['wps']:4.2f}w/s in {o['inner_s']:.2f} gap {o['gap_after'] if o['gap_after'] is not None else ' -  '}"
                f"  lufs {o['lufs']}  f0 {f.get('med', 0):5.1f} r{f.get('range_st', 0):4.1f} sd{f.get('sd_st', 0):4.1f}  end {e.get('rise_st', 0):+5.2f}/{e.get('end_vs_med_st', 0):+5.2f}"
                f"  p {o.get('min_p', 0):.2f}  '{o.get('heard', '')}'" + (f"  DIFF {o['diff']}" if o.get("diff") else ""))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for sub in args:
        folder = L.TAKES / sub
        for mp3 in sorted(folder.glob("*.mp3")):
            pj = mp3.with_suffix(".probe.json")
            if pj.exists() and "--force" not in sys.argv:
                res = json.loads(pj.read_text(encoding="utf-8"))
            else:
                meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
                res = probe(mp3, meta["lines"])
                res["tag_text"] = meta["text"]
                res["stability"] = meta.get("stability")
                pj.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"[{sub}] " + line(res), flush=True)


if __name__ == "__main__":
    main()
