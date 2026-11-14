"""Shorten (never remove) the long pauses in an assembled narration, writing the result to a NEW folder.

No time-stretch: voice samples are untouched. For each word gap longer than --min, the new gap is
max(--floor, gap * --factor), or an explicit "a|b|target" override. The cut comes out of the middle of the
longest quiet run (10 ms frames < -45 dBFS) between the two words, with a 10 ms crossfade, keeping >= 60 ms of
quiet on each side. words.json, words_whisper.json, phrases.json and voice_info.json are shifted to match.

Usage: python -s tighten_pauses.py <voice dir> <out dir> [--factor 0.65] [--floor 0.22] [--min 0.25] ["a|b|target" ...]
"""
import json, re, shutil, subprocess, sys
from pathlib import Path
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
src, out = Path(sys.argv[1]), Path(sys.argv[2])
args = sys.argv[3:]
opt = {"--factor": 0.65, "--floor": 0.22, "--min": 0.25}
over = {}
i = 0
while i < len(args):
    if args[i] in opt:
        opt[args[i]] = float(args[i + 1]); i += 2
    else:
        a, b, t = args[i].split("|"); over[(a, b)] = float(t); i += 1
k = lambda w: re.sub(r"[^a-z0-9%']", "", w.lower())
over = {(k(a), k(b)): t for (a, b), t in over.items()}
SR = 48000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src / "voice.wav"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
words = json.loads((src / "words.json").read_text(encoding="utf-8"))
F = SR // 100
db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // F * F].reshape(-1, F) ** 2, axis=1)) + 1e-9)
cuts = []  # (time s in source, removed s)
for a, b in zip(words, words[1:]):
    g = b["s"] - a["e"]
    if g <= opt["--min"]:
        continue
    tgt = over.get((k(a["w"]), k(b["w"])), max(opt["--floor"], g * opt["--factor"]))
    rem = g - tgt
    if rem <= 0.02:
        continue
    f0, f1 = int(a["e"] * 100), int(b["s"] * 100) + 1
    q = db[f0:f1] < -45
    best, cur, bs = (0, 0), 0, 0
    for j, v in enumerate(q):
        if v:
            if cur == 0: bs = j
            cur += 1
            if cur > best[1]: best = (bs, cur)
        else:
            cur = 0
    run_s = best[1] / 100
    rem = min(rem, max(0.0, run_s - 0.12))
    if rem <= 0.02:
        print(f"skip {a['w']}|{b['w']} gap {g:.2f} (quiet run {run_s:.2f})"); continue
    mid = (f0 + best[0] + best[1] / 2) / 100
    cuts.append((mid, rem))
    print(f"{a['w']}|{b['w']}: gap {g:.2f} -> {g - rem:.2f}")
# apply cuts from the end so earlier sample indices stay valid
xf = int(0.010 * SR)
for t, rem in sorted(cuts, reverse=True):
    c0 = int((t - rem / 2) * SR); c1 = int((t + rem / 2) * SR)
    ramp = np.linspace(1, 0, xf, dtype=np.float32)
    seam = x[c0:c0 + xf] * ramp + x[c1:c1 + xf] * (1 - ramp)
    x = np.concatenate([x[:c0], seam, x[c1 + xf:]])  # removes exactly c1 - c0 samples
def sh(tm):
    d = 0.0
    for t, rem in cuts:
        if tm > t + rem / 2: d += rem
        elif tm > t - rem / 2: d += tm - (t - rem / 2)
    return round(tm - d, 3)
out.mkdir(parents=True, exist_ok=True)
for f in src.iterdir():
    if f.is_file() and f.suffix in (".json", ".py") and not (out / f.name).exists():
        shutil.copy(f, out / f.name)
for name in ("words.json", "words_whisper.json", "words_refined.json"):
    if (src / name).exists():
        w = json.loads((src / name).read_text(encoding="utf-8"))
        for e in w: e["s"], e["e"] = sh(e["s"]), sh(e["e"])
        (out / name).write_text(json.dumps(w, ensure_ascii=False, indent=1), encoding="utf-8")
ph = json.loads((src / "phrases.json").read_text(encoding="utf-8"))
for p in ph: p["s"], p["e"] = sh(p["s"]), sh(p["e"])
(out / "phrases.json").write_text(json.dumps(ph, ensure_ascii=False, indent=1), encoding="utf-8")
vi = json.loads((src / "voice_info.json").read_text(encoding="utf-8"))
vi["tightened_pauses"] = [{"at_s": round(t, 3), "removed_s": round(r, 3)} for t, r in cuts]
vi["duration_s"] = round(len(x) / SR, 3)
(out / "voice_info.json").write_text(json.dumps(vi, ensure_ascii=False, indent=1), encoding="utf-8")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ac", "2", "-c:a", "pcm_s24le",
                str(out / "voice.wav")], input=x.astype(np.float32).tobytes(), check=True)
print(f"removed {sum(r for _, r in cuts):.2f} s; new duration {len(x) / SR:.2f} s; last word end {sh(words[-1]['e']):.2f}")
