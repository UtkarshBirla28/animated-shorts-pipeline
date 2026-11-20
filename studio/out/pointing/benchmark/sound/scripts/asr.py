import sys, json, os, glob, time
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
import hdr
from faster_whisper import WhisperModel
B = sys.argv[1]
try:
    m = WhisperModel("medium", device="cuda", compute_type="float16"); list(m.transcribe(np.zeros(16000, np.float32), language="en")[0]); dev="cuda"
except Exception as e:
    print("cuda fail", e); m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4); dev="cpu"
for f in sorted(glob.glob(os.path.join(B, "wav", "*.wav"))):
    k = os.path.splitext(os.path.basename(f))[0]
    out = os.path.join(B, "data", k + ".asr.json")
    if os.path.exists(out): continue
    t = time.time()
    x, sr = sf.read(f, dtype="float32"); x = x.mean(1) if x.ndim > 1 else x; x = resample_poly(x, 1, 3).astype(np.float32)
    segs, info = m.transcribe(x, language="en", word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
    S = []
    for s in segs:
        S.append({"s": s.start, "e": s.end, "text": s.text, "nsp": s.no_speech_prob,
                  "words": [{"w": w.word, "s": w.start, "e": w.end, "p": w.probability} for w in (s.words or [])]})
    json.dump({"dev": dev, "segments": S}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(k, round(time.time() - t, 1), "s", sum(len(x["words"]) for x in S), "words", flush=True)
