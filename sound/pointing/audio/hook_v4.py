# THE HOOK of v4 (SCRIPT_v4.md lines 1-3: "Tap your foot on every green light. Only green." / "Go. Go. Go. Go. Go. Go. Go!"
# / "Did you tap? She did."). Its sound is half the trick. Lead's brief (2026-11-20, new PC):
#   - MUSIC FROM FRAME 0: a foot-tapping groove whose beat the "Go"s ride. Under line 1 it runs at the first Go gap
#     (fitted so frame 0 is a downbeat); from the first Go every Go is a beat, so the groove speeds up with them; the run
#     sits on the dominant (A7) with a pizz line climbing one chord tone per Go (pressure);
#   - the lamp turning GREEN (v02's cut): a soft relay tick + a low "bip" (the same lamp as the Go beeps, an octave down);
#   - a bright BEEP (+ her button click) on each of the SIX green Go flashes, identical, getting faster with the words;
#   - the RED HIT on the seventh (v04's hard cut to red): a short low stab + a thud + a bright crack, her button's click
#     2 frames later (her hand comes down anyway); then everything dies within ~0.1 s and the HELD BEAT is real silence
#     (music, hall, effects and the room all at zero; only the voice track's own -60 dBFS room tone);
#   - the ROOM fades back in over the 60 ms before "Did you tap?" (the music stays out: the question hangs in the room);
#   - the STING on the red X ("She", shot v05): two falling pizz notes, a woodblock, a glock wink, the X's "bwip";
#   - the groove returns after "She did." into the lab's section.
# Times: clock_v4.Clock.hook_times() (the DIRECTOR's clock + the voice's words); a PLAN fallback here for tests.
# usage: python -s hook_v4.py --test [--clock=<timeline json>] [--words=<voice words json>]
#        -> _hook_v4_test.wav (+ _music / _fx / _amb, .json): the first 10 s, no voice
import argparse
import json
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, tt, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, bp, shelf, fades, write_wav, st, colored
import instruments as I
import score_v4 as S4

F = I.m2f
BEEP_HZ = 1760.0                 # A6: bright and friendly, above the voice's "Go" (its energy sits under 1 kHz); never changes pitch
PRE_KEY = ["Dm", "Bb", "Gm"]     # the chords under line 1, one per bar of 4 pre-beats; the Go run sits on A7 (it wants to resolve)
RUN_LINE = [57, 61, 64, 67, 69, 73]   # A3 C#4 E4 G4 A4 C#5: the pizz climbs one chord tone per Go
# LU under the voice (short sounds: by their loudest 50 ms, see peak_to)
LV = dict(music=17.5, beep=15.0, click=25.0, lamp=23.0, red_stab=12.0, red_thud=15.0, red_crack=19.0, press=21.0, sting=13.0, xpop=20.0, room=30.0)
# AUDIT r1 (2026-11-21): the RED was no louder than a green Go (-28.7 dBFS vs -28.5..-30.0; < 150 Hz -32.5). It is now the
# loudest non-voice event of the film: a BOOM with body (a pitch-dropping sub + its harmonics, so a phone hears it), the
# stab and the recorded hit louder, a crack in 2.5-6 kHz (between the voice's formants); it rings to the end of "Go!" and
# then everything is cut dead (the held beat). Levels by measurement in the mix (mix_v4 reports red_hit).
LV.update(red_stab=7.5, red_thud=9.0, red_crack=6.5, red_boom=6.0, press=19.0)
# AUDIT r2: the red was louder only below 150 Hz; its overall 250 ms (voice included) matched a Go beat: more transient
LV.update(red_stab=1.5, red_crack=-4.0, red_boom=4.5)
# PICTURE TIMING (owners, 2026-11-21): the lamp flashes ON the Go word's onset (EV.goFlashes = the Go onsets: the beep stays
# there), her finger lands 2-3 frames later (the click follows the finger, not the lamp); on the red her hand comes down
# about f177-179 (EV.red = go#7 onset ~f173.4). No EV for the presses yet (asked of the DIRECTOR): offsets from the Go onsets.
PRESS_LAG = 2.5 / 30
RED_PRESS_LAG = 4.5 / 30
STING_DUCK_DB = -5.5             # the sting under "did." of "She did." (audit r1: "She did." 11.4 dB over the bed, rule 12)
SILENCE_FLOOR = 0.0              # the held beat: the beds are at true zero (the voice track carries the -60 dBFS room tone)
# generated recordings layered in when present (ElevenLabs SFX, 2026-11-20 15:46, sfx_eleven.py; the prompts are in
# _eleven/credits_log.jsonl): the red hit's body (take 2: the loudest and the shortest, dead in 0.20 s, so the held beat stays
# empty) replaces the synthesized thud; the lamp's relay clunk (take 2, the brighter) sits under the synthesized bip
REC = dict(red=os.path.join(HERE, '_eleven', 'v4', 'red_hit_t2.wav'), lamp=os.path.join(HERE, '_eleven', 'v4', 'lamp_on_t2.wav'))


def rec(name, max_s=None):
    p = REC.get(name)
    if not p or not os.path.exists(p) or '--no-rec' in sys.argv:
        return None
    import soundfile as sf
    x, sr = sf.read(p, dtype='float64')
    x = (x.T if x.ndim > 1 else np.stack([x, x]))
    assert sr == SR
    if max_s:
        x = fades(x[:, :ns(max_s)], 0.0005, 0.03)
    return x


def plan_go(t1_end=2.85, first_gap=0.46, last_gap=0.26, n=7):
    """the old plan grid (a test without a clock): seven onsets, the gaps shrinking from first_gap to last_gap"""
    r = (last_gap / first_gap) ** (1.0 / (n - 2))
    gaps = [first_gap * r ** k for k in range(n - 1)]
    g1 = t1_end + 0.12
    return [g1 + sum(gaps[:k]) for k in range(n)]


def plan_times():
    go = plan_go()
    red = go[-1]
    return dict(line1=(0.05, 2.82), go=go[:6], go_all=go, red=red, red_word=red, go7_end=red + 0.2, did=red + 0.7, she=red + 1.56,
                she_did=(red + 1.56, red + 2.1), l3_end=red + 2.1, green=1.53, line4=red + 2.4, silence=(red + 0.2, red + 0.7))


def beat_grid(go):
    """the beats: frame 0 .. the first Go at the first gap (fitted to a whole number of beats so frame 0 is a downbeat),
    then the Go onsets themselves"""
    g1, gap1 = go[0], go[1] - go[0]
    k = max(1, round(g1 / gap1))
    pre = [g1 - j * (g1 / k) for j in range(k, 0, -1)]
    return pre + list(go), k


def groove(n, beats, k_pre, stop_at, r):
    """the foot-tapping groove on an arbitrary beat list (it speeds up with the Gos): a soft low 'foot' on every beat, the
    upright bass on 1 and 3, snaps on 2 and 4, shaker on the off-beats, a marimba 8th ostinato; the run on A7 with the pizz
    climbing and a celesta on each Go. Everything stops dead at stop_at."""
    out = {k: np.zeros((2, n)) for k in ("low", "mid", "perc", "sparkle")}
    for i, t in enumerate(beats):
        if t >= stop_at - 1e-6:
            break
        nxt = beats[i + 1] if i + 1 < len(beats) else t + (t - beats[i - 1])
        b = nxt - t
        run = i >= k_pre
        j = i - k_pre
        pos = (j % 4) if run else (i % 4)
        sym = "A7" if run else PRE_KEY[min(i // 4, len(PRE_KEY) - 1)]
        root, iv = S4.chord(sym)
        k = tt(0.16)
        foot = np.sin(2 * np.pi * (58 + 40 * np.exp(-k / 0.02)) * k) * np.exp(-k / 0.05) * (1 - np.exp(-k / 0.002))
        place(out["low"], pan(foot * (0.55 if pos in (0, 2) else 0.40), 0.0), t)
        if pos in (0, 2) or run:
            place(out["low"], pan(I.bass_pizz(F(38 + root + (7 if pos == 2 and not run else 0)), 0.75, r, length=min(0.4, 0.9 * b)), 0.0), t)
        if pos in (1, 3):
            place(out["perc"], pan(I.snap(0.42, r), 0.2), t)
        place(out["perc"], pan(I.shaker(0.22 + 0.04 * run, r, dur=0.08), 0.35), t + b / 2)
        tones = [72 + root + q for q in iv]
        for e in range(2):
            m = [tones[0] - 12, tones[2 % len(tones)] - 12, tones[1] - 12, tones[2 % len(tones)] - 12][(2 * pos + e) % 4]
            place(out["mid"], pan(I.marimba(F(m), 0.30, r, dur=0.4), 0.3), t + e * b / 2)
        if run and j < len(RUN_LINE):                               # the climb: one chord tone per Go
            place(out["mid"], pan(I.pizz_section(F(RUN_LINE[j]), 0.50 + 0.05 * j, r, dur=0.25, bright=0.6), -0.2), t)
        if not run and i % 4 == 0:
            place(out["sparkle"], pan(I.celesta(F(tones[0] + 12), 0.26, r), -0.2), t)
    return out


def beep(r=None):
    """a bright, friendly lamp beep: a pure tone with a little octave, soft attack, short ring (the SAME on every green Go)"""
    t = tt(0.26)                                                  # a short natural ring (tau 24 ms: a longer ring reads as a second onset)
    y = (np.sin(2 * np.pi * BEEP_HZ * t) + 0.18 * np.sin(2 * np.pi * 2 * BEEP_HZ * t)) * np.exp(-t / 0.024) * (1 - np.exp(-t / 0.004))
    return fades(y, 0.001, 0.08)


def click(r):
    """her plastic dome button (audit r2: it must be HEARD under the Go words without a peak that hits the limiter): a tight
    tick, the dome's own ring (2.6 + 4.1 kHz, 12 ms: energy where the voice is thin) and a small body"""
    t = tt(0.07)
    y = 0.45 * hp(r.standard_normal(len(t)), 2200, 2) * np.exp(-t / 0.0015)            # a low-crest click: the ring carries it
    y += 0.7 * (np.sin(2 * np.pi * 2600 * t) + 0.6 * np.sin(2 * np.pi * 4100 * t)) * np.exp(-t / 0.014) * (1 - np.exp(-t / 0.0006))
    y += 0.6 * np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.008)
    return fades(y, 0.0002, 0.015)


def lamp_on(r):
    """the big lamp lights green: a relay tick and a low soft 'bip' an octave under the Go beep"""
    t = tt(0.22)
    tick = hp(r.standard_normal(len(t)), 3000, 2) * np.exp(-t / 0.0008)
    bip = (np.sin(2 * np.pi * BEEP_HZ / 2 * t) + 0.25 * np.sin(2 * np.pi * BEEP_HZ * t)) * np.exp(-np.clip(t - 0.012, 0, None) / 0.04) * (t > 0.012) * (1 - np.exp(-np.clip(t - 0.012, 0, None) / 0.006))
    return fades(0.6 * tick + bip, 0.0003, 0.04)


def thud(r):
    """the red: a low soft thud (a dull felt hit, a pitch drop): the floor goes out"""
    t = tt(0.3)
    y = np.sin(2 * np.pi * (46 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.004))
    y += 0.15 * lp(r.standard_normal(len(t)), 300, 2) * np.exp(-t / 0.04)
    return fades(y, 0.0005, 0.05)


def red_stab(r):
    """THE RED HIT (the music's last word): a short, wrong-sounding stab: low pizz A + Bb (a minor second) + E-flat over a
    bass A, a tuba 'oom', a snap; short, so the held beat after it is really empty. Stereo."""
    y = np.zeros((2, ns(0.4)))
    for j, m in enumerate((57, 58, 63)):                       # A3 Bb3 Eb4: the floor gives way
        place(y, pan(I.pizz_section(F(m), 0.75, r, dur=0.22, bright=0.7), -0.25 + 0.25 * j), 0.0 + 0.004 * j)
    place(y, pan(I.bass_pizz(F(33), 0.95, r, length=0.22), 0.0), 0.0)
    place(y, pan(I.tuba(F(45), 0.14, 0.7, r), 0.0), 0.0)
    place(y, pan(I.snap(0.6, r), 0.1), 0.0)
    return y


def boom(r):
    """THE RED's body: a sub that drops 90 -> 38 Hz with a 0.16 s body, lightly saturated so its 2nd / 3rd harmonics
    (80-300 Hz) carry it on a phone, plus a short low noise thump"""
    t = tt(0.55)
    f = 38.0 + 52.0 * np.exp(-t / 0.06)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.003))
    y = np.tanh(2.2 * y) / np.tanh(2.2)
    y += 0.35 * lp(r.standard_normal(len(t)), 220, 2) * np.exp(-t / 0.035)
    return fades(y, 0.0005, 0.08)


def crack(r):
    """a bright crack on the cut to red (a slapstick whip: band noise 2.5-6 kHz, between the voice's formants)"""
    t = tt(0.09)
    y = bp(r.standard_normal(len(t)), 2500, 6000, 2) * np.exp(-t / 0.012) * (1 - np.exp(-t / 0.0005))
    return fades(y, 0.0002, 0.01)


def sting(r):
    """'She did.': a small comic button: two pizz notes falling a fifth (A -> D), a woodblock plonk, a glockenspiel wink"""
    n = ns(1.2)
    y = np.zeros((2, n))
    place(y, pan(I.pizz_section(F(69), 0.55, r, dur=0.25), -0.2), 0.0)
    place(y, pan(I.bass_pizz(F(45), 0.6, r, length=0.2), 0.0), 0.0)
    place(y, pan(I.pizz_section(F(62), 0.6, r, dur=0.4), 0.2), 0.16)
    place(y, pan(I.bass_pizz(F(38), 0.7, r, length=0.35), 0.0), 0.16)
    place(y, pan(I.woodblock(0.45, r, f=820.0), 0.1), 0.16)
    place(y, pan(I.glock(F(86), 0.30, r, dur=0.8), -0.1), 0.30)
    return y


def x_pop(r):
    """the big red X popping up: a short bright downward 'bwip' + a tiny pop"""
    t = tt(0.12)
    f = 1700 - 800 * (t / 0.12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04) * (1 - np.exp(-t / 0.002))
    y += 0.4 * hp(r.standard_normal(len(t)), 2500, 2) * np.exp(-t / 0.002)
    return fades(y, 0.0005, 0.02)


def room(n, r):
    """the lab's room in the opening: bright quiet air and a faint 100 Hz ballast family (nothing at 0.8-1.5 kHz)"""
    t = np.arange(n) / SR
    c = lp(hp(colored(n, r, 1.0), 120, 1), 7000, 1)
    d = lp(hp(colored(n, r, 1.0), 120, 1), 7000, 1)
    hum = 0.05 * sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3))
    return np.stack([c + 0.3 * d + hum, c - 0.3 * d + hum])


def lv_to(y, target):
    L = integrated(y)
    return y * dbg(target - L) if np.isfinite(L) else y


def peak_to(y, target_lufs_like):
    """short sounds: set by their 50 ms peak RMS so a click is not scaled by its silence"""
    m = st(y).mean(0)
    w = ns(0.05)
    e = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, "same")).max()
    return y * dbg(target_lufs_like - (20 * np.log10(e + 1e-12) + 3.0))


def gate(n, a, b, ramp_out=0.03, ramp_in=0.12):
    """1 outside [a, b], 0 inside: a fast fade into the held beat, a slower fade back"""
    g = np.ones(n)
    ka, kb = ns(a), ns(b)
    ro, ri = ns(ramp_out), ns(ramp_in)
    g[ka:kb] = 0.0
    g[max(0, ka - ro):ka] = np.linspace(1, 0, min(ro, ka))
    m = min(ri, n - kb)
    if m > 0:
        g[kb:kb + m] = np.linspace(0, 1, m)
    return g


def render_hook(T, L_out, vref=-13.7, seed=2401, after=None):
    """T = clock_v4.Clock.hook_times() (or plan_times()); returns (music (2,n), sfx (2,n), amb (2,n), report, events).
    after = the section the groove returns into after 'She did.' (a score_v4 section dict), default the lab's 112 bounce.
    events = [(t, name, what)] for the cue sheet."""
    r = rng(seed)
    n = ns(L_out)
    ir = make_ir(1.2, seed, hf=0.6, early=((0.009, 0.5, -0.4), (0.015, 0.4, 0.5)))
    go_all = T["go_all"]
    red = T["red"]
    beats, k_pre = beat_grid(go_all)
    G = groove(n, beats, k_pre, red, r)
    dry = sum(G.values())
    wet = convolve_st(sum(G[k] * s for k, s in (("low", 0.05), ("mid", 0.25), ("perc", 0.15), ("sparkle", 0.4))).mean(0), ir)[:, :n]
    mus = dry + 0.5 * wet
    k = ns(red)
    mus[:, k:] = 0.0                                             # the music cuts DEAD on the red (the hall too)
    mus[:, max(0, k - ns(0.004)):k] *= np.linspace(1, 0, min(k, ns(0.004)))[None, :]
    mus = lv_to(mus, vref - LV["music"])
    ev = [(0.0, "music", f"the groove from frame 0: {k_pre} pre-beats of {beats[1] - beats[0]:.3f} s ({60 / (beats[1] - beats[0]):.0f} BPM) fitted to the first Go")]
    # the red stab: music bus, short; the end of the hook's music
    stab = red_stab(r)
    stab = stab + 0.25 * convolve_st(stab.mean(0) * 0.3, ir)[:, :stab.shape[1]]
    sb = np.zeros((2, n))
    place(sb, peak_to(stab, vref - LV["red_stab"]), red)
    # the beat: everything (music, effects, room) dies between the end of "Go!" and "Did" (the room fades back in over
    # the 60 ms before the word)
    b0, b1 = max(T["go7_end"], red + 0.16), T["did"] - 0.04
    g_beat = gate(n, b0, b1, ramp_out=0.05, ramp_in=0.04)
    mus = mus + sb * g_beat[None, :]
    ev.append((red, "red.stab", "THE RED HIT: a low wrong-note pizz stab + tuba + snap (the music's last word)"))
    # the groove returns after "She did." (the lab's section starts there)
    sd0 = T["she"]
    sec = after or dict(name="lab", t0=sd0 + 0.30, t1=L_out, bpm=112, style="bounce", prog=["F", "C", "Dm", "Bb"], lu=17.5)
    sec = dict(sec)
    sec["t0"] = max(sec["t0"], sd0 + 0.30)
    if sec["t0"] < L_out - 0.5:
        back, _ = S4.render([sec], L_out, vref, tail=0.0)
        a = ns(sec["t0"])
        fade = np.clip((np.arange(n) - a) / max(1, ns(60.0 / sec["bpm"])), 0, 1)
        mus = mus + back[:, :n] * fade[None, :]
        ev.append((sec["t0"], "music", f"the groove returns: the lab's section ({sec['bpm']} BPM {sec['style']})"))
    stg = sting(r)
    stg = stg + 0.5 * convolve_st(stg.mean(0) * 0.35, ir)[:, :stg.shape[1]]
    s_buf = np.zeros((2, n))
    place(s_buf, stg, sd0 + 0.02)
    d_on, d_off = (T["she_did"][0] + 0.17, T["she_did"][1] + 0.05) if T.get("she_did") else (sd0 + 0.17, sd0 + 0.6)
    tt_ = np.arange(n) / SR                                       # the sting steps back under "did." (its second hit lands there)
    s_env = dbg(STING_DUCK_DB * np.clip(np.minimum((tt_ - (d_on - 0.03)) / 0.03, (d_off + 0.05 - tt_) / 0.05), 0, 1))
    mus = mus + lv_to(s_buf, vref - LV["sting"]) * s_env[None, :]
    ev.append((sd0 + 0.02, "sting", "the sting on the red X ('She'): two falling pizz notes, a woodblock, a glock wink"))
    # effects
    fx = np.zeros((2, n))
    if T.get("green") is not None:
        place(fx, pan(peak_to(lamp_on(r), vref - LV["lamp"]), 0.0), T["green"])
        lr = rec("lamp", 0.45)
        if lr is not None:
            lr = lr * np.exp(-np.clip(np.arange(lr.shape[1]) / SR - 0.2, 0, None) / 0.04)[None, :]
        if lr is not None:
            place(fx, peak_to(lr, vref - LV["lamp"] - 3.0), T["green"] - 0.01)
        ev.append((T["green"], "lamp.green", "the big lamp lights green (v02's cut): a relay tick and a low bip"))
    bp_ = peak_to(beep(), vref - LV["beep"])
    ck = peak_to(click(r), vref - LV["click"])
    press = T.get("press") or [t + PRESS_LAG for t in T["go"]]   # the DIRECTOR's EV.press (the fingertip lands), else the fallback lag
    for i, t in enumerate(T["go"]):                               # the six green flashes: identical beeps
        place(fx, pan(bp_, 0.0), t)
        place(fx, pan(ck, 0.05), press[i])
        ev.append((t, f"go.beep{i + 1}", f"green flash {i + 1}: the lamp's beep (on the flash)"))
        ev.append((press[i], f"go.press{i + 1}", f"her fingertip lands ({(press[i] - t) * 30:.1f} f after flash {i + 1}, EV.press): the button's click"))
    hit = np.zeros((2, n))
    rr = rec("red", 0.30)
    if rr is not None:
        rr = rr * np.exp(-np.clip(np.arange(rr.shape[1]) / SR - 0.12, 0, None) / 0.03)[None, :]   # dies before its cut: no click at the end
    if rr is not None:
        place(hit, peak_to(rr, vref - LV["red_thud"]), red)
    else:
        place(hit, pan(peak_to(thud(r), vref - LV["red_thud"]), 0.0), red + 0.005)
    place(hit, pan(peak_to(crack(r), vref - LV["red_crack"]), 0.0), red)
    place(hit, pan(peak_to(boom(r), vref - LV["red_boom"]), 0.0), red)
    red_press = T.get("red_press") if T.get("red_press") is not None else red + RED_PRESS_LAG
    place(hit, pan(peak_to(click(r), vref - LV["press"]), 0.05), red_press)
    fx = fx + hit * g_beat[None, :]
    ev.append((red, "red.hit", "the cut to RED: a boom with body, the recorded hit, a bright crack (the loudest effect of the film)"))
    ev.append((red_press, "red.press", f"her hand comes down anyway (EV.redPress, {(red_press - red) * 30:.1f} f after the red): her button's click"))
    place(fx, pan(peak_to(x_pop(r), vref - LV["xpop"]), 0.1), sd0)
    ev.append((sd0, "x.pop", "the big red X pops up"))
    # room tone: the lab, cut with the music on the red, back 0.12 s before "Did you tap?"
    amb = lv_to(room(n, r), vref - LV["room"]) * g_beat[None, :]
    ev.append((b0, "BEAT", f"the held beat: music, effects and room at zero from {b0:.3f} to {b1:.3f} s ({b1 - b0:.2f} s; the voice's room tone only)"))
    ev.append((b1, "room.back", "the room fades back in under 'Did you tap?' (no music: the question hangs)"))
    mus = mus * g_beat[None, :]
    rep = dict(beats=[round(b, 3) for b in beats], k_pre=k_pre, go=[round(g, 3) for g in go_all], red=round(red, 3), beat=[round(b0, 3), round(b1, 3)],
               beat_s=round(b1 - b0, 3), sting=round(sd0 + 0.02, 3), groove_back=round(sec["t0"], 3), first_gap=round(go_all[1] - go_all[0], 3),
               last_gap=round(go_all[-1] - go_all[-2], 3), pre_beat=round(beats[1] - beats[0], 3) if len(beats) > 1 else None)
    return mus, fx, amb, rep, sorted(ev)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--clock", default=None)
    ap.add_argument("--words", default=None)
    ap.add_argument("--out", default=os.path.join(HERE, "_hook_v4_test.wav"))
    a = ap.parse_args()
    try:
        import clock_v4
        C = clock_v4.Clock(a.clock, a.words)
        T = C.hook_times()
        print(C.summary())
    except Exception as ex:  # noqa
        print("no clock (", ex, "): plan times")
        T = plan_times()
    mus, fx, amb, rep, ev = render_hook(T, 10.0)
    y = mus + fx + amb
    write_wav(a.out, y)
    for k, x in (("music", mus), ("fx", fx), ("amb", amb)):
        write_wav(a.out.replace(".wav", f"_{k}.wav"), x)
    rep.update(times=T, lufs=integrated(y), music_lufs=integrated(mus), fx_peak_dbfs=float(20 * np.log10(np.abs(fx).max() + 1e-12)), events=ev)
    json.dump(rep, open(a.out.replace(".wav", ".json"), "w"), indent=1, default=float)
    print(json.dumps({k: v for k, v in rep.items() if k != "events"}, indent=1, default=float))
