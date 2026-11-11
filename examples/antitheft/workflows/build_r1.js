export const meta = {
  name: 'antitheft-build-r1',
  description: 'Build round 1 of the antitheft short: exterior sets, interiors+lights, characters+staging, post+captions, sound — each in its own sandbox',
  phases: [
    { title: 'Build', detail: '5 specialist builders in parallel sandboxes' },
  ],
}

const P = 'C:\\Users\\utkar\\Desktop\\animated-shorts-studio'
const COMMON = (name, files, bible, slices, skills) => `
You are one of five specialist builders making a REAL YouTube Short for the user's channel: "The Anti-Theft Sign That Made People Steal" (62.0 s, vertical 1080x1920, 30 fps). Style: 2D flat cartoon characters on camera-facing cards inside a colourful painted 3D world (three.js r175 inside Remotion 4.0.290). The user wants product-level quality, not a prototype.
PROJECT: ${P} (studio\\ = Remotion project, sound\\antitheft\\ = sound). The voice is final: sound\\antitheft\\voice\\voice.wav + words.json; picture timing is generated from it (studio\\src\\videos\\antitheft\\words.ts) and exported to sound\\antitheft\\audio\\timeline.json (every shot a..b and every BEAT frame).
READ FIRST, fully: studio\\src\\videos\\antitheft\\BUILD_PLAN.md (shot-by-shot brief, owners, rules), plan.ts (anchors), story.ts (SHOTS, BEAT, lights, cameras, DOF), ctx.ts, world.ts (how sets and cast are called each frame), then your own files.
STYLE TARGET: study\\CHANNEL_STYLE_BIBLE.md, sections ${bible} (measured from 16 reference shorts). Reference frames for LOOK ONLY (private study material: never copy their characters, shots or text): study\\videos\\_data\\<slug>\\full\\shot_NN_mid.jpg and contact_1fps.jpg, notes in study\\videos\\<slug>.md.
PIPELINE KNOWLEDGE: study\\REPO_KNOWLEDGE.md and the slice notes ${slices} (they explain the template code line by line).
SKILLS: load ${skills} with the Skill tool for reference, and obey their local r175/Remotion override notes.
YOUR SANDBOX: studio\\src\\videos\\antitheft_${name}\\ (a full copy of the short; entry studio\\src\\sandboxes\\${name}\\index.ts). Edit ONLY these files there: ${files}. Everything else is read-only for you: the LEAD merges only your owned files back into studio\\src\\videos\\antitheft\\.
RENDER STILLS to check your work (silent): cd ${P}\\studio && ENTRY=src/sandboxes/${name}/index.ts node scripts/stills.mjs out/antitheft/${name}/<tag>_ <f1,f2,...> 0.5
  One bundle takes ~45 s, then ~10-20 s per still: render several frames per call. Tile stills into one sheet: PYTHONNOUSERSITE=1 ../tools/.venv/Scripts/python.exe -s ../tools/sheet.py <out.jpg> <cols> 240 <files...>. LOOK at every still with the Read tool, compare with the reference frames, and iterate. Budget about 4-5 render rounds. The camera keys in story.ts are the LEAD's first-pass framings: build your part so it looks right from them, and put framing suggestions in lead_requests.
TYPE-CHECK: cd ${P}\\studio && npx tsc --noEmit 2>&1 | grep "antitheft_${name}/" (ignore the 6 known TS2322 'Element | null' errors in AntiTheft.tsx).
RULES: everything is a pure function of (shot, frame): no clocks, no Date, no Math.random (use seeded hashes); three r175 APIs only; no useFrame; no npm/pip installs; never play audio; do NOT touch C:\\Users\\utkar\\cartoon-shorts or C:\\Users\\utkar\\bridge-short (another AI session works there) or the other sandboxes; do not edit plan.ts / story.ts / world.ts / words.ts (describe any needed change exactly in lead_requests). Four other agents render on this PC at the same time: keep renders modest.
SAFETY (BUILD_PLAN.md): no NPS arrowhead or patches, no university logos, no police, adults only in crowds, never name the couple, the woman never takes a rock, Cialdini is a generic and respectful cartoon.
QUALITY BAR v2 (MANDATORY): the user's direct requirements are the "QUALITY BAR v2" section at the END of BUILD_PLAN.md — read it twice and build to it: living animation (gaze, changing expressions, idle breathing/sway/blinks, secondary motion), rich detailed environments that clearly read as a desert national park (wind, dust, park furniture, ground detail, shadows), correct light and rich correct colour, a clearly distinct main character. The LEAD will audit every shot with scores and send fixes until each scores >= 8/10.
CONTINUE: an earlier attempt of this same task was stopped after ~15 minutes; your sandbox may already contain some partial edits from it. Read your owned files first and continue from their current state.
FINAL: return the structured report.`

const REPORT = {
  type: 'object',
  properties: {
    files_changed: { type: 'array', items: { type: 'string' } },
    built: { type: 'array', items: { type: 'string' }, description: 'what you built, concretely' },
    still_wrong: { type: 'array', items: { type: 'string' }, description: 'honest list of what still looks wrong or is unfinished' },
    lead_requests: { type: 'array', items: { type: 'string' }, description: 'exact changes you need in plan.ts / story.ts / world.ts / other owners' },
    best_stills: { type: 'array', items: { type: 'string' }, description: 'paths of your best stills / sheets' },
  },
  required: ['files_changed', 'built', 'still_wrong', 'lead_requests', 'best_stills'],
}

const TASKS = [
  { name: 'world_ext', label: 'WORLD-EXT', files: 'sets_ext.ts, paint.ts (and, only if you need more Kenney CC0 models: extract them from studio\\_downloads\\kenney\\*.zip into studio\\public\\antitheft\\kenney\\ and add their names to the KENNEY list in YOUR sandbox world.ts — report that exact edit in lead_requests)',
    bible: '4-6 and 13 (A, E)', slices: 'study\\repo\\05_world_building.md, 02_textures_characters.md, 03_outlines_lighting_depth.md', skills: 'threejs-geometry, threejs-textures, threejs-materials',
    job: `Replace the STUB in sets_ext.ts with the real exterior sets (BUILD_PLAN.md "Exterior details" + shots 1-10, 13, 15, 16):
- the painted badlands terrain (flat dusty floor near the trails, striped rounded mounds further out, mesas on the horizon, nothing blocking the story.ts cameras), sagebrush + junipers, rocks, loose chips;
- the sliced petrified logs with rainbow-quartz cut faces (VISTA.logs + a few near TH and TT), the paved trail + low metal rail;
- the main warning sign (readable routed text, unlit face), the raven perch, the "14 TONS / YEAR" split-flap counter (flips at BEAT.tons14), the plaque "TREES OVER 200 MILLION YEARS OLD", the glinting rainbow rock at TH.glintRock;
- TT: three trail heads with JASPER / LONG LOGS / CRYSTAL marker posts, Sign A and Sign B with their exact text + pictograms (one visitor with a red circle-and-bar over his hand / three visitors taking wood), LED "PIECES MISSING" counters (0.00% -> 1.67% on BEAT.pct2 and 0.00% -> 7.92% on BEAT.pct8 in shot 10), the marked chips with white dots along the LONG LOGS path, the giant rubber stamp + red "PERMISSION GRANTED" mark at BEAT.permission (shot 13);
- painted Canvas2D textures in paint.ts (seams painted in as dark tints), two-tone materials via lam()/twoTone, coloured shadows.
Check your sets at the middle frames of shots 1-10, 13, 15, 16 and at the beat frames (timeline.json). Signs must read at the camera distances in story.ts.` },
  { name: 'world_int', label: 'WORLD-INT', files: 'sets_int.ts, lights.ts, shade.ts',
    bible: '5-6 and 13 (E)', slices: 'study\\repo\\03_outlines_lighting_depth.md, 04_render_shaders.md, 05_world_building.md', skills: 'threejs-materials, threejs-shaders, threejs-textures',
    job: `1) Replace the STUB in sets_int.ts with the three interiors (BUILD_PLAN.md "Interior details" + shots 11, 12, 14): the warm classroom with desks, windows and the green chalkboard written letter by letter "HALF THIS CLASS CHEATED." from BEAT.teacher to BEAT.cheated; the night storeroom with shelves, the CONSCIENCE PILE crate heaped with rainbow rocks, opened envelopes, stamped parcels, readable letters "SORRY!", "I'M RETURNING THIS", "PLEASE FORGIVE ME", the BAIT bucket and a warm desk lamp (emissive bulb > 1.0 so it blooms); the blueprint explainer space (deep blue floor + backdrop with a faint white grid, chalky path lines, the fork with two big flat labelled arrows "THE RULE" / "EVERYONE ELSE", and the floating "MANY PAST VISITORS" sign panel that flies in at BEAT.manySteal and settles at BP.signFloat). Interiors must be closed so no sky or desert shows.
2) Tune all 9 light states in lights.ts (noon, dim, late, morning, sunset, dusk, night_int, classroom, blueprint) against the bible's palettes (section 6) on the real cameras: check exteriors too (the stub exterior in your sandbox is enough to judge sky, fog, light colour and shadow tint) — characters must stay readable (faces off-white, never lavender or orange-saturated).
3) If you can do it safely, add warm light pools (desk lamp, classroom windows) to the two-tone shading in shade.ts (the template's TWO_TONE drops every non-sun light); otherwise fake them with the key direction + emissive and say so.` },
  { name: 'char', label: 'CHAR', files: 'toon.ts, cast.ts, cardshade.ts',
    bible: '4, 8 and 13 (D)', slices: 'study\\repo\\02_textures_characters.md, 06_cast_story_camera.md', skills: 'threejs-materials, threejs-textures',
    job: `Build the whole cast and its staging (BUILD_PLAN.md "Characters" table + every shot row):
- toon.ts: adapt the template's Pen drawing system to the channel spec (face fill #F8F3EE, outline #2C1E2A with thin side ~2-2.5 % / thick side ~5-6 % of head width, dot eyes #2A2030 with half-lid default, thick acting brows); add every character design: the woman (teal sundress, big straw sun hat with a yellow band, camera on a strap), the fiancé (mustard T-shirt with a plain book icon, round glasses, backpack, hiking shorts), the professor (grey hair, olive field vest over a light-blue shirt, clipboard), two assistants (khaki vests, bucket hats, stopwatch "2:00:00", tally sheets), tourists (orange Hawaiian shirts, red caps or visors, cameras), a background ranger (no patch), the teacher (cardigan, glasses, chalk), the honest student (bowl cut, pencil behind the ear) and pupils, the raven, the office clerk; new expressions (shifty side-eye, goggle shock, calm half-lid) and poses (whisper lean with a hand by the mouth, pocketing a chip with a sideways glance, kneeling to place a chip, holding a clipboard, writing on a board, scooping into a bucket, reaching then putting back, walking); 3-shape lip flaps used ONLY on the whisper line (BEAT.whisper..BEAT.nowEnd);
- FX cards: thought bubbles (shot 1: her handing a paperclip with a tiny gift bow back to a surprised clerk; shot 12: a little crowd of cheating stick figures), the glint sparkle (BEAT.steal1), sweat drop (BEAT.now), the tag "TIMES STOLEN: 1" flipping to "2" on BEAT.twice, the multiplying thief figures in the blueprint (BEAT.everyone), chips flying into the bucket;
- cast.ts: replace the STUB stage() with the real staging for all 16 shots from the plan.ts anchors and BEAT frames (reactions 0-3 f before the word, expression swaps held >= 6 f, blinks, idle sway, contact blobs); adults about 1.65-1.75 m tall; the frame-0 woman (shot 1 at f = 0) must be IDENTICAL in shot 16's last frame (same pose, expression, not mid-blink) so the video loops;
- cardshade.ts: cards lit by the scene light, a 2-4 px pale key-side rim in every light (warm in lamp/sunset light).` },
  { name: 'post', label: 'POST', files: 'AntiTheft.tsx, Captions.tsx, ink.ts, grade.ts, lensblur.ts',
    bible: '6, 7 and 13 (E, F, H)', slices: 'study\\repo\\04_render_shaders.md, 01_process_rules_scripts.md', skills: 'threejs-shaders, remotion-render',
    job: `1) Captions: verify Captions.tsx against the section 7 spec by measuring pixels on full-size stills (render at scale 1 for these: cap height 53 px, cap top 1322-1323, baseline 1376, centre x 540, stroke ~5 px visible + shadow 2 px right / 4 px down / ~3 px blur, Montserrat 900 really loaded, paint-order stroke working in this Chrome); check the chunking (1 word, function words joined, max 3, ~1.25 words per caption, 2 f lead, held through pauses, frame 0 to the last frame) and fix anything off.
2) World ink (ink.ts): ~3 px at mid distance (2-4, up to 8 on near props), tinted per light (general plum #2A1A26, wood/day brown #2B1A12, night navy #1A1D40), no ink on sky, clouds or far blurred terrain; wire the per-light tint from AntiTheft.tsx (lightAt(id, f)).
3) Grades (grade.ts): give every light state a fitting grade (the template only has day / golden): add a night grade and anything else needed so the bible's targets hold (mean L* ~47, chroma ~29, coloured darks, vignette day ~.86 / golden ~.75 / night ~.46); keep it subtle.
4) Check that the crossfade light fix in world.ts works: render frames inside dissolves between different lights (e.g. the 6 -> 7 boundary late -> morning, 10 -> 11 noon -> blueprint, 13 -> 14 sunset -> night) and confirm each layer keeps its own light; report any remaining leak (e.g. grade, ink tint or DOF shared between layers) and fix what lives in your files.
5) Keep bloom emissive-only. No white flash. Report render time per frame at scale 1.` },
  { name: 'audio', label: 'AUDIO', files: 'everything in sound\\antitheft\\audio\\ (timeline.py, sfx.py, sfx_gen.py, music.py, instruments.py, dsp.py, mix.py, cues.md); no sandbox: run python from that folder',
    bible: '9, 10 and 13 (B, G)', slices: 'study\\repo\\07_audio_music_mix.md, 08_audio_sfx_cues.md', skills: 'ffmpeg',
    job: `Make the full soundtrack with the repo's synthesized audio engine (pure numpy/scipy; run with ${P}\\tools\\.venv\\Scripts\\python.exe -s and PYTHONNOUSERSITE=1):
- timeline.py: read the frame/beat/shot times from audio\\timeline.json and words from ..\\voice\\words.json at run time (never hard-code times, so a later voice or picture change only needs a re-run);
- music.py: an ORIGINAL synth score, playful and mischievous: light plucks + woodblock (maybe a soft marimba/celesta and a bouncy bass), not sad and not a march; light under the hook and setting; turns curious (sparser, suspended harmony, one woodblock tick at BEAT.honest) on the mystery shot 6; busier for the test/results; cool and simple under the blueprint pivot; a small swell on the final twist (shots 14-15); ends on the last word (BEAT.end) with no end sting, then only the desert-wind bed through the 14 f loop button (so the loop is seamless with frame 0's wind);
- sfx.py / sfx_gen.py: the SFX list in BUILD_PLAN.md "Sound events" synced 0-3 f to their beats (desert wind bed on exteriors, glint ding, gravel steps + camera shutter, flip-counter flaps, woodblock tick, pen scratches, stopwatch click, counter clicks + cha-ching on BEAT.pct8, chalk squeak, stamp thump on BEAT.permission, paper rustle + mailbox clunk on BEAT.mailed, bright ding on BEAT.twice); no whooshes on plain dissolves;
- mix.py: voice gain only; music ~-18 LU under the voice; SFX medium actions ~-8 to -14 LU, the stamp ~-2 to -4 LU; master -14.0 LUFS integrated, true peak <= -2.0 dBTP, LRA ~2-2.5; fix the known no-speech NaN bug (sections without narration) and the stale _cache problem (key the cache on the inputs or delete _cache every run); output mix.wav 48 kHz stereo 24-bit of EXACTLY timeline.json total frames / 30 s, plus stems and cues.md.
VOICE v2: the LEAD is re-generating a more expressive narration (per-line pitch/pace, better pauses) that will replace ..\voice\voice.wav, words.json and audio\timeline.json within ~40 min (voice_info.json will then say \"take\": \"v2...\"). Build everything to read those files at run time; do your FINAL mix run after the v2 files exist (check voice_info.json); if they have not appeared when you are otherwise done, mix the current voice and say so. Verify with ffmpeg ebur128 and by LOOKING at spectrograms you render (matplotlib in the venv) — never play audio aloud. Report the measured loudness, true peak, LRA and the music/SFX margins per section.` },
]

phase('Build')
const results = await parallel(TASKS.map(t => () => agent(
  `${COMMON(t.name, t.files, t.bible, t.slices, t.skills)}\n\nYOUR ROLE: ${t.label}.\n${t.job}`,
  { label: `build:${t.label}`, phase: 'Build', schema: REPORT }
)))
return TASKS.map((t, i) => ({ owner: t.label, report: results[i] }))
