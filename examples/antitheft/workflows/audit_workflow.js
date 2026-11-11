export const meta = {
  name: 'antitheft-audit',
  description: 'Scored shot-by-shot audit of the antitheft preview video (8 shot auditors + 1 whole-video auditor)',
  phases: [
    { title: 'Audit', detail: '2 shots per auditor + one whole-video auditor' },
  ],
}

const P = 'C:\\Users\\utkar\\Desktop\\animated-shorts-studio'
const ARGS = typeof args === "string" ? JSON.parse(args) : args
const VIDEO = ARGS.video   // e.g. studio\\out\\antitheft\\preview1.mp4 (540x960, with sound)
const ROUND = ARGS.round   // e.g. "A1"
const OUT = `${P}\\studio\\out\\antitheft\\audit_${ROUND}`

const COMMON = `
You are a strict, experienced animation director auditing a REAL YouTube Short before release: "The Anti-Theft Sign That Made People Steal" (~75 s, 1080x1920, 30 fps; 2D cartoon characters on camera-facing cards in a painted 3D world). Be harsh and specific: the user compares every frame with a polished reference channel and asked for repeated scored reviews until every shot is excellent.
READ FIRST: ${P}\\studio\\src\\videos\\antitheft\\BUILD_PLAN.md — the shot table AND the "QUALITY BAR v2" + "ROUND 2+ directive" sections at the end (the user's own requirements: living animation with gaze and changing expressions, nothing rigid or frozen, rich detail and shadows everywhere, the place must read as a desert national park, correct light, rich correct colour, a clearly distinct main character, natural camera work, intriguing shots; and MORE detail every round). Style target: ${P}\\study\\CHANNEL_STYLE_BIBLE.md (sections 3-8, 13). Reference frames for comparison (private study only): ${P}\\study\\videos\\_data\\<slug>\\full\\shot_NN_mid.jpg, contact_1fps.jpg.
VIDEO: ${P}\\${VIDEO} (a half-resolution 540x960 preview with the final voice, music and SFX). Timeline: ${P}\\sound\\antitheft\\audio\\timeline_video.json (VIDEO frames: every shot's a..b, every BEAT; cite VIDEO frames in issues; the picture code runs on an older clock, old = warp.json warp[new], the fixers convert). Words: ${P}\\sound\\antitheft\\voice\\words.json. Code (read-only for you): ${P}\\studio\\src\\videos\\antitheft\\.
HOW TO WATCH (fast, from the video): put everything in ${OUT}\\ . Contact sheet of a shot (every 4th frame): ffmpeg -v error -y -ss <a/30> -t <(b-a)/30> -i "<video>" -vf "select='not(mod(n\\,4))',scale=180:320,tile=8x4" -frames:v 1 -update 1 <out.jpg> . Motion strip (12 consecutive frames, judge life / rigidity / camera speed): ffmpeg -v error -y -ss <f/30> -i "<video>" -vf "scale=180:320,tile=12x1" -frames:v 1 -update 1 <strip.jpg> . Single frame: ffmpeg -v error -y -ss <f/30> -i "<video>" -frames:v 1 -update 1 <f.png> . Make strips at every key beat of your shots and in the middle of every hold. LOOK at every image with the Read tool. For fine detail you may render at most 3 full-res stills: cd ${P}\\studio && node scripts/stills.mjs out/antitheft/audit_${ROUND}/full_ <frame> 1 (slow, ~1 min). Never play audio aloud. Read-only on all code and assets.
SCORE each shot 1-10 on: framing, camera (moves, speed, easing, angles), lighting, colour, place_detail (environment richness and sense of place), character_design (incl. the main character being distinct), acting (gaze, expressions changing on the beats, reactions), life (idle motion, secondary motion, wind, nothing frozen or stiff), readability (signs, story beat clear; faces NOT under the caption band: caption text sits at y 660-696 in this 540x960 preview), intrigue (would a viewer keep watching), and overall. 8 = matches the reference channel; 10 = better.
ISSUES: every problem with frames, what is wrong, the OWNER file group (WORLD-EXT = sets_ext.ts/paint.ts; WORLD-INT = sets_int.ts/lights.ts/shade.ts; CHAR = toon.ts/cast.ts/cardshade.ts; POST = AntiTheft.tsx/Captions.tsx/ink.ts/grade.ts/lensblur.ts; LEAD = story.ts cameras/timing/DOF, plan.ts anchors, world.ts; AUDIO = sound/antitheft/audio (music, SFX, ambience, mix); VOICE = the narration takes themselves (delivery, emotion, pacing, clarity, pronunciation of one line -> name the line and what the re-take must do)), a concrete fix with numbers, and priority P1 (must fix) / P2 (should) / P3 (nice). Also give add_detail ideas (specific props, life, particles, set dressing) for each shot.
USER DECISIONS (binding, do not penalise them): the narration is a natural ElevenLabs read (James, eleven_v4) at about 2.6-2.8 words/s, so the film runs ~75-80 s; the user explicitly accepted the longer length and FORBIDS time-stretching or speeding the voice up. Judge narration pace by CONTRAST and timing (setting lines vs punch lines, pauses before reveals, comic timing), never against the reference's 3.7 w/s. Return the structured object only.`

const SHOT_SCHEMA = {
  type: 'object',
  properties: {
    shots: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'number' },
      scores: { type: 'object', properties: {
        framing: { type: 'number' }, camera: { type: 'number' }, lighting: { type: 'number' }, colour: { type: 'number' },
        place_detail: { type: 'number' }, character_design: { type: 'number' }, acting: { type: 'number' }, life: { type: 'number' },
        readability: { type: 'number' }, intrigue: { type: 'number' }, overall: { type: 'number' } },
        required: ['framing', 'camera', 'lighting', 'colour', 'place_detail', 'character_design', 'acting', 'life', 'readability', 'intrigue', 'overall'] },
      verdict: { type: 'string' },
      issues: { type: 'array', items: { type: 'object', properties: {
        frames: { type: 'string' }, owner: { type: 'string', enum: ['WORLD-EXT', 'WORLD-INT', 'CHAR', 'POST', 'LEAD', 'AUDIO', 'VOICE'] },
        problem: { type: 'string' }, fix: { type: 'string' }, priority: { type: 'string', enum: ['P1', 'P2', 'P3'] } },
        required: ['frames', 'owner', 'problem', 'fix', 'priority'] } },
      add_detail: { type: 'array', items: { type: 'object', properties: { owner: { type: 'string' }, idea: { type: 'string' } }, required: ['owner', 'idea'] } },
      evidence: { type: 'array', items: { type: 'string' }, description: 'paths of the sheets/strips you made' },
    }, required: ['id', 'scores', 'verdict', 'issues', 'add_detail', 'evidence'] } },
  },
  required: ['shots'],
}

const GROUPS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16]]
phase('Audit')
const shotAudits = GROUPS.map((g) => () => agent(`${COMMON}\n\nYOUR SHOTS: ${g.join(' and ')} (look up their frames in timeline.json; include the 4 frames before and after each for the dissolves). Shot 16 must end on a frame that matches frame 0 exactly (the video loops): check it.`,
  { label: `audit:shots ${g.join('+')}`, phase: 'Audit', schema: SHOT_SCHEMA }))
const globalAudit = () => agent(`${COMMON}\n\nYOU ARE THE WHOLE-VIDEO AUDITOR. Judge the film as one piece: story clarity in order, pacing and shot rhythm (a new picture every ~1.7 s?), every dissolve (7-9 f, both shots moving, no pops, no light leaks between layers), continuity (characters, costumes, light, props consistent across shots), the loop seam (last frame vs frame 0: picture AND sound), captions (timing vs words.json: each caption 2 f before its word, 1-3 words, never covering a face, legible on every background), colour consistency and grade across the film, and the SOUND: you cannot hear it, so analyse ${P}\\sound\\antitheft\\audio\\mix.wav, the stems and cues.md with ffmpeg ebur128 and spectrograms you draw (python: ${P}\\tools\\.venv\\Scripts\\python.exe -s with PYTHONNOUSERSITE=1), check that every SFX onset lands 0-3 f from its picture event in the video, music ~-18 LU under the voice, -14 LUFS, true peak <= -2 dBTP, the music ending on the last word. Return the same structured object with ONE entry, id 0, for the whole video (scores = whole-film scores), and put per-shot remarks into issues with their frames.`,
  { label: 'audit:whole video', phase: 'Audit', schema: SHOT_SCHEMA })

const soundAudit = () => agent(`${COMMON}

YOU ARE THE SOUND + VOICE AUDITOR (the narration is an ElevenLabs voice, James on eleven_v4, assembled from per-beat takes in ${P}\sound\antitheft\voice\; the mix is built by ${P}\sound\antitheft\audio\mix.py). You cannot hear: MEASURE everything from ${P}\sound\antitheft\audio\mix.wav, stem_voice.wav, stem_music.wav, stem_sfx.wav, stem_amb.wav, cues.md, voice\words.json (python: ${P}\tools\.venv\Scripts\python.exe -s with PYTHONNOUSERSITE=1; tools\voice_audit.py has pitch/level helpers; faster-whisper is installed for transcription). Judge against the reference channel (study\CHANNEL_STYLE_BIBLE.md sections 9-10: one bright storyteller, F0 ~195 Hz with ~14 st range, punch words +5..+9 st, secret lines -5 st, questions rise, last line settles low, no breaths, dry, warm low-mids; music a soft tonal bed ~-18 LU under the voice, no drums, ends with the last word; SFX 0-3 f from their picture events, in word gaps or under the voice; -14 LUFS, true peak <= -2 dBTP, LRA 1.7-3.1). VOICE checks per line: Whisper word accuracy and confidence, pronunciation of fiancé / Cialdini / petrified, pace per line (no rushed or dragged lines, pauses only where the script has them), pitch and level consistency between beats (it must sound like ONE take), the acting of each beat (hook intrigue, ominous sign, a real whisper, the mystery question rising, excitement on 'almost eight percent', the deadpan 'It gave them permission', the amused last line), clicks/artifacts at the take joins (look for discontinuities in the waveform at every phrase boundary), breaths, sibilance (energy 5-9 kHz peaks), and how attention-grabbing the first 3 seconds are. MIX checks: voice intelligibility vs music/SFX per beat (voice-to-bed margin), masking, ducking, SFX levels and sync against the video frames, music fit/changes on the beats, the loop seam (last 0.3 s into the first 0.3 s). Score the SOUND on the same 11 dimensions as a shot, mapped as: framing=voice clarity, camera=pacing, lighting=mix balance, colour=tone/EQ, place_detail=ambience+SFX richness, character_design=voice character fit, acting=voice acting, life=music+SFX life, readability=intelligibility, intrigue=attention/hook, overall. Return ONE entry with id 99 (the sound), issues owned by VOICE (a specific line to re-take: give the exact words, what is wrong, and the direction/audio tag the new take needs) or AUDIO (mix/music/SFX with numbers).`,
  { label: 'audit:sound + voice', phase: 'Audit', schema: SHOT_SCHEMA })
const res = await parallel([...shotAudits, globalAudit, soundAudit])
const shots = res.filter(Boolean).flatMap((r) => r.shots)
return { round: ROUND, shots }
