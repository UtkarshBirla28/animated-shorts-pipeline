# animated-shorts-studio: instructions for Claude Code

This project was moved to this PC from another laptop on 2026-11-20, in the middle of building the Short
"the trap" (pointing v4). The previous conversation did not come with it.

**If the owner says "continue" (or anything like it): you are the LEAD of this build.**
1. Read `_handover/HANDOVER.md` completely, then the files it lists in section 1.
2. If `studio/node_modules` or `tools/.venv` is missing, the PC is not set up yet: tell the owner to run
   `powershell -ExecutionPolicy Bypass -File _handover\setup\SETUP_NEW_PC.ps1` from the project folder (or run it
   yourself if he asks), and read what it prints.
3. Then carry on with section 3 of the handover (the work, in order), launching subagents as section 4 says.

Standing rules (details in `_handover/memory/`):
- Answer the owner in plain, simple English; short; honest about what is good and what is not.
- Put every viewable result in `pointing_preview/`; never call anything final before he has seen a preview.
- Subagents: model `opus`, effort `high`. One render at a time. Never play audio or video out loud.
- Never upload to YouTube; never commit or push unless he asks; no Claude co-author line in commits.
- Never time-stretch the voice. The film must be under 70 s.
- Compare every draft side by side with our older films and the reference channel before showing it.
- No secrets in files; the ElevenLabs key lives in `~/.secrets/elevenlabs_api_key`.

The general pipeline is in `PIPELINE_V3.md`; lessons from earlier films in `LESSONS.md`.
