# Animated Shorts Studio

Home for making the channel's animated story shorts (2D cartoon characters in a painted 3D world), built on the
open-source repo **mromidev/claude-animated-shorts** (MIT). Set up 2026-11-10. The older folders
`C:\Users\utkar\cartoon-shorts` and `C:\Users\utkar\bridge-short` belong to the earlier Hakamada video (Codex is
finishing it); nothing here depends on them.

| Folder | What is in it |
|---|---|
| `repo\` | Pristine clone of the repo (read-only reference; do not edit) |
| `studio\` | The working Remotion project: Remotion 4.0.290, three 0.175, R3F 9.1.2, postprocessing 6.37.2 (pinned, installed). `src\videos\bridge\` = the repo's sample short, `scripts\` = stills + QA helpers, `public\bridge\kenney\` = 26 Kenney CC0 props, `public\fonts\Montserrat.ttf` (OFL), `_downloads\kenney\*.zip` = 7 Kenney kits (nature, fantasy town, pirate, furniture, car, city commercial, city suburban) |
| `sound\bridge\` | The repo's synthesized audio engine (`audio\`: timeline, sfx, music, instruments, dsp, mix) with a placeholder test voice in `voice\` |
| `study\REPO_KNOWLEDGE.md` | Master notes on every line of the repo (pipeline, style numbers, code map, audio engine, bugs, checklist for a new story) |
| `study\repo\` | Nine detailed slice notes behind the master file |
| `study\videos\<slug>.md` | Frame-by-frame breakdown of each of the 16 reference shorts (story, shots, camera, characters, colour, captions, animation, voice, sound) |
| `study\videos\_data\<slug>\` | Measurements behind each breakdown: shot strips, full-res frames, 1 fps sheet, camera-motion plot, transcript with word times, loudness, pitch, spectrograms |
| `study\CHANNEL_STYLE_BIBLE.md` | Cross-video synthesis of all 16 shorts: the channel's rules with numbers, a production recipe for our pipeline, and a verification log (36 statements re-checked against frames, 19 fixed) |
| `study\CLAIMS_VERDICT.md` | The repo's style claims tallied across 16 videos (with corrected rules), plus a gap table: channel vs our template, file:line, priority, and the top 10 changes before our first video |
| `study\CHANNEL_NUMBERS.md` | Per-video measurement table (duration, shots, dissolves, words/s, loudness, pitch, colour) with medians |
| `skills\` | Which Claude skills were installed for this pipeline and why (`SKILLS_INSTALLED.md`) |
| `tools\` | Measurement scripts (`measure_video.py`, `voice_pitch.py`) and a private Python env `.venv` (numpy, opencv, scipy, pillow, matplotlib, faster-whisper) |

## Common commands (Git Bash)
```bash
cd /c/Users/utkar/Desktop/animated-shorts-studio/studio
npx tsc --noEmit                      # 6 known harmless errors in Bridge.tsx:66-72
REMOTION_TMP=C:/Users/utkar/Desktop/animated-shorts-studio/_remotion-tmp node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5
npx remotion render src/index.ts <Comp> out/<name>/video.mp4 --codec h264 --crf 16

cd /c/Users/utkar/Desktop/animated-shorts-studio/sound/<name>/audio
PYTHONNOUSERSITE=1 ../../../tools/.venv/Scripts/python.exe -s mix.py   # delete audio/_cache after ANY change

# measure a new reference video
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/measure_video.py study/videos/_data "<video.mp4>"
```

## Verified on 2026-11-10
- `npm install` (232 packages) and `tsc` OK; a test still of the bridge sample (frame 400, 0.5 scale) rendered in 40 s
  (bundling took ~6 min while the CPU was shared with other jobs).
