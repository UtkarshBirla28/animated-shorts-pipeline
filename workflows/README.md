# Workflows

Run them with Claude Code's Workflow tool: `scriptPath: <ROOT>/workflows/<name>.js`, plus `args` (a JSON object; the
scripts also accept it as a JSON string). **Save every args object to `studio/out/<slug>/args_<stage>.json` first.**
Resuming a stopped run (`resumeFromRunId`) reuses finished agents only if the args are byte-identical.

| Script | Agents | When |
|---|---|---|
| `build.js` | 5 (WORLD-EXT, WORLD-INT, CHAR, POST, AUDIO) | Stage 4, once per short |
| `audit.js` | ceil(shots/2) + 2 (whole film id 0, sound + voice id 99) | after every preview render |
| `fix.js` | one per owner in `fixes` (WORLD-EXT, WORLD-INT, CHAR, POST, CAM, AUDIO) | after every audit digest |

## Common args
```json
{
  "root": "C:\\Users\\<you>\\Desktop\\animated-shorts-pipeline",
  "slug": "moon_heist", "comp": "MoonHeist", "title": "The Heist That Stole the Moon",
  "seconds": 80, "shots": 16,
  "place": "a 1960s lunar research base",
  "safety": "no real agency logos, adults only, family-safe, the real engineer is a generic respectful cartoon",
  "voice": "a natural ElevenLabs read (James, eleven_v4) at about 2.6-2.8 words/s, so the film runs ~80 s"
}
```
- **build.js** adds `jobs` (optional): `{ "WORLD-EXT": "...", "WORLD-INT": "...", "CHAR": "...", "POST": "...", "AUDIO": "..." }`.
  These are owner-specific job texts written from BUILD_PLAN.md (see `examples/antitheft/workflows/build_r1.js` for
  the level of detail that worked). Without them, each owner gets a generic "build what BUILD_PLAN.md assigns you".
- **audit.js** adds `round` ("A1"...), `video` ("studio\\out\\<slug>\\preview1.mp4"), `pronounce` (hard names),
  `acting` (what each beat's delivery must do), `user_decisions` (extra binding decisions), and `time_map` (true only
  for a short that was re-voiced after the picture, like antitheft).
- **fix.js** adds `round` (the audit round it answers), `video`, `notes` (round notes for every owner: new plumbing,
  coordination, rules), `fixes` (per owner: "READ <ROOT>\\studio\\out\\<slug>\\audit_A<n>\\fixes_<OWNER>.md completely
  ... plus the <OWNER> section of carryover_r<n>.md"; CAM reads fixes_LEAD.md), and `time_map`.

The antitheft originals (`examples/antitheft/workflows/`) show real args in use. Their texts are story-specific.
