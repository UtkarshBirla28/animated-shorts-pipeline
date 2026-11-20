# tools/v3 (WORKFLOW owner): what exists, how to run it, test results, honest gaps

Process: `PIPELINE_V3.md` (repo root). Python always: `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s ...` from the
repo root (Git Bash). Node tools run from anywhere (they resolve the repo themselves).

| tool | stage | what |
|---|---|---|
| `script_lint.py` | A1 | SCRIPT.md vs the playbook (SCRIPT_REPORT 5.2 / 5.4): length + pace, hook, numbers, names / years, doubter, loop line, answer %, answer-to-end, why, payoff; PASS / WARN / FAIL with line numbers; `--json` |
| `targets.json` | all | every threshold with its source (edit here, not in code) |
| `bible_validate.py` | A3, A5, B0 | the DETAIL BIBLE vs the DETAIL STANDARD + research targets + kit catalogs; `--stage=decide|gate1|build` |
| `cam_speed.mjs` | A3, B | CORE's `camSpeedStats` on the bible's PLANNED presets (`--plan`) or the built film (`--film`) |
| `storyboard.mjs` | A4 | draft stills of every shot through CORE's `kit_render.mjs --stills` + a numbered contact sheet |
| `qa_gates.py` | C, D, E | per-shot look_metrics + loudness + loop + captions on a rendered animatic / preview / final; gate table |
| `render_estimate.py` | A3, B | render hours per quality from the bible + CORE's measured s/frame |
| `new_short_v3.py` | A0 | scaffolds `studio/src/videos3/<slug>/`, `sound/<slug>/`, `briefs/v3/<slug>/` |

## Pace model (script_lint)
Calibrated 2026-11-19 on the real words.json of our 4 voiced films (James eleven_v4): duration = words / WPS + 0.25 s per
sentence gives WPS = antitheft 2.62, clown 2.77, saladoil 2.73, typo 2.56 (mean 2.67, the default). Overall pace incl.
pauses 2.32-2.47 w/s. Expect +-6 % on a new script; the voice decides (never time-stretch).

## Test results (2026-11-19)
script_lint on our 4 voiced scripts (all FAIL, matching SCRIPT_REPORT 4.1):
- antitheft: 6 fail (est 89 s for 65; 7 numbers; Robert Cialdini; no doubter; loop line too long / early; 35 s after the answer)
- clown v6: 4 fail (est 86 s incl. the 7 s count; Ira Hyman x2; the answer at 19 %; 64 s after it). Doubter PASS ("You saw him, right?" = the viewer's certainty, 5.1's own rule)
- saladoil: 5 fail (1963 + 150 million in the hook; Tino De Angelis / American Express / Warren Buffett; no doubter; 40 s after the answer)
- typo: 7 fail (40 billion in the hook; 12 different numbers; 2005 / December 8th; Mizuho / Tokyo Stock Exchange; answer at 33 %)
The 3 playbook examples (SCRIPT_REPORT 5.6, `--target=70`): each 1 fail, and they are real: Script 1 and 3 put the doubter at
57 % / 49 % (rule 4 says by 30 %); Script 2 says 8 different numbers (rule 6: at most 4). The worked example
`briefs/v3/award/SCRIPT.md` (Script 1 + Mom's dramatized line as an early doubter) PASSES (2 warn: loop line at 67 %, 15.6 s
after the answer).

bible_validate on `briefs/v3/award/bible.json` (22 shots, 35 framings, 8 sets): first run FAIL (a shot with 3.6 s on one
framing; two interiors without practicals); after CORE's camSpeedStats(plan) it caught 5 camera mistakes in my own plan (a
pushIn whose distance grew = 0.01 %/f; followSides at 2.4-2.8 %/f; creeps under 0.15 %/f). Fixed -> PASS (5 warn).

## Gaps (honest)
- script_lint's untagged mode (old scripts) GUESSES the answer / loop line / doubter from cue words; tag beats in the v3 table.
- cam_speed `--plan` uses a canonical layout (subject at the origin), so it measures the preset + params, not the set.
  CAVEAT for CORE: `camSpeedStats` reads an orbit / follow around a centred subject as almost still (0.01-0.02 %/f: the 0.7x
  and 2x points cancel); the probe passes depthK [1, 2, 4] for those presets.
- kit names: the catalog loader reads public/kit folders + backticks in the owners' NOTES.md; until NATURE / CARDS publish
  catalogs, unknown names are WARN (kit requests), FAIL only with `--strict-catalog` or `--stage=build`.

## More test results (2026-11-19, later)
- `qa_gates.py` on the clown preview 4 (2246 f, 540x960, with the mix): 49 s. Film numbers = LOOK_REPORT's clown numbers
  (camera 0.24 %/f, chroma 32.2, strong own motion 0.158): the import of look_metrics.py is faithful. Loudness -14.0 LUFS,
  TP -2.8, LRA 3.6 (WARN), captions on 99 % of 182 words. Every clown shot FAILS the new-look gates (camera, chroma,
  shadow chroma, blur, busy), which is what the research says about our old look. The look pilot (1 shot) passes the look
  gates (chroma 23.6, shadow chroma 13.0, blur 1.4 %, busy 4.5); camera 0.40 WARN. `--no-loop` for single shots.
- `storyboard.mjs`: real renders through the fallback (stills_locked.sh) on the look pilot (3 stills + sheet in 57 s,
  ~17 s per still) and on the scaffolded award film through CORE's KitComposition (2 stills in 2 min incl. bundling; set
  build 40 ms; the blockout reads: PBR floor tiles, the morning rig, the s07 orbit). With kit_render.mjs present it uses
  `kit_render --stills` (see the run log in PIPELINE_V3 notes).
- `new_short_v3.py award`: typechecks clean against CORE's real ctx.ts / camera.ts / pipeline.tsx
  (`npx tsc --noEmit -p src/videos3/award/tsconfig.json`: 0 errors in videos3/award; the only error is in SURFACES'
  in-progress ground.ts). `cam_speed.mjs --film` bundles the real film in Node in < 1 s and measures all 22 shots.
- Windows trap found: `film.ts` + `Film.tsx` in one folder: `./Film` resolves to film.ts (case-insensitive, .ts first), so
  the view is `FilmView.tsx`.
- kit_render hashes per set only the import graph of `sets/<setId>.ts`: the scaffold's `cams.ts` imports each set's
  cameras THROUGH the set file (which re-exports `<set>.cams.ts`), so a camera tweak re-renders only that set's shots.
- workflows/v3: all 4 parse; dry-runs with stub agents walk every branch (script stage; plan -> parallel detail with a
  dead agent retried and reported as missing -> merge -> storyboard; build + SOUND + check; audit -> failing + fixes per
  owner; polish only the owning groups + SOUND).
- `render_estimate.py` on the award bible (budget numbers until CORE logs measurements): storyboard 16 min, preview
  0.65 h, final4 1.55 h, final 2.59 h, a 6-shot polish render ~11 min.
