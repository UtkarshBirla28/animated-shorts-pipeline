"""QA GATES (v3): automatic gates on a rendered animatic / preview / final, PER SHOT, before any human or agent audit.
Look numbers come from the research's own script (look_metrics.py functions, imported, same formulas, same caption-band
mask), plus the proven checks of studio/scripts/short_qa.py (loudness / true peak / LRA, black + frozen frames) and the
loop seam + caption coverage. Targets: tools/v3/targets.json ("qa").

Usage (repo root, Git Bash):
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/qa_gates.py <video.mp4> --shots=<timeline.json | shots.json>
        [--words=<words.json>] [--out=<dir>] [--json=<out.json>] [--step=3] [--only=s03,s07] [--no-loop]
  --shots   sound/<slug>/audio/timeline.json ({"shots":[{id|key, a, b}]}) or kit_render's shots list ([{id, from, to}])
  --words   voice words.json ([{w, s, e}]): enables the caption-coverage gate (a caption must be visible on every word)
  --no-loop skip the loop-seam gate (a single-shot clip or a non-looping test)
  --step    analyse every Nth frame pair for motion (default 3; look_metrics uses 5; shots are short)
Exit: 0 = every gate PASS / WARN, 1 = a FAIL. A gate table goes to stdout and <out>/gates.md; the JSON lists the failing
shots for workflows/v3/polish_v3.js.
"""
import importlib.util
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
LM_PATH = Path.home() / "research_notes" / "ricksclips" / "look" / "scripts" / "look_metrics.py"  # was C:\Users\utkar\...
TQ = json.loads((Path(__file__).parent / "targets.json").read_text(encoding="utf-8"))["qa"]
FPS = 30.0


def load_lm():
    spec = importlib.util.spec_from_file_location("look_metrics", LM_PATH)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def load_shots(p, total):
    d = json.loads(Path(p).read_text(encoding="utf-8"))
    rows = d.get("shots", d) if isinstance(d, dict) else d
    out = []
    for i, s in enumerate(rows):
        a = s.get("a", s.get("from"))
        b = s.get("b", s.get("to"))
        sid = s.get("key") or s.get("id") or f"#{i + 1}"
        out.append({"id": str(sid), "a": int(a), "b": int(b), "xfade": int(s.get("xfade", 0) or 0)})
    out.sort(key=lambda r: r["a"])
    if out and total:
        out[-1]["b"] = min(out[-1]["b"], total)
    return out


def loudness(video):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-map", "0:a:0?", "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    e = r.stderr
    tail = e[e.rfind("Summary:"):] if "Summary:" in e else ""
    def grab(key):
        for line in tail.splitlines():
            line = line.strip()
            if line.startswith(key):
                try:
                    return float(line.split(":")[1].split()[0])
                except Exception:
                    return None
        return None
    return {"I": grab("I:"), "LRA": grab("LRA:"), "TP": grab("Peak:")} if tail else None


def probe(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames",
                        "-of", "json", str(video)], capture_output=True, text=True)
    s = json.loads(r.stdout)["streams"][0]
    return s


def caption_like(fr_bgr):
    """share of caption-band pixels that look like caption text: near-white fill next to a dark stroke (house style)"""
    h, w = fr_bgr.shape[:2]
    band = fr_bgr[int(0.667 * h):int(0.75 * h), int(0.08 * w):int(0.92 * w)]
    g = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY)
    white = g > 225
    dark = cv2.dilate((g < 40).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    return float((white & dark).mean())


def main(argv):
    opts = {a.split("=", 1)[0][2:]: (a.split("=", 1)[1] if "=" in a else "1") for a in argv if a.startswith("--")}
    files = [a for a in argv if not a.startswith("--")]
    if not files or "shots" not in opts:
        sys.exit(__doc__)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    video = Path(files[0])
    out = Path(opts.get("out", str(video.with_suffix("")) + "_gates"))
    out.mkdir(parents=True, exist_ok=True)
    step = int(opts.get("step", 3))
    lm = load_lm()
    SW, SH, AW, AH = lm.SW, lm.SH, lm.AW, lm.AH
    meta = probe(video)
    shots = load_shots(opts["shots"], None)
    only = set(opts["only"].split(",")) if "only" in opts else None
    words = json.loads(Path(opts["words"]).read_text(encoding="utf-8")) if "words" in opts else None
    if isinstance(words, dict):
        words = words.get("words", [])
    word_frames = {}
    if words:
        for w in words:
            s, e = float(w.get("s", w.get("start", 0))), float(w.get("e", w.get("end", 0)))
            word_frames[int(round((s + e) / 2 * FPS))] = w.get("w", w.get("word", ""))

    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-threads", "4", "-i", str(video), "-vf", f"scale={SW}:{SH}:flags=area",
                             "-pix_fmt", "bgr24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE, bufsize=SW * SH * 3 * 4)
    FB = SW * SH * 3
    per, stills, prev, prev_hist, i = {}, {}, None, None, 0
    first_small = last_small = None
    diffs = []
    cap_hits = {}
    while True:
        buf = proc.stdout.read(FB)
        if len(buf) < FB:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3)
        small = cv2.resize(fr, (AW, AH), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        tiny = cv2.resize(fr, (180, 320), interpolation=cv2.INTER_AREA).astype(np.int16)
        if first_small is None:
            first_small = tiny
        if last_small is not None:
            diffs.append(float(np.abs(tiny - last_small).mean()))
        last_small = tiny
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], lm.MASK_A.astype(np.uint8) * 255, [16, 8, 8], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist, 1, 0, cv2.NORM_L1)
        if prev is not None and i % step == 0:
            hd = float(cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA))
            if hd < 0.2:
                f = lm.sim_fit(prev, g)
                if f is not None:
                    M, inl = f
                    s = math.hypot(M[0, 0], M[1, 0])
                    cx, cy = AW / 2, AH / 2
                    ncx = M[0, 0] * cx + M[0, 1] * cy + M[0, 2]
                    ncy = M[1, 0] * cx + M[1, 1] * cy + M[1, 2]
                    cam = math.hypot((ncx - cx) / AW, (ncy - cy) / AH) * 100 + abs(math.log(s)) * 100
                    fa, ft, strong, p95 = lm.local_motion(prev, g, M)
                    per[i] = {"cam": cam, "loc_any": fa, "loc_strong": strong}
        if i % 15 == 7:
            d = {}
            d.update(lm.lab_stats(fr))
            d.update(lm.detail_stats(fr))
            stills[i] = d
        if i in word_frames:
            cap_hits[i] = caption_like(fr)
        prev, prev_hist = g, hist
        i += 1
    proc.wait()
    n = i
    if shots:
        shots[-1]["b"] = min(shots[-1]["b"], n)

    def med(xs):
        return float(np.median(xs)) if xs else float("nan")

    rows = []
    film = {"cam": [], "strong": [], "C": [], "Cs": [], "soft": []}
    for s in shots:
        if only and s["id"] not in only:
            continue
        a, b = s["a"] + s["xfade"] // 2, s["b"]          # skip the dissolve-in frames (they inflate camera speed)
        mv = [per[k] for k in range(a + 1, b) if k in per]
        st = [stills[k] for k in range(a, b) if k in stills]
        cam = [m["cam"] for m in mv]
        r = {"id": s["id"], "a": s["a"], "b": s["b"], "n_motion": len(mv), "n_stills": len(st),
             "cam_median": med(cam), "cam_still": float(np.mean([c < 0.15 for c in cam])) if cam else float("nan"),
             "cam_fast": float(np.mean([c > 1.0 for c in cam])) if cam else float("nan"),
             "local_strong": float(np.mean([m["loc_strong"] for m in mv])) if mv else float("nan"),
             "C": med([x["C"] for x in st]), "C_shadow": med([x["C_shadow"] for x in st]), "soft": med([x["soft_tiles"] for x in st]),
             "flat": med([x["flat_tiles"] for x in st]), "mid": med([x["mid"] for x in st]), "L": med([x["L"] for x in st])}
        # frozen inside the shot (>= 12 frames with no change at all)
        run_, frozen = 0, 0
        for k in range(s["a"], min(s["b"], len(diffs))):
            run_ = run_ + 1 if diffs[k] < 0.02 else 0
            frozen = max(frozen, run_)
        r["frozen_f"] = frozen
        gates = []
        def gate(name, ok, warn_ok, val, want):
            gates.append({"gate": name, "status": "PASS" if ok else ("WARN" if warn_ok else "FAIL"), "value": val, "want": want})
        lo, hi = TQ["cam_median"]
        cm = r["cam_median"]
        if math.isnan(cm):
            gates.append({"gate": "camera", "status": "WARN", "value": "n/a", "want": f"{lo}-{hi}"})
        else:
            gate("camera", lo <= cm <= hi, 0.3 <= cm <= hi * 1.5, round(cm, 2), f"{lo}-{hi} %/f")
            gate("still", r["cam_still"] <= TQ["cam_still_share_max"], r["cam_still"] <= 0.6, round(r["cam_still"], 2), f"<= {TQ['cam_still_share_max']}")
        ls = r["local_strong"]
        if not math.isnan(ls):
            gate("life", ls >= TQ["local_strong_min"], ls >= TQ["local_strong_min"] * 0.6, round(ls, 3), f">= {TQ['local_strong_min']}")
        if not math.isnan(r["C"]):
            c0, c1 = TQ["chroma"]
            gate("chroma", c0 <= r["C"] <= c1, c0 - 4 <= r["C"] <= c1 + 4, round(r["C"], 1), f"{c0}-{c1}")
            gate("shadow chroma", r["C_shadow"] <= TQ["shadow_chroma_max"], r["C_shadow"] <= TQ["shadow_chroma_max"] + 5, round(r["C_shadow"], 1), f"<= {TQ['shadow_chroma_max']}")
            gate("blur", r["soft"] <= TQ["soft_tiles_max"], r["soft"] <= TQ["soft_tiles_max"] * 1.6, round(r["soft"], 3), f"<= {TQ['soft_tiles_max']}")
            gate("busy", r["mid"] <= TQ["mid_busy_max"], r["mid"] <= TQ["mid_busy_max"] * 1.2, round(r["mid"], 2), f"<= {TQ['mid_busy_max']}")
            l0, l1 = TQ["L_mean"]
            gate("brightness", l0 <= r["L"] <= l1, l0 - 6 <= r["L"] <= l1 + 6, round(r["L"], 1), f"L* {l0}-{l1}")
        gate("frozen", frozen < 12, frozen < 24, frozen, "< 12 f")
        r["gates"] = gates
        r["status"] = "FAIL" if any(g["status"] == "FAIL" for g in gates) else ("WARN" if any(g["status"] == "WARN" for g in gates) else "PASS")
        rows.append(r)
        film["cam"] += cam
        film["strong"] += [m["loc_strong"] for m in mv]
        film["C"] += [x["C"] for x in st]
        film["Cs"] += [x["C_shadow"] for x in st]
        film["soft"] += [x["soft_tiles"] for x in st]

    FG = []
    def fgate(name, status, val, want):
        FG.append({"gate": name, "status": status, "value": val, "want": want})
    fgate("specs", "PASS" if meta.get("r_frame_rate") in ("30/1",) else "FAIL", f"{meta.get('width')}x{meta.get('height')} {meta.get('r_frame_rate')} {n} f", "30 fps")
    cm = med(film["cam"])
    fgate("film camera median", "PASS" if cm >= 0.6 else ("WARN" if cm >= 0.4 else "FAIL"), round(cm, 2), ">= 0.6 (his 0.72)")
    fs = float(np.mean(film["strong"])) if film["strong"] else float("nan")
    fgate("film life (strong own motion)", "PASS" if fs >= TQ["film_local_strong_min"] else ("WARN" if fs >= TQ["film_local_strong_min"] * 0.6 else "FAIL"),
          round(fs, 3), f">= {TQ['film_local_strong_min']} (his 0.30)")
    fgate("film chroma", "PASS" if TQ["chroma"][0] <= med(film["C"]) <= TQ["chroma"][1] else "WARN", round(med(film["C"]), 1), f"{TQ['chroma']} (his 24)")
    # the seam (last frame -> frame 0) must look like one more ordinary frame step: compare it with the motion around it
    loop = float(np.abs(first_small - last_small).mean()) if first_small is not None else float("nan")
    local = float(np.median(diffs[-10:] + diffs[:10])) if len(diffs) >= 20 else 0.0
    lim = TQ["loop_diff_max"] + 2.5 * local
    if "no-loop" not in opts:
      fgate("loop seam (last -> frame 0)", "PASS" if loop <= lim else ("WARN" if loop <= 2 * lim else "FAIL"),
            f"{loop:.2f} (local step {local:.2f})", f"<= {lim:.2f} = {TQ['loop_diff_max']} + 2.5 x the local step")
    L = loudness(video)
    if L and L["I"] is not None:
        i0, i1 = TQ["loudness_lufs"]
        fgate("loudness", "PASS" if i0 <= L["I"] <= i1 else "FAIL", L["I"], f"{i0}..{i1} LUFS")
        fgate("true peak", "PASS" if L["TP"] is not None and L["TP"] <= TQ["true_peak_max"] else "FAIL", L["TP"], f"<= {TQ['true_peak_max']} dBTP")
        r0, r1 = TQ["lra"]
        fgate("LRA", "PASS" if L["LRA"] is not None and r0 <= L["LRA"] <= r1 else "WARN", L["LRA"], f"{r0}-{r1}")
    else:
        fgate("audio", "WARN", "no audio stream", "the animatic carries the voice + rough mix")
    if cap_hits:
        vals = np.array(list(cap_hits.values()))
        thr = 0.002
        cov = float((vals > thr).mean())
        missing = [f"{k}:{word_frames[k]}" for k, v in sorted(cap_hits.items()) if v <= thr][:12]
        fgate("captions on every word", "PASS" if cov >= 0.95 else ("WARN" if cov >= 0.85 else "FAIL"), f"{cov * 100:.0f} % of {len(vals)} words",
              ">= 95 %" + (f"; first misses {missing}" if missing else ""))

    # --v4 (DIRECTOR, 2026-11-21): the v3 picture limits (camera 0.5-2.0 %/f, chroma 18-30, shadow chroma, blur, still, life,
    # brightness, the film camera / life / chroma medians, its own loop seam and the band-only caption reader) were written
    # for the first version; for v4 they are INFO numbers only: gates_v4.py judges motion, rests, the seam, frozen runs and
    # the captions with the v4 targets. Real gates kept here: specs, loudness, true peak, LRA.
    if "v4" in opts:
        keep = {"specs", "loudness", "true peak", "LRA", "audio"}
        for g in FG:
            if g["gate"] not in keep: g["status"] = "INFO"
        for r in rows:
            for g in r["gates"]: g["status"] = "INFO" if g["status"] != "PASS" else g["status"]
            r["status"] = "INFO"

    # ---- report
    lines = [f"QA GATES  {video}  ({n} frames, {len(rows)} shots, motion every {step} f)" + ("  [--v4: picture limits are INFO]" if "v4" in opts else ""), "", "FILM"]
    for g in FG:
        lines.append(f"  {g['status']:<5} {g['gate']:<32} {g['value']!s:<22} want {g['want']}")
    lines += ["", f"  {'shot':<6} {'frames':<11} {'cam':>5} {'still':>5} {'life':>6} {'C':>5} {'Csh':>5} {'blur':>5} {'busy':>5} {'L*':>5} {'frz':>4}  result / failing gates"]
    for r in rows:
        bad = [f"{g['gate']} {g['value']} (want {g['want']})" for g in r["gates"] if g["status"] != "PASS"]
        f = lambda x, p=2: "  n/a" if (isinstance(x, float) and math.isnan(x)) else f"{x:5.{p}f}"
        lines.append(f"  {r['id']:<6} {r['a']:>4}-{r['b']:<6} {f(r['cam_median'])} {f(r['cam_still'])} {f(r['local_strong'], 3):>6} "
                     f"{f(r['C'], 1)} {f(r['C_shadow'], 1)} {f(r['soft'], 3)} {f(r['mid'], 1)} {f(r['L'], 1)} {r['frozen_f']:4d}  {r['status']}"
                     + (": " + "; ".join(bad) if bad else ""))
    nf = sum(g["status"] == "FAIL" for g in FG) + sum(r["status"] == "FAIL" for r in rows)
    nw = sum(g["status"] == "WARN" for g in FG) + sum(r["status"] == "WARN" for r in rows)
    failing = [r["id"] for r in rows if r["status"] == "FAIL"]
    lines += ["", f"GATES: {'FAIL' if nf else 'PASS'}  ({nf} fail, {nw} warn)  failing shots: {', '.join(failing) or 'none'}"]
    txt = "\n".join(lines)
    print(txt)
    (out / "gates.md").write_text(txt + "\n", encoding="utf-8")
    res = {"video": str(video), "frames": n, "film": FG, "shots": rows, "failing_shots": failing, "fails": nf, "warns": nw,
           "verdict": "FAIL" if nf else "PASS"}
    (out / "gates.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    if "json" in opts:
        Path(opts["json"]).write_text(json.dumps(res, indent=1), encoding="utf-8")
    return 1 if nf else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
