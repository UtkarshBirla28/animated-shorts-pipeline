import json,sys
from faster_whisper import WhisperModel
m=WhisperModel("small.en",device="cpu",compute_type="int8")
import wave,numpy as np
wf=wave.open(sys.argv[1]);aud=np.frombuffer(wf.readframes(wf.getnframes()),np.int16).astype(np.float32)/32768
segs,info=m.transcribe(aud,word_timestamps=True,beam_size=5,vad_filter=False,condition_on_previous_text=False)
out=[]
for s in segs:
    out.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
    print(f"{s.start:6.2f}-{s.end:6.2f} {s.text}")
json.dump(out,open(sys.argv[2],"w"),indent=1)
