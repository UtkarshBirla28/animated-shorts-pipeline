"""SHOUT SWAP (sound #3, 2026-11-21, audit round 1): replace a shout inside the INSTALLED voice (sound/pointing/voice_v4/)
with another take, WITHOUT moving any narrator word. Nothing is time-stretched: the take is cut at its own onset / end
and laid in the narrator's gap; the old shout's samples are replaced by the voice's own room tone (no digital silence).

  python -s pt5_shout_swap.py            -> applies SWAPS below to voice_v4/ (backup: voice_v4/_before_shout_swap/)

What it writes: voice_v4/voice.wav, words.json, words_spoken.json, phrases.json (only the swapped shouts' words / phrases
change), and voice_v4/shout_swap.json (old / new times, takes, gains). studio/src/.../v4/words.ts is NOT touched: the
DIRECTOR re-imports the shout words if he wants the picture on the new onsets (they move by at most 2 frames)."""
import json
import os
import shutil
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_lib as L  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
VDIR = os.path.join(HERE, "..", "voice_v4")
BACK = os.path.join(VDIR, "_before_shout_swap")
SR = 48000
# id: (take, new onset in the film (s), why)
SWAPS = {
    "D": ("v4_D/t7", 34.12, "Hideo [shouting]: 305 Hz (5.6 st over the narrator's line before, 219.6 Hz), tilt -5.4 dB (t4 -13.8 = the narrator's), "
                             "10-16 kHz -15.3 dB; 1.085 s: laid 65 ms earlier so 'clear!' ends on the hard cut to the steam engine"),
    "C": ("v4_C/t5", 46.59, "Manato [shouting, grinning]: 336 Hz, voiced 6-12 kHz -15.9 dB (Taro t2 -26.0), 10-16 kHz -29.1 (t2 -34.4; James's "
                             "own 'Now try again.' -28.2: no sibilant in 'Clear!'); 0.715 s: laid 40 ms earlier to keep 75 ms before 'His'"),
}
SPK_LINE = {"D": "L12", "H": "L14", "C": "L16"}


def env_db(x, hop=0.005, win=0.01):
    return L.db_frames(x, hop_s=hop, win_s=win)


def take_cut(name):
    """the take from its onset (-30 dB under its peak, 10 ms lead) to its end (-40 dB), and the word split from its alignment"""
    x = L.read(os.path.join(HERE, "takes", name + ".mp3"))
    d = env_db(x)
    pk = d.max()
    on = max(0.0, np.argmax(d > pk - 30) * 0.005 - 0.01)
    off = (len(d) - np.argmax(d[::-1] > pk - 36)) * 0.005 + 0.005
    seg = x[int(on * SR):int(off * SR)].copy()
    n_in, n_out = int(0.004 * SR), int(0.035 * SR)
    seg[:n_in] *= np.linspace(0, 1, n_in)
    seg[-n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    al = json.load(open(os.path.join(HERE, "takes", name + ".json"), encoding="utf-8"))["alignment"]
    ch, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    txt = "".join(ch)
    k0 = txt.find("]") + 1 if txt.startswith("[") else 0
    words, cur, ws = [], "", None
    for i in range(k0, len(ch)):
        c = ch[i]
        if c == " ":
            if cur:
                words.append([cur, ws, cs[i]])
            cur, ws = "", None
            continue
        if ws is None:
            ws = cs[i]
        cur += c
    if cur:
        words.append([cur, ws, off])
    words[0][1] = on + 0.01                                       # the first word starts on the energy onset (the alignment lags it)
    words[-1][2] = off - 0.01
    return seg, on, off, [(w, s - on, e - on) for w, s, e in words]


def main():
    if not os.path.isdir(BACK):                                   # the untouched install is kept once; every run starts from it
        os.makedirs(BACK)
        for f in ("voice.wav", "words.json", "words_spoken.json", "phrases.json"):
            shutil.copy2(os.path.join(VDIR, f), os.path.join(BACK, f))
    y, sr = sf.read(os.path.join(BACK, "voice.wav"), dtype="float64")
    assert sr == SR
    two = y.ndim > 1
    m = y.mean(1) if two else y.copy()
    W = json.load(open(os.path.join(BACK, "words.json"), encoding="utf-8"))
    WS = json.load(open(os.path.join(BACK, "words_spoken.json"), encoding="utf-8"))
    P = json.load(open(os.path.join(BACK, "phrases.json"), encoding="utf-8"))
    # the voice's own room tone: its quietest 0.3 s inside the held beat (6.2-6.6 s)
    room = m[int(6.22 * SR):int(6.52 * SR)].copy()
    rep = []
    for spk, (name, t_on, why) in SWAPS.items():
        ph = next(p for p in P if p.get("speaker") == spk)
        old_s, old_e = ph["s"], ph["e"]
        # the neighbours: the narrator words before and after (must not be touched)
        before = max(w["e"] for w in W if w["e"] <= old_s + 1e-6)
        after = min(w["s"] for w in W if w["s"] >= old_e - 1e-6)
        seg, on, off, ws = take_cut(name)
        t_end = t_on + len(seg) / SR
        assert t_on >= before + 0.07 and t_end <= after - 0.04, f"{spk}: {t_on:.3f}-{t_end:.3f} does not fit {before:.3f}-{after:.3f}"
        # level: the new take's speech RMS to the old shout's
        a_old, b_old = int((old_s - 0.01) * SR), int((old_e + 0.02) * SR)
        old = m[a_old:b_old]
        rms = lambda z: np.sqrt(np.mean(z ** 2)) + 1e-12
        act = lambda z: z[np.abs(z) > 0.05 * np.abs(z).max()]
        g = rms(act(old)) / rms(act(seg))
        seg = seg * g
        # clear the old shout's region (from the narrator word before + 30 ms to the word after - 30 ms) to room tone
        ca, cb = int((before + 0.03) * SR), int((after - 0.03) * SR)
        fill = np.resize(room, cb - ca)
        xf = int(0.01 * SR)
        w_ = np.ones(cb - ca)
        w_[:xf] = np.linspace(0, 1, xf)
        w_[-xf:] = np.linspace(1, 0, xf)
        new = m[ca:cb] * (1 - w_) + fill * w_
        k = int(round(t_on * SR)) - ca
        new[k:k + len(seg)] += seg
        if two:
            for c in range(y.shape[1]):
                y[ca:cb, c] = new
        else:
            y[ca:cb] = new
        m[ca:cb] = new
        nw = [dict(w=w, s=round(t_on + s, 3), e=round(t_on + e, 3)) for w, s, e in ws]
        # words.json / words_spoken.json: the shout's words replaced in place (same count, same order)
        idx = [i for i, w in enumerate(W) if old_s - 1e-6 <= w["s"] <= old_e + 1e-6]
        assert len(idx) == len(nw), (spk, idx, nw)
        for i, w in zip(idx, nw):
            W[i]["s"], W[i]["e"] = w["s"], w["e"]
        idx2 = [i for i, w in enumerate(WS) if w.get("speaker") == spk]
        for i, w in zip(idx2, nw):
            WS[i]["s"], WS[i]["e"] = w["s"], w["e"]
        ph.update(s=nw[0]["s"], e=nw[-1]["e"], take=name, heard=None, swap_note=why)
        rep.append(dict(speaker=spk, line=SPK_LINE[spk], old_take=None, new_take=name, old=[old_s, old_e], new=[nw[0]["s"], nw[-1]["e"]],
                        words=nw, gain_db=round(20 * np.log10(g), 2), narrator_before_end=before, narrator_after_start=after, why=why))
    pk = np.abs(y).max()
    assert pk < 0.9, f"peak {pk:.3f}"
    sf.write(os.path.join(VDIR, "voice.wav"), y, SR, subtype="PCM_24" if sf.info(os.path.join(BACK, "voice.wav")).subtype == "PCM_24" else "PCM_16")
    json.dump(W, open(os.path.join(VDIR, "words.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    json.dump(WS, open(os.path.join(VDIR, "words_spoken.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    json.dump(P, open(os.path.join(VDIR, "phrases.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    json.dump(rep, open(os.path.join(VDIR, "shout_swap.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    for r in rep:
        print(r["speaker"], r["new_take"], "old", r["old"], "new", r["new"], "gain", r["gain_db"], [(w["w"], w["s"], w["e"]) for w in r["words"]])
    print("peak %.3f" % pk)


if __name__ == "__main__":
    main()
