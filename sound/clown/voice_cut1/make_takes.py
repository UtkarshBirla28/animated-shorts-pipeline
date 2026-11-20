"""Write the per-beat ElevenLabs texts (takes/<set>/bNN.txt + t2..t4/bNN.txt) from voice_build.P + eleven_build.BEATS and
generate them (James, eleven_v4). Settings (the saladoil recipe): t1 stab .5, t2 .4, t3 .5 + style .3, t4 .4 + style .3.
Untagged text except the boss's shout (LESSONS 36: tags make James whisper).
Usage: python -s make_takes.py <set> [--only=1,8] [--sets=t1,t2,t3,t4] [--dry]"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import voice_build as vb  # noqa: E402
from eleven_build import BEATS  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PY = os.path.join(ROOT, "tools", ".venv", "Scripts", "python.exe")
VOICE, MODEL = "QhpsGjDKZmM9qRYdMhBD", "eleven_v4"
SETTINGS = {"t1": (0.5, 0.0), "t2": (0.4, 0.0), "t3": (0.5, 0.3), "t4": (0.4, 0.3)}
TAG = {8: "[shouting]"}
arg = lambda n, d: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{n}=")), d)
ONLY = {int(v) for v in arg("only", "").split(",") if v}
SETS = arg("sets", "t1,t2,t3,t4").split(",")
OVERRIDE = {}   # (beat, set) -> text, for targeted re-takes
# targeted re-take sets: set name -> [(beat, take dir, text, stability, style)]
SPECS = {
    "james_v2": [
        # the ellipses gave NO pause in any v1 take: sentence breaks / dashes instead (pauses then set by insert_pause)
        (5, "t5", "He types. Six hundred and ten thousand shares. For one yen.", 0.5, 0.0),
        (5, "t6", "He types. Six hundred and ten thousand shares. For one yen.", 0.4, 0.0),
        (5, "t7", "He types. Six hundred and ten thousand shares. For one yen.", 0.5, 0.3),
        (5, "t8", "He types... six hundred and ten thousand shares... for one yen.", 0.75, 0.0),
        (1, "t5", "One typo cost a Tokyo bank forty billion yen. And it sold shares. That didn't even exist.", 0.5, 0.0),
        (1, "t6", "One typo cost a Tokyo bank forty billion yen. And it sold shares... that didn't even exist.", 0.75, 0.0),
        # the v1 'Nothing.' came out whispered (unvoiced, -28..-34 dB): standalone voiced takes, flat (high stability)
        (15, "t5", "Nothing.", 0.5, 0.0), (15, "t6", "Nothing.", 0.4, 0.0), (15, "t7", "Nothing.", 0.75, 0.0), (15, "t8", "Nothing.", 0.9, 0.0),
        (17, "t5", "Nothing.", 0.5, 0.0), (17, "t6", "Nothing.", 0.4, 0.0), (17, "t7", "Nothing.", 0.75, 0.0), (17, "t8", "Nothing.", 0.9, 0.0),
        (16, "t5", "Again.", 0.5, 0.0), (16, "t6", "Again.", 0.75, 0.0),
        # drier 'Easy mistake.' (higher stability = flatter)
        (6, "t5", "Easy mistake.", 0.75, 0.0), (6, "t6", "Easy mistake.", 0.9, 0.0), (6, "t7", "Easy mistake.", 0.75, 0.0),
    ],
}


def run_specs(name):
    base = os.path.join(HERE, "takes", name)
    total = 0
    for bn, s, t, stab, style in SPECS[name]:
        d = os.path.join(base, s)
        os.makedirs(d, exist_ok=True)
        f = os.path.join(d, f"b{bn:02d}.txt")
        open(f, "w", encoding="utf-8").write(t + "\n")
        total += len(t)
        mp3 = os.path.join(d, f"b{bn:02d}.mp3")
        if "--dry" in sys.argv or os.path.exists(mp3):
            continue
        r = subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "el_api.py"), "tts", VOICE, MODEL, mp3, f,
                            str(stab), "1.0", str(style)], capture_output=True, text=True, encoding="utf-8",
                           env={**os.environ, "PYTHONNOUSERSITE": "1"})
        print(f"b{bn:02d} {s}: {r.stdout.strip()[:120]} {r.stderr.strip()[:200]}", flush=True)
    print("characters:", total)


def text(bn, idxs):
    t = " ".join(vb.parse(vb.P[i][0])[1] for i in idxs).replace("pin up selling,", 'pin up "selling,"')
    return (TAG[bn] + " " + t) if bn in TAG else t


def main():
    if sys.argv[1] in SPECS:
        return run_specs(sys.argv[1])
    base = os.path.join(HERE, "takes", sys.argv[1])
    total = 0
    for bn, idxs in BEATS:
        if ONLY and bn not in ONLY:
            continue
        for s in SETS:
            d = base if s == "t1" else os.path.join(base, s)
            os.makedirs(d, exist_ok=True)
            t = OVERRIDE.get((bn, s), text(bn, idxs))
            f = os.path.join(d, f"b{bn:02d}.txt")
            open(f, "w", encoding="utf-8").write(t + "\n")
            total += len(t)
            if "--dry" in sys.argv:
                print(f"b{bn:02d} {s}: {t}")
                continue
            mp3 = os.path.join(d, f"b{bn:02d}.mp3")
            if os.path.exists(mp3):
                continue
            stab, style = SETTINGS[s]
            r = subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "el_api.py"), "tts", VOICE, MODEL, mp3, f,
                                str(stab), "1.0", str(style)], capture_output=True, text=True, encoding="utf-8",
                               env={**os.environ, "PYTHONNOUSERSITE": "1"})
            print(f"b{bn:02d} {s}: {r.stdout.strip()[:200]} {r.stderr.strip()[:200]}", flush=True)
    print("characters:", total)


if __name__ == "__main__":
    main()
