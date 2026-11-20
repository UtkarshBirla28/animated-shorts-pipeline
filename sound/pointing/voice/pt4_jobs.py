"""SCRIPT v4: PARAGRAPH take plans -> jobs/v4_<round>.json (paid by pt_gen.py, which never pays for an existing take twice).

  python pt4_jobs.py r1 [--script ../script_v4/voice_v4.json] [--takes 3] [--only p2,p4] [--start 1]
  python pt4_jobs.py shouts [--script ...]
  then:  python pt_gen.py jobs/v4_r1.json --dry      (characters + the credit estimate; nothing is sent)
         python pt_credits.py v4_before_r1 ; python pt_gen.py jobs/v4_r1.json ; python pt_credits.py v4_after_r1

SCRIPT FILE (written from the lead's final text; `pt4_jobs.py import <txt>` makes it from plain text):
  {"tag": "[amused]",                                  # ONE direction tag for the whole film, put before each paragraph
   "paragraphs": [{"id": "p1", "text": "Sentence one. Sentence two. ..."}, ...],      # 3-5 sentences each
   "shouts": [{"id": "x1", "who": "driver_modern", "text": "Signal clear!", "voice": "<voice id>"}, ...]}
Plain-text import format: paragraphs separated by a blank line; a shout is a line "SHOUT <who>: <text>".

Variants per paragraph (round r1, the first settings to try; see NOTES "V4 PLAN"): A = tag + stability 0.35, B = tag +
stability 0.5, C = tag + stability 0.35 with another seed; more takes cycle through these with new seeds. eleven_v4 IGNORES
speed and has no style (measured on clown), so pace is steered by the text only. previous_text / next_text = the
neighbouring paragraphs (context, not spoken), so a paragraph is read as part of one story."""
import json
import re
import sys
from pathlib import Path

import pt_lib as L
import pt4_lib as V

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SCRIPT = Path(arg("--script", str(L.HERE.parent / "script_v4" / "voice_v4.json")))
JAMES = L.JAMES
VARIANTS = [(0.35, 0), (0.5, 0), (0.35, 1), (0.5, 1), (0.35, 2), (0.5, 2)]   # (stability, seed offset)
SEED0 = 12000


def load():
    return V.jload(SCRIPT)


def para_text(sc, p):
    tag = p.get("tag", sc.get("tag", ""))
    return (tag + " " if tag else "") + p["text"].strip()


def plain(t):
    return re.sub(r"\[[^\]]*\]", "", t).strip()


def r_jobs(name):
    sc = load()
    P = sc["paragraphs"]
    only = set(arg("--only", "").split(",")) - {""}
    n, start = int(arg("--takes", "3")), int(arg("--start", "1"))
    out = []
    for k, p in enumerate(P):
        if only and p["id"] not in only:
            continue
        prev = plain(P[k - 1]["text"]) if k else None
        nxt = plain(P[k + 1]["text"]) if k + 1 < len(P) else None
        for t in range(start, start + n):
            stab, so = VARIANTS[(t - 1) % len(VARIANTS)]
            out.append({"folder": f"v4_{p['id']}", "take": f"t{t}", "voice": JAMES, "model": L.MODEL, "text": para_text(sc, p),
                        "stability": stab, "speed": 1.0, "seed": SEED0 + 100 * k + 10 * so + t, "prev": prev, "next": nxt,
                        "lines": [p["id"]], "role": "N", "candidate": "james", "script": "v4", "round": name})
    return out


def shout_jobs(name):
    sc = load()
    out = []
    for k, s in enumerate(sc.get("shouts", [])):
        for t in range(1, int(arg("--takes", "2")) + 1):
            out.append({"folder": f"v4_{s['id']}", "take": f"t{t}", "voice": s["voice"], "model": L.MODEL, "text": s["text"],
                        "stability": 0.5 if t % 2 else 0.35, "speed": 1.0, "seed": SEED0 + 900 + 10 * k + t, "prev": s.get("prev"),
                        "next": None, "lines": [s["id"]], "role": s["who"], "candidate": s["who"], "script": "v4", "round": name})
    return out


def import_txt(txt):
    raw = Path(txt).read_text(encoding="utf-8")
    paras, shouts = [], []
    for blk in re.split(r"\n\s*\n", raw.strip()):
        lines = [ln.strip() for ln in blk.splitlines() if ln.strip()]
        body = []
        for ln in lines:
            m = re.match(r"SHOUT\s+(\S+)\s*:\s*(.+)", ln)
            if m:
                shouts.append({"id": f"x{len(shouts) + 1}", "who": m.group(1), "text": m.group(2), "voice": "<set>"})
            else:
                body.append(ln)
        if body:
            paras.append({"id": f"p{len(paras) + 1}", "text": " ".join(body)})
    sc = {"tag": "[amused]", "paragraphs": paras, "shouts": shouts}
    SCRIPT.parent.mkdir(parents=True, exist_ok=True)
    V.jsave(SCRIPT, sc)
    print("wrote", SCRIPT, len(paras), "paragraphs", len(shouts), "shouts")


if __name__ == "__main__":
    what = sys.argv[1]
    if what == "import":
        import_txt(sys.argv[2])
        sys.exit()
    jobs = shout_jobs(what) if what.startswith("shout") else r_jobs(what)
    sc = load()
    for p in sc["paragraphs"]:
        ss = V.split_sentences(p["text"])
        nw = len(plain(p["text"]).split())
        print(f"  {p['id']}: {len(ss)} sentences, {nw} words, {len(para_text(sc, p))} chars  (at 3.55 w/s about {nw / 3.55:.1f} s)")
    (L.HERE / "jobs").mkdir(exist_ok=True)
    dst = L.HERE / "jobs" / f"v4_{what}.json"
    dst.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    ch = sum(len(j["text"]) for j in jobs)
    print(f"{dst.name}: {len(jobs)} jobs, {ch} characters; eleven_v4 billed about 0.4 credits / char in this job (counter: 223 for 555 chars) "
          f"-> about {round(ch * 0.4)}-{ch} credits (the counter is the account's and lags; plan on the upper figure)")
