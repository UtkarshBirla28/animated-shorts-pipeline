"""Assemble the clown narration from the picked takes -> voice.wav (48 kHz stereo), words.json (caption tokens),
words_spoken.json (one entry per spoken word), phrases.json, _build.json (voice_info.json is written by clown_verify.py).

  python clown_build.py [--target -17.2] [--gapscale 0.45] [--drop 20,12]        reads takes/picks.json

picks.json: {"sent": {"0": "p1/t1", ...}, "why": {...}}   sentence index -> the take it is cut from.

Method (no stretch, no pitch or dynamics processing; gains only):
 - --target is the BS.1770 integrated loudness of the finished STEREO file (two equal channels read 3.01 LU over the
   same sound in mono). Every used portion (the run of sentences taken from one take) is gained to it; then a sentence
   that still sits more than 1.2 LU from the target is gained back to that limit (TTS loudness jumps). If the peak of
   the assembly passes 0.89, the target is lowered by the excess and everything is rebuilt (so no limiter, no trim).
 - sentence spans = acoustic speech on/off (10 ms RMS windows every 5 ms over -45 dBFS) at the final gain;
 - every sentence is lifted out with up to 30 ms before / 50 ms after (never more than half of the silence there),
   8 ms fades at both ends (the ends are inside silence), and laid on a silent canvas so that the true silence
   between sentence i and i+1 is the target gap:
     normal      clip(gapscale x the take's own gap, 0.15, 0.185)   (0.16 where the two sentences come from two takes)
     rapid-fire  clip(gapscale x the take's own gap, 0.12, 0.15)    (0.13 across two takes)
     the two beats: 0.365 s before "Just one in four saw the clown.", 0.335 s before "Did you see the money?"
 - a silence INSIDE a sentence longer than 0.22 s is cut to 0.18 s (middle of the silence, 10 ms crossfade);
 - first word starts at 0.100 s, the file ends 0.150 s after the last word.
Word times: the ElevenLabs character times of the take, moved by the same offsets; the first / last word of each
sentence is pinned to the acoustic on / off."""
import json
import re
import subprocess
import sys

import numpy as np

import clown_lib as L
import clown_probe as P

sys.stdout.reconfigure(encoding="utf-8")
SR = L.SR
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
TARGET_ST = float(arg("--target", -17.2))
DROP = [int(v) for v in arg("--drop", "").split(",") if v]
GAPSCALE = float(arg("--gapscale", 0.45))
SENT_TOL = 1.2      # a sentence more than this many LU from the target is gained back to that limit
PEAK_MAX = 0.89
LEAD, TAILEND = 0.100, 0.150
PRE, POST, FADE = 0.030, 0.050, 0.008
INNER_MAX, INNER_TO = 0.22, 0.18
picks = json.loads((L.TAKES / "picks.json").read_text(encoding="utf-8"))
src = {int(i): tuple(v.split("/")) for i, v in picks["sent"].items()}
order = [i for i in range(len(L.S)) if i not in DROP]
portions = []      # runs of consecutive sentences from the same take
for i in order:
    if portions and portions[-1]["src"] == src[i] and portions[-1]["idx"][-1] == i - 1:
        portions[-1]["idx"].append(i)
    else:
        portions.append({"src": src[i], "idx": [i]})


def take_spoken(folder, take):
    mj = L.TAKES / folder / f"{take}.meta.json"
    if mj.exists() and json.loads(mj.read_text(encoding="utf-8")).get("sentences"):
        return json.loads(mj.read_text(encoding="utf-8"))["sentences"]
    text = (L.TAKES / folder / f"{take}.txt").read_text(encoding="utf-8")
    for a in range(len(L.S)):
        for b in range(a + 1, len(L.S) + 1):
            if L.text_of(range(a, b)) == text:
                return list(range(a, b))
    raise SystemExit(f"text of {folder}/{take} is not a run of script sentences")


def assemble(target):
    """target = MONO loudness of every portion"""
    segs = []
    for po in portions:
        folder, take = po["src"]
        mp3 = L.TAKES / folder / f"{take}.mp3"
        spoken = take_spoken(folder, take)
        m = L.read(mp3)
        dur = len(m) / SR
        words = L.align_words(mp3.with_suffix(".json"))
        g0 = 10 ** ((target - L.lufs(m)) / 20)
        for _ in range(4):      # the gain depends on the span, the span (a threshold) on the gain: settle
            d = L.db_frames(m * g0)
            sp = P.sentence_spans(spoken, words, d, dur)
            used = [o for o in sp if o["i"] in po["idx"]]
            a, b = used[0]["on"], used[-1]["off"]
            g0 *= 10 ** ((target - L.lufs((m * g0)[int(max(0, a - 0.02) * SR):int((b + 0.02) * SR)])) / 20)
        mg = m * g0
        d = L.db_frames(mg)
        sp = P.sentence_spans(spoken, words, d, dur)
        po["gain_db"] = round(20 * np.log10(g0), 2)
        po["raw_lufs_take"] = round(L.lufs(m), 2)
        for q, o in enumerate(sp):
            if o["i"] not in po["idx"]:
                continue
            on, off = o["on"], o["off"]
            sil_before = (on - sp[q - 1]["off"]) if q else on
            sil_after = (sp[q + 1]["on"] - off) if q + 1 < len(sp) else dur - off
            pre = max(0.0, min(PRE, sil_before / 2 if q else sil_before))
            post = max(0.0, min(POST, sil_after / 2 if q + 1 < len(sp) else sil_after))
            a, b = int(round((on - pre) * SR)), int(round((off + post) * SR))
            x = mg[a:b].copy()
            ws = [[w, s - on, e - on] for w, s, e in o["ws"]]
            ws[0][1], ws[-1][2] = 0.0, off - on
            inner_cuts = []
            fa, fb = int(on / 0.005) + 4, int(off / 0.005) - 4
            for r0, r1 in reversed(P.runs_below(d, fa, fb)):
                s_len = (r1 - r0) * 0.005
                if s_len > INNER_MAX + 1e-9:
                    rm = s_len - INNER_TO
                    mid = (r0 * 0.005 + r1 * 0.005 + 0.010) / 2 - (on - pre)            # in x time
                    c0, c1 = int(round((mid - rm / 2) * SR)), int(round((mid + rm / 2) * SR))
                    fl = int(0.010 * SR)
                    r = np.linspace(0, 1, fl)
                    head, tail = x[:c0].copy(), x[c1:].copy()
                    head[-fl:] = head[-fl:] * (1 - r) + x[c1 - fl:c1] * r
                    x = np.concatenate([head, tail])
                    tcut = mid - pre                                                    # rel on
                    wa = [w[0] for w in ws if w[1] < tcut]
                    wb = [w[0] for w in ws if w[1] >= tcut]
                    for w in ws:
                        if w[1] >= tcut:
                            w[1] -= rm
                        if w[2] >= tcut:
                            w[2] -= rm
                    off -= rm
                    inner_cuts.append({"between": f"{wa[-1] if wa else ''} | {wb[0] if wb else ''}", "was_s": round(s_len, 3), "now_s": INNER_TO})
            sl = L.lufs(x[int(pre * SR):int((pre + off - on) * SR)])
            sg = 0.0
            if sl > target + SENT_TOL:
                sg = target + SENT_TOL - sl
            elif sl < target - SENT_TOL:
                sg = target - SENT_TOL - sl
            x *= 10 ** (sg / 20)
            fl = int(FADE * SR)
            r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fl))
            x[:fl] *= r
            x[-fl:] *= r[::-1]
            # the span at the sentence's own final gain (the threshold moves with the gain)
            dd = L.db_frames(x)
            loud = np.where(dd > P.THR)[0]
            on2, off2 = loud[0] * 0.005 + 0.005, loud[-1] * 0.005 + 0.005
            ln2 = off2 - on2
            shift = on2 - pre                    # the on moved by this much inside x
            for w in ws:
                w[1], w[2] = w[1] - shift, w[2] - shift
            ws[0][1], ws[-1][2] = 0.0, ln2
            for k in range(len(ws)):
                ws[k][1] = min(max(0.0, ws[k][1], ws[k - 1][2] if k else 0.0), ln2 - 0.03)
                ws[k][2] = min(ln2, max(ws[k][2], ws[k][1] + 0.03))
            ws[-1][2] = ln2
            segs.append({"i": o["i"], "x": x, "pre": on2, "len": ln2, "ws": ws, "src": f"{folder}/{take}",
                         "native_gap": o["gap_after"] if (q + 1 < len(sp) and sp[q + 1]["i"] in po["idx"]) else None,
                         "take_on": round(o["on"], 3), "take_off": round(o["off"], 3), "inner_cuts": inner_cuts,
                         "gain_db": po["gain_db"], "sent_gain_db": round(sg, 2), "lufs_before_sent_gain": round(sl, 2)})
    segs.sort(key=lambda s: order.index(s["i"]))
    t = LEAD
    gaps = []
    for k, s in enumerate(segs):
        s["on"], s["off"] = t, t + s["len"]
        if k + 1 < len(segs):
            nxt = segs[k + 1]["i"]
            if nxt in L.BEAT_BEFORE:
                g, kind = L.BEAT_BEFORE[nxt], "beat"
            elif s["i"] in L.GAP_AFTER_RAPID and nxt == s["i"] + 1:
                g, kind = (float(np.clip(GAPSCALE * s["native_gap"], 0.12, 0.15)) if s["native_gap"] is not None else 0.13), "rapid"
            else:
                g, kind = (float(np.clip(GAPSCALE * s["native_gap"], 0.15, 0.185)) if s["native_gap"] is not None else 0.16), "normal"
            g = round(g / 0.005) * 0.005
            was = None
            if s["i"] in L.GAP_OVERRIDE and nxt == s["i"] + 1 and "--no-override" not in sys.argv:
                was, g, kind = round(g, 3), L.GAP_OVERRIDE[s["i"]], "answer"      # edit audit: a deliberate longer beat
            gaps.append({"after": s["i"], "before": nxt, "kind": kind, "target_s": round(g, 3), "native_s": s["native_gap"],
                         **({"was_s": was, "added_s": round(g - was, 3)} if was is not None else {})})
            t = s["off"] + g
    total = segs[-1]["off"] + TAILEND
    N = int(round(total * SR))
    y = np.zeros(N)
    for s in segs:
        a = int(round((s["on"] - s["pre"]) * SR))
        seg = s["x"][:max(0, N - a)]
        y[a:a + len(seg)] += seg
    return segs, gaps, y, total


target = TARGET_ST - 3.01
for attempt in range(4):
    segs, gaps, y, total = assemble(target)
    pk = float(np.max(np.abs(y)))
    if pk <= PEAK_MAX + 1e-4:
        break
    print(f"  peak {pk:.3f} at stereo target {target + 3.01:.2f}: lowering the target by {20 * np.log10(pk / PEAK_MAX) + 0.03:.2f} dB")
    target -= 20 * np.log10(pk / PEAK_MAX) + 0.03
st = np.stack([y, y], axis=1)
print(f"peak {pk:.3f}  stereo lufs {L.lufs(st):.2f} (asked {TARGET_ST}, used {target + 3.01:.2f})  duration {total:.3f}")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(L.HERE / "voice.wav")],
               input=st.astype(np.float32).tobytes(), check=True)

spoken_words, disp_words, phrases = [], [], []
for s in segs:
    i = s["i"]
    ws = [{"w": w, "s": round(s["on"] + a, 3), "e": round(s["on"] + b, 3)} for w, a, b in s["ws"]]
    assert len(ws) == len(L.S[i][0].split()), (i, [w["w"] for w in ws])
    for w, tok in zip(ws, L.S[i][0].split()):       # a take may use other punctuation / capitals: the script's words stand
        assert L.norm_text(w["w"]) == L.norm_text(tok), (w, tok)
        w["w"] = tok
    spoken_words += ws
    markup = L.S[i][1] or L.S[i][0]
    k = 0
    for mm in re.finditer(r"\{([^|}]*)\|([^}]*)\}|(\S+)", markup):
        if mm.group(3) is not None:
            disp_words.append(dict(ws[k]))
            k += 1
        else:
            n = len(mm.group(2).split())
            disp_words.append({"w": mm.group(1), "s": ws[k]["s"], "e": ws[k + n - 1]["e"]})
            k += n
    assert k == len(ws)
    phrases.append({"i": i, "beat": L.S[i][2], "s": ws[0]["s"], "e": ws[-1]["e"], "markup": markup, "style": None})
for a, b in zip(spoken_words, spoken_words[1:]):
    assert b["s"] >= a["e"] - 1e-6 and a["e"] > a["s"], (a, b)
W = lambda name, obj: (L.HERE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
W("words.json", disp_words)
W("words_spoken.json", spoken_words)
W("phrases.json", phrases)
W("_build.json", {"target_stereo_lufs_asked": TARGET_ST, "target_stereo_lufs_used": round(target + 3.01, 2), "gap_scale": GAPSCALE,
                  "sentence_loudness_tolerance_lu": SENT_TOL, "dropped_sentences": DROP, "peak": round(pk, 4), "duration_s": round(total, 3),
                  "portions": [{"take": "/".join(p["src"]), "sentences": p["idx"], "gain_db": p["gain_db"], "raw_lufs_take": p["raw_lufs_take"]} for p in portions],
                  "sentences": [{"i": s["i"], "take": s["src"], "take_on": s["take_on"], "take_off": s["take_off"], "on": round(s["on"], 3),
                                 "off": round(s["off"], 3), "inner_cuts": s["inner_cuts"], "portion_gain_db": s["gain_db"],
                                 "sentence_gain_db": s["sent_gain_db"], "lufs_before_sentence_gain": s["lufs_before_sent_gain"]} for s in segs],
                  "gaps": gaps})
print(f"{len(spoken_words)} spoken words, {len(disp_words)} caption tokens, {len(phrases)} phrases; first word {spoken_words[0]['s']:.3f}, last word end {spoken_words[-1]['e']:.3f}")
