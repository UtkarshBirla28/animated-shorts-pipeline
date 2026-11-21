cd /c/Users/Administrator/Desktop/POINTING_V4_HANDOVER/animated-shorts-studio
export PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
PY=tools/.venv/Scripts/python.exe
$PY -s -u sound/pointing/audio/mix.py > sound/pointing/audio/_mix_v4.log 2>&1
$PY -s -u sound/pointing/audio/mix.py --opening > sound/pointing/audio/_mix_opening_v4.log 2>&1
ffmpeg -hide_banner -loglevel error -y -i sound/pointing/audio/mix_v4.wav -c:a libmp3lame -b:a 256k "pointing_preview/SOUND_v4_full_mix (draft).mp3"
ffmpeg -hide_banner -loglevel error -y -i sound/pointing/audio/opening_v4_mix.wav -c:a libmp3lame -b:a 256k "pointing_preview/SOUND_v4_opening_mix (draft).mp3"
cd sound/pointing/audio
../../../tools/.venv/Scripts/python.exe -s go_check.py --words ../voice_v4/words.json > _go_check.log 2>&1
../../../tools/.venv/Scripts/python.exe -s sound_gate.py --music stem_music_v4.wav --tag v4 > _gate_music_v4.log 2>&1
../../../tools/.venv/Scripts/python.exe -s sound_gate.py --tag opening_v4 --opening > _gate_opening_v4.log 2>&1
../../../tools/.venv/Scripts/python.exe -s sound_gate.py --tag v4 > _gate_v4.log 2>&1
echo FULL_DONE
