# THE TIMELINE of "Why Japanese Train Drivers Point at Nothing" (script v3), for the sound.
# Nothing in the sound is placed at an absolute time. Everything hangs on three kinds of anchors that this file resolves:
#   v3_n03.s / v3_n03.e            start / end of a voice line
#   v3_n03:finger.s / .e           start / end of a word of a line   (word#2 = its 2nd occurrence in that line)
#   s07.a / s07.b                  first / last moment of a shot (v3_s07)
#   L                              the film's length;  CUT1 = s02.a (the first cut);  PULSE = one beat of the departure melody
# Sources, in this order:
#   1. the real voice:  <voice>/words_spoken.json or words.json ([{w, s, e}]) next to voice.wav -> every word is found by TEXT
#      (the lines of script_v3/voice_lines_v3.json, in film order), so a new take re-times the whole mix by itself
#   2. no v3 voice yet: the planned times of script_v3/voice_lines_v3.json (word times are estimated inside each line)
#   shots: timeline.json next to this file ({"fps":30,"total":frames,"shots":[{"id":"v3_s01","a":f,"b":f}]}) when the lead
#      exports one; otherwise the script's own cut rules (each cut is written against a word, see CUT_RULES).
# PT_VOICE=<folder> points at another voice folder (the stand-in used before the v3 voice landed).
import difflib
import json
import os
import re
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
VOICE_DIR = os.environ.get("PT_VOICE") or os.path.join(ROOT, "voice")
LINES_JSON = os.path.join(ROOT, "script_v3", "voice_lines_v3.json")
SHOTS_JSON = os.path.join(ROOT, "script_v3", "shot_outline_v3.json")
TL_JSON = os.path.join(HERE, "timeline.json")

LINES = [l for l in json.load(open(LINES_JSON, encoding="utf-8")) if l.get("in_film")]
LINES.sort(key=lambda l: l["planned_start_s"])
BYID = {l["id"]: l for l in LINES}
SPOKEN = [l for l in LINES if not l.get("wordless")]
NUM = {"1,000": "thousand", "1000": "thousand", "6": "six", "1": "one"}


def norm(w):
    w = NUM.get(w.strip().strip(".,!?:;"), w)
    return re.sub(r"[^a-z0-9']", "", w.lower())


def toks(text):
    return [t for t in (norm(x) for x in re.sub(r"\[[^\]]*\]", " ", text).split()) if t]


# ---------------------------------------------------------------- plan mode: words inside a line
def plan_words(l):
    """estimated word times inside a planned line: the line's inner pauses go to its '...' / ':' / '.' / ',' gaps in
    order, the rest of the time is shared by letter count"""
    raw = [x for x in re.sub(r"\[[^\]]*\]", " ", l["text"]).split() if norm(x)]
    s, e = float(l["planned_start_s"]), float(l["planned_end_s"])
    pauses = list(l.get("inner_pauses_s") or [])
    gaps = [0.0] * len(raw)
    order = [i for i, w in enumerate(raw[:-1]) if w.endswith("...")] + [i for i, w in enumerate(raw[:-1]) if w.endswith(":")] + \
            [i for i, w in enumerate(raw[:-1]) if w.endswith(".") and not w.endswith("...")] + [i for i, w in enumerate(raw[:-1]) if w.endswith(",")]
    if l["id"] == "v3_n11":                       # the script: 0.20 s after "You see," and 0.20 s between the sentences
        order = [i for i, w in enumerate(raw[:-1]) if w.endswith(",")] + [i for i, w in enumerate(raw[:-1]) if w.endswith(".")]
    for i, p in zip(order, pauses):
        gaps[i] = float(p)
    wt = [len(norm(w)) + 1.6 for w in raw]
    speak = max(0.05, (e - s) - sum(gaps))
    out, t = [], s
    for w, k, g in zip(raw, wt, gaps):
        d = speak * k / sum(wt)
        out.append((norm(w), round(t, 4), round(t + d, 4)))
        t += d + g
    return out


# word starts the script itself gives for the plan (section 1.2 and the time column of section 2)
PLAN_STARTS = {"v3_n01": [0.07, 0.33, 0.62, 0.84, 1.10, 1.38], "v3_n02": [1.87, 2.12, 2.42],
               "v3_n03": [3.12, 3.37, 3.58, 3.84, 4.10, 4.52, 4.72, 4.92]}
PLAN_ENDS = {("v3_n03", 4): 4.37}                 # "laugh" ends 4.37, then 0.15 s
PLAN_WORD_START = {("v3_d03", "closed"): 60.12, ("v3_n13", "when"): 51.09, ("v3_n13", "about"): 53.39, ("v3_n14", "back"): 57.32,
                   ("v3_k01", "check"): 62.35, ("v3_t07", "gone"): 64.59, ("v3_n12", "tested"): 46.55}
PLAN_WORD_END = {("v3_d03", "doors"): 59.12, ("v3_n13", "looking"): 50.09, ("v3_n13", "loud"): 53.09}


def plan_words_fixed(l):
    ws = [list(w) for w in plan_words(l)]
    lid = l["id"]
    if lid in PLAN_STARTS:
        st_ = PLAN_STARTS[lid]
        for i, w in enumerate(ws):
            w[1] = st_[i]
            w[2] = st_[i + 1] - 0.02 if i + 1 < len(st_) else float(l["planned_end_s"])
            if (lid, i) in PLAN_ENDS:
                w[2] = PLAN_ENDS[(lid, i)]
    for i, w in enumerate(ws):
        if (lid, w[0]) in PLAN_WORD_START:
            w[1] = PLAN_WORD_START[(lid, w[0])]
            if i:
                ws[i - 1][2] = min(ws[i - 1][2], w[1] - 0.02)
            w[2] = max(w[2], w[1] + 0.2)
        if (lid, w[0]) in PLAN_WORD_END:
            w[2] = PLAN_WORD_END[(lid, w[0])]
            if i + 1 < len(ws) and (lid, ws[i + 1][0]) not in PLAN_WORD_START:
                ws[i + 1][1] = max(ws[i + 1][1], w[2] + 0.02)
    for a, b in zip(ws, ws[1:]):                    # keep the words in order
        b[1] = max(b[1], a[1] + 0.05)
        a[2] = min(max(a[2], a[1] + 0.04), b[1])
    return [tuple(w) for w in ws]


# ---------------------------------------------------------------- voice mode: find every script word in words.json
def _voice_files(d):
    wj = next((p for p in (os.path.join(d, "words_spoken.json"), os.path.join(d, "words.json")) if os.path.exists(p)), None)
    wav = os.path.join(d, "voice.wav")
    return (wj, wav) if wj and os.path.exists(wav) else (None, None)


def _is_v3(d):
    wj, wav = _voice_files(d)
    if not wj:
        return False
    try:
        got = " ".join(norm(w["w"]) for w in json.load(open(wj, encoding="utf-8"))[:12])
    except Exception:
        return False
    return "bag is on that train" in got or os.environ.get("PT_VOICE") is not None


def _fill(ws):
    """[[token, s, e, found]] of one line: words the transcript spells differently share the time between their found neighbours"""
    idx = [k for k, w in enumerate(ws) if w[3]]
    for k, w in enumerate(ws):
        if w[3]:
            continue
        prev = max([i for i in idx if i < k], default=None)
        nxt = min([i for i in idx if i > k], default=None)
        if prev is not None and nxt is not None:
            a, b = ws[prev][2], ws[nxt][1]
            step = (b - a) / (nxt - prev - 1)
            w[1], w[2] = a + step * (k - prev - 1), a + step * (k - prev)
        elif prev is not None:
            w[1], w[2] = ws[prev][2] + 0.02 * (k - prev), ws[prev][2] + 0.02 * (k - prev) + 0.25
        else:
            w[1], w[2] = ws[nxt][1] - 0.27 * (nxt - k), ws[nxt][1] - 0.27 * (nxt - k) + 0.25
    return [(w[0], w[1], w[2]) for w in ws]


def _align(exp_tokens, actual):
    """script tokens of a stretch -> [[token, s, e, found]] from the transcript's words [{w, s, e}] (text match, in order)"""
    sm = difflib.SequenceMatcher(a=exp_tokens, b=[w["w"] for w in actual], autojunk=False)
    hit = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            hit[a + k] = b + k
    return [[tk, actual[hit[j]]["s"], actual[hit[j]]["e"], True] if j in hit else [tk, None, None, False] for j, tk in enumerate(exp_tokens)]


def voice_words(d):
    """every script word's time in the voice. With line ids in the file (words_spoken.json of the v3 build: {w, s, e, id})
    each line is matched on its own; without ids the whole script is matched against the whole transcript."""
    wj, _ = _voice_files(d)
    raw = json.load(open(wj, encoding="utf-8"))
    Wd = [dict(w=norm(x["w"]), s=float(x["s"]), e=float(x["e"]), id=x.get("id")) for x in raw if norm(x["w"])]
    words, missing, absent = {}, [], []
    if all(w["id"] for w in Wd):
        for l in SPOKEN:
            act = [w for w in Wd if w["id"] == l["id"]]
            if not act:
                absent.append(l["id"])
                continue
            ws = _align(toks(l["text"]), act)
            missing += [(l["id"], w[0]) for w in ws if not w[3]]
            if not any(w[3] for w in ws):                    # the line is there but reads differently: keep its real span
                ws = [[tk, act[0]["s"], act[-1]["e"], True] for tk in toks(l["text"])]
            words[l["id"]] = _fill(ws)
        return words, missing, absent
    exp = [(l["id"], tk) for l in SPOKEN for tk in toks(l["text"])]
    al = _align([x[1] for x in exp], Wd)
    for (lid, tk), w in zip(exp, al):
        words.setdefault(lid, []).append(w)
        if not w[3]:
            missing.append((lid, tk))
    absent = [lid for lid, ws in words.items() if not any(w[3] for w in ws)]       # a whole line not in the take
    for lid in absent:
        del words[lid]
    missing = [m for m in missing if m[0] not in absent]
    return {lid: _fill(ws) for lid, ws in words.items()}, missing, absent


# ---------------------------------------------------------------- build
SOURCE = "voice" if _is_v3(VOICE_DIR) else "plan"
MISSING, ABSENT = [], []
if SOURCE == "voice":
    WORDS, MISSING, ABSENT = voice_words(VOICE_DIR)
    VOICE_WAV = _voice_files(VOICE_DIR)[1]
else:
    WORDS = {l["id"]: plan_words_fixed(l) for l in SPOKEN}
    VOICE_WAV = None
PARTIAL = []
if SOURCE == "voice":
    # a voice that holds only part of the film (the opening build): the lines it lacks keep the PLAN's times, moved by as much
    # as the last recorded line before them moved, so the pause plan between them holds
    shift, last = 0.0, None
    for l in SPOKEN:
        lid = l["id"]
        if lid in WORDS:
            shift, last = WORDS[lid][-1][2] - float(l["planned_end_s"]), lid
        elif lid != "v3_r01" and last is not None:
            WORDS[lid] = [(w, a + shift, b + shift) for w, a, b in plan_words_fixed(l)]
            PARTIAL.append(lid)
    PLAN_SHIFT = shift
SPAN = {lid: (ws[0][1], ws[-1][2]) for lid, ws in WORDS.items()}
PHR = []                                           # the voice's own phrase list, when it has one (speaker, wordless extras)
_pj = os.path.join(VOICE_DIR, "phrases.json")
if SOURCE == "voice" and os.path.exists(_pj):
    PHR = json.load(open(_pj, encoding="utf-8"))
    for p in PHR:                                  # wordless takes that are IN the voice track (laugh, giggle) are found by id
        if p.get("id") in BYID and p["id"] not in SPAN:
            SPAN[p["id"]] = (float(p["s"]), float(p["e"]))
IN_VOICE = set(SPAN) - set(PARTIAL)                # line ids that are really in voice.wav
if SOURCE == "plan":
    IN_VOICE = set()
    for l in LINES:                                # planned places of the wordless takes and the phone replay
        SPAN.setdefault(l["id"], (float(l["planned_start_s"]), float(l["planned_end_s"])))
elif PARTIAL:
    for l in LINES:
        if l["id"] not in SPAN and l["id"] != "v3_r01":
            SPAN[l["id"]] = (float(l["planned_start_s"]) + PLAN_SHIFT, float(l["planned_end_s"]) + PLAN_SHIFT)


def W(lid, word, k=1):
    """(start, end) of the k-th occurrence of a word in a line"""
    hits = [w for w in WORDS[lid] if w[0] == norm(word)]
    if len(hits) < k:
        raise KeyError(f"word '{word}'#{k} is not in line {lid}: {[w[0] for w in WORDS[lid]]}")
    return hits[k - 1][1], hits[k - 1][2]


def s(lid):
    return SPAN[lid][0]


def e(lid):
    return SPAN[lid][1]


# ---------------------------------------------------------------- shots: the script's cut rules (section 1.2, 2, 8)
# every cut is written against the voice, exactly as the script words it; the plan's numbers are in the comments
CUT_RULES = [
    ("s01", "0"),
    ("s02", "v3_n02.e + 0.08"),                  # 3.05  in the silence after "not."
    ("s03", "v3_n03:finger.s - 0.0333"),         # 4.88  one frame before "finger"
    ("s04", "v3_t01.s - 0.10"),                  # 7.20  his laugh starts under the tail of "green!"
    ("s05", "v3_n04.s - 0.07"),                  # 8.93
    ("s06", "v3_n05.s - 0.08"),                  # 11.92
    ("s07", "v3_n06.s - 0.25"),                  # 14.75
    ("s08", "v3_n07.e"),                         # 17.95 on the end of "off..."
    ("s09", "v3_t02.e + 0.40"),                  # 21.75 the plant framing, the doors a third shut
    ("s10", "v3_t03.s - 0.245"),                 # 24.88
    ("s11", "v3_n09.s - 0.145"),                 # 27.00
    ("s12", "v3_n10.s - 0.50"),                  # 30.55
    ("s13", "v3_t05.s - 0.25"),                  # 32.75
    ("s14", "v3_t05.e + 0.33"),                  # 35.19 the pose holds 0.33 s
    ("s15", "v3_t05.e + 1.43"),                  # 36.29 (the boy's wordless shot is 1.10 s; 1.40 s if the lead takes the allowance)
    ("s16a", "v3_n11.s - 0.20"),                 # 39.39
    ("s16b", "v3_r01.s"),                        # 43.47 the phone's replay starts (0.30 s before the end of "phone.")
    ("s17", "v3_n12:tested.s"),                  # 46.55 on "tested"
    ("s18", "v3_n13:looking.e"),                 # 50.09 on the hang after "looking..."
    ("s19", "v3_n13:when.s"),                    # 51.09
    ("s20", "v3_n14.s - 0.15"),                  # 54.60
    ("s21", "v3_n14:back.s - 0.02"),             # 57.30 on "back."
    ("s22", "v3_d03.s - 0.15"),                  # 58.32 the payoff framing; "Doors..." is heard over the platform
    ("s23", "v3_k01.s - 0.08"),                  # 61.40
    ("s24", "v3_t07.s - 0.28"),                  # 63.23 frame 0's camera, 1.9 s earlier
]
END_RULE = "v3_t07.e + 0.10"                     # the film ends 0.10 s after "gone."

_NAME = re.compile(r"(v3_[a-z]\d\d)(?::([A-Za-z']+)(?:#(\d))?)?\.(s|e)|\b(s\d\d[ab]?)\.(a|b)\b")
ENV = {}                                          # extra names an expression may use (L, CUT1, PULSE, MEL ...)
SHOT = {}


def ev(expr):
    """evaluate an anchor expression to seconds"""
    if isinstance(expr, (int, float)):
        return float(expr)

    def rep(m):
        if m.group(1):
            lid, word, k, se = m.group(1), m.group(2), int(m.group(3) or 1), m.group(4)
            if word:
                a, b = W(lid, word, k)
            else:
                a, b = SPAN[lid]
            return repr(a if se == "s" else b)
        a, b = SHOT[m.group(5)]
        return repr(a if m.group(6) == "a" else b)
    return float(eval(_NAME.sub(rep, expr), {"__builtins__": {}, "min": min, "max": max, "abs": abs}, ENV))


if "v3_r01" not in SPAN:                           # the phone's replay is made in the mix: it starts 0.30 s before the end of "phone."
    _d = e("v3_t03") - s("v3_t03")
    SPAN["v3_r01"] = (e("v3_n11") - 0.30, e("v3_n11") - 0.30 + _d)

# ---------------------------------------------------------------- THE FILM'S OWN CLOCK (2026-11-20)
# film_clock.mjs runs the DIRECTOR's timeline.ts (+ the lab's tink plan + CAST's beat table) on the SAME voice this mix uses
# (its words.json stands in for words.ts, exactly what tools/gen_words_ts.py will write), so the cuts, the shared
# events (EV) and the cast's moves are the picture's, not a second copy of the rules. Cached on the film's sources.
import hashlib
import subprocess

FILM_DIR = os.path.normpath(os.path.join(ROOT, "..", "..", "studio", "src", "videos3", "pointing"))
FILM_JS = os.path.join(HERE, "film_clock.mjs")
FILM = None
FILM_ERR = None
FILM_KEY = "-"


def _film_clock():
    voice = VOICE_DIR if SOURCE == "voice" and os.path.exists(os.path.join(VOICE_DIR, "words.json")) else None
    h = hashlib.sha1()
    for dp, dn, fn in os.walk(FILM_DIR):
        dn.sort()
        for f in sorted(fn):
            if f.endswith((".ts", ".tsx")):
                p = os.path.join(dp, f)
                h.update(f"{p}:{os.path.getsize(p)}:{os.path.getmtime(p)}".encode())
    h.update(open(FILM_JS, "rb").read())
    h.update(open(os.path.join(voice, "words.json"), "rb").read() if voice else b"asis")
    key = h.hexdigest()[:12]
    cache = os.path.join(HERE, "_cache", f"film_clock_{key}.json")
    if not os.path.exists(cache):
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        tmp = cache + ".tmp"
        cmd = ["node", FILM_JS, "--out", tmp] + (["--voice", voice] if voice else [])
        r = subprocess.run(cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=170)
        if r.returncode != 0 or not os.path.exists(tmp):
            raise RuntimeError(f"film_clock.mjs failed ({r.returncode}): {r.stderr.strip()[-600:]}")
        for f in os.listdir(os.path.dirname(cache)):
            if f.startswith("film_clock_") and f.endswith(".json"):
                os.remove(os.path.join(os.path.dirname(cache), f))
        os.replace(tmp, cache)
    return json.load(open(cache, encoding="utf-8")), key


if os.environ.get("PT_NO_FILM") is None:
    try:
        FILM, FILM_KEY = _film_clock()
    except Exception as _e:                        # no node, a broken timeline.ts ...: say so loudly, fall back to the rules
        FILM_ERR = str(_e)


def EVT(name, fallback=None):
    """a shared picture event of the film's timeline.ts (EV.<name>, film seconds); the fallback when the clock is absent"""
    if FILM and name in FILM["ev"]:
        return float(FILM["ev"][name])
    if fallback is None:
        raise KeyError(f"EV.{name}: no film clock ({FILM_ERR})")
    return float(fallback)


# when a CAST move lands, in frames after its start (moves.ts / gesture.ts: PPL.gesture reaches the target `move` frames
# after its start; a call's snap reaches full stretch snapLen frames after snapAt)
_LOCK = {"point": None, "jab": 5, "urgent": 4, "guns": 5, "lunge": 5, "hook": 9, "pat": 8, "hop": 11, "capDrop": 2, "capPush": 6, "wag": 6, "press": 0, "nod": 3, "take": 3}


def beat(who, m, key):
    if not FILM or not FILM.get("beats"):
        return None
    for b in FILM["beats"]:
        if b["who"] == who and b["m"] == m and key in (b.get("at"), b.get("name")) and b.get("ok"):
            return b
    return None


def CAST(who, m, key, part="lock", fallback=None):
    """film seconds of a CAST move (cast/beats.ts resolved by the film): part = f0 (its first frame), f1, lock (the moment it
    lands), and for a call: out (the arm out on the name), ear (the hand starts back to the ear), snap (the snap at full
    stretch; the kid's copy 'late' frames behind)"""
    b = beat(who, m, key)
    if b is None:
        if fallback is None:
            raise KeyError(f"CAST {who} {m} {key}: not in the film's beats ({FILM_ERR or 'no such beat'})")
        return float(fallback)
    late = b.get("late") or 0
    if m == "call":
        c = b["call"]
        f = {"f0": b["f0"], "out": c["rise"] + 4 + (b["b"].get("riseMove") or 6) + late, "ear": c["earAt"] + late,
             "snap": c["snapAt"] + c["snapLen"] + late, "lock": c["snapAt"] + c["snapLen"] + late, "snap0": c["snapAt"] + late}[part]
    elif part == "f0":
        f = b["f0"]
    elif part == "f1":
        f = b["f1"]
    else:
        lk = _LOCK.get(m, 0)
        if m == "point":
            lk = b["b"].get("move") or 6
        if m == "capPush" or m == "capDrop":
            lk = (b["b"].get("hold") or 16) if part == "push" else _LOCK[m]
        f = b["f0"] + lk
    return f / FPS


ENV.update(EVT=EVT, CAST=CAST)

SHOT_SRC = "rules"
_cuts = [(sid, ev(rule)) for sid, rule in CUT_RULES]
_end = ev(END_RULE)
RULE_CUTS = dict(_cuts)
if FILM:
    _f = float(FILM["fps"])
    _m = {x["id"].replace("v3_", ""): x["a"] / _f for x in FILM["shots"]}
    if all(sid in _m for sid, _ in CUT_RULES):
        _cuts = [(x["id"].replace("v3_", ""), x["a"] / _f) for x in FILM["shots"]]      # the FILM's shot list (it may hold shots the rules do not: s03b)
        _end = float(FILM["total"]) / _f
        SHOT_SRC = f"the film's timeline.ts (words: {'this voice' if FILM.get('words_from') != 'words.ts' else 'its own words.ts / plan'})"
if SHOT_SRC == "rules" and os.path.exists(TL_JSON):
    _tl = json.load(open(TL_JSON, encoding="utf-8"))
    _f = float(_tl.get("fps", FPS))
    _m = {str(x.get("id", x.get("key"))).replace("v3_", ""): (x["a"] / _f, (x["b"] + (1 if x.get("inclusive", True) else 0)) / _f) for x in _tl["shots"]}
    if all(sid in _m for sid, _ in CUT_RULES):
        _cuts = [(sid, _m[sid][0]) for sid, _ in CUT_RULES]
        _end = float(_tl["total"]) / _f
        SHOT_SRC = "timeline.json"
if SOURCE == "voice" and SHOT_SRC == "rules":
    with wave.open(VOICE_WAV, "rb") as _w:
        _vd = _w.getnframes() / _w.getframerate()
    if abs(_vd - _end) < 0.5:                      # the voice file is cut to the film's length: its length is the truth
        _end = _vd
L = round(_end * FPS) / FPS                        # whole frames
TOTAL = int(round(L * FPS))
for (sid, a), (_, b) in zip(_cuts, _cuts[1:] + [("end", L)]):
    SHOT[sid] = (a, b)
CUT1 = SHOT["s02"][0]
ENV.update(L=L, CUT1=CUT1)
ORDER = [sid for sid, _ in _cuts]
PLACE = {"s01": "platB", "s02": "car", "s03": "cab", "s03b": "cab", "s04": "car", "s05": "car", "s06": "cab", "s07": "platA", "s08": "platA", "s09": "platA",
         "s10": "car", "s11": "platB", "s12": "platB", "s13": "platB", "s14": "platB", "s15": "door", "s16a": "platB", "s16b": "platB",
         "s17": "lab", "s18": "door", "s19": "lab", "s20": "door", "s21": "cabstop", "s22": "platB", "s23": "platB", "s24": "platB"}


def shot_at(t):
    for sid in ORDER:
        if SHOT[sid][0] <= t < SHOT[sid][1]:
            return sid
    return ORDER[-1]


def all_words():
    """every spoken word of the film as (line id, word, s, e), sorted (the duck keys)"""
    out = [(lid, w[0], w[1], w[2]) for lid, ws in WORDS.items() for w in ws if lid in IN_VOICE or SOURCE == "plan"]
    return sorted(out, key=lambda x: x[2])


def summary():
    rows = [f"timeline: words from {'the voice in ' + VOICE_DIR if SOURCE == 'voice' else 'the PLAN (voice_lines_v3.json)'}; shots from {SHOT_SRC}; "
            f"L = {L:.3f} s = {TOTAL} frames"]
    if FILM_ERR:
        rows.append(f"  !! THE FILM'S CLOCK COULD NOT BE READ, shots from the script's rules: {FILM_ERR}")
    if FILM:
        rows.append(f"  film clock: {FILM['word_source']}; {len(FILM.get('beats') or [])} cast beats" + (f"; cast error: {FILM['beats_err'][:200]}" if FILM.get("beats_err") else ""))
        for n in FILM.get("notes") or []:
            rows.append(f"  film timeline note: {n}")
        d = [(sid, RULE_CUTS[sid], SHOT[sid][0]) for sid in ORDER if sid in RULE_CUTS and abs(RULE_CUTS[sid] - SHOT[sid][0]) > 0.5 / FPS]
        new = [sid for sid in ORDER if sid not in RULE_CUTS]
        if new:
            rows.append("  shots of the film that the old rules do not have: " + ", ".join(f"{sid} {SHOT[sid][0]:.3f}-{SHOT[sid][1]:.3f} ({PLACE.get(sid, '?')})" for sid in new))
        if d:
            rows.append("  cuts that differ from the sound's old copy of the rules (old -> film): " + ", ".join(f"{s} {a:.3f}->{b:.3f}" for s, a, b in d))
    if PARTIAL:
        rows.append(f"  PARTIAL VOICE: {len(IN_VOICE & set(WORDS))} lines are recorded; {len(PARTIAL)} lines keep the plan's times moved by {PLAN_SHIFT:+.3f} s: {PARTIAL[0]} .. {PARTIAL[-1]}")
    if MISSING:
        rows.append(f"  words not found by text (times shared between neighbours): {MISSING}")
    if ABSENT:
        rows.append(f"  lines not in the voice track: {ABSENT}")
    return "\n".join(rows)


if __name__ == "__main__":
    print(summary())
    for sid in ORDER:
        print(f"  {sid:4s} {SHOT[sid][0]:7.3f} - {SHOT[sid][1]:7.3f}  ({SHOT[sid][1] - SHOT[sid][0]:.2f} s)  {PLACE[sid]}")
    for l in LINES:
        if l["id"] not in SPAN:
            print(f"  {l['id']} (not in the voice track)")
            continue
        a, b = SPAN[l["id"]]
        print(f"  {l['id']} {a:7.3f} - {b:7.3f}  {l['speaker']:3s} {l['text'][:60]}")
