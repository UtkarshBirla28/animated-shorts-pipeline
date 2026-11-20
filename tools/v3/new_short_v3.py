"""NEW SHORT v3: scaffold a kit film (three.js real-world kit) + its sound + its brief folder, ready for PIPELINE_V3 stage A.

Usage (repo root):
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/new_short_v3.py <slug> "<Video title>" [--sound-from=clown]
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/new_short_v3.py <slug> --shots     (re-generate shots.ts
         from briefs/v3/<slug>/bible.json + the locked voice: run after the voice lock and after every bible change)
Creates
  studio/src/videos3/<slug>/   film.ts (exports FILM: Film), shots.ts (GENERATED shot table), camkit.ts + cams.ts (merge)
                               + sets/<set>.cams.ts (first-pass CORE camera presets per set, owned by that set's builder),
                               sets/index.ts + sets/<set>.ts (BLOCKOUT
                               builders from the bible: ground surface + placeholders, enough for the draft storyboard),
                               cast.ts, words.ts (placeholder until the voice is locked), Captions.tsx (house style),
                               FilmView.tsx (<KitFilm film={FILM} overlay=captions />; not "Film.tsx": on Windows
                               "./Film" resolves to film.ts), Root.tsx (KitComposition id <Pascal>Kit),
                               index.ts, tsconfig.json, STARTED_FROM.md
  sound/<slug>/audio/          the proven sound engine (generic modules of the newest film) + LIBRARY.md (the SFX libraries)
  sound/<slug>/voice/          the voice tools (voice_build.py, eleven_build.py, refine_onsets.py) + takes/
  briefs/v3/<slug>/            SCRIPT.md (playbook table), bible.json (from BIBLE_TEMPLATE.json), HANDOFF.md
  studio/out/<slug>/           renders (kit_render writes shots/<quality>/ here)
  .short.json is NOT changed (the old tools target the old films); v3 tools take the slug explicitly.
Render / still / typecheck commands are printed at the end.
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / "studio"
FPS = 30
NL = "\n"
SOUND_GENERIC = ["dsp.py", "instruments.py", "music.py", "mix.py", "sfx.py", "sfx_gen.py", "samples.py", "check_audio.py",
                 "probe.py", "lib_setup.py", "el_sfx.py", "el_measure.py", "cues.md", "picture_events.example.json", "ASSETS.md", "CREDITS.txt"]
VOICE_TOOLS = ["voice_build.py", "eleven_build.py", "refine_onsets.py"]


def pascal(slug):
    return "".join(w[:1].upper() + w[1:] for w in re.split(r"[_\-]", slug))


# ---------------------------------------------------------------- timing from the bible (+ the locked voice)
def shot_frames(bible, slug):
    """[(shot, from, to)] in frames: from the voice's words.json when locked (starts_on words), else est_t0."""
    shots = bible["shots"]
    v = bible.get("voice", {})
    tail = int(v.get("tail_frames", 20))
    wj = ROOT / v.get("words_json", f"sound/{slug}/voice/words.json")
    starts = None
    total = None
    if v.get("locked") and wj.exists():
        W = json.loads(wj.read_text(encoding="utf-8"))
        W = W.get("words", W) if isinstance(W, dict) else W
        toks = [(re.sub(r"[^\w']", "", str(w.get("w", w.get("word", "")))).lower(), float(w.get("s", w.get("start", 0)))) for w in W]
        starts, k0 = [], 0
        for i, s in enumerate(shots):
            if i == 0:
                starts.append(0)
                continue
            key = str(s.get("starts_on", ""))
            word, occ = (key.split("#") + ["1"])[:2]
            word = re.sub(r"[^\w']", "", word).lower()
            hits = [j for j, (t, _) in enumerate(toks) if t == word and j >= k0]
            n = max(1, int(occ)) if occ.isdigit() else 1
            # '#n' counts occurrences in the WHOLE voice; without it, the next occurrence after the previous shot
            if "#" in key:
                allh = [j for j, (t, _) in enumerate(toks) if t == word]
                j = allh[n - 1] if len(allh) >= n else (hits[0] if hits else None)
            else:
                j = hits[0] if hits else None
            if j is None:
                raise SystemExit(f"shot {s['id']}: starts_on '{key}' not found in {wj}")
            k0 = j + 1
            f = round(toks[j][1] * FPS) - 5 + int(s.get("cut_offset_f", 0))        # cut ~5 f before the word
            starts.append(max(starts[-1] + 6, f))
        total = round(max(float(w.get("e", w.get("end", 0))) for w in W) * FPS) + tail
    if starts is None:
        starts = [round(float(s.get("est_t0", 0)) * FPS) for s in shots]
        starts[0] = 0
        lint = ROOT / "briefs" / "v3" / slug / "lint.json"
        est = json.loads(lint.read_text(encoding="utf-8")).get("est_s") if lint.exists() else None
        total = round((est or (float(shots[-1].get("est_t0", 0)) + 2.0)) * FPS) + tail
    out = []
    for i, s in enumerate(shots):
        a = starts[i]
        b = starts[i + 1] if i + 1 < len(shots) else total
        out.append((s, a, max(a + 1, b)))
    return out, total


def ts_str(x):
    return json.dumps(x, ensure_ascii=False)


def write_shots(slug, bible, vdir):
    rows, total = shot_frames(bible, slug)
    lines = [
        f"// GENERATED from briefs/v3/{slug}/bible.json by tools/v3/new_short_v3.py {slug} --shots. Never hand-edit:",
        "// change the bible (LEAD), validate it, re-generate. Cameras live in cams.ts (the builders own them).",
        'import type { ShotDef } from "../../kit/core/ctx";',
        'import { CAMS } from "./cams";',
        "",
        f"export const TOTAL = {total};",
        "export type ShotRow = { id: string; from: number; to: number; set: string; rig: string; rigOpts?: Record<string, number>; beat: string; line: string };",
        "export const SHOT_TABLE: ShotRow[] = [",
    ]
    for s, a, b in rows:
        lt = s.get("light", {})
        ro = lt.get("rig_opts") or {}
        lines.append(f"  {{ id: {ts_str(s['id'])}, from: {a}, to: {b}, set: {ts_str(s['set'])}, rig: {ts_str(lt.get('rig', 'golden'))}, "
                     + (f"rigOpts: {ts_str(ro)}, " if ro else "") + f"beat: {ts_str(s.get('beat', ''))}, line: {ts_str(s.get('line', ''))} }},")
    lines += ["];", "",
              "export const SHOTS: ShotDef[] = SHOT_TABLE.map((r) => ({ id: r.id, from: r.from, to: r.to, set: r.set, rig: r.rig,",
              "  ...(r.rigOpts ? { rigOpts: r.rigOpts as ShotDef[\"rigOpts\"] } : {}), cam: CAMS[r.id](r.from, r.to) }));", ""]
    (vdir / "shots.ts").write_text("\n".join(lines), encoding="utf-8")
    return rows, total


CAM_CASE = {
    # first-pass camera from the bible's preset + params on the canonical layout (subject ground point at the set's
    # mark, camera on +Z). Builders replace the marks with real set coordinates (cams.ts is theirs after scaffolding).
    "lowWideTrack": "lowWideTrack({ ...c, subject: walk ? (u: number) => [m[0], m[1], m[2] - walk * u] : m, dist: [d0, d1], height: h, lookH }, d)",
    "pushIn": "pushIn({ ...c, from: [m[0] + 0.3, h, m[2] + d0], target: [m[0], lookH, m[2]], amount: Math.max(0.02, (d0 - d1) / d0) }, d)",
    "pullBack": "pullBack({ ...c, from: [m[0] + 0.3, h, m[2] + d0], target: [m[0], lookH, m[2]], amount: Math.max(0.02, (d1 - d0) / d0), rise: 0.3 }, d)",
    "droneRise": "droneRise({ ...c, start: [m[0], h, m[2] + d0], target: [m[0], 0.8, m[2]], rise: p.rise ?? 1.5, forward: p.forward ?? d0 - d1 }, d)",
    "craneDown": "craneDown({ ...c, start: [m[0], h, m[2] + d0], target: [m[0], 1.0, m[2]], endH: p.endH ?? 1.2, travel: p.travel ?? d0 - d1 }, d)",
    "orbit": "orbit({ ...c, target: [m[0], lookH, m[2]], radius: d0, height: h, a0: p.a0, a1: p.a1, lookH: 0 }, d)",
    "followSide": "followSide({ ...c, subject: (u: number) => [m[0] + (walk || 1.2) * u, m[1], m[2]], side: d0, height: h, lookH }, d)",
    "povHandheld": "povHandheld({ ...c, from: [m[0], 1.6, m[2] + d0], to: [m[0], 1.6, m[2] + d1] }, d)",
    "macroTopDown": "macroTopDown({ ...c, target: [m[0], 0.8, m[2]], height: Math.max(0.15, h - 0.8) }, d)",
    "lockedWithDrift": "lockedWithDrift({ ...c, pos: [m[0] + 0.2, h, m[2] + d0], look: [m[0], lookH, m[2]] }, d)",
    "whipPan": "whipPan({ ...c, pos: [m[0], h, m[2] + d0], lookA: [m[0], lookH, m[2]], lookB: [m[0] + 3, lookH, m[2]] }, d)",
}


def write_cams(slug, bible, vdir):
    """camkit.ts (the shared preset adapter, LEAD-owned) + sets/<set>.cams.ts per set (MARKS + CAMS of that set's shots,
    owned by that set's builder: parallel builders never touch the same file) + cams.ts (merges them)."""
    presets = sorted(set(CAM_CASE))
    K = [f"// CAMERA KIT of '{slug}' (tools/v3/new_short_v3.py): the bible's preset + params -> a CORE camera (kit/core/camera.ts),",
         "// placed at a subject MARK (ground point, metres, set coordinates; camera on the mark's +Z side). LEAD-owned.",
         'import type { CamState, V3 } from "../../kit/core/ctx";',
         f'import {{ shotCam, {", ".join(presets)} }} from "../../kit/core/camera";',
         "export type CamParams = { fov?: number; height_m?: number; dist_m?: [number, number]; ease?: \"linear\" | \"in\" | \"out\" | \"inOut\" | \"inOut5\";",
         "  shake?: number; walk_mps?: number; lookH?: number; rise?: number; forward?: number; endH?: number; travel?: number; a0?: number; a1?: number };",
         "export type ShotCam = (from: number, to: number) => (t: number) => CamState;",
         "export const mk = (preset: string, mark: V3, p: CamParams, seed = 7): ShotCam => (from, to) =>",
         "  shotCam(from, to, (d) => {",
         "    const m = mark, [d0, d1] = p.dist_m ?? [3, 2.2], h = p.height_m ?? 1.2, lookH = p.lookH ?? 1.1, walk = p.walk_mps ?? 0;",
         "    const c = { fov: p.fov, ease: p.ease, shake: p.shake ?? 0, seed };",
         "    switch (preset) {"]
    for pr in presets:
        K.append(f"      case {ts_str(pr)}: return {CAM_CASE[pr]};")
    K += ["      default: throw new Error(`unknown camera preset ${preset}`);", "    }", "  });", ""]
    (vdir / "camkit.ts").write_text(NL.join(K), encoding="utf-8")
    sd = vdir / "sets"
    sd.mkdir(exist_ok=True)
    by_set = {}
    for i, s in enumerate(bible["shots"]):
        by_set.setdefault(s["set"], []).append((i, s))
    names = []
    for sid, lst in by_set.items():
        ident = re.sub(r"\W", "_", sid)
        names.append(ident)
        f = sd / f"{sid}.cams.ts"
        if f.exists():
            continue
        L = [f"// CAMERAS of the shots on set '{sid}' (first pass from the bible's presets; this set's BUILDER owns this file:",
             "// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with",
             f"// node ../tools/v3/cam_speed.mjs --film src/videos3/{slug}/film.ts (targets: tools/v3/targets.json).",
             'import type { V3 } from "../../../kit/core/ctx";',
             'import { mk, type ShotCam } from "../camkit";',
             f"export const MARKS_{ident}: Record<string, V3> = {{"]
        L += [f"  {ts_str(s['id'])}: [0, 0, 0],  // {s.get('location', '')[:60]}" for _, s in lst]
        L += ["};", f"export const CAMS_{ident}: Record<string, ShotCam> = {{"]
        for i, s in lst:
            cam = s.get("camera", {})
            params = {k: v for k, v in (cam.get("params") or {}).items() if k in ("fov", "height_m", "dist_m", "ease", "shake", "walk_mps", "lookH",
                                                                                 "rise", "forward", "endH", "travel", "a0", "a1")}
            L.append(f"  {ts_str(s['id'])}: mk({ts_str(cam.get('preset', 'pushIn'))}, MARKS_{ident}[{ts_str(s['id'])}], {ts_str(params)}, {7 + i}),")
        L += ["};", ""]
        f.write_text(NL.join(L), encoding="utf-8")
    C = ["// all shot cameras (GENERATED merge of sets/<set>.cams.ts; never hand-edit)", 'import type { ShotCam } from "./camkit";']
    # through the SET file (it re-exports its cams): kit_render.mjs hashes sets/<id>.ts's own import graph per set, so a
    # camera tweak re-renders only that set's shots (a direct import would make every cams file shared = every shot)
    C += [f'import {{ CAMS_{n} }} from "./sets/{sid}";' for sid, n in zip(by_set, names)]
    C += ["export const CAMS: Record<string, ShotCam> = { " + ", ".join(f"...CAMS_{n}" for n in names) + " };", ""]
    (vdir / "cams.ts").write_text(NL.join(C), encoding="utf-8")


def write_sets(slug, bible, vdir):
    sd = vdir / "sets"
    sd.mkdir(exist_ok=True)
    names = []
    for st in bible.get("sets", []):
        sid = st["id"]
        ident = re.sub(r"\W", "_", sid)
        names.append((sid, ident))
        p = sd / f"{sid}.ts"
        if p.exists():
            continue
        spec = json.dumps({k: st.get(k) for k in ("place", "kind", "kit_base", "ground", "surfaces", "props", "vegetation", "practicals", "ambience")},
                          indent=1, ensure_ascii=False)
        spec_c = "\n".join(" * " + ln for ln in spec.splitlines())
        gsurf = (st.get("ground") or {}).get("surface", "concrete_floor")
        interior = st.get("kind") == "interior"
        p.write_text(f"""// SET '{sid}' of '{slug}': BLOCKOUT written by tools/v3/new_short_v3.py (enough for the DRAFT storyboard: the ground
// in its real PBR surface, {'walls' if interior else 'a back wall'} and grey placeholders at the props). The set builder replaces it with the kit
// (SURFACES ground / room / facade kits, NATURE props + vegetation + fx, CARDS cast) EXACTLY as the bible says, keeps the
// export name, and reports the set's build time + GPU cost. Rules: kit/KIT_CONTRACT.md (DETAIL STANDARD), pure function of t.
/* THE BIBLE'S SPEC FOR THIS SET (briefs/v3/{slug}/bible.json; the source of truth, do not edit here):
{spec_c}
 */
import * as THREE from "three";
import type {{ Built, KitCtx }} from "../../../kit/core/ctx";

export const build_{ident} = async (ctx: KitCtx): Promise<Built> => {{
  const g = new THREE.Group();
  g.name = "set:{sid}";
  // ground: the bible's surface through the kit loader (CORE assets.ts), 30 x 30 m
  const pbr = await ctx.assets.pbr({ts_str(gsurf)}, ctx.quality === "draft" ? "1k" : "2k");
  const rep = 30 / pbr.tileM;
  for (const t of [pbr.map, pbr.normalMap, pbr.arm]) if (t) {{ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }}
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({{
    map: pbr.map, normalMap: pbr.normalMap, aoMap: pbr.arm ?? null, roughnessMap: pbr.arm ?? null, metalnessMap: pbr.arm ?? null }}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  // TODO(set builder): walls / facades / room from the SURFACES kit; every prop, plant and practical in the spec above
  const grey = new THREE.MeshStandardMaterial({{ color: 0x9a948c, roughness: 0.8 }});
  const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 0.2), grey);
  wall.position.set(0, 1.6, -4);
  wall.castShadow = wall.receiveShadow = true;
  g.add(wall);
  {"" if not interior else "const side = wall.clone(); side.rotation.y = Math.PI / 2; side.position.set(-5, 1.6, 0); g.add(side);"}
  const props = {len(st.get('props', []))};
  for (let i = 0; i < props; i++) {{
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), grey);
    b.position.set(-2.4 + (i % 5) * 1.2, 0.45, -2.6 + Math.floor(i / 5) * 1.2);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }}
  return {{ object: g, hints: {{ groundAlbedo: [0.35, 0.32, 0.3] }} }};
}};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export {{ CAMS_{ident}, MARKS_{ident} }} from "./{sid}.cams";
""", encoding="utf-8")
    idx = ["// the film's sets: set id -> builder (one file per set: kit_render hashes sets/<id>.ts on its own, so a set change",
           "// re-renders only the shots on that set). GENERATED list; the builders own the set files.",
           'import type { SetBuilder } from "../../../kit/core/ctx";']
    idx += [f'import {{ build_{ident} }} from "./{sid}";' for sid, ident in names]
    idx += ["export const SETS: Record<string, SetBuilder> = {"] + [f"  {ts_str(sid)}: build_{ident}," for sid, ident in names] + ["};", ""]
    (sd / "index.ts").write_text("\n".join(idx), encoding="utf-8")


CAPTIONS = r'''// House captions for a v3 film (study/CHANNEL_STYLE_BIBLE.md section 7 + the antitheft / clown engine, simplified): Montserrat
// 900, 76 px, white, 5 px black stroke, soft drop shadow, centred x 540, CSS top 1311 (cap top ~1323, baseline ~1376 at
// 1080 x 1920), inside the caption band y 1280-1440. 1-3 words per caption: short function words join the NEXT word
// (never into a PUNCH word), never across a real pause; up 2 f before the word, held through short gaps, hidden in
// pauses >= 8 f; nothing on frame 0 or in the last TAIL frames (the loop picture stays clean). Reads words.ts only.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { WORDS } from "./words";
import { TOTAL } from "./shots";

const JOIN = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "and", "so", "is", "it", "you", "her", "his", "with", "by", "but", "if", "your", "my"]);
/** words the picture lands on: each comes up alone (edit per film; the bible's boards / punch words) */
export const PUNCH = new Set<string>([]);
const LEAD = 2, HIDE_GAP = 8, HOLD = 1, TAIL = 6, MAX_CHARS = 14;
const bare = (w: string) => w.replace(/["“”]/g, "").toLowerCase().replace(/[^a-z0-9'%]/g, "");
type Cap = { text: string; f0: number; f1: number };
export const CAPS: Cap[] = (() => {
  const out: Cap[] = [];
  let cur: { words: string[]; start: number; last: number } | null = null;
  WORDS.forEach((w, i) => {
    const text = w.w.replace(/["“”]/g, ""), next = WORDS[i + 1];
    if (!cur) cur = { words: [], start: w.f, last: i };
    cur.words.push(text); cur.last = i;
    const gap = next ? next.f - w.fe : 99;
    const joinNext = next && JOIN.has(bare(text)) && !PUNCH.has(bare(next.w)) && gap < 4 && cur.words.length < 3 &&
      (cur.words.join(" ") + " " + next.w).length <= MAX_CHARS && !/[.,!?:;]$/.test(text);
    if (!joinNext) { out.push({ text: cur.words.join(" "), f0: Math.max(1, cur.start - LEAD), f1: w.fe }); cur = null; }
  });
  for (let k = 0; k < out.length; k++) {
    const nx = out[k + 1];
    out[k].f1 = nx ? (nx.f0 - out[k].f1 >= HIDE_GAP ? out[k].f1 + HOLD : nx.f0) : Math.min(out[k].f1 + HOLD, TOTAL - TAIL);
  }
  return out;
})();

export const Captions: React.FC<{ frame: number }> = ({ frame }) => {
  const [handle] = useState(() => delayRender("v3 caption font"));
  useEffect(() => {
    const f = new FontFace("MontserratV3", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
    f.load().then((ff) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(ff); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [handle]);
  const c = CAPS.find((x) => frame >= x.f0 && frame < x.f1);
  if (!c || frame === 0 || frame >= TOTAL - TAIL) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 1311, left: 0, width: 1080, textAlign: "center", fontFamily: "MontserratV3", fontWeight: 900,
        fontSize: 76, lineHeight: 1, color: "#FFFFFF", WebkitTextStroke: "10px #000", paintOrder: "stroke fill",
        textShadow: "2px 4px 3px rgba(0,0,0,0.85)" }}>{c.text}</div>
    </AbsoluteFill>
  );
};
'''


def scaffold(slug, title, sound_from):
    comp = pascal(slug)
    vdir = STUDIO / "src" / "videos3" / slug
    bdir = ROOT / "briefs" / "v3" / slug
    if vdir.exists():
        sys.exit(f"{vdir} already exists (use --shots to re-generate the shot table)")
    bdir.mkdir(parents=True, exist_ok=True)
    # brief folder: SCRIPT.md + bible.json from the template (kept if present: e.g. briefs/v3/award already has them)
    if not (bdir / "SCRIPT.md").exists():
        (bdir / "SCRIPT.md").write_text(f"""# "{title}" (slug `{slug}`): SCRIPT

lint-allow:

## Facts (each line checked against its primary source; the link goes in the description)
-

## Script (the voice-over; Beat drives tools/v3/script_lint.py; Speaker = whose voice)
| s | Beat | Speaker | Line |
|---|---|---|---|
| 0 | Hook | N | |
| 7 | Stakes | N | |
| 15 | Doubter | N | |
| 20 | Escalation | N | |
| 40 | Loop line | N | |
| 45 | Answer | N | |
| 52 | Why | N | |
| 60 | Payoff | N | |
""", encoding="utf-8")
    if not (bdir / "bible.json").exists():
        b = json.loads((ROOT / "briefs/v3/BIBLE_TEMPLATE.json").read_text(encoding="utf-8"))
        b.update({"slug": slug, "title": title})
        b["script"]["path"] = f"briefs/v3/{slug}/SCRIPT.md"
        b["voice"]["words_json"] = f"sound/{slug}/voice/words.json"
        (bdir / "bible.json").write_text(json.dumps(b, indent=1, ensure_ascii=False), encoding="utf-8")
    if not (bdir / "HANDOFF.md").exists():
        (bdir / "HANDOFF.md").write_text(f"""# HANDOFF: {title} ({slug}) - v3 (PIPELINE_V3.md). Update at EVERY step: state, running jobs + run IDs + args files, next command.

| stage | state | evidence |
|---|---|---|
| A0 scaffold | done | studio/src/videos3/{slug}/ |
| A1 script + lint | | briefs/v3/{slug}/SCRIPT.md, lint.json |
| A2 voice (locked) | | sound/{slug}/voice/, studio/out/{slug}/voicetest/ |
| A3 bible + validate | | briefs/v3/{slug}/bible.json, validate.json |
| A4 storyboard | | studio/out/{slug}/storyboard_draft.jpg |
| A5 OWNER GATE 1 | | |
| B build | | workflows/v3 build_v3 run id, args file |
| C animatic + gates + audit, OWNER GATE 2 | | studio/out/{slug}/{slug}_preview.mp4, gates |
| D polish | | |
| E final + QA + upload kit | | studio/out/{slug}/upload/ |
""", encoding="utf-8")
    bible = json.loads((bdir / "bible.json").read_text(encoding="utf-8"))
    has_shots = bool(bible.get("shots")) and not str(bible["shots"][0].get("id", "")).startswith("s01") is False
    vdir.mkdir(parents=True)
    (vdir / "words.ts").write_text("""// PLACEHOLDER until the voice is locked: then run (repo root)
//   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/gen_words_ts.py sound/<slug>/voice studio/src/videos3/<slug>/words.ts
// and re-generate the shot table: tools/v3/new_short_v3.py <slug> --shots
export type Word = { w: string; s: number; e: number; f: number; fe: number; p: number };
export const WORDS: Word[] = [];
""", encoding="utf-8")
    if bible.get("shots") and bible["shots"][0].get("set") and bible["shots"][0]["set"] != "<set id>":
        write_shots(slug, bible, vdir)
        write_cams(slug, bible, vdir)
        write_sets(slug, bible, vdir)
    else:
        (vdir / "shots.ts").write_text('import type { ShotDef } from "../../kit/core/ctx";\nexport const TOTAL = 60;\nexport const SHOTS: ShotDef[] = [];\n'
                                       "// GENERATED by tools/v3/new_short_v3.py <slug> --shots once the bible has shots\n", encoding="utf-8")
        (vdir / "sets").mkdir(exist_ok=True)
        (vdir / "sets" / "index.ts").write_text('import type { SetBuilder } from "../../../kit/core/ctx";\nexport const SETS: Record<string, SetBuilder> = {};\n', encoding="utf-8")
    cast = [{k: c.get(k) for k in ("id", "role", "build", "body_colour", "signature", "card", "speaks", "expressions")} for c in bible.get("cast", [])]
    (vdir / "cast.ts").write_text(f"""// CAST of '{slug}' (from the bible; CARDS kit: studio/src/kit/cards/, see its NOTES.md). The set builders place and act
// them with the CARDS API (card.ts / crowd.ts / cardlight.ts); this file holds only the design data, shared by every set.
export type CastSpec = {{ id: string; role: string; build: "small" | "standard" | "tall"; body_colour: string; signature: string; card: string;
  speaks: boolean; expressions: string[] }};
export const CAST: CastSpec[] = {json.dumps(cast, indent=1, ensure_ascii=False)};
""", encoding="utf-8")
    (vdir / "film.ts").write_text(f"""// FILM of '{slug}': what CORE's <KitFilm film={{FILM}} /> and scripts/kit_render.mjs render. Shot table: shots.ts
// (GENERATED from the bible), cameras: cams.ts, sets: sets/<id>.ts. Everything a pure function of t.
import type {{ Film }} from "../../kit/core/ctx";
import {{ SHOTS, TOTAL }} from "./shots";
import {{ SETS }} from "./sets";

export const FILM: Film = {{ slug: {ts_str(slug)}, fps: 30, total: TOTAL, shots: SHOTS, sets: SETS }};
""", encoding="utf-8")
    (vdir / "Captions.tsx").write_text(CAPTIONS, encoding="utf-8")
    # NOT "Film.tsx": on Windows "./Film" resolves to film.ts (case-insensitive file system, .ts tried before .tsx)
    (vdir / "FilmView.tsx").write_text(f"""// <{comp}Film />: the whole film with captions (CORE's KitFilm + the house captions). Root.tsx registers it through
// KitComposition (which also hands kit_render.mjs its per-shot signatures).
import React from "react";
import {{ KitFilm, type KitFrameInfo }} from "../../kit/core/pipeline";
import type {{ Quality }} from "../../kit/core/ctx";
import {{ FILM }} from "./film";
import {{ Captions }} from "./Captions";

export const overlay = (f: KitFrameInfo) => <Captions frame={{f.frame}} />;
export const {comp}Film: React.FC<{{ quality?: Quality }}> = ({{ quality = "preview" }}) => <KitFilm film={{FILM}} quality={{quality}} overlay={{overlay}} />;
""", encoding="utf-8")
    (vdir / "Root.tsx").write_text(f"""import React from "react";
import {{ KitComposition }} from "../../kit/core/pipeline";
import {{ FILM }} from "./film";
import {{ overlay }} from "./FilmView";
// v3 film '{slug}': ENTRY=src/videos3/{slug}/index.ts COMP={comp}Kit (one composition renders every quality: inputProps kit.quality)
export const Root: React.FC = () => <KitComposition id="{comp}Kit" film={{FILM}} overlay={{overlay}} />;
""", encoding="utf-8")
    (vdir / "index.ts").write_text('import { registerRoot } from "remotion";\nimport { Root } from "./Root";\nregisterRoot(Root);\n', encoding="utf-8")
    (vdir / "tsconfig.json").write_text(json.dumps({"extends": "../../../tsconfig.json", "include": ["./**/*", "../../kit/**/*"], "exclude": []}, indent=1) + "\n",
                                        encoding="utf-8")
    (vdir / "STARTED_FROM.md").write_text(f"""# {title} ({slug}): a v3 kit film (PIPELINE_V3.md)
- GENERATED (never hand-edit): shots.ts (from the bible: `tools/v3/new_short_v3.py {slug} --shots`), words.ts (tools/gen_words_ts.py).
- LEAD: briefs/v3/{slug}/bible.json (the source of truth), film.ts, Root.tsx, FilmView.tsx, Captions.tsx (PUNCH words).
- BUILDERS (workflows/v3/build_v3.js, one per set / set group): sets/<set>.ts (blockout -> kit) and sets/<set>.cams.ts (the
  marks + params of the shots on that set), cast staging inside their sets; nothing else (never studio/src/kit/*).
- Typecheck: cd studio && npx tsc --noEmit -p src/videos3/{slug}/tsconfig.json
- Stills: node ../tools/v3/storyboard.mjs --slug {slug}   | Renders: node scripts/kit_render.mjs --entry src/videos3/{slug}/index.ts --comp {comp}Kit --quality preview --shots all --out out/{slug}/
""", encoding="utf-8")
    # sound
    src_a = ROOT / "sound" / sound_from / "audio"
    dst_a = ROOT / "sound" / slug / "audio"
    dst_a.mkdir(parents=True, exist_ok=True)
    copied = []
    for f in SOUND_GENERIC:
        if (src_a / f).exists() and not (dst_a / f).exists():
            t = (src_a / f).read_text(encoding="utf-8", errors="replace")
            t = (t.replace(f"sound/{sound_from}", f"sound/{slug}").replace(f"out/{sound_from}", f"out/{slug}")
                  .replace(f'"out", "{sound_from}"', f'"out", "{slug}"'))
            (dst_a / f).write_text(t, encoding="utf-8")
            copied.append(f)
    (dst_a / "LIBRARY.md").write_text(f"""# Sound libraries for '{slug}' (not copied: referenced)
- CC0 recordings: sound/{sound_from}/audio/_lib/ (63 files, sources in _sources.json; credits in CREDITS.txt)
- ElevenLabs sound-effect takes (SFX only, never voice): sound/{sound_from}/audio/_el/ (~46 MB, measured in samples_measured.json)
- samples.py loads from _lib / _el next to it: copy or link the folders you use (`cp -r ../../{sound_from}/audio/_lib .`), add
  new takes per the bible's sound events (el_sfx.py; tell the owner the credit cost first), measure them (el_measure.py).
COPIED from sound/{sound_from}/audio (generic engine): {', '.join(copied)}. Story content that MUST be replaced: the cue
lists / picture events (from the builders' sound_cues.json), music cue points (from the bible's music.changes), mix levels
per line. Run: PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/{slug}/audio/mix.py
""", encoding="utf-8")
    dst_v = ROOT / "sound" / slug / "voice"
    (dst_v / "takes").mkdir(parents=True, exist_ok=True)
    for f in VOICE_TOOLS:
        s = ROOT / "sound" / "saladoil" / "voice" / f
        if s.exists() and not (dst_v / f).exists():
            shutil.copy2(s, dst_v / f)
    (STUDIO / "out" / slug).mkdir(parents=True, exist_ok=True)
    print(f"""v3 short '{slug}' scaffolded:
  picture  {vdir}  (composition {comp}Kit)
  sound    {ROOT / 'sound' / slug}  ({len(copied)} engine files + voice tools)
  brief    {bdir}
next (PIPELINE_V3.md stage A): lint the script -> voice FIRST -> bible -> validate -> storyboard -> OWNER GATE 1
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/script_lint.py briefs/v3/{slug}/SCRIPT.md --json=briefs/v3/{slug}/lint.json
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/{slug}/bible.json
  cd studio && npx tsc --noEmit -p src/videos3/{slug}/tsconfig.json
  node tools/v3/storyboard.mjs --slug {slug}""")


def main(argv):
    opts = [a for a in argv if a.startswith("--")]
    args = [a for a in argv if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    slug = args[0]
    if not re.fullmatch(r"[a-z][a-z0-9_]*", slug):
        sys.exit("slug must be lower_snake_case")
    if "--shots" in opts:
        vdir = STUDIO / "src" / "videos3" / slug
        bible = json.loads((ROOT / "briefs" / "v3" / slug / "bible.json").read_text(encoding="utf-8"))
        rows, total = write_shots(slug, bible, vdir)
        write_cams(slug, bible, vdir)        # adds cams files for new sets; existing <set>.cams.ts are kept
        write_sets(slug, bible, vdir)      # only adds missing set files + rewrites the index
        print(f"shots.ts: {len(rows)} shots, TOTAL {total} f ({total / FPS:.2f} s)")
        return 0
    title = args[1] if len(args) > 1 else slug.replace("_", " ").title()
    sf = next((o.split("=", 1)[1] for o in opts if o.startswith("--sound-from=")), "clown")
    scaffold(slug, title, sf)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
