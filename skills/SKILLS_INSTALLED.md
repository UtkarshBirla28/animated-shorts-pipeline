# Skills for the animated-shorts pipeline (set up 2026-11-10)

Found with **find-skills** (`npx skills find <query>`, registry at skills.sh). Every candidate was cloned and read line
by line by a review agent before install (security + fit for our versions). Installed globally for Claude Code at
`C:\Users\utkar\.claude\skills\` with `npx skills add <reviewed local copy> -g -a claude-code -y --copy`.

## Installed

| Skill | Source | Why | Local note added |
|---|---|---|---|
| find-skills | vercel-labs/skills | search + install more skills later (`npx skills find X`) | - |
| cartoon-3d-short | mromidev/claude-animated-shorts (installed 2026-11-09) | THE pipeline skill this whole folder is built on | yes (2026-11-09 local setup block) |
| threejs-shaders | cloudai-x/threejs-skills (19.7K installs) | onBeforeCompile, depth reads, colour-space chunks: ink/lens/grade shaders | r175 + Remotion override |
| threejs-materials | cloudai-x/threejs-skills (18.8K) | toon gradients, alphaTest cards, toneMapped:false, canvas sRGB | r175 + Remotion override |
| threejs-textures | cloudai-x/threejs-skills (16.1K) | CanvasTexture, mipmaps/anisotropy, render targets, depth textures | r175 + Remotion override |
| threejs-geometry | cloudai-x/threejs-skills (18.5K) | edges/lines, instancing + merging for towns/props | r175 + Remotion override |
| ffmpeg | digitalsamba/claude-code-video-toolkit (13.7K) | encode/mux/QA recipes | vertical Shorts + loudness note |
| remotion-render | remotion-dev/skills (official, 305K) | render/still CLI and API | pinned 4.0.290 + system-Chrome/ANGLE note |

## Reviewed and NOT installed (reasons)

| Skill | Reason |
|---|---|
| remotion-best-practices (official, 782K) | written for Remotion 4.0.5xx APIs (we are pinned to 4.0.290); auto-starts Studio / opens a browser, nudges `npx remotion upgrade`. Its one directly useful file (three.js rules: ThreeCanvas needs width/height, never `useFrame`, `<Sequence layout="none">` inside ThreeCanvas) is saved here as `remotion-3d-rules_from-remotion-dev-skills.md` |
| remotion-captions, remotion-multimedia | byte-identical subsets of the bundle; assume newer packages; we already have word timings |
| threejs-fundamentals / lighting / animation / react-three-fiber / loaders / performance / postprocessing | teach real-time animation (useFrame, Clock, delta) that breaks Remotion's frame-driven rendering, or r176+ APIs, or three/addons EffectComposer (we use pmndrs postprocessing) |
| elevenlabs text-to-speech / sound-effects / music / speech-to-text (official) | SAFE content but each one auto-runs an unpinned `npx -y @elevenlabs/cli@latest onboard init` that signs in and writes an API key; paid. Install only if we choose ElevenLabs for the voice (then remove SKILL.md line 13 first) |
| parody-short (digitalsamba) | mines Slack/email/CRM for office in-jokes, animates real photos, needs paid GPU (Modal); off-topic |
| cinematography / storyboard / color-grading / story-hook skills | all under ~2.6K installs from unknown authors; not trusted enough |

## Search log (2026-11-10)
remotion, threejs, react three fiber, ffmpeg, text to speech voiceover, elevenlabs, sound design, youtube shorts,
video script storytelling, whisper transcription, motion design animation, video analysis, cinematography,
color grading, storyboard, toon shader, remotion three, explainer video.

Review sources (temporary): the session scratchpad `skillsrc\` folder.
