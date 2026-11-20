import json,sys,subprocess
def dur(p):
    o=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p],capture_output=True,text=True).stdout
    return float(o.strip())
films={
 'pointing':('sound/pointing/voice/words.json','studio/out/pointing/pointing_FINAL_1080x1920.mp4'),
 'antitheft':('sound/antitheft/voice/words.json','studio/out/antitheft/antitheft_FINAL_1080x1920.mp4'),
 'clown':('sound/clown/voice/words.json','studio/out/clown/upload/clown_FINAL_1080x1920.mp4'),
 'saladoil':('sound/saladoil/voice/words.json','studio/out/saladoil/saladoil_FINAL_v2_1080x1920.mp4'),
 'typo':('sound/typo/voice/words.json','studio/out/typo/upload/typo_FINAL_1080x1920.mp4'),
}
for k,(w,v) in films.items():
    try:
        d=json.load(open(w,encoding='utf-8'))
        if isinstance(d,dict): d=d.get('words',d.get('tokens',list(d.values())[0]))
        ws=[x for x in d if isinstance(x,dict)]
        S=lambda x:x.get('s',x.get('start'))
        E=lambda x:x.get('e',x.get('end'))
        D=dur(v)
        speech=0; 
        # union of word spans with gaps <0.35 merged
        spans=sorted((S(x),E(x)) for x in ws)
        m=[]
        for a,b in spans:
            if m and a-m[-1][1]<0.35: m[-1][1]=max(m[-1][1],b)
            else: m.append([a,b])
        speech=sum(b-a for a,b in m)
        gaps=[(m[i][1],m[i+1][0]) for i in range(len(m)-1) if m[i+1][0]-m[i][1]>=1.0]
        print(f"{k}: dur {D:.1f}s words {len(ws)} wps {len(ws)/D:.2f} speech {speech:.1f}s ({100*speech/D:.0f}%) silences>=1s: {len(gaps)} total {sum(b-a for a,b in gaps):.1f}s first3s words {sum(1 for x in ws if S(x)<3)}")
        print('   gaps:',[(round(a,1),round(b,1)) for a,b in gaps])
    except Exception as e: print(k,'ERR',e)
