# THE HOOK of v4 (SCRIPT_v4.md lines 1-3: "Tap your foot on every green light. Only green." / "Go. Go. Go. Go. Go. Go. Go!"
# / "Did you tap? She did."). Its sound is half the trick:
#   - a foot-tapping GROOVE from frame 0 whose beat the seven "Go"s ride: under line 1 it runs at the first Go gap (fitted so
#     frame 0 is a downbeat), then every Go is a beat and the beat speeds up with them (gaps about 0.48 -> 0.27 s);
#   - a bright, friendly BEEP + a soft button CLICK on every Go, all at the SAME pitch, the seventh too (the ear says "go"
#     while the eye says "stop": the lamp is red on the seventh);
#   - on the red: the music cuts DEAD (dry and hall), a low soft THUD, then 0.5 s of room tone only (the film's one stop);
#   - on "She did." a small comic STING, and the groove returns (the lab's section).
# Times: the "Go" onsets are the voice's words (VOICE publishes them in words.json, line 2); until the voice lands, a PLAN
# grid (plan_go()). Line 22 ("Now try again...") hands the same groove back into frame 0 (score_v4's loop section).
# usage: python -s hook_v4.py --test     -> _hook_v4_test.wav (the first 10 s on plan times, no voice), _hook_v4_test.json
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
KEY = ["Dm", "Bb", "Gm", "A7"]   # the hook's chords, one per bar of 4 beats (the Go run sits on the A7 bar: it wants to resolve)
LV = dict(music=16.0, beep=11.0, click=21.0, thud=15.0, sting=13.0, room=46.0)   # LU under the voice


def plan_go(t1_end=2.85, first_gap=0.48, last_gap=0.27, n=7):
    """the plan grid: seven onsets, the gaps shrinking geometrically from first_gap to last_gap (span about 2.2 s)"""
    r = (last_gap / first_gap) ** (1.0 / (n - 2))
    gaps = [first_gap * r ** k for k in range(n - 1)]
    g1 = 2.88                                                     # 6 beats of 0.48 s after frame 0: line 1 must end before it
    return [g1 + sum(gaps[:k]) for k in range(n)]


def plan_times():
    go = plan_go()
    red = go[-1]
    return dict(line1=(0.10, 2.83), go=go, red=red, silence=(red + 0.05, red + 0.55), line3=(red + 0.55, red + 2.15),
                she_did=(red + 1.55, red + 2.15), line4=red + 2.40)


def beat_grid(go):
    """the beats: frame 0 .. the first Go at the first gap (fitted to a whole number of beats so frame 0 is a downbeat),
    then the Go onsets themselves"""
    g1, gap1 = go[0], go[1] - go[0]
    k = max(1, round(g1 / gap1))
    pre = [g1 - j * (g1 / k) for j in range(k, 0, -1)]
    return pre + list(go)


def groove(n, beats, stop_at, r):
    """the foot-tapping groove on an arbitrary beat list (it speeds up with the Gos): a soft low 'foot' on every beat, the
    upright bass on 1 and 3 of each 4, snaps on 2 and 4, shaker on the off-beats, a marimba 8th ostinato, a celesta lift on
    the run. Everything stops dead at stop_at."""
    out = {k: np.zeros((2, n)) for k in ("low", "mid", "perc", "sparkle")}
    for i, t in enumerate(beats):
        if t >= stop_at - 1e-6:
            break
        nxt = beats[i + 1] if i + 1 < len(beats) else t + (t - beats[i - 1])
        b = nxt - t
        bar, pos = divmod(i, 4)
        root, iv = S4.chord(KEY[bar % len(KEY)])
        # the 'foot': a short low thump (a felt-mallet kick) so the body can tap along
        k = tt(0.16)
        foot = np.sin(2 * np.pi * (58 + 40 * np.exp(-k / 0.02)) * k) * np.exp(-k / 0.05) * (1 - np.exp(-k / 0.002))
        place(out["low"], pan(foot * (0.55 if pos in (0, 2) else 0.40), 0.0), t)
        if pos in (0, 2):
            place(out["low"], pan(I.bass_pizz(F(38 + root + (7 if pos == 2 and i % 8 >= 4 else 0)), 0.75, r, length=min(0.4, 0.9 * b)), 0.0), t)
        if pos in (1, 3):
            place(out["perc"], pan(I.snap(0.42, r), 0.2), t)
        place(out["perc"], pan(I.shaker(0.22, r, dur=0.08), 0.35), t + b / 2)
        tones = [72 + root + j for j in iv]
        for e in range(2):
            m = [tones[0] - 12, tones[2 % len(tones)] - 12, tones[1] - 12, tones[2 % len(tones)] - 12][(2 * pos + e) % 4]
            place(out["mid"], pan(I.marimba(F(m), 0.30, r, dur=0.4), 0.3), t + e * b / 2)
        if i >= len(beats) - 7 and pos == 0:                    # the run: a celesta lift on each bar start
            place(out["sparkle"], pan(I.celesta(F(tones[0] + 12), 0.30, r), -0.2), t)
    return out


def beep(r=None):
    """a bright, friendly lamp beep: a pure tone with a little octave, soft attack, short ring (the SAME on every Go)"""
    t = tt(0.16)
    y = (np.sin(2 * np.pi * BEEP_HZ * t) + 0.18 * np.sin(2 * np.pi * 2 * BEEP_HZ * t)) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.004))
    return fades(y, 0.001, 0.03)


def click(r):
    """a soft plastic button click (a tight noise tick + a small body), under the beep"""
    t = tt(0.05)
    y = hp(r.standard_normal(len(t)), 2200, 2) * np.exp(-t / 0.0015) + 0.6 * np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.008)
    return fades(y, 0.0002, 0.01)


def thud(r):
    """the red: a low soft thud (a dull felt hit, a pitch drop): the floor goes out"""
    t = tt(0.6)
    y = np.sin(2 * np.pi * (46 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.18) * (1 - np.exp(-t / 0.004))
    y += 0.15 * lp(r.standard_normal(len(t)), 300, 2) * np.exp(-t / 0.05)
    return fades(y, 0.0005, 0.08)


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


def room(n, r):
    c = lp(hp(colored(n, r, 1.0), 60, 1), 5000, 1)
    return np.stack([c, c])


def lv_to(y, target):
    L = integrated(y)
    return y * dbg(target - L) if np.isfinite(L) else y


def peak_to(y, target_lufs_like):
    """short sounds: set by their 50 ms peak RMS so a click is not scaled by its silence"""
    m = st(y).mean(0)
    w = ns(0.05)
    e = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, "same")).max()
    return y * dbg(target_lufs_like - (20 * np.log10(e + 1e-12) + 3.0))


def render_hook(T, L_out, vref=-13.7, seed=2401, after=None):
    """T = plan_times() (or the voice's); returns (music (2,n), sfx (2,n), amb (2,n), report). after = the section that
    the groove returns into on 'She did.' (a score_v4 section dict), default: the lab's 112 BPM bounce"""
    r = rng(seed)
    n = ns(L_out)
    ir = make_ir(1.2, seed, hf=0.6, early=((0.009, 0.5, -0.4), (0.015, 0.4, 0.5)))
    beats = beat_grid(T["go"])
    G = groove(n, beats, T["red"], r)
    dry = sum(G.values())
    wet = convolve_st(sum(G[k] * s for k, s in (("low", 0.05), ("mid", 0.25), ("perc", 0.15), ("sparkle", 0.4))).mean(0), ir)[:, :n]
    mus = dry + 0.5 * wet
    k = ns(T["red"])
    mus[:, k:] = 0.0                                             # the music cuts DEAD on the red (the hall too)
    mus[:, max(0, k - ns(0.004)):k] *= np.linspace(1, 0, min(k, ns(0.004)))[None, :]
    mus = lv_to(mus, vref - LV["music"])
    # the groove returns on "She did." (the lab's section starts there)
    sd0 = T["she_did"][0]
    sec = after or dict(name="lab", t0=sd0 + 0.30, t1=L_out, bpm=112, style="bounce", prog=["F", "C", "Dm", "Bb"], lu=17.5)
    back, _ = S4.render([sec], L_out, vref, tail=0.0)
    # (score_v4.render folds a tail onto frame 0; with tail 0 nothing folds) the returning groove fades in over one beat
    a = ns(sec["t0"])
    fade = np.clip((np.arange(n) - a) / max(1, ns(60.0 / sec["bpm"])), 0, 1)
    mus = mus + back[:, :n] * fade[None, :]
    stg = sting(r)
    stg = stg + 0.5 * convolve_st(stg.mean(0) * 0.35, ir)[:, :stg.shape[1]]
    s_buf = np.zeros((2, n))
    place(s_buf, stg, sd0 + 0.02)
    mus = mus + lv_to(s_buf, vref - LV["sting"])
    # effects: a beep + a click on every Go (the same, the seventh too); the thud on the red
    fx = np.zeros((2, n))
    bp_ = peak_to(beep(), vref - LV["beep"])
    ck = peak_to(click(r), vref - LV["click"])
    for t in T["go"]:
        place(fx, pan(bp_, 0.0), t)
        place(fx, pan(ck, 0.05), t + 0.004)
    place(fx, pan(peak_to(thud(r), vref - LV["thud"]), 0.0), T["red"] + 0.01)
    # room tone everywhere (so the stop is a room, not digital silence)
    amb = lv_to(room(n, r), vref - LV["room"])
    rep = dict(beats=[round(b, 3) for b in beats], go=[round(g, 3) for g in T["go"]], red=round(T["red"], 3), stop=[round(x, 3) for x in T["silence"]],
               sting=round(sd0 + 0.02, 3), groove_back=round(sec["t0"], 3), first_gap=round(T["go"][1] - T["go"][0], 3), last_gap=round(T["go"][-1] - T["go"][-2], 3),
               pre_beat=round(beats[1] - beats[0], 3) if len(beats) > 1 else None)
    return mus, fx, amb, rep


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "_hook_v4_test.wav"))
    a = ap.parse_args()
    T = plan_times()
    mus, fx, amb, rep = render_hook(T, 10.0)
    y = mus + fx + amb
    write_wav(a.out, y)
    write_wav(a.out.replace(".wav", "_music.wav"), mus)
    write_wav(a.out.replace(".wav", "_fx.wav"), fx)
    rep.update(plan=T, lufs=integrated(y), music_lufs=integrated(mus), fx_peak_dbfs=float(20 * np.log10(np.abs(fx).max() + 1e-12)))
    json.dump(rep, open(a.out.replace(".wav", ".json"), "w"), indent=1, default=float)
    print(json.dumps(rep, indent=1, default=float))
