"""Audition reel for the owner (written, never played): the chosen takes of each candidate in order, each gained to
-18 LUFS and trimmed to its sound (+-60 ms), 1.2 s of silence between, -> studio/out/pointing/voicetest/auditions_<role>.mp3
plus takes/auditions_<role>.json (what plays when).
  python pt_audition.py <role> <folder/take> [<folder/take> ...]"""
import json
import subprocess
import sys

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
role, srcs = sys.argv[1], sys.argv[2:]
GAP = 1.2
out, idx, t = [np.zeros(int(0.3 * L.SR))], [], 0.3
for src in srcs:
    mp3 = L.TAKES / f"{src}.mp3"
    m = L.read(mp3)
    m = m * 10 ** ((-18 - L.lufs(m)) / 20)
    d = L.db_frames(m)
    loud = np.where(d > L.THR)[0]
    a, b = max(0, int((loud[0] * L.H - 0.06) * L.SR)), min(len(m), int((loud[-1] * L.H + 0.07) * L.SR))
    seg = m[a:b]
    pk = np.max(np.abs(seg))
    if pk > 0.89:
        seg = seg * 0.89 / pk
    meta = json.loads(mp3.with_suffix(".meta.json").read_text(encoding="utf-8"))
    idx.append({"at_s": round(t, 2), "take": src, "candidate": meta.get("candidate"), "text": meta["text"], "stability": meta.get("stability")})
    out += [seg, np.zeros(int(GAP * L.SR))]
    t += len(seg) / L.SR + GAP
y = np.concatenate(out)
dst = L.ROOT / "studio" / "out" / "pointing" / "voicetest" / f"auditions_{role}.mp3"
dst.parent.mkdir(parents=True, exist_ok=True)
st = np.stack([y, y], axis=1).astype(np.float32)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(L.SR), "-ac", "2", "-i", "-", "-c:a", "libmp3lame", "-b:a", "192k", str(dst)],
               input=st.tobytes(), check=True)
(L.TAKES / f"auditions_{role}.json").write_text(json.dumps({"mp3": str(dst), "duration_s": round(len(y) / L.SR, 2), "order": idx},
                                                         ensure_ascii=False, indent=1), encoding="utf-8")
print(dst, f"{len(y) / L.SR:.1f} s")
for i in idx:
    print(f"  {i['at_s']:6.2f}  {i['candidate']:8s} {i['take']:16s} {i['text']}")
