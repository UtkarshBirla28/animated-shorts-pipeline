"""Build OPENINGS_DATA.md tables + counts from data/*.json, data/first_sentences.json and scripts/manual_coding.json."""
import json
import statistics as st
from pathlib import Path

man = json.loads(Path("data/manifest.json").read_text())
auto = {r["slug"]: r for r in json.loads(Path("data/auto_table.json").read_text())}
fs = json.loads(Path("data/first_sentences.json").read_text(encoding="utf-8"))
mc = json.loads(Path("scripts/manual_coding.json").read_text(encoding="utf-8"))
CONFLICT3 = {"the-ancient-jar-that-warned-an-empire", "why-perfect-railroads-don-t-work", "the-job-nobody-wants-in-japan",
             "why-sailors-carried-storm-oil", "what-the-grave-bell-really-meant", "the-instinct-that-makes-you-crash",
             "levels-of-pirate-cannonballs", "why-the-second-draw-always-wins", "an-unstoppable-spear-vs-an-unbreakable-shield",
             "why-humans-can-t-pick-random-numbers", "how-one-cart-stopped-an-entire-army",
             "what-if-humans-invented-teleportation", "why-drivers-started-filming-the-road",
             "why-samurai-feared-the-flying-thunder", "every-memory-has-a-price"}
his = sorted([m for m in man if m["owner"] == "his"], key=lambda m: -m["views"])
ours = [m for m in man if m["owner"] == "ours"]
top = [m["slug"] for m in his if m["views"] >= 13_000_000]
bot = [m["slug"] for m in his if m["views"] <= 1_600_000]
mid = [m["slug"] for m in his if m["slug"] not in top + bot]
H = [m["slug"] for m in his]
O = [m["slug"] for m in ours]


def v(slug, k):
    if k in ("words3",):
        return fs[slug]["words_by_3s"]
    if k == "words5":
        return fs[slug]["words_by_5s"]
    if k == "fsw":
        return fs[slug]["n_words"]
    if k == "fse":
        return fs[slug]["end"]
    if k == "gap5":
        return fs[slug]["max_gap_0_5s"]
    if k == "cuts":
        return mc[slug]["cuts"]
    if k == "cut1":
        return mc[slug]["cut1"]
    return auto[slug][k]


def med(slugs, k):
    xs = [v(s, k) for s in slugs if v(s, k) is not None]
    return round(st.median(xs), 2) if xs else None


def rng(slugs, k):
    xs = [v(s, k) for s in slugs if v(s, k) is not None]
    return f"{min(xs):g}-{max(xs):g}" if xs else "-"


def cnt(slugs, f):
    return sum(1 for s in slugs if f(s))


fmt = lambda x: "-" if x is None else (f"{x:g}" if isinstance(x, (int, float)) else str(x))
L = []
A = L.append
A("# Openings data: the first 5 s of 24 top animated Shorts vs our 5 (hook lab, 2026-11-19)")
A("")
A("Private study. Measured by script (`hook_lab/scripts/hook_measure.py`, `first_sentence.py`, `summary.py`, "
  "`dense_sheets.py`, `build_report.py`) and coded by eye from the strips (`scripts/manual_coding.json`). "
  "Nothing was played out loud. Views from `research_notes/ricksclips/inventory_flat.txt` (19 Nov 2026). "
  "Tiers used below: **top** = 13M+ (6 videos), **bottom** = 1.6M or less (5), **mid** = the other 13.")
A("")
A("Caveats: (1) Samurai (1.0M) was about 2 days old when counted, so it is a weak 'bottom' case. (2) The rat-tail "
  "Short is measured from `Desktop/hanoirats/preview2.mp4` (540x960 preview); the uploaded final is not on this PC. "
  "(3) His old 16 have segment-level transcripts only, so their word times inside a sentence are estimated "
  "(even spacing by characters); the new 8 and ours have word times. (4) Camera speed = similarity fit on tracked "
  "features (% of frame per frame, caption band masked), the same method as LOOK_REPORT; heavy character motion can "
  "leak into it. (5) Cuts were counted by eye on 0.2-s sheets; the automatic detector over-counts on fast moves.")
A("")
A("Files: strips (0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5 s) in `strips/<slug>.jpg`; every-0.2-s cut sheets in "
  "`strips/dense/dense_01..10.jpg`; frame 0 full size in `strips/frame0/`; motion heat (frame 0 | change 0-1 s | "
  "change 1-3 s) in `strips/heat/`; per-frame numbers in `data/<slug>.json`.")
A("")
A("## 1. His 24 openings, measured (sorted by views)")
A("")
A("| # | Short | views | first sentence (words, ends s) | type | words by 3 s / 5 s | max voice gap 0-5 s | "
  "first sound / voice onset s | cuts 0-5 s (first) | cam %/f 0-1 / 1-3 s | px changing 0-1 s | frame-0 L* / chroma |")
A("|---|---|---|---|---|---|---|---|---|---|---|---|")
for i, m in enumerate(his, 1):
    s = m["slug"]
    a, f, c = auto[s], fs[s], mc[s]
    A(f"| {i} | {m['title']} | {m['views'] / 1e6:g}M | \"{f['text']}\" ({f['n_words']}, {f['end']:.1f}) | {c['type']} | "
      f"{f['words_by_3s']} / {f['words_by_5s']} | {f['max_gap_0_5s']:.2f} | {fmt(a['snd50'])} / {fmt(a['speech'])} | "
      f"{c['cuts']} ({fmt(c['cut1'])}) | {fmt(a['cam01'])} / {fmt(a['cam13'])} | {a['chg01']:.2f} | {a['L']:.0f} / {a['C']:.0f} |")
A("")
A("## 2. His 24 openings, coded by eye")
A("")
A("| # | Short | frame 0 (what is in it) | face / eyes to camera / hands | text on frame 0 | first motion (type) | "
  "2nd character or opposing force (s) | conflict by 3 s | recognisable topic | odd act visible at frame 0 | open question at 3 s |")
A("|---|---|---|---|---|---|---|---|---|---|---|")
for i, m in enumerate(his, 1):
    s = m["slug"]
    c = mc[s]
    A(f"| {i} | {m['title']} | {c['f0']} | {c['face']} / {c['eyes']} / {c['hands']} | {c['text0']} | frame 1: {c['move1']} | "
      f"{fmt(c['opp3'])}: {c['opp_what']} | {'Y' if s in CONFLICT3 else 'N'} | {c['recog']} | {c['act0']} | {c['q3']} |")
A("")
A("All 24 have pixel motion from frame 1 (0.033 s): no opening starts on a still frame. First sound (-50 dBFS) is at "
  "0.05-0.09 s in 24/24 (frame 1-3), i.e. the narrator starts on frame 0-2; the first voice is the narrator in 24/24.")
A("")
A("## 3. Our 5 openings, measured and coded")
A("")
A("| Short | views | first sentence (words, ends s) | type | words by 3 s / 5 s | max voice gap 0-5 s | first sound / voice | "
  "cuts 0-5 s | cam %/f 0-1 / 1-3 s | px changing 0-1 s | voice-bed level 0.5-3 s dBFS | frame 0 | face / eyes / hands | "
  "2nd char / force | recognisable | odd act at f0 | open question at 3 s |")
A("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for m in ours:
    s = m["slug"]
    a, f, c = auto[s], fs[s], mc[s]
    A(f"| {m['title']} | {m['views']:,} | \"{f['text']}\" ({f['n_words']}, {f['end']:.1f}) | {c['type']} | "
      f"{f['words_by_3s']} / {f['words_by_5s']} | {f['max_gap_0_5s']:.2f} | {fmt(a['snd50'])} / {fmt(a['speech'])} | "
      f"{c['cuts']} | {fmt(a['cam01'])} / {fmt(a['cam13'])} | {a['chg01']:.2f} | {a['lvl03']} | {c['f0']} | "
      f"{c['face']} / {c['eyes']} / {c['hands']} | {fmt(c['opp3'])}: {c['opp_what']} | {c['recog']} | {c['act0']} | {c['q3']} |")
A("")
A("Notes: anti-theft's first sentence by the script is \"She'd never stolen anything.\" (4 words, ends ~1.7 s); the "
  "transcriber merged the three short sentences. Salad oil's \"$150\" is the transcriber's spelling of \"150\". "
  f"His voice-bed level 0.5-3 s: median {med(H, 'lvl03')} dBFS (range {rng(H, 'lvl03')}).")
A("")
# ---- tier table
A("## 4. Top vs mid vs bottom (his) vs ours: medians and counts")
A("")
rows = [
    ("first sentence words", "fsw"), ("first sentence ends (s)", "fse"), ("words by 3 s", "words3"),
    ("words by 5 s", "words5"), ("max voice gap 0-5 s (s)", "gap5"), ("cuts 0-5 s", "cuts"), ("first cut (s)", "cut1"),
    ("camera 0-1 s (%/f)", "cam01"), ("camera 1-3 s (%/f)", "cam13"), ("px changing 0-1 s", "chg01"),
    ("px changing 1-3 s", "chg13"), ("frame-0 L*", "L"), ("frame-0 chroma", "C"), ("frame-0 L* sd (contrast)", "Lsd"),
    ("level 0.5-3 s (dBFS)", "lvl03"), ("first sound (s)", "snd50"),
]
A("| median (range) | top 6 (13-35M) | mid 13 (3.9-12M) | bottom 5 (0.15-1.6M) | all 24 his | ours 5 |")
A("|---|---|---|---|---|---|")
for name, k in rows:
    A(f"| {name} | {med(top, k)} ({rng(top, k)}) | {med(mid, k)} ({rng(mid, k)}) | {med(bot, k)} ({rng(bot, k)}) | "
      f"{med(H, k)} ({rng(H, k)}) | {med(O, k)} ({rng(O, k)}) |")


def frac(slugs, f):
    return f"{cnt(slugs, f)}/{len(slugs)}"


flags = [
    ("face in frame 0", lambda s: mc[s]["face"] == "Y"),
    ("eyes to camera in frame 0", lambda s: mc[s]["eyes"] == "Y"),
    ("hands doing something in frame 0", lambda s: mc[s]["hands"] == "Y"),
    ("odd act fully visible in frame 0", lambda s: mc[s]["act0"] == "Y"),
    ("2nd character / opposing force on screen by 3.0 s", lambda s: mc[s]["opp3"] is not None and mc[s]["opp3"] <= 3.0),
    ("conflict (rival, threat, authority, crash) on screen by 3.0 s", lambda s: s in CONFLICT3),
    ("recognisable everyday topic (Y or med)", lambda s: mc[s]["recog"] in ("Y", "med")),
    ("unfamiliar topic (N)", lambda s: mc[s]["recog"] == "N"),
    (">= 1 cut in 0-5 s", lambda s: mc[s]["cuts"] >= 1),
    (">= 2 cuts in 0-5 s", lambda s: mc[s]["cuts"] >= 2),
    ("first cut <= 2.3 s", lambda s: mc[s]["cut1"] is not None and mc[s]["cut1"] <= 2.3),
    ("camera >= 0.23 %/f in 0-1 s", lambda s: (auto[s]["cam01"] or 0) >= 0.23),
    ("camera >= 1.0 %/f in 1-3 s", lambda s: (auto[s]["cam13"] or 0) >= 1.0),
    (">= 9 words by 3 s", lambda s: fs[s]["words_by_3s"] >= 9),
    (">= 14 words by 5 s", lambda s: fs[s]["words_by_5s"] >= 14),
    ("max voice gap 0-5 s <= 0.55 s", lambda s: fs[s]["max_gap_0_5s"] <= 0.55),
    ("first sentence ends <= 5.5 s", lambda s: fs[s]["end"] <= 5.5),
    ("first sound <= 0.1 s", lambda s: auto[s]["snd50"] is not None and auto[s]["snd50"] <= 0.1),
]
A("")
A("| count | top 6 | mid 13 | bottom 5 | all 24 his | ours 5 |")
A("|---|---|---|---|---|---|")
for name, f in flags:
    A(f"| {name} | {frac(top, f)} | {frac(mid, f)} | {frac(bot, f)} | {frac(H, f)} | {frac(O, f)} |")
A("")
Path("data/_tables.md").write_text("\n".join(L), encoding="utf-8")
print("\n".join(L[-60:]))
