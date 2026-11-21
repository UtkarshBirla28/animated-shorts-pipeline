# animated-shorts-studio: instructions for Claude Code

## STATE (2026-11-21): the pointing Short ("the trap", pointing v4) is SHELVED by the owner
He judged its script "not good at all" and stopped it before any preview. Do NOT resume it unless he asks for it by
name; never upload any of its renders. Everything is kept (code, sets, cast, sound, audits) for reuse.

**The next video** follows the owner's direction (2026-11-21):
- The STORYTELLING and kind of story of our two special films, anti-theft and salad oil: a real experiment or
  real-world cause about ordinary people and one everyday thing, a story that gives the viewer real value, with full
  craft (voice, body movement, sound). Plus a strong hook in the first 3-5 s. No gimmick games played on the viewer.
- Keep the good technical parts of the pointing build: the v3 kit look (2D cards in a lit 3D world), the faster
  render pipeline, reusable sets and cast parts, the audit machine and gates (`tools/v3/gates_v4.py`,
  `briefs/v3/pointing/director/audit_sheets.py`, the 7-lens audit + sceptic workflow).
- Read first: `LESSONS.md` (above all "From the salad oil short", "From the Ricks Clips study" and items 64-75 from
  the pointing short), then the anti-theft and salad oil scripts and notes (`sound/antitheft/`, `sound/saladoil/`,
  `briefs/`).

If the PC is not set up (`studio/node_modules` or `tools/.venv` missing): tell the owner to run
`powershell -ExecutionPolicy Bypass -File _handover\setup\SETUP_NEW_PC.ps1` from the project folder.

Speed notes (2026-11-21): the type check is incremental (`studio/tsconfig.json` and
`studio/src/videos3/pointing/tsconfig.json` write `.tsbuildinfo` under `studio/node_modules/.cache/tsc/`; give a new
film's tsconfig the same two lines); `.ignore` / `.rgignore` keep Grep / Glob out of renders, frames, packages and
temp folders (name such a folder as the search path to search it on purpose).

Standing rules (details in `_handover/memory/`):
- Answer the owner in plain, simple English; short; honest about what is good and what is not.
- Put every viewable result in `pointing_preview/`; never call anything final before he has seen a preview.
- Subagents: model `opus`, effort `high`. One render at a time. Never play audio or video out loud.
- Never upload to YouTube; never commit or push unless he asks; no Claude co-author line in commits.
- Never time-stretch the voice. The film must be under 70 s.
- Compare every draft side by side with our older films and the reference channel before showing it.
- No secrets in files; the ElevenLabs key lives in `~/.secrets/elevenlabs_api_key`.

The general pipeline is in `PIPELINE_V3.md`; lessons from earlier films in `LESSONS.md`.
