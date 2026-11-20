"""SCRIPT v4: assemble the narrator from the chosen CHAIN of paragraph takes (+ the shouts) -> <out>/ (default _v4/).
  python pt4_build.py [--chain takes/v4_chain.json] [--script ../script_v4/voice_v4.json] [--out _v4] [--no-whisper]

Rules (the lead's v4 method; never a time-stretch, never a pitch shift):
  - every take gets ONE gain (its speech to the dialogue target), so a paragraph keeps its own dynamics;
  - a take is cut only at SENTENCE ENDS: from the first sentence's acoustic on minus 20 ms to the last one's acoustic off
    plus its natural tail (the measured tail clamped to 40-90 ms) and a 15 ms fade;
  - inside a take the take's own pauses stay; one over the gap ceiling (0.30 s) is shortened by cutting in its quiet middle
    (10 ms crossfade); one under 0.15 s is opened by inserting room tone in its quiet middle, if it has a quiet middle;
  - between pieces the silence (acoustic off -> on) is the plan's: script "gaps": {"sentence": 0.20, "paragraph": 0.25,
    "beat_after": "<p id or p id:sentence>", "beat_s": 0.6} (beat at most 0.8 s); shouts: "after": "p2:3" (after the 3rd
    sentence of p2), "gap_before" / "gap_after" (default 0.15 s);
  - NO digital silence: the gaps are filled with room tone taken from the takes' own quiet frames (pink noise at -64 dBFS
    if the takes have none), crossfaded 20 ms into the pieces;
  - words: Whisper on each piece of the assembled track, matched in order to the script words, starts snapped to the energy
    (a word after a quiet run starts where it ends), the first / last word of a sentence pinned to its acoustic on / off.
Outputs: voice.wav (48 kHz stereo 24-bit), stems/dialogue.wav (the same audio), words.json (caption tokens = the script's
words), words_spoken.json (+ sentence id, speaker), phrases.json (one row per sentence / shout), _build.json."""
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

import pt4_lib as V
from pt4_lib import L

sys.stdout.reconfigure(encoding="utf-8")
SR, H = L.SR, L.H
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
SC = V.jload(arg("--script", str(L.HERE.parent / "script_v4" / "voice_v4.json")))
CH = V.jload(arg("--chain", str(L.TAKES / "v4_chain.json")))["best"]
OUT = L.HERE / arg("--out", "_v4")
WH = "--no-whisper" not in sys.argv
GAPS = {"sentence": 0.20, "paragraph": 0.25, "beat_s": 0.6, **SC.get("gaps", {})}
assert GAPS["beat_s"] <= V.TARGET["beat_max_s"] + 1e-9, "the held beat may be 0.8 s at most"
GAP_MIN, GAP_MAX = V.TARGET["gap_s"]
INNER_MAX = GAPS.get("inner_max", 0.20)   # a take's own pause between two sentences is kept up to this (else cut in its quiet middle)
TGT_MONO = -20.5            # = -17.5 LUFS stereo dialogue (the v3 target the mix expects)
PRE, FADE_OUT, XF = 0.020, 0.015, 0.010

# ---------------------------------------------------------------- the takes
CACHE = {}


def take(folder, name):
    key = f"{folder}/{name}"
    if key not in CACHE:
        mp3 = L.TAKES / folder / f"{name}.mp3"
        m = L.read(mp3)
        pr = V.jload(mp3.with_suffix(".p4.json"))
        g = 10 ** (pr["raw_gain_db"] / 20)               # the probe's scale (-18 LUFS whole take): its spans live there
        spk = np.concatenate([m[int(x["s"] * SR):int(x["e"] * SR)] for x in pr["sentences"]]) * g
        g2 = g * 10 ** ((TGT_MONO - L.lufs(spk)) / 20)
        CACHE[key] = {"m": m * g2, "pr": pr, "gain_db": round(20 * np.log10(g2), 2), "folder": folder, "take": name}
    return CACHE[key]


def quiet_frames(m, a, b, thr=-50):
    """contiguous quiet runs (>= 40 ms, under thr dBFS, never digital zero) of m inside [a, b] s, each with 5 ms fades"""
    if b - a < 0.05:
        return []
    seg = m[int(a * SR):int(b * SR)]
    d = L.db_frames(seg)
    out = []
    for r0, r1 in L.runs_below(d, 0, len(d), thr):
        if (r1 - r0) * H >= 0.04:
            x = seg[int(r0 * H * SR):int(r1 * H * SR) + int(0.01 * SR)].copy()
            if np.sqrt(np.mean(x ** 2)) < 1e-6:
                continue
            f = int(0.005 * SR)
            x[:f] *= np.linspace(0, 1, f)
            x[-f:] *= np.linspace(1, 0, f)
            out.append(x)
    return out


# ---------------------------------------------------------------- the pieces (runs of sentences from one take)
order = []      # [(kind, ...)] in film order
for c in CH["chain"]:
    pid = c["para"]
    for t, a, b in c["segs"]:
        order.append({"kind": "N", "para": pid, "folder": f"v4_{pid}", "take": t, "from": a, "to": b})
shouts = {s["after"]: s for s in SC.get("shouts", []) if s.get("after")}
RUN = SC.get("run")              # the "Go" run: single-word takes laid on a speeding-up onset grid (never stretched)
pieces = []
for o in order:
    tk = take(o["folder"], o["take"])
    S = tk["pr"]["sentences"]
    cur = []
    for k in range(o["from"], o["to"]):
        cur.append(k)
        here = f"{o['para']}:{k + 1}"
        if here in shouts or k == o["to"] - 1 or (RUN and here == RUN["after"]):
            pieces.append({"kind": "N", "para": o["para"], "folder": o["folder"], "take": o["take"], "ks": cur})
            cur = []
            if RUN and here == RUN["after"]:
                pieces.append({"kind": "RUN", "id": RUN["id"], "who": "N", "folder": f"v4_{RUN['id']}", "take": RUN["takes"][0], "spec": RUN})
            if here in shouts:
                s = shouts[here]
                pieces.append({"kind": "SHOUT", "id": s["id"], "who": s["who"], "folder": f"v4_{s['id']}", "take": s.get("take", "t1"), "spec": s})
SH_UNPLACED = [s["id"] for s in SC.get("shouts", []) if not s.get("after") or s["after"] not in {f"{p['para']}:{p['ks'][-1] + 1}" for p in pieces if p["kind"] == "N"}]

# ---------------------------------------------------------------- cut each piece (its own pauses fixed inside)
notes = []
def run_piece(p):
    """the Go run: each take's acoustic span (on - 10 ms .. off + its tail, <= 60 ms), placed so its ON lands on the grid;
    a word longer than its grid slot is cut short (15 ms fade) 20 ms before the next onset: a cut, never a stretch"""
    R = p["spec"]
    gaps = R["grid_gaps"]
    onsets = [0.0] + list(np.cumsum(gaps))
    segs = []
    for k, tn in enumerate(R["takes"]):
        tk = take(p["folder"], tn)
        pr = tk["pr"]
        on, off = pr["on"], pr["off"]
        tail = min(max(V.Track(tk["m"]).tail(off), 0.03), 0.06)
        x = tk["m"][int(max(0, on - 0.01) * SR):int((off + tail + FADE_OUT) * SR)].copy()
        lim = (onsets[k + 1] - onsets[k] - 0.02) if k + 1 < len(onsets) else None
        if lim is not None and len(x) / SR - 0.01 > lim:
            n = int((lim + 0.01) * SR)
            notes.append(f"Go {k + 1} ({tn}): {len(x) / SR - 0.01:.3f} s long, cut to {lim:.3f} s (its grid slot)")
            x = x[:n]
        x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
        x[-int(FADE_OUT * SR):] *= np.linspace(1, 0, int(FADE_OUT * SR))
        segs.append((onsets[k], x, min(off - on, len(x) / SR - 0.01 - FADE_OUT), tn, tk["gain_db"] + R.get("gain_db", [0] * 7)[k]))
    total = onsets[-1] + len(segs[-1][1]) / SR + 0.01
    y = np.zeros(int(total * SR) + SR // 10)
    spans, sel = [], []
    for k, (t0, x, dur, tn, g) in enumerate(segs):
        a = int(round(t0 * SR))
        gx = x * 10 ** (R.get("gain_db", [0] * 7)[k] / 20)
        y[a:a + len(gx)] += gx
        spans.append([t0 + 0.01, t0 + 0.01 + dur])
        sel.append({"text": "Go!" if k == len(segs) - 1 else "Go.", "nw": 1, "take": tn})
    p.update({"y": y, "spans": spans, "sel": sel, "cut": [], "tail_s": None, "gain_db": [round(s_[4], 2) for s_ in segs], "room": [],
              "grid_onsets": [round(o + 0.01, 3) for o in onsets], "takes": R["takes"]})


for p in pieces:
    if p["kind"] == "RUN":
        run_piece(p)
        continue
    tk = take(p["folder"], p["take"])
    m = tk["m"]
    if p["kind"] == "N":
        S = tk["pr"]["sentences"]
        sel = [S[k] for k in p["ks"]]
        on, off = sel[0]["s"], sel[-1]["e"]
        tail = min(max(sel[-1].get("tail_s") or 0.06, V.TARGET["tail_s"][0]), V.TARGET["tail_s"][1])
    else:
        pr = tk["pr"]
        on, off = pr["on"], pr["off"]
        tail = min(max(V.Track(m).tail(off), 0.04), 0.09)
        sel = [{"s": on, "e": off, "text": p["spec"]["text"], "nw": len(p["spec"]["text"].split())}]
    a, b = max(0.0, on - PRE), min(len(m) / SR, off + tail + FADE_OUT)
    y = m[int(a * SR):int(b * SR)].copy()
    y[:int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))
    y[-int(FADE_OUT * SR):] *= np.linspace(1, 0, int(FADE_OUT * SR))
    spans = [[x["s"] - a, x["e"] - a] for x in sel]            # sentence on / off inside y
    room = []
    # inner pauses: shorten > GAP_MAX, open < GAP_MIN (in the quiet middle only)
    for k in range(len(spans) - 1, 0, -1):
        e0, s1 = spans[k - 1][1], spans[k][0]
        gap = s1 - e0
        room += quiet_frames(y, e0 + 0.02, s1 - 0.02)
        mid = (e0 + s1) / 2
        if gap > INNER_MAX + 0.005:
            rm = gap - INNER_MAX
            c0, c1 = int((mid - rm / 2) * SR), int((mid + rm / 2) * SR)
            f = int(XF * SR)
            y = np.concatenate([y[:c0], y[c0:c0 + f] * np.linspace(1, 0, f) + y[c1:c1 + f] * np.linspace(0, 1, f), y[c1 + f:]])
            dt = (c1 - c0) / SR
            notes.append(f"{p.get('para', p.get('id'))}/{p['take']}: pause {gap:.3f} -> {gap - dt:.3f} s (cut in its quiet middle)")
        elif gap < GAP_MIN - 0.005 and gap > 0.06:
            add = GAP_MIN - gap
            c0 = int(mid * SR)
            seg = np.concatenate(room[-40:]) if room else np.zeros(1)
            ins = np.resize(seg, int(add * SR)) if len(seg) > 1 else np.zeros(int(add * SR))
            y = np.concatenate([y[:c0], ins, y[c0:]])
            dt = -add
            notes.append(f"{p.get('para', p.get('id'))}/{p['take']}: pause {gap:.3f} -> {GAP_MIN:.3f} s (room tone inserted)")
        else:
            dt = 0.0
        for q in range(k, len(spans)):
            spans[q][0] -= dt
            spans[q][1] -= dt
    p.update({"y": y, "spans": spans, "sel": sel, "cut": [round(a, 3), round(b, 3)], "tail_s": round(tail, 3), "gain_db": tk["gain_db"], "room": room})
    if p["kind"] == "SHOUT":
        inner = [r for r in L.runs_below(L.db_frames(y), int(0.03 / H), int((spans[0][1] - 0.03) / H)) if (r[1] - r[0]) * H > 0.25]
        if inner:
            notes.append(f"!! shout {p['id']}: a pause of {max((r[1] - r[0]) * H for r in inner):.2f} s inside it (limit 0.25)")

# ---------------------------------------------------------------- lay out with planned gaps
room_all = [x for p in pieces for x in p["room"]]
tot = sum(len(x) for x in room_all) / SR
if tot >= 0.3:
    RUNS = room_all
    lv = 20 * np.log10(np.sqrt(np.mean(np.concatenate(RUNS) ** 2)) + 1e-12)
    room_src = f"the takes' own quiet runs ({len(RUNS)} runs, {tot:.2f} s, RMS {lv:.1f} dBFS)"
else:
    w = np.random.default_rng(7).standard_normal(SR * 2)
    x = np.cumsum(w) - np.convolve(np.cumsum(w), np.ones(64) / 64, "same")
    x = x / np.sqrt(np.mean(x ** 2)) * 10 ** (-64 / 20)
    RUNS = [x]
    room_src = "pink-ish noise at -64 dBFS (the takes had no quiet runs)"


def room(n, seed):
    """overlap-add of random quiet runs (5 ms crossfades: their own fades), long enough for n samples"""
    r = np.random.default_rng(seed)
    out = np.zeros(n + SR)
    k, f = 0, int(0.005 * SR)
    while k < n:
        x = RUNS[int(r.integers(0, len(RUNS)))]
        out[k:k + len(x)] += x
        k += max(f, len(x) - f)
    return out[:n]


beat_after = GAPS.get("beat_after")
LEAD = GAPS.get("lead_s", 0.07)
t = LEAD
lay = []
for i, p in enumerate(pieces):
    if i:
        q = pieces[i - 1]
        if p["kind"] in ("SHOUT", "RUN"):
            g = p["spec"].get("gap_before", 0.15)
        elif q["kind"] == "RUN":
            g = q["spec"].get("beat_after_s", 0.5)
        elif q["kind"] == "SHOUT":
            g = q["spec"].get("gap_after", 0.15)
        elif q["para"] != p["para"]:
            g = GAPS["paragraph"]
        else:
            g = GAPS["sentence"]
        if q["kind"] == "N" and beat_after in (q["para"] + (f":{q['ks'][-1] + 1}" if ":" in str(beat_after) else ""),):
            if ":" in str(beat_after) or q["ks"][-1] == len(take(q["folder"], q["take"])["pr"]["sentences"]) - 1:
                g = GAPS["beat_s"]
        t = lay[-1]["off_abs"] + g - p["spans"][0][0]
    else:
        t = LEAD - p["spans"][0][0]
    lay.append({"p": p, "t0": t, "on_abs": t + p["spans"][0][0], "off_abs": t + p["spans"][-1][1], "gap_before": None if not i else round(g, 3)})
N = int((lay[-1]["t0"] + len(lay[-1]["p"]["y"]) / SR + 0.10) * SR)
y = np.zeros(N)
cover = np.zeros(N)
for L_ in lay:
    a = int(round(L_["t0"] * SR))
    seg = L_["p"]["y"]
    y[a:a + len(seg)] += seg
    cover[a:a + len(seg)] = 1
# room tone: full level wherever no piece sounds (20 ms crossfades), and under the pieces too (eleven_v4 takes are digitally
# clean inside their own pauses, so without it every in-take pause would be near-digital silence)
f = int(0.02 * SR)
w = np.convolve(1 - cover, np.ones(f) / f, "same")
UNDER = 10 ** (-6 / 20)          # under the pieces: 6 dB lower than in the gaps
y = y + room(N, 11) * np.clip(UNDER + (1 - UNDER) * w, 0, 1)
# peaks over -1.2 dBFS: clip-gain dips (a smooth 35 ms gain dip around each burst, no limiter), as in the v3 build
CEIL = 10 ** (-1.2 / 20)
over = np.where(np.abs(y) > CEIL)[0]
if len(over):
    gcurve = np.ones(N)
    win = int(0.035 * SR)
    for c in np.unique(over // (win // 2)):
        a0, a1 = c * (win // 2), min(N, c * (win // 2) + win // 2)
        pk_ = float(np.max(np.abs(y[a0:a1])))
        if pk_ <= CEIL:
            continue
        need = CEIL / pk_
        lo, hi = max(0, a0 - win), min(N, a1 + win)
        shape = np.ones(hi - lo)
        r = np.hanning(2 * win)
        shape[:win] = 1 - (1 - need) * r[:win][: min(win, hi - lo)] if hi - lo >= win else shape[:win]
        shape[a0 - lo:a1 - lo] = need
        shape[a1 - lo:] = 1 - (1 - need) * r[win:win + (hi - a1)]
        gcurve[lo:hi] = np.minimum(gcurve[lo:hi], shape)
    y *= gcurve
    notes.append(f"{int(np.sum(gcurve < 0.999) / (SR * 0.001))} ms of clip-gain dips (deepest {20 * np.log10(gcurve.min()):.1f} dB) for the -1.2 dBFS ceiling")

# ---------------------------------------------------------------- words
words, spoken, phr = [], [], []
y24 = resample_poly(y, 1, 2)
d = L.db_frames(y)
for n, L_ in enumerate(lay):
    p = L_["p"]
    t0 = L_["t0"]
    for q, (s_on, s_off) in enumerate(p["spans"]):
        x = p["sel"][q]
        sid = f"{p['para']}s{p['ks'][q] + 1}" if p["kind"] == "N" else p["id"]
        a_abs, b_abs = t0 + s_on, t0 + s_off
        toks = x["text"].split()
        hw = L.whisper(y24[int(max(0, a_abs - 0.06) * 24000):int((b_abs + 0.06) * 24000)]) if WH else []
        for h in hw:
            h["s"] += max(0, a_abs - 0.06)
        exp = [(L.norm_text(tk_)[:1] or ["?"])[0] for tk_ in toks]
        heard = [(L.norm_text(h["w"])[:1] or ["?"])[0] for h in hw]
        st_ = [None] * len(toks)
        for blk in SequenceMatcher(None, exp, heard, autojunk=False).get_matching_blocks():
            for k in range(blk.size):
                st_[blk.a + k] = hw[blk.b + k]["s"]
        # fill: missing starts spread by characters between known neighbours
        known = [(0, a_abs)] + [(k, s) for k, s in enumerate(st_) if s is not None and k] + [(len(toks), b_abs)]
        for k in range(len(toks)):
            if k == 0:
                st_[0] = a_abs
                continue
            if st_[k] is None:
                (ka, sa), (kb, sb) = max((u for u in known if u[0] < k), key=lambda u: u[0]), min((u for u in known if u[0] > k), key=lambda u: u[0])
                st_[k] = sa + (sb - sa) * (k - ka) / (kb - ka)
            # a word after a quiet run (>= 60 ms) starts where that run ends
            runs = [r for r in L.runs_below(d, int((st_[k - 1] + 0.05) / H), int((st_[k] + 0.30) / H)) if (r[1] - r[0]) * H >= 0.06 and r[0] * H <= st_[k] + 0.03]
            if runs:
                st_[k] = runs[-1][1] * H + 0.005
            st_[k] = max(st_[k], st_[k - 1] + 0.05)
        for k, tk_ in enumerate(toks):
            e = st_[k + 1] if k + 1 < len(toks) else b_abs
            if k + 1 < len(toks):
                rr = [r for r in L.runs_below(d, int((st_[k] + 0.03) / H), int(e / H) + 2) if (r[1] - r[0]) * H >= 0.10]
                if rr:
                    e = rr[-1][0] * H + 0.005
            words.append({"w": tk_, "s": round(st_[k], 3), "e": round(e, 3)})
            spoken.append({"w": tk_, "s": round(st_[k], 3), "e": round(e, 3), "id": sid, "speaker": "N" if p["kind"] == "N" else p["who"]})
        phr.append({"i": len(phr), "id": sid, "speaker": "N" if p["kind"] == "N" else p["who"], "para": p.get("para"), "s": round(a_abs, 3),
                    "e": round(b_abs, 3), "text": x["text"], "markup": x["text"], "take": f"{p['folder']}/{p['take']}",
                    "heard": " ".join(h["w"] for h in hw) if WH else None, "wrong": L.word_diff(x["text"], " ".join(h["w"] for h in hw)) if WH else None})

# ---------------------------------------------------------------- write
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "stems").mkdir(exist_ok=True)
st2 = np.stack([y, y], axis=1).astype(np.float32)
for dst in (OUT / "voice.wav", OUT / "stems" / "dialogue.wav"):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", str(dst)], input=st2.tobytes(), check=True)
V.jsave(OUT / "words.json", words)
V.jsave(OUT / "words_spoken.json", spoken)
V.jsave(OUT / "phrases.json", phr)
tr = V.Track(y)
S = [dict(tr.sentence(q["s"], q["e"], len(q["text"].split())), text=q["text"], id=q["id"]) for q in phr if q["speaker"] == "N"]
sm = V.summary(S)
build = {"script": arg("--script", "script_v4/voice_v4.json"), "chain": CH["chain"], "duration_s": round(N / SR, 3), "gaps_plan": GAPS,
         "room_tone": room_src, "notes": notes, "shouts_not_placed": SH_UNPLACED,
         "pieces": [{"kind": L_["p"]["kind"], "id": L_["p"].get("para", L_["p"].get("id")), "take": f"{L_['p']['folder']}/{L_['p']['take']}",
                     "sentences": [k + 1 for k in L_["p"].get("ks", [])], "cut_in_take_s": L_["p"]["cut"], "gain_db": L_["p"]["gain_db"], "tail_s": L_["p"]["tail_s"],
                     "on_s": round(L_["on_abs"], 3), "off_s": round(L_["off_abs"], 3), "gap_before_s": L_["gap_before"]} for L_ in lay],
         "narrator": sm, "gates": {k: [bool(a), b] for k, (a, b) in V.check(sm).items()}, "lufs_stereo": round(L.lufs(st2), 2), "peak": round(float(np.max(np.abs(y))), 4)}
V.jsave(OUT / "_build.json", build)
for L_ in lay:
    print(f"  {L_['on_abs']:6.2f}-{L_['off_abs']:6.2f}  {L_['p']['kind']:5s} {L_['p'].get('para', L_['p'].get('id')):4s} {L_['p']['folder']}/{L_['p']['take']} "
          f"s{[k + 1 for k in L_['p'].get('ks', [])]} gain {L_['p']['gain_db']:+.1f} dB  gap before {L_['gap_before']}")
for n_ in notes:
    print("  note:", n_)
if SH_UNPLACED:
    print("  !! shouts not placed (no / unknown 'after'):", SH_UNPLACED)
print(f"{OUT.name}: {N / SR:.3f} s, {len(words)} words, {len(phr)} phrases, {build['lufs_stereo']} LUFS stereo, peak {build['peak']}; room tone = {room_src}")
print("narrator:", {k: v for k, v in sm.items() if k != "steps"})
print("gates:", "  ".join(f"{k}: {'ok' if a else 'NO'} ({b})" for k, (a, b) in build["gates"].items()))
bad = [q for q in phr if q.get("wrong")]
print("Whisper: every sentence heard as written" if WH and not bad else ("Whisper: " + "; ".join(f"{q['id']} {q['wrong']}" for q in bad) if WH else "(no Whisper)"))
