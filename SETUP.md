# SETUP on a new Windows machine (about 20 minutes)

## 1. Install the basics
- **Git for Windows** (includes Git Bash): https://git-scm.com
- **Node.js 22 LTS**: https://nodejs.org
- **Python 3.12**: https://python.org (tick "Add to PATH")
- **ffmpeg** (full build, with ffprobe) on PATH: `winget install Gyan.FFmpeg`
- **Google Chrome** in the default location. If it is somewhere else, set env `CHROME` to its path.
- **Claude Code**, signed in.
- **GitHub CLI** (`winget install GitHub.cli`), signed in with `gh auth login` as the account that owns this private repo.

## 2. Get the repo and install
```powershell
gh repo clone UtkarshBirla28/animated-shorts-pipeline
cd animated-shorts-pipeline
powershell -ExecutionPolicy Bypass -File setup\setup.ps1
```
This runs `npm ci` in `studio/` (pinned Remotion 4.0.290 + three 0.175), creates `tools/.venv` with the Python
packages, clones the upstream template into `upstream/` for reference, and runs `setup/check_env.py`.

## 3. ElevenLabs (the narration)
Use either option, or both.
- **MCP server** (lets Claude search voices and generate audio):
  `claude mcp add elevenlabs -s user -e ELEVENLABS_API_KEY=<your key> -- uvx elevenlabs-mcp`
  This needs `uv` (`winget install astral-sh.uv`). Restart Claude Code afterwards.
- **Env variable** (used by `tools/el_api.py`): `setx ELEVENLABS_API_KEY "<your key>"`, then open a new terminal.

Never paste the key into a file in this repo. On a new ElevenLabs account, add the James voice to My Voices once
(see PIPELINE.md Stage 2). The Starter plan has 40k credits a month, and one short uses about 8-12k with re-takes.

## 4. Skills
The pipeline skill and the helper skills it uses are in `.claude/skills/`. Claude Code loads them automatically when
it is started in this folder. To use them from anywhere, copy the folders to `%USERPROFILE%\.claude\skills\`.

## 5. Make a short
Open Claude Code in the repo folder and say, for example:
> Use the animated-story-short skill. New short from briefs/<my_script>.md (or this script: ...).

Claude then follows PIPELINE.md:
- new_short, then facts and script;
- the voice (you listen and approve);
- the story contract, then build, preview, the audit/fix loop until every shot and the sound score >= 8;
- the final render and QA.

## 6. Check the machine
`tools\.venv\Scripts\python.exe -s setup\check_env.py` should print `ALL GOOD`. Smoke test (renders 2 stills of the
example, silent):
```bash
cd studio && SHORT=antitheft node scripts/stills.mjs out/antitheft/smoke_ 0,600 0.5
```
