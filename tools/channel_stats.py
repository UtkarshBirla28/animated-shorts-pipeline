"""Cross-video numbers table from the raw measurements (+ agent-verified shot counts when available).

Usage: python -s channel_stats.py <data_root> <out.md> [all_breakdowns.json]
"""
import json
import statistics as st
import sys
from pathlib import Path

root, out = Path(sys.argv[1]), Path(sys.argv[2])
verified = {}
if len(sys.argv) > 3 and Path(sys.argv[3]).exists():
    for r in json.loads(Path(sys.argv[3]).read_text(encoding="utf-8")):
        verified[Path(r["report_path"]).stem] = r

rows = []
for d in sorted(p for p in root.iterdir() if (p / "SUMMARY.md").exists()):
    sh = json.loads((d / "shots.json").read_text(encoding="utf-8"))
    au = json.loads((d / "audio.json").read_text(encoding="utf-8"))
    vo = json.loads((d / "voice.json").read_text(encoding="utf-8")) if (d / "voice.json").exists() else {}
    shots = sh["shots"]
    durs = [s["dur"] for s in shots]
    cols = [s["colour"] for s in shots if s.get("colour")]
    tr = sh["transitions"]
    p = au["pace"]
    v = verified.get(d.name, {})
    rows.append({
        "video": d.name, "dur": round(sh["duration"], 1),
        "shots_auto": len(shots), "shots_verified": v.get("shots_verified"),
        "median_shot_auto": round(st.median(durs), 2), "median_shot_verified": v.get("median_shot_s"),
        "dissolves": sum("dissolve" in t["kind"] for t in tr), "hard": sum("hard" in t["kind"] for t in tr),
        "dissolve_frames_med": st.median([t["frames"] for t in tr if "dissolve" in t["kind"]]) if any("dissolve" in t["kind"] for t in tr) else None,
        "words": p.get("n_words"), "wps": p.get("words_per_s"), "first_word": p.get("first_word_s"),
        "tail": p.get("tail_after_voice_s"), "pauses": p.get("n_pauses"),
        "lufs": au["loudness"]["integrated_LUFS"], "lra": au["loudness"]["LRA_LU"], "tp": au["loudness"]["true_peak_dBFS"],
        "bed_vs_voice": p.get("bed_minus_voice_db"),
        "f0": vo.get("f0_median_hz"), "f0_p10": vo.get("f0_p10_hz"), "f0_p90": vo.get("f0_p90_hz"),
        "L": round(st.mean(c["L_mean"] for c in cols), 1), "Lstd": round(st.mean(c["L_std_contrast"] for c in cols), 1),
        "chroma": round(st.mean(c["chroma_mean"] for c in cols), 1), "warm_b": round(st.mean(c["warmth_b"] for c in cols), 1),
        "edges": round(st.mean(c["edge_density"] for c in cols), 4),
        "moving_shot_frac": round(sum(s["move"] != "static / locked" for s in shots) / len(shots), 2),
    })

keys = list(rows[0].keys())
L = ["# Channel numbers (16 reference shorts, measured 2026-11-10)", "",
     "Automatic measurements from tools/measure_video.py + voice_pitch.py; `*_verified` = corrected by the breakdown "
     "agent after looking at the frames. Shot/transition counts from the detector are approximate (dissolves inside "
     "moves, effects and caption swaps fool it); prefer the verified columns and the per-video reports.", "",
     "| " + " | ".join(keys) + " |", "|" + "---|" * len(keys)]
for r in rows:
    L.append("| " + " | ".join("" if r[k] is None else str(r[k]) for k in keys) + " |")
L += ["", "## Medians across videos", ""]
for k in keys[1:]:
    vals = [r[k] for r in rows if isinstance(r[k], (int, float)) and r[k] is not None]
    if vals:
        L.append(f"- **{k}**: median {st.median(vals):.3g}, min {min(vals):.3g}, max {max(vals):.3g} (n={len(vals)})")
out.write_text("\n".join(L) + "\n", encoding="utf-8")
print(f"wrote {out} ({len(rows)} videos)")
