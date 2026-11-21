"""After install: phrase edges = their first / last word (by token count in P order), voice_info stats = the final file.
Usage: python -s finalize_info.py [<voice dir>]"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import voice_build as vb  # noqa: E402

d = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE
w = json.loads((d / "words.json").read_text(encoding="utf-8"))
ph = json.loads((d / "phrases.json").read_text(encoding="utf-8"))
k = 0
for p in ph:
    n = len(vb.parse(p["markup"])[0])
    seg = w[k:k + n]
    assert [x["w"] for x in seg] == [t for t, _ in vb.parse(p["markup"])[0]], (p["i"], [x["w"] for x in seg])
    p["s"], p["e"] = seg[0]["s"], seg[-1]["e"]
    k += n
assert k == len(w)
(d / "phrases.json").write_text(json.dumps(ph, ensure_ascii=False, indent=1), encoding="utf-8")
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(d / "voice.wav")],
                           capture_output=True, text=True).stdout)
vi = json.loads((d / "voice_info.json").read_text(encoding="utf-8"))
vi["stats_assembled"] = vi.pop("stats", None)
spoken = sum(len(vb.parse(p["markup"])[1].split()) for p in ph)
vi["stats"] = {"duration_s": round(dur, 2), "first_word_s": w[0]["s"], "last_word_end_s": w[-1]["e"],
               "n_display_tokens": len(w), "n_spoken_words": spoken,
               "spoken_words_per_s": round(spoken / (w[-1]["e"] - w[0]["s"]), 2)}
vi["duration_s"] = round(dur, 2)
(d / "voice_info.json").write_text(json.dumps(vi, ensure_ascii=False, indent=1), encoding="utf-8")
print(vi["stats"])
