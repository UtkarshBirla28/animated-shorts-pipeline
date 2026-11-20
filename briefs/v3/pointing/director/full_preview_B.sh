#!/usr/bin/env bash
# DIRECTOR (pointing v3): PIPELINE_V3 stage C. Run from the repo root in Git Bash, ONLY after the lead relays "all saved".
#   bash briefs/v3/pointing/director/full_preview.sh [mix wav]     (default sound/pointing/audio/mix.wav)
# 1 tsc  2 clock re-check (probe json)  3 kit_render preview --shots all --conc 1  4 mux with the mix (the picture's
# 1913 f, no -shortest: the mix is 63.767 s = 1913 f)  5 copy to pointing_preview  6 qa_gates. Logs in studio/out/pointing/director/.
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; cd "$ROOT"
MIX="${1:-sound/pointing/audio/mix.wav}"
PY="tools/.venv/Scripts/python.exe"
LOG=studio/out/pointing/director
echo "[full] $(date +%H:%M:%S) tsc"; (cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json)
node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json
"$PY" -s -c "import json;t=json.load(open('briefs/v3/pointing/director/timeline_v3.json',encoding='utf-8'));json.dump([{'id':s['id'],'from':s['from'],'to':s['to']} for s in t['shots']],open('studio/out/pointing/director/shots_v3.json','w'));print('[full] total',t['total'],'notes',t['notes'])"
echo "[full] $(date +%H:%M:%S) render"
(cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots all --conc 1 --props '{"hook":"B"}' --out out/pointing_hookB/) > $LOG/full_preview_r2B_render.log 2>&1
grep -h "s/frame\|done in\|not concatenating" $LOG/full_preview_r2B_render.log | grep -v Failed | tail -30
test -f studio/out/pointing_hookB/pointing_hookB_preview.mp4
echo "[full] $(date +%H:%M:%S) mux $MIX"
ffmpeg -v error -y -i studio/out/pointing_hookB/pointing_hookB_preview.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -movflags +faststart studio/out/pointing/pointing_v3_preview_r2B.mp4
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 studio/out/pointing/pointing_v3_preview_r2B.mp4
cp studio/out/pointing/pointing_v3_preview_r2B.mp4 "pointing_preview/VIDEO_full_draft_v3_round2 (hook B).mp4"
echo "[full] $(date +%H:%M:%S) gates"
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 "$PY" -s tools/v3/qa_gates.py studio/out/pointing/pointing_v3_preview_r2B.mp4 --shots=studio/out/pointing/director/shots_v3.json --words=sound/pointing/voice/words.json --out=studio/out/pointing/pointing_v3_preview_r2B_gates > $LOG/full_preview_r2B_gates.log 2>&1 || true
tail -60 $LOG/full_preview_r2B_gates.log
echo "[full] $(date +%H:%M:%S) done"
