# Every sound effect and ambience bed of "The Oil Tanks That Were Mostly Water" as a cue list timed to the picture
# (timeline.py reads shots, dissolves and story beats from timeline.json at run time), rendered into two stereo stems:
# EVENTS and BEDS. Levels are relative to the voice: an EVENT's level = its max momentary loudness (LU vs the voice
# stem's integrated loudness); a BED's level = its integrated loudness over the shots it plays under. Beds follow the
# picture dissolves (equal-power, each dissolve widened by 4 f a side). The dawn tank-top bed (shots 1 + 16) is ONE
# continuous signal folded into a seamless loop, so the last frame's harbour runs straight into frame 0's.
#
# Every event is keyed to a named PICTURE EVENT (picture_events(), below): its default frame is derived from timeline.json
# BEAT / shot frames with the same formula the picture uses (sets_ext.ts / sets_int.ts / cast.ts, quoted next to it; the
# formulas that moved most often are READ from the merged picture code by probe.py at every run) or, for the two
# music-synced actions, the score's own beats (music.sync_points(): the tank man's climb steps and the banker's happy
# stamps - cues.md lists the frames for CHAR). If a picture action lands somewhere else after the merge, put the frame in
# audio/picture_events.json ({"name": frame | [frames] | {...} | "beat+n" | null}; null drops the cue) and re-run
# `python mix.py`. Every run writes picture_events_used.json with the frames actually used.
#
# FIX ROUND 1 (audit A1, new 2748 f clock): the harbour lives (gull cries in the true word gaps, flag snaps and a flag /
# windsock flutter on the SHARED gust curve, a far horn in the '$150 million...' pause, a wave slap + a far gull in the
# loop tail, carried by the loop-folded dawn bed); the trading floor shouts (a 12-voice walla, phones, a dismayed groan
# under the THOOM's tail); the storm is heavier (rain on umbrellas, a gutter spilling, wet footsteps for the lenders
# walking in, lightning cracks keyed to the picture's flashes); the reveal is a held breath, not a dropout (the tank's
# hollow water + bubble blips under 'Inside... was mostly water.', a fish 'blub' after the slosh); every buried sync
# SFX the audit measured is up (dings, shake, glug, pour, trickle, the tag ding, plates, scribble, cha-ching) and the
# small hits on words moved into the gaps beside them; new life in every interior (drum tonks + a rising xylophone as
# Tino's pile grows, the shot-6 clock, a hatch creak on 'someone', pipe drips, a far pipe knock, the pump's motor whine
# dipping on each valve heave, a car passing, pigeons taking off, the vendor's papers, the cafe's cups / laugh / register
# / a bicycle bell, a far typewriter bell).
#
# FIX ROUND 2 (audit A2, the 2761 f clock with the two new voice silences): every cue the audit found off its picture is
# re-keyed to the picture code's own formula (probe.py: the inspector's check-mark stroke, the blob's brow wipe, the shot-6
# papers fan; the shot-14 car on WORLD-EXT's visible pass), the register's ka-CHING moves out of 'it.' into the breath,
# the sounds with no on-screen source are dropped or pushed down to bed level (the shot-2 gate fence, the shot-12 fish
# blip, the shot-7 gull, the street horn), the buried sync SFX come up (the cash slide, the plunk, the check mark, the
# scribble, the cha-ching, the parting), the THOOM's low body steps aside under 'crashed.' and blooms in the breath after
# it, the storm steps sit under the line, and new life: a chair creak, the roof's steel 'tinks', a bell buoy, the empty
# tank's drone under the mystery, a ticker bell, a slammed handset, the bottle set down, sparrow chirps on the visible
# sparrow's hops, a tube radio's hiss, the blob's squeaks at the pipe mouths, a steam puff, sweat flecks, a far tram bell,
# the pigeons' flutter, the investor's pencil taps, an oily glop as the gold re-seals.
#
# FIX ROUND 3 (audit A3): the shot-12 pour was only ~0.5 s long (its lambda read `Lw` LATE, after the shot-13 brow wipe
# had reused the name): every generator lambda now binds its length when the cue is made, and the pour is a sustained
# filling stream 1842-1893 (ducked 3 dB under 'Fill a tank with water,') with the fish's 'blub' as it drops in; the
# shot-4 yard bed swaps ON the hard cut (the roof tinks, the rail gull's squawk and wings stop at it); the shot-3 register
# keeps only a soft bell (no visible drawer); the stamps sit on cast.ts STAMPS5.R with a paper 'thup'; the shot-6 rustle
# swells to the top of the probed raise; the ticker bell drops to bed level (no machine in frame); the storm and the
# cutaway beds come up in the breaths; the newspaper's whoosh starts on the paper's entry and its slap is its own low-mid
# transient; the scribble +4 dB; the cafe register ding on the probed card take, in the 'brand.' breath. New life: a
# second far ship horn and a halyard clink at the gate (shot 2), the inspector's pencil tap-tap in the deadpan silence,
# a felt-marker squeak on the chart, a hollow drip echo in the empty tank, a chalk squeal on the diving line, a gutter
# splash under the BANKRUPT slap and the umbrellas' fabric flutter on the gusts, the blob's wet squelch on each COUNTED
# plate and the pump-room clock, a far tyre hiss on the grey street, the cafe's espresso wand on 'trusted'.
#
# Rules kept from the engine: SFX only on physical actions whose source is on screen, synced 0-3 f to the picture; small
# actions that land ON words get their 1-4 kHz band carved under the words; no whoosh on any plain dissolve (the only
# whoosh is the spinning newspaper, a real on-screen fly-in); nothing but the dawn bed crosses the loop point.
import os
import re
import json
import numpy as np
from scipy import signal as _sig
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, shelf)
import sfx_gen as G
import sfx_gen_r1 as G2
import sfx_gen_r2 as G3
import sfx_gen_r3 as G4
import instruments as I
import timeline as T
import probe as PR

N = ns(T.DUR)
FR = 1.0 / T.FPS
PE_PATH = os.path.join(T.HERE, "picture_events.json")
PE_USED = os.path.join(T.HERE, "picture_events_used.json")

# picture_events.json values may be BEAT expressions: "bust-2", "S9.a+4" (shot 9 start + 4), or lists of them
_EXPR = re.compile(r"^\s*(?:S(\d+)\.(a|b)|([A-Za-z_]\w*))\s*(?:([+-])\s*(\d+(?:\.\d+)?))?\s*$")


def resolve(v):
    if isinstance(v, str):
        m = _EXPR.match(v)
        if not m:
            raise ValueError(f"picture_events.json: cannot read frame expression {v!r} (use 'beat+n', 'beat-n' or 'S<id>.a+n')")
        base = T.SHOTS[int(m.group(1))][m.group(2)] if m.group(1) else T.BEAT[m.group(3)]
        d = float(m.group(5)) * (-1 if m.group(4) == "-" else 1) if m.group(5) else 0.0
        return float(base) + d
    if isinstance(v, list):
        return [resolve(x) for x in v]
    if isinstance(v, dict):
        return {k: (resolve(x) if isinstance(x, (str, list)) else x) for k, x in v.items()}
    return v


class Cue:
    def __init__(self, t, name, desc, gen, level, p=0.0, lpf=None, space="out", send=0.08, pe=None, wcarve=None, post=None):
        self.t, self.name, self.desc, self.gen, self.level = t, name, desc, gen, level
        self.p, self.lpf, self.space, self.send, self.pe, self.wcarve, self.post = p, lpf, space, send, pe, wcarve, post
        self.measured = None

    @property
    def frame(self):
        return self.t * T.FPS


# ================================================================ speech mask (true voice silences)
def speaking(t):
    """is narration time t inside speech (not inside a true voice silence)?"""
    t = np.atleast_1d(np.asarray(t, float))
    s = np.ones(len(t), bool)
    for a, b in T.SILENCES:
        s &= ~((t >= a) & (t < b))
    return s


def gap_at(t, min_len=0.15, win=0.6):
    """the true voice silence (>= min_len) containing or nearest t (within win): (a, b) or None"""
    best = None
    for a, b in T.SILENCES:
        if b - a < min_len:
            continue
        d = 0.0 if a <= t <= b else min(abs(a - t), abs(b - t))
        if d <= win and (best is None or d < best[0]):
            best = (d, a, b)
    return None if best is None else (best[1], best[2])


def in_gap(f, pad=0.02):
    t = T.fr(f)
    return any(a + pad <= t <= b - pad for a, b in T.SILENCES)


def carve_words(x, t0, depth_db, lo=1000.0, hi=4000.0, broad_db=0.0, pre=0.02, post=0.03):
    """dip the lo..hi band of an event placed at narration time t0 while the voice speaks (edges 15 ms), plus an optional
    broadband trim; the low body and the top sparkle stay"""
    n = x.shape[-1]
    t = t0 + np.arange(n) / SR
    e = speaking(t).astype(float)
    if pre or post:                       # widen the speech windows a little (a word's attack / tail)
        k = max(1, ns(max(pre, post)))
        e = np.minimum(1.0, np.convolve(e, np.ones(2 * k + 1), mode="same"))
    if not np.any(e):
        return x
    k = max(1, ns(0.015))
    e = np.convolve(e, np.ones(k) / k, mode="same")
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    return (low + high) * dbg(broad_db * e) + midb * dbg((depth_db + broad_db) * e)


def word_env(t, pre=0.06, post=0.08, tau=0.06):
    """0..1 'the narrator is speaking' envelope at times t (s), smoothed: beds duck under it"""
    t = np.asarray(t, float)
    ctrl = 200
    tc = np.arange(int(np.floor(t[0] * ctrl)) - 4, int(np.ceil(t[-1] * ctrl)) + 5) / ctrl
    v = np.zeros(len(tc))
    for w in T.WORDS:
        v[(tc >= float(w["s"]) - pre) & (tc <= float(w["e"]) + post)] = 1.0
    k = max(1, int(tau * ctrl))
    v = np.convolve(v, np.ones(k) / k, mode="same")
    return np.interp(t, tc, v)


# ================================================================ picture events (the frames every SFX is keyed to)
def _music_sync():
    try:
        import music
        return music.sync_points()
    except Exception:  # noqa
        return {}


_PROBE = None


def picture_probes():
    global _PROBE
    if _PROBE is None:
        try:
            _PROBE = PR.probes(T.BEAT, T.SHOTS)
        except Exception as e:  # noqa
            _PROBE = ({}, [f"probe failed: {e}"])
    return _PROBE


_PE = None


def picture_events():
    global _PE
    if _PE is not None:
        return _PE
    B, S = T.BEAT, T.SHOTS
    D, SRC = {}, {}
    pr, _ = picture_probes()

    def put(k, v, src):
        D[k], SRC[k] = v, src
    ms = _music_sync()
    put("reel_1", [S[1]["a"], S[1]["a"] + 46], "shot 1 (BUILD_PLAN): the tape slides into the oil from frame 0 - a soft reel whirr, 0 .. 46")
    if pr.get("flaps"):
        dg = pr["flaps"]
        put("flaps_1", {"a": min(d[0] for d in dg), "lock": max(d[1] for d in dg), "digits": [list(d) for d in dg]},
            "sets_ext.ts flapState (probed): each LOANS digit flips every T f from s(i) and lands on land(i)")
    else:
        put("flaps_1", {"a": B["borrowed"], "lock": B["million"] + 6},
            "sets_ext.ts: the LOANS counter rolls from 'borrowed' and lands $150,000,000 on BEAT.million + 6")
    put("horn_1", B["millionEnd"] + 3, "shot 1: the far ship (harbour) in the pull-out: its horn INSIDE the pause after '$150 million...' "
                                      "(millionEnd + 3), faded out before 'tanks'")
    put("gull_1", B["water1"] + 13, "shot 1: a gull cries as it flaps off the rail in the gap after 'water.' (CHAR: the rail gull takes off "
                                    "~water1 + 9)")
    put("wings_1", B["water1"] + 9, "shot 1: the rail gull's wing flaps as it takes off (CHAR cast.ts gull(..., 150, 238))")
    put("wings_1_land", 143, "shot 1: the rail gull flutters down onto the rail (CHAR: flies in 136 -> lands 150)")
    put("flags_2", [307, B["king"] + 15], "shot 2: the gate flag snaps on the gust peaks in the word gaps ('Angelis,|New' 307, 'king.|His')")
    try:                                     # A3 ADD: the waterfront placed by ear, far under 'New Jersey's'
        put("horn_2", float(T.word("New", T.bt("tino"))["s"]) * T.FPS, "A3 ADD: a far ship's horn across the harbour, deep under "
                                                                          "'New Jersey's' (1-4 kHz carved)")
    except KeyError:
        put("horn_2", None, "A3 ADD: no 'New' word")
    gk = gap_at(float(T.word("king", T.bt("king") - 0.2)["e"]) + 0.01, 0.1, 0.2) if "king" in B else None
    put("halyard_2", (gk[0] + 0.015) * T.FPS if gk else None, "A3 ADD: the gate flagpole's halyard clinks on the pole in the "
                                                             "'king.|His' breath (the gust that snaps the flag)")
    put("gull_2", B["king"] + 14, "shot 2: a gull over the tank farm in the gap after 'king.'")
    put("fence_2", None, "A2 P3: dropped - no gate leaf is in the shot-2 frame (the gate shiver had no source)")
    put("clank_2", B["giant"] + 10, "shot 2: a far clank across the tank farm (under 'giant tanks')")
    put("plip_2", B["oil1End"] + 6, "sets_ext.ts: the drip leaves the valve at oil1End - 6 and lands 12 f later (u = 1) = oil1End + 6")
    put("stamp_3", B["money"], "cast.ts / sets_int.ts: the stamp comes down on 'money' (|f - money| < 5), the APPROVED mark from money + 2")
    put("cash_3", [B["againstIt"], B["againstIt"] + 16], "sets_int.ts: the cash slides on 'against it' - smooth((f - againstIt) / 16)")
    put("register_3", B["againstIt"] + 16, "the cash lands (againstIt + 16): A2 P2 - the register's ka-CHING plays in the breath after the WORD "
                                          "'it.' (never inside it), its bell ringing into 'American'")
    put("chair_3", B["money"] - 6, "A2 ADD: the banker's leather chair creaks as he leans into the stamp (money - 6)")
    s4 = pr.get("s4")
    if s4 and s4.get("pulls"):
        put("climb_4", s4["pulls"], "cast.ts S4.pulls (probed): a rung clang on every hand-over-hand pull of the climb")
        put("rim_4", s4["rim"], "cast.ts S4.rim (probed): he swings over the rim (a last clang), onto the roof by S4.onRoof")
        put("roof_4", [s4["onRoof"] + 6.5 * n for n in range(1, 9) if s4["onRoof"] + 6.5 * n <= s4["kneel"] - 4],
            "cast.ts scurry (probed): round the hatch from S4.onRoof, a footfall every 6.5 f (phase / 13, a step per half cycle)")
        put("knee_4", s4["kneel"], "cast.ts S4.kneel (probed): he drops to his knees on the far side of the hatch")
    else:
        put("climb_4", [round(t * T.FPS, 1) for t in ms.get("climb", [])] or [B["butTinos"] + 14, B["butTinos"] + 27, B["butTinos"] + 41],
            "shot 4: the tank man's steps up the top flight, ON the score's climb beats (music.sync_points 'climb')")
        put("rim_4", B["up"], "cast.ts: over the rim on 'up' (tTop = up + 2): a last clang + the boot onto the roof")
        put("roof_4", [B["up"] + 7, B["up"] + 13], "cast.ts: walks to the hatch between tTop (up + 2) and tKneel (drop + 6): two roof steps")
        put("knee_4", B["drop"] + 6, "cast.ts: kneels at the hatch by tKneel = drop + 6")
    put("reel_4", [B["drop"], B["inside1"] + 16], "sets_ext.ts: the tape pays out k4 = smooth((f - drop) / (inside1 + 16 - drop))")
    put("plunk_4", pr.get("plunk", B["drop"] + 24), "sets_ext.ts PLUNK (probed): the plumb weight hits the oil (+ the hollow tank's ring)")
    put("gulls_4", [B["men"] - 5, B["up"] + 10], "shot 4 A: far gulls circling the tank top (soft, -38 / -28 LU; 'up,|drop' gap)")
    put("gull_perch_4", pr.get("perch_off", B["fullShout"] + 3), "sets_ext.ts tOff (probed): the gull perched on the rail by the shout spot is "
                                                                  "startled into the air by 'full!' (wings; a squawk in the breath after the shout)")
    put("gull_far_4", B["inspectorG"] + 5, "shot 4B (the ground two-shot after the hard cut): a far gull wheels over the yard in the "
                                           "'inspector,|on' gap")
    if s4 and s4.get("stand") is not None:
        put("stand_4", [s4["stand"]] + [s4["stand"] + 3 + 6.5 * n for n in range(1, 8) if s4["stand"] + 3 + 6.5 * n <= s4["rail"] - 3],
            "cast.ts S4.stand + scurry (probed): he rises, then scurries round to the rail (a footfall every 6.5 f)")
        put("rail_4", s4["rail"], "cast.ts S4.rail (probed): his hands grip the rail and he leans over it")
    else:
        put("stand_4", [B["shout"] - 4, B["shout"] + 3], "cast.ts: stands on tStand = shout - 8, steps to the rail by tRail = down + 6")
        put("rail_4", B["down"] + 6, "cast.ts: leans over the rail by tRail = down + 6 (hand on the rail)")
    put("shout_4", [B["ninety"], B["shoutEnd"]], "the shout 'Ninety percent full!' (lip flaps ninety .. shoutEnd): mix.py's metal-tank echo")
    put("yard_4", [B["andInspector"] - 6, B["andInspector"] + 2], "A3 P2: story.ts R4_CUT_V = andInspector - 3 is the film's one HARD "
                                                                  "cut (tank top -> ground): the tank-top wind swaps to the ground-level yard (gravel, a far "
                                                                  "idling forklift, the harbour lapping) over 8 f centred on the cut; the roof tinks stop on it")
    tk = pr.get("tick")
    put("tick_4", [tk[0] + 2, tk[1]] if tk else [B["believed"] + 4, 8.0],
        "cast.ts tick = clamp01((f - X) / L) (probed): the graphite check mark from the stroke's first visible frame (X + 2), "
        "L f long [onset, length]")
    try:                                     # A3 ADD: the deadpan's tiny rhythm: tap-tap, then the tick
        gg = gap_at(float(T.word("ground", T.bt("ground") - 0.2)["e"]) + 0.01, 0.2, 0.2)
    except KeyError:
        gg = None
    tk_on = (tk[0] + 2) if tk else B["believed"] + 4
    taps4 = [round((gg[0] + d) * T.FPS, 1) for d in (0.05, 0.18)] if gg else []
    put("taps_4", [x for x in taps4 if x < tk_on - 3] or None,
        "A3 ADD: the inspector taps his pencil twice on the clipboard in the 'ground...|believed' silence, one beat before the tick "
        "(CHAR: two 2-3 f pencil dips on these frames)")
    st5 = pr.get("stamps5")
    if st5 and st5.get("R"):                 # A3 P3: exactly on the picture's landings (cast.ts STAMPS5.R), not the score's beats
        put("stamps_5", [round(x, 2) for x in st5["R"] if S[5]["a"] - 4 <= x < S[5]["b"] - 4],
            "cast.ts STAMPS5.R (probed): the banker's right hand stamps (the picture's landing frames)")
    else:
        put("stamps_5", [round(t * T.FPS, 1) for t in ms.get("stamps", [])] or [B["soBanks"] + 15, B["soBanks"] + 45, B["soBanks"] + 75],
            "shot 5: the banker's right hand stamps ON the score's beats (music.sync_points 'stamps' = cast.ts STAMPS5.R)")
    put("stamps_5L", [round(x, 2) for x in st5["L"] if S[5]["a"] - 4 <= x < S[5]["b"] - 4] if st5 else
        [B["soBanks"] + 30.25, B["soBanks"] + 60.5], "cast.ts STAMPS5.L (probed): the left hand's stamps, half way between the beats")
    put("dings_5", [B["more1"] + 3, B["more2"] + 3], "sets_int.ts: the cash stacks pop taller on more1 / more2 (smooth((f - more) / 8)): "
                                                    "the register bells from 3 f after, the top bell in the breath after 'more.'")
    put("ratchet_6", [B["moreOf"], B["united"]], "sets_int.ts: TINO'S OIL pile grows: stage 1 on moreOf, stage 2 on united")
    put("marker_6", [B["moreOf"] - 2, B["united"] - 2], "A3 ADD: a felt-marker squeak as each stage of TINO'S OIL is drawn onto the chart "
                                                        "(under the ratchet)")
    pp = pr.get("papers6")
    put("papers_6", [pp[0], pp[0] + pp[1]] if pp else [B["papers"] - 2, B["papers"] + 10],
        "cast.ts pap = gest2(f, X, L, ...) (probed): Tino raises the fan of OIL RECEIPTS on 'papers' (the paper rustle, A2 P3)")
    put("drums_6", {"st1": [B["moreOf"] - 3 + 2 * n for n in range(7)], "st2": [B["united"] - 3 + 1.08 * n for n in range(26)]},
        "sets_int.ts drumSlot t: stage 1 = moreOf - 3 + 2 n (7 drums), stage 2 = united - 3 + 1.08 n (26 drums): one tonk per drum landing")
    put("clock_6", [f for f in range(int(np.ceil(S[6]["a"] / 30.0)) * 30, S[6]["b"] - 6, 30)],
        "shot 6: the wall clock's second hand steps on every whole second of the film clock (frame % 30 == 0; the bank bed's clock "
        "has the same phase) - WORLD-INT: step the second hand on these frames")
    put("gull_7", S[7]["a"] + 4, "shot 7: a lone far gull as the light turns late (gap 'But|what'); A2 P3: at bed level (no gull in frame)")
    put("drone_7", [S[7]["a"], B["insideQEnd"]], "A2 ADD: the empty tank's hollow drone under the mystery, swelling on 'look inside?', "
                                                 "cut with the bloop")
    put("creak_7", B["someone"], "shot 7: the lender leans in over the hatch on 'someone': the steel lid / roof plate creaks")
    ring = pr.get("bubble_pop", pr.get("bloop_ring"))
    if ring is not None and ring >= B["insideQEnd"] - 3:
        put("bloop_7", ring, "cast.ts ring / sets_ext.ts BL (probed): the bubble pops at the reflection's chin as 'inside?' ends (the bloop's pop lands on it)")
    else:
        put("bloop_7", B["insideQEnd"] + 2, "shot 7: the bubble pops in the gap after 'inside?' (insideQEnd + 2; CHAR / WORLD-EXT: key the "
                                            f"pop + ring here - the picture ring is still at {ring})")
    put("drip_7", D["bloop_7"] + 7 if D.get("bloop_7") is not None else None,
        "A3 ADD: after the bloop, one drop falls from the hatch rim into the near-empty tank: a hollow drip and the steel cavity's "
        "1.2 s answer, faded under 'Then,' (the 'inside?|Then' gap)")
    put("phones_8", [S[8]["a"] + 3, B["november"] + 43, B["bet"] + 6], "shot 8: desk phones ringing on the trading floor (one in the "
                                                                       "'1963,|his' breath)")
    put("crash_8", B["crashed1"], "sets_int.ts: the chalk line dives on 'crashed' (dive = f >= crashed1) + story KICK")
    put("groan_8", B["crashed1"] + 9, "shot 8: the traders' dismayed 'ohhh' under the THOOM's tail (CHAR: the staggered shock); A2: "
                                      "it rises at the END of the word 'crashed.' (never on it)")
    put("tickbell_8", B["november"], "A2 ADD: a ticker machine's bell on 'November' (a quote comes in); A3 P3: at bed level, carved "
                                     "(no ticker machine's hammer in frame yet)")
    try:                                     # A3 ADD: the chalk line's own sound, in the breath after 'crashed.'
        gc = gap_at(float(T.word("crashed", T.bt("crashed1") - 0.3)["e"]) + 0.01, 0.1, 0.2)
    except KeyError:
        gc = None
    put("chalk_8", (gc[0] + 0.01) * T.FPS if gc else None, "A3 ADD: a short chalk squeal on the diving line in the breath after "
                                                           "'crashed.' (under the THOOM's tail)")
    if pr.get("slam8") is not None:          # A3 (found in fix r3): the picture slams it at SLAM + 5 (cast.ts), 23 f before the old cue
        put("handset_8", pr["slam8"], "cast.ts SLAM + gest2 rise (probed): trader 3 slams his handset down onto the phone base at his hip")
    else:
        put("handset_8", B["november"] + 48, "A2 ADD: a handset slammed onto its cradle in the breath after '1963,' (the true silence nearest)")
    fl = pr.get("flashes")
    put("lightning_9", [[round(a, 1), 1 if far else 0] for a, far in fl] if fl else [[S[9]["a"] - 7, 0], [B["bust"] - 2, 0], [B["checked"] - 8, 1]],
        "SaladOil.tsx FLASHES / sets_ext.ts flashAt (probed): [flash frame, far]: a near flash in a breath gets its crack ON the flash; "
        "one that lands on a word ('bust') gets its thunder late, in the next breath (light first, sound after); a far flash's roll "
        "4 f after it")
    put("slap_9", B["bust"] - 2, "sets_ext.ts: the BANKRUPT notice appears at f >= bust - 2")
    put("splash_9", B["bust"] - 1, "A3 ADD: the slap knocks the water off the sign's gutter lip: a short splash under the BANKRUPT notice")
    put("lenders_9", {"t0": [B["lenders"] - 6 + 6 * (k - 1 if k > 1 else k) for k in (0, 2, 3)], "step": 10.0, "end": B["inside"] - 2},
        "cast.ts shot 9 (CHAR): lenders 0 / 2 / 3 of TF.lenderFile start walking in through the gate at lenders - 6 + 6 k' (a footfall every "
        "10 f: walk phase / 20, a step per half cycle) - wet steps + rain on their umbrellas")
    put("ladder_9", {"a": B["lenders"] - 30, "step": 15.0, "land": 6.0, "end": S[9]["b"] - 4},
        "cast.ts shot 9 (CHAR): the far climber's feet snap to the treads, a step every 15 f from lenders - 30 (lands 6 f in)")
    put("blips_10", [B["inside"] + 28, B["inside"] + 32, B["inside"] + 37], "shot 10: tiny bubbles in the held breath after 'Inside...'")
    put("slosh_10", B["waterEnd"] + 1, "BUILD_PLAN shot 10: ONE slosh after 'water.' (waterEnd), in the music's silence (peaks inside the gap)")
    put("blub_10", B["waterEnd"] + 14, "WORLD-INT / CHAR: the fish's startled flip after the slosh: one 'blub'")
    sh = pr.get("shake")
    put("shake_11", [sh["a"], sh["a"] + sh["len"], sh["w"]] if sh else [B["ever"], B["ever"] + 22, 1.9],
        "cast.ts bottleShake (probed): the hand shakes the bottle from 'Ever' (amplitude sin(pi t / len), sin(w t) strokes)")
    put("glug_11", [B["theOilRises"], B["top"] + 8], "sets_int.ts: the oil rises smooth((f - theOilRises) / (top + 8 - theOilRises))")
    put("clunk_11", pr["setdown11"] if pr.get("setdown11") is not None else B["ever"] + 28, "cast.ts kitchen: after the shake the hand lifts the bottle (pop, ever + 24 .. 29) and sets it down: a "
                                    "soft glass clunk on the table")
    put("chirps_11", [f + 1 for f in range(int(np.ceil(S[11]["a"] / 45.0)) * 45, S[11]["b"] - 4, 45)],
        "sets_int.ts kitchen: the sparrow on the fence hops every 45 f of the video clock (VF % 45 < 9): one chirrup per hop")
    put("pour_12", [B["waterIn"] - 6, B["add"] + 4], "sets_int.ts: the water stream pw = waterIn - 6 .. add + 4")
    try:                                     # A3 P2: the fish drops out of the pipe into the water (~1879-1882)
        gw = gap_at(float(T.word("water", T.bt("waterIn") - 0.3)["e"]) + 0.01, 0.1, 0.2)
    except KeyError:
        gw = None
    put("fish_12", round((gw[0] + 0.07) * T.FPS, 1) if gw else B["add"] - 4,
        "A3 P2: the fish drops from the pipe into the rising water: one small 'blub' in the 'water,|add' breath")
    put("trickle_12", [B["thin"] - 2, B["oilIn"] + 12], "sets_int.ts: the oil stream po = thin - 2 .. oilIn + 12")
    try:
        fe = float(T.word("full", T.bt("looksFull") - 0.1)["e"]) * T.FPS
    except KeyError:
        fe = B["looksFull"] + 12
    put("ding_12", round(fe + 1, 1), "shot 12: the tag ding in the gap just after 'full.' (LOOKS FULL)")
    put("blip_12", None, "A2 P3: dropped - the fish has left the tank by 'full.' (no source)")
    vv = pr.get("valves")
    if pr.get("pulls13"):
        put("valves_13", {"w0": pr["pulls13"][0], "w1": pr["pulls13"][1]},
            "cast.ts PULLS13 (probed): each worker's hand-over-hand pulls (30 deg per 10 f pull); the first pull of each burst squeals")
    elif vv:
        heaves = sorted(set(round(vv["period"] * n - vv["phase"] * k, 1) for k in (0, 1)
                            for n in range(int(S[13]["a"] // vv["period"]) - 1, int(S[13]["b"] // vv["period"]) + 2)))
        heaves = [h for h in heaves if S[13]["a"] + 4 <= h < S[13]["b"] - 8]
        put("valves_13", heaves, f"cast.ts valveAngle (probed): a heave every {vv['period']:g} f per wheel ({vv['heave']:g} f), wheel 2 "
                                 f"{vv['phase']:g} f ahead - a stem grind per heave, the loud squeaks in the word gaps")
    else:
        put("valves_13", [S[13]["a"] + 10, B["pipes"] + 18, B["tankTo"] + 28], "shot 13: the workers turning the red valve wheels")
    pdp = pr.get("pump_drip")
    if pdp:
        P_, L_ = pdp
        put("drips_13", [f for f in np.arange(np.ceil((S[13]["a"] - L_) / P_) * P_ + L_, S[13]["b"] - 4, P_)],
            f"sets_int.ts (probed): the gold drip off the flange lands every {P_:g} f (VF % {P_:g} == {L_:g})")
    else:
        put("drips_13", [B["pumped"] + 10, B["counted"] + 3], "shot 13: a slow drip off a flange into the drip tray (under 'through', 'counted')")
    put("knock_13", B["tankTo"] + 12, "shot 13: a far pipe knock down the line under 'tank to tank'")
    put("blob_13", [B["tankTo"] + 2, B["again2"] + 2], "sets_int.ts / story.ts: the blob rides the pipe tank A -> C (COUNT_AT[0] - 4 .. [2])")
    put("plates_13", [B["tankTo"] + 6, B["got"], B["again2"]], "story.ts COUNT_AT = [tankTo + 6, got, again2]: each COUNTED plate ticks over")
    put("squeak_13", [B["tankTo"] + 2, B["got"] - 4, B["again2"] - 4], "A2 ADD: the blob squeezes out of each pipe mouth into the tank "
                                                                       "(COUNT_AT - 4): a rubbery squeak")
    put("steam_13", B["got"] + 2 if pr.get("steam_puff13") else None,
        "A2 ADD: a steam puff from a valve on the second COUNTED plate; A3 P3: only when WORLD-INT's puff on 'got' is in the picture "
        "(probed: " + ("found" if pr.get("steam_puff13") else "not found - dropped") + ")")
    put("squelch_13", [B["tankTo"] + 6 - 2, B["got"] - 2, B["again2"] - 2], "A3 ADD: the blob lands at each COUNTED plate with a tiny wet "
                                                                            "squelch, 1 f before the plate's bell (COUNT_AT - 2)")
    put("pclock_13", [f for f in range(int(np.ceil((S[13]["a"] + 6) / 30.0)) * 30, S[13]["b"] - 6, 30)],
        "A3 ADD: the pump-room wall clock (sets_int.ts prClock) ticks on every whole second of the film clock, very low under the night bed")
    put("sweat_13", B["hardestW"], "cast.ts: tired = f >= hardestW - 2 (a sweat drop) ...")
    wp = pr.get("wipe13")
    put("wipe_13", [wp[0], wp[0] + wp[1]] if wp else [B["hardestW"] + 20, B["hardestW"] + 38],
        "cast.ts wipe = clamp01((f - X) / L) (probed, X = PW(27, 'oil')): the brow wipe X .. X + L (A2 P1: the swipe ON the arm), "
        "its sweat flecks flicked off 2 f after it ends")
    put("sigh_13", None, "the blob's tired sigh: in the true silence after 'America.' (computed)")
    put("spin_14", {"a": B["cameOut"] - 2, "land": B["cameOut"] + 11}, "A3 P3: the newspaper enters the frame at cameOut and lands at "
                                                                     "cameOut + 10..11: the whoosh from 2 f before its entry, its own slap on the landing")
    put("vendor_14", B["cameOut"] + 16, "CHAR: the newsstand vendor squares the stack after the paper lands (paper rustle)")
    if "car" in pr and pr["car"] is None:
        put("car_14", None, "sets_ext.ts CAR14_ON = false (probed): no car in the picture, no car sound")
    else:
        put("car_14", {"a": B["amex2"] - 8, "peak": B["amex2"] + 11, "b": B["amex2"] + 30},
            "A2 P2: WORLD-EXT's VISIBLE sedan crossing the bottom of frame L -> R (amex2 - 8 .. amex2 + 30, closest at amex2 + 11; the old "
            "shop-window reflection is hidden by the kiosk); no horn")
    try:                                     # A3 ADD: a far car hisses past on the wet street in the 'crashed.|But' breath
        gt = gap_at(float(T.word("crashed", T.bt("crashed2") - 0.3)["e"]) + 0.01, 0.15, 0.2)
    except KeyError:
        gt = None
    put("tyre_14", round(0.5 * (gt[0] + gt[1]) * T.FPS, 1) if gt else None,
        "A3 ADD: a far 1960s car's tyres hiss past on the grey street (off screen, two blocks down), peaking in the 'crashed.|But' breath")
    put("clack_14", B["shares"] - 2, "sets_ext.ts: the CLOSED sign is visible from shares - 2")
    put("bwomp_14", B["crashed2"] - 2, "sets_ext.ts: the SHARES arrows drop at f >= crashed2 - 2")
    put("pigeons_14", B["crashed2"] - 1, "CHAR: the awning pigeons flutter up on the bwomp (A2 ADD: their flutter carries on under 'crashed')")
    put("scribble_15", [B["bought"], B["bought"] + 18], "cast.ts: the investor's hand reaches + writes from 'bought'; BUY visible from bought + 4")
    put("chaching_15", B["cheap"], "A2 / LEAD: the cha-ching's source is the BUY slip - the 'ka' as the pencil finishes BUY and lifts (cheap: "
                                   "sc ends, the smug nod), the bell in the breath after the word 'cheap.'")
    taps = [f for f in range(int(B["heBet"] + 20), int(S[15]["b"]) - 4) if f % 40 == 6]
    put("taps_15", taps, "cast.ts: the resting pencil hand taps the desk every 40 f (tap = VF % 40 < 6: down on VF % 40 == 6) once 'back' "
                         "has settled (heBet + 20)")
    put("cafe_rack_15", [B["trusted"], B["warren"]], "story.ts DOF: racks to the cafe window on 'trusted', back on 'Warren' (the cafe swells)")
    put("cafe_life_15", {"laugh": B["trusted"] + 2, "cup": B["trusted"] + 8, "card": B["trusted"] + 17, "bike": B["brand"] + 11,
                         "carriage": B["bought"] + 17},
        "CHAR cafe patrons: a laugh head-bob as the focus racks, a cup set down, the card handed over (a soft register ding); a "
        "bicycle bell down the street ('brand.|His'); a typewriter bell in the next office")
    c15 = pr.get("card15")
    if c15:                                  # A3 P3: the register ding on the waiter's visible take of the card (probed: it follows
        tk15 = T.fr(c15[0] + c15[1] + 2)     # CHAR's re-time), moved into the breath when the take lands on a word ('brand.': under
        wk = next((w for w in T.WORDS if float(w["s"]) - 0.02 <= tk15 < float(w["e"])), None)   # the word its 2.6 kHz bell was carved away)
        if wk is not None and float(wk["e"]) - tk15 < 0.4:
            tk15 = float(wk["e"]) + 0.02
        put("card_15", round(tk15 * T.FPS, 1), "cast.ts take = gest2(f, X, L, ...) (probed): the waiter takes the card at X + L; the cafe "
                                                "register rings it up 2 f later, or in the breath after the word it would land on")
    put("espresso_15", B["trusted"] + 2, "A3 ADD: the focus racks to the cafe on 'trusted': its espresso wand hisses across the street")
    put("part_16", [B["fake"], B["fake"] + 16], "sets_ext.ts: the reveal disc opens smooth((f - fake) / 16)")
    put("gull_16", B["fake"] + 17, "shot 16: a far gull in the gap 'fake.|The' (WORLD-EXT's gull shadow is gone by then)")
    put("settle_16", [B["trust"], B["trust"] + 24], "sets_ext.ts: ... and closes 1 - smooth((f - trust) / 24)")
    put("glop_16", B["trust"] + 15, "A2 P3: the gold seals over the water (the disc ~85 % closed at trust + 15): one soft oily glop, done "
                                    "before 'real.'")
    try:
        with open(PE_PATH, encoding="utf-8") as f:
            O = json.load(f)
        for k, v in O.items():
            if k.startswith("_"):
                continue
            D[k] = resolve(v)
            SRC[k] = "picture_events.json override"
    except (OSError, ValueError):
        pass
    _PE = (D, SRC)
    return _PE


def ring_cut(after, tau=0.12):
    """post: let a bell ring `after` s, then die away fast (so it never hangs under the next words)"""
    def f(x):
        n = x.shape[-1]
        t = np.arange(n) / SR
        return x * np.where(t < after, 1.0, np.exp(-(t - after) / tau))[None, :]
    return f


def hishelf(f0, db):
    def f(x):
        return shelf(x, f0, db, "high")
    return f


def bandpass_post(lo, hi, mix=0.75):
    """keep mostly the lo..hi band (so a small sound sits BESIDE the voice's formants)"""
    def f(x):
        return x * (1 - mix) + bp(x, lo, hi, 2) * mix * 1.6
    return f


def _frames(v):
    if v is None:
        return []
    return [float(x) for x in (v if isinstance(v, (list, tuple)) else [v])]


# ================================================================ the cue list
THUNDER_FIRST = -14.0            # A3 P3: the storm's first crack (was -11 LU); back to -11 if POST makes the 1406 flash read strongly
_WCARVE = {"flap": -5.0, "reel": -6.0, "steel_step": -5.0, "roof_step": -5.0, "knee": -6.0, "plunk": -5.0, "rail": -6.0,
           "cash_slide": -6.0, "ka": -4.0, "stamp": dict(db=-6.0, lo=700.0, hi=4000.0), "stamp5": dict(db=-6.0, lo=700.0, hi=4000.0),
           "ding5": -6.0, "ratchet": -4.0, "boing": -4.0, "bloop": -4.0, "phone": -1.0, "slap": -5.0, "ladder_far": -4.0,
           "shake": -2.0, "glug": -2.0, "pour": dict(db=-4.0, lo=900.0, hi=5000.0), "trickle": -3.0, "ding12": -3.0,
           "valve": -6.0, "plate": -3.0, "gurgle": -5.0, "sweat": -8.0, "wipe": -9.0, "spin": dict(db=-6.0, lo=800.0, hi=5000.0),
           "clack": -5.0, "bwomp": -3.0, "scribble": -4.0, "cha_ching": dict(db=-4.0, lo=900.0, hi=4000.0), "part": -4.0, "settle": -4.0,
           "gull": -6.0, "horn": -2.0, "slosh": dict(db=-8.0, lo=300.0, hi=4000.0, broad=-4.0), "car_horn": -6.0, "coo": -5.0, "clank": -4.0,
           "flag": -5.0, "thunder": dict(db=-6.0, lo=600.0, hi=4000.0, broad=-5.0), "crash": dict(db=-4.0, lo=500.0, hi=3000.0), "tick": -3.0,
           "wings": -4.0, "fence": -5.0, "tank_ring": -4.0, "xylo": -2.0, "tonk": -3.0, "paper": -6.0, "clock": -4.0, "creak": -5.0,
           "groan": dict(db=-7.0, lo=700.0, hi=4000.0), "wet_step": -5.0, "umbrella": dict(db=-5.0, lo=900.0, hi=4000.0),
           "blip": 0.0, "blub": 0.0, "drip": -4.0, "knock": -3.0, "car": dict(db=-5.0, lo=800.0, hi=4000.0), "pigeon_wings": -4.0,
           "laugh": -6.0, "cup": -4.0, "reg_ding": -3.0, "bike": -4.0, "carriage": -6.0}


def cues():
    D, _ = picture_events()
    C = []
    seed = [5000]

    def one(fn, anchor=0.0):
        def g():
            seed[0] += 1
            return fn(rng(seed[0])), anchor
        return g

    def ev(name, f, desc, gen, level, pe=None, **kw):
        if f is None:
            return
        C.append(Cue(T.fr(f), name, desc, gen, level, pe=pe, **kw))

    def ev_t(name, t, desc, gen, level, pe=None, **kw):
        C.append(Cue(float(t), name, desc, gen, level, pe=pe, **kw))

    # ---------------- 1 HOOK (tank top, dawn)
    r0, r1 = _frames(D.get("reel_1")) or [None, None]
    if r0 is not None:
        L = T.fr(r1) - T.fr(r0)
        env = np.concatenate([np.linspace(0.6, 1.0, ns(0.2)), np.ones(max(1, ns(L) - ns(0.2)))])
        # A3 P3 (hook onset): +2 dB and 2 dB brighter, so frames 0-4 already hold a clear diegetic sound before 'By'
        ev("reel", r0 + 0.2, f"the tape reel's ratchet whirr as the tape slides into the oil ({r0:.0f}-{r1:.0f})",
           one(lambda r, L=L, env=env: G.reel_whirr(r, L, 30, 22, env)), -25, pe="reel_1", p=0.1, post=hishelf(3000, 2.0))
    fl = D.get("flaps_1")
    if fl:
        a, lock = float(fl["a"]), float(fl["lock"])
        digs = fl.get("digits") or [[a + 1 + 0.6 * i, lock - (8 - i) * 1.5, 2.0] for i in range(9)]
        t_a = T.fr(min(d[0] for d in digs))

        def clatter(r, digs=digs, t_a=t_a):
            """every digit's flips (one card per T f from s(i) to land(i)), the board's dense split-flap clatter"""
            dur = T.fr(max(d[1] for d in digs)) - t_a + 0.2
            y = np.zeros(ns(dur))
            for i, (s_, land, Tf) in enumerate(digs):
                nfl = max(1, int(np.floor((land - s_) / Tf)))
                for k in range(1, nfl + 1):
                    tk = T.fr(s_ + k * Tf) - t_a
                    G._place_mono(y, G.flap(r, k == nfl) * (0.45 + 0.3 * r.random()) * (1.6 if k == nfl else 1.0), tk)
            return y
        ev_t("flap", t_a, f"the LOANS split-flap board rolls (9 digits, each flipping every {digs[0][2]:g} f) and locks digit by digit",
             one(clatter), -21, pe="flaps_1", p=0.35)
        ev("flap", lock, "the counter LOCKS on $150,000,000 (the last card's double tap)", one(lambda r: G.counter_tick(r, True)), -24,
           pe="flaps_1", p=0.35)
    if D.get("horn_1") is not None:
        ev("horn", D["horn_1"], "a far ship's horn across the harbour, inside the '$150 million...' pause (out before 'tanks')",
           one(lambda r: G.ship_horn(r, 0.75)), -27, pe="horn_1", p=-0.4, send=0.15, post=ring_cut(0.85, 0.12))
    if D.get("wings_1_land") is not None:
        ev("wings", D["wings_1_land"], "the gull flutters down onto the rail", one(lambda r: G2.wing_flaps(r, 3, 9.0, 0.7)), -34, pe="wings_1_land", p=0.45)
    if D.get("wings_1") is not None:
        ev("wings", D["wings_1"], "the rail gull flaps off", one(lambda r: G2.wing_flaps(r, 4, 8.0)), -31, pe="wings_1", p=0.45)
    if D.get("gull_1") is not None:
        ev("gull", D["gull_1"], "a gull cries over the harbour as it lifts off (gap after 'water.')",
           one(lambda r: G.gull(r, 2, 760.0, 1.2)), -27, pe="gull_1", p=0.4, lpf=6500)
    # ---------------- 2 SETTING (tank farm, noon)
    for j, f in enumerate(_frames(D.get("flags_2"))):
        ev("flag", f, "a far flag snaps in the gust (A2 P3: at bed level - the hut flag is not in frame)", one(lambda r: G.flag_snap(r, 2)), -37,
           pe="flags_2", p=-0.45 + 0.2 * j, lpf=5000)
    if D.get("gull_2") is not None:
        ev("gull", D["gull_2"], "a gull over the tank farm (gap after 'king.')", one(lambda r: G.gull(r, 2, 690.0, 1.5)), -28,
           pe="gull_2", p=0.45, lpf=6000)
    if D.get("fence_2") is not None:
        ev("fence", D["fence_2"], "the chain-link gate shivers in a gust as the glide passes it", one(lambda r: G2.fence_rattle(r, 0.9)), -33,
           pe="fence_2", p=-0.3)
    if D.get("clank_2") is not None:
        ev("clank", D["clank_2"], "a far clank across the tank farm", one(lambda r: G.far_clank(r)), -33, pe="clank_2", p=0.45)
    if D.get("horn_2") is not None:          # A3 ADD: the harbour placed by ear (far, 1-4 kHz carved under the words)
        ev("horn", D["horn_2"], "a far ship's horn across the harbour, deep under 'New Jersey's'", one(lambda r: G.ship_horn(r, 1.0)), -36,
           pe="horn_2", p=0.5, lpf=2500, send=0.15, wcarve=-6.0, post=ring_cut(1.0, 0.15))
    if D.get("halyard_2") is not None:
        ev("halyard", D["halyard_2"], "the gate flagpole's halyard clinks on the pole (the 'king.|His' breath)", one(lambda r: G4.halyard_clink(r)),
           -30, pe="halyard_2", p=-0.45, lpf=7000, send=0.06, wcarve=-5.0)
    if D.get("plip_2") is not None:
        ev("plip", D["plip_2"], "the ONE water drop from the valve lands: a tiny clear 'plip' (in the band's stop-time)",
           one(lambda r: G.drop_plip(r, 1050.0)), -21, pe="plip_2", p=-0.25, send=0.12)
    # ---------------- 3 BANK
    if D.get("stamp_3") is not None:
        ev("stamp", D["stamp_3"], "APPROVED: the rubber stamp comes down on the OIL RECEIPT ('money')",
           lambda: (lambda xa: (xa[0], xa[1]))(G.desk_stamp(rng(31))), -12, pe="stamp_3", space="room", send=0.1)
    c0, c1 = _frames(D.get("cash_3")) or [None, None]
    if c0 is not None:
        Lc = T.fr(c1) - T.fr(c0)
        # A2 P2: the slide was inaudible (-50..-58 dBFS under the voice): +10 dB, a lighter carve (the push is visible 499-515)
        try:                                  # ... but it fades under the soft 'it.' (the word margin)
            t_it = float(T.word("it", T.fr(c0) + 0.1)["s"]) - T.fr(c0)
        except KeyError:
            t_it = Lc

        def cash(r, Lc=Lc, t_it=t_it):
            y = G.cash_slide(r, Lc + 0.05)
            t = np.arange(len(y)) / SR
            return y * dbg(np.interp(t, [0, t_it - 0.06, t_it + 0.02], [0.0, 0.0, -12.0]))
        ev("cash_slide", c0, "the cash stack slides across the desk ('against it'), easing off under 'it.'", one(cash), -12,
           pe="cash_3", p=0.15, space="room", wcarve=-3.0)
    if D.get("chair_3") is not None:
        ev("chair", D["chair_3"], "the banker's leather chair creaks as he leans into the stamp", one(lambda r: G3.chair_creak(r)), -27,
           pe="chair_3", p=-0.1, space="room", wcarve=-6.0)
    if D.get("register_3") is not None:
        tk = T.fr(D["register_3"])
        # A2 P2: the 'ka-' sat inside 'it.' (word margin 1.2 LU): the whole ka-CHING plays after the WORD 'it.' ends, in the breath
        # before 'American' (the bell rings on into it, carved); never earlier than the cash landing
        try:
            w_it = T.word("it", tk - 0.6)
            t_ka = max(tk, float(w_it["e"]) + 0.005)
        except KeyError:
            t_ka = tk + 0.3
        # A3 P3: no drawer moves on the desk, so the drawer 'ka-' is gone: only a soft bell as the cash lands (the money 'ching')
        ev_t("ching", t_ka + 0.02, "the cash lands: a soft register bell in the breath after 'it.', ringing into 'American' (carved under it)",
             one(lambda r: G.ching(r, 1.2)), -24, pe="register_3", p=0.3, space="room", send=0.1, post=ring_cut(0.32, 0.1))
    # ---------------- 4 THE INSPECTION (tank top, noon)
    for j, f in enumerate(_frames(D.get("climb_4"))):
        if f < T.SHOTS[4]["a"] - 3:
            continue
        ev("steel_step", f, f"the tank man pulls himself up the top flight: a rung clang (pull {j + 1})",
           one(lambda r, j=j: G.steel_step(r, 0.9 + 0.05 * j, 1.0)), -21 + 0.7 * j, pe="climb_4", p=0.15, send=0.1)
    if D.get("rim_4") is not None:
        ev("steel_step", D["rim_4"], "he swings over the rim: the top tread clangs", one(lambda r: G.steel_step(r, 1.1, 1.3)), -19,
           pe="rim_4", p=0.12, send=0.1)
        ev("roof_step", D["rim_4"] + 3, "... his boot lands on the hollow roof", one(lambda r: G.roof_step(r, 1.0)), -24, pe="rim_4", p=0.1)
    for f in _frames(D.get("roof_4")):
        ev("roof_step", f, "he scurries round the hatch: boots on the hollow steel roof", one(lambda r: G.roof_step(r, 0.85)), -25, pe="roof_4", p=0.05)
    if D.get("knee_4") is not None:
        ev("knee", D["knee_4"], "he kneels at the hatch", one(lambda r: G.knee_down(r)), -27, pe="knee_4", p=0.0)
    q0, q1 = _frames(D.get("reel_4")) or [None, None]
    if q0 is not None:
        Lq = T.fr(q1) - T.fr(q0)
        envq = np.interp(np.arange(ns(Lq)) / SR, [0, Lq * 0.15, Lq * 0.7, Lq], [0.6, 1.0, 0.9, 0.25])
        ev("reel", q0, "'drop a tape inside': the reel pays the weighted tape out (fast, then slowing)",
           one(lambda r, Lq=Lq, envq=envq: G.reel_whirr(r, Lq, 34, 14, envq)), -25, pe="reel_4", p=0.0)
    if D.get("plunk_4") is not None:
        # A2 P3: the plunk + ring were inaudible under 'inside,' (-37 dBFS): +6 dB when the picture lands it in the breath, +3 on a word
        gpk = in_gap(D["plunk_4"], 0.0)
        ev("plunk", D["plunk_4"], "the plumb weight plunks into the oil", one(lambda r: G.plumb_plunk(r)), -15 if gpk else -18, pe="plunk_4", p=0.0,
           send=0.12)
        ev("tank_ring", D["plunk_4"] + 1, "... and the huge, mostly empty tank rings hollow under it (300-600 Hz steel, 0.6 s)",
           one(lambda r: G.modal(1.2, [(r.uniform(300, 330), 1.0, 0.55), (r.uniform(455, 480), 0.7, 0.42), (r.uniform(590, 620), 0.45, 0.3),
                                        (r.uniform(150, 165), 0.5, 0.6)], r) * (1 - np.exp(-G.tt(1.2) / 0.004))), -23 if gpk else -26,
           pe="plunk_4", p=0.0, space="tank", send=0.25)
    gl4 = _frames(D.get("gulls_4"))
    for j, f in enumerate(gl4):
        ev("gull", f, "far gulls circling over the tank top", one(lambda r, j=j: G.gull(r, 1 + j, 640.0 + 60 * j, 1.8)), -38 if j == 0 else -29,
           pe="gulls_4", p=(-0.5 if j == 0 else 0.5), lpf=5500)
    # A3 P2: the film's one HARD cut (tank top -> ground, story.ts R4_CUT_V = andInspector - 3): only the shout's echo tail may
    # ring across it - the rail gull's wings and squawk end on the cut (25 ms)
    t_cut4 = T.bt("andInspector", -3) if "andInspector" in T.BEAT else None
    if D.get("gull_perch_4") is not None:
        f = D["gull_perch_4"]
        cut_w = ring_cut(max(0.05, t_cut4 - 0.025 - T.fr(f)), 0.008) if t_cut4 else None
        ev("wings", f, "'full!' startles the perched gull off the rail (a burst of wing flaps, gone on the cut)",
           one(lambda r: G2.wing_flaps(r, 6, 10.0, 1.1)), -27, pe="gull_perch_4", p=-0.3, post=cut_w)
        f_sq = T.BEAT["shoutEnd"] + 1
        cut_s = ring_cut(max(0.05, t_cut4 - 0.025 - T.fr(f_sq)), 0.008) if t_cut4 else None
        ev("gull", f_sq, "... and it squawks as it flees (in the breath after the shout, under the echo; gone on the cut)",
           one(lambda r: G.gull(r, 1, 820.0, 1.1)), -31, pe="gull_perch_4", p=-0.45, lpf=6500, post=cut_s)
    if D.get("gull_far_4") is not None:
        f = D["gull_far_4"]
        gp = gap_at(T.fr(f), 0.1, 0.5)
        tg = (gp[0] + 0.01) if gp else T.fr(f)
        ev_t("gull", tg, "a far gull wheeling over the yard as the camera cranes down (gap 'inspector,|on')", one(lambda r: G.gull(r, 1, 720.0, 1.6)),
             -31, pe="gull_far_4", p=0.4, lpf=6000)
    for f in _frames(D.get("stand_4")):
        ev("roof_step", f, "he stands and scurries to the rail", one(lambda r: G.roof_step(r, 0.8)), -26, pe="stand_4", p=-0.1)
    if D.get("rail_4") is not None:
        ev("rail", D["rail_4"], "his hand grips the steel rail as he leans over", one(lambda r: G.rail_grab(r)), -27, pe="rail_4", p=-0.15)
    tkv = D.get("tick_4")
    if tkv is not None:
        # A2 P2 / P3: the check mark ON the picture's stroke (probed), a graphite scratch + tick as long as the stroke; in the
        # silence before 'believed' it is the joke's only sound (about -26 dBFS), on the word a little hotter (its band exempt)
        f_t, L_t = (tkv[0], tkv[1]) if isinstance(tkv, (list, tuple)) else (tkv, 8.0)
        ing = in_gap(f_t, 0.0) and in_gap(f_t + 0.7 * L_t, 0.0)
        # A3 P3: about -11 LU in the silence too (CHAR moves the stroke into it: the probe follows cast.ts)
        ev("tick", f_t, "the inspector ticks the clipboard WITHOUT LOOKING UP: a graphite check mark (touch, down-stroke, flick)" +
           (" in the silence before 'believed'" if ing else " on 'believed'"),
           one(lambda r, L_t=L_t: G3.graphite_tick(r, max(0.2, L_t * FR + 0.03))), -11, pe="tick_4", p=0.1, space="out",
           send=0.03, wcarve=0.0)
    for j, f in enumerate(_frames(D.get("taps_4"))):
        ev("cliptap", f, f"A3 ADD: the inspector's pencil taps the clipboard ({'tap' if j == 0 else '-tap'}) in the deadpan silence, before the tick",
           one(lambda r: G4.clipboard_tap(r)), -25 - 2 * j, pe="taps_4", p=0.1, space="out", send=0.03, wcarve=-4.0)
    # ---------------- 5 MORE LOANS (bank)
    for j, f in enumerate(_frames(D.get("stamps_5"))):
        ev("stamp5", f, f"the banker stamps happily, eyes closed (stamp {j + 1}, on the picture's landing)",
           lambda j=j: (lambda xa: (xa[0], xa[1]))(G.desk_stamp(rng(55 + j), 0.85)), -16, pe="stamps_5", space="room", send=0.1, p=0.05)
        ev("thup", f + 1, "... the stamp pad's soft paper 'thup' on the bundle of bills it lands on", one(lambda r: G4.paper_thup(r)), -34,
           pe="stamps_5", space="room", send=0.05, p=0.05, wcarve=-4.0)
    for j, f in enumerate(_frames(D.get("stamps_5L"))):
        ev("stamp5", f, f"the banker's left hand stamps between the beats (stamp {j + 1})",
           lambda j=j: (lambda xa: (xa[0], xa[1]))(G.desk_stamp(rng(75 + j), 0.7)), -20, pe="stamps_5L", space="room", send=0.1, p=-0.15)
    for j, f in enumerate(_frames(D.get("dings_5"))):
        notes = [1567.98, 2093.0] if j == 0 else [1567.98, 2093.0, 2489.0]
        try:                                  # the top bell lands in the breath after the word 'more.'
            we = float(T.word("more", T.fr(f) - 0.2)["e"])
        except KeyError:
            we = T.fr(f) + 0.3
        gp = gap_at(we + 0.02, 0.1, 0.15)
        t_top = (gp[0] + 0.01) if gp else we + 0.01
        times = list(np.linspace(0.0, max(0.1, t_top - T.fr(f)), len(notes)))

        def arp(r, notes=notes, times=times):
            y = np.zeros(ns(times[-1] + 0.9))
            for k, (f0, tk) in enumerate(zip(notes, times)):
                top = k == len(notes) - 1
                G._place_mono(y, G2.register_bell(r, f0, 0.45 if top else 0.2) * (1.0 if top else 0.75), tk)
            return y
        ev("ding5", f, f"the cash stacks pop taller on 'more': a rising register 'ka-ching' ({len(notes)} bells, the top one in the "
                       "breath after the word)", one(arp), -12, pe="dings_5", p=0.3, space="room", send=0.1,
           post=ring_cut(times[-1] + 0.3, 0.1))
    # ---------------- 6 THE CHART
    for j, f in enumerate(_frames(D.get("ratchet_6"))):
        Lr = 0.42 if j == 0 else 0.92
        ev("ratchet", f - 3, "TINO'S OIL pile cranks up taller (ratchet)", one(lambda r, Lr=Lr, j=j: G.ratchet(r, Lr, 14 + 4 * j, 26 + 6 * j)), -16,
           pe="ratchet_6", p=0.25, space="room")
    pp6 = _frames(D.get("papers_6"))
    if len(pp6) == 2:                     # A2 P3: the rustle on the visible fan of receipts ('papers'), not on the ratchet
        # A3 P3: on the probed raise window, swelling to its peak AT THE TOP of the raise, then settling; -31 LU, 1-4 kHz carved
        Lp = (pp6[1] - pp6[0]) * FR

        def rustle6(r, Lp=Lp):
            y = G.paper_rustle(r, Lp + 0.22, 1.0)
            t = np.arange(len(y)) / SR
            return y * np.interp(t, [0.0, Lp, Lp + 0.05, Lp + 0.22], [0.35, 1.0, 0.8, 0.0])
        ev("paper", pp6[0], "Tino raises the fan of OIL RECEIPTS on 'papers': the sheets rustle, loudest at the top of the raise", one(rustle6),
           -31, pe="papers_6", p=0.3, space="room", wcarve=-6.0)
    for f in _frames(D.get("marker_6")):  # A3 ADD
        ev("marker", f, "a felt-marker squeak as the next stage of TINO'S OIL is drawn onto the chart (under the ratchet)",
           one(lambda r: G4.marker_squeak(r, 2)), -28, pe="marker_6", p=0.2, space="room", wcarve=-5.0)
    dr = D.get("drums_6")
    if dr:
        allf = [(f, 1) for f in dr["st1"]] + [(f, 2) for f in dr["st2"]]
        t_d0 = T.fr(min(f for f, _ in allf))

        def tonks(r, allf=allf, t_d0=t_d0):
            y = np.zeros(ns(T.fr(max(f for f, _ in allf)) - t_d0 + 0.5))
            for k, (f, sg) in enumerate(allf):
                G._place_mono(y, G2.drum_tonk(r, r.uniform(250, 330) * (1.0 + 0.012 * k)) * (0.8 if sg == 1 else 0.55) * r.uniform(0.75, 1.0),
                              T.fr(f) - t_d0)
            return y
        ev_t("tonk", t_d0, "each drum dropping onto TINO'S OIL lands with a hollow 'tonk'", one(tonks), -25, pe="drums_6", p=0.25, space="room")
        scale = [67, 69, 71, 72, 74, 75, 77, 79, 80, 82, 84, 86, 87, 89, 91, 92, 94]   # rising with the pile (G5 up)
        notes = [(f, scale[min(len(scale) - 1, k)]) for k, f in enumerate(([dr["st1"][i] for i in range(1, len(dr["st1"]), 2)]
                                                                          + [dr["st2"][i] for i in range(1, len(dr["st2"]), 2)]))]
        t_x0 = T.fr(notes[0][0])

        def xylo(r, notes=notes, t_x0=t_x0):
            y = np.zeros(ns(T.fr(notes[-1][0]) - t_x0 + 1.0))
            for k, (f, m) in enumerate(notes):
                G._place_mono(y, I.marimba(I.m2f(m), 0.75, r, dur=0.5, mallet=1.0) * (0.75 + 0.25 * k / len(notes)), T.fr(f) - t_x0)
            return hp(y, 900, 2)
        ev_t("xylo", t_x0, "a xylophone climbs one note per two drums with the growing pile (G5 up two octaves)", one(xylo), -22,
             pe="drums_6", p=0.3, space="room", send=0.12)
        last1, last2 = max(dr["st1"]), max(dr["st2"])
        ev("boing", last1 + 3, "... the first stack settles with a soft comic boing", one(lambda r: G.boing(r, 170)), -24, pe="drums_6", p=0.25,
           space="room")
        ev("boing", last2 + 2, "... the top drum lands and the whole pile wobbles (boing)", one(lambda r: G.boing(r, 200, 0.6, 0.4)), -21,
           pe="drums_6", p=0.25, space="room")
    for j, f in enumerate(_frames(D.get("clock_6"))):
        ev("clock", f, "the wall clock's second hand steps (tick / tock)", one(lambda r, j=j: G.clock_tick(r, j % 2 == 1)),
           -26 if in_gap(f) else -31, pe="clock_6", p=-0.35, space="room")
    # ---------------- 7 MYSTERY
    if D.get("gull_7") is not None:
        ev("gull", D["gull_7"], "a lone far gull as the light turns late (bed level: no gull in frame)", one(lambda r: G.gull(r, 1, 600.0, 2.2)), -38,
           pe="gull_7", p=-0.5, lpf=5000)
    dr7 = _frames(D.get("drone_7"))
    if len(dr7) == 2:                     # A2 ADD: the hatch sounds deep and empty before the reveal
        t_a7, t_b7 = T.fr(dr7[0]), T.fr(dr7[1])
        try:
            t_lk = float(T.word("look", T.bt("look") - 0.2)["s"])
        except KeyError:
            t_lk = t_b7 - 0.8

        def drone(r, t_a7=t_a7, t_b7=t_b7, t_lk=t_lk):
            L7 = t_b7 - t_a7 + 0.04
            y = G3.tank_drone(r, L7, 73.42, 77.8)          # D2 (the #11 of Abmaj7#11, the 5th of G7sus) beating at ~4.4 Hz
            t = np.arange(len(y)) / SR
            sw = np.interp(t, [0, t_lk - t_a7 - 0.2, t_lk - t_a7 + 0.3, L7], [0.0, 0.0, 2.0, 2.0])     # +2 dB on 'look inside?'
            cut = np.clip((L7 - t) / 0.04, 0, 1)                                                       # cut with the bloop
            return y * dbg(sw) * cut
        ev_t("drone", t_a7, "the empty tank's low hollow drone (two beating low tones + the hatch's air), +2 dB on 'look inside?', cut "
                            "with the bloop", one(drone), -34, pe="drone_7", p=0.0, space="tank", send=0.05)
    if D.get("creak_7") is not None:
        ev("creak", D["creak_7"], "the lender leans in over the hatch on 'someone': the steel lid creaks", one(lambda r: G2.hinge_creak(r, 0.6)),
           -29, pe="creak_7", p=0.15, space="out", send=0.1)
    if D.get("bloop_7") is not None:
        ev("bloop", D["bloop_7"] - 4.5, "one soft 'bloop' as 'inside?' ends: the bubble rises and pops at the reflection's chin (the pop ON "
                                        "the picture's pop)", one(lambda r: G.bloop(r)), -19, pe="bloop_7", p=0.0, send=0.15)
    if D.get("drip_7") is not None:      # A3 ADD: how hollow the tank is - one drip and its 1.2 s steel answer, gone under 'Then,'
        t_d7 = T.fr(D["drip_7"])
        try:
            t_th = float(T.word("Then", t_d7 - 0.1)["s"])
        except KeyError:
            t_th = t_d7 + 0.6
        Ld7 = max(0.3, t_th + 0.12 - t_d7)

        def drip7(r, Ld7=Ld7, t_th=t_th, t_d7=t_d7):
            y = G4.drip_echo(r, 1.2)[: ns(Ld7)]
            t = np.arange(len(y)) / SR
            return y * np.clip((Ld7 - t) / 0.28, 0, 1) ** 1.5
        ev("drip", D["drip_7"], "one drop falls from the hatch rim into the near-empty tank: a hollow drip and the steel cavity's long answer "
                                "(the 'inside?|Then' gap, faded under 'Then,')", one(drip7), -34, pe="drip_7", p=-0.1, send=0.0, wcarve=-6.0)
    # ---------------- 8 THE CRASH (trading floor)
    for j, f in enumerate(_frames(D.get("phones_8"))):
        ev("phone", f, "a desk phone rings on the trading floor", one(lambda r, j=j: G.phone_ring(r, 0.7 + 0.25 * (j % 2), 1.0 + 0.3 * j)),
           -21 if j == 1 else -25, pe="phones_8", p=(-0.5, 0.45, -0.2)[j % 3], space="hall", send=0.14)
    t_cw = None
    try:
        t_cw = float(T.word("crashed", T.bt("crashed1") - 0.3)["e"])
    except KeyError:
        pass
    if D.get("crash_8") is not None:
        # A2 P1: the THOOM sat 4.3 dB OVER the soft word 'crashed.' (margin 2.9 LU): the transient stays on the dive, its low
        # body steps 6 dB aside while the word sounds and swells back (+2 dB) in the breath after it, into the lightning crack
        t_c8 = T.fr(D["crash_8"])

        def body_duck(x, t_c8=t_c8):
            tw = (t_cw if t_cw is not None else t_c8 + 0.75) - t_c8
            t = np.arange(x.shape[-1]) / SR
            g = np.interp(t, [0.0, 0.02, 0.05, tw, tw + 0.09], [0.0, 0.0, -10.0, -10.0, 4.0])     # the low body
            g2 = np.interp(t, [0.0, 0.02, 0.05, tw, tw + 0.09], [0.0, 0.0, -5.0, -5.0, 0.0])     # the knock + rattle above it
            low = lp(x, 450.0, 4)
            return (x - low) * dbg(g2)[None, :] + low * dbg(g)[None, :]
        ev("crash", D["crash_8"], "'crashed': the chalk line dives - a heavy THOOM (the biggest hit of the film); its body steps aside under "
                                  "the word and blooms in the breath after it", one(lambda r: G.crash_thud(r)),
           -8, pe="crash_8", space="hall", send=0.12, p=0.0, post=body_duck)
        ev("paper_flutter", D["crash_8"] + 4, "ticker tape and paper slips flutter down", one(lambda r: G.paper_flutter(r, np.interp(np.arange(ns(1.6)) / SR, [0, 0.15, 1.6], [0, 1, 0.1]))),
           -31, pe="crash_8", p=-0.3, space="hall", wcarve=-7.0)
    if D.get("groan_8") is not None:
        tg8 = max(T.fr(D["groan_8"]), (t_cw - 0.08) if t_cw is not None else 0.0)
        ev_t("groan", tg8, "the traders' dismayed 'ohhhh' as the word 'crashed.' ends, under the THOOM's tail", one(lambda r: G2.crowd_groan(r, 0.95, 9)),
             -26, pe="groan_8", p=0.0, space="hall", send=0.14)
    if D.get("tickbell_8") is not None:
        # A3 P3: no ticker machine's hammer is in frame yet: the bell drops to bed level, 1-4 kHz carved under 'November'
        hm = bool(picture_probes()[0].get("ticker_hammer"))      # back to -27 LU once WORLD-INT's hammer flicks on 'November'
        ev("ticker_bell", D["tickbell_8"], "a ticker machine's bell on 'November' (a quote line comes in" + ("; the hammer flicks)" if hm else "; bed level)"),
           one(lambda r: G3.ticker_bell(r)), -27 if hm else -38, pe="tickbell_8", p=0.4, space="hall", send=0.1, post=ring_cut(0.18, 0.06),
           wcarve=-3.0 if hm else -6.0)
    if D.get("chalk_8") is not None:      # A3 ADD: the board dive gets its own sound in the breath after 'crashed.'
        ev("chalk", D["chalk_8"], "the chalk line dives: a short chalk squeal on the slate (the breath after 'crashed.', under the THOOM's tail)",
           one(lambda r: G4.chalk_squeal(r, 0.12)), -24, pe="chalk_8", p=0.05, space="hall", send=0.1, wcarve=-6.0)
    if D.get("handset_8") is not None:
        gph = gap_at(T.fr(D["handset_8"]), 0.05, 0.3) if picture_probes()[0].get("slam8") is None else None
        th8 = (gph[0] + 0.005) if gph else T.fr(D["handset_8"])           # (on the probed slam it stays ON the picture)
        ev_t("handset", th8, "a trader slams his handset onto its cradle (the breath after '1963,')", one(lambda r: G3.handset_slam(r)), -24,
             pe="handset_8", p=-0.35, space="hall", send=0.12, wcarve=-5.0)
    # ---------------- 9 THE STORM (tank farm)
    lt = D.get("lightning_9") or []
    lt = [(x[0], x[1]) if isinstance(x, (list, tuple)) else (x, 0) for x in lt]
    near_done = 0
    for j, (f, far) in enumerate(sorted(lt)):
        if far:
            ev("thunder", f + 4, "a far flash behind the tanks: its roll comes late and low (under 'checked the tanks')",
               one(lambda r: G2.lightning_crack(r, 2.4, 2.2)), -21, pe="lightning_9", p=0.25, send=0.0)
            continue
        t = T.fr(f)
        gp = None
        if speaking(t)[0]:                    # the flash lands on a word: its thunder comes in the next breath (light first)
            gp = next(((a, b) for a, b in T.SILENCES if t < a < t + 0.75 and b - a >= 0.3), None)
        if gp:
            ev_t("thunder", gp[0] + 0.03, "the flash on 'bust' is seen first: its thunder booms in the breath after 'bust.'",
                 one(lambda r: G2.lightning_crack(r, 1.9, 1.6)), -15, pe="lightning_9", p=-0.15, send=0.0)
        else:
            # A3 P3: the first crack sat a little hot for its faint flash: -11 -> -14 LU (the roll kept)
            ev("thunder", f, "the lightning strike: a crack + roll ON the flash" + (" (through the 8 -> 9 dissolve, into the storm)" if near_done == 0 else ""),
               one(lambda r, k=near_done: G2.lightning_crack(r, 2.4 if k == 0 else 1.8, 1.0 if k == 0 else 1.2)), THUNDER_FIRST if near_done == 0 else -15,
               pe="lightning_9", p=0.0, send=0.0)
            near_done += 1
    if D.get("slap_9") is not None:
        ev("slap", D["slap_9"], "BANKRUPT: the notice slapped onto the wet gate sign ('bust')", one(lambda r: G.paper_slap(r)), -16,
           pe="slap_9", p=-0.1, wcarve=-6.0)
    if D.get("splash_9") is not None:     # A3 ADD
        ev("splash", D["splash_9"], "... the slap knocks the water off the sign's gutter lip: a short splash onto the wet ground",
           one(lambda r: G4.splash(r)), -27, pe="splash_9", p=0.3, lpf=8000, send=0.05, wcarve=-5.0)
    lw = D.get("lenders_9")
    if isinstance(lw, dict) and lw.get("t0"):
        t0s, stp, lend = [float(x) for x in lw["t0"]], float(lw.get("step", 10.0)), float(lw.get("end", T.BEAT["inside"] - 2))
        for w, t0 in enumerate(t0s):
            f = t0 + 4 + stp / 2
            while f < lend:
                u = (f - t0s[0]) / max(1.0, lend - t0s[0])
                ev("wet_step", f, f"a lender walking in through the gate (wet footfall, moving away)", one(lambda r: G2.wet_step(r, 0.9)),
                   -31 - 6 * u - 1.5 * (w % 2), pe="lenders_9", p=(-0.35, 0.1, 0.35)[w % 3], lpf=7000 - 2500 * u, wcarve=-6.0)   # A2 P2: -3 dB
                f += stp
        la = min(t0s)
        Lu = T.fr(lend + 6) - T.fr(la - 4)
        t_u0 = T.fr(la - 4)

        def umb(r, Lu=Lu, t_u0=t_u0):         # A3 P3: the rain on the umbrellas swells +3 dB in the word gaps
            n = ns(Lu)
            t = np.arange(n) / SR
            y = G2.umbrella_patter(n, r) * np.interp(t, [0, 0.3, Lu - 0.4, Lu], [0, 1, 0.75, 0])
            return y * dbg(3.0 * (1 - word_env(t_u0 + t, pre=0.1, post=0.1, tau=0.12)) - 1.0)
        ev("umbrella", la - 4, "rain drumming on the lenders' black umbrellas as they walk in (swelling +3 dB in the breaths)", one(umb),
           -28, pe="lenders_9", p=0.0)

        def flutter(r, Lu=Lu, t_u0=t_u0):     # A3 ADD: the gusts catch the canopies (the shared gust curve)
            n = ns(Lu)
            t = np.arange(n) / SR
            return G4.umbrella_flutter(n, r, T.gust(t_u0 + t)) * np.interp(t, [0, 0.4, Lu - 0.4, Lu], [0, 1, 1, 0])
        ev("umbrella", la - 4, "the wind gusts catch the lenders' umbrella canopies: soft fabric flutter on the gust peaks", one(flutter), -38,
           pe="lenders_9", p=0.15, lpf=4000, wcarve=-5.0)
    ld = D.get("ladder_9")
    if isinstance(ld, dict):
        f = float(ld["a"]) + float(ld.get("land", 6.0))
        while f < float(ld["end"]):
            if f >= T.SHOTS[9]["a"] - 4:
                ev("ladder_far", f, "the far climber's boot on a ladder tread, in the rain", one(lambda r: G.steel_step(r, 0.6, 1.4)),
                   -33 if speaking(T.fr(f))[0] else -29, pe="ladder_9", p=0.35, lpf=3500, wcarve=-6.0)   # A2 P2: -3 dB under the words
            f += float(ld["step"])
    # ---------------- 10 REVEAL (cutaway): the music is silent
    for j, f in enumerate(_frames(D.get("blips_10"))):
        ev("blip", f, "a tiny bubble rising in the dark water (the held breath after 'Inside...')", one(lambda r, j=j: G2.bubble_blip(r, 520 + 140 * j)),
           -27 - 2 * j, pe="blips_10", p=(-0.2, 0.15, 0.0)[j % 3], space="tank", send=0.2)
    if D.get("slosh_10") is not None:
        gp = gap_at(T.fr(D["slosh_10"]), 0.25, 0.25)
        ts = max(T.fr(D["slosh_10"]), gp[0] + 0.03) if gp else T.fr(D["slosh_10"])
        ev_t("slosh", ts, "ONE big slosh inside the tank after 'water.' (in the silence)", one(lambda r: G.tank_slosh(r, 1.0, 0.13), 0.0), -12,
             pe="slosh_10", p=0.0, space="tank", send=0.18)
    if D.get("blub_10") is not None:
        ev("blub", D["blub_10"], "the fish's startled flip after the slosh: one 'blub'", one(lambda r: G.bloop(r, 260.0)), -25, pe="blub_10",
           p=0.1, space="tank", send=0.15)
    # ---------------- 11 PIVOT (kitchen)
    sk = _frames(D.get("shake_11"))
    if sk:
        a, b_, w = sk[0], sk[1], (sk[2] if len(sk) > 2 else 1.9)
        per = np.pi / w / T.FPS                          # one liquid stroke per half oscillation of the hand
        nstr = max(2, int((b_ - a) / T.FPS / per))

        try:                                  # A2 P3: the strokes under 'Ever left' a further -3 dB, the rest at full level
            t_lf = float(T.word("left", T.fr(a) - 0.1)["e"]) - T.fr(a)
        except KeyError:
            t_lf = 0.45

        def shake(r, a=a, b_=b_, per=per, nstr=nstr, t_lf=t_lf):
            y = G.bottle_shake(r, nstr, per)
            t = np.arange(len(y)) / SR
            Ls = (b_ - a) / T.FPS
            return y * (0.25 + 0.75 * np.sin(np.pi * np.clip(t / Ls, 0, 1)) ** 0.8) * dbg(np.interp(t, [0, t_lf - 0.03, t_lf + 0.05], [-3.0, -3.0, 0.0]))
        ev("shake", a, f"'Ever': the hand shakes the dressing bottle ({nstr} strokes, liquid sloshing in glass, the cap knocking; the first "
                       "strokes 3 dB softer under 'Ever left')", one(shake), -12, pe="shake_11", p=0.1, space="room", post=hishelf(3000, 3.0))
    if D.get("clunk_11") is not None:
        ev("clunk", D["clunk_11"], "the hand sets the bottle back down on the table: a soft glass clunk", one(lambda r: G3.glass_clunk(r)), -24,
           pe="clunk_11", p=0.1, space="room", wcarve=-5.0)
    for j, f in enumerate(_frames(D.get("chirps_11"))):
        ing = in_gap(f, 0.0)
        ev("chirp", f, "the sparrow on the fence chirrups as it hops" + (" (in the breath)" if ing else " (far under the words)"),
           one(lambda r: G3.sparrow_chirp(r)), -29 if ing else -38, pe="chirps_11", p=-0.35, lpf=7500, wcarve=-6.0)
    g0, g1 = _frames(D.get("glug_11")) or [None, None]
    if g0 is not None:
        Lg = T.fr(g1) - T.fr(g0)
        ev("glug", g0, "the oil rises and settles: a few soft slow glugs", one(lambda r, Lg=Lg: G.glug(r, Lg, 3)), -17, pe="glug_11", p=0.1, space="room")
    # ---------------- 12 HOW IT LOOKS FULL (cutaway)
    w0, w1 = _frames(D.get("pour_12")) or [None, None]
    if w0 is not None:
        # A3 P2: the pour lasted ~0.5 s (the lambda read Lw LATE: the shot-13 wipe reused the name) - now the whole visible fill,
        # a sustained stream whose cavity note rises with the level, 3 dB under 'Fill a tank with water,', full in the breath after
        Lw = T.fr(w1) - T.fr(w0)
        t_w0 = T.fr(w0)
        try:
            t_wa = float(T.word("water", t_w0 - 0.3)["e"]) - t_w0
        except KeyError:
            t_wa = Lw * 0.6

        def pour(r, Lw=Lw, t_wa=t_wa):
            y = G.water_pour(r, Lw + 0.12, (0.2, 1.0))           # (+0.12 s: its 0.15 s end fade lands as the stream stops)
            t = np.arange(len(y)) / SR
            return y * dbg(np.interp(t, [0.0, t_wa, t_wa + 0.1], [-3.0, -3.0, 0.0]))
        ev("pour", w0, "the water pours in for the whole fill (a sustained stream, the tank's note rising with the level; 3 dB under "
                       "'Fill a tank with water,')", one(pour), -13.5, pe="pour_12", p=-0.15, space="tank", send=0.1, post=hishelf(3500, 2.5),
           wcarve=dict(db=-2.0, lo=900.0, hi=5000.0))
    if D.get("fish_12") is not None:      # A3 P2: the gag's sound - the fish drops out of the pipe into the water
        ev("blub", D["fish_12"], "the fish drops from the pipe into the rising water: one small 'blub' (the 'water,|add' breath)",
           one(lambda r: G.bloop(r, 300.0)), -21, pe="fish_12", p=-0.1, space="tank", send=0.15)
    o0, o1 = _frames(D.get("trickle_12")) or [None, None]
    if o0 is not None:
        Lo = T.fr(o1) - T.fr(o0)
        ev("trickle", o0, "a thin pour of oil onto the water", one(lambda r, Lo=Lo: G.oil_trickle(r, Lo)), -16, pe="trickle_12", p=-0.15, space="tank",
           post=hishelf(2500, 4.0))
    if D.get("ding_12") is not None:
        ev("ding12", D["ding_12"], "'it looks full.': a tiny bright ding in the breath after 'full.'", one(lambda r: G.ding(r, 3135.96, 0.3, 0.8)),
           -12, pe="ding_12", p=0.2, post=ring_cut(0.28, 0.08))
    if D.get("blip_12") is not None:
        ev("blip", D["blip_12"], "the fish swims past: a tiny bubble blip", one(lambda r: G2.bubble_blip(r, 700.0)), -27, pe="blip_12", p=-0.2,
           space="tank", send=0.15)
    # ---------------- 13 THE PIPES (pump room)
    vd = D.get("valves_13")
    if isinstance(vd, dict):                 # CHAR's pulls: the first pull of each burst squeals out loud (three of them), the rest grind
        vv, loud = [], []
        for w in ("w0", "w1"):
            prev = -1e9
            for f in [float(x) for x in vd.get(w, [])]:
                vv.append(f)
                if f - prev > 20 and f < T.BEAT["hardest"] - 6:
                    loud.append(f)
                prev = f
        loud = sorted(loud)[:3]
        vv = sorted(vv)
    else:
        vv = _frames(vd)
        loud = []                            # three heaves squeal out loud, each in a word gap (never on the blob's tired tag)
        for f in vv:
            if f < T.BEAT["hardest"] - 6 and (in_gap(f + 2, 0.0) or in_gap(f + 4, 0.0)) and all(abs(f - g) > 20 for g in loud) and len(loud) < 3:
                loud.append(f)
    for j, f in enumerate(vv):
        lo_ = f in loud
        ev("valve", f + 2, "a worker heaves his red valve wheel round (" + ("the first pull: the stem squeals)" if lo_ else "the stem grinds)"),
           one(lambda r, lo_=lo_: G.valve_squeak(r, 0.45 if lo_ else 0.4)), -25 if lo_ else -34, pe="valves_13",
           p=(-0.4 if int(f) % 2 == 0 else 0.35), space="pump")
    for f in _frames(D.get("drips_13")):
        ev("drip", f, "the gold drip off the flange lands in its tray", one(lambda r: G2.pipe_plink(r)), -27 if in_gap(f) else -32,
           pe="drips_13", p=0.4, space="pump",
           send=0.15)
    if D.get("knock_13") is not None:
        ev("knock", D["knock_13"], "a far pipe knock down the line", one(lambda r: G2.pump_knock(r)), -30, pe="knock_13", p=-0.45, space="pump",
           send=0.15)
    b0_, b1_ = _frames(D.get("blob_13")) or [None, None]
    if b0_ is not None:
        Lb = T.fr(b1_) - T.fr(b0_)
        ev("gurgle", b0_, "the oil blob riding the glass pipe tank to tank (gurgle)", one(lambda r, Lb=Lb: G.blob_gurgle(r, Lb)), -27,
           pe="blob_13", p=0.0, space="pump")
    for j, f in enumerate(_frames(D.get("plates_13"))):
        f0 = (783.99, 880.0, 987.77)[min(j, 2)]

        def plate(r, f0=f0):
            y = np.zeros(ns(0.9))
            G._place_mono(y, G.plate_tick(r), 0.0)
            G._place_mono(y, G2.register_bell(r, f0, 0.32) * 0.55, 0.012)
            return y
        ev("plate", f - 1, f"COUNTED: {j + 1} - the plate flips over with a little counter bell (rising G5 / A5 / B5)", one(plate), -13,
           pe="plates_13", p=-0.35 + 0.35 * j, space="pump", post=ring_cut(0.35, 0.1))
    if D.get("sweat_13") is not None:
        ev("sweat", D["sweat_13"] - 2, "a sweat drop pops out on the blob ('hardest-working')", one(lambda r: G.drop_plip(r, 800.0)), -20,
           pe="sweat_13", p=0.0)
    wp = _frames(D.get("wipe_13"))
    if wp:
        # A2 P1: the swipe ON the picture's arm (probed X .. X + L): onset X + 2, its swell peaking mid-wipe, then the flecks
        Lw = max(0.3, (wp[1] - wp[0] - 2) * FR)
        ev("wipe", wp[0] + 2, "the brow wipe (a soft squeegee swipe across the brow, peaking mid-wipe)", one(lambda r, Lw=Lw: G.cash_slide(r, Lw)),
           -18, pe="wipe_13", p=0.0, lpf=5000, wcarve=-4.0)
        ev("flick", wp[1] + 2, "... the sweat flecks flicked off the brow (tiny wet ticks)", one(lambda r: G3.sweat_flick(r, 3)), -21,
           pe="wipe_13", p=0.25, lpf=7000, wcarve=-3.0)
    for j, f in enumerate(_frames(D.get("squeak_13"))):
        ev("squeak", f, "the blob squeezes out of the pipe mouth into the tank: a rubbery squeak", one(lambda r, j=j: G3.rubber_squeak(r, j != 1)),
           -26, pe="squeak_13", p=-0.3 + 0.3 * j, space="pump", send=0.08, wcarve=-5.0)
    if D.get("steam_13") is not None:
        ev("steam", D["steam_13"], "a valve lets off a small steam puff on the second COUNTED plate", one(lambda r: G3.steam_puff(r)), -30,
           pe="steam_13", p=0.45, space="pump", send=0.1, wcarve=-4.0)
    for j, f in enumerate(_frames(D.get("squelch_13"))):      # A3 ADD
        ev("squelch", f, f"the blob lands at COUNTED plate {j + 1}: a tiny wet squelch, 1 f before the plate's bell",
           one(lambda r: G4.squelch(r)), -27, pe="squelch_13", p=-0.35 + 0.35 * j, space="pump", send=0.06, wcarve=-4.0)
    for j, f in enumerate(_frames(D.get("pclock_13"))):       # A3 ADD
        ev("clock", f, "the pump-room wall clock ticks (very low, under the night bed)", one(lambda r, j=j: G.clock_tick(r, j % 2 == 1)), -40,
           pe="pclock_13", p=0.45, space="pump", send=0.05, lpf=6000)
    t_am = None
    try:
        t_am = float(T.word("America", T.bt("america") - 0.1)["e"])
    except KeyError:
        pass
    if t_am is not None:
        gp = gap_at(t_am + 0.05, 0.3, 0.2)
        if gp:
            # A2 P3: the sigh crowded 'When it came': it is over (80 ms fade) 0.12 s before the next word
            Lsg = max(0.2, min(0.6, gp[1] - 0.12 - (gp[0] + 0.02)))

            def sighf(r, Lsg=Lsg):
                y = G.sigh(r, 235.0, Lsg)[: ns(Lsg)]
                y[-ns(0.08):] *= np.linspace(1, 0, ns(0.08)) ** 1.5
                return y
            ev_t("sigh", gp[0] + 0.02, "the blob's tired sigh in the gap after 'America.' (gone before 'When')", one(sighf),
                 -17, pe="sigh_13", p=0.0, space="pump", send=0.04)
    # ---------------- 14 FALLOUT (street)
    sp = D.get("spin_14")
    if sp:
        a, land = float(sp["a"]), float(sp["land"])
        Ls = T.fr(land) - T.fr(a)
        try:                                  # A2 P3: the whoosh -4 dB until 'came' ends (it crowded 'When it came'), the slap at full level
            t_cm = float(T.word("came", T.fr(a) - 0.3)["e"]) - T.fr(a)
        except KeyError:
            t_cm = Ls * 0.7

        # A3 P3: the whoosh from 2 f before the paper enters the frame; the landing is its OWN transient ~6 dB over the whoosh
        # body, its energy at 0.2-1 kHz (it falls under 'out,': the 1-4 kHz band is carved 4 dB there)
        def spin(r, Ls=Ls, t_cm=t_cm):
            y = G4.spin_whoosh(r, Ls)
            t = np.arange(y.shape[-1]) / SR
            return y * dbg(np.interp(t, [0, min(t_cm, Ls - 0.06), min(t_cm, Ls - 0.06) + 0.05], [-4.0, -4.0, 0.0]))
        ev("spin", a, "the newspaper spins in over the stand ('came out'): the whoosh, soft under 'When it came'", one(spin), -19, pe="spin_14", p=0.1)
        ev("slap14", land, "... and SLAPS flat onto the stand's stack (a separate low-mid transient)", one(lambda r: G4.paper_slap_low(r)), -26,
           pe="spin_14", p=0.1, send=0.05, wcarve=-4.0)
    if D.get("tyre_14") is not None:      # A3 ADD: hands the ear over to the office
        f_ty = D["tyre_14"]

        def tyre(r):
            return G2.car_pass(r, 1.3, 0.5)
        ev_t("tyre", T.fr(f_ty) - 0.65, "a far car's tyres hiss past on the grey street (off screen), peaking in the 'crashed.|But' breath",
             one(tyre), -34, pe="tyre_14", p=0.35, lpf=3200, wcarve=-6.0)
    if D.get("vendor_14") is not None:
        ev("paper", D["vendor_14"], "the vendor squares the newspaper stack", one(lambda r: G.paper_rustle(r, 0.45, 1.1)), -28, pe="vendor_14", p=0.2)
    cr = D.get("car_14")
    if cr:
        a, pk, b_ = float(cr["a"]), float(cr["peak"]), float(cr["b"])
        Lc = T.fr(b_) - T.fr(a) + 0.6
        pkf = (T.fr(pk) - T.fr(a)) / Lc

        def car(r, Lc=Lc, pkf=pkf):
            x = G2.car_pass(r, Lc, pkf)
            t = np.arange(len(x)) / SR
            th = (np.clip(np.interp(t, [0, Lc], [-0.75, 0.75]), -1, 1) + 1) * np.pi / 4
            return np.stack([x * np.cos(th), x * np.sin(th)]) * 1.414
        ev("car", a, "a 1960s sedan passes across the bottom of frame (left -> right)", one(car), -24, pe="car_14", p=0.0)
    if D.get("clack_14") is not None:
        ev("clack", D["clack_14"], "the CLOSED sign clacks onto the firm's door ('shares')", one(lambda r: G.sign_clack(r)), -18, pe="clack_14", p=0.45)
    if D.get("bwomp_14") is not None:
        ev("bwomp", D["bwomp_14"], "the SHARES arrows drop red ('crashed'): a downward bwomp", one(lambda r: G.bwomp(r, 210.0, 68.0, 0.75)), -15,
           pe="bwomp_14", p=-0.2)
    if D.get("pigeons_14") is not None:
        ev("pigeon_wings", D["pigeons_14"], "the awning pigeons flutter up on the bwomp", one(lambda r: G2.wing_flaps(r, 6, 11.0, 0.7)), -27,
           pe="pigeons_14", p=-0.35)
        ev("pigeon_wings", D["pigeons_14"] + 9, "... their wings keep fluttering away over the street under 'crashed'",
           one(lambda r: G2.wing_flaps(r, 9, 9.0, 0.5)), -32, pe="pigeons_14", p=-0.5, lpf=6000)
    # ---------------- 15 THE INVESTOR (office)
    s0, s1 = _frames(D.get("scribble_15")) or [None, None]
    if s0 is not None:
        # A2 P3: the scribble sat ~25 dB under the voice (inaudible on a phone): +9 dB (its own 2-6 kHz band, no extra carve)
        # A3 P3: +4 dB (it measured 18 dB under the voice: faint on a phone)
        ev("scribble", s0, "the investor writes BUY ('bought')", one(lambda r, d=(s1 - s0) * FR: G.scribble(r, 3, d)), -5, pe="scribble_15",
           p=-0.15, space="room", post=bandpass_post(2000, 6000, 0.8), wcarve=-2.0)
    if D.get("chaching_15") is not None:
        # A2 P3 / LEAD: the cha-ching's source is the BUY slip: the drawer 'ka' as the pencil finishes BUY and lifts ('cheap', the smug
        # nod), the bright 'CHING' in the breath after the word 'cheap.' (+6 dB; short, so 'He bet' stays clear)
        t_bq = T.fr(D["chaching_15"])
        try:
            t_ce = float(T.word("cheap", t_bq - 0.3)["e"])
        except KeyError:
            t_ce = t_bq + 0.45
        ev_t("ka", t_bq - 0.03, "BUY is written: the register drawer's 'ka-' as the pencil lifts", one(lambda r: G.ka_thunk(r)), -17,
             pe="chaching_15", p=0.25, space="room")
        ev_t("ching", t_ce + 0.005, "... and the 'CHING!' in the breath after 'cheap.' (the deal is done)", one(lambda r: G.ching(r, 1.0)), -9,
             pe="chaching_15", p=0.3, space="room", send=0.08, post=ring_cut(0.14, 0.05), wcarve=-5.0)
    for f in _frames(D.get("taps_15")):
        ing = in_gap(f, 0.0)
        if not ing:                           # only the taps that fall in a breath (never under 'still' / 'Warren')
            continue
        ev("tap", f, "the investor's resting pencil taps the desk" + (" (in the breath)" if ing else ""), one(lambda r: G3.pencil_tap(r)),
           -24 if ing else -34, pe="taps_15", p=0.2, space="room", wcarve=-4.0)
    cl = D.get("cafe_life_15") or {}
    if cl.get("carriage") is not None:
        ev("carriage", cl["carriage"], "a typewriter's bell and carriage return in the next office", one(lambda r: G2.carriage_bell(r)), -36,
           pe="cafe_life_15", p=-0.55, space="room", lpf=4500)
    if cl.get("laugh") is not None:
        ev("laugh", cl["laugh"], "a cafe table laughs as the focus racks across the street", one(lambda r: G2.laugh(r, 3, 0.9)), -30,
           pe="cafe_life_15", p=0.45, lpf=3200)
    if cl.get("cup") is not None:
        ev("cup", cl["cup"], "a cup set down on its saucer in the cafe", one(lambda r: G2.cup_clink(r)), -28, pe="cafe_life_15", p=0.35, lpf=6000)
    card = D.get("card_15") if D.get("card_15") is not None else cl.get("card")
    if card is not None:                  # A3 P3: on the visible take (probed), audible: ~-30 dBFS RMS in the 'brand.' breath
        ev("reg_ding", card, "the waiter rings up the customer's card: the cafe register's ding across the street", one(lambda r: G2.register_bell(r, 2637.0, 0.3)),
           -16, pe="card_15" if D.get("card_15") is not None else "cafe_life_15", p=0.4, lpf=6500, post=ring_cut(0.35, 0.1))
    if D.get("espresso_15") is not None:  # A3 ADD
        ev("espresso", D["espresso_15"], "the focus racks to the cafe on 'trusted': the espresso machine's steam wand hisses across the street",
           one(lambda r: G4.espresso_hiss(r, 0.9)), -33, pe="espresso_15", p=0.45, lpf=6000, wcarve=-6.0)
    if cl.get("bike") is not None:
        ev("bike", cl["bike"], "a bicycle bell down the street ('brand.|His')", one(lambda r: G2.bike_bell(r, 2)), -30, pe="cafe_life_15", p=0.55,
           lpf=6000)
    # ---------------- 16 PAYOFF (tank top, dawn)
    p0, p1 = _frames(D.get("part_16")) or [None, None]
    if p0 is not None:
        # A2 P3: the twist's sound sat ~25 dB under the voice: +6 dB, a lighter carve, starting with the picture's opening
        ev("part", p0, "'fake': the golden layer parts over the water (a soft shlup)", one(lambda r: G.liquid_part(r, (p1 - p0) * FR + 0.15)), -15,
           pe="part_16", p=0.0, send=0.12, wcarve=-2.0)
    if D.get("gull_16") is not None:
        ev("gull", D["gull_16"], "a far gull in the breath between 'fake.' and 'The trust'", one(lambda r: G.gull(r, 2, 700.0, 1.6)), -28,
           pe="gull_16", p=0.3, lpf=6000)
    q0_, q1_ = _frames(D.get("settle_16")) or [None, None]
    if q0_ is not None:
        ev("settle", q0_, "'trust': the oil settles back to the perfect golden surface", one(lambda r: G.settle(r, (q1_ - q0_) * FR + 0.2)), -21,
           pe="settle_16", p=0.0, send=0.12)
    if D.get("glop_16") is not None:
        tgl = T.fr(D["glop_16"])
        try:                                  # it must be over before 'real.'
            t_rl = float(T.word("real", tgl - 0.4)["s"])
        except KeyError:
            t_rl = tgl + 0.4
        Lgl = max(0.12, min(0.3, t_rl - 0.03 - tgl))

        def glop(r, Lgl=Lgl):
            y = G3.oil_glop(r)[: ns(Lgl)]
            y[-ns(0.04):] *= np.linspace(1, 0, ns(0.04))
            return y
        ev_t("glop", tgl, "... the gold seals over the water with one soft oily 'glop' (done before 'real.')", one(glop), -19, pe="glop_16",
             p=0.0, send=0.1, wcarve=-3.0)

    # ---------------- life in the word gaps (on-screen sources only)
    C += life_cues()
    return sorted(C, key=lambda c: c.t)


def _gaps_in(f0, f1, min_len=0.25):
    a0, a1 = T.fr(f0), T.fr(f1)
    return [(max(a, a0), min(b, a1)) for a, b in T.SILENCES if b - a >= min_len and min(b, a1) - max(a, a0) >= min_len * 0.8]


def life_cues():
    """the street (shot 14): a car horn as the passing car nears, a pigeon - placed in the true voice silences (seeded,
    deterministic). (The harbour gulls / flags and the trading-floor phones are keyed picture events in cues() now.)"""
    C = []
    S = T.SHOTS
    k = [0]

    def add(name, t, desc, fn, level, p, lpf=None, space="out", send=0.06):
        k[0] += 1
        sd = 9000 + k[0]
        C.append(Cue(t, name, desc, lambda: (fn(rng(sd)), 0.0), level, p=p, lpf=lpf, space=space, send=send, pe="life"))
    gs = _gaps_in(S[14]["a"] + 4, S[14]["b"] - 4, 0.12)
    if gs:                               # A2 P2 / ADD: no horn (no car in frame then): a far tram bell two streets away instead
        add("tram_bell", gs[0][0] + 0.01, "a far tram bell two streets away (the 'out,|American' breath)", lambda r: G3.tram_bell(r), -33, p=0.45,
            lpf=3000)
    if len(gs) > 1:
        add("coo", gs[-1][0] + 0.01, "a pigeon coos by the newsstand", lambda r: G.pigeon_coo(r), -30, p=-0.35)
    return C


# ================================================================ beds
BED_LEVEL = {"tk_dawn": -27.0, "tk_noon": -27.0, "farm_noon": -26.0, "farm_storm": -22.5, "bank": -30.0, "trading": -19.5,
             "cutaway": -40.0, "kitchen": -25.0, "pump": -28.0, "street": -28.0, "office": -33.0}
# A2: bank +4 dB (the room barely read as a bank), kitchen +6 dB (its sparrows / kettle / fridge never reached a phone)
BED_DESC = {
    "tk_dawn": "dawn on the tank top: a light harbour wind, the water lapping at the pilings far below, a vent's steam wisp, a far flag "
               "fluttering on the gust curve, far gull cries, a harbour bell buoy far out; in the loop tail a gull calls, one wave slaps the "
               "pilings and the roof plate 'tinks', +6 dB over the last 0.8 s and the first 0.3 s (one continuous loop-folded signal: "
               "shot 16's last frame runs straight into frame 0)",
    "tk_noon": "noon on the tank top: a brighter harbour wind singing faintly in the rail, the windsock flapping on the gust curve, the "
               "lapping water, steam wisps; during the shot-4 crane down it crossfades to the GROUND (wind -6 dB, harbour +3 dB, gravel "
               "grit and a far idling forklift); -4 dB hush over the mystery; the sun-warmed roof plates 'tink' now and then, and the wind sings "
               "louder in the rail through the 'drop a tape inside' hold",
    "farm_noon": "the 1960s waterfront tank farm at noon: wind, the guard-hut flag flapping on the gust curve, a far forklift / truck "
                 "engine, steam, the harbour water, far gulls",
    "farm_storm": "the storm at the tank farm: heavy rain on steel, puddles and drums, the overflowing gutter at the sign's right end "
                  "pouring into its puddle, a low wind; 4.5 dB under the words, 4 dB up in every gap (A2), the rain swelling through 'Lenders "
                  "finally checked the tanks.'",
    "bank": "the warm bank office: room tone, a faint murmur of the banking hall, a typewriter next door, the wall clock (ticks on "
            "every whole second); a typing burst + the carriage bell in the 'check.|But' breath",
    "trading": "the 1963 trading floor: a 12-voice walla of traders shouting orders into phones, ticker-tape machines chattering, rain "
               "on the tall windows; 2 dB under the words, up in every breath",
    "cutaway": "inside the tank (the diagram): a deep hollow water tone with a few tiny rising bubbles; +6 dB in the reveal (shot 10) so "
               "the music's silence is a held breath, not a dropout, +6 dB more in the 'Inside...|was' breath (A2), swelling 2 dB into "
               "the slosh",
    "kitchen": "the sunny kitchen: warm room tone, a fridge's soft hum, a kettle simmering (it swells in the 'top.|Fill' breath), "
               "sparrows outside the window, the counter radio's faint warm hiss",
    "pump": "the Saturday-night pump room: the motor hum and its whine (dipping as each valve wheel is heaved), the pump's chug "
            "(one per turn of WORLD-INT's flywheel, in phase with it), oil moving in the pipes",
    "street": "the grey 1963 city street: traffic passing, footsteps, a city hum",
    "office": "the small warm office: room tone, the street below, the cafe across the street through the window "
              "(+7 dB while the focus racks to the cafe on 'trusted')",
}
CHUG_HZ = 1.6                    # the pump's chug rate (fallback; probed from WORLD-INT's flywheel: one chug per turn, phase 0 at t = 0)


def _gust(n, t0, scale=1.0, bias=0.0):
    t = t0 + np.arange(n) / SR
    return np.clip(T.gust(t) * scale + bias, 0.05, 1.5)


def _mix(parts):
    """[(stereo/mono x, rel dB)] -> sum, each part at its integrated loudness rel dB"""
    out = None
    for x, db in parts:
        x = st(x) if np.ndim(x) == 1 else x
        L = integrated(x)
        y = x * dbg(db - L) if np.isfinite(L) else x
        out = y if out is None else out + y
    return out


def _lvl(x, db):
    x = st(x) if np.ndim(x) == 1 else x
    L = integrated(x)
    return x * dbg(db - L) if np.isfinite(L) else x


def _gull_layer(n, r, rate=0.12, far=2.0):
    y = np.zeros(n)
    tm = r.uniform(0.5, 3.0)
    while tm < n / SR - 1.0:
        x = G.gull(r, int(r.integers(1, 4)), None, far) * r.uniform(0.4, 1.0)
        G._place_mono(y, x, tm)
        tm += r.exponential(1.0 / rate) + 1.5
    return widen(y, r, 12, 0.9)


def _smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def bed_signal(key, t0, t1, r):
    n = ns(t1 - t0)
    tabs = t0 + np.arange(n) / SR
    D, _ = picture_events()
    if key in ("tk_dawn", "tk_noon"):
        noon = key == "tk_noon"
        g = _gust(n, t0, 1.0 if noon else 0.85)
        wind = G.desert_wind(n, r, g, 1.0, 0.18 if noon else 0.1, 0.05, 0.08, 0.2, (700, 1050), 0.9)
        flag = pan(G2.flag_flutter(n, r, g * (1.05 if noon else 0.9)), 0.45 if noon else -0.35)
        lap = G.water_lap(n, r)
        steam = st(G.steam_hiss(n, r))
        gulls = _gull_layer(n, r, 0.08)
        if noon:                                   # shot 4's crane down: the wind drops, the harbour comes up, the ground arrives
            y4 = _frames(D.get("yard_4"))
            u = _smoothstep((tabs - T.fr(y4[0])) / max(0.1, T.fr(y4[1]) - T.fr(y4[0]))) if len(y4) == 2 else np.zeros(n)
            u = u * (tabs < T.fr(T.SHOTS[4]["b"] + 8))
            # A3 P2: the roof's own sounds stop ON the hard cut (story.ts R4_CUT_V = andInspector - 3), 10 ms
            t_c = T.bt("andInspector", -3) if "andInspector" in T.BEAT else (T.fr(y4[0]) if len(y4) == 2 else T.DUR)
            roof_g = 1 - np.clip((tabs - (t_c - 0.012)) / 0.01, 0, 1) * (tabs < T.fr(T.SHOTS[4]["b"] + 8))
            yard = G2.gravel_yard(n, r)
            # A2 ADD: the sun-warmed roof plates expand - a sparse dry steel 'tink' every 1.4-3.2 s while we are up on the roof
            tinks = np.zeros(n)
            tm = 0.6
            while tm < n / SR - 0.4:
                ta = t0 + tm
                if (1 - u[min(n - 1, ns(tm))]) > 0.5:
                    G._place_mono(tinks, G3.roof_tink(r) * r.uniform(0.6, 1.0), tm)
                tm += r.uniform(1.4, 3.2)
            # ... and the wind sings louder in the rail through the 'drop a tape inside' hold (up .. ninety)
            wa, wb = T.bt("up"), T.bt("ninety") if "ninety" in T.BEAT else T.bt("up") + 2.5
            sing = np.clip(np.minimum((tabs - wa) / 0.6, (wb - tabs) / 0.4), 0, 1)
            gg_ = np.clip(g, 0.0, 1.3)
            whis = st(G.reson(colored(n, r, 0.5), 960.0, 45) * (0.4 + 0.6 * gg_) + 0.6 * G.reson(colored(n, r, 0.5), 1310.0, 55) * (0.3 + 0.7 * gg_ ** 2))
            # A3 P2: on the ground the high wind is 9 dB down (was 6) and the windsock 6 dB (was 4), so the cut reads by ear too
            return (_lvl(wind, 0.0) * dbg(-9.0 * u)[None, :] + _lvl(lap, -6.0) * dbg(3.0 * u)[None, :] + _lvl(steam, -14.0)
                    + _lvl(gulls, -12.0) + _lvl(flag, -11.0) * dbg(-6.0 * u)[None, :] + _lvl(yard, -9.0) * u[None, :]
                    + _lvl(pan(lp(tinks, 7000, 1), 0.3), -11.0) * roof_g[None, :] + _lvl(whis, -9.0) * (sing * roof_g)[None, :])
        out = _mix([(wind, 0.0), (lap, -6.0), (steam, -14.0), (gulls, -12.0), (flag, -13.0)])
        # the loop tail (shot 16 -> frame 0): one far gull call and one wave slap at the pilings, inside the folded bed
        tail_g, tail_l = T.DUR - 0.55, T.DUR - 0.32
        if t0 <= tail_g < t1:
            ref = integrated(out)
            gx = pan(lp(G.gull(r, 2, 690.0, 1.6), 5500, 2), -0.3)         # A2 P3: -21 LU vs the voice after the +6 dB tail lift
            gx = gx * dbg(ref + 0.0 - momentary_max(gx))
            place(out, gx, tail_g - t0)
            wx = pan(G2.water_slap(r, 1.0), 0.15)                          # -23 LU
            wx = wx * dbg(ref - 2.0 - momentary_max(wx))
            place(out, wx, tail_l - t0)
            tx = pan(G3.roof_tink(r, 2350.0), 0.35)                        # A2 ADD: the roof plate 'tinks' as the sun warms it, its
            tx = tx * dbg(ref - 6.0 - momentary_max(tx))                   # ring folding over the seam into frame 0
            place(out, tx, T.DUR - 0.14 - t0)
            # A2 ADD: a harbour bell buoy far out on the swell, very faint (shots 1 and 16 only: the bed is silent between)
            for tb_ in (2.55, T.bt("theOil") + 0.25 if "theOil" in T.BEAT else T.DUR - 3.8):
                if t0 <= tb_ < t1 - 3.0:
                    bx = pan(G3.bell_buoy(r, 2), -0.5)
                    bx = bx * dbg(ref - 9.0 - momentary_max(bx))
                    place(out, bx, tb_ - t0)
        return out
    if key == "farm_noon":
        g = _gust(n, t0, 1.05)
        wind = G.desert_wind(n, r, g, 1.0, 0.12, 0.08, 0.1, 0.22, (650, 980), 0.95)
        eng = G.far_vehicle(r, n / SR, far=2.2)
        flag = pan(G2.flag_flutter(n, r, g), -0.45)
        return _mix([(wind, 0.0), (st(eng[:n]), -10.0), (st(G.steam_hiss(n, r)), -15.0), (G.water_lap(n, r), -10.0),
                     (_gull_layer(n, r, 0.1), -13.0), (flag, -9.0)])
    if key == "farm_storm":
        g = _gust(n, t0, 1.1, 0.1)
        gut = pan(G2.gutter_spill(n, r), 0.45)
        return _mix([(G.rain(n, r, 1.0, 1.0), 0.0), (G.desert_wind(n, r, g, 1.0, 0.0, 0.05, 0.05, 0.3), -7.0), (gut, -8.0),
                     (lp(G.rain(n, r, 1.0, 0.6), 700, 2), -9.0)])
    if key == "bank":
        mur = G.crowd_murmur(n, r, voices=5, lo=170.0, hi=1000.0, density=0.8)
        ty = G.typewriter(n / SR, r, 6.0)
        clk = np.zeros(n)
        for k in range(int(np.ceil(t0)), int(t1) + 1):
            tm = k - t0
            if 0 <= tm < n / SR:
                G._place_mono(clk, G.clock_tick(r, k % 2 == 1), tm)
        out = _mix([(G.room_tone(n, r, 0.0, 1.0), 0.0), (mur, -4.0), (lp(ty, 4000, 1), -9.0), (clk, -12.0)])
        try:                                         # A2 P2: one burst of typing next door + its carriage bell in the 'check.|But' breath
            gpc = gap_at(float(T.word("check", T.bt("check") - 0.3)["e"]) + 0.02, 0.2, 0.3)
        except KeyError:
            gpc = None
        if gpc and t0 <= gpc[0] < t1 - 0.8:
            ref = integrated(out)
            bu = np.zeros(ns(0.3))
            for k_ in range(4):
                c_ = G.modal(0.06, [(r.uniform(1800, 2600), 1.0, 0.006), (r.uniform(3800, 4600), 0.5, 0.003), (r.uniform(380, 460), 0.7, 0.012)], r)
                G._place_mono(bu, c_ * r.uniform(0.7, 1.0), 0.055 * k_)
            bx = lp(bu, 4500, 1)
            bx = st(bx) * dbg(ref - 2.0 - momentary_max(bx))
            place(out, pan(bx.mean(0), -0.4), gpc[0] + 0.01 - t0)
            cb = G2.carriage_bell(r)
            cb = cb * dbg(ref + 0.0 - momentary_max(cb))
            place(out, pan(lp(cb, 5000, 1), -0.45), gpc[0] + 0.24 - t0)
        return out
    if key == "trading":
        crowd = G2.trader_walla(n, r, 12)
        tick = G.ticker(n, r, 12.0)
        rain_ = G.rain(n, r, 1.0, 0.5)
        ring = np.zeros(n)
        tm = r.uniform(0.6, 1.2)
        while tm < n / SR - 1.0:
            G._place_mono(ring, G.phone_ring(r, r.uniform(0.6, 1.0), r.uniform(1.6, 2.4)), tm)
            tm += r.uniform(1.4, 2.6)
        return _mix([(crowd, 0.0), (widen(tick, r, 9, 0.8), -6.0), (lp(rain_, 2500, 2), -12.0), (G.room_tone(n, r, 0.0, 1.0), -8.0),
                     (widen(ring, r, 13, 0.9), -14.0)])
    if key == "cutaway":
        return G.underwater(n, r)
    if key == "kitchen":
        t = np.arange(n) / SR
        fridge = 0.3 * np.sin(2 * np.pi * 60 * t) + 0.2 * np.sin(2 * np.pi * 120 * t)
        birds = np.zeros(n)
        tm = r.uniform(0.3, 1.0)
        while tm < n / SR - 0.4:
            for j in range(int(r.integers(2, 5))):
                G._place_mono(birds, G.bird_chip(r), tm + j * r.uniform(0.07, 0.12))
            tm += r.uniform(0.8, 2.2)
        kg = np.zeros(n)
        try:                                         # A2 P3: the kettle's simmer blooms in the breath after 'top.'
            gpk = gap_at(float(T.word("top", T.bt("top") - 0.3)["e"]) + 0.02, 0.15, 0.3)
            if gpk:
                kg = np.interp(tabs, [gpk[0] - 0.05, gpk[0] + 0.1, gpk[1] - 0.05, gpk[1] + 0.25], [0, 7.0, 7.0, 0], left=0, right=0)
        except KeyError:
            pass
        kettle = pan(G2.kettle_simmer(n, r), -0.4) * dbg(kg)[None, :]
        return _mix([(G.room_tone(n, r, 0.0, 1.0), 0.0), (fridge, -10.0), (lp(birds, 7000, 1), -12.0), (kettle, -16.0),
                     (pan(G3.radio_hiss(n, r), 0.3), -15.0)])
    if key == "pump":
        # sfx_gen.pump_hum's parts, but the piston chug runs in phase with the FILM clock (phase 0 at t = 0), so a flywheel
        # can turn with it, and a motor whine that sags each time a valve wheel is heaved
        hum = sum(np.sin(2 * np.pi * 60.0 * k * tabs + r.uniform(0, 2 * np.pi)) / k ** 1.2 for k in (1, 2, 3, 4, 6))
        hum = lp(hum, 700, 2) * (0.9 + 0.1 * smooth_noise(n, r, 0.5))
        hz = picture_probes()[0].get("flywheel_hz", CHUG_HZ)
        ph = (hz * tabs) % 1.0
        chug = np.exp(-ph / 0.08) * lp(colored(n, r, 1.5), 220, 2) * 1.2
        flow = bp(colored(n, r, 0.9), 200, 1400, 1) * (0.6 + 0.4 * smooth_noise(n, r, 1.2)) * 0.35
        gurg = G.bubbles(n / SR, r, 6, 200, 800, (0.01, 0.04))[:n] * 0.4
        dip = np.ones(n)
        vd = D.get("valves_13")
        for f in ([float(x) for w in ("w0", "w1") for x in vd.get(w, [])] if isinstance(vd, dict) else _frames(vd)):
            tv = T.fr(f + 2)
            dip *= 1 - 0.55 * np.exp(-0.5 * ((tabs - tv - 0.12) / 0.09) ** 2)
        fw = 360.0 * (1 - 0.03 * (1 - dip)) * (1 + 0.004 * smooth_noise(n, r, 0.3))
        whine = np.sin(2 * np.pi * np.cumsum(fw) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(2 * fw) / SR)
        m = hum * 0.5 + chug + flow + gurg
        return _mix([(st(m), 0.0), (G.room_tone(n, r, air=0.6), -10.0), (st(whine * dip), -15.0)])
    if key == "street":
        return _mix([(G.city(n, r), 0.0), (G.crowd_murmur(n, r, voices=4, lo=170.0, hi=1100.0, density=0.6), -9.0)])
    if key == "office":
        return _mix([(G.room_tone(n, r, 0.0, 1.0), 0.0), (lp(G.city(n, r), 1200, 2), -6.0), (G.cafe(n, r), -5.0)])
    return np.zeros((2, n))


def bed_mod_db(key, t):
    """per-sample level automation of a bed (dB) on top of its level"""
    g = np.zeros(len(t))
    if key == "tk_noon":                 # the mystery hush (shot 7) - the wind drops away as the light turns late
        a, b = T.fr(T.SHOTS[7]["a"] - 4), T.fr(T.SHOTS[7]["b"] + 4)
        g += np.interp(t, [a - 0.2, a, b, b + 0.2], [0, -4.0, -4.0, 0], left=0, right=0)
    if key == "tk_dawn":                 # A1 P2: the loop tail is not dead air - +6 dB from just after 'real.' through the seam,
        z0 = T.LAST_WORD_END - 0.1       # easing back under 'By' (the same gain on both sides of the seam)
        g += np.interp(t, [z0, z0 + 0.15, T.DUR], [0.0, 6.0, 6.0], left=0.0, right=6.0) * (t >= z0 - 1e-9)
        g += np.interp(t, [0.0, 0.30, 0.45], [6.0, 6.0, 0.0], left=6.0, right=0.0) * (t < 0.45)
    if key == "farm_storm":              # the rain swells up through 'Lenders finally checked the tanks.' and is cut by 'Inside...';
        g += np.interp(t, [T.bt("lenders"), T.bt("tanksEnd")], [0.0, 2.0], left=0.0, right=2.0)
        we_ = word_env(t, pre=0.12, post=0.1, tau=0.16)     # A2 P2 / P3: -3 dB under the words, +4 dB in every word gap
        # A3 P3 (the downpour near-inaudible on a phone): +5 dB under the words (its 1-4 kHz band carved 4 dB more there, in
        # render_beds, so the consonants keep their room) and +3 dB more in the gaps (+7)
        g += 7.0 * (1 - we_) + 0.5 * we_
    if key == "trading":                 # A1 P2: the floor shouts in every breath, 2 dB under the words
        g += -2.0 * word_env(t) + 2.0 * (1 - word_env(t))
    if key == "cutaway":                 # A1 P3: the reveal (shot 10) holds its breath audibly, swelling into the slosh
        a, b = T.fr(T.SHOTS[10]["a"] - 6), T.fr(T.SHOTS[10]["b"] + 6)
        g += np.interp(t, [a - 0.2, a, b, b + 0.2], [0, 6.0, 6.0, 0], left=0, right=0)
        ts = T.bt("waterEnd")
        g += np.interp(t, [ts - 0.6, ts, ts + 0.5, ts + 1.0], [0, 2.0, 2.0, 0], left=0, right=0)
        try:                              # A2 P3: the breath after 'Inside...' read as a dropout on a phone: +6 dB more in it
            wi_ = T.word("Inside", T.bt("inside") - 0.3)
            gp_ = gap_at(float(wi_["e"]) + 0.02, 0.2, 0.3)
            if gp_:                       # A3 P3: the lift is full over the WHOLE breath (it reached +6 only mid-gap)
                g += np.interp(t, [gp_[0] - 0.14, gp_[0] + 0.01, gp_[1] - 0.02, gp_[1] + 0.1], [0, 8.0, 8.0, 0], left=0, right=0)
        except KeyError:
            pass
        try:                              # A3 P3: ... and the tail after the slosh / blub, before 'You see,' (the same +6 dB)
            ww_ = T.word("water", T.bt("water") - 0.3)
            gq_ = gap_at(float(ww_["e"]) + 0.02, 0.3, 0.3)
            if gq_:
                g += np.interp(t, [gq_[0] + 0.15, gq_[0] + 0.32, gq_[1] - 0.04, gq_[1] + 0.08], [0, 6.0, 6.0, 0], left=0, right=0)
        except KeyError:
            pass
        # A3 P3 (shot 12, the diagram's hollow water was ~44 dB under the voice): +11 dB in the breaths, +5 under the words
        a12, b12 = T.fr(T.SHOTS[12]["a"] - 6), T.fr(T.SHOTS[12]["b"] + 6)
        win12 = np.interp(t, [a12 - 0.2, a12, b12, b12 + 0.2], [0, 1, 1, 0], left=0, right=0)
        if np.any(win12 > 0):
            we12 = word_env(t, pre=0.03, post=0.05, tau=0.05)
            g += win12 * (5.0 + 7.0 * (1 - we12))
    if key == "office":
        D, _ = picture_events()
        fr_ = _frames(D.get("cafe_rack_15"))
        if len(fr_) == 2:
            a, b = T.fr(fr_[0]), T.fr(fr_[1])
            g += np.interp(t, [a, a + 0.6, b, b + 0.5], [0, 7.0, 7.0, 0], left=0, right=0)
    return g


def render_beds(v_ref, seed=1963):
    """stereo bed stem (2, N) + per-bed report rows"""
    t = np.arange(N) / SR
    W = T.bed_weights(t)
    out = np.zeros((2, N))
    rows = []
    for k, w in sorted(W.items()):
        act = np.flatnonzero(w > 1e-4)
        if not len(act):
            continue
        r = rng(seed + sum(map(ord, k)))
        if k == "tk_dawn":                       # ONE loop-folded signal across the whole short (frame 0 == the last frame)
            L = ns(1.0)
            raw = bed_signal(k, 0.0, T.DUR + L / SR, r)[:, : N + L]
            raw = hp(raw, 28, 2)
            x = G.loop_xfade(raw, N, L)
            a, z = 0, N
        else:
            a, z = max(0, act[0] - ns(0.05)), min(N, act[-1] + ns(0.05))
            x = hp(bed_signal(k, a / SR, z / SR, r)[:, : z - a], 28, 2)
            if x.shape[1] < z - a:
                x = np.pad(x, ((0, 0), (0, z - a - x.shape[1])))
        full = w[a:z] > 0.999
        ref = integrated(x[:, full]) if full.sum() > ns(0.5) else integrated(x)
        g = dbg(v_ref + BED_LEVEL[k] - ref)
        md = bed_mod_db(k, t[a:z])
        x = x * g * w[None, a:z] * dbg(md)[None, :]
        if k == "farm_storm":                    # A3 P3: the louder rain keeps the consonant band clear: 1-4 kHz -4 dB more under the words
            we_s = word_env(t[a:z], pre=0.1, post=0.08, tau=0.08)
            band = _sig.sosfiltfilt(_sig.butter(2, [1000.0, 4000.0], btype="bandpass", fs=SR, output="sos"), x, axis=-1)   # zero-phase
            x = x - band * (1 - dbg(-4.0 * we_s))[None, :]
        out[:, a:z] += x
        spans = []
        on = np.flatnonzero(np.diff(np.concatenate([[0], (w > 0.5).astype(int), [0]])))
        for i0, i1 in zip(on[::2], on[1::2]):
            spans.append((i0 / SR, i1 / SR))
        rows.append((k, BED_LEVEL[k], spans, BED_DESC[k]))
    return out, rows


# ================================================================ render
SPACES = {"out": dict(rt60=0.6, seed=77, pre=0.012, hf=1.8, early=[(0.06, 0.3, -0.5), (0.11, 0.2, 0.6)]),
          "room": dict(rt60=0.45, seed=78, pre=0.006, hf=1.4, early=[(0.011, 0.4, -0.3), (0.019, 0.3, 0.4)]),
          "hall": dict(rt60=1.1, seed=79, pre=0.015, hf=1.3, early=[(0.023, 0.35, 0.3), (0.041, 0.25, -0.4)]),
          "tank": dict(rt60=1.6, seed=80, pre=0.01, hf=0.9, early=[(0.018, 0.5, -0.2), (0.037, 0.4, 0.3), (0.055, 0.3, 0.0)]),
          "pump": dict(rt60=0.8, seed=81, pre=0.008, hf=1.2, early=[(0.014, 0.4, 0.3), (0.027, 0.3, -0.3)])}


def write_used():
    D, SRC = picture_events()
    out = {"_doc": "frames (30 fps) every SFX used in the last mix.py run; copy a key into picture_events.json to override it "
                   "(a frame, a list of frames, the same dict shape, a 'beat+n' expression, or null to drop the cue)",
           "_probes": picture_probes()[1]}
    for k, v in D.items():
        out[k] = {"value": v, "source": SRC[k]}
    with open(PE_USED, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)


def _render_set(C, v_ref, on_event=None):
    out = np.zeros((2, N))
    sends = {k: np.zeros(N) for k in SPACES}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        cur = momentary_max(x)
        if np.isfinite(cur):
            x = x * dbg(v_ref + c.level - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        if c.post:
            x = c.post(x)
        t0 = c.t - anchor
        wc = c.wcarve if c.wcarve is not None else _WCARVE.get(c.name)
        if isinstance(wc, dict):
            x = carve_words(x, t0, wc.get("db", -6.0), wc.get("lo", 1000.0), wc.get("hi", 4000.0), broad_db=wc.get("broad", 0.0))
        elif wc:
            x = carve_words(x, t0, wc)
        c.measured = momentary_max(x) - v_ref
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), max(0.0, t0))
    for k, s in sends.items():
        if np.any(s):
            sp = SPACES[k]
            ir = make_ir(sp["rt60"], sp["seed"], pre=sp["pre"], hf=sp["hf"], early=sp["early"])
            out += 0.6 * convolve_st(s, ir)
    return hp(out, 30, 2)


def render_events(v_ref, on_event=None):
    C = cues()
    # THE REVEAL: every event that started BEFORE 'Inside...' (the storm's thunder, the far ladder, the lenders) is cut on
    # 'Inside...' (40 ms fade, like the score) together with its reverb and stays cut through the reveal; the reveal's own
    # sounds (the bubble blips in the held breath, the single slosh after 'water.', the fish's blub) play on their own
    h0 = T.bt("inside") - 0.04 if "inside" in T.BEAT else None
    pre = [c for c in C if h0 is None or c.t < h0]
    post = [c for c in C if h0 is not None and c.t >= h0]
    out = _render_set(pre, v_ref, on_event)
    if h0 is not None:
        h1 = T.bt("youSee") - 0.02
        i0, i1 = ns(h0), ns(h1)
        if i1 > i0:
            f = ns(0.04)
            out[:, i0:i0 + f] *= np.linspace(1, 0, f)[None, :]
            out[:, i0 + f:i1] = 0.0
        out += _render_set(post, v_ref, on_event)
    # only the dawn bed may cross the loop point: the events stem is silent by the last 2 frames
    a, z = ns(T.DUR - 0.25), ns(T.DUR - 2 * FR)
    out[:, a:z] *= np.linspace(1, 0, z - a)[None, :] ** 2
    out[:, z:] = 0.0
    return out, C


def render(v_ref):
    ev, C = render_events(v_ref)
    beds, rows = render_beds(v_ref)
    return ev, beds, C, rows
