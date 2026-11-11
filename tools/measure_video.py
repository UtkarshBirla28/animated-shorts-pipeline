"""Measure reference shorts so analysis agents work from numbers, not guesses.

For each video it writes study/videos/_data/<slug>/:
  probe.json        ffprobe output
  frames.json       per-frame stats (luma, saturation, cut scores, camera motion fit)
  shots.json        detected shots: times, camera move (zoom/pan/tilt/roll + easing), colour stats + palette
  shots/shot_NN.jpg strip per shot: first | middle | last frame, label bar, palette swatches
  full/shot_NN_mid.jpg   full-res 1080x1920 middle frame of each shot (detail inspection)
  contact_1fps.jpg  one frame per second grid with timestamps
  motion.png        camera motion + cut-score curves over time
  transcript.json   faster-whisper words with start/end times
  audio.json        loudness (EBU R128), voice pace, pauses, music-bed level, onsets vs cuts
  audio_score_N.png spectrogram rows (20 s each) with words, cuts and loudness overlaid
  SUMMARY.md        human-readable digest of all of the above

Usage:  python -s measure_video.py <out_root> <video1.mp4> [video2.mp4 ...]
"""
import json
import math
import re
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from scipy.io import wavfile  # noqa: E402
from scipy.signal import find_peaks  # noqa: E402

AW, AH = 270, 480          # analysis resolution (1/4 of 1080x1920)
STRIP_W, STRIP_H = 360, 640
WHISPER_MODEL = "medium"
WHISPER_THREADS = 3

try:
    FONT = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 20)
    FONT_S = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 15)
except OSError:
    FONT = FONT_S = ImageFont.load_default()


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


# ---------------------------------------------------------------- video pass 1
def motion_fit(a, b):
    """Fit a similarity transform (zoom, roll, pan) from frame a to b with sparse optical flow + RANSAC."""
    pts = cv2.goodFeaturesToTrack(a, maxCorners=400, qualityLevel=0.005, minDistance=6, blockSize=5)
    if pts is None or len(pts) < 12:
        return {"ok": 0}
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None, winSize=(21, 21), maxLevel=3)
    good = st.reshape(-1) == 1
    p0 = pts.reshape(-1, 2)[good]
    p1 = nxt.reshape(-1, 2)[good]
    if len(p0) < 12:
        return {"ok": 0}
    M, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=1.5,
                                         maxIters=2000, confidence=0.99)
    if M is None:
        return {"ok": 0}
    inl = inl.reshape(-1).astype(bool)
    s = math.hypot(M[0, 0], M[1, 0])
    r = math.degrees(math.atan2(M[1, 0], M[0, 0]))
    cx, cy = AW / 2, AH / 2
    ncx = M[0, 0] * cx + M[0, 1] * cy + M[0, 2]
    ncy = M[1, 0] * cx + M[1, 1] * cy + M[1, 2]
    pred = p0 @ M[:, :2].T + M[:, 2]
    resid = np.linalg.norm(pred - p1, axis=1)
    out = {"ok": 1, "s": round(float(s), 5), "r": round(float(r), 4),
           "tx": round(float((ncx - cx) / AW), 5), "ty": round(float((ncy - cy) / AH), 5),
           "inl": round(float(inl.mean()), 3), "n": int(len(p0))}
    out["fg"] = round(float(np.median(resid[~inl])), 3) if (~inl).sum() > 3 else 0.0
    return out


def pass1(path):
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    stats, prev_gray, prev_hist, i = [], None, None, 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        small = cv2.resize(frame, (AW, AH), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [16, 8, 8], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist, 1, 0, cv2.NORM_L1)
        st = {"i": i, "t": round(i / fps, 3), "lum": round(float(gray.mean()), 2),
              "sat": round(float(hsv[..., 1].mean()), 2), "hd": 0.0, "mad": 0.0}
        if prev_gray is not None:
            st["hd"] = round(float(cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)), 4)
            st["mad"] = round(float(np.abs(gray.astype(np.int16) - prev_gray.astype(np.int16)).mean()), 3)
            st.update(motion_fit(prev_gray, gray))
        stats.append(st)
        prev_gray, prev_hist = gray, hist
        i += 1
    cap.release()
    return fps, stats


def detect_transitions(stats, fps):
    """Shot changes in this channel are mostly ~4-6 frame cross-dissolves, which show up as TWO histogram
    spikes (blend start + blend end). Group spikes <= 9 frames apart into one transition."""
    hd = np.array([s["hd"] for s in stats])
    mad = np.array([s["mad"] for s in stats])
    n = len(hd)
    base = np.array([np.median(hd[max(1, i - 15):min(n, i + 16)]) for i in range(n)])
    peaks = [i for i in range(1, n)
             if (hd[i] > 0.25 and hd[i] > 3 * base[i] + 0.06) or (mad[i] > 38 and hd[i] > 0.16)]
    groups = []
    for p in peaks:
        if groups and p - groups[-1][-1] <= 7:
            groups[-1].append(p)
        else:
            groups.append([p])
    trans = []
    for g in groups:
        a, b = g[0], g[-1]
        if len(g) == 1:
            kind = "hard cut (or <=2-frame blend)"
        else:
            kind = f"cross-dissolve ~{b - a + 1} frames ({(b - a + 1) / fps:.2f}s)"
        trans.append({"f0": a, "f1": b, "frames": b - a + 1, "kind": kind,
                      "t0": round(a / fps, 3), "t1": round((b + 1) / fps, 3), "mid": (a + b + 1) // 2})
    # soft transitions (slow dissolves / flashes): sustained histogram change without spikes
    soft = []
    win = int(round(fps * 0.4))
    i = 1
    while i < n - win:
        seg = hd[i:i + win]
        if seg.sum() > 0.9 and seg.max() < 0.25 and all(abs(i - t["mid"]) > win for t in trans):
            soft.append(round((i + int(np.argmax(seg))) / fps, 2))
            i += win
        else:
            i += 1
    return trans, soft


def classify_move(z, px, py, rot, frames):
    """z = cumulative zoom factor, px/py = camera move as fraction of frame (camera direction)."""
    parts = []
    if z > 1.03:
        parts.append(f"push-in {100 * (z - 1):.0f}%")
    elif z < 0.97:
        parts.append(f"pull-out {100 * (1 - z):.0f}%")
    if abs(px) > 0.04:
        parts.append(f"pan/truck {'right' if px > 0 else 'left'} {abs(px) * 100:.0f}%w")
    if abs(py) > 0.03:
        parts.append(f"tilt/pedestal {'down' if py > 0 else 'up'} {abs(py) * 100:.0f}%h")
    if abs(rot) > 1.5:
        parts.append(f"roll {rot:+.1f}deg")
    return ", ".join(parts) if parts else "static / locked"


def easing_label(speed):
    if len(speed) < 9 or speed.sum() < 1e-6:
        return "n/a"
    k = len(speed) // 3
    a, b, c = speed[:k].mean(), speed[k:2 * k].mean(), speed[2 * k:].mean()
    if b > 1.3 * a and b > 1.3 * c:
        return "ease-in-out"
    if a > 1.3 * c and a >= b:
        return "ease-out (fast start, settles)"
    if c > 1.3 * a and c >= b:
        return "ease-in (accelerates)"
    return "linear / constant"


def summarize_shots(stats, trans, fps):
    n = len(stats)
    starts = [0] + [t["mid"] for t in trans]
    ends = [t["mid"] for t in trans] + [n]
    shots = []
    for k in range(len(starts)):
        a, b = starts[k], ends[k]
        ca = a if k == 0 else trans[k - 1]["f1"] + 2          # clean range: skip blended frames
        cb = b if k == len(trans) else trans[k]["f0"] - 1
        if cb - ca < 3:
            ca, cb = a, b
        fr = [s for s in stats[ca + 1:cb] if s.get("ok") and s.get("inl", 0) > 0.35]
        z = float(np.prod([s["s"] for s in fr])) if fr else 1.0
        # content moves +tx -> camera moves -x (left). Report CAMERA direction.
        px = -float(sum(s["tx"] for s in fr)) if fr else 0.0
        py = -float(sum(s["ty"] for s in fr)) if fr else 0.0
        rot = -float(sum(s["r"] for s in fr)) if fr else 0.0
        speed = np.array([math.hypot(s["tx"], s["ty"]) + abs(math.log(max(s["s"], 1e-6))) for s in fr])
        fg = float(np.median([s.get("fg", 0) for s in fr])) if fr else 0.0
        mad = float(np.median([s["mad"] for s in stats[a + 1:b]])) if b - a > 1 else 0.0
        dur = (b - a) / fps
        shots.append({
            "shot": k + 1, "f0": a, "f1": b - 1, "t0": round(a / fps, 2), "t1": round(b / fps, 2),
            "clean_f0": ca, "clean_f1": cb - 1,
            "transition_in": "start of video" if k == 0 else trans[k - 1]["kind"],
            "dur": round(dur, 2), "move": classify_move(z, px, py, rot, len(fr)),
            "zoom_total": round(z, 3), "cam_x_frac": round(px, 3), "cam_y_frac": round(py, 3),
            "roll_deg": round(rot, 2), "easing": easing_label(speed),
            "zoom_per_s": round((z ** (1 / dur) - 1) * 100, 2) if dur > 0 else 0,
            "tracked_frames": len(fr), "frames": b - a,
            "parallax_or_actor_motion_px": round(fg, 2), "median_frame_diff": round(mad, 2),
        })
    return shots


# ---------------------------------------------------------------- video pass 2
def colour_stats(bgr):
    small = cv2.resize(bgr, (AW, AH), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB)
    L = lab[..., 0].astype(np.float32) * 100 / 255
    A = lab[..., 1].astype(np.float32) - 128
    B = lab[..., 2].astype(np.float32) - 128
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 180)
    flat = lab.reshape(-1, 3).astype(np.float32)
    idx = np.random.default_rng(0).choice(len(flat), min(6000, len(flat)), replace=False)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, labels, centers = cv2.kmeans(flat[idx], 6, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.reshape(-1), minlength=6) / len(idx)
    cb = cv2.cvtColor(np.clip(centers, 0, 255).reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_LAB2BGR).reshape(-1, 3)
    pal = sorted(([f"#{c[2]:02x}{c[1]:02x}{c[0]:02x}", round(float(p), 3)] for c, p in zip(cb, counts)),
                 key=lambda x: -x[1])
    return {
        "L_mean": round(float(L.mean()), 1), "L_std_contrast": round(float(L.std()), 1),
        "chroma_mean": round(float(np.sqrt(A ** 2 + B ** 2).mean()), 1),
        "warmth_b": round(float(B.mean()), 1), "tint_a": round(float(A.mean()), 1),
        "sat_mean_0_255": round(float(hsv[..., 1].mean()), 1),
        "dark_frac_L<12": round(float((L < 12).mean()), 3), "bright_frac_L>92": round(float((L > 92).mean()), 3),
        "edge_density": round(float((edges > 0).mean()), 4), "palette": pal,
    }


def label_bar(img, text, h=34, fill=(20, 20, 20)):
    bar = Image.new("RGB", (img.width, h), fill)
    ImageDraw.Draw(bar).text((8, 7), text, fill=(255, 255, 255), font=FONT)
    out = Image.new("RGB", (img.width, img.height + h))
    out.paste(bar, (0, 0))
    out.paste(img, (0, h))
    return out


def pass2(path, out, shots, fps, nframes):
    want = {}
    for sh in shots:
        f0, f1 = sh["clean_f0"], sh["clean_f1"]
        mid = (f0 + f1) // 2
        for tag, f in (("first", min(f0 + 1, f1)), ("mid", mid), ("last", max(f1 - 1, f0))):
            want.setdefault(f, []).append((sh["shot"], tag))
    sec = {int(round(s * fps)): s for s in range(0, int(nframes / fps) + 1)}
    for f in sec:
        want.setdefault(min(f, nframes - 1), [])
    grabbed, contact = {}, {}
    (out / "full").mkdir(exist_ok=True)
    (out / "shots").mkdir(exist_ok=True)
    cap = cv2.VideoCapture(str(path))
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i in want:
            for shot, tag in want[i]:
                grabbed[(shot, tag)] = cv2.resize(frame, (STRIP_W, STRIP_H), interpolation=cv2.INTER_AREA)
                if tag == "mid":
                    cv2.imwrite(str(out / "full" / f"shot_{shot:02d}_mid.jpg"), frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
                    grabbed[(shot, "colour")] = colour_stats(frame)
            if i in sec or min(i, nframes - 1) in sec:
                contact[i] = cv2.resize(frame, (180, 320), interpolation=cv2.INTER_AREA)
        i += 1
    cap.release()
    # shot strips
    for sh in shots:
        k = sh["shot"]
        sh["colour"] = grabbed.get((k, "colour"))
        tiles = [grabbed.get((k, t)) for t in ("first", "mid", "last")]
        canvas = Image.new("RGB", (STRIP_W * 3 + 8, STRIP_H), (0, 0, 0))
        for j, tile in enumerate(tiles):
            if tile is not None:
                canvas.paste(Image.fromarray(cv2.cvtColor(tile, cv2.COLOR_BGR2RGB)), (j * (STRIP_W + 4), 0))
        sw = Image.new("RGB", (canvas.width, 40), (0, 0, 0))
        d = ImageDraw.Draw(sw)
        x = 0
        for hexc, p in (sh["colour"] or {}).get("palette", []):
            w = max(int(p * canvas.width), 2)
            d.rectangle([x, 0, x + w, 40], fill=hexc)
            d.text((x + 3, 12), hexc, fill=(255, 255, 255) if int(hexc[1:3], 16) < 140 else (0, 0, 0), font=FONT_S)
            x += w
        img = Image.new("RGB", (canvas.width, canvas.height + 40))
        img.paste(canvas, (0, 0))
        img.paste(sw, (0, canvas.height))
        img = label_bar(img, f"shot {k:02d}  {sh['t0']:.2f}-{sh['t1']:.2f}s ({sh['dur']:.2f}s)  {sh['move']}  [{sh['easing']}]")
        img.save(out / "shots" / f"shot_{k:02d}.jpg", quality=85)
    # contact sheet
    keys = sorted(contact)
    cols = 8
    rows = math.ceil(len(keys) / cols)
    sheet = Image.new("RGB", (cols * 182, rows * 342), (15, 15, 15))
    d = ImageDraw.Draw(sheet)
    for j, f in enumerate(keys):
        x, y = (j % cols) * 182, (j // cols) * 342
        sheet.paste(Image.fromarray(cv2.cvtColor(contact[f], cv2.COLOR_BGR2RGB)), (x, y + 20))
        d.text((x + 4, y + 2), f"{f / fps:5.1f}s", fill=(255, 255, 0), font=FONT_S)
    sheet.save(out / "contact_1fps.jpg", quality=82)


def motion_plot(out, stats, shots, fps):
    t = np.array([s["t"] for s in stats])
    z = np.array([(s["s"] - 1) * 100 if s.get("ok") else np.nan for s in stats])
    tx = np.array([-s["tx"] * 100 if s.get("ok") else np.nan for s in stats])
    ty = np.array([-s["ty"] * 100 if s.get("ok") else np.nan for s in stats])
    hd = np.array([s["hd"] for s in stats])
    lum = np.array([s["lum"] for s in stats])
    fig, ax = plt.subplots(4, 1, figsize=(18, 10), sharex=True)
    ax[0].plot(t, z, lw=.7, c="tab:red"); ax[0].set_ylabel("zoom %/frame")
    ax[1].plot(t, tx, lw=.7, label="cam x (+right)"); ax[1].plot(t, ty, lw=.7, label="cam y (+down)")
    ax[1].legend(loc="upper right"); ax[1].set_ylabel("pan %frame/frame")
    ax[2].plot(t, hd, lw=.7, c="k"); ax[2].set_ylabel("hist diff (cuts)")
    ax[3].plot(t, lum, lw=.7, c="tab:orange"); ax[3].set_ylabel("mean luma")
    for a in ax:
        for sh in shots:
            a.axvline(sh["t0"], c="tab:green", lw=.5, alpha=.6)
        a.grid(alpha=.25)
    for a in ax[:2]:
        a.set_ylim(-3, 3)
    ax[3].set_xlabel("seconds (green = detected cuts)")
    fig.tight_layout()
    fig.savefig(out / "motion.png", dpi=90)
    plt.close(fig)


# ---------------------------------------------------------------- audio
def loudness(path):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"])
    txt = r.stderr
    tail = txt[txt.rfind("Summary:"):] if "Summary:" in txt else txt
    g = lambda pat: (float(m.group(1)) if (m := re.search(pat, tail)) else None)  # noqa: E731
    return {"integrated_LUFS": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA_LU": g(r"LRA:\s+(-?[\d.]+) LU"),
            "true_peak_dBFS": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def transcribe(wav16):
    from faster_whisper import WhisperModel
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8", cpu_threads=WHISPER_THREADS)
    sr16, pcm = wavfile.read(wav16)  # pass samples directly: newer PyAV breaks faster-whisper's file decoder
    pcm = pcm.astype(np.float32) / 32768.0
    segs, info = model.transcribe(pcm, language="en", beam_size=5, word_timestamps=True,
                                  vad_filter=False, condition_on_previous_text=False)
    words, segments = [], []
    for sg in segs:
        segments.append({"s": round(sg.start, 2), "e": round(sg.end, 2), "text": sg.text.strip()})
        for w in sg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
    return {"model": WHISPER_MODEL, "segments": segments, "words": words}


def audio_analysis(path, out, shots, trans, duration):
    wav16 = out / "audio16k.wav"
    wav22 = out / "audio22k.wav"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", str(wav16)])
    run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "22050", str(wav22)])
    res = {"loudness": loudness(path)}
    tr = transcribe(wav16)
    (out / "transcript.json").write_text(json.dumps(tr, indent=1), encoding="utf-8")
    words = tr["words"]
    sr, x = wavfile.read(wav22)
    x = x.astype(np.float32) / 32768.0
    hop = 256
    nfft = 1024
    win = np.hanning(nfft).astype(np.float32)
    frames = 1 + max(0, (len(x) - nfft) // hop)
    S = np.empty((nfft // 2 + 1, frames), np.float32)
    for k in range(frames):
        seg = x[k * hop:k * hop + nfft]
        S[:, k] = np.abs(np.fft.rfft(seg * win))
    logS = 20 * np.log10(S + 1e-6)
    tt = np.arange(frames) * hop / sr
    rms = 20 * np.log10(np.sqrt(np.mean((S ** 2), axis=0) / nfft) + 1e-9)
    # onsets (spectral flux)
    flux = np.maximum(0, np.diff(np.log1p(S), axis=1)).sum(axis=0)
    flux = np.concatenate([[0], flux])
    med = np.median(flux)
    mad = np.median(np.abs(flux - med)) + 1e-9
    pk, _ = find_peaks(flux, height=med + 6 * mad, distance=int(0.12 * sr / hop))
    onsets = [round(float(tt[p]), 3) for p in pk]
    # onsets during speech are mostly consonants; onsets outside word spans are candidate SFX / music hits
    in_word = lambda o: any(w["s"] - 0.03 <= o <= w["e"] + 0.03 for w in words)  # noqa: E731
    sfx_cand = [o for o in onsets if not in_word(o)]
    cut_t = [sh["t0"] for sh in shots[1:]]
    near = [t for t in trans if any(t["t0"] - 0.12 <= o <= t["t1"] + 0.12 for o in onsets)]
    near_sfx = [t for t in trans if any(t["t0"] - 0.12 <= o <= t["t1"] + 0.12 for o in sfx_cand)]
    # pace + pauses
    pace = {}
    if words:
        span = words[-1]["e"] - words[0]["s"]
        gaps = [(round(float(words[i]["e"]), 2), round(float(words[i + 1]["s"] - words[i]["e"]), 2))
                for i in range(len(words) - 1) if words[i + 1]["s"] - words[i]["e"] >= 0.3]
        pace = {"n_words": len(words), "first_word_s": words[0]["s"], "last_word_end_s": words[-1]["e"],
                "tail_after_voice_s": round(duration - words[-1]["e"], 2),
                "words_per_s": round(len(words) / span, 2) if span else None,
                "wpm": round(60 * len(words) / span, 1) if span else None,
                "pauses_ge_0.3s": gaps, "n_pauses": len(gaps),
                "low_confidence_words": [w for w in words if w["p"] < 0.5]}
        # music-bed level: energy in word gaps vs during words
        def lvl(a, b):
            m = (tt >= a) & (tt < b)
            return float(np.mean(rms[m])) if m.any() else None
        inside = [lvl(w["s"], w["e"]) for w in words if w["e"] - w["s"] > 0.12]
        between = [lvl(g[0] + 0.08, g[0] + g[1] - 0.08) for g in gaps if g[1] > 0.4]
        inside = [v for v in inside if v is not None]
        between = [v for v in between if v is not None]
        pace["voice_level_db_rel"] = round(float(np.median(inside)), 1) if inside else None
        pace["gap_bed_level_db_rel"] = round(float(np.median(between)), 1) if between else None
        if inside and between:
            pace["bed_minus_voice_db"] = round(float(np.median(between) - np.median(inside)), 1)
        pv = lvl(0, words[0]["s"] - 0.05) if words[0]["s"] > 0.15 else None
        pace["pre_voice_level_db_rel"] = round(pv, 1) if pv is not None else None
    res["pace"] = pace
    res["onsets_s"] = onsets
    res["sfx_candidate_onsets_outside_words_s"] = sfx_cand
    res["transitions_with_any_onset"] = f"{len(near)}/{len(trans)}"
    res["transitions_with_non_word_onset"] = f"{len(near_sfx)}/{len(trans)}"
    # band energy summaries
    freqs = np.fft.rfftfreq(nfft, 1 / sr)
    def band(lo, hi):
        m = (freqs >= lo) & (freqs < hi)
        return float(np.mean(logS[m]))
    res["band_mean_db"] = {"sub_20_120": round(band(20, 120), 1), "low_120_500": round(band(120, 500), 1),
                           "mid_500_3k": round(band(500, 3000), 1), "high_3k_8k": round(band(3000, 8000), 1),
                           "air_8k_11k": round(band(8000, 11000), 1)}
    (out / "audio.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    # audio score images: 20 s rows
    row = 20.0
    nrows = math.ceil(duration / row)
    fmax_bin = np.searchsorted(freqs, 11000)
    for r_i in range(0, nrows, 2):
        fig, axes = plt.subplots(min(2, nrows - r_i), 1, figsize=(22, 7.5 if nrows - r_i > 1 else 3.9), squeeze=False)
        for j, ax in enumerate(axes[:, 0]):
            a, b = (r_i + j) * row, min((r_i + j + 1) * row, duration)
            m = (tt >= a) & (tt < b)
            ax.imshow(logS[:fmax_bin, m], origin="lower", aspect="auto", cmap="magma", vmin=-40, vmax=40,
                      extent=[a, b, 0, freqs[fmax_bin - 1] / 1000])
            ax.set_ylabel("kHz")
            for c in cut_t:
                if a <= c < b:
                    ax.axvline(c, c="cyan", lw=1, ls="--")
            for o in onsets:
                if a <= o < b:
                    sfx = o in sfx_cand
                    ax.plot([o], [10.6], marker="v", c="lime" if sfx else "gray", ms=7 if sfx else 4)
            for w in words:
                if a <= w["s"] < b:
                    ax.text(w["s"], 9.3, w["w"], fontsize=8, color="white", rotation=60, va="bottom")
                    ax.axvspan(w["s"], w["e"], ymin=0, ymax=0.03, color="white", alpha=.8)
            ax2 = ax.twinx()
            ax2.plot(tt[m], rms[m], c="yellow", lw=.6)
            ax2.set_ylim(-80, 0)
            ax2.set_ylabel("RMS dB (yellow)")
            ax.set_xlim(a, a + row)
            ax.set_xlabel("s   (cyan dashed = shot change, green v = onset OUTSIDE words (SFX/music hit?), "
                          "grey v = onset inside a word, white = words, yellow = RMS)")
        fig.tight_layout()
        fig.savefig(out / f"audio_score_{r_i // 2 + 1}.png", dpi=80)
        plt.close(fig)
    wav22.unlink(missing_ok=True)
    return res, tr


# ---------------------------------------------------------------- summary
def write_summary(out, name, probe, shots, audio, tr, duration, fps):
    durs = np.array([s["dur"] for s in shots])
    moving = [s for s in shots if s["move"] != "static / locked"]
    L = [s["colour"]["L_mean"] for s in shots if s.get("colour")]
    C = [s["colour"]["chroma_mean"] for s in shots if s.get("colour")]
    lines = [f"# {name}", "",
             f"- duration {duration:.2f}s, {fps:.0f} fps, {probe['streams'][0].get('width')}x{probe['streams'][0].get('height')}",
             f"- detected shots: {len(shots)}  | median shot {np.median(durs):.2f}s, mean {durs.mean():.2f}s, "
             f"min {durs.min():.2f}s, max {durs.max():.2f}s | cuts/min {60 * (len(shots) - 1) / duration:.1f}",
             f"- moving-camera shots: {len(moving)}/{len(shots)}",
             f"- mean luminance L* {np.mean(L):.1f}, mean chroma {np.mean(C):.1f}" if L else "",
             f"- loudness: {audio['loudness']}",
             f"- pace: {json.dumps({k: v for k, v in audio['pace'].items() if k not in ('pauses_ge_0.3s', 'low_confidence_words')})}",
             f"- transitions with any audio onset (+-120 ms): {audio['transitions_with_any_onset']}; "
             f"with an onset outside speech (likely SFX/whoosh): {audio['transitions_with_non_word_onset']}",
             f"- candidate SFX/music-hit onsets outside words (s): {audio['sfx_candidate_onsets_outside_words_s']}",
             f"- band energy: {audio['band_mean_db']}", "",
             "NOTE: shot detection and camera-motion numbers are automatic estimates. Dissolves, flashes, whip-pans, "
             "parallax and character motion can fool them; always confirm against shots/*.jpg and full/*.jpg.", "",
             "## Shots", "", "| # | start-end s | dur | transition in | camera move (auto) | easing | zoom/s % | L* | chroma | top palette |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for s in shots:
        c = s.get("colour") or {}
        pal = " ".join(p[0] for p in c.get("palette", [])[:4])
        lines.append(f"| {s['shot']} | {s['t0']:.2f}-{s['t1']:.2f} | {s['dur']:.2f} | {s['transition_in']} | {s['move']} | "
                     f"{s['easing']} | {s['zoom_per_s']} | {c.get('L_mean')} | {c.get('chroma_mean')} | {pal} |")
    lines += ["", "## Transcript (segments)", ""]
    for sg in tr["segments"]:
        lines.append(f"- [{sg['s']:.2f}-{sg['e']:.2f}] {sg['text']}")
    lines += ["", "## Pauses >= 0.3 s (after word end time, gap length)", "",
              str(audio["pace"].get("pauses_ge_0.3s"))]
    (out / "SUMMARY.md").write_text("\n".join(l for l in lines if l is not None), encoding="utf-8")


def main():
    out_root = Path(sys.argv[1])
    for vp in map(Path, sys.argv[2:]):
        t_start = time.time()
        slug = slugify(vp.stem)
        out = out_root / slug
        out.mkdir(parents=True, exist_ok=True)
        if (out / "SUMMARY.md").exists():
            print(f"skip {slug} (done)", flush=True)
            continue
        probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(vp)]).stdout)
        (out / "probe.json").write_text(json.dumps(probe, indent=1), encoding="utf-8")
        fps, stats = pass1(vp)
        duration = len(stats) / fps
        trans, soft = detect_transitions(stats, fps)
        shots = summarize_shots(stats, trans, fps)
        pass2(vp, out, shots, fps, len(stats))
        motion_plot(out, stats, shots, fps)
        (out / "frames.json").write_text(json.dumps(stats), encoding="utf-8")
        audio, tr = audio_analysis(vp, out, shots, trans, duration)
        (out / "shots.json").write_text(json.dumps({"fps": fps, "duration": duration, "transitions": trans,
                                                    "soft_transition_candidates_s": soft, "shots": shots},
                                                   indent=1), encoding="utf-8")
        write_summary(out, vp.stem, probe, shots, audio, tr, duration, fps)
        print(f"done {slug}: {len(shots)} shots, {len(tr['words'])} words, {time.time() - t_start:.0f}s", flush=True)


if __name__ == "__main__":
    main()
