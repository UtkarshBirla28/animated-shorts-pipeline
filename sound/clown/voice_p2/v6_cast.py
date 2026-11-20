"""Casting measurements for the character voices (and later their takes).
  python v6_cast.py [folders ...]     default: every takes/cast_* and takes/ch_* folder

Per take: v6_probe numbers (whisper per sentence, f0, end contour, clipped edges) plus
  timbre      mean MFCC 2-13 of the speech frames (a crude fingerprint) and the spectral centroid
  express     f0 p10-p90 range and sd (semitones), loudness contour range (dB, 50 ms windows, speech only)
  artefacts   longest inner silence, sound outside the words, clipped start / end
Then the distance table: every candidate against James (the narrator, measured on his chosen-style takes) and
against the other roles' candidates: f0 distance (semitones between medians) and MFCC distance (euclidean)."""
import json
import sys

import numpy as np

import v6_lib as L
import v6_probe as P

sys.stdout.reconfigure(encoding="utf-8")


def measure(mp3):
    pj = mp3.with_suffix(".probe.json")
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    if pj.exists() and "--force" not in sys.argv:
        res = json.loads(pj.read_text(encoding="utf-8"))
    else:
        res = P.probe(mp3, meta["lines"])
        res["tag_text"] = meta["text"]
        res["stability"] = meta.get("stability")
    if "timbre" not in res or "--force" in sys.argv:
        m = L.read(mp3)
        m = m * 10 ** ((-18 - L.lufs(m)) / 20)
        on, off = res["sent"][0]["on"], res["sent"][-1]["off"]
        seg = m[int(on * L.SR):int(off * L.SR)]
        mf = L.mfcc_mean(seg)
        T, F = L.f0_track(m)
        d = L.db_frames(seg, hop_s=0.05, win_s=0.05)
        d = d[d > -45]
        res["timbre"] = {"mfcc": [round(float(v), 3) for v in mf], **L.bands(seg)}
        res["express"] = {**L.f0_stats(T, F, on, off), "level_range_db": round(float(np.percentile(d, 95) - np.percentile(d, 10)), 1) if len(d) > 4 else None}
        res["voice"] = meta["voice"]
        res["candidate"] = meta.get("candidate")
        res["role"] = meta.get("role")
        pj.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    return res


def james_ref():
    """James's timbre / f0 over the narrator takes probed so far"""
    mf, f0 = [], []
    for c in ("c01", "c03", "c04", "c05", "c06", "c07", "c09", "c10", "c11", "c12"):     # narrator chunks only
        for t in ("t1", "t3"):
            mp3 = L.TAKES / c / f"{t}.mp3"
            if mp3.exists() and mp3.with_suffix(".probe.json").exists():
                r = measure(mp3)
                mf.append(r["timbre"]["mfcc"])
                f0.append(r["express"]["med"])
    print(f"JAMES reference from {len(mf)} narrator takes; f0 medians {sorted(round(v) for v in f0)}")
    return np.mean(np.array(mf), axis=0), float(np.median(f0))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    folders = [L.TAKES / a for a in args] if args else sorted(list(L.TAKES.glob("cast_*")) + list(L.TAKES.glob("ch_*")))
    rows = []
    for fo in folders:
        for mp3 in sorted(fo.glob("*.mp3")):
            r = measure(mp3)
            rows.append((fo.name, mp3.stem, r))
            print(f"[{fo.name}] " + P.line(r), flush=True)
            e = r["express"]
            print(f"      timbre centroid {r['timbre'].get('centroid_hz')} Hz mid {r['timbre'].get('mid_db')} hi {r['timbre'].get('hi_db')}  "
                  f"f0 {e.get('med')} Hz (p10 {e.get('p10')} p90 {e.get('p90')}) range {e.get('range_st')} st sd {e.get('sd_st')}  level range {e.get('level_range_db')} dB")
    jm, jf = james_ref()
    print(f"\nJAMES reference: f0 median {jf:.1f} Hz")
    print("\nDISTANCES  (f0: semitones between medians; mfcc: euclidean distance of mean MFCC 2-13)")
    for fo, st, r in rows:
        mf = np.array(r["timbre"]["mfcc"])
        f = r["express"]["med"]
        others = []
        for fo2, st2, r2 in rows:
            if fo2 == fo:
                continue
            others.append((fo2.replace("cast_", "") + "/" + st2, round(abs(12 * np.log2(f / r2["express"]["med"])), 1),
                           round(float(np.linalg.norm(mf - np.array(r2["timbre"]["mfcc"]))), 2)))
        near = sorted(others, key=lambda t: t[1] / 3 + t[2] / 4)[:3]
        print(f"  {fo:18s} {st:10s} f0 {f:6.1f}  vs James: {abs(12 * np.log2(f / jf)):4.1f} st, mfcc {np.linalg.norm(mf - jm):5.2f}   nearest others: {near}")


if __name__ == "__main__":
    main()
