# Measures a finished mix (nothing is played):
#   1. SYNC: every sharp cue of sound_times.json against the onset really found in stem_sfx.wav (fails over 1 frame early / 2 late)
#   2. HOOK: the first 12 s in 0.25 s steps: each stem's level and the strongest tones (the motor whine, the clicks, no music before cut 1)
#   3. LOOP: the last 0.5 s and the first 0.5 s as ONE piece: level per 20 ms, the largest sample step, the spectrum on both sides
#   4. loudness with ffmpeg (ebur128) on mix.wav and on an AAC encode of it (what the muxed film will carry)
# usage: python -s check_mix.py [--tag name]
import json
import os
import subprocess
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, ns, read_wav
import mixlib as M

TAG = ("_" + sys.argv[sys.argv.index("--tag") + 1]) if "--tag" in sys.argv else ""
SHARP = {"rail_click": 0.0, "fwip": 0.0, "suit_bump": 0.0, "suit_catch": 0.0, "sneaker_hook": 0.0, "jar_ball": 0.0, "relay_click": 0.0, "door_slide": 0.0, "pats": 0.0,
         "step": 0.0, "button": 0.0, "bubble_pop": 0.0, "cap_drop": 0.0, "suit_stop": 0.0}


def db(x):
    return float(20 * np.log10(np.sqrt(np.mean(np.asarray(x) ** 2)) + 1e-12))


def main():
    f = lambda n: os.path.join(HERE, n)
    y, _ = read_wav(f(f"mix{TAG}.wav"))
    st_ = {k: read_wav(f(f"stem_{k}{TAG}.wav"))[0] for k in ("voice", "music", "sfx", "amb")}
    times = json.load(open(f(f"sound_times{TAG}.json"), encoding="utf-8"))
    N = y.shape[1]
    L = N / SR
    out = {}
    # ---------------------------------------------------------------- 1. sync
    sx = st_["sfx"].mean(0)
    hop = ns(0.002)
    env = np.sqrt(np.convolve(sx ** 2, np.ones(hop) / hop, "same")[::hop] + 1e-14)
    rows = []
    for c in times["cues"]:
        if c["sound"] not in SHARP:
            continue
        t = c["t"] % L if c["t"] >= 0 else c["t"] + L
        a, b = int((t - 0.045) * SR / hop), int((t + 0.09) * SR / hop)       # -1 frame .. +2 frames, with 12 / 23 ms of grace
        idx = np.arange(a, b) % len(env)
        e = env[idx]
        base = np.median(env[np.arange(a - 60, a) % len(env)]) + 1e-9
        pk = int(np.argmax(e))
        rows.append(dict(id=c["id"], t=round(c["t"], 3), peak=round((a + pk) * hop / SR - t, 4), rise_db=round(float(20 * np.log10(e.max() / base)), 1),
                         edge=bool(pk <= 1 or pk >= len(e) - 2)))
    late = [r for r in rows if r["edge"] and r["rise_db"] >= 3]        # the loudest moment sits on the window's edge: the sound peaks outside it
    weak = [r for r in rows if r["rise_db"] < 3]
    out["sync"] = dict(checked=len(rows), peak_outside_window=late, no_rise=[r["id"] for r in weak], rows=rows)
    print(f"1. SYNC: {len(rows)} sharp cues looked up in stem_sfx (window -1 f .. +2 f round the cue): {len(late)} peak outside it, {len(weak)} do not rise 3 dB over the 120 ms before")
    for r in late:
        print(f"     {r['id']:14s} cue {r['t']:7.3f}  loudest at {r['peak'] * 1000:+6.0f} ms (window edge)  rise {r['rise_db']} dB")
    if weak:
        print("     no clear rise (soft by design, or under a louder sound): " + ", ".join(f"{r['id']} ({r['rise_db']} dB)" for r in weak))
    # ---------------------------------------------------------------- 2. hook
    print("2. HOOK, 0.25 s steps: voice / music / sfx / amb in dBFS RMS, then the strongest tones of sfx + amb (Hz)")
    hook = []
    for i in range(0, 48):
        a, b = ns(i * 0.25), ns((i + 1) * 0.25)
        seg = (st_["sfx"] + st_["amb"])[:, a:b].mean(0)
        S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        band = (fr > 200) & (fr < 4500)
        ratio = 10 * np.log10(S[band] / (signal.medfilt(S[band], 31) + 1e-20))
        pk, _ = signal.find_peaks(ratio, height=9, distance=4)
        pk = sorted(sorted(pk, key=lambda j: -ratio[j])[:4])
        row = dict(t=i * 0.25, voice=db(st_["voice"][:, a:b]), music=db(st_["music"][:, a:b]), sfx=db(st_["sfx"][:, a:b]), amb=db(st_["amb"][:, a:b]), tones=[int(fr[band][j]) for j in pk])
        hook.append(row)
        print(f"   {row['t']:5.2f}  v {row['voice']:6.1f}  m {row['music']:6.1f}  s {row['sfx']:6.1f}  a {row['amb']:6.1f}   {row['tones']}")
    out["hook"] = hook
    # ---------------------------------------------------------------- 3. loop
    w = ns(0.5)
    piece = np.concatenate([y[:, -w:], y[:, :w]], axis=1)
    steps = np.abs(np.diff(piece, axis=1)).max(0)
    seam_step = float(steps[w - 1])
    p999 = float(np.percentile(steps, 99.9))
    lv = [db(piece[:, i:i + ns(0.02)]) for i in range(0, 2 * w, ns(0.02))]
    nb = (st_["music"] + st_["sfx"] + st_["amb"])
    pn = np.concatenate([nb[:, -w:], nb[:, :w]], axis=1)
    lvn = [db(pn[:, i:i + ns(0.02)]) for i in range(0, 2 * w, ns(0.02))]
    bands = [(150, 500), (500, 1500), (1500, 4000), (4000, 10000)]

    def spec(z):
        S = np.abs(np.fft.rfft(z.mean(0) * np.hanning(z.shape[1]))) ** 2
        fr = np.fft.rfftfreq(z.shape[1], 1 / SR)
        return [round(float(10 * np.log10(S[(fr >= a) & (fr < b)].sum() + 1e-20)), 1) for a, b in bands]
    k = ns(0.06)
    out["loop"] = dict(seam_sample_step=seam_step, step_p99_9_around=p999, level_20ms_mix=lv, level_20ms_no_voice=lvn,
                       no_voice_spectrum_60ms_before=spec(nb[:, -k:]), no_voice_spectrum_60ms_after=spec(nb[:, :k]),
                       no_voice_level_60ms_before=db(nb[:, -k:]), no_voice_level_60ms_after=db(nb[:, :k]))
    print(f"3. LOOP: the sample step AT the seam {seam_step:.5f}; the 99.9th percentile of the steps in the second around it {p999:.5f}")
    print("   mix, 20 ms steps, last 0.2 s | first 0.2 s: " + " ".join(f"{v:.0f}" for v in lv[15:25]) + "  |  " + " ".join(f"{v:.0f}" for v in lv[25:35]))
    print("   without the voice:                           " + " ".join(f"{v:.0f}" for v in lvn[15:25]) + "  |  " + " ".join(f"{v:.0f}" for v in lvn[25:35]))
    print(f"   without the voice, 60 ms before / after the seam: {out['loop']['no_voice_level_60ms_before']:.1f} / {out['loop']['no_voice_level_60ms_after']:.1f} dBFS; "
          f"bands {out['loop']['no_voice_spectrum_60ms_before']} / {out['loop']['no_voice_spectrum_60ms_after']}")
    # ---------------------------------------------------------------- 3b. harshness: the 2.5-6 kHz band of everything that is not the voice
    sosh = signal.butter(4, [2500.0, 6000.0], btype="bandpass", fs=SR, output="sos")
    hb = signal.sosfilt(sosh, nb.mean(0))
    hv = signal.sosfilt(sosh, st_["voice"].mean(0))
    h = ns(0.05)
    lb = 10 * np.log10((hb[: len(hb) // h * h] ** 2).reshape(-1, h).mean(1) + 1e-14)
    lvv = 10 * np.log10((hv[: len(hv) // h * h] ** 2).reshape(-1, h).mean(1) + 1e-14)
    v95 = float(np.percentile(lvv[lvv > -70], 95))
    hot = [(round(i * 0.05, 2), round(float(x), 1)) for i, x in enumerate(lb) if x > v95 - 6.0]
    runs, cur = [], None
    for t_, x in hot:
        if cur and t_ - cur[1] <= 0.051:
            cur[1], cur[2] = t_, max(cur[2], x)
        else:
            cur = [t_, t_, x]
            runs.append(cur)
    out["harsh"] = dict(voice_p95_db=v95, bed_max_db=float(lb.max()), runs_within_6db_of_voice=[dict(a=a, b=round(b + 0.05, 2), max_db=m, vs_voice=round(m - v95, 1)) for a, b, m in runs])
    print(f"3b. HARSHNESS (2.5-6 kHz, 50 ms): the voice's loud consonants sit at {v95:.1f} dB; everything else peaks at {lb.max():.1f} dB ({lb.max() - v95:+.1f}); "
          f"{len(runs)} moments within 6 dB of the voice there: " + ", ".join(f"{a:.2f}-{b + 0.05:.2f} s ({m - v95:+.1f})" for a, b, m in runs[:14]))
    # ---------------------------------------------------------------- 4. loudness, also after AAC
    eb = M.ffmpeg_ebur(f(f"mix{TAG}.wav"))
    aac = f(f"_check{TAG}.m4a")
    try:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", f(f"mix{TAG}.wav"), "-c:a", "aac", "-b:a", "256k", aac], check=True)
        eb2 = M.ffmpeg_ebur(aac)
        os.remove(aac)
    except Exception as ex:  # noqa
        eb2 = {"error": str(ex)}
    out["loudness"] = dict(wav=eb, aac_256k=eb2)
    print(f"4. LOUDNESS (ffmpeg ebur128): wav {eb}; after AAC 256k {eb2}")
    json.dump(out, open(f(f"check_mix{TAG}.json"), "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
