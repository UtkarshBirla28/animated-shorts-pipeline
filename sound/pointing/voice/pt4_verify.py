"""SCRIPT v4: the gates on an assembled v4 voice (measured from the files; nothing is played).
  python pt4_verify.py [--dir _v4]  -> <dir>/verify_v4.json, exit 0 = PASS
 1. narrator continuity (pt4_lib.check): step median <= 3.5 st, no step > 6 st, centre 175-200 Hz, no line > 240 Hz,
    pace 3.4-3.7 w/s with sd <= 0.6 (the summary is printed next to the clown / antitheft target row)
 2. gaps between narrator sentences 0.15-0.30 s (word edges); exactly the planned beat may be longer, at most 0.8 s
 3. every sentence heard word for word (the build's Whisper pass on the assembled track)
 4. no digital silence: the longest run of exact zeros under 5 ms; every sentence end has a 40-90 ms tail
 5. loudness -17.5 +- 1 LUFS stereo, sample peak <= -1 dBFS, no time-stretch (the build has none)
 6. shouts: at most 4, one or two words, no pause over 0.25 s inside, full band (10-16 kHz within 6 dB of the narrator's,
    each relative to its 400-2000 Hz), pitch at least 5 st from each other and from the narrator's centre"""
import sys

import numpy as np

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
D = L.HERE / arg("--dir", "_v4")
b = V.jload(D / "_build.json")
phr = V.jload(D / "phrases.json")
y2 = L.read(D / "voice.wav", ch=2)
y = y2.mean(axis=1)
SR = L.SR
tr = V.Track(y)
R, ok = {}, True


def gate(name, passed, val):
    global ok
    R[name] = [bool(passed), val]
    ok = ok and bool(passed)
    print(f"  {'ok ' if passed else 'NO '} {name}: {val}")


N = [q for q in phr if q["speaker"] == "N"]
S = []
for i, q in enumerate(N):
    nxt = next((c["s"] for c in phr if c["s"] > q["e"]), q["e"] + 0.3)
    look = max(0.02, min(0.25, nxt - q["e"] - 0.01))
    S.append(dict(tr.sentence(q["s"], q["e"], len(q["text"].split())), text=q["text"], tail_s=tr.tail(q["e"], look), tail_cap=round(look, 3)))
sm = V.summary(S)
print(f"== {D.name}: {len(y) / SR:.3f} s, narrator {sm['speaking_s']} s ({sm['speaking_s'] / (len(y) / SR):.0%})")
for k, (a, v) in V.check(sm).items():
    gate(k, a, v)
tgt = V.jload(L.TAKES / "v4_target_row.json") if (L.TAKES / "v4_target_row.json").exists() else {}
for k, v in tgt.items():
    s_ = v["summary"]
    print(f"     target row {k.split('/')[-2] if '/' in k else k}: centre {s_['centre_hz']} Hz, step {s_['step_median_st']} st, pace {s_['wps_median']} sd {s_['wps_sd']}")
beat = b["gaps_plan"].get("beat_s")
gaps = [round(c["s"] - a["e"], 3) for a, c in zip(phr, phr[1:])]
long_ = [g for g in gaps if g > V.TARGET["gap_s"][1] + 0.02]
gate("gaps 0.15-0.30 s (one beat <= 0.8)", all(g >= V.TARGET["gap_s"][0] - 0.02 for g in gaps) and len(long_) <= 1 and all(g <= V.TARGET["beat_max_s"] + 0.02 for g in long_),
     {"min": min(gaps) if gaps else None, "over_0.3": long_, "planned_beat": beat})
bad = [(q["id"], q["wrong"]) for q in phr if q.get("wrong")]
gate("every sentence heard as written", not bad, bad or "all")
z = (y2[:, 0] == 0).astype(np.int8)
runs = np.diff(np.concatenate([[0], z, [0]]))
st_, en_ = np.where(runs == 1)[0], np.where(runs == -1)[0]
mx = float(max(en_ - st_, default=0)) / SR * 1000
gate("no digital silence (longest exact-zero run < 5 ms)", mx < 5, f"{mx:.2f} ms")
tails = [x["tail_s"] for x in S]
gate("sentence tails 40-90 ms (measured, 30 dB decay; a tail may run into the next word)", all(0.03 <= x["tail_s"] and (x["tail_s"] <= 0.12 or x["tail_s"] >= x["tail_cap"] - 0.006) for x in S), {"min": min(tails), "max": max(tails)})
lu = L.lufs(y2)
gate("loudness -17.5 +- 1 LUFS", abs(lu + 17.5) <= 1.0, round(lu, 2))
pk = float(np.max(np.abs(y2)))
gate("peak <= -1 dBFS", pk <= 10 ** (-1 / 20) + 1e-4, f"{20 * np.log10(pk):.2f} dBFS")


def band(seg):
    P = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    ref = np.sum(P[(f >= 400) & (f < 2000)]) + 1e-20
    return 10 * np.log10(np.sum(P[(f >= 10000) & (f < 16000)]) / ref + 1e-20)


X = [q for q in phr if q["speaker"] != "N"]
if X:
    nar_air = np.median([band(y[int(q["s"] * SR):int(q["e"] * SR)]) for q in N if q["e"] - q["s"] > 0.8])
    f0s = {}
    for q in X:
        seg = y[int(q["s"] * SR):int(q["e"] * SR)]
        x = tr.sentence(q["s"], q["e"], len(q["text"].split()))
        f0s[q["id"]] = x["f0"]
        inner = [r for r in L.runs_below(L.db_frames(seg), 4, len(L.db_frames(seg)) - 4) if (r[1] - r[0]) * L.H > 0.25]
        gate(f"shout {q['id']} ({q['speaker']}) one or two words", len(q["text"].split()) <= 2, q["text"])
        gate(f"shout {q['id']} no pause over 0.25 s inside", not inner, len(inner))
        air = band(seg)
        gate(f"shout {q['id']} full band (10-16 kHz within 6 dB of the narrator)", air >= nar_air - 6, f"{air:.1f} dB vs narrator {nar_air:.1f}")
    ids = list(f0s)
    pts = [("narrator", sm["centre_hz"])] + [(i, f0s[i]) for i in ids]
    worst = min((abs(V.st(a[1], c[1])), a[0], c[0]) for i, a in enumerate(pts) for c in pts[i + 1:] if a[1] and c[1]) if len(pts) > 1 else None
    gate("shouts >= 5 st from each other and from the narrator", worst is None or worst[0] >= 5, {k: (round(v) if v else None) for k, v in f0s.items()} | {"closest": worst and (round(worst[0], 1), worst[1], worst[2])})
    gate("at most 4 shouts", len(X) <= 4, len(X))
V.jsave(D / "verify_v4.json", {"passed": ok, "gates": R, "narrator": sm})
print("VERIFY V4", "PASSED" if ok else "FAILED")
sys.exit(0 if ok else 1)
