# MEASURES a score candidate (read-only; nothing is played) against the two references: the approved salad-oil score
# (sound/saladoil/audio/stem_music.wav) and cut 1's circus score (sound/clown/audio/stem_music.wav, from the rejected cut).
#   level: integrated LUFS, LRA, true peak, crest; per section (when a section map is given)
#   spectrum: octave-band shares re the file's own total (dB), so files at different levels compare
#   stereo: side re mid (dB), L/R correlation, loudness lost in a mono fold-down
#   phone: loudness lost through a 4th-order 400 Hz high-pass, and the share of the BASS band's energy that has
#          harmonics above 250 Hz (bass that a phone can still suggest)
#   vocals: faster-whisper words (recognised words in an instrumental = vocals or vocal chops)
#   tempo: onset autocorrelation -> BPM; start / end level (does it start at once, can it stop at the seam)
#   sections: novelty (spectral change) peaks, to see where the model actually changed section
# usage: python -s music_measure.py <file.wav> [sections.json] [--no-whisper]
import json
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, read_wav, integrated, lra, true_peak, momentary  # noqa: E402

db = lambda p: 10 * np.log10(np.maximum(p, 1e-20))
OCT = [(31, 63), (63, 125), (125, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
REFS = {"saladoil score (approved)": os.path.normpath(os.path.join(HERE, "..", "..", "saladoil", "audio", "stem_music.wav")),
        "clown cut-1 circus score (rejected)": os.path.join(HERE, "stem_music.wav")}


def load(p):
    x, sr = read_wav(p)
    if x.shape[0] == 1:
        x = np.concatenate([x, x])
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=-1)
    return x


def bands(x):
    f, P = signal.welch(x.mean(0), SR, nperseg=8192)
    tot = P[(f >= 31) & (f < 16000)].sum()
    return [float(db(P[(f >= a) & (f < b)].sum() / tot)) for a, b in OCT]


def stereo(x):
    m, s = 0.5 * (x[0] + x[1]), 0.5 * (x[0] - x[1])
    corr = float(np.corrcoef(x[0], x[1])[0, 1])
    mono = integrated(np.stack([m, m]))
    return float(db(np.mean(s ** 2)) - db(np.mean(m ** 2))), corr, float(mono - integrated(x))


def phone(x):
    sos = signal.butter(4, 400, "highpass", fs=SR, output="sos")
    hp_ = signal.sosfilt(sos, x, axis=-1)
    loss = float(integrated(hp_) - integrated(x))
    # the bass line (40-160 Hz) and its harmonics (250-700 Hz): their level difference
    b = signal.sosfilt(signal.butter(4, [40, 160], "bandpass", fs=SR, output="sos"), x.mean(0))
    h = signal.sosfilt(signal.butter(4, [250, 700], "bandpass", fs=SR, output="sos"), x.mean(0))
    return loss, float(db(np.mean(h ** 2)) - db(np.mean(b ** 2)))


def bpm(x):
    m = x.mean(0)
    hop = 480
    n = len(m) // hop
    e = np.sqrt((m[: n * hop].reshape(n, hop) ** 2).mean(1))
    flux = np.maximum(0, np.diff(np.log(e + 1e-6)))
    flux -= flux.mean()
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    fps = SR / hop
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 60)
    k = lo + int(np.argmax(ac[lo:hi]))
    return 60 * fps / k, float(ac[k] / (ac[0] + 1e-12))


def novelty(x, win=0.5):
    """spectral-change curve (0.1 s hop): cosine distance between the mean spectra of the win s before and after"""
    m = x.mean(0)
    hop = int(0.1 * SR)
    n = len(m) // hop
    S = np.abs(np.fft.rfft(m[: n * hop].reshape(n, hop) * np.hanning(hop), axis=1))
    S = np.log1p(S[:, : S.shape[1] // 2])
    k = int(win / 0.1)
    out = np.zeros(n)
    for i in range(k, n - k):
        a, b = S[i - k:i].mean(0), S[i:i + k].mean(0)
        out[i] = 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12)
    return out


def words(x):
    from faster_whisper import WhisperModel
    wm = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    pcm = signal.resample_poly(x.mean(0), 1, 3).astype(np.float32)
    pcm = pcm / (np.max(np.abs(pcm)) + 1e-9) * 0.5
    segs, _ = wm.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    return [(w.word.strip(), round(float(w.probability), 2), round(float(w.start), 2)) for sg in segs for w in (sg.words or [])]


def report(p, sections=None, use_w=True, label=None):
    x = load(p)
    n = x.shape[1]
    I = integrated(x)
    side, corr, mono = stereo(x)
    ph, harm = phone(x)
    tempo, conf = bpm(x)
    M = momentary(x)
    e = np.abs(x).max(0)
    r = dict(file=os.path.basename(p), label=label or os.path.basename(p), dur=round(n / SR, 3), lufs=round(I, 1), lra=round(lra(x), 1),
             tp=round(true_peak(x), 1), crest=round(float(20 * np.log10(np.abs(x).max() / (np.sqrt(np.mean(x ** 2)) + 1e-12))), 1),
             bands=[round(v, 1) for v in bands(x)], side_db=round(side, 1), lr_corr=round(corr, 3), mono_loss=round(mono, 2),
             phone_loss=round(ph, 1), bass_harm_db=round(harm, 1), bpm=round(tempo, 1), bpm_conf=round(conf, 2),
             first_50ms_dbfs=round(float(db(np.mean(x[:, :2400] ** 2))), 1), first_note_ms=round(float(np.argmax(e > np.abs(x).max() * 0.1)) / SR * 1000, 1),
             last_50ms_dbfs=round(float(db(np.mean(x[:, -2400:] ** 2))), 1), mom_max=round(float(M.max()), 1))
    if sections:
        rows = []
        for name, a, b in sections:
            seg = x[:, int(a * SR): int(b * SR)]
            if seg.shape[1] < SR * 0.45:
                continue
            sd, cr, _ = stereo(seg)
            rows.append(dict(name=name, a=a, b=b, lufs=round(integrated(seg), 1), side_db=round(sd, 1), air_db=round(bands(seg)[7], 1),
                             top_db=round(bands(seg)[8], 1), low_db=round(bands(seg)[1], 1)))
        r["sections"] = rows
        nov = novelty(x)
        r["novelty_at_edges"] = []
        for name, a, b in sections[1:]:
            i = int(a / 0.1)
            win = nov[max(0, i - 10): i + 11]
            if len(win):
                j = int(np.argmax(win)) - min(10, i)
                r["novelty_at_edges"].append(dict(edge=name, planned=a, peak_at=round(a + j * 0.1, 1), height=round(float(win.max()), 3),
                                                  median_elsewhere=round(float(np.median(nov)), 3)))
    if use_w:
        r["words"] = words(x)
    return r


def show(r):
    print(f"== {r['label']}: {r['dur']} s, {r['lufs']} LUFS, LRA {r['lra']}, TP {r['tp']} dBTP, crest {r['crest']} dB; side {r['side_db']} dB re mid, "
          f"L/R corr {r['lr_corr']}, mono loss {r['mono_loss']} LU; phone (400 Hz HP) loss {r['phone_loss']} LU, bass harmonics {r['bass_harm_db']} dB re the bass; "
          f"tempo {r['bpm']} BPM (conf {r['bpm_conf']}); first note at {r['first_note_ms']} ms, first 50 ms {r['first_50ms_dbfs']} dBFS, last 50 ms {r['last_50ms_dbfs']} dBFS")
    print("   octave shares dB (31 63 125 250 500 1k 2k 4k 8k): " + " ".join(f"{v:6.1f}" for v in r["bands"]))
    for s in r.get("sections", []):
        print(f"   {s['name']:<34} {s['a']:6.2f}-{s['b']:6.2f}  {s['lufs']:6.1f} LUFS  side {s['side_db']:6.1f}  4-8k {s['air_db']:6.1f}  8-16k {s['top_db']:6.1f}  63-125 {s['low_db']:6.1f}")
    for e in r.get("novelty_at_edges", []):
        print(f"   edge '{e['edge']}' planned {e['planned']:.1f} s: biggest change at {e['peak_at']:.1f} s (height {e['height']}, median {e['median_elsewhere']})")
    if "words" in r:
        print("   recogniser hears: " + (" ".join(f"{w}({p})@{t}" for w, p, t in r["words"][:20]) or "nothing"))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sec = json.load(open(args[1])) if len(args) > 1 else None
    res = [report(args[0], sec, "--no-whisper" not in sys.argv)]
    if "--refs" in sys.argv:
        for lab, p in REFS.items():
            if os.path.exists(p):
                res.append(report(p, None, False, lab))
    for r in res:
        show(r)
    out = os.path.splitext(args[0])[0] + "_measure.json"
    json.dump(res, open(out, "w"), indent=1)
