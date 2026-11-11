# Every sound effect and ambience bed of the anti-theft short as a cue list timed to the picture (timeline.py reads
# shots, dissolves and story beats from timeline.json at run time), rendered into two stereo stems: EVENTS and BEDS.
# Levels are absolute and relative to the voice: an EVENT's level = its max momentary loudness (LU vs the voice stem's
# integrated loudness); a BED's level = its integrated loudness over the shots it plays under. Beds follow the picture
# dissolves (equal-power, each dissolve widened by 4 f a side). The noon-trailhead wind is one continuous signal folded
# into a seamless loop, so the last frame's wind runs straight into frame 0's.
#
# Round 2: every event is keyed to a named PICTURE EVENT (picture_events(), below). Each default frame is derived from
# timeline.json BEAT / shot frames with the same formula the picture uses (cast.ts / sets_ext.ts / sets_int.ts / story.ts,
# quoted next to it) or, where the A1 audit asked an owner to (re)animate an action, the frame the audit gave them.
# If a picture action lands somewhere else after the merge, put the frame in audio/picture_events.json
# ({"name": frame | [frames] | {...} | null}; null drops that cue) and re-run `python mix.py`. Every run writes
# picture_events_used.json with the frames actually used.
#
# Round 4 (A3): _apply_cast() moves the cues onto the frames the CAST really animates (picture_cast.json, written by
# studio/scripts/audio_cast_probe.mjs from cast.ts stage() in node) and drops cues whose action is gone; overrides may be
# BEAT expressions ('mailed-7'); new: the tag flutter + a far car start in shot 15, soft sounds for the other on-screen
# raven hops / ruffles, the real blueprint walk contacts, 70 Hz body on the stamp / parcel / flip lock.
#
# Round 5 (A4): beds / life layers on the narration clock (T.shot_weights goes through the warp); a blueprint bed; the
# storeroom rebuilt (lamp hum, lantern, window crickets + wind, wall clock on its second hand); park life in word gaps (car
# doors, halyard, flag snaps), cicadas, the vista raven call, a dry-grass hiss; bed automation (whisper dip, relight swell,
# the shot-10 gust); new cues on visible actions (the shot-7 fly-in air + tally scratches, the shot-8 whip, the shot-12 arc
# air + pencils + a chair, the shot-13 flash whine + the raven flying off, the pile settling, the letter pick, the tag flick,
# the crowd's 'ooh' + strap jingles, chalk-dust puffs, a far cricket / nighthawk); cues without a visible source dropped
# (shot-8 stopwatch, shot-5 shutter); key-word level cuts (glint, snap, flaps under 'day...', thief pops, bait scoop, parcel,
# panel clack, counters, cha-ching).
#
# Round 6 (A5): every picture-frame DIFFERENCE inside a compound cue goes through the warp (dfr(), pic_of()); the cast probe
# runs stage() with the video frame (idle life), reports per-run in-frame frames, actor visibility and the shot-14 bucket;
# the bubble is a soft REVEAL on its first in-frame frame (it was a pop 9 f early) and shrinks on its real run; the split-flap
# clacks sit mid-flip (the visible card change) with one heavy lock on '14' and nothing after it; the glint ding on the
# star's first frame; the glint / dive carve their 0.6-4 kHz band under 'steal.'; CHAR r5 frames: pen contacts 748/751/754,
# chip thud 776 + 778, asst3's dust-off + turn, reader B's pocket, the crowd's pats, both shot-13 flashes, the shot-14 scoop
# inside the wide (FS[1]) and only the VISIBLE parts of the others, the letter rustle on his entry, the tag ding on the '2'
# card (+3 dB) with the flap tick before it; new life: wren chirp, clipboard flutter, whip gust + sand, sand scrape, raven
# bolt + feather at the cha-ching, the chalk crowd shuffle, the full-stop snap, the red cap's 'heh-heh', the bulb chain +
# hum swell, a far owl; the noon wind +3 dB across the loop seam.
import os
import re
import json
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
FR = 1.0 / T.FPS
PE_PATH = os.path.join(T.HERE, "picture_events.json")
PE_USED = os.path.join(T.HERE, "picture_events_used.json")
# round 3: studio/scripts/audio_probe.mjs projects the moving sound sources (the tumbleweed routes in sets_ext.ts) through
# the film camera and writes when each is ON SCREEN, its hop landings, screen x (pan) and size (level)
PROBE_PATH = os.path.join(T.HERE, "picture_probe.json")
# round 4 (A3): studio/scripts/audio_cast_probe.mjs runs the CAST's own stage(id, f) in node (no render) and writes the
# picture FACTS (fx-card runs, whistle-note births, what every hand holds, body-mode changes, walk foot contacts, raven
# moves, the Sign A swap path, the tag swing) to picture_cast.json; mix.py re-runs it every time, so a CHAR re-time or a
# voice re-time is followed without anybody copying frames by hand (_apply_cast below)
CAST_PATH = os.path.join(T.HERE, "picture_cast.json")


def _cast():
    try:
        with open(CAST_PATH, encoding="utf-8") as f:
            return json.load(f).get("facts", {})
    except (OSError, ValueError):
        return {}


# picture_events.json values may be BEAT expressions (round 4): "sign1-5", "swapping+10", "S8.a+4" (shot 8 start + 4),
# "S15.b-2", or lists of them, so a manual override follows a voice re-time too
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


def _probe():
    try:
        with open(PROBE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


class Cue:
    def __init__(self, t, name, desc, gen, level, kind="event", p=0.0, lpf=None, space="out", send=0.08, group=None, post=None, pe=None, wcarve=None):
        self.t, self.name, self.desc, self.gen, self.level = t, name, desc, gen, level
        self.wcarve = wcarve      # A5: extra dB on this cue's 1-4 kHz band while a word is spoken (small actions landing on words)
        self.kind, self.p, self.lpf, self.space, self.send = kind, p, lpf, space, send
        self.group = group or name
        self.post = post          # post(x) after the level match (e.g. the stamp's mid-band carve)
        self.pe = pe              # the picture event this cue is keyed to
        self.measured = None

    @property
    def frame(self):
        return self.t * T.FPS


# ================================================================ picture events (the frames every SFX is keyed to)
def _word_end(text, after_beat):
    try:
        return float(T.word(text, T.bt(after_beat))["e"])
    except KeyError:
        return None


def _flap_landings(seqs, f14):
    """sets_ext.ts FLAP_SEQ(target, f0): for c = 0..target a card flips c -> c+1 starting at f, lasting 3 f (c even) or
    2 f (c odd). A5 P1/P2: the clack goes where the viewer SEES the card change - 40 % into the flip, as the falling
    flap uncovers the new digit's top half and passes vertical (audit strip S34_s4_flaps_458-487: the new digit shows at
    video 461, 467, 471, 477 and the '14' at 481-482 = picture 347.0, 349.9, 352.4, 354.8, 357.7; the landing frames
    f0 + d were 2-3 picture f = 4-6 VIDEO f late). Returns [(frame, is the last card of its digit)]; when both digits
    flip together the tens card trails by 0.3 f."""
    out = []
    for j, (target, off) in enumerate(seqs):
        f = f14 + off
        lag = 0.3 if j == 0 and len(seqs) > 1 else 0.0          # seqs = [tens, ones] (sets_ext poseFlip)
        for c in range(int(target) + 1):
            d = 2 if c % 2 else 3
            out.append((f + 0.4 * d + lag, c == target))
            f += d
    return sorted(out)


def _led_ticks(target, land, window=26):
    """sets_ext.ts poseLed: value = target * (1 - (1 - u)^2.2), u = (f - (land - 26)) / 26, shown to 0.01. Returns the
    frames where the displayed digits change (one relay tick each) - the last change is the landing value."""
    prev, out = None, []
    for f in range(land - window - 1, land + 1):
        u = min(1.0, max(0.0, (f - (land - window)) / window))
        s = round(target * (1 - (1 - u) ** 2.2), 2)
        if prev is not None and s != prev:
            out.append(f)
        prev = s
    if not out or out[-1] != land:
        out.append(land)          # the lock lands ON the beat frame (the value reaches its target there)
    return out


def _chalk_glyphs():
    """sets_int.ts chalkWords()/glyphs(): each word's letters are written evenly over [a, b] frames"""
    B = T.BEAT
    h, c = B["half"], B["cheated"]
    words = [("HALF", B["teacher"] + 4, h + 2), ("THIS", h + 3, h + 12), ("CLASS", h + 13, c - 2), ("CHEATED.", c - 1, c + 10)]
    out = []
    for w, a, b in words:
        n = len(w)
        for k, ch in enumerate(w):
            out.append((a + (b - a) * k / n, a + (b - a) * (k + 1) / n, ch))
    return out


def picture_events():
    B, S = T.BEAT, T.SHOTS
    A = lambda i: S[i]["a"]
    Z = lambda i: S[i]["b"]
    mid = lambda i: round((S[i]["a"] + S[i]["b"]) / 2)
    D, SRC = {}, {}

    def d(name, val, src):
        D[name] = val
        SRC[name] = src

    # ---- 1 hook
    # A3 P2: the bubble now holds ~38 f (CHAR A3 P1: pop(BEAT.paperclip - 1, 84)); the cast probe reads the real run
    d("bubble_in", B["paperclip"], "cast.ts hookFx pop(BEAT.paperclip, 64): first frame (scale 0.55)")
    d("bubble_out", 63, "cast.ts hookFx pop(.., 64): shrinks 63-64, gone at 65 (the 64 is a literal in cast.ts)")
    # A2 P3: the dive (story.ts DIVE0 = steal1+2, ease-in u^2, fastest over the 138-144 dissolve) first moves 126->127:
    # the whoosh starts 1 f before it and swells with the camera speed (peak at the dissolve, not on the snap)
    d("snap_push", B["steal1"] + 1, "story.ts dive1: DIVE0 = steal1+2 (first moving frame 126->127); whoosh from DIVE0-1, peak ~132")
    d("glint", B["steal1"], "CHAR A2-P1: the bold 4-point star peaks at 122-125 (glint card from steal1-3) -> ding ON 'steal' (124)")
    # cast.ts thRaven(): the scripted ruffle tau 28-38 (A2: CHAR makes it a visible puff + wing spread at 28)
    d("raven_ruffle_1", [28], "CHAR r3 thRaven: the ruffle on the AUDIO cue (28): puff 1.15x + wings ~35 % for 7 f")
    d("raven_hop_1", [93], "CHAR r3 thRaven: a small hop on the rail at tau 93..101 (in frame with CAM r3's shot-1 lens: x 854 y 135)")
    # ---- 2 vista
    # cast.ts vista(): the photographer's flash at mid-6 is OUT of the crane's frame (A2 P3: x -3442 px at 159): no cue until
    # CHAR stages a photographer in frame (A2 CHAR P1); then set {"vista_flash": <flash frame>} in picture_events.json
    d("vista_flash", None, "cast.ts vista() flash at mid-6 = 159 is off screen (audio_probe / project.mjs) -> no cue")
    # ---- 3 pocketing (A1 P1 for CHAR: a 24 f action around BEAT.pocketing = B)
    P = B["pocketing"]
    d("chip_glint_3", P - 15, "CHAR A1-P1: a 4-point glint on the chip at B-16..B-9")
    d("pocket_3", P, "cast.ts pocketing: hand reaches the hip pocket from B (chip in by B+4)")
    d("pocket_pats_3", [P + 10.5, P + 15], "CHAR r3 pocketing: the hand on the chest pocket B+6..B+15, dy = 3.5 |sin((f-B-6)/4.5 pi)| -> back "
      "on the pocket at B+10.5 and B+15")
    d("peek_glint_3", P + 16, "CHAR A1-P1: tiny rainbow glint peeking out of the pocket at B+16")
    pe = _word_end("pieces", "pocketing")
    d("whistle_3", round(T.sec_to_old(pe + 0.045), 2) if pe else None, "innocent 2-note whistle in the gap after 'pieces.' (cast.ts notes drawn at B+30 / B+36)")
    d("whistle_note2_3", P + 34.5, "cast.ts pocketing notes(): the 5th note is drawn at B+36; the 2nd whistled note starts 1.5 f before it, so it "
      "is out before 'So' (241)")
    d("whistle_soft_3", [P + 9, P + 16], "cast.ts notes() at B+9 / B+16 while the 'whistle' o-mouth is on (B-1..B+41; CHAR A2: closed-eye whistle from "
      "B+8): two whistled notes under the breath, under the VO")
    # A2 P3 / LEAD P2: the photographer at [-6.7, 0, -30] (flash 234) is off screen (x -1183 px) -> no shutter until he is re-placed
    d("shutter_3", 234, "CHAR r3 pocketing: the photographer moved to [-0.6,0,-31.5] (in frame with CAM r3: x 741 y 730), camera up from "
      "224, flash(234, 3 f)")
    # A2: nobody strolls behind him in shot 3 (preview2 186-244) -> no footsteps
    d("steps_3", None, "no walker in shot 3's frame (preview2) -> none")
    # ---- 4 the sign
    d("flip_seqs", [[1, -8], [4, -13]], "sets_ext poseFlip FLAP_SEQ(1, tons14-8) tens + FLAP_SEQ(4, tons14-13) ones: [target, start - tons14]")
    # A4 P3: every flap that lands before the end of the word 'day...' (+1 f) is 6 dB softer (the K-weighted margin on
    # 'day...' was 0.5 dB); the flaps on '14' stay full
    wde = _word_end("day", "vandalized")
    d("flip_hush_until", round(T.sec_to_old(wde) + 1, 2) if wde else B["tons14"] - 7,
      "A4 P3: the flaps that land before the end of 'day...' (+1 f) are 6 dB softer")
    walk = []
    for x0 in (-3.5, -4.4):                         # cast.ts trailhead id 4: x = x0 + 1.1 (f - a) / 30, phase x / 1.4
        k = int(np.ceil(x0 / 0.7))
        while True:
            f = A(4) + (0.7 * k - x0) * T.FPS / 1.1
            if f > B["vandalized"] - 24:
                break
            if f >= A(4):
                walk.append(round(f, 1))
            k += 1
    # A3 (cast probe): the strolling couple of that formula is gone from cast.ts; the only walker behind the sign (tour14)
    # takes a step every 30 f far off screen-right -> no steps (the probe can re-enable them, see _apply_cast)
    d("stroll_steps_4", None, "cast probe: no strolling couple behind the sign any more (old formula steps " + ", ".join(f"{x:.0f}" for x in walk)
      + " had no picture) -> none")
    # round 3 (A2 ADD): the raven's moves that are ON SCREEN (project.mjs: perch at x 735 y 503 at 270) get a soft flutter
    d("raven_4", [B["warning"]], "cast.ts thRaven id 4: hop on 'warning' (CHAR r3: a BIG hop warning..+9); the 'vandalized' "
      "ruffle is cut by the frame top (preview2 316-326) -> none")
    d("raven_ruffle_4", [B["piece"] + 6], "CHAR r3 thRaven id 4: snaps to the couple with a ruffle at piece+6 during the crane-back "
      "(project.mjs: perch at x 796 y 128 at 420, in frame)")
    # CHAR r3 (A2 ADD): on "a small piece at a time" the red-cap tourist behind the sign stoops (bump 418, 12 f), pockets a
    # chip (hand to the pocket from 424, the chip gone at 427) and whistles two notes (notes() at 428, 434); project.mjs:
    # x ~300 y ~1140-1210 (above the caption band) at 420-434
    d("redcap_pocket_4", 424, "CHAR r3 trailhead id 4: pk = ramp(424, 5), chip held until 427 -> rustle from 424, tick at 427")
    d("whistle_4", [428, 434], "CHAR r3 trailhead id 4: notes(..., [428, 434]) with the 'whistle' face 427-445")
    # the red-cap tourist behind the sign photographs it: the flash on 'vandalized'+18 is in frame (preview2 334-335), the
    # one on 'warning'+2 is hidden behind her hat (271-276) -> one shutter
    d("shutter_4", [B["vandalized"] + 18], "cast.ts trailhead id 4: flash(BEAT.vandalized + 18, 3 f), visible at preview2 (160, 610) 334-335")
    # ---- 5 whisper
    d("lean_5", B["leaned"] - 1, "cast.ts woman id 5: lean = settle(f, leaned-1, 7)")
    d("hand_mouth_5", B["whispered"] - 1, "cast.ts: hm = settle(f, whispered-1, 5) - 0.12 bump(whispered-3, 2): the hand first moves "
      "whispered -> +1 (A3 P3: the swish was 3 f early at 501)")
    d("sweat_5", B["now"], "cast.ts fiance: the sweat drop pops on at BEAT.now")
    d("raven_wing_5", [463], "CHAR r3 whisperRaven: drops from the board top from d0 = 464 over 7 f, wings flapping d0-2..d0+9")
    # A4 P3 (+ carry-over): the far photographer and his flash (520) are occluded in preview4 -> no shutter until CHAR
    # makes him visible (then set {"shutter_5": [<flash frame>]} in picture_events.json)
    d("shutter_5", None, "A4 P3: the shot-5 photographer + flash (520) are occluded in preview4 (video 659) -> none")
    # ---- 6 mystery
    d("raven_6", [604], "CHAR r3 thRaven id 6: ruffle 604..614 as the tumbleweed rolls past (board top in frame, project.mjs x 749 y 533)")
    # A4 ADD: the mystery relight (noon -> late, story.ts relight at S6 f 569 over 60 f) is marked by ear: a slow low wind
    # swell over the relight (bed gain, render_beds) and the first far cricket as the light settles
    rl = [r for r in (T.SHOTS[6].get("relight") or []) if r.get("to") == "late"]
    d("relight_6", {"f": rl[0]["f"], "dur": rl[0].get("dur", 60)} if rl else None, "story.ts SHOTS[6].relight (noon -> late)")
    d("cricket_6", (rl[0]["f"] + rl[0].get("dur", 60)) if rl else None, "A4 ADD: the first distant cricket as the late light settles (relight end)")
    # the tumbleweeds come from picture_probe.json (audio_probe.mjs) further down
    # ---- 7 the professor
    d("pen_write_7", [A(7) + 4, B["professor"] - 2], "cast.ts professor: writing while f < professor-2 (pen jiggles on the board)")
    # A5 P2 / CHAR r5: the nod is at testedIt-11..+1; the pen flourishes 742-747 and touches the clipboard at 748, 751, 754
    # (testedIt-4, -1, +2; preview5 video 977 / 980-981), then rests: three small dry ticks, nothing on the old +9 / +12
    d("pen_tap_7", [B["testedIt"] - 4, B["testedIt"] - 1, B["testedIt"] + 2], "CHAR r5 professor: pen contacts on the clipboard at testedIt-4, -1, +2 "
      "(748 / 751 / 754; A5 P2: the SFX was 19 f late)")
    # A5 ADD: the canyon wren on the CRYSTAL plate hops at professor+14 (sets_ext.ts hop(h1), in frame: preview5 video 925);
    # its second hop (cialdini-6) is outside the frame after the camera move
    d("wren_7", [B["professor"] + 14], "sets_ext.ts wren hop(h1 = professor+14): a faint cactus-wren chirp on the visible hop")
    # A4 P2: the tallies keep growing on screen after the first scratch (preview4 video 852-858 / 868-874 = picture
    # professor+8..+13 / +24..+31): two more short scratch bursts on those strokes
    d("pen_more_7", [[B["professor"] + 8, B["professor"] + 13], [B["professor"] + 24, B["professor"] + 31]],
      "A4 P2: the visible tally strokes after 'professor,' (video 852-858, 868-874) -> two short scratch bursts")
    # A4 P2: the fly-through INTO the clipboard (story.ts FLY7 = testedIt+1, log zoom ramps over 6 f then 0.18 / f) has no
    # air: a soft rising whoosh from FLY7 peaking on its fastest frames (~S8.a-1, video 937) and gone under the 7->8 dissolve
    d("fly_7", {"start": B["testedIt"] + 1, "peak": T.SHOTS[8]["a"] - 1, "end": T.SHOTS[8]["a"] + 2},
      "story.ts FLY7 = testedIt+1 (the dolly + zoom into the clipboard), fastest at the 7->8 dissolve (A4 P2: video 924-944)")
    # ---- 8 the team
    d("chip_set_8", [B["marked"] - 6, B["marked"] - 4], "CHAR r5 team: asst1 sets his chip down at marked-6 (776, a dust puff = the thud), asst2 at "
      "marked-4 (778); the cast probe reads every chip that leaves a hand onto the ground")
    d("dot_dab_8", B["marked"], "cast.ts team: fxChip gets its white dot at BEAT.marked (dotHand bump marked-3..+3)")
    # A4 P2: the second assistant (and his stopwatch) is outside the frame at the click (preview4 video 960-985) -> none;
    # if the LEAD / CAM frames him, set {"stopwatch_8": "marked+10"} in picture_events.json (on the visible thumb press)
    d("stopwatch_8", B["marked"] + 10, "cast.ts team: the thumb press bump(marked+10, 3) = 792 (fx 'stopw1f'); the cast probe drops it while the "
      "stopwatch is outside the frame")
    # A4 P2: the whip pan with the hidden cut (story.ts WHIP8 = marked+17 -> CUT8 = WHIP8+7) gets a light air swish
    d("whip_8", {"start": B["marked"] + 17, "peak": B["marked"] + 24}, "story.ts WHIP8 = marked+17, CUT8 = WHIP8+7 (the pan peaks at the hidden cut)")
    # toon.ts swapPath(8, f - swapping) drives both panels (sets_ext) and the assistant's hands; the cast probe follows it
    d("panel_unhook_8", B["swapping"] - 2, "toon.ts swapPath: the old panel leaves the hooks from swapping-2 (lerp over 4 f)")
    d("panel_lean_8", B["swapping"] + 5, "toon.ts swapPath: the old panel comes to rest leaning on the post at swapping+5")
    d("panel_hang_8", B["swapping"] + 10, "toon.ts swapPath: the new panel's big move ends ON the post at swapping+10 (A3 P3: "
      "exact-frame strip 846; the 851 drop onto the hooks is a 12 cm settle nobody sees)")
    d("dust_off_8", B["signs"] + 10, "CHAR r5: asst3 dusts off his hands at 864-866, then turns and walks off right from 866")
    d("asst3_turn_8", B["signs"] + 12, "CHAR r5: asst3 turns to walk off right (866): one soft gravel scuff (his first foot contact is out of frame)")
    # ---- 9 the two signs
    # A2 P3: the assistant is never in shot 9's lens (preview2 872-900) -> no walk-off steps
    d("asst_steps_9", None, "asst3 is not in shot 9's frame (preview2) -> none")
    # reader A (cast.ts signReaders: P0 tt([-2.25,0,0.6]), walks right from 938 at 1.15 m/s, one foot every 0.5 m) is the
    # tourist who crosses the frame in front of BOTH signs (project.mjs: x 235 at 951 -> 894 at 1003, out at ~1012)
    d("readerA_walk_9", None, "CHAR r3 signReaders: reader A now STAYS at Sign A (reads, nods on 'wood.') -> no walk-off steps")
    # CHAR r3 (A2 ADD / P2): a distant couple on the JASPER path, one lifts a camera (flash 905; CAM r3 x 367 y 951); asst2
    # far back holds up the stopwatch and clicks it (965-968; x 349 y 1115); reader B (tt([0.65,0,0.8]), in frame: x 701 at
    # 1004) pats his hip pocket on 'removed' (pat = 3 |sin((f - REM)/4 pi)|, back on the pocket every 4 f) and his hand goes
    # to the pocket from 1033 while a tourist up the path squats and pockets a marked chip (1031-1041, x 847)
    rem = round(T.sec_to_old(float(T.word("removed", T.bt("many1"))["s"])))
    d("shutter_9", [905], "CHAR r3 signReaders: flash(905, 2 f) of the distant JASPER-path couple")
    d("stopwatch_9", [965], "CHAR r3 signReaders: asst2's stopwatch shows a click at 965-968")
    d("readerB_pats_9", [rem + 4, rem + 8], "CHAR r3 signReaders: reader B's hip pats from REM = 'removed' (every 4 f)")
    d("raven_land_9", [958, 962], "CHAR r3 signReaders: the raven glides with the truck and lands on B's LED at L0 = 958 (wing fold), hops 958-962-966")
    d("readerA_steps_9", None, "replaced by readerA_walk_9")
    d("truck_air_9", B["another"] + 1, "story.ts CAMS[9] truck A -> B: key at another-16, dur 34 (peak speed mid-glide)")
    # reader B (tt([1.0,0,0.6])) is OFF screen right the whole shot (project.mjs x ~1300 at 964-990): his 'shifty' weight
    # shift (1000) and pocket move (1036) have no picture (A2 P3) -> none until CHAR stages a pocketer at B (A2 CHAR P2: 1033-1038)
    d("readerB_pocket_9", rem + 6, "CHAR r5 signReaders: reader B's chip goes into his hip pocket at REM+6 ('removed'), pats REM+10..+16")
    d("far_pick_9", [1033, 1040], "CHAR r3 signReaders: the tourist up the path picks a marked chip off the trail (1033) and sets it down again (1040)")
    d("readerB_shift_9", None, "reader B is off screen -> none")
    d("raven_9", [934], "CHAR r3 signReaders: Sign A's raven takes off at fo = 934 and glides with the truck (wings flapping) to B's LED")
    # ---- 10 results
    t10 = A(10)
    d("touristA_pick_10", 1075, "CHAR r3 results: hand -> ground 1072-1076 (2 f anticipation at 1070): fingers on the chip ~1075")
    d("touristA_put_10", B["pct2"], "CHAR A2-P1: crouch 1087-1090, sets it down ON 1090 with a 3 f dust puff")
    d("whistle_10", [t10 + 50, t10 + 58, t10 + 66], "cast.ts results: notes() at t0+50 / +58 / +66 (t0 = shot 10 a): he whistles innocently "
      "(CHAR A2: whistle from 1096 with a side-eye back at the sign)")
    d("counter_A", {"target": 1.67, "land": B["pct2"]}, "sets_ext poseLed val(1.67, BEAT.pct2): 26 f ease-out roll")
    d("crowd_squat_10", B["pct8"] - 27, "CHAR A1-P1: the five squat together 1160-1166")
    d("crowd_pocket_10", 1173, "CHAR r3 results: hand -> pocket at 1172+off over 5 f (chip in ~1176), hip pats 1178-1184 (back on the pocket ~1181.5)")
    d("shutter_10", [1150], "CHAR r3 results: crowd member 3 photographs the PANEL, flash(1150, 2 f) (CAM r3: x 799 y 932)")
    d("glint_10", [1168], "CHAR r3 results: one holds his chip up to the sun, glintAt(1168, 6 f) (x 617 y 901)")
    d("counter_B", {"target": 7.92, "land": B["pct8"]}, "sets_ext poseLed val(7.92, BEAT.pct8)")
    d("cha_ching", B["pct8"], "the counter lands ON '8%'")
    # A5 ADD: the raven on Sign B's LED box bolts at the cha-ching (cast probe wing run at pct8) and a loose feather drifts
    # down past the LED (fx 'feather' 1191-1210)
    d("raven_bolt_10", B["pct8"], "cast.ts results: the raven bolts off Sign B's LED box at the cha-ching (wings out on pct8)")
    d("feather_10", B["pct8"] + 3, "cast.ts results: a loose feather drifts down past the LED (fx 'feather' pct8+2 ..)")
    # A5 ADD: the two white-hat tourists scurry off left in the stop-time (cast.ts 1201-1213): light gravel steps on their
    # ON-SCREEN foot contacts only (preview5 / the probe: their heads are below the frame bottom, x < 0, so none today)
    d("scurry_10", None, "cast probe: on-screen walk contacts of the Sign B crowd after the cha-ching")
    # ---- 11 blueprint
    d("bp_path_11", B["youSee"] + 2, "sets_int: the path rails draw f0 = youSee+2 .. +15, footstep dashes")
    d("bp_circle_11", B["youSee"] + 10, "sets_int: dashed circle marker f0+8 .. f0+20")
    d("bp_rule_11", B["copyRules"] - 10, "sets_int: junction copyRules-10..-8, THE RULE arrow copyRules-8 over 16 f")
    d("bp_rule_label_11", B["copyRules"] + 2, "sets_int: label 'THE RULE' pops (outBack 8 f)")
    d("bp_crowd_11", B["copyEach"] + 3, "sets_int: junction copyEach+3..+6, EVERYONE ELSE arrow copyEach+6 over 16 f")
    d("bp_crowd_label_11", B["eachOther"] + 2, "sets_int: label 'EVERYONE ELSE' pops")
    # A3 P2: cast.ts walks him from w0 = copyEach+2 at 1.4 m/s and STOPS at manySteal-2; toon.ts lands a foot every half
    # walk cycle (phase = s / 0.4 m -> a contact every 0.2 m); the cast probe reads the real contacts
    d("bp_walk_11", {"start": B["copyEach"] + 2, "speed": 1.4, "step_m": 0.2, "until": B["manySteal"] - 2},
      "cast.ts blueprint: walks from copyEach+2 at 1.4 m/s, a foot every 0.2 m (toon.ts phase k/2), stops at manySteal-2")
    d("sign_float_11", B["manySteal"] - 4, "sets_int: the panel flies in fa = manySteal-4, settles fa+16")
    # A5 ADD: the EVERYONE ELSE chalk crowd streams along the wide arrow (cast.ts chalkc* cards, a 2-drawing walk on 3s):
    # a very soft blurred paper-shuffle texture of many chalk feet while it walks (the cast probe gives the real span)
    d("bp_crowd_walk_11", {"start": B["copyEach"] + 11, "end": T.SHOTS[11]["b"]}, "cast.ts blueprint: the EVERYONE ELSE crowd stream walks (chalkc* cards)")
    # sets_int poseBlueprint: THIEF_N = 30 cut-outs, thief i leaves the picture at everyone + i/2.5 (scale 0.35 -> 1, so it
    # separates from the picture ~2 f later: A2 P3 saw the first ones pop at 1379-1380), flies 9 f and lands standing (squash)
    d("thief_pops_11", {"start": B["everyone"] + 2, "count": 30, "rate": 2.5, "land": 9},
      "sets_int: thief i at everyone + i/2.5 (THIEF_N 30), visible from +2 f; lands 9 f later (chalk-paper tap)")
    # ---- 12 classroom
    d("chalk_12", [[round(a, 2), round(b, 2), ch] for a, b, ch in _chalk_glyphs()], "sets_int chalkWords()/glyphs(): letter windows (frames)")
    d("bubble_12", B["everybody"] - 1, "cast.ts classroom: the student's bubble pops at everybody-1 (scale 0.55)")
    d("darts_12", [B["everybody"], B["everybody"] + 6, B["everybody"] + 12], "cast.ts student darts flip every 6 f from BEAT.everybody")
    # A4 P3: the camera's whip-arc from the board to the student (story.ts ARC12A = cheated-4, ARC12D = 54; its fast part
    # is the middle ~18 f, video ~1815 = picture cheated+28) gets a soft air swish; the newly seated pupils scratch with
    # their pencils after it; one chair creaks on 'everybody' (A4 ADD)
    d("whip_12", {"center": B["cheated"] - 4 + 0.6 * 54, "half": 8}, "story.ts arc12: ARC12A = cheated-4, ARC12D = 54, fastest ~cheated+28 (A4 P3: video ~1815)")
    d("pencils_12", [B["cheated"] + 36, B["cheated"] + 46, B["cheated"] + 57], "A4 P3: 2-3 faint pencil scratches from the seated pupils after the whip")
    d("chair_12", B["everybody"] + 2, "A4 ADD: one chair creak on 'everybody' (a pupil shifts as the bubble pops)")
    # A5 ADD: a crisp chalk 'tok' + tiny snap on the full stop of 'CHEATED.' (its glyph window, the dot shows mid-window)
    dots = [0.5 * (a + b) for a, b, ch in _chalk_glyphs() if ch == "."]
    d("chalk_dot_12", dots[0] if dots else None, "sets_int chalkWords(): the '.' of 'CHEATED.' is drawn mid-window -> a chalk tok + snap")
    # ---- 13 permission
    d("thieves_pocket_13", [B["thieves"], B["thieves"] + 3, B["thieves"] + 7], "CHAR A1-P1: three backlit tourists pocket chips on 'thieves', 3-4 f apart")
    d("stamp", B["permission"], "sets_ext poseStamp: falls F-5..F, squash F..F+2, hold to F+8, lift F+8..F+17")
    d("photo_13", [1598], "cast.ts permission: her flash(1598, 6 f) on the stamped sign (in frame, preview2 1598-1603)")
    # A2 P3: the raven bolts off Sign B's LED box on the slam (cast.ts fo = F, wings out 1585-1588, two loose feathers
    # drifting 1588-1597): two fast flaps after the slam's 150 ms mid-band dip, then a feather flutter
    d("raven_13", B["permission"] + 2, "cast.ts permission: raven flaps off at the slam (fo = F), wings spread 1585-1588")
    d("feathers_13", B["permission"] + 7, "cast.ts permission: the two loose feathers drift down 1588-1597")
    # A5 ADD: the red-cap tourist (tour0Splum, screen-left) belly-laughs F+1 .. F+18 ('laugh' face, 5.5 Hz bob): a dry,
    # short wordless 'heh-heh' in the word gap after 'permission.' (never under the climax word)
    pe_ = _word_end("permission", "gave")
    d("chuckle_13", {"from": B["permission"] + 1, "to": B["permission"] + 18, "after_s": pe_} if pe_ else None,
      "cast.ts permission: the red cap laughs F+1..F+18 -> 'heh-heh' in the gap after 'permission.'")
    # ---- 14 storeroom
    # cast.ts storeroom: 3 scoops at fs = pieces+4 + k (apology - pieces - 4)/3: dips into the pile fs-6..fs-2, swings to
    # the bucket fs-2..fs+4, tips fs+4..fs+9 (sets_int fill steps at pieces-2 + 20c + 15, i.e. fs+7.7..fs+9)
    s0, s1 = B["pieces"] + 4, B["apology"]
    # cast.ts storeroom FS = [bait+1, conscience+10, s0, s0+gap]: a scoop bites the pile over fs-6..fs-2 (the bite at fs-6),
    # tips fs+4..fs+9. FS[0] / FS[1] draw their own 4 chips (cast.ts: chip k leaves the tip at fs+4+k, lands fs+10+k);
    # FS[2] / FS[3] pour WORLD-INT's 3 chips (sets_int pourAt: leave fs+4+k, land fs+9+k). A5 P3: every part only plays
    # where the picture shows it (the cast probe: the assistant / the bucket on screen), see _apply_cast
    d("scoops_14", [{"fs": B["conscience"] + 10, "chips": [10.0, 11.0, 12.0, 13.0]},
                    {"fs": s0, "chips": [9.0, 10.0, 11.0]}, {"fs": round(s0 + (s1 - s0) / 3, 2), "chips": [9.0, 10.0, 11.0]}],
      "CHAR r5 storeroom: FS[1..3] = conscience+10 (CHAR: dig 1669, chips 1680-1686), pieces+4, pieces+4+gap")
    d("bait_scoop_14", [B["bait"] + 1], "CHAR r3 storeroom: the first scoop ON 'the bait wood?' (FS[0] = bait+1), already loaded when the insert "
      "opens: no dig; the blade tips at fs+4 and its 4 chips land fs+10.6 .. +13.6 (A5 P3: preview5 video 2149-2153)")
    d("mail_flap_14", B["mailed"] - 7, "sets_int poseStoreroom: open = f >= mailed-7 (1724; matches WORLD-INT A2-P2 'swing the flap on 1724')")
    # sets_int: item(mailEnv, land = mailed), item(mailBox, land = mailed + 3): the padded envelope lands ON 'mailed' (1731),
    # the taped parcel 3 f later (1734) - preview2 crops 1728-1735 confirm (A2 P2: they were swapped)
    d("parcel_14", B["mailed"] + 3, "sets_int: item(mailBox, mailed+3): the parcel lands 1734 (preview2: in the chute 1731, lip 1732, falls 1733)")
    d("envelope_14", B["mailed"], "sets_int: item(mailEnv, mailed): the envelope lands ON 'mailed' 1731 (preview2: lip 1729, mid-fall 1730)")
    # A4 P3: the letter is picked at LB = apology-6 and lifted to the lens LC = apology-4 .. +6 (cast.ts storeroom; video
    # 2140-2146): the rustle starts on the pick and covers the lift
    d("letter_pick_14", B["apology"] - 6, "cast.ts storeroom: LA = apology-10 (reach), LB = apology-6 (picked, hold 'letter'), lifted LC = apology-4 over 6 f")
    # A4 ADD: chips sliding / settling on the CONSCIENCE PILE a few frames after each scoop bites it (the bite is fs-5)
    d("rocks_14", None, "A4 ADD: the pile settles after each visible bite (fs+2), from scoops_14")
    d("letters_hop_14", [B["apology"] + 3 * k for k in range(3)], "sets_int: the three hero letters hop at apology + 3i")
    # A5 ADD (WORLD-INT r4): the hanging bulb swings when the parcel lands (mailed+3, decays ~1.5 s): a chain 'tink' at
    # mailed+4 and a short mains-hum swell that decays with the swing
    d("bulb_14", B["mailed"] + 4, "sets_int: the hanging bulb swings on the parcel landing (mailed+3): chain tink + hum swell")
    # A5 ADD: one far owl hoot through the night window, in the word gap before 'So some of it' (if it falls in shot 14)
    d("owl_14", B["soSome"], "A5 ADD: a far owl hoot in the gap before 'So some of it' (night by ear, no words added)")
    # ---- 15 dusk
    d("pocket_15", 1822, "cast.ts tagShot: the chip slides in 1821-1825 (IN0/IN1 are literals in cast.ts); A3 P3: it disappears "
      "into the pocket at 1822-1823 -> tick on 1822")
    d("tag_sparkle_15", 1800, "CHAR r3 tagShot: a sparkle on the blue-quartz chip at 1800 (callback to the shot-1 glint)")
    # A5 P2 / CHAR r5: the '2' card opens at picture 1828 (the tag2 key starts 1827, a thin '2' first), the flap shuts at
    # 1825-1826: the ding ON the opening (tag2 key + 1), a soft flap tick 1.5 f before the key (the cast probe follows)
    d("tag_ding_15", B["twice"] - 1, "cast.ts tagShot: the '2' card opens 1 f after the tag2 key (CHAR r5: 1828)")
    d("card_flick_15", B["twice"] - 3.5, "CHAR r5: the tag flap shuts at 1825-1826, a soft flick tick there (tag2 key - 1.5)")
    # A4 ADD: one far nighthawk 'peent' once the dusk shot is up (dusk life), long before the loop seam
    d("nighthawk_15", T.SHOTS[15]["a"] + 5, "A4 ADD: a far nighthawk 'peent' as the dusk shot settles (S15.a+5), fades well before the loop")
    # A3 P3: the two pats (twice+2 + 5 k) are a 4.8-unit hand dip inside the camera whip - nobody sees them -> none
    # (if CHAR draws a readable pat, e.g. a 10 px drop for 3 f, set "pats_15": ["twice+7", "twice+12"] in picture_events.json)
    d("pats_15", None, "A3 P3: no visible pat (hand static / blurred at 1836, 1841) -> none")
    # A3 ADD: the tag dangling from the pocket flutters on its twine (tag swing speed from the cast probe) ...
    d("tag_flutter_15", None, "cast probe: tag swing (fx 'tag' rot per frame in shot 15) -> soft paper flutter")
    # ... and a car starts far off in the parking lot under "So some of it" (door, starter, catch, pulls away by 'stolen')
    d("car_15", {"door": B["soSome"] + 6, "crank": B["soSome"] + 13, "away_by": B["stolen"] + 6},
      "A3 ADD: far car door ~'So', starter under 'some of it', catches on 'got', drives off, gone before 'twice'")

    # ---- tumbleweeds (every shot): sets_ext TUMBLE routes projected by audio_probe.mjs -> picture_probe.json
    seen = {}
    for row in _probe().get("tumbles", []):
        sid = int(row["id"])
        key = f"tumble_{sid}" + ("b" if sid in seen else "")
        seen[sid] = True
        on = row.get("live_on")
        spec, why = None, "never on screen"
        if on and row.get("n_vis", 0) >= 8:
            path = row.get("path") or []
            inside = [p for p in path if 0 <= p[1] <= 1080 and 0 <= p[2] <= 1920]
            r_px = row["nearest"]["r_px"]
            if len(inside) >= 3 and r_px >= 45:
                spec = {"on": on, "contacts": [c for c in row["contacts"] if on[0] - 2 <= c <= on[1] + 2], "x": row["x"], "r_px": r_px}
                why = f"audio_probe: on screen {on[0]}-{on[1]}, x {row['x'][0]} -> {row['x'][1]}, nearest {r_px} px, hop landings {row['contacts']}"
            else:
                why = f"audio_probe: too small or only a sliver on screen ({len(inside)} probe points inside the frame, nearest {r_px} px) -> none"
        d(key, spec, why)

    # ---- the LED counters' hum (shots where the PIECES MISSING boxes are in frame), dB vs the bed level
    # A4 P1: only where a PIECES MISSING box is in frame: shot 8 from the trail-heads wide (the hidden cut CUT8 =
    # marked+24, Sign A's box on top of the post), shots 9, 10 (rolling) and 13 ([dB, from frame] or dB)
    d("led_hum", {"8": [-6.0, B["marked"] + 24], "9": -4.0, "10": 0.0, "13": -4.0},
      "the LED boxes are in frame in shot 8's wide (from CUT8), 9, 10 (rolling) and 13: a faint driver buzz under the wind")

    d("raven_auto", None, "cast probe: the other ON-SCREEN raven hops / ruffles (cast.ts raven() idle life) -> soft flutters / claw ticks")

    _apply_cast(D, SRC)                         # the picture's own frames (cast probe) over the formulas above
    over = {}
    if os.path.exists(PE_PATH):
        with open(PE_PATH, encoding="utf-8") as f:
            over = {k: v for k, v in json.load(f).items() if not k.startswith("_")}
    for k, v in over.items():
        if k not in D:
            print(f"[sfx] picture_events.json: unknown key {k!r} ignored")
            continue
        D[k] = resolve(v)
        expr = isinstance(v, str) or (isinstance(v, list) and any(isinstance(x, str) for x in v))
        SRC[k] = "OVERRIDE picture_events.json" + (f" ({json.dumps(v)})" if expr else "")
    return D, SRC


# ================================================================ round 4: follow the picture's own frames (cast probe)
RAVEN_KEYS = ("raven_ruffle_1", "raven_hop_1", "raven_4", "raven_ruffle_4", "raven_wing_5", "raven_6", "raven_9", "raven_land_9", "raven_13",
              "feathers_13")
HIT_BEATS = ("paperclip", "steal1", "tons14", "now", "honest", "pct2", "pct8", "permission", "mailed", "twice")
RAVEN_AUTO_MAX = 2                              # per shot


def _apply_cast(D, SRC):
    """move each cue onto the frame where the picture really does it (cast.ts stage() facts from the probe). follow():
    every default frame goes to the nearest matching picture fact within +-win frames; a frame with no such action in the
    picture is DROPPED (no SFX without a visible source). Shots the probe did not cover keep their formula."""
    F = _cast()
    if not F:
        return
    B = T.BEAT
    sh = lambda sid: F.get(str(sid))
    ANY = object()

    def fxr(sid, fam, on=True):
        return [r for r in (sh(sid) or {}).get("fx", {}).get(fam, []) if (r[4] or not on)]

    def holds(sid, frm=ANY, to=ANY, who=None, tgts=None, on=None):
        out = []
        for f, w, j, a, b, tg, x, y, o in (sh(sid) or {}).get("holds", []):
            if frm is not ANY and a != frm:
                continue
            if to is not ANY and b != to:
                continue
            if who is not None and not re.fullmatch(who, w):
                continue
            if tgts is not None and tg not in tgts:
                continue
            if on is not None and bool(o) != on:
                continue
            out.append((f, w, x, y))
        return sorted(out)

    def modes(sid, frm, to, who):
        return sorted(r[0] for r in (sh(sid) or {}).get("modes", []) if r[2] == frm and r[3] == to and re.fullmatch(who, r[1]))

    def setv(k, v, why):
        D[k] = v
        SRC[k] = "cast probe: " + why

    def follow(k, sid, cands, win, why):
        if not sh(sid) or D.get(k) is None:
            return
        cur = D[k]
        lst = [float(x) for x in (cur if isinstance(cur, list) else [cur])]
        used, out, drop = set(), [], []
        for f0 in lst:
            best = None
            for c in cands:
                if c not in used and abs(c - f0) <= win and (best is None or abs(c - f0) < abs(best - f0)):
                    best = c
            if best is None:
                drop.append(f0)
            else:
                used.add(best)
                out.append(round(float(best), 2))
        val = out if isinstance(cur, list) else (out[0] if out else None)
        setv(k, val, f"{why}: {', '.join(f'{x:g}' for x in lst)} -> {', '.join(f'{x:g}' for x in out) or 'none'}"
             + (f" (dropped {', '.join(f'{x:g}' for x in drop)}: no such action in the picture)" if drop else ""))

    POCKET = ("pocket", "chestPocket", "waist", "hipPocket")

    def rv(sid, kind, on=True):
        return sorted(r[0] for R in (sh(sid) or {}).get("ravens", []) for r in R.get(kind, []) if (r[5] or not on))
    def on_run(r):
        """A5: the first / last frame a fx run is IN FRAME (probe rows [a, b, x, y, on@a, key, first on, last on])"""
        return (r[6], r[7]) if len(r) >= 8 else ((r[0], r[1]) if r[4] else (None, None))
    # ---- 1: the paperclip bubble (A5 P1/P2: its run starts ABOVE the frame - the old filter dropped it and the stale
    # literal 63 stayed; the camera tilt reveals it full-size on its first in-frame frame, it shrinks on its last 2)
    r = fxr(1, "bubbleClip", on=False)
    if r:
        a_on, b_on = on_run(r[0])
        rev = a_on is not None and a_on > r[0][0] + 2
        setv("bubble_in", (a_on - 1) if rev else r[0][0], f"bubbleClip card {r[0][0]}-{r[0][1]}, in frame from {a_on}: "
             + ("revealed full-size by the camera tilt -> a soft reveal, not a pop" if rev else "pops in on screen"))
        setv("bubble_reveal", bool(rev), "the bubble is first in frame on " + str(a_on) + (" (camera tilt reveal)" if rev else " (pops in on screen)"))
        setv("bubble_out", round(r[0][1] - 1.3, 2), f"bubbleClip card {r[0][0]}-{r[0][1]}: shrinks {r[0][1] - 1}-{r[0][1]} (A5: audit 82.7)")
    g1 = fxr(1, "glint")
    if g1:
        follow("glint", 1, [g1[0][0] + 0.8], 6, f"the glint star's run {g1[0][0]}-{g1[0][1]} (A5 P3: ding 0.8 f after its first frame, video ~167.5)")
    # ---- 3
    follow("pocket_3", 3, [h[0] - 4 for h in holds(3, "chip", None, tgts=POCKET)], 6, "the chip leaves his hand into the pocket (tick 4 f into the cue)")
    nb3 = sorted((sh(3) or {}).get("notes", []))
    w3 = D.get("whistle_3")
    if w3 is not None:
        follow("whistle_soft_3", 3, [n for n in nb3 if n < float(w3) - 1], 4, "whistle-note births before the gap whistle")
        follow("whistle_note2_3", 3, [n - 1.5 for n in nb3 if n > float(w3)], 4, "the note drawn after the gap whistle (2nd note 1.5 f before it)")
    follow("shutter_3", 3, [r[0] for r in fxr(3, "flash")], 6, "on-screen camera flash")
    # ---- 4
    follow("redcap_pocket_4", 4, [h[0] - 3 for h in holds(4, "chip", None)], 6, "the red-cap tourist's chip leaves his hand (tick 3 f into the cue)")
    follow("whistle_4", 4, sorted((sh(4) or {}).get("notes", [])), 4, "whistle-note births")
    follow("shutter_4", 4, [r[0] for r in fxr(4, "flash")], 4, "on-screen camera flash")
    if sh(4):
        steps = sorted(c[0] for w, cs in sh(4).get("walks", {}).items() for c in cs if c[3] and c[0] < B["vandalized"] - 24)
        gaps = np.diff(steps) if len(steps) > 1 else np.array([99.0])
        if len(steps) >= 3 and float(np.median(gaps)) <= 22:
            setv("stroll_steps_4", [round(x, 1) for x in steps], f"on-screen foot contacts behind the sign before vandalized-24: {len(steps)}")
    # ---- 5
    if sh(5):
        hm = [h[0] for h in sh(5).get("hands", []) if h[1] == "woman" and h[3] == "whisper"]
        if hm:
            setv("hand_mouth_5", hm[0] - 1, f"her whisper hand first moves on {hm[0]} -> the sleeve swish starts 1 f before")
    follow("sweat_5", 5, [r[0] for r in fxr(5, "sweat")], 4, "the fiance's sweat drop pops on")
    follow("shutter_5", 5, [r[0] for r in fxr(5, "flash")], 8, "on-screen camera flash (projection only: not occlusion-checked)")
    # ---- 8
    cs8 = [h for h in holds(8, "chip", None, tgts=("ground",), on=True)]
    if sh(8):
        puffs = [r_[0] for r_ in fxr(8, "puff")]
        setv("chip_set_8", [round(float(h[0]), 2) for h in cs8] or None, "every on-screen chip that leaves a hand onto the trail: "
             + ", ".join(f"{h[0]} ({h[1]}{', dust puff = thud' if any(abs(p_ - h[0]) <= 1 for p_ in puffs) else ''})" for h in cs8))
        setv("chip_thud_8", [float(h[0]) for h in cs8 if any(abs(p_ - h[0]) <= 1 for p_ in puffs)], "the chip set-downs with a dust puff (a dull thud)")
        sw = [r_ for r_ in fxr(8, "stopw1f", on=False) if on_run(r_)[0] is not None]
        if D.get("stopwatch_8") is not None:
            follow("stopwatch_8", 8, [r_[0] for r_ in sw], 3, "the stopwatch thumb press (fx 'stopw1f') IN FRAME")
        wk3 = modes(8, "stand", "walk", r"asst3")
        if wk3 and D.get("asst3_turn_8") is not None:
            setv("asst3_turn_8", float(wk3[0]), f"asst3 starts walking off on {wk3[0]}")
            setv("dust_off_8", float(wk3[0]) - 2, f"asst3 dusts off his hands right before he walks off ({wk3[0]} - 2)")
    pn = (sh(8) or {}).get("panel")
    if pn:
        # A4 P2: swapPath's 'unhook' is the first frame of a 4 f lerp whose first frames barely move: the panel visibly
        # lifts ~5 f later (preview4 video 1029-1030); its 'lean' key is ~2.6 f after it touches the ground (video 1036)
        PAN_OFF = {"unhook": 5.0, "lean": -2.6, "hang": 0.0}
        for k, fk in (("panel_unhook_8", "unhook"), ("panel_lean_8", "lean"), ("panel_hang_8", "hang")):
            if pn.get(fk) is not None:
                setv(k, round(pn[fk] + PAN_OFF[fk], 2), f"toon.ts swapPath: {fk} on {pn[fk]}{PAN_OFF[fk]:+g} f = the visible move "
                     f"(new panel peak speed {pn['peak']}, settles {pn['settle']})")
    # ---- 9
    follow("shutter_9", 9, [r[0] for r in fxr(9, "flash")], 6, "on-screen camera flash")
    follow("readerB_pocket_9", 9, [h[0] - 3 for h in holds(9, "chip", None, tgts=POCKET, on=True)], 8, "reader B's chip into his hip pocket (tick 3 f into the cue)")
    fp9 = sorted([h[0] for h in holds(9, None, "chip", tgts=("ground",), on=True)] + [h[0] for h in holds(9, "chip", None, tgts=("ground",), on=True)])
    follow("far_pick_9", 9, fp9, 4, "the far tourist's pick / put of a marked chip")
    fly9 = sorted(r_[0] for k_, rows in (sh(9) or {}).get("fx", {}).items() if k_.startswith("fly") for r_ in rows if r_[4])
    # ---- 10
    follow("touristA_pick_10", 10, [h[0] for h in holds(10, None, "chip", who=r"tour1A")], 8, "tourist A's hand closes on the chip")
    follow("touristA_put_10", 10, [h[0] for h in holds(10, "chip", None, who=r"tour1A")], 8, "tourist A lets go of the chip on the ground")
    sq = modes(10, "stand", "squat", r"tour\d+B")
    if sq:
        follow("crowd_squat_10", 10, [min(sq) - 1], 8, f"the Sign B crowd squats ({', '.join(map(str, sq))})")
    cp = [h[0] for h in holds(10, "chip", None, who=r"tour\d+B")]
    if cp:
        follow("crowd_pocket_10", 10, [min(cp) - 3], 8, f"the crowd's chips go into their pockets ({', '.join(map(str, cp))}; ticks 3 f into the cue)")
    follow("shutter_10", 10, [r[0] for r in fxr(10, "flash") if abs(r[0] - B["pct8"]) > 3], 6, "on-screen camera flash (not the one under the cha-ching)")
    follow("glint_10", 10, [r[0] for r in fxr(10, "glint")], 6, "the chip held up to the sun glints")
    follow("whistle_10", 10, sorted((sh(10) or {}).get("notes", [])), 4, "whistle-note births")
    # ---- 11: the walk-off
    if sh(11):
        cs = [c for c in sh(11).get("walks", {}).get("bp", []) if c[3]]
        stops = modes(11, "walk", "stand", r"bp")
        if cs:
            stop = next((f for f in stops if f > cs[0][0]), None)
            setv("bp_walk_11", {"contacts": [round(c[0], 2) for c in cs], "stop": stop},
                 f"toon.ts walk phase: {len(cs)} foot contacts {cs[0][0]:.1f}-{cs[-1][0]:.1f}, stops (feet together) on {stop}")
    # ---- 13: the pockets ON 'thieves' (the plum-backlit tourists in frame)
    if sh(13):
        th = [h[0] - 3 for h in holds(13, "chip", None, on=True) if abs(h[0] - B["thieves"]) <= 12]
        setv("thieves_pocket_13", th or None, f"on-screen chips into pockets within 12 f of 'thieves': {', '.join(f'{x + 3:g}' for x in th) or 'none'} "
             "(ticks 3 f into the cue)")
        fl13 = [r[0] for r in fxr(13, "flash")]
        setv("photo_13", fl13 or None, "every on-screen camera flash (A5: + the back silhouette's at 1572): " + ", ".join(map(str, fl13)))
    # ---- 14: the letter pick (the hand's hold changes to 'letter'); A5 P3: if he takes it OUTSIDE the frame, the rustle
    # moves to the frame he comes back into view holding it (preview5: picked at video 2288, enters ~2294)
    vis14 = (sh(14) or {}).get("vis", {})
    inview = lambda who, f: any(a_ <= f <= b_ for a_, b_ in vis14.get(who, []))
    lp14 = holds(14, ANY, "letter")
    if lp14:
        f_, who = lp14[0][0], lp14[0][1]
        if inview(who, f_) or not vis14:
            follow("letter_pick_14", 14, [f_], 6, "his hand takes the letter")
        else:
            ent = [a_ for a_, b_ in vis14.get(who, []) if a_ > f_ and a_ - f_ <= 12]
            setv("letter_pick_14", float(ent[0]) if ent else None, f"he takes the letter at {f_} outside the frame -> "
                 + (f"rustle as he comes into view with it at {ent[0]}" if ent else "none"))
    # A5 P3: the scoops - the bite only where the assistant is in frame; the clinks where the BAIT bucket is in frame, or
    # -6 dB just off the frame edge when we SAW that scoop bite the pile (he swings out of frame: the chips land off-screen
    # a moment later); a pour with neither on screen is dropped (preview5 video 2262-2264: the bucket off-frame in the tilt)
    bk = {int(r_[0]): r_ for r_ in (sh(14) or {}).get("props", {}).get("bucket", [])}

    def bucket_db(f, seen):
        r_ = bk.get(int(round(f)))
        if r_ is None or r_[3]:
            return 0.0
        dx = max(0.0, -r_[1], r_[1] - 1080.0)
        dy = max(0.0, -r_[2], r_[2] - 1920.0)
        return -6.0 if (seen and max(dx, dy) <= 220) else None
    if sh(14) and D.get("scoops_14"):
        out14, notes14 = [], []
        for sc in D["scoops_14"]:
            fs = float(sc["fs"])
            dig_on = inview("asst1", fs - 6) or not vis14
            chips = []
            for c in sc["chips"]:
                g_ = bucket_db(fs + c, dig_on)
                if g_ is not None:
                    chips.append([c, g_])
            if not dig_on and not chips:
                notes14.append(f"{fs:g}: nothing on screen -> none")
                continue
            out14.append({"fs": fs, "dig": bool(dig_on), "chips": chips})
            notes14.append(f"{fs:g}: bite {'on' if dig_on else 'off'} screen, clinks " + (", ".join(f"{fs + c:g}{'' if g == 0 else f' ({g:+g} dB, bucket at the frame edge)'}" for c, g in chips) or "none (bucket off screen)"))
        setv("scoops_14", out14 or None, "; ".join(notes14))
    # ---- 15
    # ---- 15
    q = fxr(15, "chipQ")
    if q:
        follow("pocket_15", 15, [q[0][0] + 1], 6, f"the chip slides into the pocket {q[0][0]}-{q[0][1]} (A3: gone behind the pocket edge 1 f in)")
    follow("tag_sparkle_15", 15, [r[0] for r in fxr(15, "glint")], 6, "the chip in his hand sparkles")
    if sh(15):
        flips = [f for f, k in sh(15).get("keys", {}).get("tag", []) if k.startswith("tag2")]
        if flips:
            follow("tag_ding_15", 15, [flips[0] + 1], 4, f"the tag's '2' key starts {flips[0]} (a thin '2'), the card opens 1 f later (CHAR r5: 1828)")
            if D.get("card_flick_15") is not None:
                setv("card_flick_15", flips[0] - 1.5, f"the tag flap shuts 1825-1826 (CHAR r5): a soft tick 1.5 f before the '2' key ({flips[0]})")
        # A3 P3: pats only where the picture SHOWS one: the pocket hand drops >= 16 px (1080 scale; the audit's "10 px" is in
        # the 540 preview) onto the pocket (the
        # contact = the bottom of the drop, as the audit asked: "hand drops 10 px for 3 f on 1836 and 1841"), with the card
        # moving <= 10 px/f over the 3 frames before (no camera whip / motion blur); the push-in overshoot right after the
        # chip goes in (pocket_15 .. +5) is not a pat
        pats = []
        for k, rows in sh(15).get("pocketHands", {}).items():
            rows = [r for r in rows if r[0] >= float(D.get("pocket_15") or 0) + 6]       # (the body anchor is below a CU frame: no 'on' test)
            for i in range(1, len(rows) - 1):
                f, dy, ppu = rows[i][0], rows[i][1], rows[i][2]
                if not (dy >= rows[i - 1][1] and dy > rows[i + 1][1]):
                    continue
                lo = min(r[1] for r in rows[max(0, i - 5): i] or [dy])
                prom = (dy - lo) * ppu
                spd = max([np.hypot(rows[j][4] - rows[j - 1][4], rows[j][5] - rows[j - 1][5]) for j in range(max(1, i - 3), i + 1)] or [0.0])
                if prom >= 16.0 and spd <= 10.0:
                    pats.append(float(f))
        setv("pats_15", sorted(pats) or None, "pocket pats with a visible hand drop (>= 16 px, card <= 10 px/f): " + (", ".join(f"{x:g}" for x in pats) or
             "none (today's two dips are 12 px at 1833-1834 / 1838-1839, the 2nd inside the camera whip)"))
        rot = sh(15).get("tag_rot")
        if rot and len(rot) > 3:
            vmax = max(abs(rot[i][1] - rot[i - 1][1]) for i in range(1, len(rot)))
            setv("tag_flutter_15", {"rot": rot}, f"tag swing {rot[0][0]}-{rot[-1][0]} (max swing speed {vmax:.3f} rad/f)")
    # ---- the scripted raven cues follow the raven's own moves (sound 1 f before its first moving frame, as tuned in A1/A2)
    if sh(9) and fly9:                     # A5: the raven's take-off = its first flying card (fx fly*), not a 'wing' run
        follow("raven_9", 9, [fly9[0]], 6, f"the raven's flying cards start {fly9[0]} (take-off)")
    if sh(10):
        sc10 = sorted(c[0] for w_, cs in sh(10).get("walks", {}).items() if re.fullmatch(r"tour\d+B", w_) for c in cs if c[3] and c[0] > B["pct8"])
        setv("scurry_10", [round(x, 2) for x in sc10[::2]][:5] or None, f"on-screen foot contacts of the Sign B crowd after the cha-ching: {len(sc10)} "
             + "(their heads are outside the frame while they scurry off -> none)" if not sc10 else f"on-screen foot contacts after the cha-ching: {len(sc10)}")
    w10 = rv(10, "wing")
    follow("raven_bolt_10", 10, [f for f in w10 if abs(f - B["pct8"]) <= 4], 4, "the raven's wings open as it bolts at the cha-ching")
    fe10 = fxr(10, "feather")
    follow("feather_10", 10, [r_[0] + 2 for r_ in fe10], 6, "the loose feather drifting down past the LED")
    if sh(11):                            # the EVERYONE ELSE chalk crowd: every chalkc* card in the shot
        cc = [r_ for k_, rows in sh(11).get("fx", {}).items() if k_.startswith("chalkc") for r_ in rows if r_[4]]
        if cc:
            setv("bp_crowd_walk_11", {"start": float(min(r_[0] for r_ in cc)), "end": float(max(r_[1] for r_ in cc))},
                 f"the chalk crowd cards are on screen {min(r_[0] for r_ in cc)}-{max(r_[1] for r_ in cc)} ({len(cc)} card runs)")
    for k, sid, kind, off in (("raven_ruffle_1", 1, "ruffle", -1), ("raven_hop_1", 1, "hop", -1), ("raven_4", 4, "hop", -1),
                              ("raven_ruffle_4", 4, "ruffle", -1), ("raven_6", 6, "ruffle", -1),
                              ("raven_land_9", 9, "hop", -1)):
        follow(k, sid, [f + off for f in rv(sid, kind)], 4, f"the raven's on-screen {kind} (cue {abs(off)} f before its first moving frame)" if off else
               f"the raven's on-screen {kind}")
    # ---- every shot: the other on-screen raven hops / ruffles (cast.ts raven() idle life + scripted moves) get soft sounds
    claimed = [f for k in RAVEN_KEYS for f in _frames(D.get(k))]
    hits = [B[k] for k in HIT_BEATS if k in B]
    auto = []
    for sid_s, Fs in F.items():
        sid = int(sid_s)
        a0, b0 = T.SHOTS[sid]["a"], T.SHOTS[sid]["b"]
        cand = []
        for rv in Fs.get("ravens", []):
            for kind in ("hop", "ruffle"):
                for a, b, pk, x, y, on, px in rv.get(kind, []):
                    if not on or px < 90 or not (60 <= y <= 1700) or not (a0 <= a < b0):
                        continue
                    if a < 9 or b > T.TOTAL - 12:                     # never at the loop seam (wind only there)
                        continue
                    if any(a - 4 <= c <= b + 2 for c in claimed) or any(a - 12 < h < b + 12 for h in hits):
                        continue
                    cand.append([int(a), int(b), kind, sid, int(x), int(px)])
        cand.sort(key=lambda c: -c[5])
        auto += sorted(cand[:RAVEN_AUTO_MAX])
    setv("raven_auto", sorted(auto) or None, f"{len(auto)} on-screen raven moves without a scripted cue: "
         + ", ".join(f"{k} {a}-{b} (shot {s_})" for a, b, k, s_, _, _ in sorted(auto)))


def _bw(key, t):
    """weight of ambience bed `key` at a few narration times (cheap: only those samples)"""
    t = np.atleast_1d(np.asarray(t, float))
    w = T.bed_weights(t).get(key)
    return np.zeros(len(t)) if w is None else np.asarray(w)


def _frames(v):
    if v is None:
        return []
    return [float(x) for x in (v if isinstance(v, (list, tuple)) else [v])]


# ================================================================ beds
# round 5 (A4 P1): every bed and life layer is laid on the NARRATION clock through T.shot_weights() (the LEAD's warp fix
# in timeline.py), so each one switches inside +-4 f of the video dissolves; the blueprint gets its own quiet bed.
BED_LEVEL = {"th_noon": -27.0, "vista": -25.5, "morning": -29.0, "tt_noon": -27.5, "sunset": -28.5, "dusk": -27.5,
             "classroom": -34.0, "storeroom": -31.5, "blueprint": -40.0}
BED_DESC = {
    "th_noon": "noon desert wind at the trailhead: gusts, the wind singing in the sign posts, blowing sand, sagebrush (loops seamlessly)",
    "vista": "open badlands wind: bigger gusts, sand hiss, a dry-grass hiss riding the gusts, dry brush, a dust devil swirling far off",
    "morning": "calm early-morning air, light breeze in the brush, a canyon wren's falling song, a few bird chips",
    "tt_noon": "noon wind at the three trail heads (gusty, a little sign whistle; a +4 dB gust swell blows the big tumbleweed through)",
    "sunset": "evening breeze, the first crickets",
    "dusk": "blue-hour crickets and a cool low wind",
    "classroom": "classroom room tone, faint birds outside the windows (the wall clock ticks with its second hand: class_clock)",
    "storeroom": "night storeroom: room air, the desk lamp's filament hum (120 Hz + a faint 3 kHz sing), the floor lantern's soft hiss, "
                 "crickets through the night window, the wind moaning at the glass on the gusts",
    "blueprint": "the blueprint space: a soft cool room tone + a paper-grid shimmer that swells while each line draws itself",
}


def _gust(n, t0, scale=1.0, bias=0.0):
    t = t0 + np.arange(n) / SR
    return np.clip(T.gust(t) * scale + bias, 0.05, 1.5)


def _mixdown(parts):
    """[(stereo x, rel dB)] -> sum, each part at its integrated loudness rel dB (relative balance inside one bed)"""
    out = None
    for x, db in parts:
        x = st(x) if np.ndim(x) == 1 else x
        L = integrated(x)
        y = x * dbg(db - L) if np.isfinite(L) else x
        out = y if out is None else out + y
    return out


_PE = {}


def _pe():
    if not _PE:
        _PE.update(picture_events()[0])
    return _PE


def _windows_env(n, t0, wins, ramp_s=0.06):
    """per-sample 0..1 envelope over [(a_s, b_s)] windows (narration seconds), raised-cosine ramps"""
    t = t0 + np.arange(n) / SR
    e = np.zeros(n)
    for a, b in wins:
        u = np.clip(np.minimum((t - (a - ramp_s)) / ramp_s, ((b + ramp_s) - t) / ramp_s), 0, 1)
        e = np.maximum(e, 0.5 - 0.5 * np.cos(np.pi * u))
    return e


def bed_signal(key, t0, t1, r):
    """raw (unnormalized) stereo bed over [t0, t1)"""
    n = ns(t1 - t0)
    if key == "th_noon":
        return G.desert_wind(n, r, _gust(n, t0), 1.0, 0.32, 0.22, 0.26, 0.18)
    if key == "vista":
        gv = _gust(n, t0, 1.12, 0.04)
        x = G.desert_wind(n, r, gv, 1.0, 0.12, 0.32, 0.22, 0.2, (520, 820), 1.08)
        # A4 ADD: the dry grass on the badlands hisses on the gusts (shared gust curve)
        gh = np.stack([hp(colored(n, r, 0.1), 3200, 2), hp(colored(n, r, 0.1), 3200, 2)]) * np.clip(gv - 0.45, 0, None) ** 2.2 * 0.5
        x = x + gh * (np.std(x) / (np.std(gh) + 1e-12)) * 0.22
        # a dust devil far off: a slow swirling band of sand noise drifting across the stereo field
        dd = G.whoosh(min(2.6, (t1 - t0) * 0.8), r, min(1.4, (t1 - t0) * 0.45), 700, 3200, 0.6, 0.8, 0.35)
        ph = np.linspace(-0.6, 0.6, len(dd))
        sw = np.stack([dd * np.cos((ph + 1) * np.pi / 4), dd * np.sin((ph + 1) * np.pi / 4)]) * 0.08
        place(x, sw, 0.2)
        return x
    if key == "morning":
        x = G.desert_wind(n, r, _gust(n, t0, 0.5, -0.05), 0.75, 0.0, 0.08, 0.22, 0.12, bright=0.9)
        tm = 0.6
        while tm < (t1 - t0) - 2.4:
            place(x, pan(G.canyon_wren(r) * 0.05, r.uniform(-0.7, 0.7)), tm)
            tm += r.uniform(4.0, 6.5)
        tm = 0.3
        while tm < (t1 - t0) - 0.3:
            place(x, pan(G.bird_chip(r) * 0.03, r.uniform(-0.8, 0.8)), tm)
            tm += r.exponential(1.3) + 0.25
        return x
    if key == "tt_noon":
        return G.desert_wind(n, r, _gust(n, t0, 1.0), 1.0, 0.2, 0.22, 0.26, 0.18, (700, 1050))
    if key == "sunset":
        x = G.desert_wind(n, r, _gust(n, t0, 0.6, -0.05), 0.8, 0.08, 0.1, 0.2, 0.12, bright=0.85)
        x += widen(G.crickets(t1 - t0, r, 2) * 0.004, r, 9, 1.0)
        return x
    if key == "dusk":
        x = G.desert_wind(n, r, _gust(n, t0, 0.5, -0.05), 0.6, 0.0, 0.05, 0.15, 0.1, bright=0.8)
        x += widen(G.crickets(t1 - t0, r, 4, 4300, 5000) * 0.012, r, 9, 1.0)
        return x
    if key == "classroom":
        x = G.room_tone(n, r, 0.0, 1.0)
        tm = 0.5
        while tm < (t1 - t0) - 0.3:
            place(x, pan(lp(G.bird_chip(r), 3500) * 0.012, -0.7), tm)
            tm += r.exponential(1.4) + 0.4
        return x
    if key == "storeroom":
        # A4 P3 / ADD: the room was acoustically empty - now its own sources (the lamp pool, the floor lantern, the night
        # window with crickets + wind at the glass), each at its own balance inside the bed
        air = G.room_tone(n, r, 0.0, 0.8)
        lamp = pan(G.lamp_hum(n, r), 0.3)
        lant = pan(G.lantern_hiss(n, r), -0.55)
        cr = widen(lp(G.crickets(t1 - t0, r, 3, 4300, 5000), 6500, 1), r, 9, 1.0)
        cr = np.stack([cr[0] * 1.15, cr[1] * 0.85])                         # the window is screen-left of the desk
        ww = lp(G.desert_wind(n, r, _gust(n, t0, 0.8), 0.6, 0.7, 0.0, 0.0, 0.25, (380, 640)), 1500, 2)
        return _mixdown([(air, 0.0), (lamp, -5.0), (lant, -7.0), (cr, -8.0), (ww, -3.0)])   # crickets muffled by the glass
    if key == "blueprint":
        # A4 ADD: the abstract diagram space gets its own quiet texture: a cool, soft room tone + a paper-grid shimmer
        # that swells while each line draws itself (bp_path / bp_rule / bp_crowd / the circle)
        PE = _pe()
        wins = []
        for k, dur in (("bp_path_11", 13), ("bp_circle_11", 12), ("bp_rule_11", 18), ("bp_crowd_11", 19)):
            if PE.get(k) is not None:
                wins.append((T.fr(float(PE[k])), T.fr(float(PE[k]) + dur)))
        tone = lp(G.room_tone(n, r, 0.0, 1.0), 900, 2)
        sh = G.grid_shimmer(n, r, 0.15 + 0.85 * _windows_env(n, t0, wins, 0.12))      # a faint floor, swelling while lines draw
        shs = widen(sh, r, 7, 1.0)
        return _mixdown([(tone, 0.0), (shs, +3.0)]) if np.any(sh) else tone
    raise KeyError(key)


def bed_mod_db(key, t):
    """per-bed gain automation (dB) at narration times t, keyed to picture frames / words:
    A4 ADD whisper intimacy (the noon wind dips -4 dB under 'We'd better get ours now.', back up over 'now.'),
    A4 ADD the mystery relight swell (+3 dB rising over shot 6's noon -> late relight), A4 P1 the shot-10 gust (+4 dB over
    the big foreground tumbleweed's pass)"""
    g = np.zeros_like(t)
    PE = _pe()
    if key in ("th_noon", "th_life"):
        try:
            a = float(T.word("we", T.bt("whisper") - 0.3)["s"])
            nw = T.word("now", a)
            dip = -4.0 if key == "th_noon" else -6.0
            g += np.interp(t, [a - 0.25, a, float(nw["s"]), float(nw["e"]) + 0.1], [0, dip, dip, 0], left=0, right=0)
        except KeyError:
            pass
    if key in ("th_noon", "th_life", "th_cicada"):
        # A5 P3 (loop seam): the noon wind comes up +3 dB over the 15 -> 16 dissolve so only wind crosses into frame 0, and
        # starts frame 0 at the same +3 dB, settling over the first 0.6 s (the gain is continuous across the loop point)
        s16 = T.SHOTS.get(T.LAST)
        if s16 and T.SHOTS[T.LAST]["set"] == "trailhead":
            x16 = int(s16.get("xfade") or 0)
            u0, u1 = T.fr(s16["a"] - x16 // 2), T.fr(s16["a"] - x16 // 2 + x16)
            up = 3.0 if key == "th_noon" else 1.5
            g += np.interp(t, [u0, u1], [0.0, up], left=0.0, right=up)
            g += np.interp(t, [0.0, 0.6], [up, 0.0], left=up, right=0.0)
    if key == "th_noon" and PE.get("relight_6"):
        rl = PE["relight_6"]
        f0, d = float(rl["f"]), float(rl["dur"])
        s7 = T.SHOTS[7]["a"]
        g += np.interp(t, [T.fr(f0), T.fr(f0 + d), T.fr(s7 + 4), T.fr(s7 + 12)], [0, 3.0, 3.0, 0], left=0, right=0)
    if key == "tt_noon":
        for k in sorted(k for k in PE if k.startswith("tumble_")):
            sp = PE.get(k)
            if not sp or float(sp.get("r_px", 0)) < 250 or T.SHOTS.get(int(re.sub(r"\D", "", k) or 0), {}).get("set") != "trails":
                continue
            on0, on1 = [float(v) for v in sp["on"]]
            g += np.interp(t, [T.fr(on0 - 10), T.fr(on0 + 2), T.fr(on1 - 2), T.fr(on1 + 12)], [0, 4.0, 4.0, 0], left=0, right=0)
    return g


def render_beds(v_ref, seed=1940):
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
        if k == "th_noon":
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
        out[:, a:z] += x
        spans = []
        on = np.flatnonzero(np.diff(np.concatenate([[0], (w > 0.5).astype(int), [0]])))
        for i0, i1 in zip(on[::2], on[1::2]):
            spans.append((i0 / SR, i1 / SR))
        rows.append((k, BED_LEVEL[k], spans, BED_DESC[k]))
    out += render_life(v_ref, W, rows, seed)
    return out, rows


# ================================================================ park life layers, clocks, the LED boxes' hum
LIFE = {  # layer: (parent bed whose weight it rides, level LU vs the voice, description)
    "th_life": ("th_noon", -40.0, "trailhead life under the wind: faint adult chatter from the kiosk / parking lot, two far car doors "
                "(each in a word gap under the trailhead), the flagpole halyard clinking on the strong gusts of the shared gust curve and "
                "the flag fabric snapping on the strongest (> 0.8), all in word gaps; loops seamlessly with the wind; -6 dB under the whisper"),
    "th_cicada": ("th_noon", -44.0, "Arizona noon: a far pulsing cicada drone (4.3-5.9 kHz) swelling in and out (loops with the wind)"),
    "vista_life": ("vista", -41.0, "vista: faint tourist chatter drifting along the paved trail"),
    "tt_life": ("tt_noon", -43.0, "faint chatter of the tourists along the three trails"),
    "tt_cicada": ("tt_noon", -46.0, "the noon cicadas again, farther off, at the trail heads"),
}
TICKS = {  # wall clocks that tick with their on-screen second hands: sets_int.ts snaps them on integer t = f / 30 (picture)
    "class_clock": ("classroom", -36.0, 0.45, "the classroom wall clock (10:10), ticking with its red second hand (picture f = 30k)"),
    "store_clock": ("storeroom", -36.0, 0.05, "the storeroom wall clock (11:40), ticking with its second hand (picture f = 30k)"),
}
CAR_DOOR_AT = [("paperclip", 20), ("your", -3)]   # near these picture frames (beat + f): each door goes into the nearest word gap
KEEP_CLEAR = [(T.bt("honest") - 0.6, T.bt("honest") + 0.6),   # no park-life detail near the lone woodblock tick on 'honest'
              (T.bt("whisper") - 0.3, T.bt("nowEnd") + 0.45)]           # ... nor under / right after the whisper (the plonk + sweat plip)
LED_LEVEL = -35.0                   # LU vs the voice at 0 dB (shot 10); the shot offsets come from picture_events 'led_hum'


def _full_gaps(w, min_gap):
    """word gaps (>= min_gap s) that lie entirely where the parent bed is at full weight"""
    out = []
    for a, b in T.gaps(min_gap):
        if b <= a or b > T.DUR - 0.5:
            continue
        i0, i1 = ns(a), min(N - 1, ns(b))
        if w[i0] > 0.999 and w[i1] > 0.999 and w[(i0 + i1) // 2] > 0.999:
            out.append((a, b))
    return out


def _nearest_gap(gs, t, win=2.0, used=()):
    best = None
    for a, b in gs:
        if any(a <= u <= b for u in used):
            continue
        d = abs(0.5 * (a + b) - t)
        if d <= win and (best is None or d < best[0]):
            best = (d, a, b)
    return None if best is None else (best[1], best[2])


def render_life(v_ref, W, rows, seed):
    out = np.zeros((2, N))
    gust_t = np.arange(0.0, T.DUR, 0.01)
    gg = T.gust(gust_t)
    peaks = [(gust_t[i], gg[i]) for i in range(1, len(gust_t) - 1) if gg[i] >= gg[i - 1] and gg[i] > gg[i + 1]]
    for k, (parent, lvl, desc) in LIFE.items():
        w = W.get(parent)
        if w is None or not np.any(w > 1e-4):
            continue
        r = rng(seed + 7 + sum(map(ord, k)))
        loop = parent == "th_noon"
        if loop:                                    # the same seamless fold as the wind it lives under
            L = ns(1.0)
            raw = G.crowd_murmur(N + L, r, 6, 170, 1100, 0.9) if k == "th_life" else G.cicada_drone(N + L, r)
            x = G.loop_xfade(raw, N, L)
            a, z = 0, N
        else:
            act = np.flatnonzero(w > 1e-4)
            a, z = max(0, act[0] - ns(0.05)), min(N, act[-1] + ns(0.05))
            x = G.crowd_murmur(z - a, r, 5, 180, 1000, 0.8) if "life" in k else G.cicada_drone(z - a, r, 2, 4600, 6200)
        full = w[a:z] > 0.999
        ref = integrated(x[:, full]) if full.sum() > ns(0.5) else integrated(x)
        x = x * dbg(v_ref + lvl - ref)
        notes = []
        if k == "th_life":
            gs = _full_gaps(w, 0.15)
            used = []
            for bt_, df in CAR_DOOR_AT:                # far car doors in word gaps (A4 P1: the old 3.25 / 9.22 s landed in words)
                if bt_ not in T.BEAT:
                    continue
                g_ = _nearest_gap(gs, T.bt(bt_, df), 2.5, used)
                if not g_:
                    continue
                td = g_[0] + 0.03
                used.append(td)
                c = G.car_door(r, 1.2)
                c = c * dbg(v_ref + lvl + 6.0 - momentary_max(c))
                place(x, pan(c, 0.6 if len(used) == 1 else -0.55), td)
                notes.append(f"car door {td:.2f}")
            # the flagpole halyard on the strong gusts (> 0.76) and the flag fabric on the strongest (> 0.8): moved into
            # the nearest word gap (A4 P1: 1.85 / 9.66 s were inside words)
            gs2 = _full_gaps(w, 0.12)
            for tp_, gv in peaks:
                if gv <= 0.76 or not (0.6 < tp_ < T.DUR - 0.9) or any(a_ <= tp_ <= b_ for a_, b_ in KEEP_CLEAR):
                    continue
                g_ = _nearest_gap(gs2, tp_, 1.3, used)
                if not g_ or any(a_ - 0.1 <= g_[0] <= b_ for a_, b_ in KEEP_CLEAR):
                    continue
                tc = g_[0] + 0.02
                used.append(tc)
                for j in range(int(r.integers(2, 4))):
                    c = G.clink(r, r.uniform(2300, 3300), 0.18, 0.7)
                    c = lp(c, 5200, 1) * dbg(v_ref + lvl + 2.0 - j * 2.5 - momentary_max(c))
                    place(x, pan(c, -0.35), tc)
                    tc += r.uniform(0.22, 0.55)
                notes.append(f"halyard {g_[0] + 0.02:.2f}")
                if gv > 0.8:
                    s = G.flag_snap(r)
                    s = lp(s, 6000, 1) * dbg(v_ref + lvl + 3.0 - momentary_max(s))
                    place(x, pan(s, -0.4), g_[0] + 0.04)
                    notes.append(f"flag snap {g_[0] + 0.04:.2f}")
        tt_ = np.arange(a, z) / SR
        md = bed_mod_db(k, tt_)
        out[:, a:z] += x * w[None, a:z] * dbg(md)[None, :]
        on = np.flatnonzero(np.diff(np.concatenate([[0], (w > 0.5).astype(int), [0]])))
        rows.append((k, lvl, [(i0 / SR, i1 / SR) for i0, i1 in zip(on[::2], on[1::2])], desc + (f" [{', '.join(notes)}]" if notes else "")))
    # the wall clocks: one tick per picture second (sets_int.ts: the second hand snaps on integer t = f / FPS)
    for k, (parent, lvl, pn_, desc) in TICKS.items():
        w = W.get(parent)
        if w is None or not np.any(w > 1e-4):
            continue
        r = rng(seed + 31 + sum(map(ord, k)))
        x = np.zeros((2, N))
        cnt = 0
        for fk in range(0, T.TOTAL + 1, T.FPS):
            tk = T.fr(fk)
            if not (0.05 < tk < T.DUR - 0.2) or w[min(N - 1, ns(tk))] < 0.02:
                continue
            c = G.clock_tick(r, cnt % 2 == 1)
            c = lp(c, 7000, 1) * dbg(v_ref + lvl - momentary_max(c))
            place(x, pan(c, pn_), tk)
            cnt += 1
        out += x * w[None, :]
        on = np.flatnonzero(np.diff(np.concatenate([[0], (w > 0.5).astype(int), [0]])))
        rows.append((k, lvl, [(i0 / SR, i1 / SR) for i0, i1 in zip(on[::2], on[1::2])], desc + f" [{cnt} ticks]"))
    # the LED 'PIECES MISSING' boxes: a faint driver buzz while one is in frame (equal-power over the dissolves)
    PE = _pe()
    spec = PE.get("led_hum")
    if spec:
        tc = np.arange(int(T.DUR * 1000) + 2) / 1000.0          # weights at a 1 kHz control rate (memory), then interpolated
        sw = T.shot_weights(tc)
        gc = np.zeros(len(tc))
        for sid, db in spec.items():
            if int(sid) not in sw:
                continue
            if isinstance(db, (list, tuple)):                    # [dB, from picture frame]: only from that frame on (4 f ramp)
                db, f_on = float(db[0]), float(db[1])
                gc += sw[int(sid)] * dbg(db) * np.interp(tc, [T.fr(f_on - 2), T.fr(f_on + 2)], [0.0, 1.0])
            else:
                gc += sw[int(sid)] * dbg(float(db))
        g = np.interp(np.arange(N) / SR, tc, gc)
        if np.any(g > 1e-4):
            act = np.flatnonzero(g > 1e-4)
            a, z = max(0, act[0] - ns(0.05)), min(N, act[-1] + ns(0.05))
            r = rng(seed + 977)
            h = G.led_hum(z - a, r)
            h = np.stack([h * 0.95, h * 1.05])             # a narrow, near-centre source
            full = g[a:z] > 0.999
            ref = integrated(h[:, full]) if full.sum() > ns(0.5) else integrated(h)
            out[:, a:z] += h * dbg(v_ref + LED_LEVEL - ref) * np.sin(0.5 * np.pi * np.clip(g[a:z], 0, 1))[None, :]
            on = np.flatnonzero(np.diff(np.concatenate([[0], (g > 0.3).astype(int), [0]])))
            rows.append(("led_hum", LED_LEVEL, [(i0 / SR, i1 / SR) for i0, i1 in zip(on[::2], on[1::2])],
                         "the LED 'PIECES MISSING' boxes: a faint rectifier buzz + multiplex whine while one is in frame (shot 10 at 0 dB, "
                         + ", ".join(f"shot {k} {(v if not isinstance(v, (list, tuple)) else v[0]):+.0f} dB" for k, v in spec.items() if int(k) != 10) + ")"))
    return out


# ================================================================ the stamp's mid-band carve (A1 P2)
def carve_mid(x, lo=600.0, hi=4000.0, depth_db=-7.0, hold=0.15, back=0.38, anchor=0.0):
    """split x into low / mid / high (complementary, perfect reconstruction) and dip the mid band by depth_db for `hold` s
    after `anchor`, recovering to 0 dB by `back` s: the slam keeps its sub thump and its click but leaves the 0.6-4 kHz
    band to the first syllable of the word it lands on"""
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    n = x.shape[-1]
    t = np.arange(n) / SR - anchor
    g_db = np.interp(t, [0.0, 0.004, hold, back], [0.0, depth_db, depth_db, 0.0])
    g_db[t < 0] = 0.0
    return low + midb * dbg(g_db) + high


def carve_span(x, t0, a, b, lo=600.0, hi=4000.0, depth_db=-7.0, ramp=0.02, broad_db=0.0):
    """A5 P2: dip the lo..hi band of an event (placed at narration time t0) by depth_db over the absolute window [a, b]
    (e.g. the word it lands on), ramped; broad_db is an extra broadband trim over the same window. The low thump and the
    sparkle above hi stay."""
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    n = x.shape[-1]
    t = t0 + np.arange(n) / SR
    u = np.clip(np.minimum((t - (a - ramp)) / ramp, ((b + ramp) - t) / ramp), 0, 1)
    return (low + high) * dbg(broad_db * u) + midb * dbg((depth_db + broad_db) * u)


_WCARVE = {"pocket_pat": -6.0, "whistle_soft": -6.0, "mail_flap": -6.0, "chip_place": -6.0, "thief_pops": -6.0, "label_tok": -6.0,
           "pocket": -5.0, "chip_pick": -4.0, "chip_back": -4.0, "scoop": -4.0, "shutter": -5.0, "shutter_far": -4.0, "envelope_slap": -4.0,
           "chalk_line": -3.0, "hand_pocket": -5.0, "dust_puff": -4.0, "raven_ruffle": -4.0, "raven_hop": -4.0}
# A5 P2 (masking): the small on-screen actions that land ON words (the worst 1-4 kHz margins of the A5 mix: 'little' 4.9 dB
# under the pocket pats, 'then' 6.1 under the mail flap, 'hid' 6.6 under the chip thud, 'does.' 7.0 under the thief pops,
# 'rules.' 7.1 under the label tok, 'removed' 8.2 under reader B's pocket ...): their 1-4 kHz band dips this much more while
# a word is spoken (on top of mix.py's -5 dB speech-band duck); attacks in a word gap keep their full band


def carve_words(x, t0, depth_db, lo=1000.0, hi=4000.0, pre=0.02, post=0.04):
    """dip the lo..hi band of an event placed at narration time t0 while words are spoken (smoothed 15 ms edges)"""
    n = x.shape[-1]
    t = t0 + np.arange(n) / SR
    e = np.zeros(n)
    for w in T.WORDS:
        a, b = float(w["s"]) - pre, float(w["e"]) + post
        if b < t0 or a > t[-1]:
            continue
        e[(t >= a) & (t <= b)] = 1.0
    if not np.any(e):
        return x
    k = max(1, ns(0.015))
    e = np.convolve(e, np.ones(k) / k, mode="same")
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    return low + high + midb * dbg(depth_db * e)


def pic_of(t):
    """narration seconds (array) -> picture frames (old clock), vectorized T.sec_to_old"""
    t = np.asarray(t, float)
    if T.WARP is None:
        return t * T.FPS
    return np.interp(t * T.FPS, np.arange(len(T.WARP), dtype=float), T.WARP)


def dfr(f1, f0):
    """A5: a picture-frame DIFFERENCE in narration seconds (through the voice time-map, never (f1 - f0) * FR)"""
    return T.fr(f1) - T.fr(f0)


def _word_span(text, after_beat):
    try:
        w = T.word(text, T.bt(after_beat) - 0.3)
        return float(w["s"]), float(w["e"])
    except KeyError:
        return None


# ================================================================ events
def cues():
    C = []
    R = rng(2006)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    PE, _ = picture_events()
    fr = T.fr  # picture frame -> narration seconds (voice time-map aware)
    one = lambda g: (lambda r=rr(): (g(r), 0.0))

    def ev(name, f, cue, desc, gen, level, **kw):
        if f is None:
            return
        add(Cue(fr(f), cue, desc, gen, level, pe=name, **kw))

    # ---------------- 1 HOOK
    if PE.get("bubble_reveal"):                  # A5 P2: the camera tilt reveals it full-size: no pop, a soft reveal shimmer
        ev("bubble_in", PE["bubble_in"], "bubble_reveal", "the thought bubble (paperclip handed back) comes into view in the camera tilt: a soft airy reveal shimmer",
           one(G.reveal_shimmer), -21, p=-0.1, send=0.1)
    else:
        ev("bubble_in", PE["bubble_in"], "bubble_pop", "thought bubble pops in (paperclip handed back to the clerk)",
           one(lambda r: G.pop(r, 430, True)), -17.5, p=-0.1)
    ev("bubble_out", PE["bubble_out"], "bubble_out", "thought bubble shrinks away (2 f shrink)",
       one(lambda r: G.pop(r, 520, False, 0.09)), -21, p=-0.1)
    # the dive (story.ts dive1) starts at DIVE0 = 126; its image motion (preview2 frame diff) jumps 4.7 -> 15 -> 28 at
    # 126-128, peaks 38-39 at 130-133 (the look swings onto the rock) and settles ~20 through the dissolve: the whoosh
    # starts 1 f before the move, peaks ~7 f in (in the 'steal.' -> 'Arizona's' gap) and tails off into the vista
    # A5 P2: 'steal.' (the hook's payoff) had a 3.3 dB 1-4 kHz margin: both hits keep their attack and their sparkle above
    # 4 kHz, but their 0.6-4 kHz band dips 7 dB over the word, and the whoosh is a further 3 dB down until the word ends
    stw = _word_span("steal", "wanted")
    ws_ = (lambda f, extra=0.0: (lambda x: carve_span(x, fr(f), min(stw[0], fr(f) + 0.012), stw[1] + 0.02, depth_db=-7.0, broad_db=extra))) if stw else (lambda f, extra=0.0: None)
    if PE["snap_push"] is not None:
        ev("snap_push", PE["snap_push"], "snap_whoosh", "the camera dives past her into the glinting rock (fly-through into the vista): rises with the dive, peaks at its fastest frames (~132); "
           "-7 dB 0.6-4 kHz and -3 dB overall while 'steal.' is spoken",
           lambda r=rr(): (G.whoosh(0.62, r, 0.24, 380, 2600, 0.8, 0.2, 0.2), 0.0), -21, p=0.2, send=0.05, post=ws_(PE["snap_push"], -3.0))
    if PE["glint"] is not None:
        ev("glint", PE["glint"], "glint_ding", "the rainbow rock glints: magic ding A6 + twinkle (4-point star sparkle, ON its first frame); its 0.6-4 kHz band dips 7 dB under 'steal.'",
           one(lambda r: G.ding(r, 1760.0, 0.42, 1.0)), -15, p=0.3, send=0.12, post=ws_(PE["glint"]))
    for f in _frames(PE["raven_hop_1"]):
        ev("raven_hop_1", f, "raven_hop", "the raven hops on the board's top rail (a soft wing flick)",
           one(lambda r: G.wing_ruffle(r, 1, 0.06, 0.05, 1.1)), -32, p=0.35, lpf=7500, send=0.1)
    for f in _frames(PE["raven_ruffle_1"]):
        ev("raven_ruffle_1", f, "raven_ruffle", "the raven on the board shakes out its wings (soft feather flutter)",
           one(lambda r: G.wing_ruffle(r, 3, 0.05, 0.035)), -29, p=0.35, lpf=7000, send=0.1)

    # ---------------- 2 VISTA
    ev("vista_flash", PE["vista_flash"], "shutter_far", "a tourist by the big log takes a photo (white flash): distant shutter",
       one(G.shutter), -27, p=-0.35, lpf=6000, send=0.15)
    # A4 ADD: the two ravens circling high over the vista give ONE far, reverberant 'kraa' in a word gap (the sign raven
    # stays silent); the slap back off the mesa ~0.33 s later
    if True:
        vg = [(a_, b_) for a_, b_ in T.gaps(0.2) if _bw("vista", [a_, 0.5 * (a_ + b_), b_]).min() > 0.999]
        if vg:
            ta = vg[0][0] + 0.02

            def kraa(r):
                c = G.raven_kraa(r)
                y = np.zeros(len(c) + ns(0.5))
                G._place_mono(y, c, 0.0)
                G._place_mono(y, lp(c, 1400, 2) * 0.22, 0.33)
                return lp(y, 3200, 2), 0.0
            add(Cue(ta, "raven_far", f"one of the two ravens circling high over the badlands calls once, far off ('kraa', in the {vg[0][0]:.2f}-{vg[0][1]:.2f} s gap)",
                    lambda r=rr(): kraa(r), -38, p=0.35, send=0.3, pe="vista (ravens circling, CHAR)"))

    # ---------------- 3 POCKETING
    a3, b3 = T.shot_t(3)
    for k, f in enumerate(_frames(PE["steps_3"])):
        ev("steps_3", f, "gravel_step", "a tourist strolling past behind him on the gritty paving (distant)",
           (lambda r=rr(): (G.gravel_step(r, r.uniform(0.7, 1.0)), 0.0)), -23 - (k % 2), p=-0.55 + 0.3 * k, lpf=6000, group="steps")
    ev("chip_glint_3", PE["chip_glint_3"], "chip_glint", "the chip in his hand catches the sun (tiny ting)",
       one(lambda r: G.tiny_ting(r, 3950.0, 0.1)), -28, p=0.1, send=0.1)
    ev("pocket_3", PE["pocket_3"], "pocket", "he slips the rainbow chip into his hip pocket (rustle + muffled tick as it drops in, +4 f)",
       one(lambda r, f=PE["pocket_3"]: G.chip_pocket(r, dfr(f + 4, f) if f is not None else 4 * FR, 0.4)), -16, p=0.05)
    for f in _frames(PE["pocket_pats_3"]):
        ev("pocket_pats_3", f, "pocket_pat", "two pats on the pocket", one(lambda r: G.cloth_pat(r, 0.8)), -25, p=0.05)
    ev("peek_glint_3", PE["peek_glint_3"], "peek_glint", "a tiny rainbow glint peeks out of the pocket",
       one(lambda r: G.tiny_ting(r, 5270.0, 0.07)), -31, p=0.1, send=0.1)
    ev("shutter_3", PE["shutter_3"], "shutter", "a couple behind him photograph a log (flash): shutter click-clack",
       one(G.shutter), -19, p=-0.5, lpf=7000, send=0.12)
    if PE["whistle_3"] is not None:
        f0 = float(PE["whistle_3"])
        # 'fwee - fwoo': up-glide E6 -> A6, then down A6 -> E6 (both in D dorian), in the 0.24 s gap before "So"; the
        # second note sits under the 5th drawn note (cast.ts B+36) and is out by the 'S' of "So"
        n2 = PE.get("whistle_note2_3")
        dt2 = dfr(float(n2), f0) if n2 is not None else 0.105
        dt2 = float(np.clip(dt2, 0.1, 0.2))
        notes = [(0.0, 0.085, 1318.5, 1760.0), (dt2, 0.075, 1760.0, 1318.5)]
        ev("whistle_3", f0, "whistle", f"he whistles innocently (2 notes, {f0:.0f} + {float(n2) if n2 is not None else f0:.1f}, in the gap after 'pieces.' under the drawn notes)",
           one(lambda r, n=notes: G.whistle(r, n, 0.12)), -22, p=0.05, send=0.12)
    for k, f in enumerate(_frames(PE["whistle_soft_3"])):
        nt = [(0.0, 0.07, 1174.7, 1318.5)] if k % 2 == 0 else [(0.0, 0.07, 1568.0, 1318.5)]
        ev("whistle_soft_3", f, "whistle_soft", "...the whistle already under his breath while he pockets it (a note per drawn note)",
           one(lambda r, n=nt: G.whistle(r, n, 0.16)), -31, p=0.05, lpf=6000, send=0.1)

    # ---------------- 4 THE SIGN: split-flap flips, the strolling couple
    lands = _flap_landings(PE["flip_seqs"], T.BEAT["tons14"])
    hush = PE.get("flip_hush_until")
    if lands:
        f_first = lands[0][0]

        def flap_seq(r, L=lands, f1=f_first, hu=hush):
            y = np.zeros(ns((T.fr(L[-1][0]) - T.fr(f1)) + 0.25))
            for i, (f, last) in enumerate(L):
                lock = i == len(L) - 1
                # A5 P1: light ticks (~-9..-5 dB under the lock) on every visible flip, -6 dB more under 'day...', and ONE heavy
                # lock clack on the '14' (its 70 Hz body + a 60 ms spring rattle inside the same 4 video f: nothing after it)
                g = 1.0 if lock else (0.35 + 0.22 * i / max(1, len(L) - 2)) * (dbg(-6.0) if hu is not None and f < float(hu) else 1.0)
                c = G.flap(r, last=lock)
                if lock:
                    th = _thump(r, 70.0, 0.04) * 0.3
                    sp_ = G.spring_rattle(r) * 0.3
                    cc = np.zeros(max(len(c), len(th), len(sp_) + ns(0.012)))
                    cc[: len(c)] += c
                    cc[: len(th)] += th
                    G._place_mono(cc, sp_, 0.012)
                    c = cc
                G._place_mono(y, c * g, (T.fr(f) - T.fr(f1)))
            return y
        ev("flip_seqs", f_first, "flip_flaps", f"split-flap counter flips '--' -> '14': a light tick as each card visibly turns (mid-flip) at "
           f"{', '.join(f'{f:.1f}' for f, _ in lands[:-1])}, the heavy lock + spring rattle on '14' at {lands[-1][0]:.1f}",
           lambda r=rr(): (flap_seq(r), 0.0), -12, p=-0.15, send=0.05)
    for k, f in enumerate(_frames(PE["stroll_steps_4"])):
        ev("stroll_steps_4", f, "stroll_step", "the tourist couple strolling past behind the sign (light steps)",
           (lambda r=rr(): (G.gravel_step(r, r.uniform(0.6, 0.85), 0.3), 0.0)), -30, p=-0.6 + 0.1 * k, lpf=7000, group="steps4")
    for f in _frames(PE["raven_4"]):
        ev("raven_4", f, "raven_hop", "the raven on the board hops (a soft wing flick + feet on the wood)",
           one(lambda r: G.wing_ruffle(r, 1, 0.06, 0.05, 1.1) + 0.0), -31, p=0.35, lpf=7500, send=0.1)
    for f in _frames(PE["raven_ruffle_4"]):
        ev("raven_ruffle_4", f, "raven_ruffle", "the raven snaps its head to the couple and shakes out its feathers",
           one(lambda r: G.wing_ruffle(r, 2, 0.05, 0.04, 1.0)), -32, p=0.4, lpf=7000, send=0.1)
    if PE["redcap_pocket_4"] is not None:
        ev("redcap_pocket_4", PE["redcap_pocket_4"], "pocket", "behind the sign the red-cap tourist stoops and slips a chip into his pocket (rustle, tick 3 f later)",
           one(lambda r, f=PE["redcap_pocket_4"]: G.chip_pocket(r, dfr(f + 3, f), 0.3, 1)), -29, p=-0.45, lpf=7000, send=0.1)
    for k, f in enumerate(_frames(PE["whistle_4"])):
        nt = [(0.0, 0.075, 1318.5, 1760.0)] if k % 2 == 0 else [(0.0, 0.075, 1760.0, 1318.5)]
        ev("whistle_4", f, "whistle_soft", "...and whistles two innocent notes (a note per drawn note)",
           one(lambda r, n=nt: G.whistle(r, n, 0.14)), -31, p=-0.45, lpf=6000, send=0.12)
    for f in _frames(PE["shutter_4"]):
        ev("shutter_4", f, "shutter_far", "the red-cap tourist behind the sign photographs it (flash on 'vandalized'+18)",
           one(G.shutter), -26, p=-0.45, lpf=6500, send=0.15)

    # ---------------- 5 WHISPER
    ev("lean_5", PE["lean_5"], "lean_rustle", "she leans toward her fiance: soft dress / camera-strap rustle", one(lambda r: G.rustle(r, 0.4, 2, 0.8, centers=[0.07, 0.17])),
       -22, p=-0.1)
    ev("hand_mouth_5", PE["hand_mouth_5"], "sleeve_rustle", "her hand comes up beside her mouth (sleeve swish)",
       one(lambda r: G.rustle(r, 0.25, 1, 1.0, centers=[0.08])), -28, p=-0.1)
    for f in _frames(PE["raven_wing_5"]):
        ev("raven_wing_5", f, "raven_wings", "the raven hops down to the post bracket: two soft wing flaps",
           one(lambda r: G.wing_ruffle(r, 2, 0.07, 0.08)), -27, p=0.4, lpf=8000, send=0.1)
    ev("sweat_5", PE["sweat_5"], "sweat_plip", "the fiance's sweat drop pops on: a tiny 'plip'", one(lambda r: G.drop_plip(r, 760.0)), -25, p=0.2)
    for f in _frames(PE["shutter_5"]):
        ev("shutter_5", f, "shutter_far", "a far tourist behind the couple photographs the logs (blurred flash)",
           one(G.shutter), -31, p=0.05, lpf=5000, send=0.18)

    # ---------------- 6 MYSTERY
    hon = _word_span("honest", "but")
    for f in _frames(PE["raven_6"]):
        near = hon is not None and hon[0] - 0.5 <= fr(f) <= hon[1] + 0.5
        ev("raven_6", f, "raven_ruffle", "the raven on the board top shakes out its feathers" + (" (A5 P3: -15 dB, it lands on the lone woodblock tick of 'honest')" if near else ""),
           one(lambda r: G.wing_ruffle(r, 2, 0.05, 0.04, 1.0)), -46 if near else -31, p=0.3, lpf=7000, send=0.1)

    if PE.get("cricket_6") is not None:
        def far_cricket(r):
            y = G.crickets(0.9, r, 1, 4500, 4700)
            y = y * np.interp(np.arange(len(y)) / SR, [0, 0.1, 0.6, 0.9], [0, 1, 1, 0])
            return lp(y, 6000, 1), 0.0
        ev("cricket_6", PE["cricket_6"], "cricket_far", "as the light turns late afternoon, the first far cricket starts up (time change by ear)",
           lambda r=rr(): far_cricket(r), -42, p=-0.5, send=0.15)

    # ---------------- every shot: the tumbleweeds (audio_probe.mjs -> picture_probe.json)
    def tumble_cue(key):
        spec = PE.get(key)
        if not spec:
            return
        on0, on1 = [float(v) for v in spec["on"]]
        contacts = [float(c) for c in spec.get("contacts", []) if on0 - 2 <= float(c) <= on1 + 2]
        x0, x1 = [float(v) for v in spec.get("x", [0.0, 1080.0])]
        p0, p1 = [float(np.clip((x / 1080.0 - 0.5) * 1.6, -0.9, 0.9)) for x in (x0, x1)]
        r_px = float(spec.get("r_px", 100))
        lvl = float(np.clip(-30.0 + 3.0 * np.log2(max(r_px, 20) / 100.0), -34.0, -26.0 if r_px < 300 else -24.0))   # nearer / bigger -> louder
        big = r_px >= 300

        def gen(r=rr(), a=on0, b=on1, cs=contacts, pa=p0, pb=p1, big=big):
            d = (T.fr(b) - T.fr(a))
            y = G.tumble_roll(r, d, [(T.fr(c) - T.fr(a)) for c in cs])
            if big:                                  # A4 P1: a near foreground pass - the dry brush body rolling, a hop tick on each landing
                n_ = len(y)
                tq = np.arange(n_) / SR
                roll_ = bp(r.standard_normal(n_), 700, 5500, 1) * (0.55 + 0.45 * np.abs(np.sin(np.pi * 3.2 * tq))) * np.sin(np.pi * np.clip(tq / d, 0, 1)) ** 0.8
                y = y + roll_ * (np.std(y) / (np.std(roll_) + 1e-12)) * 0.7
                for c in cs:
                    G._place_mono(y, G.twig_crackle(0.08, r, 400.0) * np.std(y) * 4.0, (T.fr(c) - T.fr(a)))
            th = (np.linspace(pa, pb, len(y)) + 1) * np.pi / 4               # it rolls across the frame: pan follows it
            return np.stack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2), 0.0
        ev(key, on0, "tumbleweed", f"a tumbleweed rolls across the frame ({on0:.0f}-{on1:.0f}, {r_px:.0f} px), twiggy bounces on its hop landings "
           f"{', '.join(f'{c:.0f}' for c in contacts) or '-'}", gen, lvl, lpf=9000, send=0.1)
    for key in sorted(k for k in PE if k.startswith("tumble_")):
        tumble_cue(key)

    # ---------------- 7 THE PROFESSOR: he writes on his clipboard, then taps it after the nod on "tested"
    w7 = _frames(PE["pen_write_7"])
    if len(w7) == 2 and w7[1] > w7[0]:
        ev("pen_write_7", w7[0], "pen_scratch", "the professor writes a note on his clipboard (under 'Her fiance's professor')",
           one(lambda r, d=dfr(w7[1], w7[0]): G.pen_scratch(r, d, 8.5)), -21, p=0.1, group="pen")
    for a_, b_ in (PE.get("pen_more_7") or []):
        ev("pen_more_7", a_, "pen_scratch", f"...he keeps adding tally strokes ({a_:.0f}-{b_:.0f}): a short scratch burst on the visible stroke",
           one(lambda r, d=dfr(float(b_) + 1, float(a_)): G.pen_scratch(r, d, 9.0)), -25, p=0.1, group="pen")
    fl7 = PE.get("fly_7")
    if fl7:
        f0_, fpk, f1_ = float(fl7["start"]), float(fl7["peak"]), float(fl7["end"])

        def fly(r, f0_=f0_, fpk=fpk, f1_=f1_):
            d = fr(f1_ + 4) - fr(f0_)
            pk = fr(fpk) - fr(f0_)
            y = G.whoosh(d, r, pk, 260, 1500, 0.8, 0.06, 0.08)
            n_ = len(y)
            tq = np.arange(n_) / SR
            y = y * np.interp(tq, [0, fr(f1_) - fr(f0_), d], [1, 1, 0])            # a 4 f fade under the 7 -> 8 dissolve
            return lp(y, 2400, 2), 0.0
        ev("fly_7", f0_, "fly_air", "the camera flies INTO the clipboard paper: a soft rising air whoosh, peaking on the fastest frames, fading under the dissolve",
           lambda r=rr(): fly(r), -24, p=0.0, send=0.04)
        # A5 ADD: the clipboard's top sheet flutters as the lens reaches it (the fly peaks 1 f before the dissolve)
        ev("fly_7", fpk - 3, "paper_flutter", "...the clipboard's top sheet flutters in the air of the dive", one(lambda r: G.paper_rustle(r, 0.22, 0.6)), -31, p=0.05, send=0.04)
    for k, f in enumerate(_frames(PE["pen_tap_7"])):
        ev("pen_tap_7", f, "pen_tap", f"...the pen touches the clipboard after his calm nod on 'tested it' (contact {k + 1}: small dry tick)", one(G.pen_tap),
           [-24, -26.5, -29][min(k, 2)], p=0.1, group="pen")
    for f in _frames(PE.get("wren_7")):
        def wren_chirp(r):
            y = np.zeros(ns(0.3))
            for k in range(3):                          # a cactus-wren-ish dry 'chut-chut-chut'
                c = G.bird_chip(r) * (1.0 - 0.2 * k)
                c = c + 0.5 * bp(r.standard_normal(len(c)), 2500, 6000, 1) * np.abs(c)
                G._place_mono(y, c, 0.065 * k)
            return lp(y, 7000, 1), 0.0
        ev("wren_7", f, "wren_chirp", "the canyon wren on the CRYSTAL plate chirps as it hops (faint, dry 'chut-chut-chut')",
           lambda r=rr(): wren_chirp(r), -36, p=-0.2, send=0.12)

    # ---------------- 8 THE TEAM
    thuds = _frames(PE.get("chip_thud_8"))
    for k, f in enumerate(_frames(PE["chip_set_8"])):
        heavy = any(abs(f - t_) < 0.6 for t_ in thuds)
        ev("chip_set_8", f, "chip_place", f"marked chip {k + 1} set down on the trail" + (" (a dull thud + the dust puff)" if heavy else " (a light stone tick)"),
           one(lambda r, h=heavy: G.chip_place(r) + 0.0) if not heavy else one(lambda r: body(G.chip_place(r), 3.0)), -17 if heavy else -21,
           p=-0.2 + 0.35 * k, group="chips")
        if heavy:
            ev("chip_set_8", f + 0.5, "dust_puff", "...a small dust puff off the trail", one(lambda r: G.dust_puff(r, 0.18)), -31, p=-0.2 + 0.35 * k, group="chips")
    ev("dot_dab_8", PE["dot_dab_8"], "paint_dab", "the white paint dot dabbed on the chip", one(G.brush_dab), -26, p=-0.15)
    ev("stopwatch_8", PE["stopwatch_8"], "stopwatch", "the assistant clicks the stopwatch (2:00:00): crown click + release", one(G.stopwatch), -13, p=0.25)
    ev("panel_unhook_8", PE["panel_unhook_8"], "panel_lift", "the old panel is lifted off the Sign A hooks (knock + wood scrape)", one(G.panel_lift), -15,
       p=-0.1, group="swap")
    ev("panel_lean_8", PE["panel_lean_8"], "panel_lean", "...and leaned against the post (soft wooden knock)",
       one(lambda r: G.wood_knock(r, 230, 0.04, 0.5)), -21, p=-0.3, group="swap")
    ev("panel_lean_8", PE["panel_lean_8"], "sand_scrape", "...its foot scrapes the sandy ground as it settles (A5 ADD)",
       one(lambda r: G.gravel_scuff(r, 0.16, 0.5)), -29, p=-0.3, lpf=8000, group="swap")
    ev("panel_hang_8", PE["panel_hang_8"], "panel_set", "the new panel swings onto the post (wooden clack + a tiny wobble rattle; A4 P3: -3 dB, its 0.6-4 kHz "
       "band dips 6 dB for 150 ms: it lands inside 'signs.')",
       one(lambda r: G.wood_knock(r, 180, 0.07, 1.0)), -16.5, p=-0.1, group="swap", post=lambda x: carve_mid(x, depth_db=-6.0, back=0.3))
    ev("dust_off_8", PE["dust_off_8"], "dust_off", "he dusts off his hands", one(lambda r: G.hand_dust(r, 2)), -27, p=0.35)
    ev("asst3_turn_8", PE.get("asst3_turn_8"), "turn_scuff", "...and turns to walk off right (one soft gravel scuff)", one(lambda r: G.gravel_scuff(r, 0.18, 0.6)),
       -31, p=0.45, lpf=7000)
    w8 = PE.get("whip_8")
    if w8:
        # A5 P3: the whip is a light WIND GUST + sand hiss across the pan (no tonal whoosh), ending 2 f after it lands
        def whip(r, a=float(w8["start"]), pk=float(w8["peak"])):
            d = fr(pk + 8) - fr(a)
            return lp(G.sand_gust(r, max(0.15, d), max(0.05, fr(pk) - fr(a)), 0.6), 9000, 1), 0.0
        ev("whip_8", w8["start"], "whip_gust", "the whip pan left to the trail heads (hidden cut inside the blur): a light wind gust + blowing-sand hiss, "
           "peaking at the cut, gone 2 f after the landing on 'the trails'", lambda r=rr(): whip(r), -27, p=-0.3, send=0.03)

    # ---------------- 9 THE TWO SIGNS (no longer silent)
    for k, f in enumerate(_frames(PE["asst_steps_9"])):
        ev("asst_steps_9", f, "walk_off_step", "the assistant walks off right with the old panel", (lambda r=rr(): (G.gravel_step(r, 0.85, 0.5), 0.0)),
           -26 - 1.5 * k, p=0.25 + 0.25 * k, lpf=7500, group="steps9")
    for k, f in enumerate(_frames(PE["readerA_steps_9"])):
        ev("readerA_steps_9", f, "reader_step", "reader A steps off after his nod", (lambda r=rr(): (G.gravel_step(r, 0.7, 0.5), 0.0)),
           -28 - k, p=-0.35 - 0.2 * k, lpf=7000, group="steps9")
    wa = _frames(PE["readerA_walk_9"])
    for k, f in enumerate(wa):
        # he crosses the frame left -> right in front of both signs (x 235 px at 951 -> 894 at 1003, out at ~1012)
        u = k / max(1, len(wa) - 1)
        ev("readerA_walk_9", f, "reader_step", "reader A strolls off from Sign A past Sign B (sneakers on the gritty paving, a foot every 0.5 m)",
           (lambda r=rr(): (G.gravel_step(r, r.uniform(0.6, 0.8), 0.45), 0.0)), -28.5 - (3.0 if k == len(wa) - 1 else 0.0) - (k % 2) * 0.7,
           p=float(np.clip(-0.45 + 1.3 * u, -0.6, 0.85)), lpf=7000, group="steps9")
    ev("truck_air_9", PE["truck_air_9"], "truck_air", "a breath of breeze as the camera trucks from Sign A to Sign B (not a dissolve whoosh)",
       lambda r=rr(): (G.air_swish(r, 0.6), 0.3), -30, send=0.04)
    ev("readerB_pocket_9", PE["readerB_pocket_9"], "pocket", "reader B slips a marked chip into his hip pocket (rustle, tick as it drops in)",
       one(lambda r, f=PE["readerB_pocket_9"]: G.chip_pocket(r, dfr(f + 3, f) if f is not None else 0.1, 0.3, 1)), -26, p=0.35)
    for k, f in enumerate(_frames(PE.get("far_pick_9"))):
        ev("far_pick_9", f, "chip_pick" if k == 0 else "chip_back", "up the path a tourist picks a marked chip off the trail" if k == 0 else "...and sets it back down",
           one(G.stone_pick) if k == 0 else one(G.chip_putback), -33, p=0.4, lpf=6500, send=0.12)
    ev("readerB_shift_9", PE["readerB_shift_9"], "weight_shift", "reader B shifts his weight, eyeing the chips by his feet (soft gravel scuff)",
       one(lambda r: G.gravel_scuff(r, 0.18, 0.6)), -30, p=0.3, lpf=7000)
    for f in _frames(PE["raven_9"]):
        def takeoff(r):                              # 3 strong beats, then lighter beats as it glides with the truck (fading)
            y = np.zeros(ns(0.95))
            G._place_mono(y, G.wing_ruffle(r, 3, 0.085, 0.055, 0.9), 0.0)
            G._place_mono(y, G.wing_ruffle(r, 4, 0.06, 0.06, 1.0) * 0.4, 0.45)
            return y
        ev("raven_9", f, "raven_takeoff", "Sign A's raven takes off from the LED box and flaps along with the truck toward Sign B",
           one(takeoff), -25, p=-0.2, lpf=8000, send=0.1)
    for k, f in enumerate(_frames(PE["raven_land_9"])):
        ev("raven_land_9", f, "raven_land", "...lands on Sign B's LED box (claws on the metal lid + a wing fold), then a little hop" if k == 0 else "...a little settling hop",
           one(lambda r, k=k: G.wing_ruffle(r, 1, 0.05, 0.04, 1.1) * (1.0 if k == 0 else 0.5) + 0.0), -29 - 3 * k, p=0.4, lpf=8000, send=0.08)
        ev("raven_land_9", f, "claw_tick", "claws on the LED box lid", one(lambda r: G.clink(r, r.uniform(2600, 3400), 0.05, 0.5)), -33 - 3 * k, p=0.4)
    for f in _frames(PE["shutter_9"]):
        ev("shutter_9", f, "shutter_far", "a distant tourist on the JASPER path photographs a log (tiny flash)", one(G.shutter), -31, p=-0.3, lpf=5000, send=0.18)
    for f in _frames(PE["stopwatch_9"]):
        ev("stopwatch_9", f, "stopwatch_far", "the assistant far back on the LONG LOGS path holds up the stopwatch and clicks it", one(G.stopwatch), -29, p=-0.3, lpf=6500, send=0.15)
    for f in _frames(PE["readerB_pats_9"]):
        ev("readerB_pats_9", f, "pocket_pat", "reader B pats his hip pocket on 'removed'", one(lambda r: G.cloth_pat(r, 0.75)), -27, p=0.25)

    # ---------------- 10 RESULTS
    def roll(spec, r):
        fs = _led_ticks(float(spec["target"]), int(spec["land"]))
        f1 = fs[0]
        y = np.zeros(ns((T.fr(fs[-1]) - T.fr(f1)) + 0.3))
        for i, f in enumerate(fs):
            last = i == len(fs) - 1
            G._place_mono(y, G.counter_tick(r, lock=last) * (0.5 + 0.5 * i / len(fs)) * (1.25 if last else 1.0), (T.fr(f) - T.fr(f1)) + r.uniform(0, 0.25 * FR) * (not last))
        return y, (T.fr(fs[-1]) - T.fr(f1)), fs
    for key, pn in (("counter_A", -0.05), ("counter_B", 0.05)):
        spec = PE[key]
        if spec:
            fs = _led_ticks(float(spec["target"]), int(spec["land"]))
            ev(key, spec["land"], key, f"LED counter rolls 0.00% -> {spec['target']:.2f}%: {len(fs)} relay ticks (one per digit change, {fs[0]}-{fs[-1]}), lock ON the beat",
               lambda r=rr(), s=spec: roll(s, r)[:2], -18, p=pn, send=0.04, group="counters")   # A4 P2: -3 dB (the results' 1-4 kHz margin was 9.9 dB)
    ev("touristA_pick_10", PE["touristA_pick_10"], "chip_pick", "under Sign A a tourist picks up a chip (tiny gravel scrape)", one(G.stone_pick), -24, p=0.45)
    ev("touristA_put_10", PE["touristA_put_10"], "chip_back", "...sees the red bar and puts it back (stone tick + gravel crunch)", one(G.chip_putback), -20, p=0.45)
    for f in _frames(PE["shutter_10"]):
        ev("shutter_10", f, "shutter", "one of the crowd photographs the sign panel itself (the irony)", one(G.shutter), -26, p=0.45, lpf=7000, send=0.12)
    for f in _frames(PE["glint_10"]):
        ev("glint_10", f, "chip_glint", "one holds his chip up to the sun: a tiny glint ting", one(lambda r: G.tiny_ting(r, 4400.0, 0.1)), -30, p=0.15, send=0.1)
    for k, f in enumerate(_frames(PE["whistle_10"])):
        nt = [[(0.0, 0.08, 1318.5, 1568.0)], [(0.0, 0.08, 1568.0, 1318.5)], [(0.0, 0.11, 1318.5, 1174.7)]][k % 3]
        ev("whistle_10", f, "whistle_soft", "...and walks it off with an innocent little whistle (a note per drawn note)",
           one(lambda r, n=nt: G.whistle(r, n, 0.14)), -29, p=0.55, lpf=6500, send=0.1)
    if PE["crowd_squat_10"] is not None:
        def squat(r, f0=float(PE["crowd_squat_10"])):
            y = np.zeros((2, ns(0.6)))
            for k in range(5):
                tk = dfr(f0 + (k % 3) + r.uniform(0, 1), f0)
                place(y, pan(G.gravel_scuff(r, 0.2, r.uniform(0.6, 1.0)), -0.7 + 0.35 * k), tk)
                place(y, pan(G.gravel_step(r, r.uniform(0.5, 0.8), 0.2) * 0.6, -0.7 + 0.35 * k), tk + 0.02)   # A5 ADD: the knees-down gravel crunch
            return y, 0.0
        ev("crowd_squat_10", PE["crowd_squat_10"], "crowd_squat", "the five tourists squat together (gravel scuffs + a soft crunch each, 0-2 f staggers)", lambda r=rr(): squat(r), -21,
           lpf=8000, send=0.06)
    if PE["crowd_pocket_10"] is not None:
        def crowd(r, f0=float(PE["crowd_pocket_10"])):
            y = np.zeros((2, ns(0.9)))
            for k in range(5):
                j = 0.4 * (k % 3) + r.uniform(0, 0.6)                   # 0-1.4 f staggers on the picture clock
                t0 = dfr(f0 + j, f0)
                place(y, pan(G.chip_pocket(r, dfr(f0 + j + 3, f0 + j), 0.3, 1) * r.uniform(0.7, 1.0), -0.7 + 0.35 * k), t0)
                # CHAR r5: the chips are in at f0+3 (1177), the hip pats + dust puffs at f0+4.5 (1178)
                place(y, pan(G.cloth_pat(r, r.uniform(0.6, 0.9)) * 0.8, -0.7 + 0.35 * k), dfr(f0 + 4.5 + r.uniform(0, 0.6), f0))
            return y, 0.0
        ev("crowd_pocket_10", PE["crowd_pocket_10"], "crowd_pocket", "...and pocket their chips all at once (5 rustles + chip ticks, then 5 hip-pats with the dust puffs)",
           lambda r=rr(): crowd(r), -22, send=0.06)   # A4 P2: -3 dB (under 'many past visitors')
    if PE["crowd_squat_10"] is not None:
        ev("crowd_squat_10", float(PE["crowd_squat_10"]) + 1, "strap_jingle", "...camera straps and lanyards jingle as they crouch",
           one(lambda r: G.strap_jingle(r, 5, 0.3)), -32, p=0.15, lpf=9000, send=0.06)
    if PE["crowd_pocket_10"] is not None:
        # A4 ADD: a soft, wordless multi-voice 'ooh' / guilty murmur from the five as the chips go in, kept in the word gap
        tpk = fr(float(PE["crowd_pocket_10"]))
        ga, gb = T.gap_after(tpk - 0.2, 0.2)
        if gb > ga and gb - tpk < 1.2:
            dur_ = float(np.clip(gb - ga + 0.12, 0.3, 0.55))
            add(Cue(ga + 0.01, "crowd_ooh", f"the five tourists' soft wordless 'ooh' (a guilty little murmur) as they pocket together, in the {ga:.2f}-{gb:.2f} s gap",
                    lambda r=rr(), d_=dur_: (G.ooh_crowd(r, d_, 5), 0.0), -30, send=0.08, pe="crowd_pocket_10 -> next word gap"))
    ev("cha_ching", PE["cha_ching"], "cha_ching", "cash-register 'ka-CHING' - the bell lands ON '8%'", lambda r=rr(): (G.cha_ching(r), 0.09), -9.5, p=0.1, send=0.1)   # A4 P2: -1.5 dB (the results' 1-4 kHz margin)
    if PE.get("raven_bolt_10") is not None:
        def bolt(r):                                 # A5 ADD: two fast flaps + two lighter beats under the bell's tail
            y = np.zeros(ns(0.8))
            G._place_mono(y, G.wing_ruffle(r, 2, 0.07, 0.04, 0.95), 0.0)
            G._place_mono(y, G.wing_ruffle(r, 2, 0.06, 0.08, 0.9) * 0.5, 0.28)
            return y
        ev("raven_bolt_10", PE["raven_bolt_10"], "raven_wings", "the raven bolts off Sign B's LED box at the cha-ching: two fast flaps, then two lighter beats as it flies off right",
           one(bolt), -28, p=0.3, lpf=8000, send=0.1)
    for k, f in enumerate(_frames(PE.get("scurry_10"))):
        ev("scurry_10", f, "scurry_step", "the white-hat tourists scurry off left in the stop-time (light quick gravel steps)",
           (lambda r=rr(): (G.gravel_step(r, r.uniform(0.45, 0.65), 0.3), 0.0)), -34 - 0.7 * k, p=-0.5, lpf=7500, group="scurry")
    if PE.get("feather_10") is not None:
        ev("feather_10", PE["feather_10"], "feather_flutter", "a loose feather drifts down past the LED box (a soft airy flutter)",
           one(lambda r: G.feather_flutter(r, 2, 0.45)), -36, p=0.1, lpf=7000, send=0.12)
        ev("feather_10", float(PE["feather_10"]) + 9, "feather_tick", "...and brushes the LED box lid (a feather-light tick)",
           one(lambda r: G.clink(r, r.uniform(2800, 3400), 0.03, 0.3)), -40, p=0.1, send=0.08)

    # ---------------- 11 BLUEPRINT: the diagram draws itself in chalk, the person walks off, the sign floats in, thieves multiply
    bl = dict(space="blue", send=0.1, group="chalk_bp")
    ev("bp_path_11", PE["bp_path_11"], "chalk_path", "the visitor's path draws itself in (two rails + footstep dashes)",
       one(lambda r: G.chalk_line(r, 0.45)), -27, p=0.0, **bl)
    ev("bp_circle_11", PE["bp_circle_11"], "chalk_circle", "a dashed circle rings the person (quick dotted chalk)",
       one(lambda r: G.chalk_glyph_strokes(r, [(k * 0.02, k * 0.02 + 0.014, "I") for k in range(20)])), -30, p=0.1, **bl)
    ev("bp_rule_11", PE["bp_rule_11"], "chalk_line", "'THE RULE' arrow draws itself (junction + thin arrow, 18 f)",
       one(lambda r: G.chalk_line(r, 0.6)), -21, p=-0.35, **bl)
    ev("bp_rule_label_11", PE["bp_rule_label_11"], "label_tok", "'THE RULE' label pops up (chalk tok)", one(lambda r: G.chalk_tap(r, 980.0)), -25, p=-0.35, **bl)
    ev("bp_crowd_11", PE["bp_crowd_11"], "chalk_line_wide", "'EVERYONE ELSE' arrow draws itself (wide: a broader double stroke, 19 f)",
       one(lambda r: G.chalk_line(r, 0.64) + 0.6 * G.chalk_line(r, 0.64)), -20, p=0.35, **bl)
    ev("bp_crowd_label_11", PE["bp_crowd_label_11"], "label_tok", "'EVERYONE ELSE' label pops up", one(lambda r: G.chalk_tap(r, 880.0)), -24, p=0.35, **bl)
    for k_, pn_ in (("bp_rule_label_11", -0.35), ("bp_crowd_label_11", 0.35)):           # A4 ADD: a tiny chalk-dust puff off each label
        if PE.get(k_) is not None:
            ev(k_, float(PE[k_]) + 2, "dust_puff", "...a tiny puff of chalk dust comes off the label", one(lambda r: G.dust_puff(r)), -34, p=pn_, **bl)
    wk = PE["bp_walk_11"]
    if wk:
        # A3 P2: a tap on every REAL foot contact (cast probe: toon.ts lands a foot every half walk cycle) and none after
        # he stops; then one soft scuff as his feet come together on the stop frame
        if "contacts" in wk:
            cs, stop = [float(c) for c in wk["contacts"]], wk.get("stop")
        else:
            step = float(wk.get("step_m", 0.7)) / float(wk["speed"]) * T.FPS
            cs, f = [], float(wk["start"]) + step
            while f < float(wk["until"]) - 1:
                cs.append(round(f, 2))
                f += step
            stop = wk.get("until")
        for k, f in enumerate(cs):
            ev("bp_walk_11", f, "chalk_step", f"the person walks off after the crowd: chalk-tap footstep {k + 1}/{len(cs)} (alternate feet, fading as he walks away)",
               one(lambda r, k=k: G.chalk_tap(r, (1050.0 if k % 2 else 900.0) * r.uniform(0.97, 1.03), 0.9)), -29.5 - 2.0 * k, p=0.05 + 0.04 * k,
               space="blue", send=0.12, group="bp_steps")
        if stop is not None and (not cs or float(stop) - cs[-1] >= 2):
            ev("bp_walk_11", float(stop), "chalk_stop", "...and stops dead under the floating sign (feet together: a soft chalk scuff)",
               one(lambda r: G.chalk_tap(r, 820.0, 0.6)), -31.5 - 2.0 * len(cs) * 0.5, p=0.05 + 0.04 * len(cs), space="blue", send=0.12, group="bp_steps")
    cw = PE.get("bp_crowd_walk_11")
    if cw:
        def crowd_walk(r, a=float(cw["start"]), b=float(cw["end"])):
            d = max(0.3, dfr(b, a))
            y = G.chalk_crowd(ns(d), r, 12.0)
            e = np.clip(np.minimum(np.arange(ns(d)) / SR / 0.35, (d - np.arange(ns(d)) / SR) / 0.35), 0, 1)
            return y * e[None, :], 0.0
        ev("bp_crowd_walk_11", cw["start"], "chalk_crowd", f"the EVERYONE ELSE chalk crowd streams along the wide arrow ({float(cw['start']):.0f}-{float(cw['end']):.0f}): "
           "a very soft papery shuffle of many chalk feet (vs the lonely single steps of the rule-follower)", lambda r=rr(): crowd_walk(r), -40, space="blue", send=0.1)
    fa = PE["sign_float_11"]
    if fa is not None:
        ev("sign_float_11", fa, "float_in", "the 'MANY PAST VISITORS' panel flies in (soft fly-in air, peaks mid-flight)",
           lambda r=rr(): (G.whoosh(0.62, r, 0.3, 300, 1500, 0.9, 0.2, 0.08), 0.0), -18, space="blue", send=0.12)
        ev("sign_float_11", float(fa) + 16, "float_settle", "...and settles at its spot (soft wooden tock)",
           one(lambda r: hp(G.wood_knock(r, 260, 0.035, 0.12), 180, 2)), -20, space="blue", send=0.05)
    tp = PE["thief_pops_11"]
    if tp:
        cnt, rate, f0 = int(tp["count"]), float(tp["rate"]), float(tp["start"])
        land = tp.get("land")

        def multiply(r):
            times = [dfr(f0 + i / rate, f0) for i in range(cnt)]
            span = max(times) + 0.5 + (dfr(f0 + cnt / rate + float(land), f0 + cnt / rate) + 0.1 if land else 0.0)
            y = np.zeros((2, ns(span)))
            for i, tm in enumerate(times):
                u = i / max(1, cnt - 1)
                f_pop = 520 * (2.4 ** u) * r.uniform(0.92, 1.08)        # the multiplication 'grows': pitch climbs ~1.3 octaves
                p_ = G.pop(r, f_pop, True, 0.07, 0.4) * r.uniform(0.55, 1.0) * (0.8 + 0.3 * u)
                pn = r.uniform(-0.75, 0.75)
                place(y, pan(p_, pn), tm)
                if land:                                                 # ...and lands standing on the paper 9 f later
                    tap = G.chalk_tap(r, r.uniform(700, 1100), 0.6) * r.uniform(0.18, 0.3)
                    fi = f0 + i / rate
                    place(y, pan(tap, pn * 1.15), tm + dfr(fi + float(land), fi) + r.uniform(0, 0.3 * FR))
            # A5 P3: a soft rising 'bwoop' tail as the multiplication completes (the pitch keeps climbing)
            tail_ = G.pop(r, 900.0, True, 0.22, 0.7) * 0.7
            place(y, pan(tail_, 0.0), max(times) + 0.04)
            return y, 0.0
        ev("thief_pops_11", f0, "thief_pops", f"the three thieves multiply into dozens: {cnt} tiny pops, {rate:g} per frame, pitch rising"
           + (f", each landing with a soft paper tap {land} f later" if land else ""),
           lambda r=rr(): multiply(r), -13, space="blue", send=0.12)   # A5 P3: +5 dB (they were inaudible), the music dips 3 dB on the line

    # ---------------- 12 CLASSROOM: chalk letter by letter, the bubble, the shifty eyes
    gl = PE["chalk_12"]
    if gl:
        g0 = float(gl[0][0])
        rel = [((T.fr(float(a)) - T.fr(g0)), (T.fr(float(b)) - T.fr(g0)), ch) for a, b, ch in gl]
        sq = [i for i, (_, _, ch) in enumerate(rel) if ch in "CS"][::3][:3]
        dot = [0.5 * (a + b) for a, b, ch in rel if ch == "."]
        ev("chalk_12", g0, "chalk_write", f"the teacher writes 'HALF THIS CLASS CHEATED.' letter by letter ({len(rel)} glyphs, {float(gl[0][0]):.0f}-{float(gl[-1][1]):.0f}): "
           f"chalk strokes per letter, squeaks, full-stop tap at {T.sec_to_old(T.fr(g0) + dot[0]):.1f}" if dot else "chalk writing",
           lambda r=rr(), g=rel, s=sq: (G.chalk_glyph_strokes(r, g, s), 0.0), -12, p=-0.2, space="class", send=0.14)
    ev("bubble_12", PE["bubble_12"], "bubble_pop", "the honest student's thought bubble pops in (little crowd of cheaters)", one(lambda r: G.pop(r, 470, True)),
       -17.5, p=0.1, space="class", send=0.1)
    ev("bubble_12", PE["bubble_12"], "bubble_ding", "...with a tiny echo of the hook's glint ding (the callback)",
       one(lambda r: G.ding(r, 1760.0, 0.22, 0.6, dur=0.6)), -24, p=0.15, space="class", send=0.12)
    for k, f in enumerate(_frames(PE["darts_12"])):
        ev("darts_12", f, "eye_dart", "her eyes dart (shifty, like the hook): woodblock tick", one(lambda r, h=k % 2: G.woodblock_tick(r, 1400.0 if h == 0 else 1050.0)),
           -30, p=0.1 + (0.15 if k % 2 else -0.15), space="class", send=0.08)

    w12 = PE.get("whip_12")
    if w12:
        c12, h12 = float(w12["center"]), float(w12["half"])

        def arc_air(r, c=c12, h=h12):
            d = fr(c + h) - fr(c - h)
            return lp(G.air_swish(r, max(0.2, d), 300, 1600), 4000, 2), 0.0
        ev("whip_12", c12 - h12, "arc_air", "the camera's fast arc from the board to the honest student: a soft air pass (not a dissolve whoosh)",
           lambda r=rr(): arc_air(r), -30, p=-0.2, space="class", send=0.05)
    for k, f in enumerate(_frames(PE.get("pencils_12"))):
        ev("pencils_12", f, "pencil", "a seated pupil scratches with a pencil", one(lambda r: G.pencil_scratch(r, r.uniform(0.22, 0.4))), -34 - k,
           p=[-0.5, 0.45, -0.15][k % 3], space="class", send=0.1, group="pencils")
    if PE.get("chalk_dot_12") is not None:
        ev("chalk_dot_12", PE["chalk_dot_12"], "chalk_snap", "the full stop of 'CHEATED.' - a hard chalk tok with a tiny snap", one(G.chalk_snap), -25, p=-0.2,
           space="class", send=0.12)
    if PE.get("chair_12") is not None:
        ev("chair_12", PE["chair_12"], "chair_creak", "a pupil shifts on a wooden chair on 'everybody'", one(lambda r: G.chair_creak(r)), -32, p=0.5,
           space="class", send=0.12)

    # ---------------- 13 PERMISSION
    for k, f in enumerate(_frames(PE["thieves_pocket_13"])):
        ev("thieves_pocket_13", f, "pocket", "a backlit tourist under Sign B pockets a chip", one(lambda r: G.chip_pocket(r, 0.1, 0.32, 1)), -27,
           p=[-0.45, 0.3, 0.6][k % 3], lpf=8000)
    tp_ = PE["stamp"]
    if tp_ is not None:
        tp = fr(tp_)
        dfall = dfr(tp_, tp_ - 4)
        add(Cue(tp, "stamp_fall", "giant stamp falls the last 4-5 f (air swish peaking on impact)", lambda r=rr(), d_=dfall: (G.stamp_fall(r, d_), d_), -16.5,
                send=0.05, group="stamp", pe="stamp"))
        add(Cue(tp, "stamp_slam", "STAMP slams 'PERMISSION GRANTED' onto Sign B: deep thoom + block knock + rubber thwap + panel ring; "
                "the 0.6-4 kHz band dips -7 dB for 150 ms so 'per-' stays clear",
                one(G.stamp_hit), -4.5, send=0.14, group="stamp", post=lambda x: body(carve_mid(x), 1.5), pe="stamp"))   # +1.5 (not 2.5): the stamp already drives the limiter hardest
        add(Cue(fr(tp_ + 8), "stamp_lift", "the stamp lifts away after squash 2 f + hold 6 f (sticky rubber 'thup')", one(G.stamp_lift), -18,
                send=0.08, group="stamp", pe="stamp"))
    for f in _frames(PE["photo_13"]):
        pre = PE.get("stamp") is not None and f < float(PE["stamp"])
        ev("photo_13", f, "shutter", "the back-lit silhouette photographs Sign B (white flash) before the stamp" if pre else
           "the pigtail tourist photographs the stamped sign (flash)", one(G.shutter), -23 if pre else -20, p=0.0 if pre else 0.4, lpf=7000 if pre else 8000)
        if not pre:
            ev("photo_13", float(f) + 1, "flash_whine", "...her flash recharges (a thin rising whine)", one(lambda r: G.flash_whine(r)), -31, p=0.4, send=0.05)
    def flap_away(r):                                # A4 P3: two fast flaps at the slam, then 3 lighter beats as it flies off (heard in the ring tail)
        y = np.zeros(ns(0.85))
        G._place_mono(y, G.wing_ruffle(r, 2, 0.075, 0.045, 0.95), 0.0)
        G._place_mono(y, G.wing_ruffle(r, 3, 0.065, 0.07, 0.9) * 0.55, 0.3)
        return y
    ev("raven_13", PE["raven_13"], "raven_wings", "the raven bolts off Sign B's LED box at the slam: two fast flaps, then three lighter beats as it flies off",
       one(flap_away), -27, p=-0.3, lpf=8000, send=0.1)
    ev("feathers_13", PE["feathers_13"], "feather_flutter", "two loose feathers flutter down past the LED box",
       one(lambda r: G.feather_flutter(r, 3, 0.55)), -33, p=-0.25, lpf=7000, send=0.12)
    ch13 = PE.get("chuckle_13")
    if ch13 and ch13.get("after_s"):
        ga, gb = T.gap_after(float(ch13["after_s"]) - 0.02, 0.2)
        if gb - ga >= 0.24 and ga <= fr(float(ch13["to"])) + 0.25:
            add(Cue(ga + 0.03, "chuckle", f"the red-cap tourist's dry little 'heh-heh' (he belly-laughs {ch13['from']:.0f}-{ch13['to']:.0f}), in the {ga:.2f}-{gb:.2f} s gap after 'permission.'",
                    lambda r=rr(), n_=(2 if gb - ga < 0.4 else 3): (G.chuckle(r, n_, None, 0.13), 0.0), -26, p=-0.45, send=0.1, pe="chuckle_13 -> the gap after 'permission.'"))

    # ---------------- 14 STOREROOM
    st_ = dict(space="store", send=0.15)
    # frames vs fs: the scoop bites the heap at fs-5 (cast.ts dip fs-6..fs-2); WORLD-INT r3 pourAt(n, k) = fs + 4 + k, each chip
    # tumbles 5 f into the pail -> lands fs + 9 + k
    DIG, CHIPS = -5.0, (9.0, 10.0, 11.0)

    def scoop(r, fs, pn_pile=-0.2, pn_bucket=0.25, chips=None, dig_on=True, tilt=False):
        """A5: every offset through the warp; the bite at fs-6 (only when seen), the blade tilt at fs+4 (the bait insert),
        chips = [(offset f, dB)] clinks into the pail"""
        f_first = fs - 6.5 if dig_on else fs + (3.5 if tilt else min(c for c, _ in chips) - 0.5)
        y = np.zeros((2, ns(dfr(fs + 16, f_first) + 0.9)))
        if dig_on:
            dig = G.rattle(0.3, r, 120, np.exp(-np.linspace(0, 1, ns(0.3)) * 2.5), lo=1300, hi=4800, tau=(0.004, 0.012)) * 0.8
            dig += bp(r.standard_normal(ns(0.3)), 600, 4000, 1) * np.exp(-np.linspace(0, 1, ns(0.3)) * 3) * 0.1
            place(y, pan(dig, pn_pile), dfr(fs - 6, f_first))
        if tilt:                                         # the loaded blade tips over the pail: a short metal-on-stone scrape
            sc = G.rattle(0.12, r, 70, np.exp(-np.linspace(0, 1, ns(0.12)) * 2.0), lo=1500, hi=5000, tau=(0.003, 0.008)) * 0.5
            place(y, pan(sc, pn_bucket), dfr(fs + 4, f_first))
        for fc, g_db in (chips or []):                   # the chips drop off the tipped scoop into the metal bucket
            hit = G.clink(r, r.uniform(1900, 3400), 0.07) * 0.6
            ring = G.bucket_ring(r, 0.32)
            L = max(len(hit), len(ring))
            s = np.zeros(L)
            s[: len(hit)] += hit
            s[: len(ring)] += ring
            s = s * dbg(g_db) if g_db >= -5.5 else lp(s, 3500, 1) * dbg(g_db)
            place(y, pan(s, pn_bucket), dfr(fs + fc, f_first) + r.uniform(0, 0.3 * FR))
        return y, dfr(fs, f_first)                       # anchor: the cue time is fs
    for k, sc in enumerate(PE.get("scoops_14") or []):
        fs = float(sc["fs"])
        chips = [(float(c), float(g_)) for c, g_ in sc.get("chips", [])] if sc.get("chips") and isinstance(sc["chips"][0], (list, tuple)) else \
            [(float(c), 0.0) for c in sc.get("chips", [])]
        dig_on = bool(sc.get("dig", True))
        if not dig_on and not chips:
            continue
        ev("scoops_14", fs, "scoop", f"scoop at {fs:.1f}: " + (f"bites the CONSCIENCE PILE at {fs - 6:.0f}, " if dig_on else "(the bite is off screen) ")
           + ("the chips clink into the BAIT pail at " + ", ".join(f"{fs + c:.1f}{'' if g_ == 0 else f' ({g_:+.0f} dB, just off the frame edge)'}" for c, g_ in chips) if chips else "no clink (the pail is off screen)"),
           lambda r=rr(), fs=fs, ch=chips, dg=dig_on: scoop(r, fs, chips=ch, dig_on=dg), -15 - 1.5 * k, **st_, group="scoop")
        if dig_on:                                       # A4 ADD: the pile settles after each VISIBLE bite
            ev("rocks_14", fs + 2, "rocks_settle", "a few chips slide and settle on the CONSCIENCE PILE after the scoop bites it", one(lambda r: G.rock_settle(r)),
               -33, p=-0.25, space="store", send=0.12, group="rocks")
    for f in _frames(PE["bait_scoop_14"]):
        # A5 P3: the insert opens on the LOADED scoop (trowel first seen at video 2136): no dig; the blade tips at fs+4 and its
        # 4 chips land fs+10.6 .. +13.6 (cast.ts: chip k arrives at fs+10+k; preview5 video 2149-2153)
        ev("bait_scoop_14", f, "scoop", "the insert: the loaded scoop tips over the BAIT bucket on 'the bait wood?' and 4 chips clink in",
           lambda r=rr(), f=f: scoop(r, f, 0.1, 0.0, [(10.6 + k, 0.0) for k in range(4)], dig_on=False, tilt=True), -22, **st_, group="scoop")   # A4 P2: -6 dB (it sits on 'wood?')
    ev("letter_pick_14", PE["letter_pick_14"], "letter_pick", "he lifts a 'SORRY!' letter off the pile (paper crinkle)",
       one(lambda r: G.paper_rustle(r, 0.4)), -20, p=-0.2, **st_)
    ev("mail_flap_14", PE["mail_flap_14"], "mail_flap", "the brass mail-slot flap snaps open", one(G.brass_flap), -17, p=0.45, **st_)
    ev("parcel_14", PE["parcel_14"], "parcel_thump", "a returned parcel drops onto the pile ON 'mailed' (cardboard thud + rocks shift; the camera kicks)",
       one(G.parcel_thump), -13, p=-0.1, space="store", send=0.16, post=lambda x: carve_mid(body(x, 2.5), depth_db=-6.0, back=0.3))   # A4 P3
    ev("envelope_14", PE["envelope_14"], "envelope_slap", "...an envelope flops down after it", one(G.envelope_slap), -19, p=-0.25, **st_)
    for k, f in enumerate(_frames(PE["letters_hop_14"])):
        ev("letters_hop_14", f, "letter_hop", "the apology letters hop on 'apology' (paper flutter)", one(lambda r: G.paper_rustle(r, 0.2, 0.8)), -25 - k,
           p=-0.3 + 0.3 * k, **st_)
    if PE.get("bulb_14") is not None:
        def tink(r):
            y = np.zeros(ns(0.4))
            G._place_mono(y, G.clink(r, r.uniform(3600, 4200), 0.09, 0.7), 0.0)
            G._place_mono(y, G.clink(r, r.uniform(3000, 3500), 0.06, 0.5) * 0.4, 0.11)
            return y
        ev("bulb_14", PE["bulb_14"], "chain_tink", "the hanging bulb's pull-chain tinks as the bulb swings (the parcel landed)", one(tink), -32, p=0.25, **st_)
        ev("bulb_14", PE["bulb_14"], "bulb_hum", "...and its mains hum swells and wanes with the swing, decaying over 1.5 s",
           one(lambda r: G.bulb_swing(r, 1.5)), -37, p=0.25, send=0.06, space="store")
    if PE.get("owl_14") is not None:
        ts_ = fr(float(PE["owl_14"]))
        g_ = [(a_, b_) for a_, b_ in T.gaps(0.25) if abs(b_ - ts_) < 0.15 and b_ - a_ <= 1.2]
        if g_ and T.shot_at(g_[0][0] + 0.02) == 14:
            ga, gb = g_[0]
            add(Cue(ga + 0.03, "owl_far", f"one far owl hoots through the night window ('hoo-hoo', in the {ga:.2f}-{gb:.2f} s gap before 'So some of it', muffled by the glass)",
                    lambda r=rr(): (lp(G.owl_hoot(r, 2 if gb - ga > 0.42 else 1), 1400, 2), 0.0), -38, p=-0.55, send=0.18, space="store", pe="owl_14 -> the gap before 'So some'"))

    # ---------------- 15 DUSK
    if PE["pocket_15"] is not None:
        lead = dfr(float(PE["pocket_15"]), float(PE["pocket_15"]) - 4)   # the rustle starts 4 f early (CHAR r3: slides in 1821-1825), the tick lands ON the entry frame
        add(Cue(fr(PE["pocket_15"]), "pocket", "the dusk tourist slips the tagged chip into his shirt pocket (tick ON the entry frame)",
                lambda r=rr(), L=lead: (G.chip_pocket(r, L, 0.38), L), -17, p=0.15, pe="pocket_15"))
    ev("tag_sparkle_15", PE["tag_sparkle_15"], "chip_glint", "the blue-quartz chip sparkles in his hand (a tiny callback to the hook's glint)",
       one(lambda r: G.tiny_ting(r, 3520.0, 0.12)), -29, p=0.2, send=0.12)
    ev("tag_ding_15", PE["tag_ding_15"], "bright_ding", "the tag's '2' card opens ('TIMES STOLEN: 1' -> '2'): one bright ding D7 (tuned to the final D-major chord), ON the opening frame",
       one(lambda r: G.ding(r, 2349.3, 0.26, 0.8, dur=0.85)), -8, p=0.1, send=0.08)   # A5 P2: +3 dB (it was the quietest final accent)
    if PE.get("card_flick_15") is not None:
        ev("card_flick_15", PE["card_flick_15"], "card_flick", "the tag card flicks over in the pocket (2 f), just ahead of the ding",
           one(lambda r: G.card_flick(r)), -34, p=0.12, send=0.05)
    if PE.get("nighthawk_15") is not None:
        def peent(r):
            c = G.nighthawk_peent(r)
            y = np.zeros(len(c) + ns(0.4))
            G._place_mono(y, c, 0.0)
            G._place_mono(y, lp(c, 2500, 1) * 0.2, 0.28)
            return lp(y, 6000, 1), 0.0
        ev("nighthawk_15", PE["nighthawk_15"], "nighthawk_far", "a far nighthawk 'peent' in the blue dusk sky", lambda r=rr(): peent(r), -40, p=0.5, send=0.25)
    for f in _frames(PE["pats_15"]):
        ev("pats_15", f, "pocket_pat", "a smug little pat on the pocket", one(lambda r: G.cloth_pat(r, 0.7)), -27, p=0.15)
    tf = PE.get("tag_flutter_15")
    if tf and tf.get("rot"):
        rot = [(float(f), float(a)) for f, a in tf["rot"]]
        f0, f1 = rot[0][0], rot[-1][0]

        def flutter(r, R=rot, a=f0, b=f1):
            fr_ = np.array([x[0] for x in R])
            v = np.abs(np.diff([x[1] for x in R], prepend=R[0][1]))            # swing speed, rad / frame
            env_f = np.clip(v / 0.035, 0, 1) ** 0.8
            env_f = np.maximum(env_f, 0.12 * (fr_ < b - 2))                       # it never quite stops in the dusk breeze
            n = ns(dfr(b + 3, a))
            env = np.interp(pic_of(T.fr(a) + np.arange(n) / SR), fr_, env_f, right=0.0)   # A5: sample time -> picture frame through the warp
            env = np.convolve(env, np.ones(ns(0.03)) / ns(0.03), mode="same")
            return G.paper_flutter(r, env), 0.0
        ev("tag_flutter_15", f0, "tag_flutter", f"the 'TIMES STOLEN' tag flutters on its twine as it swings ({f0:.0f}-{f1:.0f}, louder on the kick after the flip)",
           lambda r=rr(): flutter(r), -36, p=0.2, lpf=9000, send=0.08)
    car = PE.get("car_15")
    if car:
        d0, c0, aw = float(car["door"]), float(car["crank"]), float(car["away_by"])

        def car_start(r, d0=d0, c0=c0, aw=aw):
            idle = 0.5
            away = max(0.4, (T.fr(aw) - T.fr(c0)) - 0.42 - idle)
            door = G.car_door(r, 1.5)
            eng = G.engine_start(r, 0.42, idle, away, 1.3)
            y = np.zeros(ns(dfr(max(aw, c0), d0) + 0.8))
            G._place_mono(y, door * 1.0, 0.0)
            G._place_mono(y, eng * 0.55, (T.fr(c0) - T.fr(d0)))
            return y, 0.0
        ev("car_15", d0, "car_far", "far off in the parking lot a car door shuts under 'So', the starter grinds under 'some of it', the engine catches "
           "and drives away before 'twice' (dusk life)", lambda r=rr(): car_start(r), -31, p=-0.55, lpf=2600, send=0.2)
    for a, b, kind, sid, x, px in (PE.get("raven_auto") or []):
        pn_ = float(np.clip((x / 1080.0 - 0.5) * 1.4, -0.8, 0.8))
        if kind == "hop":
            def hop(r, a=a, b=b):
                y = np.zeros(ns((T.fr(b) - T.fr(a)) + 0.25))
                G._place_mono(y, G.wing_ruffle(r, 1, 0.05, 0.04, 1.1), 0.0)
                G._place_mono(y, G.clink(r, r.uniform(2400, 3200), 0.04, 0.45) * 0.7, (T.fr(b) - T.fr(a)))   # claws back on the rail
                return y, 0.0
            ev("raven_auto", a, "raven_hop", f"the raven hops on its perch (shot {sid}, {a}-{b}: wing flick, claws land on {b})", lambda r=rr(), h=hop: h(r),
               -35, p=pn_, lpf=7500, send=0.1, group="raven_auto")
            if T.SHOTS[sid]["set"] == "trailhead":
                ev("raven_auto", b, "board_creak", f"...the sign board creaks faintly under its landing (shot {sid})",
                   one(lambda r: G.creak(0.18, r, 260, 340, G.WOOD, None, 0.15, 0.03, 1.3)), -39, p=pn_, lpf=6000, send=0.1, group="raven_auto")
        else:
            ev("raven_auto", a, "raven_ruffle", f"the raven shakes out its feathers (shot {sid}, {a}-{b})",
               one(lambda r: G.wing_ruffle(r, 2, 0.045, 0.035, 1.0)), -35, p=pn_, lpf=7000, send=0.1, group="raven_auto")
    return C


def _thump(r, f0=70.0, tau=0.05):
    """a soft low 'body' thump (pitched sine with a small downward glide)"""
    t = tt(tau * 5)
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.exp(-t / 0.01))) / SR) * np.exp(-t / tau)


def body(x, db=2.5, f0=70.0, q=0.9):
    """A3 P3 (spectral balance): add 50-90 Hz body to a thump AFTER its level match (a peaking EQ at 70 Hz)"""
    return peq(x, f0, db, q)


SPACES = {"out": dict(rt60=0.75, seed=77, pre=0.012, hf=1.8, early=[(0.07, 0.35, -0.5), (0.13, 0.22, 0.6)]),
          "class": dict(rt60=0.55, seed=78, pre=0.006, hf=1.4, early=[(0.011, 0.4, -0.3), (0.019, 0.3, 0.4)]),
          "store": dict(rt60=0.45, seed=79, pre=0.005, hf=1.5, early=[(0.009, 0.45, 0.3), (0.016, 0.3, -0.4)]),
          "blue": dict(rt60=1.2, seed=80, pre=0.02, hf=1.2, early=[])}


def write_used():
    D, SRC = picture_events()
    out = {"_doc": "frames (30 fps) every SFX used in the last mix.py run; copy a key into picture_events.json to override it "
                   "(a frame, a list of frames, the same dict shape, or null to drop the cue)"}
    for k, v in D.items():
        out[k] = {"value": v, "source": SRC[k]}
    with open(PE_USED, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)


def render_events(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    sends = {k: np.zeros(N) for k in SPACES}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        tgt = v_ref + c.level
        cur = momentary_max(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        if c.post:
            x = c.post(x)
        t0 = c.t - anchor
        wc = c.wcarve if c.wcarve is not None else _WCARVE.get(c.name)
        if wc:
            x = carve_words(x, t0, wc)
        c.measured = momentary_max(x) - v_ref
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), t0)
    for k, s in sends.items():
        if np.any(s):
            sp = SPACES[k]
            ir = make_ir(sp["rt60"], sp["seed"], pre=sp["pre"], hf=sp["hf"], early=sp["early"])
            out += 0.6 * convolve_st(s, ir)
    out = hp(out, 30, 2)
    # nothing but the wind may cross the loop point: the events stem is silent by the last 2 frames
    a, z = ns(T.DUR - 0.22), ns(T.DUR - 2 * FR)
    out[:, a:z] *= np.linspace(1, 0, z - a)[None, :] ** 2
    out[:, z:] = 0.0
    return out, C


def render(v_ref):
    ev, C = render_events(v_ref)
    beds, rows = render_beds(v_ref)
    return ev, beds, C, rows
