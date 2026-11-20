"""SCRIPT LINT (v3): check a Short's voice-over script against the playbook BEFORE any credit is spent on the voice.

Playbook: C:\\Users\\utkar\\research_notes\\ricksclips\\SCRIPT_REPORT.md section 5 (5.2 beat template, 5.4 the 15-rule
checklist, the 12-15 s answer-to-end rule) + LESSONS.md 29/30/61 + the owner's memory notes (short plain lines).
Only what can be MEASURED is checked; the rest is listed as MANUAL so a human / agent ticks it.

Usage (repo root, Git Bash):
  PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/script_lint.py <SCRIPT.md> [options]
Options:
  --section="Script 1"   lint only the part of the file under the heading that contains this text (e.g. the 3 example
                         scripts inside SCRIPT_REPORT.md section 5.6)
  --target=65            target length in seconds (default 65; the playbook's 60-75 s window, our hit's 60-65 s)
  --wps=2.67 --gap=0.25  voice pace model: words / wps + gap per sentence + stage pauses '[... ~7 s ...]' (calibrated on
                         our 4 voiced films: 2.56-2.77 w/s, see tools/v3/NOTES.md)
  --answer="fragment"    mark the answer sentence by text (legacy scripts without beat tags)
  --allow=Texas,Grapefruit   proper nouns that are fine in the voice (also read from a line "lint-allow: a, b" in the file)
  --json=<out.json>      also write the result as JSON (the decide workflow reads it)
Exit code: 0 = PASS (warnings allowed), 1 = FAIL, 2 = no script found.

SCRIPT FORMATS it reads (first match wins inside the chosen section; default section = the first "## Script..." heading):
  1. v3 / playbook table:  | s | Beat | Line |   (optional Speaker column; " / " inside a cell = a line break).
     Beat names drive the position checks: Hook, Stakes, Doubter, Escalation, Gauge, Clue, Loop line, Answer, Why,
     Twist, Payoff (anything else is free text).
  2. a fenced ``` block of lines, optionally "SPEAKER:   text" (clown v6 style); [stage notes] and trailing
     "   (notes)" are dropped.
  3. plain paragraphs (antitheft style).
  Inline beat tags work in formats 2/3 too: "... text [[answer]]" / "[[loop]]" / "[[doubter]]" / "[[payoff]]" / "[[why]]".
  Voice markup {display|spoken} is read as the spoken part.
"""
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------- pace model
# Calibrated 2026-11-19 on the 4 voiced films (James eleven_v4, real words.json durations; see tools/v3/NOTES.md):
# duration ~= words / WPS + GAP * sentences.
WPS, GAP = 2.67, 0.25
MONTHS = "january february march april may june july august september october november december".split()
WEEKDAYS = "monday tuesday wednesday thursday friday saturday sunday".split()
NUMWORDS = {
    "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
    "eighty", "ninety", "hundred", "hundreds", "thousand", "thousands", "million", "millions", "billion", "billions",
    "trillion", "dozen", "dozens", "half", "percent", "twice", "thrice",
}
UNITS = {"hour", "hours", "minute", "minutes", "second", "seconds", "day", "days", "week", "weeks", "month", "months",
         "year", "years", "mile", "miles", "ton", "tons", "dollar", "dollars", "yen", "cent", "cents", "percent", "foot",
         "feet", "inch", "inches", "metre", "metres", "meter", "meters", "kilo", "kilos", "pound", "pounds", "share",
         "shares", "time", "times"}
TITLES = {"psychologist", "professor", "dr", "doctor", "mr", "mrs", "ms", "sir", "officer", "captain", "judge",
          "president", "senator", "economist", "scientist", "researcher", "king", "queen", "prince", "lord", "lady"}
PLACES = set(x.lower() for x in """Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia
Hawaii Idaho Illinois Indiana Iowa Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi
Missouri Montana Nebraska Nevada Ohio Oklahoma Oregon Pennsylvania Tennessee Texas Utah Vermont Virginia Washington
Wisconsin Wyoming America American Americans US USA UK Britain British England English London Paris France French Germany
German Berlin Italy Rome Spain Madrid Sweden Swedish Norway Denmark Finland Netherlands Dutch Amsterdam Belgium Swiss
Switzerland Austria Poland Russia Moscow China Chinese Beijing Japan Japanese Tokyo Osaka Korea Seoul India Indian Delhi
Mumbai Bangalore Pakistan Vietnam Hanoi Thailand Bangkok Singapore Indonesia Australia Sydney Canada Toronto Mexico Brazil
Argentina Chile Peru Egypt Cairo Kenya Nigeria Africa Europe Asia Arctic Atlantic Pacific Sahara Holborn Manhattan Chicago
Boston Seattle Atlanta Dallas Houston Miami Detroit Denver Phoenix Vegas Hollywood Jersey York Carolina Dakota Hampshire
Island Rhode Mexico New North South West East United States Kingdom Petrified Forest""".split())
STARTERS = set("""so but and then at in on meet the a an his her their our my your when while even only if one every by from
with for of to as after before until yet now here's there's it it's this that these those why how what who where well soon
inside imagine picture psychologist professor dr doctor mr mrs ms sir officer captain judge president""".split())
CONNECTOR_BAD = re.compile(r"^(also|interestingly|in fact|additionally|moreover|furthermore|did you know|fun fact)\b", re.I)
CHAIN = re.compile(r"^(so|but|then|yet|and then|until|except|that's when|now)\b", re.I)
GREETING = re.compile(r"\b(hi|hey|hello|welcome|today we|in this video|did you know|subscribe|guys)\b", re.I)
CTA = re.compile(r"\b(subscribe|follow for|like and|comment below|link in|smash|hit the bell)\b", re.I)
DOUBT = re.compile(r"(\bright\?|\byou'd notice\b|\bobviously\b|\blaugh(s|ed|ing)?\b|\bmock(s|ed)?\b|\bjoke\b|\bcrazy\b|"
                   r"\binsane\b|\bnobody believed\b|\bno one believed\b|\bwon't work\b|\bcan't work\b|\bsay it will\b|"
                   r"\bget out\b|\bwhat a waste\b|\bpredict(ed|s)?\b|\b(experts?|teachers?|everyone|critics?)\b[^.?!]*\b(say|said|thought|swore|laughed)\b|"
                   r"\bthey'd never\b|\bno way\b|\bsure\?|\beasy\.|\bwrecking\b|\bridiculous\b)", re.I)
RESULT = re.compile(r"(\d[\d,.]*\s*%|\b\d+\s+(in|out of)\s+\d+\b|\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(in|out of)\s+"
                    r"(two|three|four|five|ten|a hundred|100)\b|\btimes (more|as much|out of)\b|\bnever saw\b|\bturned out\b|"
                    r"^inside\b|\bit's called\b|\bthat's when\b|\bwent up\b|\bwent down\b|\bchanged nothing\b|\bbackfired\b|"
                    r"\bvanished\b|\bunnoticed\b|\bwent unnoticed\b|\bdoubled\b|\bdisappeared\b)", re.I)
COMPARE = re.compile(r"(\bit's like\b|\blike a\b|\bimagine\b|\bever (left|seen|tried|had)\b|\bthink of\b)", re.I)
TAG_RE = re.compile(r"\[\[(\w[\w ]*)\]\]")
WORD_RE = re.compile(r"\d[\d,.]*\d%?|\d%?|[^\W\d_]+(?:['’\-][^\W\d_]+)*")


def beat_keys(b):
    b = (b or "").lower()
    return {k for k in ("hook", "stakes", "doubter", "loop", "answer", "why", "twist", "payoff", "gauge", "clue", "escalation")
            if k in b}


def norm_beat(b):
    b = (b or "").lower()
    for key in ("hook", "stakes", "doubter", "loop", "answer", "why", "twist", "payoff", "gauge", "clue", "escalation"):
        if key in b:
            return key
    return b.strip() or ""


# ---------------------------------------------------------------- reading the script out of a markdown file
def pick_section(lines, section):
    """(start, end) line indices of the block to lint."""
    def level(s):
        m = re.match(r"^(#+)\s", s)
        return len(m.group(1)) if m else 0
    start = None
    if section:
        for i, s in enumerate(lines):
            if level(s) and section.lower() in s.lower():
                start = i
                break
        if start is None:
            return None
    else:
        for i, s in enumerate(lines):
            if level(s) and re.match(r"^#+\s*(the\s+)?script\b", s, re.I):
                start = i
                break
        if start is None:
            return (0, len(lines))
    lv = level(lines[start])
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if level(lines[j]) and level(lines[j]) <= lv:
            end = j
            break
    return (start + 1, end)


def spoken(text):
    text = re.sub(r"\{([^{}|]*)\|([^{}]*)\}", r"\2", text)          # {display|spoken}
    return text


def read_units(lines, a, b):
    """-> mode, units: [{line_no, text, beat, speaker}] (one unit per source line / table cell segment)."""
    block = lines[a:b]
    # 1. table with a Line column
    for i, s in enumerate(block):
        if s.strip().startswith("|") and re.search(r"\|\s*line\s*\|", s, re.I):
            hdr = [c.strip().lower() for c in s.strip().strip("|").split("|")]
            li = hdr.index("line")
            bi = hdr.index("beat") if "beat" in hdr else None
            si = hdr.index("speaker") if "speaker" in hdr else None
            units = []
            for k in range(i + 1, len(block)):
                row = block[k].strip()
                if not row.startswith("|"):
                    if units:
                        break
                    continue
                cells = [c.strip() for c in row.strip("|").split("|")]
                if len(cells) <= li or re.fullmatch(r":?-{2,}:?", cells[li] or "-"):
                    continue
                for seg in cells[li].split(" / "):
                    seg = seg.strip()
                    if seg:
                        units.append({"line": a + k + 1, "text": spoken(seg), "beat": cells[bi] if bi is not None else "",
                                      "speaker": cells[si] if si is not None and si < len(cells) else ""})
            return "table", units
    # 2. fenced block
    fence = [i for i, s in enumerate(block) if s.strip().startswith("```")]
    if len(fence) >= 2:
        units = []
        for k in range(fence[0] + 1, fence[1]):
            s = block[k]
            if not s.strip():
                continue
            s = re.sub(r"\s{2,}\([^()]*\)\s*$", "", s)                 # trailing "   (notes)"
            m = re.match(r"^\s*([A-Z][A-Z .'\-]{0,24}):\s+(.*)$", s)
            spk, txt = (m.group(1).strip(), m.group(2)) if m else ("", s)
            pz = re.search(r"\[[^\[\]]*?~?(\d+(?:\.\d+)?)\s*s\b[^\[\]]*\]", txt)
            if pz:
                units.append({"line": a + k + 1, "text": "", "beat": "", "speaker": "", "pause": float(pz.group(1))})
            txt = re.sub(r"\[[^\[\]]*\]", lambda mm: mm.group(0) if mm.group(0).startswith("[[") else "", txt).strip()
            if not txt or re.fullmatch(r"[\W_]*", txt):
                continue
            units.append({"line": a + k + 1, "text": spoken(txt), "beat": "", "speaker": spk})
        return "code", units
    # 3. paragraphs
    units = []
    for k, s in enumerate(block):
        t = s.strip()
        if not t or t[0] in "-*|>#" or t.startswith("**") or t.lower().startswith("lint-allow"):
            continue
        t = re.sub(r"\[[^\[\]]*\]", lambda mm: mm.group(0) if mm.group(0).startswith("[[") else "", t).strip()
        if t:
            units.append({"line": a + k + 1, "text": spoken(t), "beat": "", "speaker": ""})
    return "paragraphs", units


def split_text(text):
    """Split at . ! ? (plus closing quotes) followed by space + a capital / an opening quote. '...' + lowercase stays."""
    parts, cur, i, n = [], "", 0, len(text)
    while i < n:
        ch = text[i]
        cur += ch
        if ch in ".!?":
            j = i + 1
            while j < n and text[j] in ".!?\"”’'":
                cur += text[j]
                j += 1
            k = j
            while k < n and text[k] == " ":
                k += 1
            if k > j and k < n and (text[k].isupper() or text[k] in "\"“"):
                ell = cur.rstrip("\"”’'").endswith("...") or cur.rstrip("\"”’'").endswith("…")
                if not (ell and not text[k].isupper()):
                    parts.append(cur)
                    cur = ""
                    i = k
                    continue
            i = j
            continue
        i += 1
    if cur.strip():
        parts.append(cur)
    return parts


def split_sentences(units):
    """Sentence objects with source line, beat tag, word list. '...' + lowercase/digit does not end a sentence."""
    out = []
    for u in units:
        if u.get("pause"):
            if out:
                out[-1]["pause"] = out[-1].get("pause", 0) + u["pause"]
            continue
        text = u["text"]
        tags = [norm_beat(t) for t in TAG_RE.findall(text)]
        text = TAG_RE.sub("", text).strip()
        parts = split_text(text)
        # a paragraph that continues on the next source line: join later by line order (each unit already one line)
        for p in parts:
            p = p.strip()
            if not p:
                continue
            words = WORD_RE.findall(re.sub(r"[\"“”]", "", p))
            if not words:
                continue
            out.append({"line": u["line"], "text": p, "words": words, "beat": norm_beat(u["beat"]) or (tags[0] if tags else ""),
                        "beats": beat_keys(u["beat"]) | set(tags), "speaker": u["speaker"]})
    # paragraph mode: a sentence that wrapped over two source lines -> merge pieces that do not end with . ! ? :
    merged = []
    for s in out:
        if merged and not re.search(r"[.!?:…\"”']\s*$", merged[-1]["text"]) and s["text"][:1].islower():
            m = merged[-1]
            m["text"] += " " + s["text"]
            m["words"] += s["words"]
        else:
            merged.append(s)
    return merged


# ---------------------------------------------------------------- measurements
def number_mentions(sent):
    """Spoken-number mentions in one sentence: grouped runs, ratios count once; 'one' only before a unit / in a ratio."""
    text = re.sub(r"\"[^\"]*\"|“[^”]*”", lambda m: m.group(0), sent["text"])
    toks = WORD_RE.findall(text.replace("\u2019", "'"))
    low = [t.lower() for t in toks]
    hits, i = [], 0
    while i < len(toks):
        t, lt = toks[i], low[i]
        nxt = low[i + 1] if i + 1 < len(low) else ""
        is_num = bool(re.match(r"\d", t)) or lt in NUMWORDS or (lt == "one" and (nxt in UNITS or nxt in ("in", "out")))
        if lt == "half" and nxt in ("an", "a"):          # "half an hour" stays a number; "half the class" too
            is_num = True
        if is_num:
            j = i + 1
            while j < len(toks) and (re.match(r"\d", toks[j]) or low[j] in NUMWORDS or low[j] in ("and", "a", "point")
                                     and j + 1 < len(toks) and (re.match(r"\d", toks[j + 1]) or low[j + 1] in NUMWORDS)):
                j += 1
            # ratio "N in M" / "N out of M" / "N times out of M"
            if j + 1 < len(toks) and low[j] in ("in", "of") and (re.match(r"\d", toks[j + 1]) or low[j + 1] in NUMWORDS or low[j + 1] == "a"):
                j += 2 if low[j + 1] != "a" else 3
            elif j + 2 < len(toks) and low[j] == "out" and low[j + 1] == "of":
                j += 3
            elif j + 3 < len(toks) and low[j] == "times" and low[j + 1] == "out" and low[j + 2] == "of":
                j += 4
            hits.append(" ".join(toks[i:j]))
            i = j
        else:
            i += 1
    return hits


def is_stat(sent):
    t = sent["text"]
    return bool(re.search(r"\d[\d,.]*\s*%|\bpercent\b|\b\w+ (in|out of) (\d+|a hundred|hundred|four|ten)\b|\d{1,3},\d{3}|\b(million|billion|thousand)\b", t, re.I))


def years_dates(sent):
    t = sent["text"]
    found = []
    for m in re.finditer(r"(?<![\d,$£€¥.])\b(1[0-9]{3}|20[0-9]{2})s?\b(?![\d,%])", t):
        found.append(("year", m.group(0)))
    for m in re.finditer(r"\b(nineteen|twenty)[- ](oh[- ])?(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|"
                         r"eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\w-]*\b", t, re.I):
        found.append(("year", m.group(0)))
    for m in re.finditer(r"\b(" + "|".join(MONTHS) + r")\s+\d{1,2}(st|nd|rd|th)?\b", t, re.I):
        found.append(("date", m.group(0)))
    for m in re.finditer(r"\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(" + "|".join(MONTHS) + r")\b", t, re.I):
        found.append(("date", m.group(0)))
    return found


def proper_nouns(sents, allow):
    """-> list of (kind, phrase, sentence index). kind: NAME (fail) / PLACE (warn) / PROPER? (warn)."""
    cap_count = {}
    cands = []
    for si, s in enumerate(sents):
        text = re.sub(r"\"[^\"]*(\"|$)|“[^”]*(”|$)", lambda m: " " * len(m.group(0)), s["text"])   # quoted in-world text = board text
        toks = list(re.finditer(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*", text))
        first = True
        prev_end = 0
        run = []
        def flush(run):
            if run:
                cands.append((si, run[:]))
        for m in toks:
            w = m.group(0)
            between = text[prev_end:m.start()]
            starts = first or re.search(r"[.!?:;]\s*$", text[:m.start()].rstrip() + " ") is not None and between.strip() in ("", ":", ";")
            if first:
                starts = True
            first = False
            base = re.sub(r"['’]s$", "", w)
            cap = base[:1].isupper() and base not in ("I", "I'm", "I'll", "I'd", "OK")
            if cap:
                cap_count[base.lower()] = cap_count.get(base.lower(), 0) + 1
            if cap and not starts and base.lower() not in MONTHS + WEEKDAYS:
                if run and re.fullmatch(r"\s+", between):
                    run.append(base)
                else:
                    flush(run)
                    run = [base]
            elif cap and starts:
                flush(run)
                run = [] if base.lower() in STARTERS else [("^" + base)]   # sentence-initial: kept only if it joins a run or repeats
            else:
                flush(run)
                run = []
            prev_end = m.end()
        flush(run)
    out = []
    for si, run in cands:
        words = [w.lstrip("^") for w in run]
        if not words:
            continue
        if all(w.lower() in allow for w in words) or " ".join(words).lower() in allow:
            continue
        if len(run) == 1 and run[0].startswith("^"):
            w = words[0]
            if cap_count.get(w.lower(), 0) >= 2 and w.lower() not in PLACES and any(
                    re.search(r"(?<![.!?]\s)\b" + re.escape(w) + r"\b", s2["text"][1:]) for s2 in sents):
                out.append(("NAME", w, si))
            continue
        phrase = " ".join(words)
        if all(w in allow for w in [x.lower() for x in words]) or phrase.lower() in allow:
            continue
        prevword = ""
        idx = sents[si]["text"].find(words[0])
        if idx > 0:
            pw = re.findall(r"[A-Za-z]+", sents[si]["text"][:idx])
            prevword = pw[-1].lower() if pw else ""
        lw = [w.lower() for w in words]
        if prevword in TITLES or (len(words) >= 2 and not all(w in PLACES for w in lw)):
            out.append(("NAME", phrase, si))
        elif all(w in PLACES for w in lw):
            out.append(("PLACE", phrase, si))
        elif cap_count.get(lw[0], 0) >= 2:
            out.append(("NAME", phrase, si))
        elif len(words[0]) <= 4 and words[0].isupper():
            out.append(("ACRONYM", phrase, si))
        else:
            out.append(("PROPER?", phrase, si))
    return out


# ---------------------------------------------------------------- the lint
def lint(path, section=None, target=65.0, wps=WPS, gap=GAP, answer_hint=None, allow=()):
    src = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    allow = set(a.strip().lower() for a in allow if a.strip())
    for s in src:
        m = re.match(r"^\s*lint-allow:\s*(.*)$", s, re.I)
        if m:
            allow |= set(x.strip().lower() for x in m.group(1).split(",") if x.strip())
    rng = pick_section(src, section)
    if rng is None:
        return None
    mode, units = read_units(src, *rng)
    sents = split_sentences(units)
    if not sents:
        return None
    # time model
    t, times = 0.0, []
    for s in sents:
        d = len(s["words"]) / wps + gap
        times.append((t, t + d))
        t += d + s.get("pause", 0.0)
    total = t
    pos = lambda i: 100.0 * times[i][0] / total
    nwords = sum(len(s["words"]) for s in sents)
    R = []   # rows: (id, rule, status, detail)

    def row(rid, rule, status, detail):
        R.append({"id": rid, "rule": rule, "status": status, "detail": detail})

    L = lambda i: f"L{sents[i]['line']}"
    # length / pace
    lo_s, hi_s = nwords / 2.8 + gap * len(sents), nwords / 2.4 + gap * len(sents)
    need_lo, need_hi = int((target - 0.25 * len(sents) - 2) * 2.4), int((target - 0.25 * len(sents) + 2) * 2.8)
    st = "PASS" if target - 5 <= total <= target + 6 else ("WARN" if target - 8 <= total <= target + 10 else "FAIL")
    row("len", "length + pace for the target", st,
        f"{nwords} words, {len(sents)} sentences -> est {total:.1f} s at {wps} w/s + {gap} s/sentence (2.8-2.4 w/s: {lo_s:.0f}-{hi_s:.0f} s); "
        f"target {target:.0f} s (PASS {target - 5:.0f}-{target + 6:.0f} s) needs about {need_lo}-{need_hi} words")
    # 1 hook
    hook = [i for i in range(len(sents)) if i == 0 or pos(i) < 7.0 or "hook" in sents[i]["beats"]]
    probs = []
    if len(sents[0]["words"]) > 16:
        probs.append(f"first sentence {len(sents[0]['words'])} words (> 16)")
    for i in hook:
        for k, v in years_dates(sents[i]):
            probs.append(f"{k} '{v}' {L(i)}")
        if is_stat(sents[i]):
            probs.append(f"statistic in the hook {L(i)}: {number_mentions(sents[i]) or sents[i]['text'][:40]}")
        if GREETING.search(sents[i]["text"]):
            probs.append(f"greeting / 'did you know' {L(i)}")
    hook_names = [p for p in proper_nouns(sents, allow) if p[2] in hook and p[0] == "NAME"]
    probs += [f"name '{p[1]}' {L(p[2])}" for p in hook_names]
    row("1", "hook: short, no date / name / statistic", "FAIL" if probs else "PASS",
        (("; ".join(probs) + " | ") if probs else "") + f"\"{sents[0]['text'][:90]}\" ({len(sents[0]['words'])} words, {L(0)}); "
        "MANUAL: is it a strange action you can draw, reason hidden?")
    # 5 chain words
    bad = [i for i in range(1, len(sents)) if CONNECTOR_BAD.search(sents[i]["text"])]
    chain = sum(1 for i in range(1, len(sents)) if CHAIN.search(sents[i]["text"]))
    row("5", "choices / setbacks, no 'Also' / 'In fact'", "FAIL" if bad else "PASS",
        (f"banned openers at {', '.join(L(i) for i in bad)}; " if bad else "") +
        f"{chain} of {len(sents) - 1} sentences open with So / But / Then / Yet (MANUAL: does every line change something?)")
    # 6 numbers
    nums = [(i, h) for i in range(len(sents)) for h in number_mentions(sents[i])]
    stats_in_row = [i for i in range(1, len(sents)) if is_stat(sents[i]) and is_stat(sents[i - 1])]
    uniq = sorted(set(h.lower() for _, h in nums))
    st = "PASS" if len(uniq) <= 4 else "FAIL"
    if st == "PASS" and stats_in_row:
        st = "WARN"
    row("6", "at most 4 spoken numbers, never 2 statistics in a row", st,
        f"{len(uniq)} different ({len(nums)} mentions): " + ", ".join(f"'{h}' {L(i)}" for i, h in nums) +
        (f" | statistics back to back at {', '.join(L(i - 1) + '+' + L(i) for i in stats_in_row)}" if stats_in_row else ""))
    # 7 names / years
    pn = proper_nouns(sents, allow)
    yd = [(i, k, v) for i in range(len(sents)) for k, v in years_dates(sents[i])]
    names = [p for p in pn if p[0] == "NAME"]
    soft = [p for p in pn if p[0] != "NAME"]
    st = "FAIL" if names or yd else ("WARN" if soft else "PASS")
    row("7", "no real names / years in the voice", st,
        "; ".join([f"{k} '{v}' {L(i)}" for i, k, v in yd] + [f"name '{p[1]}' {L(p[2])}" for p in names] +
                  [f"{p[0].lower()} '{p[1]}' {L(p[2])}" for p in soft]) or "none found")
    # 4 doubter
    dt = [i for i in range(len(sents)) if "doubter" in sents[i]["beats"]]
    tagged = bool(dt)
    if not dt:
        dt = [i for i in range(len(sents)) if DOUBT.search(sents[i]["text"])]
    if dt:
        i = dt[0]
        st = "PASS" if pos(i) <= 30 else ("WARN" if pos(i) <= 45 else "FAIL")
        row("4", "a doubter by 30 %", st, f"{'tagged' if tagged else 'cue'} at {pos(i):.0f} % {L(i)}: \"{sents[i]['text'][:70]}\"; "
            "MANUAL: does the ending prove them wrong?")
    else:
        row("4", "a doubter by 30 %", "FAIL", "no doubter tag or cue (a character / the experts / the crowd / 'You'd notice. Right?')")
    # 10 loop line
    def clause_words(s):
        head = s["text"].split(":")[0] if ":" in s["text"][:40] else s["text"]
        return len(WORD_RE.findall(head))
    lp = [i for i in range(len(sents)) if "loop" in sents[i]["beats"]]
    tagged = bool(lp)
    if not lp:
        lp = [i for i in range(1, len(sents)) if 2 <= clause_words(sents[i]) <= 8 and
              sents[i]["speaker"].upper() in ("", "N", "NARRATOR", "NAR") and not COMPARE.search(sents[i]["text"]) and
              (sents[i]["text"].rstrip().endswith("?") or CHAIN.search(sents[i]["text"]) or
               re.match(r"^(wait|here's|and then|until|well,)", sents[i]["text"], re.I))]
    best = None
    for i in lp:
        cw = clause_words(sents[i])
        ok_len = 2 <= cw <= 6
        ok_pos = 40 <= pos(i) <= 65
        tx = sents[i]["text"].strip()
        strong = tx.endswith("?") or bool(re.match(r"^(wait|here's|but|well,|and the|until|yet)", tx, re.I))
        intro = tx.endswith(":") and not re.match(r"^here's", tx, re.I)
        score = (ok_pos and ok_len) * 3 + ok_pos * 2 + ok_len + (2 if strong else 1 if CHAIN.search(tx) else 0) - (3 if intro else 0)
        if best is None or score > best[0]:
            best = (score, i)
    if best:
        i = best[1]
        cw = clause_words(sents[i])
        st = "PASS" if 40 <= pos(i) <= 65 and 2 <= cw <= 6 else ("WARN" if 33 <= pos(i) <= 72 and cw <= 8 else "FAIL")
        row("10", "one loop line, 2-6 words, at 40-65 %", st,
            f"{'tagged' if tagged else 'best candidate'} at {pos(i):.0f} % ({cw} words) {L(i)}: \"{sents[i]['text'][:70]}\"")
    else:
        row("10", "one loop line, 2-6 words, at 40-65 %", "FAIL", "no short question / But / Wait line found")
    # 11 answer position + timing rule
    an = [i for i in range(len(sents)) if "answer" in sents[i]["beats"]]
    how = "tagged"
    if not an and answer_hint:
        an = [i for i in range(len(sents)) if answer_hint.lower() in sents[i]["text"].lower()][:1]
        how = "--answer"
    if not an:
        how = "guess"
        for i in range(len(sents)):
            plain = re.sub(r"\"[^\"]*\"|“[^”]*”", "", sents[i]["text"])
            if pos(i) > 7 and RESULT.search(plain):
                an = [i]
                break
    tw = [i for i in range(len(sents)) if "twist" in sents[i]["beats"]]
    if an:
        a0 = an[0]
        a_end = an[-1]
        if how == "tagged":                       # the answer beat = the run of consecutive Answer rows from the first
            k = a0
            while k + 1 < len(sents) and "answer" in sents[k + 1]["beats"]:
                k += 1
            a_end = k
        after = total - times[a_end][1]
        twist_soon = [i for i in tw if i > a_end and times[i][0] - times[a_end][1] <= 10.5]
        p = pos(a0)
        variant = bool(twist_soon) and 55 <= p < 60
        st = "PASS" if 60 <= p <= 75 or variant else ("WARN" if 50 <= p <= 80 else "FAIL")
        if how == "guess" and st == "FAIL":
            st = "FAIL"
        row("11", "the answer lands at 60-75 %", st,
            f"{how}: {p:.0f} % (t = {times[a0][0]:.1f} s) {L(a0)}: \"{sents[a0]['text'][:70]}\"" +
            (" (55-60 % variant: a twist follows within 10 s)" if variant else ""))
        after_tw = None
        if twist_soon:
            last_tw = max(i for i in tw if i > a_end)
            k = last_tw
            after_tw = total - times[k][1]
        st = "PASS" if after <= 15 or (after_tw is not None and after_tw <= 15) else ("WARN" if after <= 20 else "FAIL")
        row("t", "answer -> end <= 12-15 s", st,
            f"{after:.1f} s of voice after the answer beat ends ({sum(len(s['words']) for s in sents[a_end + 1:])} words)" +
            (f"; {after_tw:.1f} s after the twist" if after_tw is not None else ""))
    else:
        row("11", "the answer lands at 60-75 %", "FAIL", "no answer found: tag it ([[answer]] / a Beat cell) or pass --answer=")
        row("t", "answer -> end <= 12-15 s", "FAIL", "no answer found")
    # 12 why
    wy = [i for i in range(len(sents)) if "why" in sents[i]["beats"]]
    if not wy:
        ys = [i for i in range(len(sents)) if re.match(r"^you see\b", sents[i]["text"], re.I)]
        if ys:
            stop = next((j for j in range(ys[-1] + 1, len(sents)) if sents[j]["beats"] & {"twist", "payoff"}
                         or CHAIN.search(sents[j]["text"]) or re.match(r"^and (the|then)", sents[j]["text"], re.I)),
                        len(sents) - 1)
            wy = list(range(ys[-1], max(ys[-1] + 1, stop)))
    if wy:
        cmp_ = sum(1 for i in wy if COMPARE.search(sents[i]["text"]))
        st = "PASS" if len(wy) <= 3 and cmp_ <= 1 else "WARN"
        row("12", "the why: <= 3 sentences, <= 1 comparison", st,
            f"{len(wy)} sentences from {L(wy[0])} ({cmp_} comparison{'s' if cmp_ != 1 else ''}); MANUAL: physical, said once?")
    else:
        row("12", "the why: <= 3 sentences, <= 1 comparison", "WARN", "no Why beat / 'You see,' found")
    # 14 nothing after the payoff
    py = [i for i in range(len(sents)) if "payoff" in sents[i]["beats"]]
    last = len(sents) - 1
    if py and py[-1] < last and not all("payoff" in sents[j]["beats"] for j in range(py[-1], last + 1)):
        row("14", "nothing after the payoff", "FAIL", f"{last - py[-1]} sentence(s) after the payoff {L(py[-1])}")
    else:
        newfacts = []
        seen = set(w.lower() for s in sents[:last] for w in s["words"])
        for kind, ph, si in pn:
            if si == last and ph.split()[0].lower() not in seen:
                newfacts.append(ph)
        newfacts += [h for h in number_mentions(sents[last]) if h.split()[0].lower() not in seen]
        st = "FAIL" if CTA.search(sents[last]["text"]) else ("WARN" if newfacts else "PASS")
        row("14", "nothing after the payoff", st,
            ("call to action in the last line; " if CTA.search(sents[last]["text"]) else "") +
            (f"new name / number in the last line: {newfacts}; " if newfacts else "") +
            f"{'tagged' if py else 'last line'} {L(last)}: \"{sents[last]['text'][:80]}\"; MANUAL: ironic picture, pays off a plant?")
    # rhythm
    longs = [i for i in range(len(sents)) if len(sents[i]["words"]) > 20]
    row("r", "short plain lines (<= 20 words)", "WARN" if longs else "PASS",
        (", ".join(f"{L(i)} ({len(sents[i]['words'])} w)" for i in longs) or "all sentences <= 20 words") +
        f"; mean {nwords / len(sents):.1f} words / sentence")
    for rid, rule in (("2", "hero object on screen by 1 s; the answer hidden in frame 0"), ("3", "by ~15 %: who wants what, what it costs"),
                      ("8", "one gauge the viewer can watch"), ("9", "one fair clue before the answer"),
                      ("13", "something new every 5 s, a joke every ~10 s"), ("15", "fact check every line; dramatize only inside Imagine / Picture")):
        row(rid, rule, "MANUAL", "")
    nf = sum(r["status"] == "FAIL" for r in R)
    nw = sum(r["status"] == "WARN" for r in R)
    verdict = "FAIL" if nf else "PASS"
    return {"file": str(path), "section": section, "mode": mode, "sentences": len(sents), "words": nwords,
            "est_s": round(total, 1), "target_s": target, "rows": R, "fails": nf, "warns": nw, "verdict": verdict,
            "lines": [{"line": s["line"], "pos": round(pos(i), 1), "t": round(times[i][0], 2), "words": len(s["words"]),
                       "beat": s["beat"], "speaker": s["speaker"], "text": s["text"]} for i, s in enumerate(sents)]}


def main(argv):
    opts = {a.split("=", 1)[0][2:]: (a.split("=", 1)[1] if "=" in a else "1") for a in argv if a.startswith("--")}
    files = [a for a in argv if not a.startswith("--")]
    if not files:
        sys.exit(__doc__)
    res = lint(files[0], opts.get("section"), float(opts.get("target", 65)), float(opts.get("wps", WPS)),
               float(opts.get("gap", GAP)), opts.get("answer"), opts.get("allow", "").split(","))
    if res is None:
        print(f"SCRIPT LINT: no script found in {files[0]} (section {opts.get('section')!r})")
        return 2
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"SCRIPT LINT  {res['file']}" + (f"  [{res['section']}]" if res["section"] else "") +
          f"  ({res['mode']}: {res['sentences']} sentences, {res['words']} words, est {res['est_s']} s, target {res['target_s']:.0f} s)")
    for r in res["rows"]:
        print(f"  {r['id']:>4}  {r['status']:<6} {r['rule']:<46} {r['detail']}")
    print(f"VERDICT: {res['verdict']}  ({res['fails']} fail, {res['warns']} warn, "
          f"{sum(r['status'] == 'MANUAL' for r in res['rows'])} manual)")
    if "json" in opts:
        Path(opts["json"]).write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")
    return 1 if res["verdict"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
