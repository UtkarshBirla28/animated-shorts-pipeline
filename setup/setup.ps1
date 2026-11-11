# One-time setup on a new Windows machine. Run from the repo root in PowerShell:
#   powershell -ExecutionPolicy Bypass -File setup\setup.ps1
# Needs: Git (with Git Bash), Node 20+ (22 tested), Python 3.12, ffmpeg on PATH, Google Chrome.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== checking tools"
foreach ($c in @("git", "node", "npm", "ffmpeg", "ffprobe")) {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "$c not found on PATH (see SETUP.md)" }
}
$py = (Get-Command py -ErrorAction SilentlyContinue)
if ($py) { $pyexe = "py"; $pyarg = @("-3.12") } else { $pyexe = "python"; $pyarg = @() }

Write-Host "== studio: npm ci (pinned Remotion 4.0.290 / three 0.175)"
Push-Location studio
npm ci
Pop-Location

Write-Host "== tools/.venv + Python packages"
if (-not (Test-Path tools\.venv)) { & $pyexe @pyarg -m venv tools\.venv }
$env:PYTHONNOUSERSITE = "1"
& tools\.venv\Scripts\python.exe -m pip install --upgrade pip
& tools\.venv\Scripts\python.exe -m pip install -r setup\requirements.txt

Write-Host "== optional: upstream template repo (read-only reference) -> upstream\"
if (-not (Test-Path upstream)) { git clone --depth 1 https://github.com/mromidev/claude-animated-shorts.git upstream }

Write-Host "== environment check"
& tools\.venv\Scripts\python.exe -s setup\check_env.py
Write-Host "done. Next: SETUP.md step 'ElevenLabs', then open Claude Code in this folder."
