export const meta = {
  name: 'short-v3-decide',
  description: 'PIPELINE_V3 stage A: write + lint the script, or (after the voice lock) write the DETAIL BIBLE in parallel and draw the draft storyboard for OWNER GATE 1',
  whenToUse: 'A new v3 Short: stage "script" first; then the LEAD makes and locks the voice; then stage "bible" (bible + storyboard)',
  phases: [
    { title: 'Script', detail: 'one writer: SCRIPT.md in the playbook table, linted to PASS, facts checked' },
    { title: 'Bible plan', detail: 'one planner: cast, sets, the shot table (framings, cameras, light) from the kit menus' },
    { title: 'Bible detail', detail: 'one detail agent per set group: surfaces, props, life, fx, acting, boards, sound -> parts/<group>.json' },
    { title: 'Merge', detail: 'merge the parts, validate, fix until bible_validate PASSES' },
    { title: 'Storyboard', detail: 'draft stills of every framing + the numbered contact sheet; framing fixes' },
  ],
}

// ARGS (save them to studio/out/<slug>/args_decide_<stage>.json FIRST; a resume reuses finished agents only with
// byte-identical args):
//   root, slug, title, target_s (65-70), stage: "script" | "bible",
//   story: where the facts / idea are (lane notes, papers), owner_notes: the owner's standing rules for this film,
//   when: a timestamp string for CHANGES entries (scripts cannot read the clock)
const A = typeof args === 'string' ? JSON.parse(args) : args
const P = A.root, S = A.slug
const PY = `PYTHONNOUSERSITE=1 ${P}\\tools\\.venv\\Scripts\\python.exe -s`
const B = `${P}\\briefs\\v3\\${S}`
const RULES = `
HOUSE RULES: the PC is shared with another Claude session; stills ONLY through the tools below (they take the 2 machine-wide
stills slots); any multi-frame render takes the RAM token (studio/scripts/ram_token.sh). Never play audio or video. Never npm /
pip install. Never edit studio/src/kit/* (the kit owners' folders) or old films (studio/src/videos/*). Do not commit.
SAVE OFTEN: write your work to the files named in your job as you go (the connection drops; a retry continues from disk).
OWNER RULES (binding): story first (a quiz is only a hook); short plain lines, a funny beat and a mystery beat on purpose;
the camera moves in every frame and a new framing about every 2.5 s, but calm (no frantic whips, gestures >= 12-18 f,
boards <= 6-8 words held >= 1.5-2.5 s); >= 3 moving things per shot; warm, bright, golden look; voice quality first (never
time-stretch; the film may run a little longer). ${A.owner_notes || ''}`

const withRetry = async (prompt, opts) => {
  const r = await agent(prompt, opts)
  if (r) return r
  log(`${opts.label} returned nothing (agent died?): one retry that continues from disk`)
  return agent(`${prompt}\n\nCONTINUE: a previous attempt at this exact job died mid-way. First read the files it was writing (named above) and continue from their current state; do not start over.`, { ...opts, label: `${opts.label} (retry)` })
}

if (A.stage === 'script') {
  phase('Script')
  const res = await withRetry(`You write the voice-over script of a REAL YouTube Short for the owner's channel: "${A.title}" (slug ${S}), target ${A.target_s || 65} s.
READ FIRST: C:\\Users\\utkar\\research_notes\\ricksclips\\SCRIPT_REPORT.md section 5 (5.1 true-story moves, 5.2 beat template, 5.3 hooks, 5.4 the 15-rule checklist, 5.5 titles, 5.6 example scripts) and section 4 (why our 4 earlier scripts fell short); ${P}\\LESSONS.md 47, 61; the worked example ${P}\\briefs\\v3\\award\\SCRIPT.md (the exact file format). The facts: ${A.story}.
JOB: write ${B}\\SCRIPT.md in that format (facts with sources at the top, then the "| s | Beat | Speaker | Line |" table; character lines get their own Speaker). Every fact must be true: dramatize only inside an "Imagine..." / "Picture..." frame or with documented actions; hedge a best-guess reason with one word ("probably").
LOOP until it passes: ${PY} ${P}\\tools\\v3\\script_lint.py ${B}\\SCRIPT.md --target=${A.target_s || 65} --json=${B}\\lint.json ; read every FAIL / WARN with its line number and rewrite (at most 5 rounds). A WARN may stay only with a one-line reason in the file. Then go through the 6 MANUAL rules yourself and write one line each under "## Manual checks" in SCRIPT.md.
Also propose 3 titles (SCRIPT_REPORT 5.5 formulas) and a pinned comment.${RULES}
RETURN the structured result.`, {
    label: 'decide:script', phase: 'Script',
    schema: { type: 'object', properties: {
      verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, est_s: { type: 'number' }, words: { type: 'number' },
      warns: { type: 'array', items: { type: 'string' } }, manual: { type: 'array', items: { type: 'string' } },
      titles: { type: 'array', items: { type: 'string' } }, pinned: { type: 'string' },
      voice_notes: { type: 'string', description: 'for the LEAD: hard words, character voices to cast, the 1-2 delivery moments that matter' } },
      required: ['verdict', 'est_s', 'words', 'warns', 'manual', 'titles', 'pinned', 'voice_notes'] },
  })
  return { stage: 'script', result: res }
}

// ---------------------------------------------------------------- stage "bible" (after the voice lock)
const CATALOG = `KIT MENUS (pick names ONLY from these; read them now): ${P}\\studio\\src\\kit\\KIT_CONTRACT.md (the DETAIL STANDARD), ${P}\\studio\\src\\kit\\core\\NOTES.md (rigs, camera presets + params, quality), ${P}\\studio\\src\\kit\\surfaces\\NOTES.md, ${P}\\studio\\src\\kit\\nature\\NOTES.md (props, vegetation, fx), ${P}\\studio\\src\\kit\\cards\\NOTES.md (cast, crowds) and the folders under ${P}\\studio\\public\\kit\\. A thing the kit lacks: "new": true (a kit request) or "local": true (built in the film's own sets/).`
const VALIDATE = `${PY} ${P}\\tools\\v3\\bible_validate.py ${B}\\bible.json`

phase('Bible plan')
const plan = await withRetry(`You are the PLANNER of the DETAIL BIBLE for a REAL Short: "${A.title}" (slug ${S}). The script is LOCKED (${B}\\SCRIPT.md) and the voice is LOCKED (sound\\${S}\\voice\\words.json, timeline in ${B}\\lint.json est until shots.ts exists).
READ FIRST: ${P}\\PIPELINE_V3.md (stage A3), the format ${P}\\briefs\\v3\\BIBLE_TEMPLATE.json, the worked example ${P}\\briefs\\v3\\award\\bible.json (the level of detail expected), ${P}\\tools\\v3\\targets.json, C:\\Users\\utkar\\research_notes\\ricksclips\\LOOK_REPORT.md sections 0 and 1. ${CATALOG}
JOB: write ${B}\\bible.json: status, script, voice (locked: true, total_frames from words.json + 20 f tail), look, cast (one body colour + one signature item each, a distinct hero), sets (>= 5 places or locations_reason; each with ground surface + meso + wear + scatter, surfaces, props, vegetation, practicals, ambience, est_build_s), music, loop, and EVERY shot with: id, beat, line, starts_on (the shot's first spoken word; #n for a repeat), est_t0, set, location, transition_in, framings (a new one about every 2.5 s, subject_height_pct), camera (a CORE preset + params + speed_pct_f), light (rig + practicals_on). Leave surfaces_near / props / life / fx / acting / boards / captions / sound EMPTY: the detail agents fill them. Shots group naturally by set: list the groups.
CHECK: ${VALIDATE} --stage=decide (film rows F0-F11, framing and camera rows must PASS; it measures your planned cameras with CORE's camSpeedStats: fix params it flags). The life / sound / detail FAILs are expected until the detail agents finish.${RULES}
RETURN the groups (each = the sets one builder will own + their shot ids; 4-6 groups, balanced by shot count).`, {
  label: 'decide:bible-plan', phase: 'Bible plan',
  schema: { type: 'object', properties: {
    groups: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, sets: { type: 'array', items: { type: 'string' } }, shots: { type: 'array', items: { type: 'string' } } }, required: ['name', 'sets', 'shots'] } },
    film_rows: { type: 'string', description: 'the film-level validator rows as printed' } }, required: ['groups', 'film_rows'] },
})
if (!plan) return { stage: 'bible', error: 'planner failed twice: see its files, resume this run' }

phase('Bible detail')
const details = await parallel(plan.groups.map((g) => () => withRetry(`You are a DETAIL agent of the DETAIL BIBLE for "${A.title}" (slug ${S}). Group ${g.name}: sets ${g.sets.join(', ')}, shots ${g.shots.join(', ')}.
READ FIRST: ${B}\\bible.json (the plan: never edit it), ${P}\\briefs\\v3\\BIBLE_TEMPLATE.json, the worked example ${P}\\briefs\\v3\\award\\bible.json, ${P}\\tools\\v3\\targets.json, ${B}\\SCRIPT.md. ${CATALOG}
JOB: for EACH of your shots decide every detail: surfaces_near (meso + wear), props, vegetation, life (>= 3 moving things besides the camera; audible: true where you would hear it), fx, acting (who, on which word, the visible verb, the expression, frames_min >= 12), boards (<= 6 words, hold >= 1.5 s, caps_px >= 48), captions {"mode": "auto"}, sound (an event for EVERY acting / fx / audible life item: "for": "acting:0" etc., plus the ambience), notes. For your sets you may refine ground / surfaces / props / practicals. Write ONLY ${B}\\parts\\${g.name}.json as {"shots": [{"id": ..., <your fields>}], "sets": [{"id": ..., <refined fields>}]}.
CHECK your group: copy bible.json to ${B}\\parts\\_check_${g.name}.json, merge your part into the copy (${PY} ${P}\\tools\\v3\\bible_merge.py ${B}\\parts\\_check_${g.name}.json ${B}\\parts\\${g.name}.json), run ${PY} ${P}\\tools\\v3\\bible_validate.py ${B}\\parts\\_check_${g.name}.json --only=${g.shots.join(',')} and fix until your shots PASS (WARNs need a reason in notes).${RULES}
RETURN the result.`, {
  label: `decide:detail ${g.name}`, phase: 'Bible detail',
  schema: { type: 'object', properties: { part: { type: 'string' }, shots_pass: { type: 'array', items: { type: 'string' } }, shots_fail: { type: 'array', items: { type: 'string' } }, kit_requests: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['part', 'shots_pass', 'shots_fail', 'kit_requests', 'notes'] },
})))
const parts = plan.groups.map((g, i) => (details[i] ? `${B}\\parts\\${g.name}.json` : null)).filter(Boolean)
const missing = plan.groups.filter((g, i) => !details[i]).map((g) => g.name)
if (missing.length) log(`detail groups that failed twice (their shots stay empty; re-run them): ${missing.join(', ')}`)

phase('Merge')
const merged = await withRetry(`You are the MERGER of the DETAIL BIBLE for "${A.title}" (slug ${S}).
JOB: ${PY} ${P}\\tools\\v3\\bible_merge.py ${B}\\bible.json ${parts.join(' ')} --when="${A.when || ''}" ; then ${VALIDATE} --stage=decide --json=${B}\\validate.json . Fix every FAIL yourself with the smallest change in bible.json (cross-group issues: continuity of cast / props / light between neighbouring shots, a doubled sound, framing rhythm across cuts, the loop shot matching frame 0) and log each fix in CHANGES. Then the render estimate: ${PY} ${P}\\tools\\v3\\render_estimate.py ${B}\\bible.json . ${missing.length ? `Groups ${missing.join(', ')} failed: fill their shots yourself.` : ''}${RULES}
RETURN the result.`, {
  label: 'decide:merge', phase: 'Merge',
  schema: { type: 'object', properties: { verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, fails: { type: 'array', items: { type: 'string' } }, warns: { type: 'number' }, fixes: { type: 'array', items: { type: 'string' } }, estimate: { type: 'string' } }, required: ['verdict', 'fails', 'warns', 'fixes', 'estimate'] },
})

phase('Storyboard')
const board = await withRetry(`You are the STORYBOARD artist for "${A.title}" (slug ${S}). The bible ${B}\\bible.json is validated.
JOB: (1) if ${P}\\studio\\src\\videos3\\${S}\\ does not exist: ${PY} ${P}\\tools\\v3\\new_short_v3.py ${S} "${A.title}" ; else ${PY} ${P}\\tools\\v3\\new_short_v3.py ${S} --shots . (2) typecheck: cd ${P}\\studio && npx tsc --noEmit -p src/videos3/${S}/tsconfig.json (fix only files under src/videos3/${S}/). (3) set rough subject MARKS in sets/<set>.cams.ts so each framing points at its subject in the blockout sets (the builders refine them later). (4) node ${P}\\tools\\v3\\storyboard.mjs --slug ${S} (draft stills of every framing; ~25 s each; it writes the still paths into the bible). (5) LOOK at studio\\out\\${S}\\storyboard_draft.jpg and at single stills with the Read tool: does every framing read at phone size (subject size, the caption band y 1280-1440 clear of faces, the frame-0 thumbnail, the loop frame)? Fix camera params in the bible (and the cams files), re-run the stills of those shots (--shots ids --force), at most 2 rounds. (6) ${VALIDATE} --stage=gate1 .${RULES}
RETURN the result: what the OWNER should look at (the sheet path, the 3-5 decisions they should confirm or change).`, {
  label: 'decide:storyboard', phase: 'Storyboard',
  schema: { type: 'object', properties: { sheet: { type: 'string' }, stills: { type: 'number' }, verdict: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } }, owner_questions: { type: 'array', items: { type: 'string' } } }, required: ['sheet', 'stills', 'verdict', 'fixed', 'owner_questions'] },
})
return { stage: 'bible', groups: plan.groups, details, merged, board, missing }
