"""BIBLE VALIDATE (v3): check a DETAIL BIBLE (briefs/v3/<slug>/bible.json) against the kit's DETAIL STANDARD, the research
targets and the owner's rules BEFORE anyone builds or renders. Thresholds: tools/v3/targets.json. Format: briefs/v3/BIBLE_TEMPLATE.json.

Usage (repo root, Git Bash):
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/<slug>/bible.json [options]
Options:
  --stage=decide|gate1|build   decide (default): the bible is being written; gate1: storyboard stills must exist;
                               build: the voice must be locked, unknown kit names FAIL unless marked new / local
  --strict-catalog             unknown kit names FAIL even while a kit owner has not published a catalog
  --cam=<cam_speed.json>       measured camera speeds (tools/v3/cam_speed.mjs output) instead of calling it
  --json=<out.json>            the whole result as JSON (the workflows read it)
  --quiet                      only the summary + FAIL / WARN lines
  --only=s03,s07               check only these shots (a builder / detail agent validating its own group)
Exit: 0 PASS (warnings allowed), 1 FAIL.

Kit catalogs (read at run time, so names follow the owners' work): studio/public/kit/<category>/<name>/ folders,
studio/src/kit/<owner>/catalog.json ({"<category>": ["name", ...]}) and backticked names in studio/src/kit/<owner>/NOTES.md.
A bible name is "<category>/<name>" (props/fridge_retro, nature/tree_small_02, fx/dust, cards/kid, surfaces/roomKit) or a bare
surface name in surface fields. "local/<name>" = built inside videos3/<slug>/sets/ (never a kit request).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / "studio"
KIT = STUDIO / "src" / "kit"
PUB = STUDIO / "public" / "kit"
TARGETS = json.loads((Path(__file__).parent / "targets.json").read_text(encoding="utf-8"))
FPS = 30
# which owner publishes which category, and where its assets live on disk
CATS = {
    "surfaces": {"owner": "surfaces", "dirs": ["surfaces"]},
    "props": {"owner": "props", "dirs": ["props"], "notes": ["props", "nature"]},
    "nature": {"owner": "nature", "dirs": ["trees", "nature", "grass", "hedges", "flowers"], "notes": ["nature"]},
    "fx": {"owner": "fx", "dirs": ["fx"], "notes": ["fx", "nature"]},
    "cards": {"owner": "cards", "dirs": ["cards"], "notes": ["cards"]},
    "core": {"owner": "core", "dirs": [], "notes": ["core"]},
}


# ---------------------------------------------------------------- kit catalogs
def backticked(text):
    out = set()
    for m in re.finditer(r"`([^`\n]{1,80})`", text):
        tok = m.group(1).strip()
        for t in re.findall(r"[A-Za-z][A-Za-z0-9_\-]*(?:/[A-Za-z0-9_\-]+)*", tok):
            out.add(t.split("/")[-1].lower())
            out.add(t.lower())
    return out


def load_catalog():
    cat = {}
    for c, spec in CATS.items():
        names, sources = set(), []
        for d in spec["dirs"]:
            p = PUB / d
            if p.is_dir():
                sub = [x.name.lower() for x in p.iterdir() if x.is_dir() and not x.name.startswith("_")]
                names |= set(sub)
                if sub:
                    sources.append(f"public/kit/{d}/ ({len(sub)})")
        for o in spec.get("notes", [spec["owner"]]):
            nf = KIT / o / "NOTES.md"
            if nf.exists():
                n = backticked(nf.read_text(encoding="utf-8", errors="replace"))
                names |= n
                sources.append(f"kit/{o}/NOTES.md ({len(n)} tokens)")
            cj = KIT / o / "catalog.json"
            if cj.exists():
                try:
                    d = json.loads(cj.read_text(encoding="utf-8"))
                    for k, v in d.items():
                        if isinstance(v, list) and (k == c or k.rstrip("s") == c.rstrip("s")):
                            names |= set(str(x).lower() for x in v)
                    sources.append(f"kit/{o}/catalog.json")
                except Exception as e:
                    sources.append(f"kit/{o}/catalog.json UNREADABLE ({e})")
        cat[c] = {"names": names, "sources": sources, "published": any("NOTES" in s or "catalog" in s for s in sources)}
    return cat


def lookup(cat, ref, default_cat=None):
    """-> ('ok'|'local'|'unknown'|'unpublished', category, name)"""
    if not ref:
        return ("missing", default_cat, "")
    ref = str(ref).strip()
    if ref.startswith("local/"):
        return ("local", "local", ref[6:])
    if "/" in ref:
        c, name = ref.split("/", 1)
    else:
        c, name = default_cat, ref
    c = {"surface": "surfaces", "prop": "props", "tree": "nature", "trees": "nature", "card": "cards"}.get(c, c)
    if c not in cat:
        return ("unknown", c, name)
    n = name.lower()
    pool = cat[c]["names"]
    if n in pool or n.split("/")[-1] in pool:
        return ("ok", c, name)
    if c in ("props", "nature") and (n in cat["props"]["names"] or n in cat["nature"]["names"]):
        return ("ok", c, name)
    return ("unknown" if cat[c]["published"] or pool else "unpublished", c, name)


# ---------------------------------------------------------------- camera speeds (CORE's estimator or the plan)
def camera_stats(bible, cam_json=None, durs=None):
    """CORE's camSpeedStats through tools/v3/cam_speed.mjs (interface documented there): the BUILT film's cameras when
    studio/src/videos3/<slug>/film.ts exists, else the bible's PLANNED presets on a canonical layout.
    Returns ({shot_id: stats}, source)."""
    data = None
    script = Path(__file__).parent / "cam_speed.mjs"
    if cam_json and Path(cam_json).exists():
        data = json.loads(Path(cam_json).read_text(encoding="utf-8"))
    elif script.exists():
        film = STUDIO / "src" / "videos3" / bible.get("slug", "_") / "film.ts"
        tries = []
        if film.exists():
            tries.append(["--film", str(film)])
        if durs:
            req = {"shots": [{"id": s.get("id"), "preset": s.get("camera", {}).get("preset"), "params": s.get("camera", {}).get("params", {}),
                              "dur": d} for s, d in zip(bible.get("shots", []), durs)]}
            rq = STUDIO / "out" / ".v3" / f"cam_req_{bible.get('slug', 'x')}.json"
            rq.parent.mkdir(parents=True, exist_ok=True)
            rq.write_text(json.dumps(req), encoding="utf-8")
            tries.append(["--plan", str(rq)])
        for t in tries:
            try:
                r = subprocess.run(["node", str(script), *t], capture_output=True, text=True, timeout=240, cwd=str(STUDIO))
                data = json.loads(r.stdout.strip().splitlines()[-1]) if r.stdout.strip() else {"ok": False, "reason": r.stderr[-300:]}
            except Exception as e:
                data = {"ok": False, "reason": str(e)}
            if data.get("ok"):
                break
    if data and data.get("ok"):
        return data.get("shots", {}), data.get("source", "camSpeedStats")
    return {}, (data or {}).get("reason", "no estimator") if data else "no estimator"


# ---------------------------------------------------------------- helpers
def shot_durations(bible):
    shots = bible["shots"]
    total_est = None
    v = bible.get("voice", {})
    if v.get("locked") and v.get("total_frames"):
        total_est = v["total_frames"] / FPS
    if total_est is None:
        lint = ROOT / "briefs" / "v3" / bible.get("slug", "_") / "lint.json"
        if lint.exists():
            total_est = json.loads(lint.read_text(encoding="utf-8")).get("est_s")
            if total_est:
                total_est += v.get("tail_frames", 20) / FPS
    t0 = [float(s.get("est_t0", 0)) for s in shots]
    out = []
    for i, s in enumerate(shots):
        end = t0[i + 1] if i + 1 < len(shots) else (total_est or (t0[i] + 2.0))
        out.append(max(0.0, end - t0[i]))
    return out, total_est


def words_of(text):
    return re.findall(r"[A-Za-z0-9%+:/'\-]+", text or "")


# ---------------------------------------------------------------- the validation
def validate(path, stage="decide", strict=False, cam_json=None, only=None):
    bible = json.loads(Path(path).read_text(encoding="utf-8"))
    T, TS = TARGETS["film"], TARGETS["shot"]
    cat = load_catalog()
    rows, shots_out, requests = [], [], {}

    def row(rid, rule, status, detail):
        rows.append({"id": rid, "rule": rule, "status": status, "detail": detail})

    shots = bible.get("shots", [])
    sets = {s["id"]: s for s in bible.get("sets", [])}
    cast = {c["id"]: c for c in bible.get("cast", [])}
    durs, total = shot_durations(bible)
    camstats, camsrc = camera_stats(bible, cam_json, durs)

    # ---- film level
    st = bible.get("status", {})
    row("F0", "script linted (tools/v3/script_lint.py)", "PASS" if bible.get("script", {}).get("lint") == "PASS" else "FAIL",
        f"script.lint = {bible.get('script', {}).get('lint')!r} ({bible.get('script', {}).get('path')})")
    v = bible.get("voice", {})
    if stage == "build":
        row("F1", "voice locked before the build", "PASS" if v.get("locked") and v.get("total_frames") else "FAIL",
            f"locked={v.get('locked')} total_frames={v.get('total_frames')}")
    else:
        row("F1", "voice locked before the build", "PASS" if v.get("locked") else "WARN",
            "locked" if v.get("locked") else "not locked yet: timing uses the linter's estimates")
    locs = sorted({s.get("set") for s in shots})
    states = sorted({(s.get("set"), s.get("light", {}).get("rig")) for s in shots})
    ok = len(locs) >= T["min_locations"] or bool(bible.get("locations_reason"))
    row("F2", f">= {T['min_locations']} locations (or a reason)", "PASS" if ok else "FAIL",
        f"{len(locs)} sets ({', '.join(locs)}), {len(states)} place + light states" +
        (f"; reason: {bible['locations_reason']}" if bible.get("locations_reason") else ""))
    missing_sets = [s.get("set") for s in shots if s.get("set") not in sets]
    row("F3", "every shot's set is defined", "FAIL" if missing_sets else "PASS", ", ".join(sorted(set(missing_sets))) or f"{len(sets)} sets")
    nframings = sum(max(1, len(s.get("framings", []))) for s in shots)
    film_s = sum(durs)
    per = film_s / max(1, nframings)
    row("F4", f"a new framing about every {T['framing_every_s']} s", "PASS" if per <= T["framing_every_s"] + 0.15 else
        ("WARN" if per <= T["framing_warn_s"] else "FAIL"), f"{nframings} framings over {film_s:.1f} s = one per {per:.2f} s")
    snaps = [s["id"] for s in shots if s.get("camera", {}).get("snap") or s.get("transition_in") == "whip"]
    row("F5", f"<= {T['max_snaps']} comic snaps / whips", "PASS" if len(snaps) <= T["max_snaps"] else "WARN", ", ".join(snaps) or "none")
    if total:
        row("F6", "shots cover the voice", "PASS" if abs(film_s - total) < 0.05 else "WARN", f"shots {film_s:.1f} s, voice {total:.1f} s")
    ids = [s.get("id") for s in shots]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    t0s = [float(s.get("est_t0", 0)) for s in shots]
    order = all(t0s[i] < t0s[i + 1] for i in range(len(t0s) - 1))
    row("F7", "shot ids unique, times in order", "PASS" if not dup and order else "FAIL",
        (f"duplicate ids {dup}; " if dup else "") + ("" if order else "est_t0 not increasing"))
    lp = bible.get("loop", {})
    row("F8", "the loop: last frame flows into frame 0", "PASS" if lp.get("frame0") and lp.get("last") else "FAIL",
        f"frame0: {lp.get('frame0', '-')[:60]} | last: {lp.get('last', '-')[:60]}")
    mus = bible.get("music", {})
    row("F9", "music plan (mood, changes, end)", "PASS" if mus.get("mood") and mus.get("end") else "WARN", (mus.get("mood") or "-")[:80])
    for c in cast.values():
        for k in ("build", "body_colour", "signature"):
            if not c.get(k):
                row("F10", f"cast '{c['id']}' has {k}", "WARN", "one body colour + one signature item each (LESSONS / CHAR rules)")

    # ---- sets: the DETAIL STANDARD at set level
    for sid, s in sets.items():
        g = s.get("ground", {})
        probs = []
        if not g.get("surface"):
            probs.append("no ground surface")
        else:
            r = lookup(cat, g["surface"], "surfaces")
            if r[0] in ("unknown", "unpublished"):
                probs.append(f"ground surface '{g['surface']}' not in the SURFACES catalog")
        if not g.get("meso"):
            probs.append("ground has no meso detail (joints / boards / displacement)")
        if not g.get("wear"):
            probs.append("ground has no wear (DETAIL 3)")
        if s.get("kind") == "exterior" and not g.get("scatter"):
            probs.append("exterior ground has no scatter (leaf litter / pebbles / paper)")
        for sf in s.get("surfaces", []):
            r = lookup(cat, sf.get("surface"), "surfaces")
            if r[0] in ("unknown", "unpublished"):
                probs.append(f"surface '{sf.get('surface')}' not in the catalog")
            if not sf.get("meso"):
                probs.append(f"surface '{sf.get('where')}' has no meso (bevels / trims / mortar)")
        if s.get("kind") == "interior" and not s.get("practicals"):
            probs.append("interior with no practical lights (DETAIL 6)")
        if not s.get("ambience"):
            probs.append("no ambience bed")
        if s.get("kit_base"):
            r = lookup(cat, s["kit_base"], "surfaces")
            if r[0] in ("unknown", "unpublished"):
                requests.setdefault(f"surfaces/{r[2]}", []).append(f"set {sid} kit_base")
        row(f"set:{sid}", "set meets the DETAIL STANDARD", "FAIL" if any("no ground surface" in p or "meso" in p or "wear" in p for p in probs)
            else ("WARN" if probs else "PASS"), "; ".join(probs) or f"{s.get('kind')}: {s.get('place', '')[:70]}")
        for p in s.get("props", []):
            r = lookup(cat, p.get("kit"), "props")
            if r[0] in ("unknown", "unpublished"):
                requests.setdefault(p.get("kit"), []).append(f"set {sid}" + (" (marked new)" if p.get("new") else " (NOT marked new)"))
        for vg in s.get("vegetation", []):
            r = lookup(cat, vg.get("kit"), "nature")
            if r[0] in ("unknown", "unpublished"):
                requests.setdefault(vg.get("kit"), []).append(f"set {sid}")

    # ---- shots
    cam_meds = []
    only = set(only.split(",")) if only else None
    for i, s in enumerate(shots):
        sid = s.get("id", f"#{i}")
        if only and sid not in only:
            continue
        d = durs[i]
        F, W = [], []          # fails, warnings
        fr = s.get("framings", [])
        nf = max(1, len(fr))
        spf = d / nf
        if spf > T["framing_fail_s"]:
            F.append(f"{spf:.1f} s per framing (> {T['framing_fail_s']})")
        elif spf > T["framing_warn_s"]:
            W.append(f"{spf:.1f} s per framing")
        if d < T["min_framing_s"] and not s.get("camera", {}).get("snap") and i not in (len(shots) - 1,):
            W.append(f"shot only {d:.1f} s (readability; LESSONS 29)")
        for f in fr:
            h = f.get("subject_height_pct")
            lo, hi = TS["subject_height_pct"]
            if h is not None and not f.get("wide") and not f.get("insert") and not (lo <= h <= hi):
                W.append(f"subject {h} % of the frame height at {f.get('at_s')} s (want {lo}-{hi})")
        # camera
        cam = s.get("camera", {})
        preset = cam.get("preset")
        if preset not in TARGETS["camera_presets"]:
            F.append(f"camera preset {preset!r} is not a CORE preset")
        ms = camstats.get(sid)
        if ms and "median" in ms:
            bgk = preset in ("orbit", "followSide") and "median_bg" in ms     # the centred-subject caveat (NOTES)
            med, src = float(ms["median_bg"] if bgk else ms["median"]), "core"
            peak = float(ms.get("peak_bg" if bgk else "peak", ms.get("p90", 0)))
        else:
            med = float(cam.get("speed_pct_f") or TARGETS["preset_speed_prior"].get(preset or "", 0.5))
            src = "planned" if cam.get("speed_pct_f") else "prior"
            peak = None
        planned = cam.get("speed_pct_f")
        if ms and "median" in ms and planned and abs(med - float(planned)) > max(0.3, 0.5 * float(planned)):
            W.append(f"camera measures {med:.2f} %/f with CORE's preset, planned {planned} (fix params or the plan)")
        cam_meds.append((med, d))
        if med < T["shot_cam_min"] and not cam.get("freeze"):
            F.append(f"camera {med:.2f} %/f (< {T['shot_cam_min']}: moves in every frame)")
        if peak is not None and peak > T["cam_peak_max"]:
            W.append(f"camera peak {peak:.1f} %/f (> {T['cam_peak_max']}: the owner's calm cap)")
        # light
        lt = s.get("light", {})
        if lt.get("rig") not in TARGETS["rigs"]:
            F.append(f"rig {lt.get('rig')!r} not in CORE's rigs")
        st_set = sets.get(s.get("set"), {})
        if st_set.get("kind") == "interior" and lt.get("rig") in ("nightPractical", "interiorWarm") and not lt.get("practicals_on") and st_set.get("practicals"):
            W.append("interior / night rig with no practical switched on")
        # life
        life = s.get("life", [])
        if len(life) < TS["min_life"]:
            F.append(f"{len(life)} life items (< {TS['min_life']})")
        # detail near the lens
        for sf in s.get("surfaces_near", []):
            r = lookup(cat, sf.get("surface"), "surfaces")
            if r[0] in ("unknown", "unpublished"):
                (F if r[0] == "unknown" and strict else W).append(f"surface '{sf.get('surface')}' not in the catalog")
            if not sf.get("meso"):
                F.append(f"near-lens surface '{sf.get('surface')}' has no meso (DETAIL 1)")
            if "wear" not in sf:
                W.append(f"near-lens surface '{sf.get('surface')}' lists no wear")
        if not s.get("surfaces_near"):
            W.append("no near-lens surface named (what is under / in front of the lens?)")
        for kind, key, dc in (("props", "kit", "props"), ("vegetation", "kit", "nature"), ("fx", "kit", "fx"), ("life", "kit", None)):
            for it in s.get(kind, []):
                ref = it.get(key)
                if not ref:
                    if kind != "life":
                        F.append(f"{kind} item without a kit name")
                    continue
                if kind == "life" and "/" not in ref:
                    continue
                r = lookup(cat, ref, dc)
                if r[0] == "local":
                    continue
                if r[0] in ("unknown", "unpublished"):
                    requests.setdefault(ref, []).append(sid)
                    if r[0] == "unknown" and (strict or stage == "build") and not it.get("new"):
                        F.append(f"{kind} '{ref}' not in the kit catalog")
                if it.get("kit", "").startswith("primitive") and it.get("near_lens"):
                    F.append(f"bare primitive near the lens: {ref} (DETAIL 2)")
        # acting + cast
        for a in s.get("acting", []):
            if a.get("who") not in cast:
                F.append(f"acting by unknown cast '{a.get('who')}'")
            if a.get("frames_min", TS["gesture_min_frames"]) < TS["gesture_min_frames"]:
                W.append(f"{a.get('who')} gesture {a.get('frames_min')} f (< {TS['gesture_min_frames']})")
            if not a.get("on"):
                W.append(f"{a.get('who')} acting not keyed to a word")
            if not a.get("expression"):
                W.append(f"{a.get('who')} acting has no expression")
        line = s.get("line", "")
        if line and not s.get("acting") and not any(f.get("insert") for f in fr):
            W.append("no character acting and no insert framing")
        # boards
        for b in s.get("boards", []):
            n = len(words_of(b.get("text")))
            if n > TS["board_warn_words"]:
                F.append(f"board '{b.get('text')}' {n} words (> {TS['board_warn_words']})")
            elif n > TS["board_max_words"]:
                W.append(f"board '{b.get('text')}' {n} words")
            if float(b.get("hold_s", 0)) < TS["board_min_hold_s"]:
                F.append(f"board '{b.get('text')}' held {b.get('hold_s')} s (< {TS['board_min_hold_s']})")
            if b.get("caps_px") is not None and b["caps_px"] < TS["board_min_caps_px"]:
                F.append(f"board '{b.get('text')}' caps {b['caps_px']} px (< {TS['board_min_caps_px']})")
        # captions
        cp = s.get("captions", {})
        for o in cp.get("overrides", []) if isinstance(cp, dict) else []:
            if len(words_of(o.get("text"))) > TS["caption_max_words"]:
                W.append(f"caption '{o.get('text')}' > {TS['caption_max_words']} words")
        if not cp:
            W.append("no caption plan (use {\"mode\": \"auto\"})")
        # sound: every on-screen action has a sound event (or is marked silent)
        snd = s.get("sound", [])
        fors = {x.get("for") for x in snd}
        miss = []
        for k, a in enumerate(s.get("acting", [])):
            if not a.get("silent") and f"acting:{k}" not in fors:
                miss.append(f"acting:{k} ({a.get('action', '')[:30]})")
        for k, x in enumerate(s.get("fx", [])):
            if not x.get("silent") and f"fx:{k}" not in fors:
                miss.append(f"fx:{k} ({x.get('what', '')[:30]})")
        for k, x in enumerate(life):
            if x.get("audible") and f"life:{k}" not in fors:
                miss.append(f"life:{k} ({x.get('what', '')[:30]})")
        if miss:
            F.append("no sound event for " + ", ".join(miss))
        if "amb" not in fors and not st_set.get("ambience"):
            W.append("no ambience")
        # storyboard
        sb = s.get("storyboard", {})
        if stage in ("gate1", "build"):
            still = sb.get("still")
            if not still or not (ROOT / still).exists() and not Path(still).exists():
                F.append("no storyboard still (run tools/v3/storyboard.mjs)")
        status = "FAIL" if F else ("WARN" if W else "PASS")
        shots_out.append({"id": sid, "dur": round(d, 2), "framings": nf, "s_per_framing": round(spf, 2), "cam": round(med, 2),
                          "cam_src": src, "life": len(life), "rig": lt.get("rig"), "status": status, "fails": F, "warns": W})

    # ---- camera at film level (duration-weighted median of shot medians)
    if cam_meds:
        xs = sorted(cam_meds)
        half, acc, film_med = sum(d for _, d in xs) / 2, 0.0, xs[-1][0]
        for m, d in xs:
            acc += d
            if acc >= half:
                film_med = m
                break
        fast = sum(d for m, d in cam_meds if m > 1.0) / max(1e-6, sum(d for _, d in cam_meds))
        still = sum(d for m, d in cam_meds if m < 0.15) / max(1e-6, sum(d for _, d in cam_meds))
        st = "PASS" if film_med >= T["cam_median_target"] else ("WARN" if film_med >= T["cam_median_warn"] else "FAIL")
        row("F11", f"camera median >= {T['cam_median_target']} %/f (his 0.72; ours 0.18-0.35)", st,
            f"{film_med:.2f} %/f ({camsrc if camstats else 'planned / prior: ' + str(camsrc)}); shots faster than 1 %/f: "
            f"{fast * 100:.0f} % of the time (target ~{T['cam_fast_share_target'] * 100:.0f} %); still: {still * 100:.0f} %")
    # ---- kit requests
    if requests:
        row("K", "kit names to align / request", "WARN", f"{len(requests)} names not in a published catalog (see 'requests')")
    nfail = sum(r["status"] == "FAIL" for r in rows) + sum(s["status"] == "FAIL" for s in shots_out)
    nwarn = sum(r["status"] == "WARN" for r in rows) + sum(s["status"] == "WARN" for s in shots_out)
    return {"file": str(path), "stage": stage, "rows": rows, "shots": shots_out, "requests": requests, "fails": nfail, "warns": nwarn,
            "verdict": "FAIL" if nfail else "PASS", "film_s": round(film_s, 1), "framings": nframings,
            "catalog": {c: {"n": len(v["names"]), "sources": v["sources"]} for c, v in cat.items()}}


def main(argv):
    opts = {a.split("=", 1)[0][2:]: (a.split("=", 1)[1] if "=" in a else "1") for a in argv if a.startswith("--")}
    files = [a for a in argv if not a.startswith("--")]
    if not files:
        sys.exit(__doc__)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    res = validate(files[0], opts.get("stage", "decide"), "strict-catalog" in opts, opts.get("cam"), opts.get("only"))
    q = "quiet" in opts
    print(f"BIBLE VALIDATE  {res['file']}  (stage {res['stage']}: {len(res['shots'])} shots, {res['framings']} framings, {res['film_s']} s)")
    print("  catalogs: " + "; ".join(f"{c} {v['n']} names [{', '.join(v['sources']) or 'none published yet'}]" for c, v in res["catalog"].items()))
    for r in res["rows"]:
        if not q or r["status"] != "PASS":
            print(f"  {r['id']:>16}  {r['status']:<5} {r['rule']:<44} {r['detail']}")
    print(f"  {'shot':>5} {'dur':>5} {'fr':>3} {'s/fr':>5} {'cam%/f':>7} {'src':>8} {'life':>4} {'rig':<13} result")
    for s in res["shots"]:
        if q and s["status"] == "PASS":
            continue
        print(f"  {s['id']:>5} {s['dur']:5.1f} {s['framings']:3d} {s['s_per_framing']:5.2f} {s['cam']:7.2f} {s['cam_src']:>8} {s['life']:4d} {str(s['rig']):<13} {s['status']}"
              + "".join(f"\n{'':10}FAIL {x}" for x in s["fails"]) + "".join(f"\n{'':10}warn {x}" for x in s["warns"]))
    if res["requests"]:
        print("  KIT NAMES not in a published catalog yet (align with the owners' NOTES.md, or keep as kit requests):")
        for k, v in sorted(res["requests"].items()):
            print(f"    {k:<34} used by {', '.join(sorted(set(v)))[:90]}")
    print(f"VERDICT: {res['verdict']}  ({res['fails']} fail, {res['warns']} warn)")
    if "json" in opts:
        Path(opts["json"]).write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")
    return 1 if res["verdict"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
