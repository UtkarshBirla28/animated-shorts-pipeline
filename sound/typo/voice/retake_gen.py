"""RETAKE pass (2026-11-15): a few key lines re-recorded for a more gripping read (James / eleven_v4), 22 takes.
takes/james_retake/<line>/tN.{txt,mp3,json}. Already-existing mp3s are skipped (re-runnable, never pays twice).
Usage: python -s retake_gen.py [--dry]"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PY = os.path.join(ROOT, "tools", ".venv", "Scripts", "python.exe")
VOICE, MODEL = "QhpsGjDKZmM9qRYdMhBD", "eleven_v4"
HOOK = "One typo cost a Tokyo bank forty billion yen. And it sold shares... that didn't even exist."
Q = "But how do you sell something that doesn't exist?"
CB = "And the cancel button? The exchange's own system had a bug."
LAST = "The typo took one second. The fight over it took eight years."
# line -> [(take, text, stability, style)]
SPECS = {
    "hook": [
        ("t1", HOOK.replace("forty billion", "FORTY BILLION"), 0.5, 0.0),
        ("t2", HOOK, 0.3, 0.3),
        ("t3", HOOK.replace("yen.", "yen!"), 0.4, 0.0),
        ("t4", "[intrigued] " + HOOK.replace("forty billion", "FORTY BILLION"), 0.4, 0.0),
        ("t5", HOOK, 0.3, 0.5),
    ],
    "question": [
        ("t1", Q, 0.5, 0.0),
        ("t2", Q, 0.3, 0.3),
        ("t3", Q.replace("exist?", "EXIST?"), 0.4, 0.0),
        ("t4", Q.replace("how", "HOW"), 0.3, 0.0),
        ("t5", "[curious] " + Q, 0.5, 0.0),
    ],
    "easy": [
        ("t1", "Easy mistake.", 1.0, 0.0),
        ("t2", "Easy mistake.", 0.9, 0.0),
        ("t3", "[deadpan] Easy mistake.", 0.9, 0.0),
        ("t4", "Easy mistake.", 0.75, 0.0),
    ],
    "cancelbtn": [
        ("t1", CB, 0.5, 0.0),
        ("t2", CB, 0.3, 0.3),
        ("t3", CB.replace("button?", "BUTTON?"), 0.4, 0.0),
        ("t4", CB.replace("? The", "? [wry] The"), 0.4, 0.0),
    ],
    "last": [
        ("t1", LAST, 0.5, 0.0),
        ("t2", LAST.replace("over it took", "over it... took"), 0.5, 0.0),
        ("t3", LAST.replace("eight years", "EIGHT YEARS"), 0.4, 0.0),
        ("t4", LAST, 0.3, 0.3),
    ],
}
if __name__ == "__main__":
    total = 0
    for line, specs in SPECS.items():
        d = os.path.join(HERE, "takes", "james_retake", line)
        os.makedirs(d, exist_ok=True)
        for s, t, stab, style in specs:
            f = os.path.join(d, s + ".txt")
            open(f, "w", encoding="utf-8").write(t + "\n")
            mp3 = os.path.join(d, s + ".mp3")
            if "--dry" in sys.argv or os.path.exists(mp3):
                continue
            total += len(t)
            r = subprocess.run([PY, "-s", os.path.join(ROOT, "tools", "el_api.py"), "tts", VOICE, MODEL, mp3, f,
                                str(stab), "1.0", str(style)], capture_output=True, text=True, encoding="utf-8",
                               env={**os.environ, "PYTHONNOUSERSITE": "1"})
            print(f"{line} {s}: {r.stdout.strip()[:160]} {r.stderr.strip()[:200]}", flush=True)
    print("characters sent:", total)
