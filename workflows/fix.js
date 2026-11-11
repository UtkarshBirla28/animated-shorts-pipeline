export const meta = {
  name: 'short-fix',
  description: 'Fix round: each owner applies its audit fixes and adds detail/life in its own sandbox',
  phases: [
    { title: 'Fix', detail: 'owners fix their audit issues in parallel sandboxes' },
  ],
}

// ARGS (JSON; may arrive as a string): root, slug, comp, title, seconds, place, safety, round (the audit round, "A1"...),
// video (the audited preview), notes (round notes for every owner), fixes: { OWNER: "fix list / where to read it" },
// time_map (true only for a re-voiced short)
const ARGS = typeof args === 'string' ? JSON.parse(args) : args
const P = ARGS.root
const S = ARGS.slug
const ROUND = ARGS.round
const FIXES = ARGS.fixes || {}
const PY = `${P}\\tools\\.venv\\Scripts\\python.exe -s`

const OWN = {
  'WORLD-EXT': { name: 'world_ext', files: `sets_ext.ts, paint.ts (and the KENNEY list line in YOUR sandbox world.ts if you add Kenney CC0 models extracted from studio\\_downloads\\kenney\\*.zip into studio\\public\\${S}\\kenney\\; report that line)`, skills: 'threejs-geometry, threejs-textures, threejs-materials' },
  'WORLD-INT': { name: 'world_int', files: 'sets_int.ts, lights.ts, shade.ts', skills: 'threejs-materials, threejs-shaders' },
  'CHAR': { name: 'char', files: 'toon.ts, cast.ts, cardshade.ts', skills: 'threejs-materials, threejs-textures' },
  'POST': { name: 'post', files: `${ARGS.comp}.tsx, Captions.tsx, ink.ts, grade.ts, lensblur.ts`, skills: 'threejs-shaders, remotion-render' },
  'CAM': { name: 'cam', files: 'story.ts: ONLY its camera and lens parts: CAMS and the camera helpers, P0 (frame 0 and the last frame must stay IDENTICAL: the video loops), DOFS, KICKS, XFADE lengths. Do NOT change BEAT, the SHOTS boundaries or the light assignments/relights (ask in lead_requests)', skills: 'remotion-render' },
  'AUDIO': { name: 'audio', files: `everything in sound\\${S}\\audio\\ (no sandbox: run python from that folder)`, skills: 'ffmpeg' },
}

const CLOCK = ARGS.time_map
  ? `Timeline: ${P}\\sound\\${S}\\audio\\timeline.json = the PICTURE CLOCK your code uses (old frames: BEAT / SHOTS / literals). The video and the audit cite VIDEO frames (timeline_video.json next to it); convert with warp.json there: picture frame = warp[video frame], video frame = inv[picture frame]. The scene renders at WARP[f] (voicewarp.ts is generated: never edit it or words.ts).`
  : `Timeline: ${P}\\sound\\${S}\\audio\\timeline.json (every shot a..b and BEAT frame; the audit cites these frames). words.ts and voicewarp.ts are generated: never edit them.`

const prompt = (owner, list) => {
  const o = OWN[owner]
  return `
You are the ${owner === 'CAM' ? 'CAMERA (cinematography)' : owner} owner of a REAL YouTube Short, "${ARGS.title}" (~${ARGS.seconds} s, 1080x1920, 30 fps, three.js r175 in Remotion 4.0.290). You built your part earlier; an audit (round ${ROUND}) scored every shot against the user's bar and the reference channel. Now FIX your issues and ADD detail and life.
READ FIRST: ${P}\\studio\\src\\videos\\${S}\\BUILD_PLAN.md (shot table + the QUALITY BAR section at the end: the user's own requirements: living animation, changing expressions, nothing rigid, rich detail and shadows, the place must read as ${ARGS.place}, correct light and colour, MORE detail every round), then plan.ts, story.ts, ctx.ts, world.ts, and your own files; ${P}\\LESSONS.md (hard-won rules). Style: ${P}\\study\\CHANNEL_STYLE_BIBLE.md.
CURRENT STATE: the merged film is at ${P}\\studio\\src\\videos\\${S}\\ (read-only for you). Latest preview video: ${P}\\${ARGS.video} (540x960 with sound; extract frames with ffmpeg -ss <f/30>). ${CLOCK} Audit evidence sheets: ${P}\\studio\\out\\${S}\\audit_${ROUND}\\.
${owner === 'AUDIO' ? `Python: PYTHONNOUSERSITE=1 ${PY}.` : `YOUR SANDBOX: ${P}\\studio\\src\\videos\\${S}_${o.name}\\ was just refreshed from the merged film. Edit ONLY: ${o.files}. Render stills: cd ${P}\\studio && ENTRY=src/sandboxes/${o.name}/index.ts node scripts/stills.mjs out/${S}/${o.name}/${ROUND}_<tag>_ <frames> 0.5 (each still ~40-60 s because the world rebuilds per still: batch frames, keep to ~25 stills total). For motion, render a short clip instead: cd ${P}\\studio && ENTRY=src/sandboxes/${o.name}/index.ts node scripts/render.mjs out/${S}/${o.name}/${ROUND}_clip_<tag>.mp4 0.5 2 <a>-<b> (fast per frame after the bundle), then extract 12-frame strips with ffmpeg. LOOK at everything with the Read tool. Type-check: cd ${P}\\studio && npx tsc --noEmit 2>&1 | grep "${S}_${o.name}/".`}
SKILLS: load ${o.skills} with the Skill tool if useful (obey their local r175/Remotion override notes).
RULES: pure function of (shot, frame) (no clocks, Date, Math.random); three r175 only; no useFrame; no installs; never play audio; never touch folders outside ${P} or other sandboxes; do not edit plan.ts / world.ts / words.ts / voicewarp.ts${owner === 'CAM' ? ' (story.ts camera/lens parts are YOURS)' : ' / story.ts'}: put needed changes in lead_requests with exact values. Other owners render at the same time: keep renders modest. SAFETY: ${ARGS.safety}
${ARGS.notes ? 'ROUND NOTES (apply to every owner): ' + ARGS.notes + ' ' : ''}YOUR FIX LIST (from the audit; do every P1 and P2, as many P3 and add-detail ideas as you can, and anything else you see that is below the bar):
${list}
FINAL: return the structured report (files changed, what you fixed/added, what still looks wrong, lead_requests, best stills/clips).`
}

const REPORT = {
  type: 'object',
  properties: {
    files_changed: { type: 'array', items: { type: 'string' } },
    built: { type: 'array', items: { type: 'string' } },
    still_wrong: { type: 'array', items: { type: 'string' } },
    lead_requests: { type: 'array', items: { type: 'string' } },
    best_stills: { type: 'array', items: { type: 'string' } },
  },
  required: ['files_changed', 'built', 'still_wrong', 'lead_requests', 'best_stills'],
}

phase('Fix')
const owners = Object.keys(FIXES).filter((k) => OWN[k] && FIXES[k] && FIXES[k].trim())
const res = await parallel(owners.map((k) => () => agent(prompt(k, FIXES[k]), { label: `fix:${k}`, phase: 'Fix', schema: REPORT })))
return owners.map((k, i) => ({ owner: k, report: res[i] }))
