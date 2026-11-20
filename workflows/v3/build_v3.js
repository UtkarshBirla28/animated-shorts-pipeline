export const meta = {
  name: 'short-v3-build',
  description: 'PIPELINE_V3 stage B: one builder per set group builds ONLY what the DETAIL BIBLE says (sets, cameras, cast staging, cues) and reports its validators; the SOUND agent builds the library + score in parallel',
  phases: [
    { title: 'Build', detail: 'set-group builders in parallel + SOUND (library, score, cue map)' },
    { title: 'Check', detail: 'one integrator: typecheck, camera speeds, per-shot preview gates, the shot table' },
  ],
}

// ARGS (save to studio/out/<slug>/args_build.json FIRST; byte-identical args on a resume):
//   root, slug, title, comp (e.g. AwardKit), groups: [{ name, sets: [...], shots: [...] }] (from decide.js),
//   notes (binding LEAD decisions for every builder), when (timestamp string)
const A = typeof args === 'string' ? JSON.parse(args) : args
const P = A.root, S = A.slug
const PY = `PYTHONNOUSERSITE=1 ${P}\\tools\\.venv\\Scripts\\python.exe -s`
const V = `${P}\\studio\\src\\videos3\\${S}`
const B = `${P}\\briefs\\v3\\${S}`
const KR = `node scripts/kit_render.mjs --entry src/videos3/${S}/index.ts --comp ${A.comp}`
const RULES = `
HOUSE RULES: the PC is shared with another Claude session. Stills ONLY via node ${P}\\tools\\v3\\storyboard.mjs (it uses the 2 machine-wide stills slots); clip renders ONLY via kit_render.mjs (it takes the RAM token itself; one render of yours at a time; keep them to your shots). Never play audio / video. Never npm / pip install. Never edit studio/src/kit/* (kit owners) or another group's files. Do not commit. SAVE OFTEN (the connection drops; a retry continues from your files).
THE BIBLE IS THE CONTRACT: build exactly what ${B}\\bible.json says for your shots (props, surfaces, life, fx, light, camera preset, acting on its word, boards). If something cannot be built as written (a kit name missing, a framing impossible), DO NOT improvise silently: build the closest thing, and put the exact bible change you need in lead_requests. Kit: ${P}\\studio\\src\\kit\\KIT_CONTRACT.md (the DETAIL STANDARD and the speed budget) + every kit folder's NOTES.md (APIs, costs, names). ${A.notes || ''}`

const withRetry = async (prompt, opts) => {
  const r = await agent(prompt, opts)
  if (r) return r
  log(`${opts.label} returned nothing (agent died?): one retry that continues from disk`)
  return agent(`${prompt}\n\nCONTINUE: a previous attempt at this exact job died mid-way. Read your files first and continue from their current state.`, { ...opts, label: `${opts.label} (retry)` })
}
const REPORT = { type: 'object', properties: {
  files_changed: { type: 'array', items: { type: 'string' } },
  shots_done: { type: 'array', items: { type: 'string' } },
  validators: { type: 'object', properties: { tsc: { type: 'string' }, cam_speed: { type: 'string' }, gates: { type: 'string' }, bible_check: { type: 'string' } }, required: ['tsc', 'cam_speed', 'gates', 'bible_check'] },
  cost: { type: 'string', description: 'set build seconds + preview s/frame per shot from render_log.jsonl' },
  still_wrong: { type: 'array', items: { type: 'string' } },
  lead_requests: { type: 'array', items: { type: 'string' } },
  evidence: { type: 'array', items: { type: 'string' } } },
  required: ['files_changed', 'shots_done', 'validators', 'cost', 'still_wrong', 'lead_requests', 'evidence'] }

const builder = (g) => `You are the BUILDER of set group ${g.name} of a REAL Short, "${A.title}" (slug ${S}, three.js real-world kit in Remotion). Your sets: ${g.sets.join(', ')}. Your shots: ${g.shots.join(', ')}.
READ FIRST: ${P}\\PIPELINE_V3.md (stage B), ${V}\\STARTED_FROM.md, the bible ${B}\\bible.json (your sets and shots: every field), the storyboard ${P}\\studio\\out\\${S}\\storyboard_draft.jpg (the approved framings), ${P}\\studio\\src\\kit\\KIT_CONTRACT.md and the NOTES.md of kit/core, kit/surfaces, kit/nature, kit/cards.
YOU OWN ONLY: ${g.sets.map((s) => `${V}\\sets\\${s}.ts, ${V}\\sets\\${s}.cams.ts`).join(', ')} (+ new files under ${V}\\sets\\${g.name}_*.ts if you need helpers) and ${P}\\studio\\out\\${S}\\build_${g.name}\\ (evidence, sound_cues.json).
JOB, in order (save after each step):
1. Each set: replace the blockout with the kit: ground from the SURFACES ground kit (meso + wear + scatter as the bible says), walls / room / facade kit, every prop / plant / practical in the bible; contact shadows; nothing bare near the lens. Set build <= 30 s.
2. Cameras: in <set>.cams.ts set every MARK to the real subject position and tune params so each framing matches the storyboard; keep the preset. Check: node ${P}\\tools\\v3\\cam_speed.mjs --film src/videos3/${S}/film.ts (your shots inside the targets of ${P}\\tools\\v3\\targets.json; no shot under 0.15 %/f unless the bible says freeze).
3. Cast staging + acting in your sets with the CARDS kit: every acting item on its word (words.ts), gestures >= 12 f, expressions held >= 12 f, >= 3 life items moving, idle life on whole cycles if the shot touches the loop.
4. Sound cues: write ${P}\\studio\\out\\${S}\\build_${g.name}\\sound_cues.json = [{frame, name, what, pan, near}] for every sound event of your shots in the bible (frames from your real staging code; 0-3 f sync).
5. Validators (report each result): typecheck cd ${P}\\studio && npx tsc --noEmit -p src/videos3/${S}/tsconfig.json (0 errors in your files); ${PY} ${P}\\tools\\v3\\bible_validate.py ${B}\\bible.json --only=${g.shots.join(',')} --stage=build; draft stills node ${P}\\tools\\v3\\storyboard.mjs --slug ${S} --shots ${g.shots.join(',')} --force (LOOK at them); then ONE preview clip of your shots: cd ${P}\\studio && ${KR} --quality preview --shots ${g.shots.join(',')} --out out/${S}/ and ${PY} ${P}\\tools\\v3\\qa_gates.py <each shot file under out/${S}/shots/preview/> --shots=<a one-line shots json> --no-loop (fix what fails: camera, life, chroma, blur; at most 2 render rounds).${RULES}
RETURN the structured report (honest: what still looks wrong).`

phase('Build')
const sound = () => withRetry(`You are the SOUND owner of a REAL Short, "${A.title}" (slug ${S}). The voice is LOCKED (sound\\${S}\\voice\\). The picture is being built right now by ${A.groups.length} builders; you prepare everything that does not need final frames.
READ FIRST: ${P}\\PIPELINE.md (the proven voice / sound / mix / QA tools), ${P}\\LESSONS.md 53 (real effects, data-driven cues, sync check), ${P}\\sound\\${S}\\audio\\LIBRARY.md, the bible ${B}\\bible.json (every shot's "sound" list, the sets' ambience, "music").
JOB: (1) the SFX list: every distinct sound event of the bible -> a sample (the CC0 / ElevenLabs libraries in LIBRARY.md first; new ElevenLabs effects only after you list their credit cost in your report: do NOT generate more than 600 credits without the LEAD); measure each take (el_measure.py; reject silent / clipped / word-like); write sound\\${S}\\audio\\SFX_MAP.json (event -> files). (2) the score: an original track from the bible's music plan keyed to the WORDS (music.py; ends on the last word, ambience only through the tail). (3) ambience beds per set. (4) mix.py ready to read the builders' cue files studio\\out\\${S}\\build_*\\sound_cues.json (map names via SFX_MAP; report unmapped cues), -14 LUFS, <= -2 dBTP, music ~-18 LU under the voice, the sync-direction check on. Run a first mix with the cues that exist (rough is fine) and measure it (ffmpeg ebur128). Never play audio.${RULES}
RETURN the structured report (validators.gates = the mix measurements).`, { label: 'build:SOUND', phase: 'Build', schema: REPORT })
const all = await parallel([...A.groups.map((g) => () => withRetry(builder(g), { label: `build:${g.name}`, phase: 'Build', schema: REPORT })), sound])
const reports = A.groups.map((g, i) => ({ group: g.name, report: all[i] }))
const failed = reports.filter((r) => !r.report).map((r) => r.group)
if (failed.length) log(`builders that failed twice: ${failed.join(', ')} (resume this run; their files are on disk)`)

phase('Check')
const check = await withRetry(`You are the INTEGRATOR of "${A.title}" (slug ${S}) after the build. Builders' reports: ${JSON.stringify(reports.map((r) => ({ group: r.group, still_wrong: r.report ? r.report.still_wrong : ['FAILED'], lead_requests: r.report ? r.report.lead_requests : [] })))}.
JOB: (1) cd ${P}\\studio && npx tsc --noEmit -p src/videos3/${S}/tsconfig.json (0 errors under src/videos3/${S}); (2) ${PY} ${P}\\tools\\v3\\bible_validate.py ${B}\\bible.json --stage=build --json=${B}\\validate_build.json; (3) node ${P}\\tools\\v3\\cam_speed.mjs --film src/videos3/${S}/film.ts (film median, fast / still shares); (4) the loop: frame 0 vs the last frame stills (storyboard.mjs --entry src/videos3/${S}/index.ts --comp ${A.comp} --frames 0,<TOTAL-1>) must match; (5) list every lead_request that changes the bible, grouped, with your recommendation. Do NOT render the whole film (the LEAD runs the animatic). Do not edit builders' files except a one-line typecheck fix you log.${RULES}
RETURN the structured report.`, { label: 'build:check', phase: 'Check', schema: REPORT })
return { reports, sound: all[A.groups.length], check, failed }
