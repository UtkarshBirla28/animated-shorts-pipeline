"""SCRIPT v3: the swappable openings. Cuts the assembled v3 voice into the LEAD OPENING (v3_n01-n03 + the laugh + v3_d01 +
v3_t01) and the BODY (v3_n04 to the end), sample-exact (both are slices of the same voice.wav, cut in the true silence
before v3_n04), and makes the ALTERNATE OPENING (v3_a01, v3_a02 + v3_d01 + v3_t01, from its own build) end with the same
lead-in, so   opening_alt + body   is a finished film voice too (also written, with its word files).
  python pt3_split.py [--dir _v3] [--alt _v3/_alt]
-> <dir>/segments/opening_lead/, opening_alt/, body/, full_with_alt_opening/ (voice.wav, words.json, words_spoken.json,
   phrases.json, captions.json; body + lead also carry the three stems) + segments/split.json"""
import json
import subprocess
import sys

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
D = L.HERE / arg("--dir", "_v3")
A = L.HERE / arg("--alt", "_v3/_alt")
SR = L.SR
FIRST = "v3_n04"
J = lambda p: json.loads(p.read_text(encoding="utf-8"))


def wav(path, y):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(path)],
                   input=y.astype(np.float32).tobytes(), check=True)


def tables(src):
    return J(src / "words.json"), J(src / "words_spoken.json"), J(src / "phrases.json"), J(src / "captions.json")


def write_tables(o, words, spoken, phr, caps, keep, t0):
    sh = lambda w: {**w, "s": round(w["s"] - t0, 3), "e": round(w["e"] - t0, 3)}
    shc = lambda c: {**sh(c), "f": round((c["s"] - t0) * 30), "fe": round((c["e"] - t0) * 30)}
    o.mkdir(parents=True, exist_ok=True)
    W = lambda n, obj: (o / n).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    W("words.json", [sh(w) for w in words if keep(w)])
    W("words_spoken.json", [sh(w) for w in spoken if keep(w)])
    ph = [sh(p) for p in phr if keep(p)]
    for i, p in enumerate(ph):
        p["i"] = i
    W("phrases.json", ph)
    W("captions.json", {**{k: v for k, v in caps.items() if k != "chunks"}, "chunks": [shc(c) for c in caps["chunks"] if keep(c)]})


x = L.read(D / "voice.wav", ch=2)
words, spoken, phr, caps = tables(D)
k = next(i for i, p in enumerate(phr) if p["id"] == FIRST)
a_end, b_on = phr[k - 1]["e"], phr[k]["s"]
m = L.read(D / "stems" / "dialogue.wav", ch=2).mean(axis=1)
seg = m[int(a_end * SR):int(b_on * SR)]
lo, hi = len(seg) // 3, 2 * len(seg) // 3
cut = int(a_end * SR) + lo + int(np.argmin(np.abs(seg[lo:hi])))
t_cut = cut / SR
out = D / "segments"
wav(out / "opening_lead" / "voice.wav", x[:cut])
write_tables(out / "opening_lead", words, spoken, phr, caps, lambda w: w["s"] < t_cut, 0.0)
wav(out / "body" / "voice.wav", x[cut:])
write_tables(out / "body", words, spoken, phr, caps, lambda w: w["s"] >= t_cut, t_cut)
for st in ("dialogue", "laughs", "phone"):
    y = L.read(D / "stems" / f"{st}.wav", ch=2)
    wav(out / "opening_lead" / "stems" / f"{st}.wav", y[:cut])
    wav(out / "body" / "stems" / f"{st}.wav", y[cut:])
info = {"source": "voice.wav of this folder's parent", "cut_s": round(t_cut, 4), "cut_sample": cut, "cut_level": float(abs(m[cut])),
        "opening_lead_lines": [p["id"] for p in phr[:k]], "body_lines": [p["id"] for p in phr[k:]], "opening_last_word_end_s": a_end,
        "body_first_word_in_full_s": b_on, "lead_in_body_s": round(b_on - t_cut, 4), "silence_between_s": round(b_on - a_end, 4),
        "opening_lead_duration_s": round(t_cut, 3), "body_duration_s": round((len(x) - cut) / SR, 3)}
if (A / "voice.wav").exists():
    xa = L.read(A / "voice.wav", ch=2)
    wa, sa, pa, ca = tables(A)
    a_end2 = pa[-1]["e"]                                   # "nothing!" ends
    cut_a = int(round((a_end2 + (t_cut - a_end)) * SR))    # the same silence after it as in the lead opening
    ya = xa[:cut_a]
    if len(ya) < cut_a:
        ya = np.concatenate([ya, np.zeros((cut_a - len(ya), 2))])
    ta = cut_a / SR
    wav(out / "opening_alt" / "voice.wav", ya)
    write_tables(out / "opening_alt", wa, sa, pa, ca, lambda w: True, 0.0)
    full = np.concatenate([ya, x[cut:]])
    wav(out / "full_with_alt_opening" / "voice.wav", full)
    o = out / "full_with_alt_opening"
    sh = lambda w: {**w, "s": round(w["s"] - t_cut + ta, 3), "e": round(w["e"] - t_cut + ta, 3)}
    W = lambda n, obj: (o / n).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    W("words.json", wa + [sh(w) for w in words if w["s"] >= t_cut])
    W("words_spoken.json", sa + [sh(w) for w in spoken if w["s"] >= t_cut])
    ph = pa + [sh(p) for p in phr if p["s"] >= t_cut]
    for i, p in enumerate(ph):
        p["i"] = i
    W("phrases.json", ph)
    W("captions.json", {**{k_: v for k_, v in caps.items() if k_ != "chunks"},
                        "chunks": ca["chunks"] + [{**sh(c), "f": round((c["s"] - t_cut + ta) * 30), "fe": round((c["e"] - t_cut + ta) * 30)}
                                                  for c in caps["chunks"] if c["s"] >= t_cut]})
    info.update({"opening_alt_lines": [p["id"] for p in pa], "opening_alt_duration_s": round(ta, 3),
                 "full_with_alt_opening_duration_s": round(len(full) / SR, 3), "body_shift_with_alt_s": round(ta - t_cut, 3),
                 "alt_note": "the alternate hook (SCRIPT_v3 section 3) for a later A/B: opening_alt + body. No laugh bed under the alternate narrator "
                             "lines (its sound plan is different); the tourist's own laugh before his words is in. Every body time moves by "
                             "body_shift_with_alt_s."})
info["how_to_swap"] = ("any new opening that ends with the same lead-in (lead_in_body_s of silence before the body's first word) can be put in front "
                       "of body/voice.wav; the body audio never changes")
(out / "split.json").write_text(json.dumps(info, indent=1), encoding="utf-8")
print(json.dumps(info, indent=1))
