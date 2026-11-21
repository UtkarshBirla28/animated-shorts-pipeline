# typo voice post-process: _assembled -> _work (refine_onsets + snap_ends) -> _tight (tools/tighten_pauses.py with
# true-silence overrides from plan_tighten.py) -> insert_pause.py (the "..." beats) -> gap report + dropout scan.
# Usage (studio root): powershell -File sound/typo/voice/post_voice.ps1 [-Factor 0.65]
param([string]$Factor = "0.65", [string]$Set = "james_final")
$ErrorActionPreference = "Stop"
$env:PYTHONNOUSERSITE = 1; $env:PYTHONIOENCODING = "utf-8"; $env:FACTOR = $Factor
$PY = "tools/.venv/Scripts/python.exe"
$base = "sound/typo/voice/takes/$Set"
$w = "$base/_work"; $t = "$base/_tight"
foreach ($d in $w, $t) { if (Test-Path $d) { Remove-Item -Recurse -Force $d } }
Copy-Item -Recurse "$base/_assembled" $w
Remove-Item "$w/words_whisper.json"
& $PY -s sound/typo/voice/refine_onsets.py $w | Select-Object -First 1
& $PY -s sound/typo/voice/snap_ends.py $w | Select-Object -First 1
Copy-Item "$w/words.json" "$w/words_refined.json"
$ov = @(& $PY -s sound/typo/voice/plan_tighten.py $w)
& $PY -s tools/tighten_pauses.py $w $t --factor 0.65 --floor 0.22 @ov | Select-Object -Last 1
& $PY -s tools/insert_pause.py $t "shares|that|0.32" "types|610000|0.40" "shares|for|0.38"
& $PY -s sound/typo/voice/gap_report.py $t 0.3
& $PY -s sound/typo/voice/dropout_scan.py "$t/voice.wav"
