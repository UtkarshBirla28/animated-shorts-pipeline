export const meta = {
  name: 'short-v3-audit',
  description: 'PIPELINE_V3 stage C: ONE deep audit of the whole-film animatic, driven by the automatic QA gates: a director (story / edit / acting / would-I-swipe), a look + motion auditor (the gates + frames), a sound + voice auditor (measured); returns fixes per set group for polish_v3',
  phases: [{ title: 'Audit', detail: 'three lenses in parallel on the same animatic + gates' }],
}

// ARGS (save to studio/out/<slug>/args_audit_<round>.json FIRST): root, slug, title, round ("C1", "D1"...),
//   video (the animatic / preview mp4, studio\\out\\<slug>\\<slug>_preview.mp4), gates (the qa_gates.py gates.json),
//   groups: [{ name, sets, shots }] (who owns which shots), user_decisions (binding, do not penalise)
const A = typeof args === 'string' ? JSON.parse(args) : args
const P = A.root, S = A.slug
const PY = `PYTHONNOUSERSITE=1 ${P}\\tools\\.venv\\Scripts\\python.exe -s`
const OUT = `${P}\\studio\\out\\${S}\\audit_${A.round}`
const OWNERS = A.groups.map((g) => `${g.name} = shots ${g.shots.join(', ')}`).join('; ')
const COMMON = `
You are auditing a REAL YouTube Short before release: "${A.title}" (1080x1920 target; this is the ${A.round} animatic / preview with the final voice and the mix). Be specific and harsh: the owner's verdicts were harsher than six earlier audits.
READ FIRST: the gates ${A.gates} (automatic numbers per shot: camera speed, life, chroma, blur, busy, loudness, loop, captions: do NOT re-measure what they measured; use them), the bible ${P}\\briefs\\v3\\${S}\\bible.json (what each shot was meant to show: judge against it), ${P}\\PIPELINE_V3.md (stage C), ${P}\\LESSONS.md 29, 47-50.
VIDEO: ${A.video}. Timeline: ${P}\\studio\\src\\videos3\\${S}\\shots.ts (SHOT_TABLE from / to frames). Put everything you make in ${OUT}\\.
HOW TO WATCH: contact sheet of a shot (every 4th frame): ffmpeg -v error -y -ss <a/30> -t <(b-a)/30> -i "<video>" -vf "select='not(mod(n\\,4))',scale=180:320,tile=8x4" -frames:v 1 -update 1 <out.jpg>; a motion strip (12 frames): ffmpeg -v error -y -ss <f/30> -i "<video>" -vf "scale=180:320,tile=12x1" -frames:v 1 -update 1 <strip.jpg>. LOOK at every image with the Read tool. Never play audio or video.
OWNERS of fixes: ${OWNERS}; SOUND (mix, music, effects); VOICE (a named line to re-take: rare, the voice is locked); LEAD (the bible, the shot table, the edit). Every issue: frames, the problem, the concrete fix with numbers, priority P1 / P2 / P3.
USER DECISIONS (binding): voice quality first (never time-stretch); calm pacing (holds 2.5-4 s with a moving camera are GOOD; never ask for more cuts / whips); boards short on purpose; warm bright look. ${A.user_decisions || ''}
Return the structured object only.`
const SCHEMA = { type: 'object', properties: {
  film_score: { type: 'number' },
  verdict: { type: 'string' },
  shots: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, score: { type: 'number' },
    issues: { type: 'array', items: { type: 'object', properties: { frames: { type: 'string' }, owner: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' }, priority: { type: 'string', enum: ['P1', 'P2', 'P3'] } }, required: ['frames', 'owner', 'problem', 'fix', 'priority'] } } },
    required: ['id', 'score', 'issues'] } },
  evidence: { type: 'array', items: { type: 'string' } } },
  required: ['film_score', 'verdict', 'shots', 'evidence'] }

const lens = (name, job) => async () => {
  const opts = { label: `audit:${name}`, phase: 'Audit', schema: SCHEMA }
  const r = await agent(`${COMMON}\n\nYOUR LENS: ${job}`, opts)
  if (r) return r
  log(`audit:${name} died: one retry (it continues from ${OUT})`)
  return agent(`${COMMON}\n\nYOUR LENS: ${job}\n\nCONTINUE: a previous attempt died; reuse the evidence files already in ${OUT} with your lens name.`, { ...opts, label: `audit:${name} (retry)` })
}
phase('Audit')
const res = await parallel([
  lens('director', `THE DIRECTOR / FIRST-TIME VIEWER: would you swipe, and where? Story clarity in order, the hook in the first 3 s, the funny beat and the mystery beat, every action readable at phone size, acting (faces change on the words, gestures read), the edit rhythm and every transition, continuity, the payoff landing on the last word, the loop. Score every shot 1-10 (8 = the reference channel) and the film.`),
  lens('look', `THE LOOK + MOTION AUDITOR: start from the gate table (every FAIL / WARN shot first), then frames: the DETAIL STANDARD of ${P}\\studio\\src\\kit\\KIT_CONTRACT.md (three scales of detail near the lens, no bare primitives, wear, contact, real vegetation, light you can feel, >= 3 moving things, only the cards inked), the warm bright golden look, the cards inside the light, the camera feel. Score every shot 1-10.`),
  lens('sound', `THE SOUND + VOICE AUDITOR: you cannot hear; MEASURE ${P}\\sound\\${S}\\audio\\mix.wav and its stems with ffmpeg ebur128 and spectrograms (python: ${PY}): voice clarity over the bed per line, the music ~-18 LU under the voice, every effect 0-3 f from its picture event (the builders' cues: ${P}\\studio\\out\\${S}\\build_*\\sound_cues.json), no silent action, the ambience per place, the seam. Return ONE shot entry per shot that has a sound issue (score = its sound score) and film_score = the sound score.`),
])
const ok = res.filter(Boolean)
// fixes per owner (plain code: no agent needed)
const fixes = {}
for (const r of ok) for (const s of r.shots) for (const i of s.issues) {
  const k = i.owner || 'LEAD'
  ;(fixes[k] = fixes[k] || []).push(`[${i.priority}] ${s.id} f${i.frames}: ${i.problem} -> ${i.fix}`)
}
const scores = {}
for (const r of ok) for (const s of r.shots) (scores[s.id] = scores[s.id] || []).push(s.score)
const shotScore = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.min(...v)]))
const failing = Object.entries(shotScore).filter(([, v]) => v < 8).map(([k]) => k)
return { round: A.round, film: ok.map((r) => r.film_score), shotScore, failing, fixes, lenses_missing: 3 - ok.length }
