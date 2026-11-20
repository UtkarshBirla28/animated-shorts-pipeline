#!/usr/bin/env bash
# saladoil A1 VOICE re-takes: beats 1, 6, 7, 8 x 4 settings (t1 stab .5; t2 .4; t3 .5 style .3; t4 .4 style .3)
cd "$(dirname "$0")/../sound/saladoil/voice/takes/james_s3"
PY="../../../../../tools/.venv/Scripts/python.exe -s"
V=QhpsGjDKZmM9qRYdMhBD; M=eleven_v4
for b in b01 b06 b07 b08; do
  PYTHONNOUSERSITE=1 $PY ../../../../../tools/el_api.py tts $V $M $b.mp3 $b.txt 0.5 1.0 0.0 > $b.json 2> $b.err
  PYTHONNOUSERSITE=1 $PY ../../../../../tools/el_api.py tts $V $M t2/$b.mp3 t2/$b.txt 0.4 1.0 0.0 > t2/$b.json 2> t2/$b.err
  PYTHONNOUSERSITE=1 $PY ../../../../../tools/el_api.py tts $V $M t3/$b.mp3 t3/$b.txt 0.5 1.0 0.3 > t3/$b.json 2> t3/$b.err
  PYTHONNOUSERSITE=1 $PY ../../../../../tools/el_api.py tts $V $M t4/$b.mp3 t4/$b.txt 0.4 1.0 0.3 > t4/$b.json 2> t4/$b.err
done
ls -la *.mp3 t*/*.mp3
