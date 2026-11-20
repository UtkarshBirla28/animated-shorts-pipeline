# THE SCORE ENGINE v4 of "pointing" (2026-11-20, after the sound benchmark: studio/out/pointing/benchmark/BENCHMARK_sound.md).
# The clown film's method (sound/clown/audio/music.py): a SCORE of 5-7 sections, each at least 6 s with ONE steady tempo
# and a groove you can feel, music from frame 0, 16-19 LU under the voice, ending on the last word and running into the
# loop (the last bar ends exactly on the film's last sample; its reverb tail is folded onto frame 0). Never a cue per
# shot or per gesture: at most 4 hits and ONE full stop (just before the payoff line).
#
# Data, not code: a section map  [dict(name, t0, t1, bpm, style, prog, lu, ...)]  with the times read from the voice
# (score_map_v4() once SCRIPT_v4's lines exist; a 60 s test map until then), plus hits [(t, kind)] and stops [(t0, t1)].
# Styles (one tempo each; every groove is built from the same chamber band as clown: pizzicato section, upright-bass
# pizzicato doubled an octave up and lightly saturated so it reads on a phone, marimba, harp, celesta / glockenspiel,
# soft percussion: shaker, woodblock, brushes, snaps; a bowed section for the held moments):
#   bounce    playful setup: bass on 1 and 3 with a walk into each bar, offbeat pizz chords, a marimba 8th ostinato,
#             shaker 8ths, a woodblock tick, a celesta sparkle every 4 bars
#   tiptoe    mischief: staccato pizz quarters doubled by a bassoon, snaps on 2 and 4, brushes, bass on 1
#   halftime  the "why": the same tempo felt in half: bass on 1, a held string chord, harp quarters, shaker on 2 and 4,
#             a celesta question every 2 bars
#   build     into the payoff: bass 8ths, pizz 8ths, a rising marimba 16th arpeggio, shaker 16ths, a tremolo swell
# usage:  python -s score_v4.py --test [--out file.wav]     renders the 60 s test map alone (no voice) at a voice of -13.7 LUFS
import argparse
import json
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, shelf, fades, write_wav, st
import instruments as I

F = I.m2f
AIR = (5000.0, 3.0)              # high shelf on the score bus (air: the benchmark's 10-16 kHz was -17 dB, the references -9)
WARM = (220.0, 2.0)              # a low shelf: the bass line carries the 120-400 Hz warmth the mix was missing
BASS_DRIVE = (2.2, 0.45)
QUAL = {"M": (0, 4, 7), "m": (0, 3, 7), "7": (0, 4, 7, 10), "m7": (0, 3, 7, 10), "M7": (0, 4, 7, 11), "sus": (0, 5, 7), "add9": (0, 4, 7, 14),
        "dim": (0, 3, 6)}
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def chord(sym):
    """'Dm' / 'Bb' / 'A7' / 'Gm7' / 'Fadd9' -> (root pitch class, intervals)"""
    root = sym[:2] if len(sym) > 1 and sym[1] in "#b" else sym[:1]
    q = sym[len(root):] or "M"
    return NOTE[root], QUAL[q]


class Bus:
    """one instrument group: dry stereo buffer + its send to the hall"""

    def __init__(self, n, send=0.25):
        self.x = np.zeros((2, n))
        self.send = send

    def add(self, y, t, p=0.0, g=1.0):
        y = np.asarray(y, float)
        place(self.x, pan(y, p) if y.ndim == 1 else y, t, g)


def fit_bpm(dur, bpm, beats_per_bar=4, tol=0.06):
    """a section of `dur` s at about `bpm`: the tempo that fills it with whole beats (bars when possible), within tol"""
    for unit in (beats_per_bar, 2, 1):
        k = max(1, round(dur * bpm / 60.0 / unit))
        b = k * unit * 60.0 / dur
        if abs(b / bpm - 1) <= tol:
            return b
    return bpm


def render_section(sec, n, r):
    """one section -> dict of instrument buses (dry), in film time"""
    t0, t1, style = sec["t0"], sec["t1"], sec["style"]
    bpm = fit_bpm(t1 - t0, sec["bpm"]) if sec.get("fit", True) else sec["bpm"]
    sec["bpm_used"] = bpm
    b = 60.0 / bpm
    prog = sec["prog"]
    oct_ = sec.get("oct", 0)
    B = {k: Bus(n, s) for k, s in (("bass", 0.10), ("pizz", 0.22), ("mar", 0.20), ("perc", 0.12), ("sparkle", 0.35), ("pad", 0.30))}
    nbars = int(np.ceil((t1 - t0) / (4 * b) - 1e-6))
    beat = lambda k: t0 + k * b
    inside = lambda t: t0 - 1e-6 <= t < t1 - 0.02
    for bar in range(nbars):
        root, iv = chord(prog[bar % len(prog)])
        nroot, _ = chord(prog[(bar + 1) % len(prog)])
        R = 36 + root + 12 * oct_                          # bass register (C2 = 36)
        tones = [48 + root + i + 12 * oct_ for i in iv]    # mid register chord
        hi = [72 + root + i + 12 * oct_ for i in iv]
        k0 = bar * 4
        if style == "bounce":
            for k, m, ln, v in ((0, R, 0.42, 0.80), (1.5, R + 7, 0.20, 0.50), (2, R, 0.40, 0.72), (3.5, 36 + nroot + 12 * oct_ - 1, 0.18, 0.55)):
                if inside(beat(k0 + k)):
                    B["bass"].add(I.bass_pizz(F(m), v, r, length=ln * b * 2), beat(k0 + k), 0.0)
            for k in (0.5, 1.5, 2.5, 3.5):
                if inside(beat(k0 + k)) and (k in (1.5, 3.5) or bar % 2):
                    for j, m in enumerate(tones[:3]):
                        B["pizz"].add(I.pizz_section(F(m + 12), 0.34, r, dur=0.22, bright=0.55), beat(k0 + k) + 0.004 * j, -0.25 + 0.12 * j)
            arp = [hi[0] - 12, hi[2 % len(hi)] - 12, hi[1] - 12, hi[2 % len(hi)] - 12]
            for e in range(8):
                t = beat(k0 + e / 2)
                if inside(t):
                    B["mar"].add(I.marimba(F(arp[e % 4]), 0.30 + 0.06 * (e % 2 == 0), r, dur=0.5), t, 0.30)
            for e in range(8):
                t = beat(k0 + e / 2)
                if inside(t):
                    B["perc"].add(I.shaker(0.20 + 0.08 * (e % 2), r, accent=(e % 2 == 1)), t, 0.35)
            if bar % 2 == 1 and inside(beat(k0 + 3)):
                B["perc"].add(I.woodblock(0.28, r, f=1180.0), beat(k0 + 3), -0.3)
            if bar % 4 == 0:
                for j, m in enumerate(hi):
                    if inside(beat(k0 + 0.25 * j)):
                        B["sparkle"].add(I.celesta(F(m + 12), 0.30, r), beat(k0 + 0.25 * j), 0.2)
        elif style == "tiptoe":
            walk = [tones[0], tones[1], tones[2 % len(tones)], tones[1]]
            for k in range(4):
                t = beat(k0 + k)
                if inside(t):
                    B["pizz"].add(I.pizz_section(F(walk[k] + 12), 0.42, r, dur=0.16, bright=0.5), t, -0.15)
                    B["pad"].add(I.bassoon(F(walk[k] - 12), 0.16 * b, 0.30, r), t, 0.15)
            if inside(beat(k0)):
                B["bass"].add(I.bass_pizz(F(R), 0.75, r, length=0.5 * b), beat(k0), 0.0)
            if inside(beat(k0 + 2)):
                B["bass"].add(I.bass_pizz(F(R + 7), 0.55, r, length=0.4 * b), beat(k0 + 2), 0.0)
            for k in (1, 3):
                if inside(beat(k0 + k)):
                    B["perc"].add(I.snap(0.35, r), beat(k0 + k), 0.25)
            for e in range(8):
                if inside(beat(k0 + e / 2)) and e % 2:
                    B["perc"].add(I.brush_tap(0.22, r), beat(k0 + e / 2), -0.2)
        elif style == "halftime":
            if inside(beat(k0)):
                B["bass"].add(I.bass_pizz(F(R), 0.78, r, length=1.6 * b), beat(k0), 0.0)
                dur = min(4 * b, t1 - beat(k0))
                B["pad"].add(I.strings([F(m) for m in tones], dur + 0.1, 0.22, r, att=0.25, rel=0.5, trem=0.0, bright=0.45), beat(k0), 0.0)
            for k in range(4):
                if inside(beat(k0 + k)):
                    B["mar"].add(I.harp(F(hi[k % len(hi)] - 12), 0.40, r), beat(k0 + k), 0.25)
            for k in (1, 3):
                if inside(beat(k0 + k)):
                    B["perc"].add(I.shaker(0.24, r, dur=0.14, accent=True), beat(k0 + k), 0.3)
            if bar % 2 == 1:
                q = [hi[0] + 12, hi[1 % len(hi)] + 12, hi[0] + 14]
                for j, m in enumerate(q):
                    if inside(beat(k0 + 2 + 0.5 * j)):
                        B["sparkle"].add(I.celesta(F(m), 0.28, r), beat(k0 + 2 + 0.5 * j), -0.2)
        elif style == "build":
            grow = (bar + 1) / max(1, nbars)
            for e in range(8):
                t = beat(k0 + e / 2)
                if inside(t):
                    B["bass"].add(I.bass_pizz(F(R + (12 if e % 4 == 2 else 0)), 0.65 + 0.15 * grow, r, length=0.22 * b), t, 0.0)
                    if e % 2:
                        for j, m in enumerate(tones[:3]):
                            B["pizz"].add(I.pizz_section(F(m + 12), 0.30 + 0.15 * grow, r, dur=0.15), t + 0.003 * j, -0.25 + 0.12 * j)
            for e in range(16):
                t = beat(k0 + e / 4)
                if inside(t):
                    m = hi[e % len(hi)] - 12 + 12 * (e // len(hi) % 2)
                    B["mar"].add(I.marimba(F(m), 0.22 + 0.12 * grow, r, dur=0.3), t, 0.3)
                    B["perc"].add(I.shaker(0.16 + 0.1 * grow + 0.06 * (e % 4 == 2), r, dur=0.07), t, 0.35)
            for k in (1, 3):
                if inside(beat(k0 + k)):
                    B["perc"].add(I.brush_tap(0.35 + 0.15 * grow, r, accent=True), beat(k0 + k), -0.15)
            if bar == 0:
                dur = t1 - t0
                B["pad"].add(I.strings([F(m) for m in tones], dur, 0.12, r, att=dur * 0.8, rel=0.2, trem=1.0, bright=0.55, swell=lambda tt: 0.2 + 0.8 * np.clip(tt / max(dur, 0.1), 0, 1) ** 1.5), t0, 0.0)
        else:
            raise ValueError(style)
    return B


def hit(n, t, sym, r, big=1.0):
    """an accent: a rolled pizz chord, the bass, a glockenspiel and a triangle on t"""
    root, iv = chord(sym)
    B = Bus(n, 0.35)
    B.add(I.bass_pizz(F(36 + root), 0.9 * big, r, length=0.5), t)
    for j, i in enumerate(iv):
        B.add(I.pizz_section(F(60 + root + i), 0.55 * big, r, dur=0.4, bright=0.6), t + 0.012 * j, -0.3 + 0.2 * j)
    B.add(I.glock(F(84 + root + iv[-1] % 12), 0.45 * big, r), t, 0.15)
    B.add(I.triangle(0.25 * big, r), t, -0.2)
    return B


def render(sections, L, vref, hits=(), stops=(), seed=4040, tail=1.2):
    """the whole score -> (2, ns(L)) stereo at its levels (LU under vref per section), and the section table.
    The last bar should end on L: everything after L (the reverb tail) is folded onto frame 0 (the loop)."""
    r = rng(seed)
    n = ns(L + tail)
    ir = make_ir(1.6, seed, hf=0.55, early=((0.011, 0.5, -0.4), (0.017, 0.4, 0.5), (0.026, 0.3, -0.1)))
    out = np.zeros((2, n))
    table = []
    for sec in sections:
        Bs = render_section(sec, n, r)
        dry = sum(b.x for b in Bs.values())
        dry[:, :] = dry
        bass = Bs["bass"].x
        bass_ph = I.saturate(bass, *BASS_DRIVE)
        bass_up = np.stack([I.saturate(hp(c, 160, 2), 2.5, 0.6) for c in bass]) * 0.35           # the octave above reads on a phone
        dry = dry - bass + bass_ph + bass_up
        send = sum(b.x * b.send for b in Bs.values())
        wet = convolve_st(send.mean(0), ir)[:, :n]
        y = dry + 0.55 * wet
        a, z = ns(sec["t0"]), ns(min(sec["t1"] + 0.02, L + tail))
        lvl = integrated(y[:, a:z]) if z - a > ns(1.0) else -60.0
        g = dbg(vref - sec["lu"] - lvl) if np.isfinite(lvl) else 0.0
        # the section's own edges: dry cut at t1 (8 ms), its hall tail rings 0.6 s into the next section
        e = np.ones(n)
        k1 = ns(sec["t1"])
        if k1 < n:
            e[k1:] = 0.0
            m = min(n - k1, ns(0.008))
            e[k1 - m:k1] = np.linspace(1, 0, m) if m > 0 else e[k1 - m:k1]
        dry_e = dry * e[None, :]
        wet_e = wet * np.concatenate([np.ones(k1), np.exp(-np.arange(n - k1) / SR / 0.25)])[None, :n] if k1 < n else wet
        out += g * (dry_e + 0.55 * wet_e)
        table.append(dict(name=sec["name"], t0=round(sec["t0"], 3), t1=round(sec["t1"], 3), bpm=round(sec["bpm_used"], 1), style=sec["style"],
                          prog=" ".join(sec["prog"]), lu=sec["lu"], gain_db=round(20 * np.log10(g + 1e-12), 1)))
    for t, sym, big in hits:
        hb = hit(n, t, sym, r, big)
        y = hb.x + 0.55 * convolve_st((hb.x * hb.send).mean(0), ir)[:, :n]
        sec = next((s for s in sections if s["t0"] <= t < s["t1"]), sections[-1])
        lvl = integrated(y[:, ns(t):ns(t + 1.5)])
        out += dbg(vref - (sec["lu"] - 3.0) - lvl) * y                                     # a hit sits 3 LU over its section
    for a, b in stops:                                                                       # the full stop(s): everything out, hall too
        ka, kb = ns(a), ns(b)
        ramp = ns(0.012)
        env = np.ones(n)
        env[ka:kb] = 0.0
        env[max(0, ka - ramp):ka] = np.linspace(1, 0, min(ramp, ka))
        env[kb:kb + ramp] = np.linspace(0, 1, min(ramp, n - kb))
        out *= env[None, :]
    out = shelf(shelf(out, AIR[0], AIR[1], "high"), WARM[0], WARM[1], "low")
    film = out[:, :ns(L)].copy()
    rest = out[:, ns(L):]
    m = min(film.shape[1], rest.shape[1])
    film[:, :m] += rest[:, :m]                                                              # the loop: the tail rings on into frame 0
    return film, table


# ---------------------------------------------------------------- THE v4 FILM'S MAP (SCRIPT_v4.md LOCKED 08:25, 22 lines)
# The hook (lines 1-3) is hook_v4.py: the groove the seven "Go"s ride, the dead stop on the red, the sting on "She did.".
# Then, each section starting at its first line (or a word inside it), re-timed from the voice:
V4_SECTIONS = [
    # name      starts at          bpm  style       chords                                 LU under the voice
    ("lab", (4, None), 112, "bounce", ["F", "C", "Dm", "Bb"], 17.5),            # 4-8   the trap; five / three / not one (a countdown)
    ("why", (9, None), 104, "halftime", ["Bb", "Gm7", "Dm", "A7"], 19.0),       # 9-11  half-time; the cereal button on line 10
    ("today", (11, "which"), 116, "bounce", ["F", "Bb", "C", "F"], 17.0),       # 11-12 "Which is why Japan's train drivers": bright, proud
    ("steam", (13, None), 100, "tiptoe", ["Gm", "Gm", "Dm", "A7"], 18.0),       # 13-18 HARD cut to 1910; tiptoe over the engine
    ("newyork", (19, None), 112, "build", ["Gm", "A7", "Bb", "A7"], 17.0),      # 19-21 the board, the sign: a build
    ("loop", (22, None), 125, "bounce", ["Dm", "Bb", "Gm", "A7"], 16.5),        # 22    the hook's groove returns and runs into frame 0
]
V4_HITS = [((8, "end"), "Dm", 1.0), ((21, "end"), "F", 1.2)]                    # after "Not one pressed." / after "had to point."
V4_BUTTONS = [(10, "end")]                                                       # a tiny comic button after the cereal line
V4_DRY = [18]                                                                    # "He never knew about the eyes.": no music under it


def _norm(w):
    return "".join(c for c in str(w).lower() if c.isalpha())


def v4_map(lines, words, L):
    """lines: the 22 lines in film order [{s, e, ...}]; words: [{w, s, e, ...}] -> sections (after the hook), hits,
    stops, buttons, and the hook's times (go onsets, red, 'She did.')"""
    def at(k, w):
        a, b = float(lines[k - 1]["s"]), float(lines[k - 1]["e"])
        if w is None:
            return a
        ws = [x for x in words if a - 0.02 <= x["s"] <= b + 0.02 and _norm(x["w"]) == _norm(w)]
        return float(ws[0]["s"]) if ws else a
    S = []
    for j, (nm, (k, w), bpm, style, prog, lu) in enumerate(V4_SECTIONS):
        t0 = at(k, w) - 0.05
        t1 = (at(*V4_SECTIONS[j + 1][1]) - 0.05) if j + 1 < len(V4_SECTIONS) else L
        S.append(dict(name=nm, t0=t0, t1=t1, bpm=bpm, style=style, prog=prog, lu=lu, fit=True))
    H = [(float(lines[k - 1]["e"]) + 0.03, ch, big) for (k, _), ch, big in V4_HITS if k <= len(lines)]
    Z = [(float(lines[k - 1]["s"]) - 0.08, float(lines[k - 1]["e"]) + 0.05) for k in V4_DRY if k <= len(lines)]
    Bt = [float(lines[k - 1]["e"]) + 0.03 for k, _ in V4_BUTTONS if k <= len(lines)]
    a2, b2 = float(lines[1]["s"]), float(lines[1]["e"])
    go = sorted(float(x["s"]) for x in words if a2 - 0.02 <= x["s"] <= b2 + 0.02 and _norm(x["w"]) == "go")[:7]
    she = [x for x in words if float(lines[2]["s"]) - 0.02 <= x["s"] <= float(lines[2]["e"]) + 0.02 and _norm(x["w"]) == "she"]
    if go and len(go) > 1 and S and S[-1]["name"] == "loop":          # THE LOOP: the hook's own beat, counted back from L, so the
        g1, gap1 = go[0], go[1] - go[0]                                # film's last beat hands frame 0 its downbeat
        beat = g1 / max(1, round(g1 / gap1))
        k = max(4, int(round((L - S[-1]["t0"]) / beat / 4.0)) * 4)
        S[-1]["t0"] = L - k * beat
        S[-2]["t1"] = S[-1]["t0"]
        S[-1].update(bpm=60.0 / beat, fit=False)
    hook = dict(go=go, red=go[-1] if go else None, she_did=(float(she[0]["s"]) if she else float(lines[2]["e"]) - 0.5, float(lines[2]["e"])),
                silence=((go[-1] + 0.05, go[-1] + 0.55) if go else None))
    return S, H, Z, Bt, hook


def film_score(lines, words, L, vref, seed=4040):
    """the whole v4 score -> music (2, ns(L)), the hook's effects (beeps, clicks, thud), table, hook report"""
    import hook_v4 as HK
    S, H, Z, Bt, hk = v4_map(lines, words, L)
    n = ns(L)
    if hk["red"] is None:
        raise SystemExit("v4 score: no 'Go' words in line 2 of the voice (VOICE publishes the seven onsets as words)")
    first = dict(S[0])
    first["t0"] = hk["she_did"][0] + 0.30                       # the groove returns on "She did." into the lab's section
    mus_h, fx_h, _, rep = HK.render_hook(dict(hk, line1=(lines[0]["s"], lines[0]["e"])), S[0]["t1"] + 1.0, vref, after=first)
    body, table = render(S[1:], L, vref, hits=H, stops=Z)
    out = body.copy()
    m = min(n, mus_h.shape[1])
    a = ns(S[1]["t0"])
    xf = np.clip((np.arange(m) - a) / max(1, ns(0.05)), 0, 1)        # the hook part ends where the 'why' section begins
    out[:, :m] += mus_h[:, :m] * (1 - xf)[None, :]
    r = rng(seed + 7)
    for t in Bt:                                                     # the small comic button(s)
        place(out, HK.lv_to(HK.sting(r), vref - 15.0), t)
    head = [dict(name="hook", t0=0.0, t1=round(first["t0"], 3), bpm=round(60 / rep["pre_beat"], 1) if rep["pre_beat"] else None, style="hook grid",
                 prog=" ".join(HK.KEY), lu=HK.LV["music"]),
            dict(name="lab (from 'She did.')", t0=round(first["t0"], 3), t1=round(S[0]["t1"], 3), bpm=S[0]["bpm"], style=S[0]["style"],
                 prog=" ".join(S[0]["prog"]), lu=S[0]["lu"])]
    fx = fx_h[:, :n] if fx_h.shape[1] >= n else np.pad(fx_h, ((0, 0), (0, n - fx_h.shape[1])))
    return out, fx, head + table, rep


def plan_lines(path=None, wps=3.25, join=0.18):
    """PLAN times for the 22 lines (until the voice lands): the hook on hook_v4's plan grid, the rest at wps words/s"""
    import hook_v4 as HK
    path = path or os.path.join(os.path.dirname(HERE), "script_v4", "lines_v4.json")
    Ls = json.load(open(path, encoding="utf-8"))
    T = HK.plan_times()
    lines, words = [], []

    def add_words(lid, text, a, b):
        toks = text.replace('"', "").split()
        d = (b - a) / max(1, len(toks))
        for i, w in enumerate(toks):
            words.append(dict(w=w, s=a + i * d, e=a + (i + 0.85) * d, id=lid))
    lines.append(dict(id=1, s=T["line1"][0], e=T["line1"][1]))
    add_words(1, Ls[0]["text"], *T["line1"])
    lines.append(dict(id=2, s=T["go"][0], e=T["go"][-1] + 0.25))
    for g in T["go"]:
        words.append(dict(w="Go", s=g, e=g + 0.2, id=2))
    lines.append(dict(id=3, s=T["line3"][0], e=T["line3"][1]))
    words += [dict(w=w, s=T["line3"][0] + i * 0.3, e=T["line3"][0] + i * 0.3 + 0.25, id=3) for i, w in enumerate(["Did", "you", "tap?"])]
    words += [dict(w="She", s=T["she_did"][0], e=T["she_did"][0] + 0.25, id=3), dict(w="did.", s=T["she_did"][0] + 0.28, e=T["she_did"][1], id=3)]
    t = T["line4"]
    for l in Ls[3:]:
        d = l["words"] / (wps if l["speaker"] == "N" else 2.2)
        lines.append(dict(id=l["id"], s=t, e=t + d))
        add_words(l["id"], l["text"], t, t + d)
        t += d + join
    return lines, words, t + 0.10


def test_map(L=60.0):
    """a 60 s map with the brief's shape: playful setup, mischief, the half-time 'why', a build, the payoff + the loop"""
    S = [dict(name="hook", t0=0.0, t1=6.92, bpm=104, style="bounce", prog=["Dm", "Bb", "Gm", "A7"], lu=16.5),
         dict(name="setup", t0=6.92, t1=18.46, bpm=104, style="bounce", prog=["F", "C", "Dm", "Bb", "Gm", "C", "F", "A7"], lu=17.5),
         dict(name="stops", t0=18.46, t1=30.0, bpm=104, style="tiptoe", prog=["Dm", "Dm", "Gm", "A7"], lu=18.0),
         dict(name="why", t0=30.0, t1=41.54, bpm=104, style="halftime", prog=["Bb", "Gm7", "Dm", "A7"], lu=19.0),
         dict(name="build", t0=41.54, t1=52.0, bpm=116, style="build", prog=["Gm", "A7", "Bb", "A7"], lu=17.0),
         dict(name="payoff", t0=52.0, t1=L, bpm=104, style="bounce", prog=["Dm", "Bb", "Gm", "A7"], lu=16.5)]
    hits = [(18.46, "A7", 1.0), (30.0, "Bb", 0.8), (52.0, "Dm", 1.2)]
    stops = [(56.6, 57.2)]
    return S, hits, stops


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--film-plan", action="store_true", help="the whole v4 score on PLAN times -> _score_v4_film_plan.wav")
    ap.add_argument("--out", default=os.path.join(HERE, "_score_v4_test.wav"))
    ap.add_argument("--vref", type=float, default=-13.7)
    a = ap.parse_args()
    if a.film_plan:
        lines, words, L = plan_lines()
        y, fx, table, rep = film_score(lines, words, L, a.vref)
        o = os.path.join(HERE, "_score_v4_film_plan.wav")
        write_wav(o, y)
        _, _, Zs, _, hk = v4_map(lines, words, L)
        designed = [(hk["red"], hk["she_did"][0] + 0.02)] + [list(z) for z in Zs]       # the red's stop + line 18 dry (both by direction)
        json.dump(dict(sections=table, vref=a.vref, L=L, lines=lines, hook=rep, designed_silences=designed), open(o.replace(".wav", ".json"), "w"), indent=1, default=float)
        for row in table:
            print(row)
        print(f"-> {o}: {L:.2f} s, {integrated(y):.1f} LUFS")
        sys.exit(0)
    S, H, Z = test_map(60.0)
    y, table = render(S, 60.0, a.vref, H, Z)
    pk = np.abs(y).max()
    if pk > 0.89:
        y *= 0.89 / pk
    write_wav(a.out, y)
    json.dump(dict(sections=table, hits=H, stops=Z, lufs=integrated(y)), open(a.out.replace(".wav", ".json"), "w"), indent=1)
    for row in table:
        print(row)
    print(f"-> {a.out}: {y.shape[1] / SR:.2f} s, {integrated(y):.1f} LUFS, peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
