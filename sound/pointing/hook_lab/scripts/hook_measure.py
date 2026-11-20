"""Measure the first 5 s of each Short: contact strip, frame-0 stats, motion onset + type, camera speed,
cuts, first sound / first voice onset.

Usage: python -s hook_measure.py <manifest.json> <out_dir>
manifest = [{"slug":..., "path":..., "views":..., "owner": "his"|"ours"}, ...]
Writes <out_dir>/data/<slug>.json, <out_dir>/strips/<slug>.jpg, <out_dir>/strips/frame0/<slug>.jpg
Light on purpose (shared PC): decodes only 0-6.2 s at 540x960, 2 threads, one video at a time.
Never plays anything.
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, sosfilt

cv2.setNumThreads(2)
AW, AH = 270, 480
SW, SH = 540, 960
CAP0, CAP1 = 0.60, 0.82          # caption band (masked out of motion metrics)
STRIP_T = [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5]
DECODE_S = 6.2


def band_mask(h, w):
    m = np.ones((h, w), bool)
    m[int(CAP0 * h):int(CAP1 * h), :] = False
    return m


MASK_A = band_mask(AH, AW)
DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_FAST)
YY, XX = np.mgrid[0:AH, 0:AW].astype(np.float32)


def sim_fit(a, b):
    pts = cv2.goodFeaturesToTrack(a, maxCorners=400, qualityLevel=0.005, minDistance=6, blockSize=5,
                                  mask=MASK_A.astype(np.uint8) * 255)
    if pts is None or len(pts) < 12:
        return None
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None, winSize=(21, 21), maxLevel=3)
    good = st.reshape(-1) == 1
    p0 = pts.reshape(-1, 2)[good]
    p1 = nxt.reshape(-1, 2)[good]
    if len(p0) < 12:
        return None
    M, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=1.0,
                                         maxIters=2000, confidence=0.99)
    if M is None:
        return None
    return M, float(inl.mean())


def cam_pct(M):
    s = math.hypot(M[0, 0], M[1, 0])
    cx, cy = AW / 2, AH / 2
    ncx = M[0, 0] * cx + M[0, 1] * cy + M[0, 2]
    ncy = M[1, 0] * cx + M[1, 1] * cy + M[1, 2]
    return math.hypot((ncx - cx) / AW, (ncy - cy) / AH) * 100 + abs(math.log(s)) * 100


def local_motion(a, b, M):
    flow = DIS.calc(a, b, None)
    gx = M[0, 0] * XX + M[0, 1] * YY + M[0, 2] - XX
    gy = M[1, 0] * XX + M[1, 1] * YY + M[1, 2] - YY
    r = np.sqrt((flow[..., 0] - gx) ** 2 + (flow[..., 1] - gy) ** 2)
    gxm = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3)
    gym = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)
    tex = np.sqrt(gxm * gxm + gym * gym) > 8
    m = MASK_A & tex
    if m.sum() < 200:
        m = MASK_A
    # where in the frame is the self-motion? (centroid of moving textured pixels, as fraction of W/H)
    mv = (r > 0.5) & m
    cen = None
    if mv.sum() > 30:
        ys, xs = np.nonzero(mv)
        cen = [round(float(xs.mean() / AW), 2), round(float(ys.mean() / AH), 2)]
    return float((r[m] > 0.5).mean()), float((r[MASK_A] > 1.5).mean()), cen


def lab_stats(bgr):
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab[..., 0] * 100 / 255
    A = lab[..., 1] - 128
    B = lab[..., 2] - 128
    m = band_mask(*L.shape)
    C = np.sqrt(A * A + B * B)
    Lm = L[m]
    # simple 4-colour palette (k-means on a subsample)
    px = bgr[m].reshape(-1, 3).astype(np.float32)[::17]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, lab_k, cen = cv2.kmeans(px, 4, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(lab_k.reshape(-1), minlength=4)
    order = np.argsort(-counts)
    pal = [("#%02x%02x%02x" % (int(cen[k][2]), int(cen[k][1]), int(cen[k][0])), round(float(counts[k] / counts.sum()), 2))
           for k in order]
    # centre vs edges luminance (is the subject lit / framed in the middle?)
    h, w = L.shape
    centre = L[int(h * .25):int(h * .58), int(w * .2):int(w * .8)].mean()
    return {"L": round(float(Lm.mean()), 1), "Lsd": round(float(Lm.std()), 1),
            "Lp2": round(float(np.percentile(Lm, 2)), 1), "Lp98": round(float(np.percentile(Lm, 98)), 1),
            "C": round(float(C[m].mean()), 1), "Cp90": round(float(np.percentile(C[m], 90)), 1),
            "centre_L_minus_mean": round(float(centre - Lm.mean()), 1), "palette": pal}


def caption_score(bgr):
    """White glyphs with a dark stroke in the caption band -> share of band pixels that are white AND near black."""
    h, w = bgr.shape[:2]
    band = bgr[int(.62 * h):int(.80 * h)]
    g = cv2.cvtColor(band, cv2.COLOR_BGR2GRAY)
    white = (band.min(axis=2) > 225)
    dark = (g < 50).astype(np.uint8)
    near_dark = cv2.dilate(dark, np.ones((5, 5), np.uint8)) > 0
    return float((white & near_dark).mean())


def detect_transitions(hd, mad, fps):
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
    out = []
    for g in groups:
        a, b = g[0], g[-1]
        out.append({"f0": a, "f1": b, "t0": round(a / fps, 3), "t1": round((b + 1) / fps, 3),
                    "kind": "cut" if len(g) == 1 else f"dissolve {b - a + 1}f"})
    # soft (slow) dissolves: sustained change without spikes
    soft = []
    win = int(round(fps * 0.4))
    i = 1
    while i < n - win:
        seg = hd[i:i + win]
        if seg.sum() > 0.9 and seg.max() < 0.25 and all(abs(i - t["f0"]) > win for t in out):
            soft.append(round((i + int(np.argmax(seg))) / fps, 2))
            i += win
        else:
            i += 1
    return out, soft


def audio_onsets(path):
    sr = 16000
    raw = subprocess.run(["ffmpeg", "-v", "error", "-t", "8", "-i", path, "-vn", "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x) < sr // 2:
        return {"has_audio": False}
    win = int(sr * 0.01)
    def rms_db(sig):
        nwin = len(sig) // win
        r = np.sqrt((sig[:nwin * win].reshape(nwin, win) ** 2).mean(axis=1) + 1e-12)
        return 20 * np.log10(r)
    full = rms_db(x)
    sos = butter(4, [300, 3400], btype="band", fs=sr, output="sos")
    sp = rms_db(sosfilt(sos, x))
    def first(arr, thr, sustain=1):
        for i in range(len(arr) - sustain):
            if (arr[i:i + sustain] > thr).all():
                return round(i * 0.01, 2)
        return None
    peak = float(full.max())
    return {"has_audio": True,
            "first_sound_s_-50dBFS": first(full, -50),
            "first_sound_s_-35dBFS": first(full, -35, 3),
            "first_speechband_s_-30dBFS_60ms": first(sp, -30, 6),
            "level_0_0.5s_dBFS": round(float(np.median(full[:50])), 1),
            "level_0.5_3s_dBFS": round(float(np.median(full[50:300])), 1),
            "peak_rms_0_8s_dBFS": round(peak, 1),
            "rms_10ms_0_1s": [round(float(v), 1) for v in full[:100]]}


def font(sz):
    for f in ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"]:
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def make_strip(frames, slug, title, out_path):
    tw, th = 240, 427
    lab_h, top_h = 26, 34
    W = tw * len(STRIP_T) + 4 * (len(STRIP_T) - 1)
    img = Image.new("RGB", (W, top_h + lab_h + th), (18, 18, 18))
    d = ImageDraw.Draw(img)
    d.text((8, 6), title, fill=(255, 255, 255), font=font(20))
    for k, t in enumerate(STRIP_T):
        fr = frames.get(t)
        x = k * (tw + 4)
        d.text((x + 6, top_h + 2), f"{t:.2f} s", fill=(255, 220, 120), font=font(18))
        if fr is not None:
            im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)).resize((tw, th), Image.LANCZOS)
            img.paste(im, (x, top_h + lab_h))
    img.save(out_path, quality=86)


def measure(item, out_dir):
    path = item["path"]
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                    "stream=r_frame_rate,width,height", "-of", "json", path],
                                   capture_output=True, text=True).stdout)["streams"][0]
    num, den = pr["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-threads", "2", "-t", str(DECODE_S), "-i", path, "-vf",
                             f"scale={SW}:{SH}:flags=area", "-pix_fmt", "bgr24", "-f", "rawvideo", "-"],
                            stdout=subprocess.PIPE, bufsize=SW * SH * 3 * 2)
    FB = SW * SH * 3
    want = {int(round(t * fps)): t for t in STRIP_T}
    strip_frames, per = {}, []
    prev = prev_hist = None
    frame0 = None
    cap_first = None
    heat = [np.zeros((AH, AW), np.float32), np.zeros((AH, AW), np.float32)]
    i = 0
    while True:
        buf = proc.stdout.read(FB)
        if len(buf) < FB:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3).copy()
        if i == 0:
            frame0 = fr
        if i in want:
            strip_frames[want[i]] = fr
        if cap_first is None and i <= int(fps * 2) and caption_score(fr) > 0.004:
            cap_first = round(i / fps, 3)
        small = cv2.resize(fr, (AW, AH), interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], MASK_A.astype(np.uint8) * 255, [16, 8, 8], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist, 1, 0, cv2.NORM_L1)
        rec = {"i": i, "t": round(i / fps, 3), "hd": 0.0, "mad": 0.0}
        if prev is not None:
            rec["hd"] = round(float(cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)), 4)
            dm = np.abs(g.astype(np.int16) - prev.astype(np.int16))
            rec["mad"] = round(float(dm[MASK_A].mean()), 3)
            rec["changed_px"] = round(float((dm[MASK_A] > 6).mean()), 4)
            if i <= int(fps):
                heat[0] += dm
            elif i <= int(3 * fps):
                heat[1] += dm
            f = sim_fit(prev, g)
            if f is not None and rec["hd"] < 0.2:
                M, inl = f
                rec["cam"] = round(cam_pct(M), 3)
                rec["inl"] = round(inl, 2)
                la, ls, cen = local_motion(prev, g, M)
                rec["loc"] = round(la, 4)
                rec["loc_strong"] = round(ls, 4)
                rec["loc_cen"] = cen
        per.append(rec)
        prev, prev_hist = g, hist
        i += 1
    proc.stdout.close()
    proc.wait()
    n5 = int(round(5 * fps))
    hd = np.array([r["hd"] for r in per])
    mad = np.array([r["mad"] for r in per])
    trans, soft = detect_transitions(hd, mad, fps)
    trans5 = [t for t in trans if t["f0"] <= n5]
    soft5 = [s for s in soft if s <= 5.0]
    near_trans = set()
    for t in trans:
        near_trans.update(range(t["f0"] - 3, t["f1"] + 4))

    def win_stats(a, b, key):
        v = [r[key] for r in per[a:b + 1] if key in r and r["i"] not in near_trans]
        if not v:
            return None
        v = np.array(v)
        return {"median": round(float(np.median(v)), 3), "mean": round(float(v.mean()), 3),
                "p90": round(float(np.percentile(v, 90)), 3), "n": int(len(v))}

    # first motion: any pixel change at all (h264 noise floor ~0) and the type that explains it
    first_any = next((r for r in per[1:] if r.get("changed_px", 0) > 0.002 or r.get("mad", 0) > 0.4), None)
    first_cam = next((r for r in per[1:] if r.get("cam", 0) >= 0.08 and r.get("inl", 0) >= 0.5), None)
    first_loc = next((r for r in per[1:] if r.get("loc", 0) >= 0.01), None)
    first_cam_vis = next((r for r in per[1:] if r.get("cam", 0) >= 0.3 and r.get("inl", 0) >= 0.5), None)
    first_loc_vis = next((r for r in per[1:] if r.get("loc_strong", 0) >= 0.01), None)
    f0 = lab_stats(frame0)
    # motion heat sheet: frame 0 | where pixels changed in 0-1 s | in 1-3 s (cuts included)
    hs = []
    for hm in heat:
        hm = hm / max(1e-6, np.percentile(hm, 99.5))
        hs.append(cv2.applyColorMap((np.clip(hm, 0, 1) * 255).astype(np.uint8), cv2.COLORMAP_INFERNO))
    f0s = cv2.resize(frame0, (AW, AH), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out_dir / "strips" / "heat" / f"{item['slug']}.jpg"), np.hstack([f0s] + hs),
                [cv2.IMWRITE_JPEG_QUALITY, 85])
    cv2.imwrite(str(out_dir / "strips" / "frame0" / f"{item['slug']}.jpg"), frame0, [cv2.IMWRITE_JPEG_QUALITY, 88])
    title = f"{item['slug']}  |  {item['owner']}  |  {item['views']:,} views"
    make_strip(strip_frames, item["slug"], title, out_dir / "strips" / f"{item['slug']}.jpg")
    res = {
        "slug": item["slug"], "owner": item["owner"], "views": item["views"], "path": path, "fps": fps,
        "frame0": f0, "frame0_caption_score": round(caption_score(frame0), 4), "caption_first_s": cap_first,
        "first_change_s": first_any["t"] if first_any else None,
        "first_cam_s(>=0.08%/f)": first_cam["t"] if first_cam else None,
        "first_local_s(>=1% px)": first_loc["t"] if first_loc else None,
        "first_cam_visible_s(>=0.3%/f)": first_cam_vis["t"] if first_cam_vis else None,
        "first_local_visible_s(>=1% px >1.5px)": first_loc_vis["t"] if first_loc_vis else None,
        "first_local_where": first_loc["loc_cen"] if first_loc else None,
        "cam_0_1s": win_stats(1, int(fps), "cam"), "cam_1_3s": win_stats(int(fps) + 1, int(3 * fps), "cam"),
        "cam_3_5s": win_stats(int(3 * fps) + 1, n5, "cam"),
        "loc_0_1s": win_stats(1, int(fps), "loc"), "loc_1_3s": win_stats(int(fps) + 1, int(3 * fps), "loc"),
        "transitions_0_5s": trans5, "soft_transitions_0_5s": soft5,
        "audio": audio_onsets(path),
        "per_frame": per[:n5 + 1],
    }
    (out_dir / "data" / f"{item['slug']}.json").write_text(json.dumps(res, indent=1))
    a = res["audio"]
    print(f"{item['slug']:<34} chg {res['first_change_s']} cam {res['first_cam_s(>=0.08%/f)']} "
          f"loc {res['first_local_s(>=1% px)']} | cam01 {res['cam_0_1s'] and res['cam_0_1s']['median']} "
          f"cam13 {res['cam_1_3s'] and res['cam_1_3s']['median']} | cuts {len(trans5)}+{len(soft5)}soft "
          f"| snd {a.get('first_sound_s_-50dBFS')} sp {a.get('first_speechband_s_-30dBFS_60ms')} "
          f"| L {f0['L']} sd {f0['Lsd']} C {f0['C']} | cap {res['caption_first_s']}", flush=True)
    return res


def main():
    manifest = json.loads(Path(sys.argv[1]).read_text())
    out_dir = Path(sys.argv[2])
    only = set(sys.argv[3:])
    for item in manifest:
        if only and item["slug"] not in only:
            continue
        try:
            measure(item, out_dir)
        except Exception as e:
            print("FAIL", item["slug"], repr(e), flush=True)


if __name__ == "__main__":
    main()
