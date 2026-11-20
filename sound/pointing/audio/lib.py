# The recorded sounds of the film: CC0 recordings in _lib/ (sources in _lib/_sources.json, licences in LICENSES.md).
# Every use is a named CUT of a file (start, end in seconds, chosen from the measured maps of probe_*.py; nothing was
# auditioned by ear). cut(name) returns stereo (2, n) at the file's own level; USED counts what a mix really played.
import collections
import json
import os
import wave
import numpy as np
from dsp import SR, st, hp, fades

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "_lib")
USED = collections.Counter()
# name: (file, start, end, high-pass Hz or 0, what the measurements say it is)
CUTS = {
    # the train
    "emu_depart": ("train_depart_emu", 0.0, 24.0, 60, "an EMU leaving: inverter tones 1102 / 2203 / 3305 Hz for 8 s, the pass-by roar peaks at 16 s"),
    "emu_pass": ("train_depart_emu", 9.0, 19.5, 60, "the cars streaming past (the roar part of the same recording)"),
    "air_hiss": ("air_brake", 0.0, 3.4, 300, "an air brake release, 6-7 kHz hiss falling over 3 s"),
    # ElevenLabs sound effects (2026-11-20, owner-approved credits; prompts in _lib/_sources.json and _eleven/credits_log.jsonl)
    "emu_jp": ("emu_jp_eleven", 0.0, 6.58, 60, "a Japanese commuter EMU pulling out: a clean inverter whine rising 891 -> 1137 Hz (take 2, 0.76x tempo)"),
    # the tourist's own UNUSED giggle take (voice/takes/v3_x02/t2, "[giggling helplessly] Hee hee hee hee!": the build uses
    # v3_x02/t1 0.84-2.74 in s18, never this file). Two pieces, for CAST's s16a giggle beats
    "giggle_a": ("giggle_x02_t2", 0.06, 1.08, 120, "the tourist's giggle, piece A (bursts 0.08-0.61 and the start of 0.73-1.59)"),
    "giggle_b": ("giggle_x02_t2", 1.63, 2.72, 120, "the tourist's giggle, piece B (the burst 1.65-2.70)"),
    "door_jp": ("door_jp_eleven", 0.20, 2.48, 40, "a commuter train's sliding doors closing: 1.3 s of slide, the leaves meet with a padded thud at 1.30 s of the cut (take 3)"),
    "door_hiss": ("door_close_a", 0.47, 2.6, 400, "door air hiss"),
    "door_thud": ("door_close_a", 9.10, 9.70, 60, "the door's thud at the end of the same recording (peak at 9.25 s)"),
    "pneu_puff": ("door_close_pneu", 6.98, 7.5, 500, "one pneumatic puff"),
    "clack_bed": ("wheels_clack", 4.0, 34.0, 150, "steady wheel clatter over joints (old film recording, mono)"),
    "train_idle": ("door_open_close", 4.1, 8.4, 80, "a standing train's hum (193 Hz) between the two door moves"),
    "ride_cruise": ("ride_chuo", 91.5, 105.5, 40, "inside a Chuo Line train at speed: speech-band swing 5-9 dB (no announcement)"),
    "ride_accel": ("ride_chuo", 23.5, 31.5, 40, "the same train pulling out, before its announcement starts at 32 s"),
    "ride_decel": ("ride_chuo", 105.5, 124.0, 40, "the same train slowing: level falls 4 dB, swing 5-8 dB"),
    "ride_hibiya": ("ride_hibiya", 138.0, 153.0, 40, "inside a Hibiya line train: steady, inverter tones at 902 / 1805 Hz"),
    # the suitcase
    "suit_tokyo": ("suitcase_tokyo", 1.8, 5.6, 150, "a suitcase rolling past in a Tokyo station (peak at 4.0 s)"),
    "suit_roll_a": ("suitcase_roll_5", 0.0, 3.2, 180, "suitcase roll (low rumble + clatter)"),
    "suit_roll_b": ("suitcase_roll_7", 0.0, 3.25, 180, "suitcase roll"),
    "suit_roll_c": ("suitcase_roll_4", 0.6, 3.6, 180, "suitcase roll with a slow start"),
    "comb_plate": ("luggage_comb_plate", 2.40, 3.42, 120, "luggage wheels over a metal plate, 1.0 s"),
    "comb_click": ("luggage_comb_plate", 2.03, 2.09, 200, "one wheel click on the metal plate"),
    "thud_plastic": ("plastic_thud", 0.28, 0.9, 80, "a plastic thud (top 231 Hz)"),
    "bonk_a": ("plastic_bonks", 1.18, 1.41, 80, "plastic bonk, bright"),
    "bonk_b": ("plastic_bonks", 5.25, 5.45, 80, "hollow plastic knock (306 Hz)"),
    "bonk_c": ("plastic_bonks", 6.15, 6.33, 80, "hollow plastic knock"),
    "bonk_pair": ("plastic_bonks", 7.345, 7.82, 80, "two knocks 0.285 s apart (the two pats)"),
    "bonk_low": ("plastic_bonks", 3.51, 3.9, 60, "a low plastic bonk (107 Hz)"),
    # shoes and steps
    "squeak_short": ("sneaker_squeak", 8.65, 8.91, 300, "a short sneaker squeak, 0.24 s"),
    "squeak_mid": ("sneaker_squeak", 9.11, 9.51, 300, "a sneaker squeak, 0.38 s"),
    "squeak_step_a": ("sneaker_steps", 34.34, 34.48, 300, "a squeaky sneaker step"),
    "squeak_step_b": ("sneaker_steps", 34.94, 35.21, 300, "a squeaky sneaker step"),
    "squeak_step_c": ("sneaker_steps", 30.11, 30.48, 300, "a squeaky sneaker step"),
    "squeak_step_d": ("sneaker_steps", 37.01, 37.26, 300, "a squeaky sneaker step"),
    "step_a": ("steps_concrete", 0.0, 0.2, 70, "one footstep on concrete"),
    "step_b": ("steps_concrete", 8.73, 8.92, 70, "one footstep on concrete"),
    "step_c": ("steps_concrete", 14.92, 15.2, 70, "one footstep on concrete"),
    "step_d": ("steps_concrete", 15.98, 16.16, 70, "one footstep on concrete"),
    "step_e": ("steps_concrete", 1.21, 1.34, 70, "one light footstep"),
    "steps_group": ("steps_group", 0.2, 9.6, 80, "three people walking on concrete"),
    # cloth
    "cloth_w1": ("cloth_whoosh_seq", 0.0, 0.74, 220, "jacket whoosh"), "cloth_w2": ("cloth_whoosh_seq", 1.40, 2.09, 220, "jacket whoosh"),
    "cloth_w3": ("cloth_whoosh_seq", 2.78, 3.40, 220, "jacket whoosh"), "cloth_w4": ("cloth_whoosh_seq", 3.97, 4.54, 220, "jacket whoosh"),
    "cloth_w5": ("cloth_whoosh_seq", 5.06, 5.61, 220, "jacket whoosh"), "cloth_w6": ("cloth_whoosh_seq", 6.21, 6.81, 220, "jacket whoosh"),
    "shirt_w1": ("shirt_whoosh", 6.82, 7.21, 200, "shirt whoosh, 0.35 s"), "shirt_w2": ("shirt_whoosh", 9.73, 10.23, 200, "shirt whoosh, 0.46 s"),
    "shirt_w3": ("shirt_whoosh", 0.57, 1.23, 200, "shirt whoosh"),
    "rustle_a": ("fabric_soft", 2.03, 3.39, 300, "soft fabric rustle"), "rustle_b": ("fabric_soft", 4.24, 6.07, 300, "soft fabric rustle"),
    "rustle_c": ("fabric_soft", 6.28, 8.1, 300, "soft fabric rustle"), "rustle_d": ("fabric_soft", 0.49, 1.55, 300, "soft fabric rustle"),
    "leather_a": ("leather_creak", 0.9, 2.3, 200, "leather creak"), "leather_b": ("leather_creak", 5.6, 7.2, 200, "leather creak"),
    # the place
    # JAPANESE crows (2026-11-20): jungle crows recorded in a Sapporo park (Freesound 390250, CC0): the clear, round 'kaa'
    # of Tokyo's evenings (top 1.1-1.25 kHz), not the raspy European 'kraa' of the files used before (crow_caw_1/2,
    # crows_cawing: still in _lib/, no longer used)
    "crow_1": ("crows_sapporo", 9.30, 9.70, 300, "one Japanese crow caw (top 1.17 kHz, the loudest of the file)"),
    "crow_2": ("crows_sapporo", 4.93, 5.30, 300, "one Japanese crow caw (top 1.23 kHz)"),
    "crow_3": ("crows_sapporo", 19.85, 20.40, 300, "one long Japanese crow caw (0.43 s, top 1.25 kHz)"),
    "crows_far": ("crows_sapporo", 0.5, 26.3, 300, "Japanese crows in a park (the bed: set far back with a low-pass)"),
    "sparrows": ("sparrows", 2.0, 32.0, 500, "sparrows"),
    "walla": ("walla_ext", 2.0, 29.0, 150, "indistinct people outdoors"), "murmur": ("murmuring", 4.0, 34.0, 150, "indistinct murmur indoors"),
    "vending_hum": ("vending_hum", 2.0, 30.0, 50, "a vending machine's hum"),
    # the lab
    "marble_hit": ("marble_impact", 0.07, 0.29, 400, "a marble's first impact (5.3 kHz)"),
    "marble_bounces": ("marble_impact", 0.58, 2.6, 400, "the marble bouncing"),
    "glass_a": ("glass_beads", 0.0, 0.64, 400, "glass beads landing"), "glass_b": ("glass_beads", 2.89, 3.4, 400, "glass beads landing (4.6 kHz)"),
    "glass_c": ("glass_beads", 6.12, 6.5, 400, "glass beads landing"),
    "click_a": ("button_clicks", 1.04, 1.4, 200, "a firm plastic button click"), "click_b": ("button_clicks", 3.47, 3.86, 200, "a button click"),
    "click_c": ("button_clicks", 2.52, 2.65, 150, "a soft button click"), "click_d": ("button_clicks", 3.19, 3.25, 150, "a soft button click"),
    # small graphics (the lab's speech bubble)
    "ui_pop": ("ui_pop", 0.0, 0.5, 0, "a neutral small pop"), "ui_pop_in": ("ui_pop_in", 0.0, 0.6, 0, "a pop-in"), "ui_click": ("ui_click", 0.0, 0.2, 0, "a click"),
    "ui_tick": ("ui_tick", 0.0, 0.1, 0, "a tick"), "quick_woosh": ("quick_woosh", 0.0, 0.6, 0, "a quick thin woosh"), "flick_swish": ("flick_swish", 0.0, 0.5, 0, "a short flick"),
}


def read_seg(name, a, b):
    with wave.open(os.path.join(LIB, name + ".wav"), "rb") as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        assert sr == SR, (name, sr)
        i0, i1 = max(0, int(a * sr)), min(n, int(b * sr))
        w.setpos(i0)
        raw = w.readframes(max(0, i1 - i0))
    if sw == 3:
        bts = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        v = bts[:, 0] | (bts[:, 1] << 8) | (bts[:, 2] << 16)
        x = np.where(v >= 1 << 23, v - (1 << 24), v).astype(np.float64) / float(1 << 23)
    elif sw == 2:
        x = np.frombuffer(raw, "<i2").astype(np.float64) / 32768.0
    else:
        raise ValueError(sw)
    return x.reshape(-1, ch).T


_C = {}


def cut(name, fin=0.004, fout=0.03, a=None, b=None):
    """a named cut as stereo (2, n); a / b = offsets inside the cut (s)"""
    f, s0, s1, hpf, _ = CUTS[name]
    key = (name, a, b)
    if key not in _C:
        x = st(read_seg(f, s0 + (a or 0.0), s0 + b if b is not None else s1))
        if hpf:
            x = hp(x, hpf, 2)
        _C[key] = x
    USED[f] += 1
    return fades(_C[key], fin, fout)


def mono(name, **kw):
    return cut(name, **kw).mean(0)


def sources():
    return {r["file"]: r for r in json.load(open(os.path.join(LIB, "_sources.json"), encoding="utf-8"))}
