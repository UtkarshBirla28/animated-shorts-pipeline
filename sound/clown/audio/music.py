# SCORE v2 of "The Clown Nobody Saw" (rebuild, SCRIPT_v6.md): an original MYSTERY-CHAMBER score, composed and synthesized
# here (instruments.py; no samples, no known tune quoted). The circus two-step of cut 1 is gone (kept as music_cut1.py).
# Colour: a small chamber group in a warm hall: a pizzicato string SECTION, a soft bowed section (sustained, tremolo and
# glassy harmonics), harp, celesta / glockenspiel / vibes, bassoon and clarinet, an upright-bass line (saturated a little
# so it still reads on a phone), soft percussion only (a woodblock clock, a seed shaker, brushes, finger snaps).
# Home key D minor; bright major turns for the jokes (D major on "Five.", Bb major on the clown suit, F / Bb for the ride).
#
# EVERY TIME IS READ FROM THE VOICE (phrases.json line times, words.json word times of the voice folder that has the v6
# 'speaker' fields), so a re-built voice only needs a re-run. Sections (edges sit in the voice's gaps):
#   quiz       0 .. "How many?"            the count: a ticking game-show clock, a staccato pizzicato ostinato with an inner
#                                           line creeping up a semitone a bar (A Bb B C#: tension), shaker, celesta sparks;
#                                           a sly clarinet/glock phrase in the narration-free stretches of the count
#   answer     "How many?" .. n06          ticking stops on a held tremolo chord; a bright sting ON "Five." (D major add9);
#                                           a light walk under "And the clown? You saw him, right?"; a two-note wink after "right?"
#   turn       n06 .. n07                  THE FLOOR DROPS (hard cut): a low piano D, a bowed bass, cold high harmonics, a
#                                           falling celesta line: intrigue
#   origin     n07 .. "suit"               sneaky office mischief: a staccato bassoon over a creeping pizz bass, brushes; a lift
#                                           on "I own a unicycle."; a held breath on "...and a clown"; a COMIC HIT on "suit."
#   ride       n08 .. i01                  the hour of riding: a bouncy syncopated groove (marimba-free: pizz + harp + glock), shaker
#   interviews i01 .. n10                  light and quick, sparse dabs out of the dialogue's way; it stops under
#                                           "Sorry... what clown?" and a low pizz + bassoon 'plonk' buttons it
#   number     n10 .. n12                  incredulous: a held suspended chord, half-time pulse, a questioning celesta
#   mystery    n12 .. n14                  hushed, leaning in: tremolo strings, harp harmonics, a soft heartbeat bass, the celesta motif
#   money      n14 .. "money."             sneaky tiptoe pizzicato, building bar by bar (bassoon, snaps, shaker, strings), a dip on
#                                           "ducked", then a hard stop after "money."
#   mindblow   n17 .. n18                  almost nothing: a low D, glassy harmonics, three slow celesta notes, wonder
#   end        n18 .. after "clown."       a quick build on the quiz ostinato (faster), cut dead for the hush
#   hush       .. n19                      silence
#   rewind     n19 .. the seam             a TAPE REWIND of the quiz music (reversed, fast and pitching down) under "Did you see
#                                           the", a reversed-reverb SWELL of the frame-0 chord on "money?", STOP at the last sample
#                                           (frame 0's downbeat answers it: the loop)
import json
import os
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, shelf, read_wav, fades
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
F = I.m2f
TAIL_F = 7                       # frames after the voice's last sample (the loop button), until the timeline is exported
AIR = (5000.0, 5.0)              # high shelf on the score bus: alive in the 2-8 kHz air band
BASS_DRIVE = (2.2, 0.45)         # soft saturation of the bass line (its 2nd / 3rd harmonics read on phone speakers)
SLOW_RATE = 0.84                 # (kept for sfx.py's slow-motion tape; not used by this score)


# ---------------------------------------------------------------- the voice clock
def voice_dir():
    """the voice folder of the v6 film: sound/clown/voice once it is promoted (its phrases.json has 'speaker'), else voice_v6"""
    for d in ("voice", "voice_v6"):
        p = os.path.join(ROOT, d)
        try:
            P = json.load(open(os.path.join(p, "phrases.json"), encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if P and "speaker" in P[0] and os.path.exists(os.path.join(p, "voice.wav")):
            return p
    raise SystemExit("no v6 voice (phrases.json with 'speaker' fields + voice.wav) in sound/clown/voice or voice_v6")


VDIR = voice_dir()
PHR = {p["id"]: p for p in json.load(open(os.path.join(VDIR, "phrases.json"), encoding="utf-8"))}
WORDS = json.load(open(os.path.join(VDIR, "words.json"), encoding="utf-8"))


def _voice_samples():
    import wave
    with wave.open(os.path.join(VDIR, "voice.wav"), "rb") as w:
        return w.getnframes(), w.getframerate()


def film_frames():
    """the film length in frames: the exported timeline when it belongs to this voice, else the voice + TAIL_F frames"""
    n, sr = _voice_samples()
    own = int(np.ceil(n / sr * 30 - 1e-6)) + TAIL_F
    try:
        tl = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
        if abs(int(tl["total"]) - own) <= 12:        # (phase B: the v6 timeline ends 7 f after the last WORD, 2117 f)
            return int(tl["total"])
    except (OSError, ValueError, KeyError):
        pass
    return own


FRAMES = film_frames()
DUR = FRAMES / 30.0
N = ns(DUR)


def e3_freeze():
    """(start s, end s) of the tape FREEZE of the last shot, from the exported timeline (remap.ts REW); None before the export"""
    try:
        tl = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
        if int(tl["total"]) != FRAMES:
            return None
        for v in tl.get("remap", {}).values():
            rw = v.get("rewind")
            if rw:
                a = (rw["a"] + rw["r1"]) / 30.0
                return a, a + rw["hold"] / 30.0
    except (OSError, ValueError, KeyError):
        pass
    return None


def bag_open_t():
    """p3 (FIX2 D11): the time the garment bag flies OPEN in S5 (the reveal's white flash), from STORY-1's cue file; the
    comic hit lands there (the bag opens on "clown", the word "suit." follows 6 f later). None = no cue file (then the
    hit stays on the word)."""
    p = os.path.normpath(os.path.join(HERE, "..", "..", "..", "studio", "out", "clown", "anim_story1", "sound_cues.json"))
    try:
        C = json.load(open(p, encoding="utf-8"))
    except (OSError, ValueError):
        return None
    for name, df in (("flash_snap", 0.0), ("suit_spring", 0.0), ("garment_fling", 1.0)):   # p4: no flash any more; the suit's spring is "the reveal hit"
        fs = [float(c["frame"]) for c in C if c.get("name") == name]
        if fs:
            return (min(fs) + df) / 30.0
    return None


def e3_marks():
    """p3: timeline.json 'e3' (EDIT's export): {cut, rewind1, hold, ring_full, rewind2, total} in frames, or None"""
    try:
        tl = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
        if int(tl["total"]) == FRAMES and tl.get("e3"):
            return tl["e3"]
    except (OSError, ValueError, KeyError):
        pass
    return None


DUCK_PAD_S = 0.2                 # the silent window round each duck of the count (sfx.py HARD_PAD_F = 6 frames)


def duck_windows():
    """[(start s, end s)] round the two ducks of the count (plan.ts DUCKS: 1/3 and 2/3 of jobEnd .. howMany), from the
    exported timeline; [] before the export. THE QUIZ RULE for the score: nothing NEW may happen inside a window (no phrase
    entry, no chime, no step of the harmony, no change of level); the steady pulse simply runs through."""
    try:
        tl = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
        if int(tl["total"]) != FRAMES:
            return []
        a, z = float(tl["beat"]["jobEnd"]["f"]), float(tl["beat"]["howMany"]["f"])
        return [(round(a + u * (z - a)) / 30.0 - DUCK_PAD_S, round(a + u * (z - a)) / 30.0 + DUCK_PAD_S) for u in (0.33, 0.69)]
    except (OSError, ValueError, KeyError):
        return []


def L(i):
    """(start, end) of voice line id i (phrases.json)"""
    return float(PHR[i]["s"]), float(PHR[i]["e"])


def Wd(text, after=0.0):
    """the first word matching `text` (case / punctuation-free prefix) that starts at or after `after` s"""
    k = "".join(c for c in text.lower() if c.isalnum())
    for w in WORDS:
        if float(w["s"]) >= after - 1e-6 and "".join(c for c in w["w"].lower() if c.isalnum()).startswith(k):
            return float(w["s"]), float(w["e"])
    raise KeyError(text)


def gap_after(t):
    """the voice gap that begins at the first word end >= t: (end of that word, start of the next word)"""
    for a, b in zip(WORDS, WORDS[1:]):
        if float(a["e"]) >= t - 1e-6:
            return float(a["e"]), float(b["s"])
    return float(WORDS[-1]["e"]), DUR


# ---------------------------------------------------------------- grids, the band
class Grid:
    """a tempo region: t0..t1 holds nb whole beats (nb from a target BPM unless given)"""

    def __init__(self, name, t0, t1, bpm=104.0, nb=None):
        self.name, self.t0, self.t1 = name, float(t0), float(t1)
        d = max(1e-3, self.t1 - self.t0)
        self.nb = nb or max(1, int(round(d / (60.0 / bpm))))
        self.bl = d / self.nb

    def t(self, b):
        return self.t0 + b * self.bl

    def bpm(self):
        return 60.0 / self.bl


# instrument -> (send to the hall, balance target LU inside the score)
TRACKS = {"pizz": (0.20, -4.0), "cello": (0.16, -9.0), "bass": (0.05, -3.5), "strings": (0.30, -8.0), "harmo": (0.35, -12.0),
          "harp": (0.32, -9.0), "keys": (0.30, -9.0), "wind": (0.20, -7.0), "tick": (0.08, -12.5), "perc": (0.10, -14.0),
          "piano": (0.28, -8.0)}


class Band:
    """notes go to (group, instrument) tracks. A GROUP is a span of the film with its own hard edges: its dry sound and
    its hall are both cut at the group's end (a 'drop' really drops) and nothing of it sounds before its start."""

    def __init__(self):
        self.tr = {}
        self.cues = []
        self.groups = {}             # name -> (start s, end s, fade-out s)
        self.g = None

    def group(self, name, a, z, fade=0.03):
        self.groups[name] = (a, z, fade)
        self.g = name

    def add(self, inst, x, t, p=0.0, g=1.0):
        if t >= DUR or t < 0:
            return
        k = (self.g, inst)
        if k not in self.tr:
            self.tr[k] = np.zeros((2, N), np.float32)    # p3: float32 tracks (half the memory; the PC is shared with a render)
        place(self.tr[k], pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(6006)


def _r():
    return rng(int(R.integers(1 << 30)))


def hum(t, ms=4.0):
    return max(0.0, t + R.normal(0, ms / 1000.0))


def vj(v):
    return v * R.uniform(0.9, 1.06)


# ---------------------------------------------------------------- players
def pz(b, t, m, vel, dur=0.32, p=-0.32, bright=0.5, inst="pizz"):
    b.add(inst, I.pizz_section(F(m), vj(vel), _r(), dur=dur, bright=bright), hum(t, 3), p)


def bass(b, t, m, vel, length=0.4, cello=True):
    b.add("bass", I.bass_pizz(F(m), vj(vel), _r(), length=length), hum(t, 3), 0.0)
    if cello:                         # the cellos double the bass line an octave up (the phone hears this one)
        b.add("cello", I.pizz_section(F(m + 12), vj(vel * 0.55), _r(), dur=min(0.5, length + 0.1), bright=0.35), hum(t, 3), 0.22)


def chord_str(b, t, ms, dur, vel, trem=0.0, harmonics=False, att=0.35, rel=0.6, bright=0.5, swell=None, inst=None, air=0.03):
    b.add(inst or ("harmo" if harmonics else "strings"), I.strings([F(m) for m in ms], dur, vel, _r(), att=att, rel=rel, trem=trem,
                                                                   bright=bright, harmonics=harmonics, swell=swell, air=air), max(0.0, t), 0.0)


def swirl(b, t, dur, vel):
    """a brush stirring slow circles on the snare head (the hushed-noir air under a quiet passage)"""
    b.add("perc", I.brush_sweep(dur, vj(vel), _r()), hum(t, 6), R.uniform(-0.3, 0.3))


def cel(b, t, m, vel, dur=0.9, p=0.35):
    b.add("keys", I.celesta(F(m), vj(vel), _r(), dur=dur), hum(t, 2), p)


def glk(b, t, m, vel, dur=1.2, p=0.25):
    b.add("keys", I.glock(F(m), vj(vel), _r(), dur=dur), hum(t, 2), p)


def vib(b, t, m, vel, dur=1.6, p=0.1, damp=None):
    b.add("keys", I.vibes(F(m), vj(vel), _r(), dur=dur, damp=damp, trem_depth=0.12), hum(t, 3), p)


def hrp(b, t, m, vel, harmonic=False, p=-0.45):
    b.add("harp", I.harp(F(m), vj(vel), _r(), harmonic=harmonic), hum(t, 3), p)


def bsn(b, t, m, dur, vel, p=0.2):
    b.add("wind", I.bassoon(F(m), dur, vj(vel), _r()), hum(t, 3), p)


def clar(b, t, m, dur, vel, p=-0.2):
    b.add("wind", I.clarinet(F(m), dur, vj(vel), _r()), hum(t, 3), p)


def tpt(b, t, m, dur, vel, p=0.05, **kw):
    b.add("wind", I.muted_trumpet(F(m), dur, vj(vel), _r(), **kw), hum(t, 2), p)


def tick(b, t, vel, hi=True):
    b.add("tick", I.woodblock(vj(vel), _r(), f=1580.0 if hi else 1180.0, dur=0.12), hum(t, 1.5), -0.25 if hi else 0.25)


def shk(b, t, vel, accent=False):
    b.add("perc", I.shaker(vj(vel), _r(), accent=accent), hum(t, 4), 0.45)


def snp(b, t, vel, p=-0.35):
    b.add("perc", I.snap(vj(vel), _r()), hum(t, 3), p)


def brush(b, t, vel):
    b.add("perc", I.brush_tap(vj(vel), _r()), hum(t, 4), 0.05)


def pno(b, t, m, vel, dur=4.0, p=-0.1):
    b.add("piano", I.piano(F(m), vj(vel), _r(), dur=dur), hum(t, 2), p)


def arc(b, t, m, dur, vel, p=0.1):
    b.add("bass", I.arco(F(m), dur, vj(vel), _r(), att=0.5, rel=0.8), max(0.0, t), p)


# ---------------------------------------------------------------- the score
D2, A1, F2 = 38, 33, 41


def build():
    b = Band()
    ce = lambda t, d: b.cues.append((round(t, 3), d))
    n01, n02, n03, n04, n05, n06, n07 = (L(k) for k in ("n01", "n02", "n03", "n04", "n05", "n06", "n07"))
    s01, s02, n08 = L("s01"), L("s02"), L("n08")
    i01, f01, h01, p01 = L("i01"), L("f01"), L("h01"), L("p01")
    n10, n12, n13, n14, n15, n16, n17, n18, n19 = (L(k) for k in ("n10", "n12", "n13", "n14", "n15", "n16", "n17", "n18", "n19"))
    n11 = L("n11") if "n11" in PHR else None                 # p3: the restored "Many spun around to look."
    t_suit = bag_open_t() or Wd("suit", s02[0])[0]           # p3 (D11): the comic hit lands on the BAG OPENING, not on the word
    t_money_end = Wd("money", n16[0])[1]
    t_clown_end = n18[1]
    t_hush = t_clown_end + 0.02
    SEC = {}

    # =============== GROUP 1: the quiz and the answer (cut dead when the floor drops on n06)
    b.group("g1", 0.0, n06[0], fade=0.025)
    q_end = n03[0] - 0.06
    Q = Grid("quiz", 0.0, q_end, nb=16)                      # four bars, ~106 BPM, the downbeat on frame 0
    SEC["quiz"] = (0.0, q_end)
    inner = [57, 58, 59, 61]                                 # A Bb B C#: the creeping inner line, one step a bar
    # PHASE B (THE QUIZ RULE): the two ducks of the count sit at 1/3 and 2/3 of the count window, which put BOTH of them on
    # a bar line of the first version (beats 8 and 12: the inner line's step, a louder bar, a celesta spark, and the second
    # clarinet phrase's entry). The bars now start on beats 2, 6, 10, 14 (a two-beat pick-up from frame 0), so every step of
    # the harmony and of the level falls BETWEEN the ducks; no spark and no phrase note starts in a duck window, and the
    # ostinato is spread evenly left / right (nothing leans toward the bills). The steady pulse itself runs through.
    W = duck_windows()
    PH = 2.0

    def in_win(t0, t1=None):
        t1 = t0 if t1 is None else t1
        return any(t0 <= z and t1 >= a for a, z in W)

    def bar_of(beat):
        return int(min(3, np.floor((beat + PH) / 4.0)))
    for k in range(32):                                      # the staccato pizz ostinato in 8ths
        beat = k * 0.5
        bar = bar_of(beat)
        e = int(round(((beat + PH) % 4.0) * 2)) % 8          # the 8th inside the bar
        m = [50, inner[bar], 53, inner[bar]][e % 4] + (12 if e in (3, 7) and bar == 3 else 0)
        acc = 1.0 if e % 2 == 0 else 0.78
        pz(b, Q.t(beat), m, (0.42 + 0.06 * bar) * acc, dur=0.22, p=-0.2 + 0.4 * (e % 2))
    for k in range(8):                                       # bass every two beats (A from the last bar)
        bar = bar_of(k * 2.0)
        bass(b, Q.t(k * 2.0), A1 + 12 if k * 2.0 >= 14.0 else D2, 0.5 + 0.05 * bar, length=0.3)   # (A only on the last two beats: the dominant before "How many?")
    for beat in (0.0, 2.0, 6.0, 10.0, 14.0):                 # a celesta spark where the inner line steps: not under the
        t = Q.t(beat) + 0.004                                # narrator (after frame 0) and never in a duck window
        if in_win(t - 0.05, t + 0.35) or (beat > 0 and n01[0] - 0.05 <= t <= n01[1]) or (n02[0] - 0.05 <= t <= n02[1]):
            continue
        cel(b, t, inner[bar_of(beat)] + 24, 0.32 + 0.04 * bar_of(beat), dur=0.7, p=0.4)
    for k in range(32):                                      # the clock: tick on the beat, tock on the off-beat
        tick(b, Q.t(k * 0.5) + 0.002, 0.34 if k % 2 == 0 else 0.22, hi=(k % 2 == 0))
    t_dlc = n02[0]
    for k in range(64):                                      # shaker: 8ths, then 16ths from "Don't lose count."
        t = Q.t(k * 0.25)
        if t < t_dlc and k % 2:
            continue
        shk(b, t, 0.22 + (0.08 if t >= t_dlc else 0.0) + (0.05 if k % 4 == 0 else 0.0), accent=(k % 4 == 0))
    # the sly phrase, only where the narrator is silent (the count runs on music): clarinet + glock doubling. The first one
    # starts as "phone." ends and is over before the first duck window; the second one starts on the first quarter-beat
    # after the second duck window (and after "Don't lose count."). A note that would ring into a window is cut before it.
    phrase = [(0.0, 62, 0.5), (0.5, 65, 0.5), (1.0, 64, 0.5), (1.5, 61, 0.5), (2.0, 62, 1.0), (3.0, 57, 0.75)]
    t2 = max(n02[1] + 0.05, (W[1][1] + 0.04) if len(W) > 1 else 0.0)
    t1 = n01[1] + 0.03                                       # p3: the first phrase starts as "phone." ENDS (the 0.34 s lead-in moved it)
    starts = [Q.t(np.ceil(t1 / Q.bl / 0.25 - 1e-9) * 0.25), Q.t(np.ceil(t2 / Q.bl / 0.25 - 1e-9) * 0.25)]
    for st_ in starts:
        for bt, m, ln in phrase:
            t = st_ + bt * Q.bl
            d = ln * Q.bl * 0.8
            ring = 0.5
            for a_, z_ in W:
                if t < a_ - 0.03:
                    d, ring = min(d, a_ - 0.03 - t), min(ring, a_ - 0.03 - t)
            d = min(d, q_end - 0.03 - t)
            if d < 0.12 or in_win(t - 0.03, t + 0.03) or (n02[0] - 0.05 <= t <= n02[1]):
                continue
            clar(b, t, m, d, 0.5, p=0.15)
            glk(b, t, m + 24, 0.16, dur=max(0.15, min(ring, 0.5)), p=0.25)
    ce(0.0, f"QUIZ ({Q.bpm():.0f} BPM, 4 bars from frame 0): a ticking woodblock clock (tick / tock), a staccato pizzicato ostinato over a D pedal "
            "with an inner line creeping up a semitone a bar (A Bb B C#), celesta sparks, shaker 8ths then 16ths from 'Don't lose count.', a sly "
            "clarinet + glockenspiel phrase only in the narration-free stretches of the count")

    # the answer: the ticking stops on a held chord; the sting ON "Five."; a light walk; the wink
    SEC["answer"] = (q_end, n06[0])
    chord_str(b, q_end, [45, 50, 55, 64], n04[0] - q_end + 0.05, 0.42, trem=0.55, att=0.25, rel=0.08, bright=0.65)   # A7sus4: "How many?"
    vib(b, q_end + 0.02, 76, 0.22, dur=1.0, damp=n04[0] - q_end)
    t5 = n04[0]
    for j, m in enumerate((50, 57, 62, 66, 69, 76)):        # D major add9 sting, pizz rolled upward in 30 ms
        pz(b, t5 + 0.006 * j, m, 0.62, dur=0.5, p=-0.4 + 0.16 * j, bright=0.7)
    bass(b, t5, D2, 0.65, length=0.5)
    glk(b, t5 + 0.01, 86, 0.36, dur=1.4)
    glk(b, t5 + 0.01, 81, 0.3, dur=1.4, p=0.1)
    b.add("keys", I.triangle(0.22, _r(), dur=1.4), t5 + 0.005, 0.3)
    walk = [50, 54, 57, 59, 57, 54, 52, 49]                  # a light D-major walk under "And the clown? You saw him, right?"
    Wk = Grid("walk", n05[0], n05[1] + 0.02, nb=8)
    for k, m in enumerate(walk):
        pz(b, Wk.t(k), m, 0.36, dur=0.2, p=-0.2)
        if k % 2 == 0:
            bass(b, Wk.t(k), m - 12, 0.38, length=0.22, cello=False)
    w0 = n05[1] + 0.006                                      # the wink: two quick high notes in the breath after "right?"
    glk(b, w0, 81, 0.34, dur=0.4)
    glk(b, w0 + 0.06, 86, 0.38, dur=0.6)
    hrp(b, w0, 69, 0.3, harmonic=True, p=0.0)
    ce(q_end, "ANSWER: the clock stops on a held tremolo A7sus4 ('How many?'); a bright D-major-add9 sting ON 'Five.' (pizz rolled up, "
              "glockenspiel, triangle); a light pizz walk under 'And the clown? You saw him, right?'; a two-note glockenspiel wink in the breath "
              "after 'right?'")

    # =============== GROUP 2: the turn and the office (cut for the held breath before "suit")
    b.group("g2", n06[0], s02[0] - 0.01, fade=0.06)
    SEC["turn"] = (n06[0], n07[0])
    t = n06[0]
    pno(b, t + 0.004, 26, 0.55, dur=4.2, p=-0.05)            # a low piano D, felt-soft
    pno(b, t + 0.004, 38, 0.32, dur=4.2, p=0.05)
    arc(b, t, D2, n07[0] - t + 0.4, 0.45)
    chord_str(b, t, [69, 76, 81], n07[0] - t + 0.3, 0.32, harmonics=True, att=0.6, rel=0.5, air=0.09)   # cold high harmonics (A E A), breathy
    fall = [77, 76, 74, 73]                                  # F E D C#: falling, unresolved
    for k, m in enumerate(fall):
        cel(b, t + 1.05 + 0.42 * k, m, 0.28, dur=1.2, p=0.3 - 0.1 * k)
    bsn(b, n07[0] - 0.7, 45, 0.6, 0.32)                       # a low bassoon A leads into the office
    ce(n06[0], "THE TURN (hard cut: the floor drops): a soft low piano D, a bowed bass D, cold high string harmonics (A E), a falling "
               "celesta line F E D C# (unresolved); a low bassoon A leads into the office")

    SEC["origin"] = (n07[0], s02[0] - 0.01)
    O = Grid("origin", n07[0], s02[0] - 0.01, bpm=104.0)
    walkdown = [50, 48, 46, 45, 43, 45, 46, 49]              # D C Bb A G A Bb C#: the creeping office bass, staccato quarters
    for k in range(O.nb):
        t = O.t(k)
        lift = t >= s01[0] - 0.05
        m = walkdown[k % 8] + (12 if lift else 0)
        pz(b, t, m - 12, 0.4 + (0.08 if lift else 0.0), dur=0.25, p=-0.2, bright=0.4)
        if k % 2 == 1:
            brush(b, t, 0.22)
    sneak = [(0.0, 50, 0.4), (1.0, 53, 0.4), (1.5, 52, 0.4), (2.5, 45, 0.9), (4.0, 46, 0.4), (5.0, 45, 0.4), (5.5, 49, 0.4), (6.0, 50, 1.2)]
    for st_ in (O.t(0.5), O.t(8.5)):
        for bt, m, ln in sneak:
            t = st_ + bt * O.bl
            if t < s01[0] - 0.2:
                bsn(b, t, m, ln * O.bl * 0.7, 0.42)
    for j, m in enumerate((62, 65, 69, 74)):                 # "I own a unicycle.": a quick pizz arpeggio up, a glock ping after it
        pz(b, s01[0] + 0.07 * j, m, 0.36, dur=0.3, p=-0.3 + 0.2 * j, bright=0.6)
    glk(b, s01[1] + 0.01, 86, 0.26, dur=0.8)
    ce(n07[0], f"ORIGIN ({O.bpm():.0f} BPM): office mischief: a creeping staccato pizz bass (D C Bb A G A Bb C#), brushes on the off-beats, a "
               "sneaky staccato bassoon line under the narration; 'I own a unicycle.': a pizz arpeggio up and a glockenspiel ping")

    # =============== GROUP 3: the held breath, the suit hit, the ride, the interviews, the number, the mystery, the money
    b.group("g3", s02[0] - 0.01, t_money_end + 0.03, fade=0.07)
    chord_str(b, s02[0] - 0.01, [74, 81], t_suit - s02[0] + 0.02, 0.3, trem=0.7, att=0.08, rel=0.04, harmonics=False, bright=0.8, inst="harmo")
    SEC["suit"] = (s02[0] - 0.01, n08[0])
    th = t_suit                                              # the COMIC HIT on "suit.": Bb major, a bright surprise against D minor
    for j, m in enumerate((46, 53, 58, 62, 65, 70)):
        pz(b, th + 0.004 * j, m, 0.72, dur=0.45, p=-0.4 + 0.16 * j, bright=0.75)
    bass(b, th, 34, 0.75, length=0.45)
    for j, m in enumerate((58, 62, 65, 70, 74, 77, 82, 86)):     # a harp glissando that lands on the hit
        hrp(b, th - 0.24 + 0.03 * j, m, 0.22 + 0.03 * j, p=-0.45)
    tpt(b, th + 0.008, 77, 0.16, 0.58, scoop=-25.0, vib=0.0)
    tpt(b, th + 0.012, 74, 0.16, 0.42, scoop=-20.0, vib=0.0, p=-0.15)
    glk(b, th + 0.01, 82, 0.38, dur=1.2)
    snp(b, th, 0.4, p=0.0)
    ce(s02[0], "'...and a clown': the music holds its breath (one high tremolo); 'suit.': a COMIC HIT in Bb major (a harp glissando lands "
               "on a pizz chord, a short clean muted-trumpet stab, glockenspiel, bass, a snap)")

    SEC["ride"] = (n08[0], i01[0])
    Rd = Grid("ride", n08[0], i01[0], bpm=118.0)
    prog = [(46, [58, 62, 65, 69]), (41, [57, 60, 65, 69]), (43, [58, 62, 65, 67]), (48, [58, 60, 64, 67])]   # Bbmaj7 F/A Gm7 C7sus
    for k in range(Rd.nb):
        root, tones = prog[(k // 2) % 4]
        t = Rd.t(k)
        for off, vel in ((0.0, 0.55), (0.75, 0.42)) if k % 2 == 0 else ((0.5, 0.45),):   # syncopated bass: 1, a-of-1, and-of-2
            bass(b, t + off * Rd.bl, root, vel, length=0.22)
        for e in range(2):                                   # harp + pizz 8th arpeggio
            m = tones[(2 * k + e) % 4]
            hrp(b, t + e * 0.5 * Rd.bl, m + 12, 0.28, p=-0.45)
            if e == 1:
                pz(b, t + 0.5 * Rd.bl, m, 0.3, dur=0.18, p=-0.25, bright=0.6)
        if k % 2 == 1:
            brush(b, t, 0.3)
        for e in range(4):
            shk(b, t + e * 0.25 * Rd.bl, 0.24 + (0.06 if e == 0 else 0.0), accent=(e == 0))
        if k % 2 == 0:
            tick(b, t + 0.002, 0.18, hi=True)                # the clock tower (an hour goes by): a light tick
    gl = [(0.5, 77), (1.0, 79), (1.5, 81), (2.5, 77), (4.5, 74), (5.0, 77), (5.5, 76), (6.5, 72)]
    for bt, m in gl:
        if Rd.t(bt) < i01[0] - 0.1:
            glk(b, Rd.t(bt), m + 12, 0.18, dur=0.5, p=0.3)
    ce(n08[0], f"RIDE ({Rd.bpm():.0f} BPM): the hour of riding: a bouncy syncopated bass, harp + pizz 8th arpeggios (Bbmaj7 F/A Gm7 C7sus), "
               "brushes on 2 and 4, shaker 16ths, a light clock tick, a glockenspiel line")

    SEC["interviews"] = (i01[0], n10[0])
    Iv = Grid("interviews", i01[0], p01[0] - 0.05, bpm=118.0)
    ivp = [(43, [55, 58, 62]), (45, [57, 61, 64]), (46, [58, 62, 65]), (45, [57, 61, 64])]
    for k in range(Iv.nb):
        root, tones = ivp[(k // 4) % 4]
        t = Iv.t(k)
        if k % 2 == 0:
            bass(b, t, root, 0.32, length=0.18, cello=False)
        pz(b, t + 0.5 * Iv.bl, tones[k % 3] + 12, 0.24, dur=0.14, p=-0.3, bright=0.6)   # off-beat dabs, very light
        for e in range(2):
            shk(b, t + e * 0.5 * Iv.bl, 0.15, accent=(e == 0))
    for a_, z_ in ((i01[1], f01[0]), (f01[1], h01[0]), (h01[1], p01[0])):   # tiny bright dabs only in the breaths between speakers
        if z_ - a_ > 0.06:
            glk(b, a_ + 0.01, 81, 0.2, dur=0.35)
    chord_str(b, p01[0], [81], p01[1] - p01[0] + 0.1, 0.2, harmonics=True, att=0.2, rel=0.3)   # under "Sorry... what clown?": one held note
    tb = p01[1] + 0.012                                      # the button: a low pizz + bassoon 'plonk'
    bass(b, tb, D2 - 5, 0.55, length=0.3)
    bsn(b, tb + 0.005, 33, 0.35, 0.42)
    ce(i01[0], f"INTERVIEWS ({Iv.bpm():.0f} BPM): light and quick, out of the dialogue's way: off-beat pizz dabs, a soft bass, shaker; tiny "
               "glockenspiel dabs only in the breaths between the four voices; it STOPS under 'Sorry... what clown?' (one held harmonic) and a "
               "low pizz + bassoon 'plonk' buttons it")

    n_end = n11[0] if n11 else n12[0]                         # p3: the number holds to "Many" (S13's hard cut), not to n12
    rel_n = 0.07 if n11 else 0.3
    SEC["number"] = (n10[0], n_end)
    Nm = Grid("number", n10[0], n_end, bpm=80.0)
    chord_str(b, n10[0], [50, 55, 58, 69], n_end - n10[0], 0.36, att=0.6, rel=rel_n, bright=0.45)   # Gm(add9)/D, held
    t14 = Wd("1", n10[0])[0]
    chord_str(b, t14, [57, 62, 64, 67], n_end - t14, 0.3, trem=0.4, att=0.4, rel=rel_n, inst="harmo", harmonics=False, bright=0.6)  # A7sus over it
    for k in range(Nm.nb):
        if k % 2 == 0 and Nm.t(k) < n_end - 0.3:
            bass(b, Nm.t(k), D2, 0.36, length=0.45)
    a_, z_ = gap_after(Wd("out", n10[0])[0])
    for j, m in enumerate((69, 74, 76)):                     # the questioning celesta: up, unresolved
        cel(b, a_ + 0.01 + 0.14 * j, m + 12, 0.3, dur=1.0, p=0.35)
    cel(b, n10[1] + 0.01, 81, 0.24, dur=0.8 if n11 else 1.2)
    chord_str(b, n10[0], [81, 88], n_end - n10[0], 0.16, harmonics=True, att=0.8, rel=rel_n, air=0.12)
    ce(n10[0], f"THE NUMBER ({Nm.bpm():.0f} BPM, half-time): incredulous: a held Gm(add9)/D, an A7sus tremolo from '1 in 4', a half-time "
               "bass, a questioning celesta (A D E, unresolved) after 'straight out,'" + ("; it stops on S13's hard cut at 'Many'" if n11 else ""))

    if n11:
        # p3: "Many spun around to look." (the restored line, S13: hard cut on "Many", the spin on "spun around"). The audit's
        # p1: the score sat on a D pedal in 10 of 13 sections; this bar LEAVES D for Bb (a new floor before the mystery).
        SEC["spun"] = (n11[0], n12[0])
        t_m, t_sp = n11[0], Wd("spun", n11[0])[0]
        t_lk = Wd("look", n11[0])[0]
        for j, m in enumerate((46, 53, 58, 62)):             # "Many": a bright staccato Bb-major pizz chord on the cut
            pz(b, t_m + 0.004 * j, m, 0.5, dur=0.3, p=-0.3 + 0.2 * j, bright=0.65)
        bass(b, t_m, 34, 0.5, length=0.35)
        for j, m in enumerate((58, 62, 65, 70, 74, 77, 82)):  # "spun around": a quick harp glissando up (the turn)
            hrp(b, t_sp + 0.035 * j, m, 0.2 + 0.03 * j, p=-0.45 + 0.12 * j)
        chord_str(b, t_sp + 0.22, [58, 62, 65, 69], n12[0] - t_sp - 0.12, 0.26, trem=0.45, att=0.35, rel=0.15, bright=0.6)   # Bbmaj7, held
        bass(b, t_lk, 34, 0.34, length=0.5, cello=True)
        glk(b, t_lk + 0.01, 81, 0.2, dur=0.7, p=0.3)
        ce(n11[0], "SPUN (p3, the restored line): a staccato Bb-major pizz chord on 'Many' (S13's hard cut), a quick harp glissando up on "
                   "'spun around', a held Bbmaj7 tremolo under 'to look.' (the score leaves its D floor for one bar)")

    SEC["mystery"] = (n12[0], n14[0])
    My = Grid("mystery", n12[0], n14[0], bpm=72.0)
    t_you_see = n13[0]
    chords = [(n12[0], [50, 53, 57, 61]), (Wd("music", n12[0])[0], [46, 50, 57, 64]), (t_you_see, [46, 55, 58, 64]),
              (Wd("someone", n13[0])[0], [45, 49, 55, 58])]                                   # Dm(maj7) Bbmaj7#11 Gm6/Bb A7b9
    for k, (t, ms) in enumerate(chords):
        t1 = chords[k + 1][0] if k + 1 < len(chords) else n14[0]
        chord_str(b, t, ms, t1 - t + 0.35, 0.3, trem=0.5, att=0.5, rel=0.35, bright=0.7)
    chord_str(b, n12[0], [81, 88], n14[0] - n12[0] + 0.3, 0.16, harmonics=True, att=1.0, rel=0.4, air=0.12)   # breath of air on top
    arp = [86, 81, 89, 88, 86, 81, 84, 85]                                                       # harp harmonics, one a beat
    for k in range(My.nb):
        t = My.t(k)
        hrp(b, t, arp[k % 8] - 12, 0.22, harmonic=True, p=-0.4 + 0.1 * (k % 4))
        swirl(b, t, My.bl * 0.95, 0.2)
        bass(b, t, D2 if t < chords[3][0] else A1, 0.3, length=0.25, cello=False)                # the soft heartbeat: 1 ...
        if k % 2 == 0:
            bass(b, t + 0.32 * My.bl, D2 if t < chords[3][0] else A1, 0.2, length=0.2, cello=False)  # ... and its echo
    motif = [(0.0, 74), (0.35, 77), (0.7, 76), (1.05, 73)]                                      # the mystery motif: D F E C#
    for st_ in (gap_after(Wd("part", n12[0])[0])[0], t_you_see + 0.5):
        for dt, m in motif:
            cel(b, st_ + 0.01 + dt, m + 12, 0.24, dur=0.9, p=0.35)
    ce(n12[0], f"MYSTERY ({My.bpm():.0f} BPM): hushed, leaning in: soft tremolo strings (Dm(maj7) -> Bbmaj7#11 on 'music' -> Gm6/Bb on 'You see,' "
               "-> A7b9 on 'someone'), harp harmonics one a beat, a soft heartbeat bass, the celesta mystery motif (D F E C#) after 'weird part:' "
               "and after 'You see,'")

    SEC["money"] = (n14[0], t_money_end + 0.03)
    Mo = Grid("money", n14[0], n17[0], nb=20)
    mprog = [(50, 45), (46, 53), (43, 50), (45, 49), (50, 45)]                                  # Dm | Bb | Gm | A7 | Dm-A7: bar roots
    tip = [0, 7, 12, 7, 3, 7, 1, 7]                                                              # the tiptoe 8ths (semitones over the root)
    t_snaps = Wd("sneakier", n14[0])[1]
    t_shk = n15[0]
    t_duck = Wd("ducked", n15[0])[0]
    for bar in range(5):
        root, _ = mprog[bar]
        for e in range(8):
            t = Mo.t(bar * 4 + e * 0.5)
            if t >= t_money_end:
                continue
            u = (bar * 8 + e) / 40.0
            if e % 2 == 0 or bar >= 2:                                                           # tiptoe: 4ths first, all 8ths from bar 3
                pz(b, t, root + tip[e] - 12 + (12 if root < 46 else 0), (0.38 + 0.3 * u) * (1.0 if e % 2 == 0 else 0.75), dur=0.16, p=-0.3,
                   bright=0.55)
            if e % 2 == 0:
                bsn(b, t, root - 12 + tip[e] + (12 if root < 46 else 0), Mo.bl * 0.3, 0.3 + 0.25 * u)
            if t >= t_snaps and e in (2, 6):
                snp(b, t, 0.3 + 0.25 * u, p=-0.35 if e == 2 else 0.35)
            if t >= t_shk:
                shk(b, t, 0.2 + 0.15 * u, accent=(e % 2 == 0))
                shk(b, t + 0.25 * Mo.bl, 0.14 + 0.1 * u)
        bass(b, Mo.t(bar * 4), root - 12, 0.45 + 0.2 * bar / 4, length=0.3)
    for j, m in enumerate((86, 81, 77, 74, 69)):                                                 # "ducked": a quick pizz dip downward
        pz(b, t_duck + 0.045 * j, m - 12, 0.4, dur=0.15, p=-0.4 + 0.2 * j, bright=0.6)
    counter = [(12.0, 77), (13.0, 76), (14.0, 74), (14.5, 73), (16.0, 74), (17.0, 77), (18.0, 81), (18.5, 82)]
    for bt, m in counter:
        if Mo.t(bt) < t_money_end:
            cel(b, Mo.t(bt), m + 12, 0.24, dur=0.7)
    t_cr = n16[0]
    chord_str(b, t_cr, [45, 52, 57, 61, 64], t_money_end - t_cr + 0.04, 0.42, trem=0.6, att=t_money_end - t_cr, rel=0.05, bright=0.7,
              swell=lambda tt_: 0.25 + 0.75 * np.clip(tt_ / max(0.1, t_money_end - t_cr), 0, 1) ** 1.6)
    ce(n14[0], f"MONEY ({Mo.bpm():.0f} BPM, 5 bars): sneaky tiptoe: a staccato pizz figure (quarters, then all 8ths from bar 3) doubled by a "
               "staccato bassoon, finger snaps from 'sneakier.', shaker from 'Nearly everyone', a falling pizz dip on 'ducked', a celesta counter-line; "
               "an A7 tremolo swells from 'On a phone?' and the whole band STOPS dead after 'money.'")

    # =============== GROUP 4: the mind-blow and the final build (cut dead for the hush)
    b.group("g4", t_money_end + 0.03, t_hush, fade=0.035)
    SEC["mindblow"] = (n17[0], n18[0])
    pno(b, n17[0] + 0.03, 26, 0.42, dur=3.9)
    chord_str(b, n17[0] - 0.05, [69, 74, 76, 86], Wd("minds", n17[0])[0] - n17[0] + 0.2, 0.3, harmonics=True, att=0.9, rel=0.4, air=0.1)   # A D E (D): suspended
    t_minds = Wd("minds", n17[0])[0]
    chord_str(b, t_minds, [70, 74, 76, 81, 86], n18[0] - t_minds + 0.1, 0.3, harmonics=True, att=0.7, rel=0.2, air=0.1)        # Bb colour: wonder
    for t, m in ((Wd("bodies", n17[0])[0] + 0.25, 88), (t_minds + 0.05, 86), (t_minds + 0.9, 81)):
        cel(b, t, m, 0.22, dur=1.6, p=0.3)
    ce(n17[0], "MIND-BLOW: almost everything drops: a soft low piano D, glassy string harmonics (A D E), three slow celesta notes; on "
               "'minds' the harmony turns to a Bb colour (wonder)")

    SEC["end"] = (n18[0], t_hush)
    E = Grid("end", n18[0], t_hush, bpm=122.0)
    for k in range(int(E.nb * 2)):
        t = E.t(k * 0.5)
        u = k / max(1, E.nb * 2 - 1)
        bar = k // 8
        m = [50, inner[min(3, bar + 2)], 53, inner[min(3, bar + 2)]][k % 4] + (12 if k >= E.nb else 0)
        pz(b, t, m, 0.4 + 0.4 * u, dur=0.18, p=-0.35 + 0.1 * (k % 2))
        tick(b, t + 0.002, 0.2 + 0.2 * u, hi=(k % 2 == 0))
        shk(b, t, 0.2 + 0.2 * u, accent=(k % 2 == 0))
        shk(b, t + 0.25 * E.bl, 0.15 + 0.15 * u)
        if k % 2 == 0:
            bass(b, t, D2 if k < E.nb else A1 + 12, 0.45 + 0.35 * u, length=0.25)
    chord_str(b, n18[0], [57, 62, 64, 69], t_hush - n18[0], 0.45, trem=0.6, att=t_hush - n18[0], rel=0.02, bright=0.8,
              swell=lambda tt_: 0.2 + 0.8 * np.clip(tt_ / max(0.1, t_hush - n18[0]), 0, 1) ** 2)
    glk(b, Wd("five", n18[0])[0] + 0.01, 81, 0.26, dur=0.6)
    glk(b, Wd("clown", n18[0])[0] + 0.01, 86, 0.3, dur=0.6)
    ce(n18[0], f"END ({E.bpm():.0f} BPM): a quick build on the quiz's ostinato (faster, rising, clock + shaker), a rising tremolo, "
               "glockenspiel pings on 'five' and 'clown'; CUT DEAD after 'clown.'")
    SEC["hush"] = (t_hush, n19[0])
    ce(t_hush, "HUSH: silence")
    SEC["rewind"] = (n19[0], DUR)
    b.group("g5", n19[0], DUR, fade=0.003)
    ce(n19[0], "REWIND: a tape rewind of the quiz music (reversed, fast, pitching down) under 'Did you see the'; a reversed-reverb SWELL of the "
               "frame-0 chord through 'money?' to the seam; the music STOPS on the last sample (frame 0's downbeat answers it)")
    b.sections = [(k, round(a, 3), round(z, 3)) for k, (a, z) in SEC.items()]
    b.marks = dict(t_hush=t_hush, n19=n19, t_money_end=t_money_end, q_end=q_end, money_word=Wd("money", n19[0]))
    return b


# ---------------------------------------------------------------- render
SECTION_TARGET = {"quiz": -16.0, "answer": -17.0, "turn": -20.0, "origin": -18.0, "suit": -15.0, "ride": -16.5, "interviews": -21.0,
                  "number": -20.0, "spun": -19.0, "mystery": -22.0, "money": -18.0, "mindblow": -27.5, "end": -16.0, "rewind": -19.0}   # LU under the voice
# p3: "suit" -14 -> -15 (the hit now lands under the student's "clown"); "mindblow" -23.5 -> -27.5 (the audit's p2: the
# near-silence under "Their bodies dodged it..." was only 4 LU under the money section; near-silence is 8-10 LU down)


def _hall():
    return make_ir(1.45, 23, pre=0.018, hf=1.35, early=[(0.013, 0.35, -0.5), (0.021, 0.3, 0.45), (0.034, 0.22, -0.2)])


def _render_groups(b, ref=-20.0):
    """dry + hall per group, each group gated to its own span; instrument balance set across the whole film"""
    ir = _hall()
    inst_gain = {}
    for inst in {i for _, i in b.tr}:
        tot = sum(x for (g, i), x in b.tr.items() if i == inst)
        Lx = integrated(tot)
        inst_gain[inst] = dbg(ref + TRACKS.get(inst, (0.2, -8.0))[1] - Lx) if np.isfinite(Lx) else 1.0
    out = np.zeros((2, N))
    per_group = {}
    t = np.arange(N) / SR
    for gname, (a, z, fade) in b.groups.items():
        dry = np.zeros((2, N))
        wet = np.zeros(N)
        for (g, inst), x in b.tr.items():
            if g != gname:
                continue
            x = x * inst_gain[inst]
            if inst == "bass":
                x = I.saturate(x, *BASS_DRIVE)
            dry += x
            wet += TRACKS.get(inst, (0.2, 0))[0] * x.mean(0)
        y = dry + 0.85 * convolve_st(wet, ir)
        gate = np.clip((t - a) / 0.002, 0, 1) * np.clip((z - t) / max(fade, 1e-4), 0, 1)
        y = y * gate[None, :]
        per_group[gname] = y
        out += y
    return out, per_group


def _rewind(src, a, z, rate0=4.0, rate1=0.55):
    """a tape rewind: src (stereo) read BACKWARDS at a speed falling from rate0 to rate1 between a and z (s): pitch and
    tempo fall together; a low-pass follows the speed (a slowing tape loses its top), a little flutter. Stereo, len z-a."""
    n = ns(z - a)
    u = np.linspace(0, 1, n)
    rate = rate0 * (rate1 / rate0) ** u * (1 + 0.006 * np.sin(2 * np.pi * 7.0 * np.arange(n) / SR))
    rev = src[:, ::-1]
    pos = np.cumsum(rate)
    pos = pos - pos[0]
    pos = np.clip(pos, 0, rev.shape[1] - 2)
    y = np.stack([np.interp(pos, np.arange(rev.shape[1]), rev[c]) for c in range(2)])
    lo = lp(y, 2400.0, 2)
    hi_ = y - lo
    w = np.clip((rate - rate1) / (rate0 - rate1), 0, 1)                   # bright while fast, dull as it slows
    y = lo + hi_ * (0.25 + 0.75 * w)[None, :]
    env = np.minimum(1, np.arange(n) / ns(0.03)) * np.clip((n - np.arange(n)) / ns(0.12), 0, 1)
    return y * env[None, :]


def _swell(b, length):
    """the reversed-reverb swell of the frame-0 chord (the D-minor quiz downbeat): the chord through a long hall, its
    tail reversed so it grows into the downbeat. Stereo, `length` s, ending at full swell."""
    n = ns(length)
    x = np.zeros((2, ns(0.6)))
    for j, m in enumerate((50, 57, 62, 65, 69, 74)):
        place(x, pan(I.pizz_section(F(m), 0.6, _r(), dur=0.5, bright=0.6), -0.5 + 0.2 * j), 0.004 * j)
    place(x, pan(I.celesta(F(81), 0.5, _r(), dur=0.6), 0.35), 0.0)
    place(x, pan(I.bass_pizz(F(D2), 0.6, _r(), length=0.5), 0.0), 0.0)
    ir = make_ir(2.6, 41, length=length + 0.2, pre=0.01, hf=0.9)
    wet = convolve_st(np.concatenate([x, np.zeros((2, n))], axis=1), ir)[:, : n + x.shape[1]]
    tail = wet[:, x.shape[1] // 3: x.shape[1] // 3 + n]
    if tail.shape[1] < n:
        tail = np.pad(tail, ((0, 0), (0, n - tail.shape[1])))
    y = tail[:, ::-1]
    # p3: a reversed tail grows ~40 dB over 1.8 s, so under "money?" it measured -57.7 LUFS (inaudible). Its own growth is
    # compressed (divided by 92 % of its smoothed envelope) and a gentle rise put on: soft but present under the word,
    # the same level at the seam (render() matches the last 0.4 s to frame 0's downbeat)
    from scipy import ndimage
    e = np.sqrt(ndimage.uniform_filter1d(y.mean(0) ** 2, ns(0.08), mode="nearest")) + 1e-9
    y = y / (e / e.max())[None, :] ** 0.92
    u = np.linspace(0.0, 1.0, n)
    y = y * ((0.5 + 0.5 * u ** 1.3) * np.clip(u * n / ns(0.15), 0, 1))[None, :]
    return y


def _voice():
    x, sr = read_wav(os.path.join(VDIR, "voice.wav"))
    v = np.zeros((2, N))
    m = min(N, x.shape[1])
    v[:, :m] = x[:, :m] if x.shape[0] == 2 else np.stack([x[0, :m], x[0, :m]])
    return v


def section_levels(y, v, sections):
    """per section: music LUFS, voice LUFS (over the same span), the difference"""
    rows = []
    for name, a, z in sections:
        i0, i1 = ns(a), ns(z)
        Lm = integrated(y[:, i0:i1]) if z - a > 0.45 else -np.inf
        Lv = integrated(v[:, i0:i1]) if z - a > 0.45 else -np.inf
        rows.append((name, a, z, Lm, Lv))
    return rows


def render(b, ref=-20.0, level_to_voice=True):
    """the score as one stereo array of exactly N samples (the film length), levelled per section against the voice
    (SECTION_TARGET LU under it), with the hush, the rewind, the swell and the stop at the seam"""
    y, G = _render_groups(b, ref)
    y = shelf(y, AIR[0], AIR[1], "high")
    y = hp(y, 32.0, 2)
    mk = b.marks
    # the rewind (under "Did you see the") and the swell (through "money?" to the seam), from the quiz's own sound
    a_rw, z_rw = mk["n19"][0] + 0.005, mk["money_word"][0] - 0.06
    e3 = e3_marks()                        # p3: the picture cuts into the rewind IN THE HUSH (E3 'cut', before "Did you"): the
    if e3 and mk["t_hush"] <= e3["cut"] / 30.0 < a_rw:     # tape rewinds the film's own sound from that cut, with the whirr
        a_rw = e3["cut"] / 30.0 + 0.003
    fz = e3_freeze()                       # phase B: the picture FREEZES on the first duck: the tape stops there (the swell
    if fz and a_rw + 0.2 < fz[0] < z_rw:   # then rises out of the freeze's quiet)
        z_rw = fz[0] + 0.03
    src = G["g1"][:, : ns(mk["q_end"])]
    rw = _rewind(src, a_rw, z_rw)
    place(y, rw * dbg(-5.0), a_rw)
    sw_a = mk["money_word"][0] - 0.45
    sw = _swell(b, DUR - sw_a)
    Ls, Lq = integrated(sw[:, -ns(0.4):]), integrated(G["g1"][:, : ns(1.0)])
    place(y, sw * dbg(Lq - Ls - 3.0) if np.isfinite(Ls) else sw, sw_a)
    # silence outside the groups' spans (the hush) and the stop at the seam: a 3 ms de-click on the last samples only
    y[:, ns(mk["t_hush"]): ns(a_rw)] = 0.0
    k = ns(0.003)
    y[:, -k:] *= np.linspace(1, 0, k)[None, :]
    rows = []
    if level_to_voice:
        v = _voice()
        Lv_all = integrated(v)
        g = np.full(N, np.nan)                 # samples between two sections take the NEXT section's gain (else the previous one's)
        t = np.arange(N) / SR
        for name, a, z, Lm, Lv in section_levels(y, v, b.sections):
            if name == "hush" or not np.isfinite(Lm):
                continue
            ref_v = Lv if np.isfinite(Lv) else Lv_all
            gain = ref_v + SECTION_TARGET.get(name, -18.0) - Lm
            k_ = (t >= a) & (t < z)
            g[k_] = gain
            rows.append((name, a, z, gain))
        idx = np.flatnonzero(np.isfinite(g))
        nxt = np.searchsorted(idx, np.arange(N))
        fill_next = g[idx[np.minimum(nxt, len(idx) - 1)]]
        g = np.where(np.isfinite(g), g, fill_next)
        # ramps of 40 ms at section edges (the groups' own cuts already sit there), never across the seam
        from scipy import ndimage
        g = ndimage.uniform_filter1d(g, ns(0.04), mode="nearest")
        assert np.all(np.isfinite(g))
        y = y * dbg(g)[None, :]
    return y, rows


def sync_points():
    return {"bl_light": 0.5, "bl_money": 0.55}


SECTIONS = []


if __name__ == "__main__":
    import sys
    import time
    from dsp import write_wav, true_peak
    t0 = time.time()
    b = build()
    y, rows = render(b)
    out = os.path.join(HERE, "music_v2.wav")
    write_wav(out, y)
    json.dump({"voice_dir": VDIR, "frames": FRAMES, "samples": N, "sections": b.sections, "cues": b.cues,
               "gains_db": [(n, a, z, round(g, 2)) for n, a, z, g in rows]}, open(os.path.join(HERE, "music_v2_map.json"), "w"), indent=1)
    print(f"music_v2.wav: {N} samples = {N / SR:.3f} s = {FRAMES} frames (voice {VDIR}); {integrated(y):.1f} LUFS, TP {true_peak(y):.1f} dBTP; "
          f"{len(b.tr)} tracks; {time.time() - t0:.0f} s")
    for n, a, z, g in rows:
        print(f"   {n:<11} {a:6.2f}-{z:6.2f}  section gain {g:+.1f} dB")
