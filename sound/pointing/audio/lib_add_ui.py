# one-off: copy six CC0 small sounds (pop, click, tick, quick whooshes) from the clown film's copy of the sound-effects
# reference library into _lib/ and record their sources. Safe to re-run.
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "clown", "audio", "_lib"))
TAKE = {"kit-pop": "ui_pop", "fs-824189-pop-in-sfx": "ui_pop_in", "kit-click": "ui_click", "fs384187": "ui_tick",
        "fs-683101-quick-woosh": "quick_woosh", "fs393811": "flick_swish"}
rows = json.load(open(os.path.join(SRC, "_sources.json"), encoding="utf-8"))
p = os.path.join(HERE, "_lib", "_sources.json")
mine = json.load(open(p, encoding="utf-8"))
for r in rows:
    if r["file"] in TAKE:
        nm = TAKE[r["file"]]
        shutil.copyfile(os.path.join(SRC, r["file"] + ".wav"), os.path.join(HERE, "_lib", nm + ".wav"))
        mine = [m for m in mine if m["file"] != nm]
        mine.append(dict(file=nm, title=r["library_path"], author=r["author"], source=r["source"], licence="CC0 1.0",
                         licence_url="https://creativecommons.org/publicdomain/zero/1.0/",
                         note="from the sound-effects reference library (the copy the clown film used), 48 kHz WAV", use=r["use"]))
json.dump(mine, open(p, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(mine), "sources")
