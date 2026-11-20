"""Write <voice>/_v3/opening_words.json for the shot builders: the REAL word times of the opening segment (v3_n01-n03, the
laugh v3_x01, v3_d01, v3_t01) from a build that passed the hook gate.   python pt3_opening_words.py <build dir> [status]"""
import json
import sys
from pathlib import Path

import pt_lib as L

D = Path(sys.argv[1])
D = D if D.is_absolute() else L.HERE / D
status = sys.argv[2] if len(sys.argv) > 2 else "opening build"
OPEN = ["v3_n01", "v3_n02", "v3_n03", "v3_d01", "v3_t01"]
sp = [w for w in json.loads((D / "words_spoken.json").read_text(encoding="utf-8")) if w["id"] in OPEN]
ph = [p for p in json.loads((D / "phrases.json").read_text(encoding="utf-8")) if p["id"] in OPEN]
cap = [c for c in json.loads((D / "captions.json").read_text(encoding="utf-8"))["chunks"] if c["id"] in OPEN]
b = json.loads((D / "_build.json").read_text(encoding="utf-8"))
g = json.loads((D / "hook_gate.json").read_text(encoding="utf-8"))
x01 = next((e for e in b["extras"] if e["id"] == "v3_x01" and "cut1_s" in e), None)
t01 = next(u for u in b["units"] if u["line"] == "v3_t01")
F = lambda t: round(t * 30)
out = {
    "_doc": "REAL word times of the opening (lead hook) from the recorded voice. Times in seconds from frame 0, f = frame at 30 fps. "
            "Cuts follow the words (SCRIPT_v3 1.2): cut 1 in the silence after 'not.', cut 2 one frame before 'finger'.",
    "status": status, "source_build": str(D.relative_to(L.HERE.parent.parent.parent)).replace("\\", "/"),
    "takes": {u["line"]: u["take"] for u in b["units"] if u["line"] in OPEN},
    "hook_gate": {"passed": g["passed"], **g["gate"], **g["prefer"], "not_starts_s": g["not_starts_s"], "laugh_starts_s": g["laugh_starts_s"],
                  "finger_starts_s": g["finger_starts_s"], "finger_ends_s": g["finger_ends_s"], "words_started_by_3s": g["words_started_by_3s"],
                  "words_started_by_5s": g["words_started_by_5s"], "longest_gap_s": g["longest_true_silence_s"], "pauses_set_to_s": 0.15,
                  "he_is_not": g["he_is_not"]},
    "cuts": {"cut1_s": x01 and x01["cut1_s"], "cut1_f": x01 and F(x01["cut1_s"]), "cut2_s": x01 and x01["cut2_s"], "cut2_f": x01 and F(x01["cut2_s"]),
             "note": "cut 1 = 0.08 s after 'not.' ends; cut 2 = one frame before 'finger.' starts. The laugh-only take v3_x01 runs from cut 1 to cut 2, 12 dB under the narrator"},
    "laugh_x01": x01,
    "t01_laugh": {"his_own_laugh_starts_s": round(t01["on"] - t01["laugh_pre_roll_s"], 3), "first_word_s": t01["on"],
                  "note": "the tourist's laugh (his own take) starts under the tail of 'green!'; 'He's' starts at first_word_s"},
    "lines": [{"id": p["id"], "speaker": p["speaker"], "s": p["s"], "e": p["e"], "f": F(p["s"]), "fe": F(p["e"]), "text": p["text"]} for p in ph],
    "words": [{"w": w["w"], "s": w["s"], "e": w["e"], "f": F(w["s"]), "fe": F(w["e"]), "id": w["id"]} for w in sp],
    "captions": cap,
    "opening_ends_s": sp[-1]["e"], "next_line": "v3_n04 starts 0.15 s after 'nothing!' ends",
}
(L.HERE / "_v3").mkdir(exist_ok=True)
(L.HERE / "_v3" / "opening_words.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("opening_words.json:", len(out["words"]), "words;", " ".join(f"{w['w']} {w['s']:.2f}" for w in out["words"]))
print("cuts", out["cuts"]["cut1_s"], out["cuts"]["cut2_s"], "| t01 laugh from", out["t01_laugh"]["his_own_laugh_starts_s"])
