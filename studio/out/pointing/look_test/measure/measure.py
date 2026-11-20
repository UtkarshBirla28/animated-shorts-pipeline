"""Look metrics for the pointing look test. Usage: python -s measure.py
Extracts 1 frame / s at 540x960 with ffmpeg and measures colour, contrast, beige / near-white share, sky colour.
Caption band (rows 52-82 %) is masked out of every number."""
import json, os, subprocess, sys
import numpy as np, cv2

ROOT = r"C:\Users\utkar\Desktop\animated-shorts-studio"
REF = r"C:\Users\utkar\Desktop\yt short videos\new_2026-11-19"
OUT = os.path.join(ROOT, r"studio\out\pointing\look_test\measure")
VIDS = {
    "ours_pointing": os.path.join(ROOT, r"studio\out\pointing\pointing_FINAL_1080x1920.mp4"),
    "ours_clown": os.path.join(ROOT, r"studio\out\clown\upload\clown_FINAL_1080x1920.mp4"),
    "ref_drivers": os.path.join(REF, "Why Drivers Started Filming The Road [e9NoHjAXYIY].mp4"),
    "ref_coasters": os.path.join(REF, "This Shape Saved Roller Coasters [QlDPMzGmYac].mp4"),
    "ref_railroads": os.path.join(REF, "Why Perfect Railroads Don't Work [7xS87iActkU].mp4"),
    "ref_crash": os.path.join(REF, "The Instinct That Makes You Crash [aD73kaL_PtY].mp4"),
}


def extract(name, path):
    d = os.path.join(OUT, "frames", name)
    os.makedirs(d, exist_ok=True)
    if len([f for f in os.listdir(d) if f.endswith(".png")]) < 20:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", "fps=1,scale=540:960",
                        os.path.join(d, "f%03d.png")], check=True)
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".png"))


def frame_stats(p):
    img = cv2.imread(p)
    h, w = img.shape[:2]
    mask = np.ones((h, w), bool)
    mask[int(h * 0.52):int(h * 0.82), :] = False
    lab = cv2.cvtColor(img.astype(np.float32) / 255.0, cv2.COLOR_BGR2LAB)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.sqrt(a * a + b * b)
    hue = (np.degrees(np.arctan2(b, a)) + 360) % 360
    Lm, Cm, hm = L[mask], C[mask], hue[mask]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    S = hsv[..., 1][mask] / 255.0
    near_white = (Lm > 82) & (Cm < 14)
    beige_grey = (Lm > 45) & (Lm <= 92) & (Cm < 22) & ~near_white  # washed, low-colour mid tones (beige/grey/cream)
    vivid = Cm > 40
    # sky: top 30 % of frame, blue hue (lab hue 230-300), lightness > 35
    top = np.zeros((h, w), bool); top[: int(h * 0.30), :] = True
    skym = top & (hue > 225) & (hue < 305) & (C > 8) & (L > 35)
    sky = None
    if skym.sum() > 0.05 * top.sum():
        rgb = img[skym].mean(0)[::-1]
        sky = dict(share_top=float(skym.sum() / top.sum()), C=float(C[skym].mean()), L=float(L[skym].mean()),
                   hex="#%02x%02x%02x" % tuple(int(v) for v in rgb))
    dark = Lm < np.percentile(Lm, 25)
    return dict(
        chroma=float(Cm.mean()), sat_hsv=float(S.mean()), L_mean=float(Lm.mean()), L_std=float(Lm.std()),
        L_p2=float(np.percentile(Lm, 2)), L_p98=float(np.percentile(Lm, 98)),
        near_white=float(near_white.mean()), beige_grey=float(beige_grey.mean()), vivid=float(vivid.mean()),
        shadow_chroma=float(Cm[dark].mean()), sky=sky)


def main():
    res = {}
    for name, path in VIDS.items():
        if not os.path.exists(path):
            print("missing", name, path); continue
        frames = extract(name, path)
        st = [frame_stats(p) for p in frames]
        agg = {k: float(np.median([s[k] for s in st])) for k in st[0] if k != "sky"}
        skies = [s["sky"] for s in st if s["sky"]]
        agg["sky_frames_share"] = len(skies) / len(st)
        if skies:
            agg["sky_C"] = float(np.median([s["C"] for s in skies]))
            agg["sky_L"] = float(np.median([s["L"] for s in skies]))
            # median colour hex from the frame whose sky C is the median
            sk = sorted(skies, key=lambda s: s["C"])[len(skies) // 2]
            agg["sky_hex"] = sk["hex"]
        agg["n"] = len(st)
        res[name] = agg
        print(name, json.dumps({k: (round(v, 3) if isinstance(v, float) else v) for k, v in agg.items()}))
        json.dump(st, open(os.path.join(OUT, name + "_frames.json"), "w"))
    json.dump(res, open(os.path.join(OUT, "summary.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
