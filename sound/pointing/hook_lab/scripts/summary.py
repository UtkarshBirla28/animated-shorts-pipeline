"""Print + save the automatic numbers per video (0-5 s) as one flat table: data/auto_table.json."""
import json
from pathlib import Path

man = json.loads(Path("data/manifest.json").read_text())
fs = json.loads(Path("data/first_sentences.json").read_text(encoding="utf-8"))
rows = []
for it in man:
    p = Path("data/") / f"{it['slug']}.json"
    if not p.exists():
        continue
    d = json.loads(p.read_text())
    a = d["audio"]
    f = fs.get(it["slug"], {})
    per = d["per_frame"]
    # mean pixel change per frame (0-1 s, 1-3 s) and share of frames with big self-motion
    def mean(key, a0, b0):
        v = [r[key] for r in per[a0:b0 + 1] if key in r]
        return round(sum(v) / len(v), 3) if v else None
    row = {
        "slug": it["slug"], "owner": it["owner"], "views": it["views"],
        "L": d["frame0"]["L"], "Lsd": d["frame0"]["Lsd"], "C": d["frame0"]["C"], "Cp90": d["frame0"]["Cp90"],
        "ctr": d["frame0"]["centre_L_minus_mean"], "pal": " ".join(c for c, _ in d["frame0"]["palette"][:3]),
        "cap0": d["frame0_caption_score"], "cap_first": d["caption_first_s"],
        "cam01": (d["cam_0_1s"] or {}).get("median"), "cam13": (d["cam_1_3s"] or {}).get("median"),
        "cam35": (d["cam_3_5s"] or {}).get("median"),
        "cam01_p90": (d["cam_0_1s"] or {}).get("p90"),
        "loc01": (d["loc_0_1s"] or {}).get("median"), "loc13": (d["loc_1_3s"] or {}).get("median"),
        "chg01": mean("changed_px", 1, 30), "chg13": mean("changed_px", 31, 90),
        "first_loc_vis": d["first_local_visible_s(>=1% px >1.5px)"], "first_cam_vis": d["first_cam_visible_s(>=0.3%/f)"],
        "trans": [(t["t0"], t["kind"]) for t in d["transitions_0_5s"]], "soft": d["soft_transitions_0_5s"],
        "snd50": a.get("first_sound_s_-50dBFS"), "snd35": a.get("first_sound_s_-35dBFS"),
        "speech": a.get("first_speechband_s_-30dBFS_60ms"), "lvl0": a.get("level_0_0.5s_dBFS"),
        "lvl03": a.get("level_0.5_3s_dBFS"),
        "fs_words": f.get("n_words"), "fs_end": f.get("end"), "w3": f.get("words_by_3s"), "w5": f.get("words_by_5s"),
        "gap5": f.get("max_gap_0_5s"),
    }
    rows.append(row)
Path("data/auto_table.json").write_text(json.dumps(rows, indent=1))
rows.sort(key=lambda r: (r["owner"] != "his", -r["views"]))
for r in rows:
    print(f"{r['slug'][:30]:<30} {r['views']/1e6:6.2f}M L{r['L']:5.1f} sd{r['Lsd']:5.1f} C{r['C']:5.1f} ctr{r['ctr']:5.1f} "
          f"cam {r['cam01']}/{r['cam13']}/{r['cam35']} chg {r['chg01']}/{r['chg13']} locvis {r['first_loc_vis']} "
          f"camvis {r['first_cam_vis']} | cuts {[round(t, 2) for t, k in r['trans']]} soft {r['soft']} | "
          f"snd {r['snd50']}/{r['snd35']} sp {r['speech']} lvl {r['lvl0']}/{r['lvl03']} cap {r['cap_first']}")
