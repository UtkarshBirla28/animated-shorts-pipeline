"""TONE-COLOUR CHECK of the reused v1 takes beside the new v3 takes (the lead's decision 3; script voice test 4), by
measurement (nothing is played). Every unit of a build (the cut of its take, gained to -18 LUFS) gets a timbre
fingerprint: mean MFCC 2-13 (pt_lib.mfcc_mean), the long-term spectrum bands (1-4 kHz and 4-10 kHz against 100-1000 Hz),
the spectral centroid, the upper band edge (the frequency under which 99 % of the energy sits: the codec / model
bandwidth) and the pitch median.
  python pt3_tone.py [--dir _v3]      -> <dir>/tone_check.json
A reused take PASSES when its mean MFCC distance to the NEW units of the same speaker is no larger than the largest
mean distance of a new unit of that speaker to the other new ones (plus 10 %). (The band edge is printed, not gated:
it follows the words, not the voice.) Then a listener cannot tell it apart by tone colour any more than he can tell two new takes apart. The distance to the
OTHER speakers is printed as the scale (a different voice)."""
import json
import sys
from pathlib import Path

import numpy as np

import pt_lib as L
import pt3_lib as V

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
D = Path(arg("--dir", "_v3"))
if not D.is_absolute():
    D = L.HERE / D
build = json.loads((D / "_build.json").read_text(encoding="utf-8"))


def edge(m):
    win = 4096
    n = len(m) // win
    if n < 1:
        return None
    P = np.mean(np.abs(np.fft.rfft(m[:n * win].reshape(n, win) * np.hanning(win), axis=1)) ** 2, axis=0)
    f = np.fft.rfftfreq(win, 1 / L.SR)
    c = np.cumsum(P) / np.sum(P)
    return float(f[np.searchsorted(c, 0.999)])


U = {}
for u in build["units"]:
    lid = u["line"]
    m = L.read(L.TAKES / (u["take"] + ".mp3"))
    seg = m[int(u["take_on"] * L.SR):int(u["take_off"] * L.SR)]
    if lid in U:
        seg = np.concatenate([U[lid]["seg"], seg])
    U[lid] = {"seg": seg, "take": u["take"], "reused": u["reused_v1_take"], "speaker": V.SPEAKER[lid]}
for lid, q in U.items():
    seg = q["seg"] * 10 ** ((-18 - L.lufs(q["seg"])) / 20)
    T, F = L.f0_track(seg)
    q.update({"mfcc": L.mfcc_mean(seg), "bands": L.bands(seg), "edge_hz": edge(seg), "f0": float(np.nanmedian(F)) if (~np.isnan(F)).any() else None,
              "dur": len(seg) / L.SR})
dist = lambda a, b: float(np.linalg.norm(U[a]["mfcc"] - U[b]["mfcc"]))
res = {"units": {k: {"take": q["take"], "reused": q["reused"], "speaker": q["speaker"], "dur_s": round(q["dur"], 2), "f0_med": q["f0"] and round(q["f0"], 1),
                     **q["bands"], "edge_hz": q["edge_hz"] and round(q["edge_hz"])} for k, q in U.items()}, "speakers": {}, "reused": []}
allok = True
for sp in ("N", "T", "D", "KID"):
    ids = [k for k, q in U.items() if q["speaker"] == sp]
    new, old = [k for k in ids if not U[k]["reused"]], [k for k in ids if U[k]["reused"]]
    others = [k for k, q in U.items() if q["speaker"] != sp]
    nn = [dist(a, b) for i, a in enumerate(new) for b in new[i + 1:]]
    per_new = {a: float(np.mean([dist(a, b) for b in new if b != a])) for a in new} if len(new) > 1 else {}
    cross = [dist(a, b) for a in ids for b in others]
    S = {"new": new, "reused": old, "new_vs_new_mfcc": {"median": round(float(np.median(nn)), 2), "max": round(max(nn), 2)} if nn else None,
         "largest_mean_distance_of_a_new_unit": round(max(per_new.values()), 2) if per_new else None,
         "to_other_speakers_mfcc": {"median": round(float(np.median(cross)), 2), "min": round(min(cross), 2)} if cross else None,
         "edge_hz_new": [round(U[k]["edge_hz"]) for k in new]}
    res["speakers"][sp] = S
    print(f"\n{sp} ({V.NAME[sp]}): {len(new)} new, {len(old)} reused. new-vs-new MFCC distance {S['new_vs_new_mfcc']}; a new unit's mean distance to the other new ones "
          f"is at most {S['largest_mean_distance_of_a_new_unit']}; to OTHER speakers {S['to_other_speakers_mfcc']}")
    for k in ids:
        q = U[k]
        line = f"   {k} {'REUSED' if q['reused'] else 'new   '} {q['take']:16s} {q['dur']:.2f}s f0 {q['f0'] and round(q['f0'])} Hz mid {q['bands'].get('mid_db')} hi {q['bands'].get('hi_db')} centroid {q['bands'].get('centroid_hz')} edge {q['edge_hz'] and round(q['edge_hz'])} Hz"
        if q["reused"]:
            if len(new) > 1:
                dm = float(np.mean([dist(k, b) for b in new]))
                lim = max(per_new.values()) * 1.10
                e_new = np.median([U[b]["edge_hz"] for b in new])
                ok = bool(dm <= lim)      # the band edge is printed only: it follows the words (new tourist takes: 4.4-11.6 kHz), not the voice
                res["reused"].append({"id": k, "take": q["take"], "speaker": sp, "mean_mfcc_distance_to_new": round(dm, 2), "limit": round(lim, 2),
                                      "edge_hz": round(q["edge_hz"]), "edge_hz_new_median": round(float(e_new)), "ok": ok})
                line += f"   -> mean distance to the new units {dm:.2f} (limit {lim:.2f}), edge vs new {q['edge_hz'] - e_new:+.0f} Hz: {'PASS' if ok else 'FAIL'}"
                allok = allok and ok
            else:
                same = [dist(k, b) for b in old if b != k]
                res["reused"].append({"id": k, "take": q["take"], "speaker": sp, "note": "no new take of this speaker in the film: nothing to clash with",
                                      "mfcc_distance_to_the_other_reused": [round(v, 2) for v in same], "ok": True})
                line += f"   -> every line of this speaker is a v1 take (distance to the others {[round(v, 2) for v in same]}): nothing to clash with"
        print(line)
res["passed"] = allok
(D / "tone_check.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
print("\nTONE-COLOUR CHECK", "PASSED" if allok else "FAILED")
