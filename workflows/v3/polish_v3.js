export const meta = {
  name: 'short-v3-polish',
  description: 'PIPELINE_V3 stage D: fix ONLY the failing shots; each set-group owner fixes its shots and re-renders only them from the per-shot cache (kit_render), then re-runs the gates on them',
  phases: [{ title: 'Polish', detail: 'one fixer per set group that owns a failing shot (+ SOUND if it has fixes)' }],
}

// ARGS (save to studio/out/<slug>/args_polish_<round>.json FIRST): root, slug, title, comp, round ("D1"...),
//   groups: [{ name, sets, shots }], failing: ["s03", ...] (audit_v3 failing + qa_gates failing_shots),
//   fixes: { "<group or SOUND or LEAD>": ["[P1] s03 f120-140: ... -> ...", ...] } (from audit_v3; the LEAD applies LEAD items first),
//   notes (binding LEAD decisions)
const A = typeof args === 'string' ? JSON.parse(args) : args
const P = A.root, S = A.slug
const PY = `PYTHONNOUSERSITE=1 ${P}\\tools\\.venv\\Scripts\\python.exe -s`
const V = `${P}\\studio\\src\\videos3\\${S}`
const failing = new Set(A.failing || [])
const REPORT = { type: 'object', properties: {
  fixed: { type: 'array', items: { type: 'string' } }, not_fixed: { type: 'array', items: { type: 'string' } },
  rerendered: { type: 'array', items: { type: 'string' } }, gates_after: { type: 'string' },
  lead_requests: { type: 'array', items: { type: 'string' } }, evidence: { type: 'array', items: { type: 'string' } } },
  required: ['fixed', 'not_fixed', 'rerendered', 'gates_after', 'lead_requests', 'evidence'] }
const RULES = `
HOUSE RULES: stills only via node ${P}\\tools\\v3\\storyboard.mjs; renders only via kit_render.mjs (RAM token inside; ONLY your failing shots: the cache keeps every other shot). Never play audio / video, never install, never edit studio/src/kit/* or another group's files, do not commit. Save often. The bible ${P}\\briefs\\v3\\${S}\\bible.json stays the contract: a fix that changes what a shot shows is a lead_request. ${A.notes || ''}`

const jobs = A.groups.map((g) => ({ g, mine: g.shots.filter((s) => failing.has(s)), list: (A.fixes || {})[g.name] || [] }))
  .filter((j) => j.mine.length || j.list.length)
phase('Polish')
const run = async (label, prompt) => {
  const r = await agent(prompt, { label, phase: 'Polish', schema: REPORT })
  if (r) return r
  log(`${label} died: one retry that continues from disk`)
  return agent(`${prompt}\n\nCONTINUE: a previous attempt died; read your files and the evidence folder and continue.`, { label: `${label} (retry)`, phase: 'Polish', schema: REPORT })
}
const thunks = jobs.map((j) => () => run(`polish:${j.g.name}`, `You own set group ${j.g.name} of "${A.title}" (slug ${S}): sets ${j.g.sets.join(', ')}, files ${j.g.sets.map((s) => `${V}\\sets\\${s}.ts, ${V}\\sets\\${s}.cams.ts`).join(', ')}. Round ${A.round}.
FAILING SHOTS of yours: ${j.mine.join(', ') || '(none: only the listed fixes)'}. YOUR FIX LIST (do every P1 and P2, then P3 as time allows):
${j.list.join('\n') || '(the gate failures only: see the gates json)'}
READ FIRST: the gates of the last animatic (${P}\\studio\\out\\${S}\\${S}_preview_gates\\gates.json), the audit evidence (${P}\\studio\\out\\${S}\\audit_${A.round.replace('D', 'C')}\\), the bible entries of your shots.
LOOP (at most 3 rounds): fix -> typecheck (cd ${P}\\studio && npx tsc --noEmit -p src/videos3/${S}/tsconfig.json) -> draft stills of the shot (storyboard.mjs --slug ${S} --shots <ids> --force; LOOK) -> re-render ONLY those shots: cd ${P}\\studio && node scripts/kit_render.mjs --entry src/videos3/${S}/index.ts --comp ${A.comp} --quality preview --shots <ids> --out out/${S}/ -> ${PY} ${P}\\tools\\v3\\qa_gates.py <the new shot file> --shots=<one-line json> --no-loop. Regenerate your sound_cues.json if an action moved.${RULES}
RETURN the structured report.`))
if ((A.fixes || {}).SOUND) thunks.push(() => run('polish:SOUND', `You own the SOUND of "${A.title}" (slug ${S}), round ${A.round}. YOUR FIX LIST:\n${A.fixes.SOUND.join('\n')}\nFix in sound\\${S}\\audio\\ (mix.py, music.py, SFX_MAP.json), re-mix ONLY after the picture fixers are done rendering (never a mix and a render at the same time: 16 GB), measure (ebur128, the sync report), never play audio.${RULES}\nRETURN the structured report (gates_after = the mix numbers).`))
const res = await parallel(thunks)
return { round: A.round, results: jobs.map((j, i) => ({ group: j.g.name, shots: j.mine, report: res[i] })), sound: (A.fixes || {}).SOUND ? res[res.length - 1] : null }
