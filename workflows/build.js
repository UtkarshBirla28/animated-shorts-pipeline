export const meta = {
  name: 'short-build',
  description: 'Build round 1 of an animated short: exterior sets, interiors+lights, characters+staging, post+captions, sound, each in its own sandbox',
  phases: [
    { title: 'Build', detail: '5 specialist builders in parallel sandboxes' },
  ],
}

// ARGS (JSON; the Workflow tool may hand them over as a string): see workflows/README.md
//   root, slug, comp, title, seconds, place, safety, voice, jobs: { 'WORLD-EXT': '...', 'WORLD-INT': '...', CHAR, POST, AUDIO }
const ARGS = typeof args === 'string' ? JSON.parse(args) : args
const P = ARGS.root
const S = ARGS.slug
const PY = `${P}\\tools\\.venv\\Scripts\\python.exe -s`
const JOBS = ARGS.jobs || {}

const COMMON = (name, files, bible, slices, skills) => `
You are one of five specialist builders making a REAL YouTube Short for the user's channel: "${ARGS.title}" (~${ARGS.seconds} s, vertical 1080x1920, 30 fps). Style: 2D flat cartoon characters on camera-facing cards inside a colourful painted 3D world (three.js r175 inside Remotion 4.0.290). The user wants product-level quality, not a prototype.
PROJECT: ${P} (studio\\ = Remotion project, sound\\${S}\\ = sound). The voice is FINAL and was made first: sound\\${S}\\voice\\voice.wav + words.json; picture timing is generated from it (studio\\src\\videos\\${S}\\words.ts, never edit) and exported to sound\\${S}\\audio\\timeline.json (every shot a..b and every BEAT frame).
READ FIRST, fully: studio\\src\\videos\\${S}\\BUILD_PLAN.md (shot-by-shot brief, owners, rules, QUALITY BAR), STARTED_FROM.md (which files are engine vs story content), plan.ts (anchors), story.ts (SHOTS, BEAT, lights, cameras, DOF), ctx.ts, world.ts (how sets and cast are called each frame), then your own files.
THIS FOLDER STARTED AS A COPY OF THE ANTITHEFT EXAMPLE: your files still contain that story (a desert park). REPLACE the story content with this short's, and KEEP / reuse the engine systems in them (painted canvas textures, two-tone materials, the Pen drawing system, staging helpers, idle life on ctx.vf, loop-seam rules). Delete antitheft-only content you do not reuse.
STYLE TARGET: study\\CHANNEL_STYLE_BIBLE.md, sections ${bible} (measured from 16 reference shorts; never copy their characters, shots or text).
PIPELINE KNOWLEDGE: study\\REPO_KNOWLEDGE.md and the slice notes ${slices}; LESSONS.md at the repo root (hard-won rules: read it).
SKILLS: load ${skills} with the Skill tool for reference, and obey their local r175/Remotion override notes.
YOUR SANDBOX: studio\\src\\videos\\${S}_${name}\\ (a full copy of the short; entry studio\\src\\sandboxes\\${name}\\index.ts). Edit ONLY these files there: ${files}. Everything else is read-only for you: the LEAD merges only your owned files back into studio\\src\\videos\\${S}\\.
RENDER STILLS to check your work (silent): cd ${P}\\studio && ENTRY=src/sandboxes/${name}/index.ts node scripts/stills.mjs out/${S}/${name}/<tag>_ <f1,f2,...> 0.5
  One bundle takes ~45 s, then ~10-20 s per still: render several frames per call. Tile stills into one sheet: PYTHONNOUSERSITE=1 ${PY} ../tools/sheet.py <out.jpg> <cols> 240 <files...>. LOOK at every still with the Read tool and iterate. Budget about 4-5 render rounds. The camera keys in story.ts are the LEAD's first-pass framings: build your part so it looks right from them, and put framing suggestions in lead_requests.
TYPE-CHECK: cd ${P}\\studio && npx tsc --noEmit 2>&1 | grep "${S}_${name}/"
RULES: everything is a pure function of (shot, frame): no clocks, no Date, no Math.random (use seeded hashes); three r175 APIs only; no useFrame; no npm/pip installs; never play audio; do NOT touch other sandboxes or any folder outside ${P}; do not edit plan.ts / story.ts / world.ts / words.ts / voicewarp.ts (describe any needed change exactly in lead_requests). Four other agents render on this PC at the same time: keep renders modest (one render at a time, concurrency 1-2).
SAFETY: ${ARGS.safety}
QUALITY BAR (MANDATORY): read the QUALITY BAR section of BUILD_PLAN.md twice and build to it: living animation (gaze, changing expressions, idle breathing/sway/blinks, secondary motion), rich detailed environments that clearly read as ${ARGS.place} (wind, dust, furniture, ground detail, shadows), correct light and rich correct colour, a clearly distinct main character. The LEAD will audit every shot with scores and send fixes until each scores >= 8/10.
CONTINUE: if your sandbox already holds partial edits from a stopped attempt of this task, read your owned files first and continue from their current state.
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
  { name: 'world_ext', label: 'WORLD-EXT', files: `sets_ext.ts, paint.ts (and, only if you need more Kenney CC0 models: extract them from studio\\_downloads\\kenney\\*.zip into studio\\public\\${S}\\kenney\\ and add their names to the KENNEY list in YOUR sandbox world.ts; report that exact edit in lead_requests)`,
    bible: '4-6 and 13 (A, E)', slices: 'study\\repo\\05_world_building.md, 02_textures_characters.md, 03_outlines_lighting_depth.md', skills: 'threejs-geometry, threejs-textures, threejs-materials',
    job: 'Build every EXTERIOR set in BUILD_PLAN.md ("Exterior details" + the exterior shot rows): terrain, far layers, props, every readable sign / counter / hero prop at its plan.ts anchor and BEAT timing; painted Canvas2D textures in paint.ts (seams painted in as dark tints), two-tone materials, coloured shadows; idle motion (wind, birds, dust) on ctx.vf with the loop rule. Check at the middle frames of your shots and at every beat frame (timeline.json). Signs must read at the camera distances in story.ts.' },
  { name: 'world_int', label: 'WORLD-INT', files: 'sets_int.ts, lights.ts, shade.ts',
    bible: '5-6 and 13 (E)', slices: 'study\\repo\\03_outlines_lighting_depth.md, 04_render_shaders.md, 05_world_building.md', skills: 'threejs-materials, threejs-shaders, threejs-textures',
    job: 'Build every INTERIOR / explainer space in BUILD_PLAN.md ("Interior details" + those shot rows); interiors are closed (no sky leaks). Tune every light state in lights.ts (plan.ts LightName) against the bible palettes (section 6) on the real cameras, exteriors included; faces stay readable (off-white, never lavender or orange-saturated). Warm practical light pools via shade.ts; emissive bulbs > 1.0 so they bloom.' },
  { name: 'char', label: 'CHAR', files: 'toon.ts, cast.ts, cardshade.ts',
    bible: '4, 8 and 13 (D)', slices: 'study\\repo\\02_textures_characters.md, 06_cast_story_camera.md', skills: 'threejs-materials, threejs-textures',
    job: 'Build the whole cast and its staging (BUILD_PLAN.md "Characters" table + every shot row): designs in toon.ts (channel face/outline/eye spec, one body colour + one signature item each, a clearly distinct main character), expressions and poses the shots need, lip flaps only where BUILD_PLAN says, FX cards (thought bubbles, sparkles, sweat, tags); cast.ts staging for every shot from plan.ts anchors and BEAT frames (reactions 0-3 f before the word, expression swaps held >= 6 f, blinks / breath / sway on VF, contact blobs); adults ~1.65-1.75 m; the frame-0 pose must equal the last frame (loop).' },
  { name: 'post', label: 'POST', files: `${ARGS.comp}.tsx, Captions.tsx, ink.ts, grade.ts, lensblur.ts`,
    bible: '6, 7 and 13 (E, F, H)', slices: 'study\\repo\\04_render_shaders.md, 01_process_rules_scripts.md', skills: 'threejs-shaders, remotion-render',
    job: 'Captions to the section 7 spec measured on full-size stills (cap height 53 px, top 1322-1323, baseline 1376, centre x 540, stroke + shadow, Montserrat 900 loaded, 1-3 words, 2 f lead, held through pauses); world ink per light (no ink on sky / far blur); a grade for every light state (mean L* ~47, chroma ~29, coloured darks, vignette day ~.86 / golden ~.75 / night ~.46); dissolves keep each layer its own light, grade, ink and DOF; bloom emissive-only; no white flash. Report render time per frame at scale 1.' },
  { name: 'audio', label: 'AUDIO', files: `everything in sound\\${S}\\audio\\ (timeline.py, sfx.py, sfx_gen.py, music.py, instruments.py, dsp.py, mix.py, cues.md); no sandbox: run python from that folder`,
    bible: '9, 10 and 13 (B, G)', slices: 'study\\repo\\07_audio_music_mix.md, 08_audio_sfx_cues.md', skills: 'ffmpeg',
    job: `Make the full soundtrack with the synthesized audio engine (numpy/scipy; run with PYTHONNOUSERSITE=1 ${PY}): timeline.py reads frames/beats/shots from audio\\timeline.json and words from ..\\voice\\words.json at run time (never hard-code times); music.py an ORIGINAL synth score in the mood BUILD_PLAN.md asks for, ending on the last word with no end sting, then only the ambience bed through the loop tail; sfx.py / sfx_gen.py: every "Sound events" item synced 0-3 f to its beat (no whooshes on plain dissolves); mix.py: music ~-18 LU under the voice, SFX medium actions -8..-14 LU, master -14.0 LUFS integrated, true peak <= -2.0 dBTP, LRA ~2-3; mix.wav 48 kHz stereo 24-bit of EXACTLY timeline.json total frames / 30 s, stems, cues.md. Verify with ffmpeg ebur128 and spectrograms you LOOK at; never play audio aloud.` },
]

phase('Build')
const results = await parallel(TASKS.map((t) => () => agent(
  `${COMMON(t.name, t.files, t.bible, t.slices, t.skills)}\n\nYOUR ROLE: ${t.label}.\n${JOBS[t.label] || t.job}`,
  { label: `build:${t.label}`, phase: 'Build', schema: REPORT },
)))
return TASKS.map((t, i) => ({ owner: t.label, report: results[i] }))
