# Animated Shorts Pipeline

This repo makes animated vertical story shorts. For any new script, use the **animated-story-short** skill
(`.claude/skills/animated-story-short/SKILL.md`) and follow `PIPELINE.md` and `LESSONS.md`.

- The current short is set in `.short.json` (`tools/new_short.py` writes it). Every tool follows it, and `SHORT=<slug>`
  overrides it.
- Python: `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s ...` (create the venv with `setup/setup.ps1`).
- Pins: three 0.175, Remotion 4.0.290. Never upgrade them.
- Never commit renders, audio takes, reference videos, `.venv`, `node_modules` or keys (`.gitignore` covers them).
- No `Co-Authored-By: Claude` trailer on commits.
