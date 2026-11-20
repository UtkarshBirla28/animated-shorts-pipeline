# OPTIONAL helper: ElevenLabs SOUND EFFECTS (never voice) for a sound that synthesis cannot make convincing, within the
# owner's cap of 1,200 credits for this short. The API key is read at run time by tools/el_api.py from ~/.claude.json and
# is NEVER printed, logged or written anywhere. Nothing is played: the take is saved, decoded to wav and MEASURED.
# usage: python -s el_sfx.py gen <name> <seconds> "<prompt>" [influence]     -> _el/<name>.mp3 + .wav + credits used
#        python -s el_sfx.py credits
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools")))
import el_api  # noqa: E402

OUT = os.path.join(HERE, "_el")
LOG = os.path.join(OUT, "credits.json")


def used():
    d = el_api.req("GET", "/user/subscription")
    return int(d.get("character_count", -1)), int(d.get("character_limit", -1))


def gen(name, seconds, prompt, influence=0.6):
    os.makedirs(OUT, exist_ok=True)
    before, limit = used()
    body = json.dumps({"text": prompt, "duration_seconds": float(seconds), "prompt_influence": float(influence)}).encode()
    r = urllib.request.Request(el_api.API + "/sound-generation", data=body, method="POST",
                               headers={"xi-api-key": el_api.key(), "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(r, timeout=180) as f:
            audio = f.read()
    except urllib.error.HTTPError as e:
        print("ERROR", e.code, e.read().decode()[:300])
        return
    mp3 = os.path.join(OUT, name + ".mp3")
    open(mp3, "wb").write(audio)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", mp3, "-af", "volume=-3dB", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", os.path.join(OUT, name + ".wav")], check=True)
    after, _ = used()
    log = json.load(open(LOG)) if os.path.exists(LOG) else []
    log.append({"name": name, "seconds": seconds, "prompt": prompt, "influence": influence, "credits": after - before})
    json.dump(log, open(LOG, "w"), indent=1)
    print(f"{name}: {len(audio)} bytes, credits used by this call {after - before}, total for this short {sum(x['credits'] for x in log)} of 1200")


if __name__ == "__main__":
    if sys.argv[1] == "credits":
        u, l = used()
        log = json.load(open(LOG)) if os.path.exists(LOG) else []
        print(f"account: {u} of {l} used; this short's SFX: {sum(x['credits'] for x in log)} of 1200")
    elif sys.argv[1] == "gen":
        gen(sys.argv[2], float(sys.argv[3]), sys.argv[4], float(sys.argv[5]) if len(sys.argv) > 5 else 0.6)
