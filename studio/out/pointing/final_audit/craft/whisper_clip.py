import sys,wave,numpy as np
from faster_whisper import WhisperModel
m=WhisperModel("small.en",device="cpu",compute_type="int8")
wf=wave.open(sys.argv[1]);aud=np.frombuffer(wf.readframes(wf.getnframes()),np.int16).astype(np.float32)/32768
for spec in sys.argv[2:]:
    a,b=map(float,spec.split(':'))
    clip=aud[int(a*16000):int(b*16000)]
    segs,_=m.transcribe(clip,word_timestamps=True,beam_size=5,condition_on_previous_text=False)
    ws=[]
    for s in segs:
        for w in s.words: ws.append(f"{w.word.strip()}[{a+w.start:.2f},p{w.probability:.2f}]")
    print(f"{a}-{b}: "," ".join(ws))
