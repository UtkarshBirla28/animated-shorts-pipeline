# One-time setup of the moved project on a new Windows PC.
# Run from the project folder (animated-shorts-studio) in PowerShell:
#   powershell -ExecutionPolicy Bypass -File _handover\setup\SETUP_NEW_PC.ps1
# Needs first: Git for Windows (with Git Bash), Node 20+ (22 was used), Python 3.12, ffmpeg on PATH, Google Chrome,
# Claude Code installed and logged in. The script changes nothing outside this folder except: it copies the research
# notes to your home folder, copies the reference Shorts next to the project, and installs the ElevenLabs key file
# into ~/.secrets if you brought one.

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$parent = Split-Path -Parent $root
$problems = @()
Write-Host "== project folder: $root"

Write-Host "== 1. checking tools"
foreach ($c in @("git", "node", "npm", "ffmpeg", "ffprobe")) {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { $problems += "$c is not installed or not on PATH"; Write-Host "   MISSING: $c" } else { Write-Host "   ok: $c" }
}
$pyexe = $null; $pyarg = @()
if (Get-Command py -ErrorAction SilentlyContinue) { $pyexe = "py"; $pyarg = @("-3.12") }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $pyexe = "python" }
if (-not $pyexe) { $problems += "Python 3.12 is not installed"; Write-Host "   MISSING: python" } else { Write-Host "   ok: python" }
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) { Write-Host "   ok: NVIDIA graphics card found" } else { Write-Host "   note: no NVIDIA card found; renders and word timing still work, only slower" }

Write-Host "== 2. studio: npm ci (exact packages from the lock file; a few minutes)"
if (Get-Command npm -ErrorAction SilentlyContinue) {
  Push-Location studio
  npm ci
  if ($LASTEXITCODE -ne 0) { $problems += "npm ci failed in studio (see the output above)" }
  Pop-Location
}

Write-Host "== 3. Python environment tools\.venv"
if ($pyexe) {
  if (-not (Test-Path tools\.venv)) { & $pyexe @pyarg -m venv tools\.venv }
  $env:PYTHONNOUSERSITE = "1"
  & tools\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
  & tools\.venv\Scripts\python.exe -m pip install -r _handover\setup\requirements.txt
  if ($LASTEXITCODE -ne 0) { $problems += "pip install failed (see the output above)" }
}

Write-Host "== 4. files that lived outside the project on the old PC"
$ext = Join-Path $parent "_external"
if (Test-Path $ext) {
  $refSrc = Join-Path $ext "yt short videos"
  $refDst = Join-Path $parent "yt short videos"
  if ((Test-Path $refSrc) -and -not (Test-Path $refDst)) { Copy-Item $refSrc $refDst -Recurse; Write-Host "   reference Shorts -> $refDst" }
  $rnSrc = Join-Path $ext "research_notes"
  $rnDst = Join-Path $HOME "research_notes"
  if ((Test-Path $rnSrc) -and -not (Test-Path $rnDst)) { Copy-Item $rnSrc $rnDst -Recurse; Write-Host "   research notes -> $rnDst" }
} else {
  Write-Host "   note: no _external folder next to the project (reference Shorts and research notes not found)"
  $problems += "_external folder not found next to the project: unzip the whole zip into one folder"
}

Write-Host "== 5. the two files that hold an absolute path"
$refDstFwd = (Join-Path $parent "yt short videos") -replace "\\", "/"
$f1 = "tools\v3\compare_films.py"
if (Test-Path $f1) {
  $t = Get-Content $f1 -Raw
  $t2 = $t -replace 'REFDIR = "[^"]*"', ('REFDIR = "' + $refDstFwd + '"')
  if ($t2 -ne $t) { [IO.File]::WriteAllText((Resolve-Path $f1), $t2); Write-Host "   compare_films.py REFDIR -> $refDstFwd" }
}
$tok = (Join-Path $parent "RAM_TOKEN.txt")
$drive = $tok.Substring(0,1).ToLower()
$tokBash = "/" + $drive + ($tok.Substring(2) -replace "\\", "/")
$f2 = "studio\scripts\ram_token.sh"
if (Test-Path $f2) {
  $t = Get-Content $f2 -Raw
  $t2 = $t -replace 'RAM_TOKEN="[^"]*"', ('RAM_TOKEN="' + $tokBash + '"')
  if ($t2 -ne $t) { [IO.File]::WriteAllText((Resolve-Path $f2), ($t2 -replace "`r`n", "`n")); Write-Host "   ram_token.sh RAM_TOKEN -> $tokBash" }
}
if (Test-Path "studio\out\.stills_slots") { Remove-Item "studio\out\.stills_slots\*" -Force -ErrorAction SilentlyContinue }

Write-Host "== 6. ElevenLabs key (for new voice takes and sound effects)"
$keyDst = Join-Path $HOME ".secrets\elevenlabs_api_key"
if (Test-Path $keyDst) { Write-Host "   ok: key file already present" }
else {
  $cands = @((Join-Path $parent "elevenlabs_api_key.txt"), (Join-Path $root "elevenlabs_api_key.txt"), (Join-Path $ext "elevenlabs_api_key.txt"))
  $found = $cands | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($found) {
    New-Item -ItemType Directory -Force (Split-Path -Parent $keyDst) | Out-Null
    Copy-Item $found $keyDst
    Write-Host "   key installed to $keyDst (you can now delete $found)"
  } else {
    Write-Host "   NOT FOUND: put your ElevenLabs API key (one line) in $keyDst"
    $problems += "ElevenLabs key missing: put the key (one line) in $keyDst ; needed only for new voice takes and sound effects"
  }
}

Write-Host "== 7. type check of the film (should end with no errors)"
if (Test-Path "studio\node_modules") {
  Push-Location studio
  npx tsc --noEmit -p src/videos3/pointing/tsconfig.json
  if ($LASTEXITCODE -ne 0) { $problems += "the film's type check reported errors (Claude will look at them)" } else { Write-Host "   ok: 0 errors" }
  Pop-Location
}

Write-Host ""
if ($problems.Count -eq 0) { Write-Host "ALL GOOD. Open Claude Code in this folder and type: continue" }
else {
  Write-Host "SETUP FINISHED WITH NOTES:"
  $problems | ForEach-Object { Write-Host "  - $_" }
  Write-Host "Open Claude Code in this folder, type: continue , and paste this list to it."
}
