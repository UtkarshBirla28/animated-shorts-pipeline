#!/usr/bin/env bash
# saladoil A2 VOICE re-takes: b01 (hook, brisker) + b07 (the turn, brisk + punchy 'crashed'), untagged, 6 settings
cd "$(dirname "$0")/../sound/saladoil/voice/takes/james_s6"
PY="../../../../../tools/.venv/Scripts/python.exe -s"
V=QhpsGjDKZmM9qRYdMhBD; M=eleven_v4
set_args() { case $1 in t1) A="0.5 1.08 0.0";; t2) A="0.4 1.08 0.0";; t3) A="0.5 1.12 0.0";; t4) A="0.4 1.12 0.3";; t5) A="0.5 1.15 0.2";; t6) A="0.35 1.1 0.0";; esac; }
for t in t1 t2 t3 t4 t5 t6; do set_args $t
  for b in b01 b07; do
    PYTHONNOUSERSITE=1 $PY ../../../../../tools/el_api.py tts $V $M $t/$b.mp3 $t/$b.txt $A > $t/$b.json 2> $t/$b.err
  done
done
ls -la t*/*.mp3
