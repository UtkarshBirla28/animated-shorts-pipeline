"""Character takes with the cast WINNERS: 3 more takes per role (the casting take is t1, copied in), so every
character line has >= 4 takes from its voice. Variants: the casting tag at stability 0.5 (new seed), at 0.35, and
an alternative tag.
  python make_jobs_chars2.py <role=candidate> ...   e.g. STUDENT=erby INTERVIEWER=irene ...  -> jobs/chars.json"""
import json
import shutil
import sys

import v6_lib as L
from make_jobs_chars import ROLES

ALT = {
    "STUDENT": "[excited] I own a unicycle... and a clown suit.",
    "INTERVIEWER": "[curious] Did you see anything unusual?",
    "FRIEND": "[laughs] The clown? He was amazing!",
    "HEADPHONES": "[laughs] Dude, the unicycle guy!",
    "PHONE_GUY": "[distracted] Sorry... what clown?",
}
win = dict(a.split("=") for a in sys.argv[1:])
jobs = []
for ri, (role, (lines, text, prev, nxt, cands)) in enumerate(ROLES.items()):
    if role not in win:
        continue
    name = win[role]
    vid = dict(cands)[name]
    folder = f"ch_{role.lower()}"
    dst = L.TAKES / folder
    dst.mkdir(parents=True, exist_ok=True)
    src = L.TAKES / f"cast_{role.lower()}"
    for ext in ("mp3", "json", "txt", "meta.json", "probe.json"):
        if (src / f"{name}.{ext}").exists() and not (dst / f"t1.{ext}").exists():
            shutil.copy(src / f"{name}.{ext}", dst / f"t1.{ext}")
    base = {"voice": vid, "model": L.MODEL, "speed": 1.0, "prev": " ".join(L.TEXT[i] for i in prev) or None,
            "next": " ".join(L.TEXT[i] for i in nxt) or None, "lines": lines, "role": role, "candidate": name}
    for t, tx, stab in (("t2", text, 0.5), ("t3", text, 0.35), ("t4", ALT[role], 0.5)):
        assert L.word_diff(" ".join(L.TEXT[i] for i in lines), tx) == []
        jobs.append({"folder": folder, "take": t, "text": tx, "stability": stab, "seed": 8500 + 10 * ri + int(t[1:]), **base})
(L.HERE / "jobs" / "chars.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(jobs), "jobs,", sum(len(j["text"]) for j in jobs), "characters")
