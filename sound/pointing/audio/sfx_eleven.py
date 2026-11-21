# ElevenLabs sound effects for v4 through the REST API (the key is read at run time by tools/el_api.py and is NEVER
# printed, logged or copied). SOUND's cap: 1,200 credits (lead, 2026-11-20 15:55). Before and after every paid batch:
#   (from sound/pointing/voice/)  python -s pt_credits.py sound_<label>
# usage (from the studio root):
#   python -s sound/pointing/audio/sfx_eleven.py <name> <seconds> <takes> "<prompt>" [--influence 0.5]
#   -> sound/pointing/audio/_eleven/v4/<name>_t<k>.mp3 + .wav (48 kHz stereo), one log line per take in
#      _eleven/credits_log.jsonl (prompt, seconds; never the key)
#   python -s sound/pointing/audio/sfx_eleven.py --list      the v4 takes made so far
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools"))
OUT = os.path.join(HERE, "_eleven", "v4")
LOG = os.path.join(HERE, "_eleven", "credits_log.jsonl")


def gen(name, secs, takes, prompt, influence=0.5):
    import el_api
    os.makedirs(OUT, exist_ok=True)
    made = []
    k0 = 1 + len([f for f in os.listdir(OUT) if f.startswith(name + "_t") and f.endswith(".mp3")])
    for k in range(k0, k0 + takes):
        body = json.dumps({"text": prompt, "duration_seconds": float(secs), "prompt_influence": float(influence)}).encode()
        r = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192", data=body, method="POST",
                                   headers={"xi-api-key": el_api.key(), "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(r, timeout=180) as f:
                data = f.read()
        except urllib.error.HTTPError as e:
            print(json.dumps({"error": e.code, "body": e.read().decode()[:300]}))
            break
        mp3 = os.path.join(OUT, f"{name}_t{k}.mp3")
        open(mp3, "wb").write(data)
        wav = mp3[:-4] + ".wav"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", mp3, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", wav], check=True)
        rec = dict(t=time.strftime("%Y-%m-%dT%H:%M:%S"), event="gen", who="SOUND v4", file=os.path.relpath(mp3, HERE), dur_s=secs, influence=influence, prompt=prompt)
        open(LOG, "a", encoding="utf-8").write(json.dumps(rec) + "\n")
        made.append(wav)
        print("made", os.path.relpath(wav, ROOT))
    return made


if __name__ == "__main__":
    if "--list" in sys.argv:
        for f in sorted(os.listdir(OUT)) if os.path.isdir(OUT) else []:
            print(f)
        sys.exit(0)
    av = list(sys.argv[1:])
    inf = 0.5
    if "--influence" in av:                                       # remove the flag AND its value by position (a value may equal the length)
        i = av.index("--influence")
        inf = float(av[i + 1])
        del av[i:i + 2]
    a = [x for x in av if not x.startswith("--")]
    gen(a[0], float(a[1]), int(a[2]), a[3], inf)
