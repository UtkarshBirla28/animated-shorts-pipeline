"""Whisper-free casting numbers (fast): per take the sound span, f0 median / p10-p90 range, loudness contour range,
vocal-tract length (pt_vtl), MFCC + f0 distance to James (his narrator takes), the laugh before the first word
(ElevenLabs first-word time - first sound), and the clipped edges. -> takes/quick_<folder>.json + a table.
  python pt_quick.py cast_d cast_t cast_t6 cast_k"""
import json
import sys

import numpy as np

import pt_lib as L
import pt_vtl as V

sys.stdout.reconfigure(encoding="utf-8")


def base(mp3):
    m = L.read(mp3)
    m = m * 10 ** ((-18 - L.lufs(m)) / 20)
    d = L.db_frames(m)
    loud = np.where(d > L.THR)[0]
    on, off = loud[0] * L.H + 0.005, loud[-1] * L.H + 0.005
    seg = m[int(on * L.SR):int(off * L.SR)]
    return m, d, on, off, seg


def james():
    mf, f0 = [], []
    for c in ("c01", "c02", "c05", "c06", "c07", "c08", "c09"):
        for t in ("t1", "t3"):
            m, d, on, off, seg = base(L.TAKES / c / f"{t}.mp3")
            mf.append(L.mfcc_mean(seg))
            T, F = L.f0_track(seg)
            f0.append(float(np.nanmedian(F)))
    return np.mean(np.array(mf), axis=0), float(np.median(f0))


def quick(mp3, jm, jf):
    m, d, on, off, seg = base(mp3)
    T, F = L.f0_track(seg)
    st = L.f0_stats(T, F, 0, off - on)
    dl = L.db_frames(seg, hop_s=0.05, win_s=0.05)
    dl = dl[dl > -45]
    fm = V.formants(seg, T, F) or {}
    al = [w for w in L.align_words(mp3.with_suffix(".json")) if any(ch.isalnum() for ch in w[0])]
    mf = L.mfcc_mean(seg)
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    return {"take": f"{mp3.parent.name}/{mp3.stem}", "candidate": meta.get("candidate"), "text": meta["text"], "stability": meta.get("stability"),
            "lead_s": round(on, 3), "span_s": round(off - on, 3), "f0_med": st.get("med"), "f0_range_st": st.get("range_st"),
            "level_range_db": round(float(np.percentile(dl, 95) - np.percentile(dl, 10)), 1) if len(dl) > 4 else None,
            "vtl_cm": fm.get("vtl_cm"), "F": [fm.get("F1"), fm.get("F2"), fm.get("F3")],
            "mfcc_to_james": round(float(np.linalg.norm(mf - jm)), 2), "f0_to_james_st": round(abs(12 * np.log2(st["med"] / jf)), 1) if st.get("med") else None,
            "laugh_s": round(al[0][1] - on, 2) if al else None, "clip_start": bool(np.max(d[:2]) > L.THR), "clip_end": bool(np.max(d[-4:]) > L.THR),
            "mfcc": [round(float(v), 3) for v in mf]}


if __name__ == "__main__":
    jm, jf = james()
    print(f"James: f0 {jf:.1f} Hz")
    for folder in sys.argv[1:]:
        rows = [quick(mp3, jm, jf) for mp3 in sorted((L.TAKES / folder).glob("*.mp3"))]
        (L.TAKES / f"quick_{folder}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\n== {folder}")
        for r in rows:
            print(f"  {r['take']:16s} st{r['stability']} span {r['span_s']:.2f}s f0 {r['f0_med']} r{r['f0_range_st']}st lvl {r['level_range_db']}dB "
                  f"vtl {r['vtl_cm']} F{r['F']} dJ mfcc {r['mfcc_to_james']} f0 {r['f0_to_james_st']}st laugh {r['laugh_s']}"
                  f"{' CLIPSTART' if r['clip_start'] else ''}{' CLIPEND' if r['clip_end'] else ''}  | {r['text']}", flush=True)
