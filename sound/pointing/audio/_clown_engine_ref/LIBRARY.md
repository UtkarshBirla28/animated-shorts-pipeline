# Sound libraries for 'pointing' (not copied: referenced)
- CC0 recordings: sound/clown/audio/_lib/ (63 files, sources in _sources.json; credits in CREDITS.txt)
- ElevenLabs sound-effect takes (SFX only, never voice): sound/clown/audio/_el/ (~46 MB, measured in samples_measured.json)
- samples.py loads from _lib / _el next to it: copy or link the folders you use (`cp -r ../../clown/audio/_lib .`), add
  new takes per the bible's sound events (el_sfx.py; tell the owner the credit cost first), measure them (el_measure.py).
COPIED from sound/clown/audio (generic engine): dsp.py, instruments.py, music.py, mix.py, sfx.py, sfx_gen.py, samples.py, check_audio.py, probe.py, lib_setup.py, el_sfx.py, el_measure.py, cues.md, picture_events.example.json, ASSETS.md, CREDITS.txt. Story content that MUST be replaced: the cue
lists / picture events (from the builders' sound_cues.json), music cue points (from the bible's music.changes), mix levels
per line. Run: PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/pointing/audio/mix.py
