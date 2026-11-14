"""Start a NEW short from a worked example (default: saladoil, the newest engine; or --from=antitheft): picture engine +
sound engine + voice tools, ready for the
LEAD to write the story contract (BUILD_PLAN.md, plan.ts, story.ts) and for the build workflow to fill the sets/cast.

Usage:  python tools/new_short.py <slug> <CompName> ["Video title"] [--from=saladoil|antitheft]
   e.g. python tools/new_short.py moon_heist MoonHeist "The Heist That Stole the Moon"
   saladoil (2026-11-14) has the newer engine: picture probes in the sound mix, the smoothed DOF racks, the grain
   pass, readable split-flap boards. antitheft is the first finished example (A8: film 7.8, sound 7.8).

Creates
  studio/src/videos/<slug>/        copy of studio/src/videos/<example> with <ExComp>.tsx -> <CompName>.tsx,
                                   <ExComp>Short -> <CompName>Short, <EXCOMP>_FRAMES -> <COMPNAME>_FRAMES
  studio/src/Root.tsx              + <Composition id="<CompName>Short" ...>
  sound/<slug>/audio/              sound engine code (timeline, sfx, sfx_gen, music, instruments, dsp, mix) + cues.md
  sound/<slug>/voice/              voice tools (voice_build.py = script/phrase table, eleven_build.py, refine_onsets.py)
  studio/out/<slug>/               renders, audits, HANDOFF.md
  briefs/<slug>.md                 from briefs/TEMPLATE.md (only if missing)
  .short.json                      {"slug", "comp", "title"}: every tool now works on this short (env SHORT overrides)
The example's STORY content stays in the copies until replaced (see studio/src/videos/<slug>/STARTED_FROM.md).
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAMPLES = {"saladoil": "SaladOil", "antitheft": "AntiTheft"}
frm = [a for a in sys.argv[1:] if a.startswith("--from=")]
args = [a for a in sys.argv[1:] if not a.startswith("--from=")]
EX = frm[0].split("=", 1)[1] if frm else "saladoil"
if EX not in EXAMPLES:
    sys.exit(f"--from must be one of {list(EXAMPLES)}")
EXC = EXAMPLES[EX]
if len(args) < 2:
    sys.exit(__doc__)
slug, comp = args[0], args[1]
title = args[2] if len(args) > 2 else slug.replace("_", " ").title()
if not re.fullmatch(r"[a-z][a-z0-9_]*", slug):
    sys.exit("slug must be lower_snake_case (a-z, 0-9, _)")
if not re.fullmatch(r"[A-Z][A-Za-z0-9]*", comp):
    sys.exit("CompName must be PascalCase, e.g. MoonHeist")
src_v, dst_v = ROOT / "studio/src/videos" / EX, ROOT / "studio/src/videos" / slug
if dst_v.exists():
    sys.exit(f"{dst_v} already exists")

# picture
shutil.copytree(src_v, dst_v)
(dst_v / f"{EXC}.tsx").rename(dst_v / f"{comp}.tsx")
for p in dst_v.iterdir():
    if p.suffix in (".ts", ".tsx"):
        s = p.read_text(encoding="utf-8")
        t = (s.replace(f"{EXC}Short", f"{comp}Short").replace(f"{EXC.upper()}_FRAMES", f"{comp.upper()}_FRAMES")
              .replace(f'delayRender("{EX} kit")', f'delayRender("{slug} kit")'))
        if t != s:
            p.write_text(t, encoding="utf-8")
(dst_v / "STARTED_FROM.md").write_text(f"""# {title} ({slug}) -- started from the {EX} example

ENGINE (keep, extend; owners may improve them): {comp}.tsx (composer: ink -> lens -> bloom -> tone map -> grade, dissolves,
per-layer lights, voice clock), Captions.tsx, ink.ts, grade.ts, lensblur.ts, build.ts, world.ts (set/cast dispatch),
ctx.ts, shade.ts (two-tone + light pools), cardshade.ts, toon.ts (Pen drawing system: faces, outlines, expressions --
the {EX} CHARACTER designs inside it are story content), voicewarp.ts + words.ts (GENERATED, never hand-edit).

STORY CONTENT (replace for this short): BUILD_PLAN.md (LEAD), plan.ts (anchors, LightName list), story.ts (BEAT words,
SHOTS, CAMS, DOFS, KICKS, XFADE, lights/relights), sets_ext.ts + paint.ts (WORLD-EXT), sets_int.ts + lights.ts
(WORLD-INT), cast.ts + the character designs in toon.ts (CHAR). Until replaced they still draw the {EX} story.
""", encoding="utf-8")
root_tsx = ROOT / "studio/src/Root.tsx"
r = root_tsx.read_text(encoding="utf-8")
imp = f'import {{ {comp}Short, {comp.upper()}_FRAMES }} from "./videos/{slug}/{comp}";\n'
comp_line = (f'    <Composition id="{comp}Short" component={{{comp}Short}} durationInFrames={{{comp.upper()}_FRAMES}} '
             f'fps={{30}} width={{1080}} height={{1920}} />\n')
if imp not in r:
    r = r.replace('import { AntiTheftShort', imp + 'import { AntiTheftShort', 1)
    r = r.replace("  </>\n", comp_line + "  </>\n", 1)
    root_tsx.write_text(r, encoding="utf-8")

# sound
for sub, keep in (("audio", (".py", ".md")), ("voice", (".py",))):
    s_dir, d_dir = ROOT / "sound" / EX / sub, ROOT / "sound" / slug / sub
    d_dir.mkdir(parents=True, exist_ok=True)
    for f in s_dir.iterdir():
        if f.is_file() and (f.suffix in keep or f.name == "picture_events.example.json"):
            shutil.copy2(f, d_dir / f.name)
(ROOT / "sound" / slug / "voice" / "takes").mkdir(exist_ok=True)
(ROOT / "studio/out" / slug).mkdir(parents=True, exist_ok=True)
brief = ROOT / "briefs" / f"{slug}.md"
if not brief.exists():
    brief.write_text((ROOT / "briefs/TEMPLATE.md").read_text(encoding="utf-8").replace("<TITLE>", title), encoding="utf-8")
(ROOT / ".short.json").write_text(json.dumps({"slug": slug, "comp": comp, "title": title}, indent=1) + "\n", encoding="utf-8")
print(f"""new short '{slug}' ({comp}Short): {dst_v}
current short -> .short.json (every tool and workflow now targets it; env SHORT=<slug> overrides)
next: fill briefs/{slug}.md, then follow PIPELINE.md stage 1 (script + facts) -> stage 2 (voice FIRST).""")
