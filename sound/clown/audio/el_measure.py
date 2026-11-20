# MEASURES every sample the film may use (read-only, nothing is played): _el/ generations and _lib/ CC0 recordings.
# Per file: length, sample peak, clipped samples, RMS, share of silence, onset, attack, spectral centroid, flatness,
# energy in the 3 strongest partials (a bare oscillator is ~95 %+), how the spectrum moves inside the sound, how many
# separate events it holds; for horns the pitch of each squeeze; for anything that must be WORDLESS (phone murmurs,
# crowd, ambience, headphone leak) and for every long take a speech check with faster-whisper (the project's own
# recogniser): recognised words and their probability, raw and after the film's muffle (250-1500 Hz).
# Writes samples_measured.json and samples_reject.json (takes that fail: clipping, mostly silence, no clear event, words
# where there must be none). usage: python -s el_measure.py [--no-whisper]
import json
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, bp  # noqa: E402
import samples as S  # noqa: E402

db = lambda p: 10 * np.log10(p + 1e-14)
WORDLESS = ("murmur_f", "murmur_m", "crowd", "square_amb", "headphones", "crowd_ooh", "crowd_laugh", "man_sigh", "gasp_f", "hm_f", "laugh_m", "laugh_f", "yelp")
_WM = None


def whisper_words(x):
    """[(word, probability)] heard by faster-whisper medium in mono 48 kHz x"""
    global _WM
    from faster_whisper import WhisperModel
    if _WM is None:
        _WM = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    pcm = signal.resample_poly(x, 1, 3).astype(np.float32)
    pcm = pcm / (np.max(np.abs(pcm)) + 1e-9) * 0.5
    pcm = np.concatenate([np.zeros(3200, np.float32), pcm, np.zeros(4800, np.float32)])
    segs, _ = _WM.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    out = []
    for sg in segs:
        for w in sg.words or []:
            out.append((w.word.strip(), round(float(w.probability), 2), round(float(sg.no_speech_prob), 2)))
    return out


def f0_of(seg):
    p = seg * np.hanning(len(seg))
    ac = np.correlate(p, p, "full")[len(p) - 1:]
    lo, hi = int(SR / 1200), int(SR / 150)
    if hi >= len(ac):
        return 0.0, 0.0
    j = lo + int(np.argmax(ac[lo:hi]))
    return SR / j, float(ac[j] / (ac[0] + 1e-12))


def measure(name, x):
    n = len(x)
    e = S.env(x, 0.003)
    pk = float(np.max(np.abs(x)))
    clipped = int(np.sum(np.abs(x) >= 0.999 * pk)) if pk > 0 else 0
    quiet = float(np.mean(e < e.max() * 10 ** (-50 / 20)))
    on = S.onset(x)
    k10, k90 = int(np.argmax(e >= 0.1 * e.max())), int(np.argmax(e >= 0.9 * e.max()))
    f, Pw = signal.welch(x, SR, nperseg=min(4096, max(256, n // 2)))
    k = f > 60
    cen = float((f[k] * Pw[k]).sum() / (Pw[k].sum() + 1e-20))
    flat = float(np.exp(np.mean(np.log(Pw[k] + 1e-20))) / (np.mean(Pw[k]) + 1e-20))
    top3 = float(np.sort(Pw[k])[-3:].sum() / (Pw[k].sum() + 1e-20))
    # how the spectrum moves: centroid of the first vs the last third of the active part
    act = np.flatnonzero(e >= e.max() * 10 ** (-30 / 20))
    a, z = (act[0], act[-1]) if len(act) else (0, n - 1)
    third = max(256, (z - a) // 3)

    def cen_of(seg):
        if len(seg) < 256:
            return cen
        ff, pp = signal.welch(seg, SR, nperseg=min(1024, len(seg)))
        kk = ff > 60
        return float((ff[kk] * pp[kk]).sum() / (pp[kk].sum() + 1e-20))
    move = abs(np.log2(cen_of(x[z - third:z + 1]) / max(cen_of(x[a:a + third]), 1.0)))
    ev = S.events(x, thr_db=-20.0, min_gap=0.1)
    return dict(name=name, dur=round(n / SR, 3), peak=round(pk, 3), clipped_run=clipped, rms_db=round(float(db(np.mean(x ** 2))), 1),
                silence=round(quiet, 2), onset_ms=round(on * 1000, 1), attack_ms=round(abs(k90 - k10) / SR * 1000, 1), centroid=round(cen),
                flatness=round(flat, 3), top3=round(top3, 2), spec_move_oct=round(float(move), 2), events=len(ev),
                event_len=[round(len(v) / SR, 2) for v in ev][:12])


FILLER = {"hmm", "hm", "mmm", "mm", "mhm", "uh", "um", "oh", "ooh", "ah", "ha", "haha", "huh", "eh", "wow", "yeah", "whoa", "woah", "hey", "heh", "hehe", "hehehe", "hahaha", "aah", "aw", "ow", "phew", "ugh", "ho", "hoo"}
HALLUCINATION = ("thanks for watching", "thank you for watching", "thank you", "you")   # what Whisper prints on non-speech audio


def real_words(words, p_min):
    """the recognised words that are neither fillers / laughter nor Whisper's stock phrase for non-speech audio"""
    if not words:
        return []
    txt = " ".join(w_[0] for w_ in words).lower().strip(" .!?,")
    if txt in HALLUCINATION:
        return []
    out = []
    for w_ in words:
        t = "".join(ch for ch in w_[0].lower() if ch.isalpha())
        if t and t not in FILLER and w_[1] >= p_min:
            out.append(w_[0])
    return out


CUT_GROUPS = ("step_soft", "step_hard", "step_slow", "pencil_ticks", "pencil_cross", "squeak")


def contrast(nm, x):
    """a take that is cut into single events must have AIR between them: the median peak of its events against the
    median of the quietest 60 ms between two neighbours (dB)"""
    cfg = next((c for c in S.REG.values() if nm in c.get("cut", [])), {})
    e5 = S.env(x, 0.005)
    up = e5 >= e5.max() * 10 ** (cfg.get("thr", -20.0) / 20.0)
    raw_ = np.flatnonzero(np.diff(np.concatenate([[0], up.astype(np.int8)])) == 1)
    st_ = []
    for s_ in raw_:
        if not st_ or (s_ - st_[-1]) / S.SR >= cfg.get("gap", 0.1):
            st_.append(s_)
    if len(st_) < 3:
        return None
    pk_ = [e5[a_:b_].max() for a_, b_ in zip(st_[:-1], st_[1:])]
    k6 = max(1, int(0.06 * S.SR))
    fl_ = [np.sort(e5[a_:b_])[: max(1, min(k6, (b_ - a_) // 3))].mean() for a_, b_ in zip(st_[:-1], st_[1:])]
    return round(float(20 * np.log10(np.median(pk_) / (np.median(fl_) + 1e-9))), 1)


def judge(nm, m):
    """why a take may NOT be used ([] = usable)"""
    grp = nm.rsplit("_", 1)[0]
    why = []
    if m["flat_top"] > 2:
        why.append(f"clipped at the source ({m['flat_top']} flat-top runs)")
    if m["silence"] > 0.85 and m["dur"] > 1.5:
        why.append(f"{m['silence'] * 100:.0f} % silence")
    if m["dur"] < 0.012:
        why.append("too short")
    if m["src"] == "el" and m["file_peak_dbfs"] < -43.0:        # (-3 dB of decode headroom included)
        why.append(f"near-silent file (peak {m['file_peak_dbfs']} dBFS): no real event, poor signal-to-noise")
    if m.get("event_contrast_db") is not None and m["event_contrast_db"] < 12.0:
        why.append(f"events not separated (contrast {m['event_contrast_db']} dB)")
    if m.get("words_raw") is not None:
        rw = real_words(m["words_raw"], 0.4)
        if grp.startswith("murmur"):
            mw = real_words(m.get("words_muffled") or [], 0.4)
            if len(rw) >= 4 or len(mw) >= 4:
                why.append("reads as words: " + " ".join((rw if len(rw) >= 4 else mw)[:8]))
        elif len(rw) >= 3:
            why.append("clear words: " + " ".join(rw[:8]))
    return why


def main():
    use_w = "--no-whisper" not in sys.argv
    only = None
    for a_ in sys.argv[1:]:
        if a_.startswith("--only="):
            only = set(a_[7:].split(","))
    try:
        old = json.load(open(os.path.join(HERE, "samples_measured.json"), encoding="utf-8"))
    except (OSError, ValueError):
        old = {}
    rows, reject = {}, {}
    names = sorted(f[:-4] for d in (S.EL, S.LIB) if os.path.isdir(d) for f in os.listdir(d) if f.endswith(".wav"))
    for nm in names:
        if only is not None and nm not in only and nm in old:
            rows[nm] = old[nm]
            continue
        x = S.load(nm)
        if x is None:
            continue
        p = S._path(nm)
        raw, _ = __import__("dsp").read_wav(p)
        m = measure(nm, x)
        m["src"] = "lib" if os.path.dirname(p) == S.LIB else "el"
        m["file_peak_dbfs"] = round(float(20 * np.log10(np.abs(raw).max() + 1e-12)), 1)
        # clipping = flat tops: runs of >= 3 consecutive samples within 0.05 % of the file's own peak (the files are
        # decoded with headroom, so a decoder overshoot is not counted, only a source that was already clipped)
        r0 = raw.mean(0) if raw.ndim == 2 else raw
        top = np.abs(r0) >= 0.9995 * np.abs(r0).max()
        d_ = np.diff(np.concatenate([[0], top.astype(np.int8), [0]]))
        runs = np.flatnonzero(d_ == -1) - np.flatnonzero(d_ == 1)
        m["flat_top"] = int(np.sum(runs >= 3))
        grp = nm.rsplit("_", 1)[0]
        if grp.startswith("horn"):
            m["squeezes"] = []
            for seg in S.events(x, thr_db=-16.0, min_gap=0.035, min_len=0.04, max_len=0.5)[:3]:
                mid = seg[len(seg) // 5: len(seg) * 4 // 5]
                if len(mid) > 1024:
                    f0, h = f0_of(mid)
                    m["squeezes"].append(dict(len=round(len(seg) / SR, 3), f0=round(f0, 1), midi=round(69 + 12 * np.log2(max(f0, 1) / 440.0), 2), harm=round(h, 2)))
        if grp in CUT_GROUPS:
            m["event_contrast_db"] = contrast(nm, x)
        wordless = grp in WORDLESS or grp.startswith("murmur")
        if use_w and (wordless or (m["dur"] >= 3.5 and m["src"] == "el")):
            m["words_raw"] = whisper_words(x)
            m["words_muffled"] = whisper_words(bp(x, 250.0, 1500.0, 2)) if grp.startswith("murmur") else None
        elif nm in old and "words_raw" in old[nm]:
            m["words_raw"], m["words_muffled"] = old[nm]["words_raw"], old[nm].get("words_muffled")
        rows[nm] = m
    for nm, m in rows.items():
        why = judge(nm, m)
        if why:
            reject[nm] = why
        extra = ""
        if "squeezes" in m:
            extra = "  squeezes " + ", ".join(f"{q['len'] * 1000:.0f} ms {q['f0']:.0f} Hz (midi {q['midi']:.1f}, harm {q['harm']})" for q in m["squeezes"])
        if m.get("event_contrast_db") is not None:
            extra += f"  contrast {m['event_contrast_db']} dB"
        if m.get("words_raw") is not None:
            extra += f"  whisper raw: {' '.join(w_[0] + '(' + str(w_[1]) + ')' for w_ in m['words_raw'][:10]) or 'nothing'}"
            if m.get("words_muffled") is not None:
                extra += f" | muffled: {' '.join(w_[0] + '(' + str(w_[1]) + ')' for w_ in m['words_muffled'][:10]) or 'nothing'}"
        print(f"{nm:<38} {m['src']:<3} {m['dur']:6.2f} s  pk {m['file_peak_dbfs']:6.1f}  rms {m['rms_db']:6.1f}  sil {m['silence']:.2f}  on {m['onset_ms']:6.1f} ms  att {m['attack_ms']:6.1f} ms  "
              f"cen {m['centroid']:5d}  flat {m['flatness']:.3f}  top3 {m['top3']:.2f}  move {m['spec_move_oct']:.2f}  ev {m['events']}{extra}" + (f"   REJECT: {'; '.join(why)}" if why else ""), flush=True)
    json.dump(rows, open(os.path.join(HERE, "samples_measured.json"), "w", encoding="utf-8"), indent=1)
    oldr = {}
    try:
        oldr = json.load(open(S.REJECT_PATH, encoding="utf-8"))
    except (OSError, ValueError):
        pass
    manual = oldr.get("manual", {})
    json.dump({"_doc": "takes samples.py never plays. 'why' = failed a measurement (el_measure.py); 'manual' = add {name: reason} by hand "
                       "(e.g. after listening: \"step_soft_2#3\": \"sounds like gravel\"); a cut piece is named <file>#<n>",
               "reject": sorted(set(reject) | set(manual)), "why": dict(reject, **manual), "manual": manual}, open(S.REJECT_PATH, "w", encoding="utf-8"), indent=1)
    print(f"\n{len(rows)} files measured, {len(reject)} rejected by measurement" + (f", {len(manual)} by hand" if manual else ""))


if __name__ == "__main__":
    main()
