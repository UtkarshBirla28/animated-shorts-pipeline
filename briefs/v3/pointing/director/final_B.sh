#!/usr/bin/env bash
# DIRECTOR (pointing v3): PIPELINE_V3 stage E, the hook-B film at FINAL quality, unattended. Repo root, Git Bash.
#   bash briefs/v3/pointing/director/final_B.sh [mix wav]   (default sound/pointing/audio/mix.wav)
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; cd "$ROOT"
MIX="${1:-sound/pointing/audio/mix.wav}"; PY="tools/.venv/Scripts/python.exe"; LOG=studio/out/pointing/director
echo "[final] $(date +%H:%M:%S) tsc"; (cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json)
node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json
"$PY" -s -c "import json;t=json.load(open('briefs/v3/pointing/director/timeline_v3.json',encoding='utf-8'));json.dump([{'id':s['id'],'from':s['from'],'to':s['to']} for s in t['shots']],open('studio/out/pointing/director/shots_v3.json','w'));print('[final] total',t['total'],'notes',t['notes'])"
echo "[final] $(date +%H:%M:%S) render"
(cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality final --shots all --conc 1 --props '{"hook":"B"}' --out out/pointing_final_B/) > $LOG/final_B_render.log 2>&1
grep -h "s/frame\|done in\|not concatenating" $LOG/final_B_render.log | grep -v Failed | tail -30
test -f studio/out/pointing_final_B/pointing_final_B_final.mp4
echo "[final] $(date +%H:%M:%S) mux $MIX"
ffmpeg -v error -y -i studio/out/pointing_final_B/pointing_final_B_final.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 384k -movflags +faststart studio/out/pointing/pointing_FINAL_1080x1920.mp4
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height -of csv=p=0 studio/out/pointing/pointing_FINAL_1080x1920.mp4
echo "[final] $(date +%H:%M:%S) gates"
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 "$PY" -s tools/v3/qa_gates.py studio/out/pointing/pointing_FINAL_1080x1920.mp4 --shots=studio/out/pointing/director/shots_v3.json --words=sound/pointing/voice/words.json --out=studio/out/pointing/pointing_FINAL_gates > $LOG/final_B_gates.log 2>&1 || true
tail -45 $LOG/final_B_gates.log
echo "[final] $(date +%H:%M:%S) done"
