"""RENDER ESTIMATE (v3): wall-clock hours to render a film at every quality, from the DETAIL BIBLE + CORE's measured costs.

Usage: PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/render_estimate.py briefs/v3/<slug>/bible.json [--polish=6]
Cost sources, best first (the table says which one each shot used):
  1. measured: studio/out/<slug>/shots/<quality>/render_log.jsonl (kit_render.mjs logs s/frame per shot)
  2. CORE's measured per-quality s/frame in studio/src/kit/core/NOTES.md (a line "| <quality> | ... s/frame |" in its
     "Status / measured" section), x this shot's complexity
  3. the speed budget / pilot (KIT_CONTRACT + lookpilot/threejs/NOTES.md): final 3.4 s/f wall (8 sub-frames; the pilot
     measured 3.4-3.9), final4 1.9, preview 0.6 (budget), draft still 25 s incl. the page start; x complexity
Complexity (WORKFLOW's model until per-shot logs exist): 1 + 0.06 per vegetation item + 0.05 per fx + 0.04 per life
item over 3 + 0.15 per shadowed practical switched on, capped at 1.8. Per shot overhead: the set build (bible
est_build_s, default 25 s: kit_render renders each shot as its own chunk, so every shot pays it) + 10 s page start;
plus one bundle (~60 s) per run. One render at a time (GPU + RAM token), concurrency 2 tabs.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FPS = 30
BASE = {"draft": None, "preview": 0.6, "final4": 1.9, "final": 3.4}
STILL_S = 25.0


def core_measured():
    nf = ROOT / "studio/src/kit/core/NOTES.md"
    out = {}
    if nf.exists():
        t = nf.read_text(encoding="utf-8", errors="replace")
        sec = t[t.find("Status / measured"):] if "Status / measured" in t else ""
        for q in ("preview", "final4", "final"):
            m = re.search(r"\|\s*" + q + r"\s*\|[^\n]*?([\d.]+)\s*s\s*/\s*f(rame)?", sec)
            if m:
                out[q] = float(m.group(1))
    return out


def logged(slug, q):
    p = ROOT / f"studio/out/{slug}/shots/{q}/render_log.jsonl"
    res = {}
    if p.exists():
        for ln in p.read_text(encoding="utf-8").splitlines():
            try:
                d = json.loads(ln)
                sid, spf = d.get("shot") or d.get("id"), d.get("s_per_frame") or d.get("spf")
                if sid and spf:
                    res[sid] = float(spf)
            except Exception:
                pass
    return res


def main(argv):
    if not argv:
        sys.exit(__doc__)
    bible = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    opts = {a.split("=", 1)[0][2:]: a.split("=", 1)[1] for a in argv[1:] if a.startswith("--") and "=" in a}
    slug = bible.get("slug", "x")
    sets = {s["id"]: s for s in bible.get("sets", [])}
    shots = bible["shots"]
    # durations: the GENERATED shot table when it exists, else est_t0 deltas
    st = ROOT / f"studio/src/videos3/{slug}/shots.ts"
    frames = {}
    if st.exists():
        for m in re.finditer(r'id: "([^"]+)", from: (\d+), to: (\d+)', st.read_text(encoding="utf-8")):
            frames[m.group(1)] = int(m.group(3)) - int(m.group(2))
    if not frames:
        t0 = [float(s.get("est_t0", 0)) for s in shots]
        for i, s in enumerate(shots):
            frames[s["id"]] = round(((t0[i + 1] if i + 1 < len(shots) else t0[i] + 2) - t0[i]) * FPS)
    cm = core_measured()
    rows = []
    for s in shots:
        prs = [p for p in sets.get(s.get("set"), {}).get("practicals", []) if p.get("shadow")]
        on = len(s.get("light", {}).get("practicals_on", []))
        cx = 1 + 0.06 * len(s.get("vegetation", [])) + 0.05 * len(s.get("fx", [])) + 0.04 * max(0, len(s.get("life", [])) - 3) + 0.15 * min(on, len(prs))
        rows.append({"id": s["id"], "frames": frames.get(s["id"], 60), "cx": min(1.8, cx), "build": float(sets.get(s.get("set"), {}).get("est_build_s", 25))})
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    total_f = sum(r["frames"] for r in rows)
    print(f"RENDER ESTIMATE  {slug}: {len(rows)} shots, {total_f} frames ({total_f / FPS:.1f} s)")
    print(f"  sources: CORE NOTES measured {cm or 'none yet'}; per-shot logs read from studio/out/{slug}/shots/<quality>/render_log.jsonl")
    nst = sum(max(1, len(s.get("framings", []))) for s in shots)
    print(f"  draft storyboard: {nst} stills x ~{STILL_S:.0f} s + 60 s bundle = {(nst * STILL_S + 60) / 60:.0f} min")
    res = {}
    for q in ("preview", "final4", "final"):
        lg = logged(slug, q)
        base = cm.get(q, BASE[q])
        sec, src_n = 60.0, {"log": 0, "core": 0, "budget": 0}
        for r in rows:
            if r["id"] in lg:
                spf, src = lg[r["id"]], "log"
            else:
                spf, src = base * r["cx"], ("core" if q in cm else "budget")
            src_n[src] += 1
            sec += r["frames"] * spf + r["build"] + 10
        res[q] = sec
        print(f"  {q:<8} {sec / 3600:5.2f} h  ({base} s/f base{' (CORE measured)' if q in cm else ' (budget / pilot)'}; shots from logs {src_n['log']}, core {src_n['core']}, budget {src_n['budget']})")
    k = int(opts.get("polish", 6))
    avg = sum(r["frames"] for r in rows) / max(1, len(rows))
    pol = (k * (avg * BASE["preview"] + 35) + 60) / 60
    print(f"  polish round of {k} failing shots at preview: ~{pol:.0f} min render (the cache keeps every other shot)")
    print(f"  final + QA + mux: ~{res['final'] / 3600 + 0.15:.1f} h (final4: ~{res['final4'] / 3600 + 0.15:.1f} h)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
