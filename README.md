# Animated Shorts Pipeline

A complete, repeatable pipeline for release-quality vertical animated story shorts: 2D bean-head cartoon cards in a
painted 3D world (three.js r175 inside Remotion 4.0.290), an ElevenLabs narration, and an original synthesized
score and SFX. Claude Code runs a multi-agent **build -> audit -> fix** loop until every shot scores >= 8/10 and the
sound passes.

Built from the first real short, **"The Anti-Theft Sign That Made People Steal"**, which is included as the worked
example. It also includes every tool, workflow and lesson from that build.

| Start here | What it is |
|---|---|
| [SETUP.md](SETUP.md) | install on a new Windows machine (about 20 min) |
| [PIPELINE.md](PIPELINE.md) | the process, stage by stage, with commands and gates |
| [LESSONS.md](LESSONS.md) | the hard-won rules (voice, clocks, loop seam, renders, workflows) |
| [.claude/skills/animated-story-short/SKILL.md](.claude/skills/animated-story-short/SKILL.md) | the Claude Code skill that drives it all |
| [workflows/](workflows/README.md) | `build.js`, `audit.js`, `fix.js` (multi-agent workflows) + args schema |
| [briefs/TEMPLATE.md](briefs/TEMPLATE.md) | the brief to fill for a new script |

## Layout
```
studio/                Remotion project (pinned). src/videos/saladoil + antitheft = worked examples (engine + story)
  scripts/             stills, chunked renders, sandboxes, timeline export, camera projection, audio probes, QA
  _downloads/kenney/   Kenney CC0 model kits;  public/ = fonts (OFL) + extracted Kenney props
sound/saladoil/        audio engine (timeline, sfx, music, instruments, dsp, mix, picture probes) + voice tools
sound/antitheft/       the first example's audio engine + voice tools (ElevenLabs assembly)
tools/                 voice selection/QA, time-map, audit digest, sheets, new_short.py, short_cfg.py
workflows/             general build / audit / fix workflows
study/                 channel style bible + numbers + template code notes + voice audition results (text only)
examples/saladoil/     the real HANDOFF log, every args JSON, carryover notes (LEAD merge decisions), audit A2 scores + fixes
examples/antitheft/    the first example's HANDOFF log, carryover notes, an audit digest, the original workflows
briefs/                TEMPLATE.md + the saladoil and antitheft briefs
setup/                 setup.ps1, requirements.txt, check_env.py
```

## Quick start (new script)
```bash
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/new_short.py moon_heist MoonHeist "The Heist That Stole the Moon"
# (starts from the newest engine, saladoil; add --from=antitheft for the older one)
# then in Claude Code:  "Use the animated-story-short skill on briefs/moon_heist.md"
```

## Not in the repo (by design)
Renders, audio takes and mixes, reference videos and frames (private study material), the Python venv,
node_modules, the Kokoro model, and any API key. See `.gitignore`.

Status: antitheft is FINAL (2026-11-12: audit A8 film 7.8, sound 7.8, shots 7.1). saladoil ("The Oil Tanks That Were
Mostly Water") is the newest engine, snapshot after fix round 2 (audit A2: shots 6.8, film 7.6, sound 7.8; the loop
continues to an average of 8). LESSONS.md 34-44 hold what it taught.


Credits: [THIRD_PARTY.md](THIRD_PARTY.md). It builds on mromidev/claude-animated-shorts (MIT).
