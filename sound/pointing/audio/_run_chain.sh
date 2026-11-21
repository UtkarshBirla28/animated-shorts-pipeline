cd /c/Users/Administrator/Desktop/POINTING_V4_HANDOVER/animated-shorts-studio
export PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
PY=tools/.venv/Scripts/python.exe
V="--voice=sound/pointing/voice_v4_opening/voice.wav --words=sound/pointing/voice_v4_opening/words.json"
$PY -s -u sound/pointing/audio/mix_v4.py --opening $V > sound/pointing/audio/_mix_opening_v4.log 2>&1
cd sound/pointing/audio
../../../tools/.venv/Scripts/python.exe -s go_check.py > _go_check.log 2>&1
../../../tools/.venv/Scripts/python.exe -s sound_gate.py --tag opening_v4 --opening > _gate_opening_v4.log 2>&1
cd ../../..
$PY -s -u sound/pointing/audio/mix.py $V > sound/pointing/audio/_mix_v4.log 2>&1
cd sound/pointing/audio
../../../tools/.venv/Scripts/python.exe -s sound_gate.py --music stem_music_v4.wav --tag v4 > _gate_music_v4.log 2>&1
echo CHAIN_DONE
