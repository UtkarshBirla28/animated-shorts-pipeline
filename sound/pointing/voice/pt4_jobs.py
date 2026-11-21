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
import time
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


def para_text(sc, p, tag=None):
    """the MODEL text of a paragraph: its own "model_text" (another punctuation of the same words, e.g. p2's joined
    sentences) or its script "text", behind the direction tag ("" = untagged)"""
    tag = p.get("tag", sc.get("tag", "")) if tag is None else tag
    return (tag + " " if tag else "") + p.get("model_text", p["text"]).strip()


def plain(t):
    return re.sub(r"\[[^\]]*\]", "", t).strip()


def prefix(sc):
    return sc.get("prefix", "v4")


def next_free(folder):
    """the next take number in a folder (pt_gen skips an existing mp3: a new text must never land on an old take name)"""
    d = L.TAKES / folder
    nums = [int(m.group(1)) for p in d.glob("t*.mp3") for m in [re.match(r"t(\d+)\.mp3$", p.name)] if m] if d.exists() else []
    return max(nums, default=0) + 1


def r_jobs(name):
    """N takes per paragraph. A paragraph may carry "variants": [[tag, stability], ...] (cycled); else VARIANTS with the
    film tag. --start N, or (default) the next free take number of each folder."""
    sc = load()
    P = sc["paragraphs"]
    only = set(arg("--only", "").split(",")) - {""}
    n = int(arg("--takes", "3"))
    out = []
    for k, p in enumerate(P):
        if only and p["id"] not in only:
            continue
        folder = f"{prefix(sc)}_{p['id']}"
        start = int(arg("--start", "0")) or next_free(folder)
        prev = plain(P[k - 1]["text"]) if k else None
        nxt = plain(P[k + 1]["text"]) if k + 1 < len(P) else None
        bad = [c for c in ("...", "…", "—", " - ") if c in p.get("model_text", p["text"])]
        if bad:
            print(f"  !! {p['id']}: the model text holds {bad} (an ellipsis or dash gave holes and a slow read in every test)")
        for q, t in enumerate(range(start, start + n)):
            if p.get("variants"):
                tag, stab = p["variants"][q % len(p["variants"])]
                so = q // len(p["variants"])
                text = para_text(sc, p, tag)
            else:
                stab, so = VARIANTS[(t - 1) % len(VARIANTS)]
                text = para_text(sc, p)
            out.append({"folder": folder, "take": f"t{t}", "voice": JAMES, "model": L.MODEL, "text": text,
                        "stability": stab, "speed": 1.0, "seed": SEED0 + 100 * k + 10 * so + t, "prev": prev, "next": nxt,
                        "lines": [p["id"]], "role": "N", "candidate": "james", "script": prefix(sc), "round": name})
    return out


def shout_jobs(name):
    sc = load()
    only = set(arg("--only", "").split(",")) - {""}
    out = []
    for k, s in enumerate(sc.get("shouts", [])):
        if only and s["id"] not in only:
            continue
        if not s.get("voice") or s["voice"].startswith("<"):
            print(f"  !! shout {s['id']}: no voice id yet, skipped")
            continue
        folder = s.get("folder", f"{prefix(sc)}_{s['id']}")
        start = int(arg("--start", "0")) or next_free(folder)
        for q, t in enumerate(range(start, start + int(arg("--takes", "2")))):
            text = (s.get("model_tag", "") + " " if s.get("model_tag") else "") + s.get("model_text", s["text"])
            out.append({"folder": folder, "take": f"t{t}", "voice": s["voice"], "model": L.MODEL, "text": text,
                        "stability": 0.5 if q % 2 == 0 else 0.35, "speed": 1.0, "seed": SEED0 + 900 + 10 * k + t, "prev": s.get("prev"),
                        "next": None, "lines": [s["id"]], "role": s["who"], "candidate": s["who"], "script": prefix(sc), "round": name})
    return out


def build_script(groups, base, pref):
    """groups = paragraphs of script lines [(line id, speaker, text)]. Narrator lines become the paragraph text (+ "lines":
    [[id, sentences]]); a narrator line of one repeated word ("Go. Go. ... Go!") becomes the RUN (on the base script's grid);
    a non-narrator line becomes a SHOUT placed "after" the sentence before it (voice / take carried over from the base
    script's shout of the same speaker). Tag, gaps and the run grid come from the base script."""
    paras, shouts, run = [], [], None
    last = None                                     # "p<k>:<sentence>" of the last narrator sentence so far
    old_sh = {s["who"]: s for s in base.get("shouts", [])}
    for g in groups:
        pid = f"p{len(paras) + 1}"
        texts, lines, ns = [], [], 0
        for lid_, spk, text in g:
            words = [re.sub(r"[^a-z]", "", w.lower()) for w in text.split()]
            if spk == "N" and len(words) >= 3 and len(set(words)) == 1:
                R = dict(base.get("run") or {}, id=(base.get("run") or {}).get("id", "go"), line=lid_, after=last, n=len(words))
                gg = list(R.get("grid_gaps", []))
                if len(gg) != len(words) - 1:
                    print(f"  !! run line {lid_}: {len(words)} words, the base grid has {len(gg) + 1} onsets: grid cut/extended, takes / gain_db reset")
                    gg = (gg + [gg[-1] if gg else 0.3] * len(words))[:len(words) - 1]
                    R.pop("takes", None)
                    R.pop("gain_db", None)
                R["grid_gaps"] = gg
                run = R
                continue
            if spk != "N":
                o = old_sh.get(spk, {})
                shouts.append({"id": spk, "line": lid_, "who": spk, "text": text, "after": last,
                               "voice": o.get("voice", "<cast>"), **({"take": o["take"]} if o.get("take") and o.get("text") == text else {})})
                continue
            k = len(V.split_sentences(text))
            texts.append(text)
            lines.append([lid_, k])
            ns += k
            last = f"{pid}:{ns}"
        if texts:
            paras.append({"id": pid, "text": " ".join(texts), "lines": lines})
    sc = {"_doc": f"made by pt4_jobs.py import ({time.strftime('%Y-%m-%d %H:%M')}); base settings from the previous script file",
          "prefix": pref, "tag": base.get("tag", "[amused]"), "paragraphs": paras, "run": run, "shouts": shouts,
          "gaps": base.get("gaps", {"sentence": 0.15, "paragraph": 0.22, "lead_s": 0.05})}
    if not run:
        sc.pop("run")
    return sc


def import_txt(src):
    """ONE STEP from a new text to a script file the jobs / chain / build read:
      pt4_jobs.py import <lines.json> --paras "1,2,3|4,5,7,8|..." [--prefix v5] [--script <out voice json>]
          a lines file like script_v4/lines_v4.json ([{id, speaker, text}]); --paras groups line ids into paragraphs
          (default: one paragraph per run of narrator lines between blank-free shout lines is NOT guessed: give --paras)
      pt4_jobs.py import <text.txt> [--prefix v5] [--script ...]
          plain text: paragraphs separated by a blank line, ONE script line per text line, optionally "12: text" or
          "12 | text" for its line id; "SHOUT H: Signal clear!" (or "14: SHOUT H: ...") is a shout of speaker H.
    The base settings (tag, gaps, the run grid, shout voices) come from the current script file (--base, default the
    v4 file); the output never overwrites it unless --script names it. Folders become <prefix>_p1 ... (a new prefix =
    no clash with v4 takes)."""
    base_p = Path(arg("--base", str(L.HERE.parent / "script_v4" / "voice_v4.json")))
    base = V.jload(base_p) if base_p.exists() else {}
    pref = arg("--prefix", "v5")
    out_p = Path(arg("--script", str(L.HERE.parent / f"script_{pref}" / f"voice_{pref}.json")))
    if out_p.resolve() == base_p.resolve() and "--overwrite" not in sys.argv:
        sys.exit(f"refusing to overwrite the base script {base_p} (add --overwrite)")
    p = Path(src)
    groups = []
    if p.suffix.lower() == ".json":
        rows = V.jload(p)
        by = {str(r["id"]): r for r in rows}
        spec = arg("--paras", "")
        if not spec:
            sys.exit("a lines .json needs --paras \"1,2,3|4,5,7|...\" (line ids per paragraph, shouts included)")
        for grp in spec.split("|"):
            groups.append([(int(i) if i.strip().isdigit() else i.strip(), by[i.strip()].get("speaker", "N"), by[i.strip()]["text"]) for i in grp.split(",") if i.strip()])
    else:
        auto = 1
        for blk in re.split(r"\n\s*\n", p.read_text(encoding="utf-8").strip()):
            g = []
            for ln in [x.strip() for x in blk.splitlines() if x.strip()]:
                m = re.match(r"^(\d+)\s*[:|]\s*(.+)$", ln)
                lid_, body = (int(m.group(1)), m.group(2)) if m else (auto, ln)
                auto = lid_ + 1
                ms = re.match(r"SHOUT\s+(\S+)\s*:\s*(.+)", body)
                g.append((lid_, ms.group(1), ms.group(2)) if ms else (lid_, "N", body))
            groups.append(g)
    sc = build_script(groups, base, pref)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    V.jsave(out_p, sc)
    nw = sum(len(plain(q["text"]).split()) for q in sc["paragraphs"])
    print(f"wrote {out_p}: {len(sc['paragraphs'])} paragraphs ({nw} narrator words), run {'line ' + str(sc['run']['line']) + ' x' + str(sc['run']['n']) if sc.get('run') else 'none'}, "
          f"shouts {[(s['id'], s['line'], s['after'], s['voice'][:6]) for s in sc['shouts']]}")
    print(f"next: python pt4_jobs.py r1 --script {out_p} ; python pt_gen.py jobs/{pref}_r1.json --dry")


if __name__ == "__main__":
    what = sys.argv[1]
    if what == "import":
        import_txt(sys.argv[2])
        sys.exit()
    jobs = shout_jobs(what) if what.startswith("shout") else r_jobs(what)
    sc = load()
    only = set(arg("--only", "").split(",")) - {""}
    for p in sc["paragraphs"]:
        if only and p["id"] not in only:
            continue
        ss = V.split_sentences(p.get("model_text", p["text"]))
        nw = len(plain(p["text"]).split())
        print(f"  {p['id']}: {len(ss)} sentences, {nw} words, {len(para_text(sc, p))} chars  (at 3.0-3.4 w/s about {nw / 3.4:.1f}-{nw / 3.0:.1f} s of speech)")
    (L.HERE / "jobs").mkdir(exist_ok=True)
    dst = L.HERE / "jobs" / f"{prefix(sc)}_{what}.json"
    dst.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    ch = sum(len(j["text"]) for j in jobs)
    for j in jobs:
        print(f"   {j['folder']}/{j['take']}  stab {j['stability']}  seed {j['seed']}  {len(j['text'])} chars  {j['text'][:70]}")
    print(f"{dst.name}: {len(jobs)} jobs, {ch} characters -> about {round(ch * 0.36)} credits at the measured v4 rate (0.36 / char; "
          f"plan on {round(ch * 0.5)} at the 0.5 stop rule)")
