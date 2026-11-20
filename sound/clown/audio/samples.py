# SAMPLE PLAYBACK for the sound of "The Clown Nobody Saw" (fix round 1: real recorded / generated effects instead of
# bare synthesis). Two sources, both listed with author, link and licence in CREDITS.txt:
#   _lib/  CC0 recordings copied from the sound-effects reference library (lib_setup.py)
#   _el/   ElevenLabs sound-effect generations made for this film (el_batch.py; SFX only, never voice)
# What it does: load (48 kHz mono, cached), trim to the sound, cut a multi-event take into single events by onset
# (steps, pencil strokes, honks), rotate takes so a repeated cue is never the same file twice, vary pitch by up to +-1
# semitone, fade, and filter by distance (far = quieter and duller). Every sound comes back with its SYNC POINT (the
# onset, or the peak for a whoosh), so sfx.py can land that point on the picture frame and check it (sync_check()).
# A missing file is never fatal: get() returns None and the caller falls back to the synthesized version.
import json
import os
import numpy as np
from scipy import signal, ndimage
from dsp import SR, ns, read_wav, fades, lp, hp

HERE = os.path.dirname(os.path.abspath(__file__))
EL = os.path.join(HERE, "_el")
LIB = os.path.join(HERE, "_lib")
_CACHE = {}
USED = {}                              # file -> how many times it was played in this run (for CREDITS / the report)


def _path(name):
    for d in (LIB, EL):
        p = os.path.join(d, name + ".wav")
        if os.path.exists(p):
            return p
    return None


def has(name):
    return _path(name) is not None


def load(name):
    """the whole file as mono float at 48 kHz, peak 1 (None if missing)"""
    if name in _CACHE:
        return _CACHE[name]
    p = _path(name)
    if p is None:
        _CACHE[name] = None
        return None
    x, sr = read_wav(p)
    x = x.mean(0)
    if sr != SR:
        from math import gcd
        k = gcd(SR, sr)
        x = signal.resample_poly(x, SR // k, sr // k)
    k = ns(0.004)                       # mp3 decoders leave a click / pre-ring at the very ends
    x[:k] *= np.linspace(0, 1, k)
    x[-k:] *= np.linspace(1, 0, k)
    x = x / (np.max(np.abs(x)) + 1e-12)
    _CACHE[name] = x
    return x


def env(x, win=0.004):
    """smoothed magnitude envelope"""
    return ndimage.uniform_filter1d(np.abs(x), max(1, ns(win)), mode="nearest")


def onset(x, thr_db=-14.0):
    """seconds from the start of x to its onset: the first time the 2 ms envelope comes within thr_db of its peak"""
    e = env(x, 0.002)
    return float(np.argmax(e >= e.max() * 10 ** (thr_db / 20.0))) / SR


def peak_t(x):
    """seconds from the start of x to the peak of its 20 ms envelope (the sync point of a whoosh)"""
    return float(np.argmax(env(x, 0.02))) / SR


def trim(x, thr_db=-42.0, pre=0.003, post=0.03):
    """cut the silence off both ends (relative to the peak), keeping `pre` s before the first sound"""
    e = env(x, 0.003)
    on = np.flatnonzero(e >= e.max() * 10 ** (thr_db / 20.0))
    if not len(on):
        return x
    a, z = max(0, on[0] - ns(pre)), min(len(x), on[-1] + ns(post))
    return fades(x[a:z], 0.001, min(0.02, post))


def events(x, thr_db=-22.0, min_gap=0.07, pre=0.004, min_len=0.03, max_len=0.6, tail_db=-36.0):
    """cut a take that holds several events (steps, pencil strokes, squeezes) into single events by onset: a new event
    starts where the 5 ms envelope rises through thr_db (re the take's peak) after at least min_gap s below it. Each
    piece runs to where its tail falls below tail_db (or to the next onset) and is faded. Returns [array]."""
    e = env(x, 0.005)
    pk = e.max()
    up = e >= pk * 10 ** (thr_db / 20.0)
    d = np.diff(np.concatenate([[0], up.astype(np.int8)]))
    starts = np.flatnonzero(d == 1)
    keep = []
    for s in starts:
        if not keep or (s - keep[-1]) / SR >= min_gap:
            keep.append(s)
    out = []
    lo = pk * 10 ** (tail_db / 20.0)
    for i, s in enumerate(keep):
        nxt = keep[i + 1] - ns(pre) if i + 1 < len(keep) else len(x)
        end = min(nxt, s + ns(max_len))
        q = np.flatnonzero(e[s:end] >= lo)
        z = s + (q[-1] + ns(0.015) if len(q) else ns(min_len))
        z = min(max(z, s + ns(min_len)), end)
        a = max(0, s - ns(pre))
        seg = x[a:z]
        if len(seg) >= ns(min_len):
            out.append(fades(seg / (np.max(np.abs(seg)) + 1e-12), 0.001, min(0.02, len(seg) / SR / 4)))
    return out


def pitch(x, semis):
    """play at `semis` semitones (resampled: higher = shorter). Use within +-1 semitone for repeats."""
    if not semis:
        return x
    rate = 2 ** (semis / 12.0)
    n = len(x)
    m = max(8, int(n / rate))
    return np.interp(np.arange(m) * rate, np.arange(n), x)


def distance(x, d, ref=6.0, power=1.1, near_hz=13000.0, far_hz=2200.0, far_m=26.0):
    """a source d metres away, re `ref` metres: quieter ((ref / d) ** power) and duller (the low-pass closes from
    near_hz at ref to far_hz at far_m). Near walkers are louder AND brighter, far ones are a soft low patter."""
    d = max(float(d), 0.5 * ref)
    u = np.clip((np.log(d) - np.log(ref)) / (np.log(far_m) - np.log(ref)), 0, 1)
    fc = float(np.exp(np.log(near_hz) + (np.log(far_hz) - np.log(near_hz)) * u))
    return lp(x, fc, 2) * (ref / d) ** power


# ---------------------------------------------------------------- the registry
# logical sound -> how to get its takes. "files": whole (trimmed) files; "cut": files that hold several events, cut by
# onset; "pick": keep only pieces between these lengths (s). Takes rotate in the order found.
REG = {
    # ---- steps on brick (single steps cut out of the walking takes): three shoe types
    "step_soft": dict(cut=["step_soft_1", "step_soft_2", "step_soft_3"], pick=(0.05, 0.45), thr=-20.0, gap=0.16, what="one step, soft rubber-soled sneakers on brick"),
    "step_hard": dict(cut=["step_hard_1", "step_hard_2", "step_hard_3"], pick=(0.05, 0.45), thr=-20.0, gap=0.16, what="one step, hard leather soles on brick"),
    "step_slow": dict(cut=["step_slow_1", "step_slow_2"], pick=(0.05, 0.5), thr=-20.0, gap=0.16, what="one slow strolling step, canvas shoes on brick"),
    # ---- pencil on a clipboard
    "pencil_tick": dict(cut=["pencil_ticks_1", "pencil_ticks_2", "pencil_ticks_3"], pick=(0.06, 0.3), thr=-14.0, gap=0.12, what="one pencil check mark (stroke + flick)"),
    "pencil_cross": dict(cut=["pencil_cross_1", "pencil_cross_2", "pencil_cross_3"], pick=(0.06, 0.3), thr=-14.0, gap=0.12, what="one pencil stroke of an X"),
    "pencil_one": dict(files=["pencil_one_1", "pencil_one_2"], what="one firm single check mark"),
    # ---- paper and wood
    "page_slide": dict(files=["fs-702773-swipe-wav", "page_slide_1", "page_slide_2"], what="a page / card sliding in (CC0 swipe, then two generated slide-and-tap takes)"),
    "page_land": dict(files=["fs745291"], what="a page / card landing: a soft knock"),
    "peg": dict(files=["peg_3", "peg_2", "peg_1"], what="a wooden clothes peg snapping shut"),
    "bill_flick": dict(files=["bill_flick_1", "bill_flick_2", "bill_flick_3"], what="one paper banknote flapping once"),
    "bills_bed": dict(files=["bills_bed_1", "bills_bed_2"], whole=True, what="banknotes fluttering gently (a loopable bed)"),
    "bill_hair": dict(files=["bill_hair_1", "bill_hair_2"], what="paper dragging slowly through hair"),
    "stamp": dict(files=["stamp_1", "stamp_2"], what="a rubber stamp thumped onto paper"),
    # ---- bodies, cloth, leaves, birds
    "duck_cloth": dict(files=["duck_cloth_1", "duck_cloth_2", "duck_cloth_3", "duck_cloth_4"], what="a quick cloth swish of a person ducking"),
    "leaf_brush": dict(files=["leaf_brush_1", "leaf_brush_2", "leaf_brush_3"], what="a head brushing under fresh leaves"),
    "whoosh_body": dict(files=["fs-127197-fast-simple-chop-5-aif", "fs830856", "kit-whoosh", "fs-786514-swoosh-v2", "fs393811", "fs-683101-quick-woosh"],
                        what="short body-move whooshes, six different real ones"),
    "spin_scuff": dict(files=["spin_scuff_1", "spin_scuff_2"], what="a shoe scuff + cloth as someone spins round"),
    "pigeon": dict(files=["pigeon_1", "pigeon_2", "pigeon_3"], what="a pigeon taking off: a burst of wing flaps"),
    # ---- the clown
    "horn": dict(files=["horn_low_1", "horn_low_2", "horn_low_3", "horn_b", "horn_1", "horn_3", "horn_2", "horn_5", "horn_4"],
                 what="bulb-horn honk-honk takes at five different pitches (see honk())"),
    "tyre_roll": dict(files=["tyre_roll_1", "tyre_roll_2"], whole=True, what="a small rubber tyre rolling on brick (a loopable bed)"),
    "squeak": dict(cut=["squeak_1", "squeak_2", "squeak_3", "squeak_a"], pick=(0.04, 0.5), thr=-16.0, gap=0.1, what="one soft saddle / pedal squeak"),
    "boing": dict(files=["boing_3", "boing_2", "boing_1"], what="a soft comic boing"),
    # ---- voices that must stay wordless
    "murmur_f": dict(files=["murmur_gib_f_1", "murmur_f_1", "murmur_f_2"], whole=True, what="a woman on a phone, muffled and wordless (always played through the 250-1500 Hz muffle)"),
    "murmur_m": dict(files=["murmur_gib_m_1", "murmur_m_2", "murmur_m_1"], whole=True, what="a man on a phone, muffled and wordless (always played through the muffle)"),
    "crowd": dict(files=["crowd_1", "crowd_2"], whole=True, what="soft far campus crowd murmur (a loopable bed)"),
    "crowd_ooh": dict(files=["crowd_ooh_1", "crowd_ooh_2"], what="a small group's soft surprised 'ooh'"),
    "crowd_laugh": dict(files=["crowd_laugh_1", "crowd_laugh_2"], what="a small group's short warm laugh"),
    # ---- the square
    "square_amb": dict(files=["square_amb_1", "square_amb_2"], whole=True, what="sunny campus square ambience: breeze in leaves, songbirds, a far fountain (a loopable bed)"),
    "clock": dict(files=["clock_1", "clock_2"], what="a tower clock mechanism whirring, then a tock"),
    "headphones": dict(files=["headphones_1", "headphones_2"], whole=True, what="tinny music leaking from headphones"),
    # ---- camera whooshes, three lengths (CC0 recordings first, then one generated take each)
    "cam_whoosh_s": dict(files=["fs-816262-broomstick-whoosh-3-quiet-okm1", "cam_whoosh_s_1"], what="camera whoosh, short (~0.4-0.5 s)"),
    "cam_whoosh_m": dict(files=["fs-702773-swipe-wav", "cam_whoosh_m_1"], what="camera whoosh, medium (~0.85 s)"),
    "cam_whoosh_l": dict(files=["fs-169867-swoosh", "cam_whoosh_l_1", "fs-264777-swoosh"], what="camera whoosh, long (1.6-4 s)"),
    "whoosh_mind": dict(files=["fs810485"], what="a wide analog sweep (something floating away)"),
    "whoosh_slow": dict(files=["fs-683096-woosh"], what="a slow deep woosh with a 0.39 s rise (slow motion)"),
    # ---- tension, reveal, hits
    "drone": dict(files=["drone_b_1", "drone_1", "drone_2"], whole=True, what="a soft low tension drone (a loopable bed)"),
    "low_riser": dict(files=["low_riser_1", "low_riser_2"], whole=True, what="a soft low riser, 3.5 s (END it on a hit)"),
    "riser": dict(files=["fs-685256-riser-sound-effect-short-wav", "fs-396161-scary-hits-risers-001"], whole=True, what="CC0 risers, 2.5 s and 6 s (END on a hit)"),
    "shimmer": dict(files=["shimmer_1", "shimmer_2", "shimmer_3"], whole=True, what="a rising magical shimmer ending in a soft bloom, 4.5 s"),
    "impact": dict(files=["impact_1", "impact_2", "impact_3", "kit-impact"], what="a soft low impact / whump"),
    "freeze_hit": dict(files=["freeze_hit_1", "freeze_hit_2", "freeze_hit_3", "kenney-impact-impactsoft-heavy-000", "kenney-impact-impactsoft-heavy-001", "fs524817"],
                       what="a freeze-frame hit: a muted thump (+ a tiny ping in the generated takes), no record scratch"),
    # ---- bells and small graphics
    "chime": dict(files=["chime_1", "chime_2", "chime_3", "kenney-interface-confirmation-002"], what="a happy little rising chime"),
    "glint": dict(files=["kenney-interface-glass-001"], what="a glassy glint"),
    "triangle": dict(files=["fs-349504-triangle-open-04"], what="a struck open triangle (an 'answer' ding)"),
    "pop": dict(files=["fs-824189-pop-in-sfx", "pop_2", "pop_1", "pop_3", "kit-pop"], what="a small pop for text / a title"),
    "plop": dict(files=["fs-447910-plop"], what="a tiny plop"),
    "mouth_pop": dict(files=["fs-258269-mouth-pop"], what="an organic low mouth pop"),
    "flick": dict(files=["fs393811"], what="a very short flick"),
    "tick": dict(files=["fs384187", "kit-click", "fs788933", "fs721514", "kit-tick"], what="five different real ticks / clicks"),
    # ---- SOUND v2, phase B (el_batch_v2.py): what the rebuilt film needed and the library did not have
    "tape_rewind": dict(files=["tape_rewind_1", "tape_rewind_2"], whole=True, what="a VHS tape rewinding fast in a VCR: motor whirr + tape chatter"),
    "tape_stop": dict(files=["tape_stop_1", "tape_stop_2"], what="a VCR mechanism stopping: one short click-clunk"),
    "door_open": dict(files=["door_open_1", "door_open_2"], what="an office door: the latch clicks, then the door swings with a soft creak"),
    "zip": dict(files=["zip_1", "zip_2"], what="a garment bag's zipper ripped open"),
    "bag_rustle": dict(files=["bag_rustle_1", "bag_rustle_2"], what="a plastic garment bag swung up: a short crinkly rustle"),
    "dog_yap": dict(files=["dog_yap_1", "dog_yap_2"], what="a small terrier's two happy yaps"),
    "dog_paws": dict(files=["dog_paws_1"], whole=True, what="a small dog running across brick: quick light claws"),
    "skid": dict(files=["skid_1", "skid_2"], what="a small rubber tyre skidding to a stop on brick"),
    "man_sigh": dict(files=["man_sigh_1", "man_sigh_2"], what="a man's short thoughtful sigh (wordless)"),
    "gasp_f": dict(files=["gasp_f_1", "gasp_f_2"], what="a young woman's small surprised gasp (wordless)"),
    "hm_f": dict(files=["hm_f_1", "hm_f_2"], what="a woman's short surprised 'hm' (closed lips)"),
    "laugh_m": dict(files=["laugh_m_1", "laugh_m_2"], what="a man's short cheerful chuckle (wordless)"),
    "laugh_f": dict(files=["laugh_f_1", "laugh_f_2"], what="a young woman's short delighted giggle (wordless)"),
    "yelp": dict(files=["yelp_1", "yelp_2"], what="a man's short comic startled yelp (wordless)"),
    "hand_bell": dict(files=["hand_bell_1", "hand_bell_2"], what="a small brass hand bell: ding-a-ling"),
    # ---- SOUND p3 (el_batch_p3.py): the p2 audit's misses (bright pigeons, crisp steps + a heel-scuff layer) and the
    # animators' polish effects that the library did not have
    "pigeon_b": dict(files=["pigeon_b_1", "pigeon_b_2", "pigeon_b_3"], what="a pigeon bursting into flight: bright fluttering wing claps"),
    "pigeon_settle": dict(files=["pigeon_settle_1"], what="a pigeon landing: a short soft flutter of wings settling"),
    "sneaker": dict(cut=["sneaker_steps_1"], pick=(0.05, 0.45), thr=-20.0, gap=0.16, what="one step, rubber-soled sneakers on brick (crisp scuff)"),
    "scuff": dict(cut=["heel_scuff_1"], pick=(0.05, 0.6), thr=-18.0, gap=0.15, what="one short shoe-heel scuff on stone paving (the 2-5 kHz layer)"),
    "confetti": dict(files=["confetti_1", "confetti_2"], what="a confetti popper: a soft pop, then a light papery shower"),
    "juggle_pat": dict(cut=["juggle_1"], pick=(0.03, 0.35), thr=-18.0, gap=0.08, what="one soft juggling-ball catch in a palm (a pat)"),
    "paper_crumple": dict(files=["paper_crumple_1"], what="a sheet of paper crumpled into a ball in one fist"),
    "idea_ping": dict(files=["idea_ping_1"], what="a cartoon light-bulb 'idea': a tiny click, then a bright short ding"),
}
# takes that failed their measurement (el_measure.py) or the lead's ear: never used
REJECT_PATH = os.path.join(HERE, "samples_reject.json")
try:
    REJECT = set(json.load(open(REJECT_PATH, encoding="utf-8")).get("reject", []))
except (OSError, ValueError):
    REJECT = set()
_TAKES = {}


def takes(sound):
    """[(label, array)] every usable take of a logical sound (cached); [] if none of its files exist"""
    if sound in _TAKES:
        return _TAKES[sound]
    cfg = REG[sound]
    out = []
    for f in cfg.get("files", []):
        if f in REJECT:
            continue
        x = load(f)
        if x is not None:
            out.append((f, x if cfg.get("whole") else trim(x)))
    for f in cfg.get("cut", []):
        if f in REJECT:
            continue
        x = load(f)
        if x is None:
            continue
        lo, hi = cfg.get("pick", (0.03, 0.6))
        k = 0
        for seg in events(x, thr_db=cfg.get("thr", -22.0), min_gap=cfg.get("gap", 0.07), max_len=hi):
            if lo <= len(seg) / SR <= hi and f"{f}#{k + 1}" not in REJECT:
                out.append((f"{f}#{k + 1}", seg))
            k += 1
    _TAKES[sound] = out
    return out


def count(sound):
    return len(takes(sound))


def get(sound, i=0, semis=0.0, sync="onset", fade=None, max_len=None):
    """take number i (rotating) of a logical sound, pitched by `semis`: (mono array, sync point in s, label), or None
    when the sound has no usable file (the caller then uses its synthesized fallback)"""
    T = takes(sound)
    if not T:
        return None
    label, x = T[int(i) % len(T)]
    x = pitch(x, semis)
    if max_len and len(x) > ns(max_len):
        x = fades(x[: ns(max_len)], 0.0, min(0.08, max_len / 3))
    if fade:
        x = fades(x, fade[0], fade[1])
    USED[label.split("#")[0]] = USED.get(label.split("#")[0], 0) + 1
    return x, (peak_t(x) if sync == "peak" else onset(x)), label


def bed(sound, n, r, xf=1.2, semis=(0.0,)):
    """a continuous LOOP-SAFE layer n samples long made from the whole takes of a sound: the takes are laid end to end
    in rotation with equal-power crossfades of xf seconds, starting at a random offset, and the last piece crossfades
    into the first sample (so sample n runs into sample 0). None if no file."""
    T = takes(sound)
    if not T:
        return None
    X = ns(xf)
    out = np.zeros(n + X)
    pos, k = 0, int(r.integers(len(T)))
    w_in, w_out = np.sin(0.5 * np.pi * np.linspace(0, 1, X)), np.cos(0.5 * np.pi * np.linspace(0, 1, X))
    while pos < n + X:
        label, x = T[k % len(T)]
        x = pitch(x, semis[k % len(semis)])
        if len(x) < 3 * X:
            x = np.tile(x, int(np.ceil(3 * X / len(x))) + 1)
        x = x.copy()
        x[:X] *= w_in
        x[-X:] *= w_out
        m = min(len(x), n + X - pos)
        out[pos:pos + m] += x[:m]
        USED[label] = USED.get(label, 0) + 1
        pos += len(x) - X
        k += 1
    y = out[:n].copy()                 # fold the extra xf seconds onto the start: the end runs into the beginning
    y[:X] = y[:X] * w_in + out[n:n + X] * w_out
    return y


# ---------------------------------------------------------------- the bulb horn: one squeeze at a wanted pitch
_HORN = None


def _f0(seg):
    """pitch (Hz) and harmonicity of the middle of a squeeze (autocorrelation, 150-1200 Hz)"""
    mid = seg[len(seg) // 5: max(len(seg) // 5 + 512, len(seg) * 4 // 5)]
    p = mid * np.hanning(len(mid))
    ac = np.correlate(p, p, "full")[len(p) - 1:]
    lo, hi = int(SR / 1200), min(int(SR / 150), len(ac) - 1)
    if hi <= lo:
        return 0.0, 0.0
    j = lo + int(np.argmax(ac[lo:hi]))
    return SR / j, float(ac[j] / (ac[0] + 1e-12))


def horn_squeezes():
    """every clean squeeze of every horn take: [dict(label, x, f0, midi, len)], sorted by pitch. A squeeze is kept when it
    is 50-320 ms long and clearly pitched (harmonicity >= 0.8). The takes sit at about F#4, C#5 / D5, F5, G#5 and A#5."""
    global _HORN
    if _HORN is None:
        out = []
        for f in REG["horn"]["files"]:
            if f in REJECT:
                continue
            x = load(f)
            if x is None:
                continue
            for k, seg in enumerate(events(x, thr_db=-16.0, min_gap=0.035, min_len=0.04, max_len=0.5, tail_db=-30.0)):
                f0, h = _f0(seg)
                if 0.05 <= len(seg) / SR <= 0.32 and h >= 0.8 and f0 > 0:
                    out.append(dict(label=f"{f}#{k + 1}", x=seg, f0=f0, midi=69 + 12 * np.log2(f0 / 440.0), len=len(seg) / SR))
        _HORN = sorted(out, key=lambda q: q["midi"])
    return _HORN


def honk(note, i=0, max_shift=2.5):
    """ONE horn squeeze tuned to a pitch CLASS: `note` = a MIDI note number whose octave is free (67 = any G). Of all the
    squeezes that reach that note within max_shift semitones, take number i (rotating, so repeats use different
    takes); the squeeze is then re-pitched by the small difference. Returns (mono array, sync point s, label, the
    MIDI note it sounds at, semitones shifted), or None when no horn file is there."""
    H = horn_squeezes()
    if not H:
        return None
    cand = []
    for q in H:
        d = (note - q["midi"] + 6) % 12 - 6               # nearest octave of the wanted pitch class
        cand.append((abs(d), d, q))
    ok = sorted([c for c in cand if c[0] <= max_shift], key=lambda c: c[0]) or sorted(cand, key=lambda c: c[0])[:1]
    _, d, q = ok[int(i) % len(ok)]
    x = pitch(q["x"], d)
    USED[q["label"].split("#")[0]] = USED.get(q["label"].split("#")[0], 0) + 1
    return x, onset(x), q["label"], q["midi"] + d, d


def honk_honk(notes=(67, 67), i=0, gap=0.035, second=0.85):
    """the clown's 'honk-honk': two squeezes tuned to two pitch classes (default G, G: the head of a tune in C), the
    second a little softer, `gap` s of air between them. Returns (mono, sync point of the first squeeze, [labels])."""
    a = honk(notes[0], i)
    b = honk(notes[1], i + 1)
    if a is None or b is None:
        return None
    n1 = len(a[0]) + ns(gap)
    y = np.zeros(n1 + len(b[0]))
    y[: len(a[0])] += a[0]
    y[n1:] += b[0] * second
    return y, a[1], [a[2], b[2]]


# ---------------------------------------------------------------- footsteps of one walker, from the picture's own data
def step_frames(frames, s, on=None, stride=1.04, phase0=0.0):
    """the frames a foot lands on: the picture's walk cycle is s / stride (s = metres walked, cast_people.ts STRIDE =
    metres per two steps), so a foot lands each time s crosses a multiple of stride / 2 (+ phase0 cycles). frames, s,
    on = arrays per frame. Returns [(frame (fractional), which foot 0 / 1)]."""
    frames, s = np.asarray(frames, float), np.asarray(s, float)
    ph = 2.0 * (s / stride - phase0)
    k = np.floor(ph)
    out = []
    for j in np.flatnonzero(np.diff(k) != 0):
        if on is not None and not (on[j] and on[j + 1]):
            continue
        tgt = max(k[j], k[j + 1])                          # the multiple that was crossed
        u = (tgt - ph[j]) / (ph[j + 1] - ph[j]) if ph[j + 1] != ph[j] else 0.0
        out.append((float(frames[j] + u * (frames[j + 1] - frames[j])), int(tgt) % 2))
    return out


def step_track(n, fps, frames, s, d, pan_x, r, on=None, shoe="step_soft", stride=1.04, phase0=0.0, f_start=0.0, ref=6.0, vary=0.7,
               skip=(), max_d=30.0):
    """one walker's footsteps as a stereo track of n samples (the track starts at frame f_start): a recorded step on
    every foot-down frame of the picture, takes rotating (never the same file twice in a row), pitch varied by up to
    +-`vary` semitones, each step filtered by its distance d (metres from the lens: near = louder and brighter) and
    panned by pan_x (-1 .. 1). The level follows the distance ONLY (a smooth curve: no step is accented). `skip` =
    [(f0, f1)] frame windows in which no step is placed. Returns (stereo (2, n), [dict(frame, foot, d, pan, gain_db, take)])."""
    out = np.zeros((2, n))
    log = []
    T = takes(shoe)
    if not T:
        return out, log
    frames = np.asarray(frames, float)
    order = r.permutation(len(T))
    for k, (f, foot) in enumerate(step_frames(frames, s, on, stride, phase0)):
        if any(a <= f <= b for a, b in skip):
            continue
        dd = float(np.interp(f, frames, d))
        if dd > max_d:
            continue
        px = float(np.clip(np.interp(f, frames, pan_x), -1, 1))
        label, x = T[int(order[k % len(T)])]
        x = pitch(x, float(r.uniform(-vary, vary)))
        g0 = float(np.max(np.abs(x)) + 1e-12)
        x = distance(x / g0, dd, ref=ref) * (0.94 if foot else 1.0)
        i0 = int(round((f - f_start) / fps * SR - onset(x) * SR))
        if i0 < 0 or i0 >= n:
            continue
        m = min(len(x), n - i0)
        th = (px + 1) * np.pi / 4
        out[0, i0:i0 + m] += x[:m] * np.cos(th) * 1.414
        out[1, i0:i0 + m] += x[:m] * np.sin(th) * 1.414
        USED[label.split("#")[0]] = USED.get(label.split("#")[0], 0) + 1
        log.append(dict(frame=round(f, 2), foot=foot, d=round(dd, 2), pan=round(px, 2), gain_db=round(20 * np.log10(max((ref / max(dd, 0.5 * ref)) ** 1.1, 1e-6)), 2), take=label))
    return out, log


def report():
    """{sound: [labels]} of what is available right now"""
    return {k: [l for l, _ in takes(k)] for k in REG}


if __name__ == "__main__":
    for k, v in report().items():
        d = [f"{len(x) / SR:.2f}" for _, x in takes(k)]
        print(f"{k:<14} {len(v):3d} takes  lengths s: {' '.join(d[:14])}{' ...' if len(d) > 14 else ''}")
